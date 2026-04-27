import React from 'react';
/**
 * MyMedicines Page
 * Phase 3: Stabilized UI with consistent card heights and rich detail view
 * Based on reference design: Prescription Details with visual pill, timing, instructions
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { verifyMedicinePhoto } from '../services/geminiService';
import { triggerAction, triggerSuccess, triggerAlert } from '../utils/haptics';
import { compressImage, createPreviewUrl } from '../utils/imageUtils';
import DualActionButtons from '../components/DualActionButtons';
import { getRemainingDays } from '../services/reminderService';


const MyMedicines = () => {
    const navigate = useNavigate();
    const { language } = useApp();
    const { speak } = useVoice();
    const { announce } = useVoiceButler();

    const [medicines, setMedicines] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    
    // Blind Verification State
    const [verificationResult, setVerificationResult] = useState(null);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const hasAnnounced = useRef(false);

    // Labels
    const t = {
        'en-US': {
            title: 'My Medicines',
            subtitle: 'Your medicine inventory',
            prescriptionDetails: 'Prescription Details',
            addNew: 'Add Medicine',
            empty: 'No medicines yet',
            emptyHint: "Say 'Scan' to add one",
            quantity: 'Qty',
            lowStock: 'Running Low!',
            expires: 'Expires',
            details: 'View Details',
            camera: 'Take Photo',
            analyzing: 'Show me the medicine. I will tell you if it matches.',
            blurryImage: 'I cannot read the name clearly. Please hold the medicine steady and try again.',
            notInPrescription: 'Warning: I do not see this medicine in your prescription. Please check with your doctor.',
            matchFound: 'Yes! This medicine matches your prescription.',
            added: 'Medicine verified and saved!',
            verifying: 'Reading medicine name...',
            back: 'Back',
            howItLooks: 'How it looks',
            whenToTake: 'When to Take',
            duration: 'Duration',
            days: 'days',
            takeWithFood: 'Take with food',
            takeOnEmptyStomach: 'Take on empty stomach',
            goBack: '← Go Back',
            repeatInstructions: 'Repeat Instructions',
            tryAgain: 'Could not identify medicine. Please try again with a clearer photo.',
            timeoutError: 'Taking too long. Check internet and try again.',
            matchFoundTitle: 'Match Found!',
            notInPrescriptionTitle: 'Not in Prescription',
            unknown: 'Unknown',
            ok: 'OK',
            checkDoctor: 'Please check with your doctor.',
            viewFullDetails: 'View Full Prescription Details',
            daysLeft: 'days left',
            dayLeft: 'day left',
            ongoing: 'Ongoing',
            courseComplete: 'Course complete'
        },
        'hi-IN': {
            title: 'मेरी दवाइयां',
            subtitle: 'आपकी दवाई सूची',
            prescriptionDetails: 'पर्चे का विवरण',
            addNew: 'दवाई जोड़ें',
            empty: 'कोई दवाई नहीं',
            emptyHint: "'स्कैन' बोलें जोड़ने के लिए",
            quantity: 'मात्रा',
            lowStock: 'कम हो रहा है!',
            expires: 'समाप्ति',
            details: 'विवरण देखें',
            camera: 'फोटो लें',
            analyzing: 'मुझे दवाई दिखाएं। मैं बताऊंगा यह मेल खाती है या नहीं।',
            blurryImage: 'मैं नाम स्पष्ट रूप से नहीं पढ़ पा रहा। कृपया दवाई स्थिर रखें और फिर कोशिश करें।',
            notInPrescription: 'चेतावनी: यह दवाई आपके पर्चे में नहीं है। कृपया अपने डॉक्टर से जांच करें।',
            matchFound: 'हाँ! यह दवाई आपके पर्चे से मेल खाती है।',
            added: 'दवाई सत्यापित और सहेजी गई!',
            verifying: 'दवाई का नाम पढ़ रहा हूँ...',
            back: 'वापस',
            howItLooks: 'कैसी दिखती है',
            whenToTake: 'कब लेना है',
            duration: 'अवधि',
            days: 'दिन',
            takeWithFood: 'खाने के साथ लें',
            takeOnEmptyStomach: 'खाली पेट लें',
            goBack: '← वापस जाएं',
            repeatInstructions: 'निर्देश दोहराएं',
            tryAgain: 'दवाई पहचान नहीं सकी। कृपया स्पष्ट फोटो से पुनः प्रयास करें।',
            timeoutError: 'बहुत समय लग रहा है। इंटरनेट जांचें और फिर प्रयास करें।',
            matchFoundTitle: 'मेल मिला!',
            notInPrescriptionTitle: 'पर्चे में नहीं',
            unknown: 'अज्ञात',
            ok: 'ठीक है',
            checkDoctor: 'कृपया अपने डॉक्टर से जांच करें।',
            viewFullDetails: 'पूरा पर्चा विवरण देखें',
            daysLeft: 'दिन बाकी',
            dayLeft: 'दिन बाकी',
            ongoing: 'चालू',
            courseComplete: 'कोर्स पूरा'
        },
        'mr-IN': {
            title: 'माझी औषधे',
            subtitle: 'तुमची औषध यादी',
            prescriptionDetails: 'प्रिस्क्रिप्शन तपशील',
            addNew: 'औषध जोडा',
            empty: 'कोणतेही औषध नाही',
            emptyHint: "जोडण्यासाठी 'स्कॅन' म्हणा",
            quantity: 'प्रमाण',
            lowStock: 'कमी होत आहे!',
            expires: 'कालबाह्य',
            details: 'तपशील पहा',
            camera: 'फोटो घ्या',
            analyzing: 'औषध तपासत आहे...',
            notInPrescription: 'हे औषध तुमच्या प्रिस्क्रिप्शनमध्ये नाही.',
            added: 'औषध जोडले!',
            back: 'मागे',
            howItLooks: 'कसे दिसते',
            whenToTake: 'कधी घ्यायचे',
            duration: 'कालावधी',
            days: 'दिवस',
            takeWithFood: 'जेवणासोबत घ्या',
            takeOnEmptyStomach: 'रिकाम्या पोटी घ्या',
            goBack: '← मागे जा',
            repeatInstructions: 'सूचना पुन्हा सांगा',
            tryAgain: 'औषध ओळखता आले नाही. कृपया स्पष्ट फोटोसह पुन्हा प्रयत्न करा.',
            timeoutError: 'खूप वेळ लागत आहे. इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.',
            matchFoundTitle: 'जुळले!',
            notInPrescriptionTitle: 'प्रिस्क्रिप्शनमध्ये नाही',
            unknown: 'अज्ञात',
            ok: 'ठीक आहे',
            checkDoctor: 'कृपया तुमच्या डॉक्टरांशी तपासा.',
            viewFullDetails: 'संपूर्ण प्रिस्क्रिप्शन तपशील पहा',
            daysLeft: 'दिवस बाकी',
            dayLeft: 'दिवस बाकी',
            ongoing: 'चालू',
            courseComplete: 'कोर्स पूर्ण'
        }
    };

    const labels = t[language] || t['en-US'];

    // Color mapping
    const colorMap = {
        white: '#F9FAFB', pink: '#F472B6', blue: '#3B82F6', red: '#EF4444',
        yellow: '#FBBF24', green: '#10B981', orange: '#F97316', brown: '#92400E',
        purple: '#8B5CF6', gray: '#9CA3AF'
    };

    const getColor = (colorName) => colorMap[colorName?.toLowerCase()] || '#3B82F6';

    // Load medicines on mount
    useEffect(() => {
        loadMedicines();
    }, []);

    // Announce on mount
    useEffect(() => {
        if (!hasAnnounced.current) {
            hasAnnounced.current = true;
            const msg = {
                'en-US': 'Your medicines',
                'hi-IN': 'आपकी दवाइयां',
                'mr-IN': 'तुमची औषधे'
            };
            speak(msg[language] || msg['en-US']);
        }
    }, [language, speak]);

    const loadMedicines = () => {
        const saved = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
        // Ensure quantity field
        const withQuantity = saved.map(m => ({
            ...m,
            quantity: m.quantity ?? 30
        }));
        setMedicines(withQuantity);
    };

    // Open camera
    const openCamera = async () => {
        triggerAction();
        setShowCamera(true);
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
            setShowCamera(false);
            fileInputRef.current?.click();
        }
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setShowCamera(false);
    };

    const capturePhoto = async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        stopCamera();
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        await analyzeCapturedPhoto(dataUrl.split(',')[1], 'image/jpeg', dataUrl);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            const preview = createPreviewUrl(file);
            await analyzeCapturedPhoto(compressed.base64, compressed.mimeType, preview);
        } catch {
            triggerAlert();
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // BLIND VERIFICATION - User takes photo, AI identifies and cross-references
    // ═══════════════════════════════════════════════════════════════════════
    const analyzeCapturedPhoto = async (base64, mimeType, previewUrl) => {
        setAnalyzing(true);
        speak(labels.verifying);
        
        try {
            // Get prescription medicines from localStorage (scanned earlier)
            const prescriptionMeds = JSON.parse(localStorage.getItem('saarthi_prescription') || '[]');
            
            // Call blind verification API
            const result = await verifyMedicinePhoto(base64, mimeType, prescriptionMeds);
            
            if (!result.success) {
                triggerAlert();
                speak(labels.blurryImage);
                return;
            }
            
            // Handle unreadable image (blurry, glare, etc.)
            if (!result.isReadable) {
                triggerAlert();
                speak(labels.blurryImage);
                console.log('📷 Unreadable image reason:', result.reason);
                return;
            }
            
            // Store verification result for modal display
            setVerificationResult({
                ...result,
                previewUrl
            });
            setShowVerificationModal(true);
            
            if (result.matchFound && result.matchedMedicine) {
                // SUCCESS: Match found in prescription
                triggerSuccess();
                speak(`${labels.matchFound} ${result.detectedName}`);
                
                // Update the matched medicine with user's photo
                const updatedMeds = medicines.map(med => 
                    med.id === result.matchedMedicine.id 
                        ? { ...med, userPhoto: previewUrl, verified: true }
                        : med
                );
                setMedicines(updatedMeds);
                localStorage.setItem('saarthi_medicines', JSON.stringify(updatedMeds));
                
            } else {
                // WARNING: Not in prescription
                triggerAlert();
                speak(labels.notInPrescription);
            }
            
        } catch (error) {
            console.error('Verification error:', error);
            
            let message = labels.blurryImage;
            
            // Handle timeout specifically
            if (error.message === 'API_TIMEOUT') {
                message = labels.timeoutError;
            }
            
            triggerAlert();
            speak(message);
        } finally {
            setAnalyzing(false);
        }
    };

    // Get timing display
    const getTimingDisplay = (medicine) => {
        const timings = medicine.timing || ['morning'];
        const icons = { morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙' };
        return timings.map(t => ({ icon: icons[t] || '💊', label: t }));
    };

    return (
        <motion.div
            className="min-h-[100dvh] w-full bg-neutral-950 flex flex-col relative overflow-hidden pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header - Matching ReminderList style with Blue color */}
            <div className="bg-neutral-900 border-b border-white/5 p-6 pt-8 max-h-min pb-10 rounded-b-3xl shadow-2xl relative z-10">
                <motion.button
                    onClick={() => navigate('/dashboard')}
                    className="w-12 h-12 bg-neutral-900/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 text-white/80 hover:text-white mb-6"
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="text-2xl">←</span>
                </motion.button>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2 tracking-tight">{labels.title}</h1>
                <p className="text-base sm:text-lg text-white/50 font-medium">{labels.subtitle}</p>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 py-6 z-0 relative"><div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/100/10 rounded-full blur-[100px] pointer-events-none" />
                {medicines.length === 0 ? (
                    <motion.div
                        className="flex flex-col items-center justify-center py-16 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="text-8xl mb-6">💊</div>
                        <h2 className="text-2xl font-bold text-white/90 mb-2 tracking-tight">{labels.empty}</h2>
                        <p className="text-white/50 font-medium text-lg">{labels.emptyHint}</p>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {medicines.map((medicine, index) => (
                            <motion.div
                                key={medicine.id || index}
                                className="bg-neutral-900/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/5 relative overflow-hidden"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08 }}
                            >
                                {/* Color bar */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                                    style={{ backgroundColor: getColor(medicine.visualColor) }}
                                />

                                <div className="flex items-center gap-2 pl-1">
                                    {/* Visual */}
                                    <div className="shrink-0">
                                        {medicine.userPhoto ? (
                                            <img
                                                src={medicine.userPhoto}
                                                alt={medicine.name}
                                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shadow-sm"
                                            />
                                        ) : (
                                            <div
                                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-inner"
                                                style={{ backgroundColor: getColor(medicine.visualColor) + '20' }}
                                            >
                                                <div
                                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-md"
                                                    style={{ backgroundColor: getColor(medicine.visualColor) }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base sm:text-lg font-bold text-white/90 truncate">
                                            {medicine.name}
                                        </h3>
                                        <p className="text-sm font-medium text-white/50 truncate">
                                            {medicine.visualType || 'Tablet'} • {medicine.dosage || ''}
                                        </p>
                                        {/* Duration Badge */}
                                        {(() => {
                                            const duration = getRemainingDays({
                                                durationDays: medicine.durationDays,
                                                expiresAt: medicine.expiresAt,
                                                courseComplete: medicine.courseComplete
                                            });
                                            if (duration.isExpired) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs font-medium">
                                                        ✅ {labels.courseComplete}
                                                    </span>
                                                );
                                            } else if (duration.remaining !== null) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-medium">
                                                        ⏳ {duration.remaining} {duration.remaining === 1 ? labels.dayLeft : labels.daysLeft}
                                                    </span>
                                                );
                                            } else {
                                                return (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-medium">
                                                        🔄 {labels.ongoing}
                                                    </span>
                                                );
                                            }
                                        })()}
                                    </div>

                                    {/* Quantity + Details */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <div className={`px-3 py-1 rounded-full text-base font-bold ${
                                            medicine.quantity < 3
                                                ? 'bg-red-500/100/10 text-red-400 border border-red-500/20'
                                                : 'bg-neutral-800 text-white/70 border border-white/10'
                                        }`}>
                                            {medicine.quantity}
                                        </div>

                                        <motion.button
                                            onClick={() => setSelectedMedicine(medicine)}
                                            className="w-10 h-10 rounded-xl bg-blue-500/100/10 text-blue-400 flex items-center justify-center border border-blue-500/20 font-semibold mt-1"
                                            whileTap={{ scale: 0.95 }}
                                            aria-label={`${labels.details} ${medicine.name}`}
                                        >
                                            👁️
                                        </motion.button>
                                    </div>
                                </div>

                                {medicine.quantity < 3 && (
                                    <div className="mt-2 pl-6 text-base text-red-500 font-semibold">
                                        ⚠️ {labels.lowStock}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
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

            {/* Camera Modal */}
            <AnimatePresence>
                {showCamera && (
                    <motion.div
                        className="fixed inset-0 bg-black z-50 flex flex-col"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
                        <div className="absolute bottom-0 inset-x-0 p-6 flex justify-center gap-4">
                            <motion.button
                                onClick={stopCamera}
                                className="w-16 h-16 rounded-full bg-neutral-900/20 text-white flex items-center justify-center text-2xl"
                                whileTap={{ scale: 0.9 }}
                            >
                                ✕
                            </motion.button>
                            <motion.button
                                onClick={capturePhoto}
                                className="w-20 h-20 rounded-full bg-neutral-900 text-blue-500 flex items-center justify-center text-3xl shadow-lg"
                                whileTap={{ scale: 0.9 }}
                            >
                                📸
                            </motion.button>
                            <motion.button
                                onClick={() => { stopCamera(); fileInputRef.current?.click(); }}
                                className="w-16 h-16 rounded-full bg-neutral-900/20 text-white flex items-center justify-center text-2xl"
                                whileTap={{ scale: 0.9 }}
                            >
                                🖼️
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Analyzing Overlay */}
            <AnimatePresence>
                {analyzing && (
                    <motion.div
                        className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="w-16 h-16 border-4 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <p className="text-white text-xl mt-4">{labels.analyzing}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rich Detail Modal - Based on Reference Design */}
            <AnimatePresence>
                {selectedMedicine && (
                    <motion.div
                        className="fixed inset-0 bg-neutral-950 z-50 overflow-y-auto pt- safe-top"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        {/* Header */}
                        <div className="bg-neutral-900 border-b border-white/5 p-6 pt-10 rounded-b-3xl relative z-10">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-1 tracking-tight">{labels.prescriptionDetails}</h1>
                            {selectedMedicine.doctorName && (
                                <p className="text-white/80">{selectedMedicine.doctorName}</p>
                            )}
                            {selectedMedicine.prescriptionDate && (
                                <p className="text-white/70 text-base">{selectedMedicine.prescriptionDate}</p>
                            )}
                        </div>

                        {/* Medicine Name Card */}
                        <div className="p-4">
                            <div
                                className="bg-neutral-900 rounded-2xl p-5 shadow-lg border-l-4"
                                style={{ borderColor: getColor(selectedMedicine.visualColor) }}
                            >
                                <h2 className="text-2xl font-bold text-white/90 mb-2">
                                    {selectedMedicine.name}
                                </h2>
                                <span className="inline-block px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium">
                                    {selectedMedicine.visualType || 'tablet'}
                                </span>
                            </div>
                        </div>

                        {/* How it Looks Section */}
                        <div className="p-4">
                            <div className="bg-neutral-900 rounded-2xl p-5 shadow-md">
                                <h3 className="text-lg font-semibold text-white/80 mb-4">{labels.howItLooks}</h3>
                                <div className="flex justify-center mb-4">
                                    {selectedMedicine.userPhoto ? (
                                        <img
                                            src={selectedMedicine.userPhoto}
                                            alt={selectedMedicine.name}
                                            className="w-32 h-32 rounded-full object-cover shadow-lg"
                                        />
                                    ) : (
                                        <div
                                            className="w-32 h-32 rounded-full shadow-xl flex items-center justify-center"
                                            style={{
                                                backgroundColor: getColor(selectedMedicine.visualColor),
                                                boxShadow: `0 15px 40px ${getColor(selectedMedicine.visualColor)}50`
                                            }}
                                        />
                                    )}
                                </div>
                                <p className="text-center text-white/60">
                                    💊 {selectedMedicine.visualDescription ||
                                    `Small, round, ${selectedMedicine.visualColor || 'white'} ${selectedMedicine.visualType || 'tablet'}.`}
                                </p>
                            </div>
                        </div>

                        {/* When to Take Section - Show specific timings */}
                        <div className="p-4">
                            <div className="bg-neutral-900 rounded-2xl p-5 shadow-md">
                                <h3 className="text-lg font-semibold text-white/80 mb-3">{labels.whenToTake}</h3>
                                
                                {/* Specific Timing Pills */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(selectedMedicine.timing || ['morning']).map((time, idx) => {
                                        const timingInfo = {
                                            morning: { icon: '🌅', label: { 'en-US': 'Morning (9 AM)', 'hi-IN': 'सुबह (9 बजे)', 'mr-IN': 'सकाळी (9 वाजता)' }, bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
                                            afternoon: { icon: '☀️', label: { 'en-US': 'Afternoon (2 PM)', 'hi-IN': 'दोपहर (2 बजे)', 'mr-IN': 'दुपारी (2 वाजता)' }, bg: 'bg-orange-500/10', text: 'text-orange-400' },
                                            evening: { icon: '🌆', label: { 'en-US': 'Evening (6 PM)', 'hi-IN': 'शाम (6 बजे)', 'mr-IN': 'संध्याकाळी (6 वाजता)' }, bg: 'bg-purple-500/10', text: 'text-purple-400' },
                                            night: { icon: '🌙', label: { 'en-US': 'Night (9 PM)', 'hi-IN': 'रात (9 बजे)', 'mr-IN': 'रात्री (9 वाजता)' }, bg: 'bg-blue-500/10', text: 'text-blue-400' }
                                        };
                                        const info = timingInfo[time] || timingInfo.morning;
                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full ${info.bg} ${info.text}`}
                                            >
                                                <span className="text-xl">{info.icon}</span>
                                                <span className="font-medium">{info.label[language] || info.label['en-US']}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Frequency summary */}
                                <p className="text-white/50 text-sm">
                                    {selectedMedicine.frequency || `${(selectedMedicine.timing || ['morning']).length}x daily`}
                                </p>
                            </div>
                        </div>

                        {/* With Food / Empty Stomach */}
                        <div className="p-4">
                            <div className="bg-neutral-900 rounded-2xl p-5 shadow-md flex items-center gap-4">
                                <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">
                                        {selectedMedicine.withFood ? '🍽️' : '🚫'}
                                    </span>
                                </div>
                                <span className="text-lg text-white/80">
                                    {selectedMedicine.withFood ? labels.takeWithFood : labels.takeOnEmptyStomach}
                                </span>
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="p-4">
                            <div className="bg-neutral-900 rounded-2xl p-5 shadow-md flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">📅</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-white/50">{labels.duration}</p>
                                    <p className="text-xl font-bold text-white/90">
                                        {selectedMedicine.durationDays || 30} {labels.days}
                                    </p>
                                </div>
                                {/* Remaining days badge */}
                                {(() => {
                                    const duration = getRemainingDays({
                                        durationDays: selectedMedicine.durationDays,
                                        expiresAt: selectedMedicine.expiresAt,
                                        courseComplete: selectedMedicine.courseComplete
                                    });
                                    if (duration.isExpired) {
                                        return <span className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-semibold">✅ {labels.courseComplete}</span>;
                                    } else if (duration.remaining !== null) {
                                        return <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm font-semibold">⏳ {duration.remaining} {duration.remaining === 1 ? labels.dayLeft : labels.daysLeft}</span>;
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>

                        {/* Bottom Buttons */}
                        <div className="p-4 pb-8 flex flex-col gap-3">
                            <motion.button
                                onClick={() => navigate(`/prescription/${selectedMedicine.id || 'details'}`, { state: { medicine: selectedMedicine } })}
                                className="w-full py-4 bg-blue-500/10 text-blue-400 border-2 border-blue-500/20 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                                whileTap={{ scale: 0.95 }}
                                aria-label={labels.viewFullDetails}
                            >
                                📋 {labels.viewFullDetails}
                            </motion.button>
                            <div className="flex gap-3">
                                <motion.button
                                    onClick={() => setSelectedMedicine(null)}
                                    className="flex-1 py-4 bg-neutral-800 text-white/70 border border-white/10 rounded-2xl font-bold text-lg"
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {labels.goBack}
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        const msg = `${selectedMedicine.name}. ${selectedMedicine.visualDescription || 'Take'} ${selectedMedicine.frequency || 'daily'}. ${selectedMedicine.withFood ? labels.takeWithFood : labels.takeOnEmptyStomach}.`;
                                        speak(msg);
                                    }}
                                    className="flex-1 py-4 bg-orange-500/100 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                                    whileTap={{ scale: 0.95 }}
                                >
                                    🔊 {labels.repeatInstructions}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════════
                BLIND VERIFICATION RESULT MODAL
            ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showVerificationModal && verificationResult && (
                    <motion.div 
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowVerificationModal(false)}
                    >
                        <motion.div 
                            className={`rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl ${
                                verificationResult.matchFound 
                                    ? 'bg-neutral-900 border-4 border-green-500/50' 
                                    : 'bg-neutral-900 border-4 border-red-500/50'
                            }`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Result Icon */}
                            <div className="text-8xl mb-4">
                                {verificationResult.matchFound ? '✅' : '⚠️'}
                            </div>
                            
                            {/* Result Title */}
                                <h2 className={`text-2xl font-bold mb-3 ${
                                    verificationResult.matchFound ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {verificationResult.matchFound ? labels.matchFoundTitle : labels.notInPrescriptionTitle}
                            </h2>
                            
                            {/* Detected Medicine Name */}
                            <p className={`text-xl font-semibold mb-4 ${
                                verificationResult.matchFound ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {verificationResult.detectedName || labels.unknown}
                            </p>
                            
                            {/* Preview Image */}
                            {verificationResult.previewUrl && (
                                <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                                    <img 
                                        src={verificationResult.previewUrl} 
                                        alt="Medicine" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            
                            {/* Warning Message for No Match */}
                            {!verificationResult.matchFound && (
                                <p className="text-red-600 text-base mb-4 font-medium">
                                    {labels.checkDoctor}
                                </p>
                            )}
                            
                            {/* Close Button */}
                            <motion.button
                                onClick={() => setShowVerificationModal(false)}
                                className={`w-full py-4 rounded-2xl font-bold text-lg text-white ${
                                    verificationResult.matchFound ? 'bg-green-500/100' : 'bg-red-500/100'
                                }`}
                                whileTap={{ scale: 0.95 }}
                                aria-label={labels.ok}
                            >
                                {labels.ok}
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Action Button */}
            <DualActionButtons />
        </motion.div>
    );
};

export default MyMedicines;
