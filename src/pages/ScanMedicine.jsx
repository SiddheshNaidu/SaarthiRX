import React from 'react';
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
import { checkDrugInteraction, SEVERITY } from '../services/drugInteractionService';
import DrugInteractionModal from '../components/DrugInteractionModal';
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
    const [interactionData, setInteractionData] = useState(null);

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

        const video = videoRef.current;

        // Guard: wait for video dimensions (prevents 0×0 canvas)
        if (!video.videoWidth || !video.videoHeight) {
            console.warn('⚠️ Video dimensions not ready, waiting...');
            await new Promise((resolve) => {
                const onReady = () => {
                    video.removeEventListener('loadeddata', onReady);
                    resolve();
                };
                video.addEventListener('loadeddata', onReady);
                // Timeout fallback — don't hang forever
                setTimeout(resolve, 2000);
            });
        }

        // Final check after waiting
        if (!video.videoWidth || !video.videoHeight) {
            console.error('❌ Video dimensions still 0 — cannot capture');
            triggerAlert();
            speak(labels.notInList || 'Camera not ready. Please try again.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
                // ❌ NO MATCH — Run drug interaction check before showing warning
                console.log(`🔍 No match — checking drug interactions for: ${result.detectedName}`);

                try {
                    const interactionResult = await checkDrugInteraction(result.detectedName, medicines);

                    if (interactionResult.severity !== SEVERITY.SAFE) {
                        // ⛔ Dangerous interaction detected — show full-screen modal
                        console.log('⛔ Drug interaction detected:', interactionResult);
                        setInteractionData({
                            severity: interactionResult.severity,
                            newMedicine: result.detectedName || 'Unknown',
                            conflictingMedicine: interactionResult.conflictingMedicine || '',
                            reason: interactionResult.reason || '',
                            precautions: interactionResult.precautions || [],
                            source: interactionResult.source
                        });
                        setScanState(SCAN_STATES.NO_MATCH);
                        return; // Modal handles voice + vibration
                    }
                } catch (interactionErr) {
                    console.warn('⚠️ Drug interaction check failed, proceeding:', interactionErr);
                    // Fail-safe: don't block on interaction check failure
                }

                // No dangerous interaction — show standard "not in list" warning
                setScanState(SCAN_STATES.NO_MATCH);
                triggerAlert();

                const warningMessage = {
                    'en-US': `This medicine, ${result.detectedName || 'unknown'}, is not in your saved prescription list. Please verify with your doctor before taking it.`,
                    'hi-IN': `यह दवाई, ${result.detectedName || 'अज्ञात'}, आपकी सहेजी गई पर्ची में नहीं है। कृपया इसे लेने से पहले डॉक्टर से पुष्टि करें।`,
                    'mr-IN': `हे औषध, ${result.detectedName || 'अज्ञात'}, तुमच्या जतन केलेल्या प्रिस्क्रिप्शनमध्ये नाही. कृपया घेण्यापूर्वी डॉक्टरांकडून खात्री करा.`
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
        setInteractionData(null);
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
            className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans pb-44"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <div className="bg-neutral-950 text-white px-4 py-6 pt-8 pb-10 border-b border-neutral-800">
                <motion.button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white mb-4"
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
                                className="w-full p-8 rounded-3xl bg-primary text-white shadow-[0_0_40px_rgba(37,99,235,0.4)] border border-primary-light/30"
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="text-6xl mb-4">📷</div>
                                <div className="text-2xl font-bold">{labels.camera}</div>
                            </motion.button>

                            {/* Gallery Button */}
                            <motion.button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl hover:border-neutral-700 hover:bg-neutral-800 transition-all"
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="text-4xl mb-2">🖼️</div>
                                <div className="text-xl font-semibold text-neutral-200">{labels.gallery}</div>
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
                            <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-lg border-4 border-primary">
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
                                className="mt-6 w-24 h-24 rounded-full bg-white border-4 border-primary shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center justify-center"
                                whileTap={{ scale: 0.9 }}
                            >
                                <div className="w-16 h-16 rounded-full bg-primary" />
                            </motion.button>
                            <motion.button
                                onClick={stopCamera}
                                className="mt-4 px-6 py-2 text-neutral-400 text-lg hover:text-white"
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
                                className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <p className="mt-6 text-xl text-neutral-300 font-medium">{labels.analyzing}</p>
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
                                <h2 className="text-2xl font-bold text-green-500">{labels.matchFound}</h2>
                            </div>

                            {/* Medicine Card */}
                            <div className="bg-neutral-900 rounded-2xl p-5 shadow-xl border-l-4" style={{ borderColor: getColorHex(matchedMedicine.visualColor) }}>
                                <h3 className="text-2xl font-bold text-white mb-2">{matchedMedicine.name}</h3>
                                <p className="text-neutral-400 mb-4">{matchedMedicine.visualDescription || matchedMedicine.dosage}</p>
                                
                                {/* Expiry if available */}
                                {(scannedData?.expiryDate || matchedMedicine.expiryDate) && (
                                    <div className="flex items-center gap-2 p-3 bg-yellow-950/30 border border-yellow-900/50 rounded-xl">
                                        <span className="text-2xl">📅</span>
                                        <div>
                                            <p className="text-sm text-neutral-500">{labels.expires}</p>
                                            <p className="font-bold text-white">{scannedData?.expiryDate || matchedMedicine.expiryDate}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Try Again Button */}
                            <motion.button
                                onClick={handleTryAgain}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg"
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
                                <h2 className="text-2xl font-bold text-red-500">{labels.noMatch}</h2>
                            </div>

                            {/* Typical Use - Only show this */}
                            {scannedData?.usualUse && (
                                <div className="bg-blue-950/30 rounded-2xl p-5 border border-blue-900/50">
                                    <p className="text-sm text-blue-400 font-semibold mb-1">{labels.usualUse}:</p>
                                    <p className="text-lg text-blue-300">{scannedData.usualUse}</p>
                                </div>
                            )}

                            {/* Warning Message */}
                            <div className="p-4 bg-red-950/30 rounded-2xl border border-red-900/50">
                                <p className="text-red-400">{labels.notInList}</p>
                            </div>

                            {/* Try Again Button */}
                            <motion.button
                                onClick={handleTryAgain}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg"
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

            {/* Global Voice/Mic Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent pointer-events-none z-50">
                <div className="pointer-events-auto">
                    <DualActionButtons onRepeat={() => speak(labels.title)} />
                </div>
            </div>
            {/* Drug Interaction Modal — full-screen overlay */}
            <DrugInteractionModal
                isVisible={!!interactionData}
                severity={interactionData?.severity}
                newMedicine={interactionData?.newMedicine}
                conflictingMedicine={interactionData?.conflictingMedicine}
                reason={interactionData?.reason}
                precautions={interactionData?.precautions}
                language={language}
                onDismiss={() => {
                    setInteractionData(null);
                    handleTryAgain();
                }}
            />
        </motion.div>
    );
};

export default ScanMedicine;
