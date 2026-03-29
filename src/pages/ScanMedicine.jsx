/**
 * ScanMedicine Page
 * Scan actual medicine to verify it matches prescription
 * Uses Gemini to identify medicine and match against user's saved list
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { triggerAction, triggerSuccess, triggerAlert } from '../utils/haptics';
import { compressImage, createPreviewUrl, revokePreviewUrl } from '../utils/imageUtils';
import { verifyMedicinePhoto } from '../services/geminiService';
import { findBestMedicineMatch } from '../data/medicineDatabase';
import DualActionButtons from '../components/DualActionButtons';


const SCAN_STATES = {
    IDLE: 'IDLE',
    CAMERA_LIVE: 'CAMERA_LIVE',
    ANALYZING: 'ANALYZING',
    MATCH_FOUND: 'MATCH_FOUND',
    NO_MATCH: 'NO_MATCH'
};

const ScanMedicine = () => {
    const navigate = useNavigate();
    const { language } = useApp();
    const { speak } = useVoice();

    const [scanState, setScanState] = useState(SCAN_STATES.IDLE);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [matchedMedicine, setMatchedMedicine] = useState(null);
    const [scannedData, setScannedData] = useState(null);
    const [medicines, setMedicines] = useState([]);

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Labels
    const t = {
        'en-US': {
            title: 'Verify Medicine',
            subtitle: 'Check if this medicine is in your prescription',
            camera: 'Take Photo',
            gallery: 'From Gallery',
            analyzing: 'Reading medicine label...',
            matchFound: 'Safe to Take!',
            noMatch: 'Not in Your Prescription',
            medicineDetails: 'Medicine Details',
            expires: 'Expires',
            expiryUpdated: 'Expiry date saved!',
            tryAgain: 'Scan Again',
            back: 'Back',
            description: 'Description',
            usualUse: 'Typical Use',
            notInList: 'This medicine is not in your prescription. Please consult your doctor.'
        },
        'hi-IN': {
            title: 'दवाई जांचें',
            subtitle: 'जांचें कि यह दवाई आपके पर्चे में है',
            camera: 'फोटो लें',
            gallery: 'गैलरी से',
            analyzing: 'दवाई का नाम पढ़ रहा हूँ...',
            matchFound: 'लेना सुरक्षित!',
            noMatch: 'आपके पर्चे में नहीं है',
            medicineDetails: 'दवाई का विवरण',
            expires: 'समाप्ति',
            expiryUpdated: 'समाप्ति तिथि सहेजी गई!',
            tryAgain: 'फिर स्कैन करें',
            back: 'वापस',
            description: 'विवरण',
            usualUse: 'सामान्य उपयोग',
            notInList: 'यह दवाई आपके पर्चे में नहीं है। कृपया अपने डॉक्टर से परामर्श करें।'
        },
        'mr-IN': {
            title: 'औषध स्कॅन',
            subtitle: 'तुमच्या औषधाची पुष्टी करा',
            camera: 'फोटो घ्या',
            gallery: 'गॅलरीमधून',
            analyzing: 'औषध ओळखत आहे...',
            matchFound: 'औषध सापडले!',
            noMatch: 'तुमच्या प्रिस्क्रिप्शनमध्ये नाही',
            medicineDetails: 'औषध तपशील',
            expires: 'कालबाह्य',
            expiryUpdated: 'कालबाह्यता तारीख जतन केली!',
            tryAgain: 'पुन्हा स्कॅन करा',
            back: 'मागे',
            description: 'वर्णन',
            usualUse: 'सामान्य वापर',
            notInList: 'हे औषध तुमच्या प्रिस्क्रिप्शनमध्ये नाही. कृपया तुमच्या डॉक्टरांचा सल्ला घ्या.'
        }
    };

    const labels = t[language] || t['en-US'];

    // Load user's medicines
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
        setMedicines(saved);
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (previewUrl) revokePreviewUrl(previewUrl);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [previewUrl]);

    // Start camera
    const startCamera = async () => {
        triggerAction();
        setScanState(SCAN_STATES.CAMERA_LIVE);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch {
            setScanState(SCAN_STATES.IDLE);
            fileInputRef.current?.click();
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setScanState(SCAN_STATES.IDLE);
    };

    // Capture from video
    const captureFromVideo = async () => {
        if (!videoRef.current) return;
        triggerAction();

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        stopCamera();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        setPreviewUrl(dataUrl);

        await analyzeMedicine(base64, 'image/jpeg');
    };

    // Handle file select
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const preview = createPreviewUrl(file);
            setPreviewUrl(preview);

            const compressed = await compressImage(file);
            await analyzeMedicine(compressed.base64, compressed.mimeType);
        } catch {
            triggerAlert();
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // SAFETY VALIDATOR - Cross-reference medicine against prescription
    // ═══════════════════════════════════════════════════════════════════════
    const analyzeMedicine = async (base64, mimeType) => {
        setScanState(SCAN_STATES.ANALYZING);
        speak(labels.analyzing);

        try {
            // Call blind verification API with fuzzy matching
            const result = await verifyMedicinePhoto(base64, mimeType, medicines);

            // Handle unreadable image (blurry, glare, etc.) - from teammate
            if (!result.success || !result.isReadable) {
                setScanState(SCAN_STATES.NO_MATCH);
                triggerAlert();
                const blurryMessage = {
                    'en-US': 'I cannot read the label clearly. Please try again with a clearer photo.',
                    'hi-IN': 'मैं लेबल स्पष्ट नहीं पढ़ पा रहा। कृपया साफ फोटो से फिर कोशिश करें।',
                    'mr-IN': 'मला लेबल स्पष्ट वाचता येत नाही. कृपया स्पष्ट फोटोने पुन्हा प्रयत्न करा.'
                };
                speak(blurryMessage[language] || blurryMessage['en-US']);
                console.log('📷 Unreadable image:', result.reason);
                return;
            }

            setScannedData({
                packagingText: result.detectedName,
                visualDescription: result.visualDescription,
                confidence: result.confidence
            });

            // Try to use medicine database for enhanced matching when API doesn't find a match
            let matchFound = result.matchFound;
            let matchedMed = result.matchedMedicine;

            // If API didn't find a match, try local database fuzzy matching
            if (!matchFound && result.detectedName) {
                const detectedName = result.detectedName;
                
                // Step 1: Try to correct the scanned medicine name using our database
                const dbMatch = findBestMedicineMatch(detectedName, 60);
                
                if (dbMatch) {
                    console.log(`🎯 Database match: "${detectedName}" → "${dbMatch.medicine.name}"`);
                    
                    // Check if this corrected name matches any prescription medicine
                    matchedMed = medicines.find(m => {
                        const prescriptionName = m.name?.toLowerCase() || '';
                        const dbName = dbMatch.medicine.name.toLowerCase();
                        return prescriptionName === dbName || 
                               prescriptionName.includes(dbName) || 
                               dbName.includes(prescriptionName);
                    });
                    
                    if (matchedMed) matchFound = true;
                }
                
                // Fallback: Try fuzzy matching on prescription medicines directly 
                if (!matchedMed) {
                    matchedMed = medicines.find(m => {
                        // Direct fuzzy matching using medicine database
                        const prescriptionMatch = findBestMedicineMatch(m.name, 60);
                        const scannedMatch = findBestMedicineMatch(detectedName, 60);
                        
                        // Check if both resolve to the same database entry
                        if (prescriptionMatch && scannedMatch && 
                            prescriptionMatch.medicine.id === scannedMatch.medicine.id) {
                            return true;
                        }
                        
                        // Simple substring matching as final fallback
                        const medNameLower = m.name?.toLowerCase() || '';
                        const detectLower = detectedName.toLowerCase();
                        return medNameLower.includes(detectLower) || detectLower.includes(medNameLower);
                    });
                    
                    if (matchedMed) matchFound = true;
                }
            }

            if (matchFound && matchedMed) {
                // ✅ MATCH FOUND - Medicine is in prescription
                setMatchedMedicine(matchedMed);
                setScanState(SCAN_STATES.MATCH_FOUND);
                triggerSuccess();

                // Update medicine with last scanned time
                const updated = medicines.map(m => 
                    m.id === matchedMed.id 
                        ? { ...m, lastScanned: new Date().toISOString(), verified: true }
                        : m
                );
                setMedicines(updated);
                localStorage.setItem('saarthi_medicines', JSON.stringify(updated));

                // Voice feedback with timing info
                const timingMessage = matchedMed.timing?.length > 0 
                    ? matchedMed.timing.join(' and ')
                    : 'prescribed times';
                
                const matchMessage = {
                    'en-US': `Yes! This is ${result.detectedName}. It matches your prescription. Take this in the ${timingMessage}.`,
                    'hi-IN': `हाँ! यह ${result.detectedName} है। यह आपके पर्चे से मेल खाती है। इसे ${timingMessage} में लें।`,
                    'mr-IN': `हो! हे ${result.detectedName} आहे. हे तुमच्या प्रिस्क्रिप्शनशी जुळते. हे ${timingMessage} मध्ये घ्या.`
                };
                speak(matchMessage[language] || matchMessage['en-US']);

            } else {
                // ❌ NO MATCH - Medicine NOT in prescription (DANGER)
                setScanState(SCAN_STATES.NO_MATCH);
                triggerAlert();

                const warningMessage = {
                    'en-US': `Warning! This medicine, ${result.detectedName || 'unknown'}, is NOT in your saved prescription list. Please do not take it without asking your doctor.`,
                    'hi-IN': `चेतावनी! यह दवाई, ${result.detectedName || 'अज्ञात'}, आपकी सहेजी गई पर्ची में नहीं है। कृपया डॉक्टर से पूछे बिना इसे न लें।`,
                    'mr-IN': `सावधान! हे औषध, ${result.detectedName || 'अज्ञात'}, तुमच्या जतन केलेल्या प्रिस्क्रिप्शनमध्ये नाही. कृपया डॉक्टरांना विचारल्याशिवाय हे घेऊ नका.`
                };
                speak(warningMessage[language] || warningMessage['en-US']);
            }

        } catch (err) {
            console.error('Scan error:', err);
            setScanState(SCAN_STATES.NO_MATCH);
            triggerAlert();
            
            // Handle timeout
            if (err.message === 'API_TIMEOUT') {
                const timeoutMessage = {
                    'en-US': 'Taking too long. Please check your internet and try again.',
                    'hi-IN': 'बहुत समय लग रहा है। कृपया इंटरनेट जांचें और फिर प्रयास करें।',
                    'mr-IN': 'खूप वेळ लागत आहे. कृपया इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.'
                };
                speak(timeoutMessage[language] || timeoutMessage['en-US']);
            } else {
                speak(labels.notInList);
            }
        }
    };

    // Reset for new scan
    const handleTryAgain = () => {
        if (previewUrl) revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
        setMatchedMedicine(null);
        setScannedData(null);
        setScanState(SCAN_STATES.IDLE);
    };

    // Color helper
    const getColorHex = (colorName) => {
        const colors = {
            white: '#F9FAFB', pink: '#F472B6', blue: '#3B82F6', red: '#EF4444',
            yellow: '#FBBF24', green: '#10B981', orange: '#F97316', brown: '#92400E',
            purple: '#8B5CF6', gray: '#9CA3AF'
        };
        return colors[colorName?.toLowerCase()] || '#3B82F6';
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-6 pt-8 pb-10 rounded-b-3xl shadow-xl">
                <motion.button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="text-2xl">←</span>
                    <span className="text-lg">{labels.back}</span>
                </motion.button>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">{labels.title}</h1>
                <p className="text-base sm:text-lg text-white/80">{labels.subtitle}</p>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 py-6 -mt-4">
                <AnimatePresence mode="wait">
                    {/* IDLE State */}
                    {scanState === SCAN_STATES.IDLE && (
                        <motion.div
                            key="idle"
                            className="space-y-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Camera Button */}
                            <motion.button
                                onClick={startCamera}
                                className="w-full p-8 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg"
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="text-6xl mb-4">📷</div>
                                <div className="text-2xl font-bold">{labels.camera}</div>
                            </motion.button>

                            {/* Gallery Button */}
                            <motion.button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-6 rounded-2xl bg-white border-2 border-gray-200 shadow-md"
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="text-4xl mb-2">🖼️</div>
                                <div className="text-xl font-semibold text-gray-700">{labels.gallery}</div>
                            </motion.button>
                        </motion.div>
                    )}

                    {/* CAMERA_LIVE State */}
                    {scanState === SCAN_STATES.CAMERA_LIVE && (
                        <motion.div
                            key="camera"
                            className="flex flex-col items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-lg border-4 border-blue-500">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-auto"
                                    style={{ maxHeight: '50vh' }}
                                />
                            </div>
                            <motion.button
                                onClick={captureFromVideo}
                                className="mt-6 w-24 h-24 rounded-full bg-white border-4 border-blue-500 shadow-xl flex items-center justify-center"
                                whileTap={{ scale: 0.9 }}
                            >
                                <div className="w-16 h-16 rounded-full bg-blue-500" />
                            </motion.button>
                            <motion.button
                                onClick={stopCamera}
                                className="mt-4 px-6 py-2 text-gray-600 text-lg"
                                whileTap={{ scale: 0.95 }}
                            >
                                ✕ Cancel
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ANALYZING State */}
                    {scanState === SCAN_STATES.ANALYZING && (
                        <motion.div
                            key="analyzing"
                            className="flex flex-col items-center justify-center py-16"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="w-24 h-24 rounded-full border-4 border-blue-500 border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <p className="mt-6 text-xl text-gray-600">{labels.analyzing}</p>
                        </motion.div>
                    )}

                    {/* MATCH_FOUND State */}
                    {scanState === SCAN_STATES.MATCH_FOUND && matchedMedicine && (
                        <motion.div
                            key="match"
                            className="space-y-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Success Header */}
                            <div className="text-center py-4">
                                <motion.div
                                    className="text-6xl mb-2"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring' }}
                                >
                                    ✅
                                </motion.div>
                                <h2 className="text-2xl font-bold text-green-600">{labels.matchFound}</h2>
                            </div>

                            {/* Medicine Card */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg border-l-4" style={{ borderColor: getColorHex(matchedMedicine.visualColor) }}>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">{matchedMedicine.name}</h3>
                                <p className="text-gray-600 mb-4">{matchedMedicine.visualDescription || matchedMedicine.dosage}</p>
                                
                                {/* Expiry if available */}
                                {(scannedData?.expiryDate || matchedMedicine.expiryDate) && (
                                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl">
                                        <span className="text-2xl">📅</span>
                                        <div>
                                            <p className="text-sm text-gray-500">{labels.expires}</p>
                                            <p className="font-bold text-gray-800">{scannedData?.expiryDate || matchedMedicine.expiryDate}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Try Again Button */}
                            <motion.button
                                onClick={handleTryAgain}
                                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold text-lg"
                                whileTap={{ scale: 0.98 }}
                            >
                                🔍 {labels.tryAgain}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* NO_MATCH State */}
                    {scanState === SCAN_STATES.NO_MATCH && (
                        <motion.div
                            key="nomatch"
                            className="space-y-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Warning Header */}
                            <div className="text-center py-4">
                                <motion.div
                                    className="text-6xl mb-2"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring' }}
                                >
                                    ⚠️
                                </motion.div>
                                <h2 className="text-2xl font-bold text-orange-600">{labels.noMatch}</h2>
                            </div>

                            {/* Typical Use - Only show this */}
                            {scannedData?.usualUse && (
                                <div className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-200">
                                    <p className="text-sm text-blue-600 font-semibold mb-1">{labels.usualUse}:</p>
                                    <p className="text-lg text-blue-800">{scannedData.usualUse}</p>
                                </div>
                            )}

                            {/* Warning Message */}
                            <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-200">
                                <p className="text-red-700">{labels.notInList}</p>
                            </div>

                            {/* Try Again Button */}
                            <motion.button
                                onClick={handleTryAgain}
                                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold text-lg"
                                whileTap={{ scale: 0.98 }}
                            >
                                🔍 {labels.tryAgain}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
            />

            <DualActionButtons />
        </motion.div>
    );
};

export default ScanMedicine;
