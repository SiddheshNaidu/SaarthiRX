/**
 * MedicineVerifier Component
 * "Check My Medicine" feature - allows users to photograph their actual pills
 * to verify expiry and visual appearance
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { analyzeMedicinePhoto } from '../services/geminiService';
import { updateMedicineVisual } from '../services/medicationService';
import { compressImage, createPreviewUrl, revokePreviewUrl } from '../utils/imageUtils';
import { triggerAction, triggerSuccess, triggerAlert } from '../utils/haptics';

const STATES = {
    IDLE: 'IDLE',
    CAMERA: 'CAMERA',
    PREVIEW: 'PREVIEW',
    ANALYZING: 'ANALYZING',
    RESULTS: 'RESULTS',
    ERROR: 'ERROR'
};

const MedicineVerifier = ({ 
    medicine,              // Medicine object from prescription scan
    onVerified,           // Callback when verification complete
    onClose               // Callback to close the verifier
}) => {
    const { language } = useApp();
    const { speak } = useVoice();
    
    const [state, setState] = useState(STATES.IDLE);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [verificationResult, setVerificationResult] = useState(null);
    const [error, setError] = useState('');
    
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const imageDataRef = useRef(null);

    // Translations
    const t = {
        title: {
            'en-US': 'Check Your Medicine',
            'hi-IN': 'अपनी दवाई जांचें',
            'mr-IN': 'तुमचे औषध तपासा'
        },
        instruction: {
            'en-US': 'Take a photo of your tablet or medicine bottle',
            'hi-IN': 'अपनी गोली या दवाई की बोतल की फोटो लें',
            'mr-IN': 'तुमच्या गोळीचा किंवा औषधाच्या बाटलीचा फोटो घ्या'
        },
        analyzing: {
            'en-US': 'Checking your medicine...',
            'hi-IN': 'आपकी दवाई जांच रहा हूँ...',
            'mr-IN': 'तुमचे औषध तपासत आहे...'
        },
        expires: {
            'en-US': 'Expires',
            'hi-IN': 'समाप्ति तिथि',
            'mr-IN': 'कालबाह्य होते'
        },
        looksLike: {
            'en-US': 'This medicine looks like',
            'hi-IN': 'यह दवाई ऐसी दिखती है',
            'mr-IN': 'हे औषध असे दिसते'
        },
        matches: {
            'en-US': '✓ Matches your prescription!',
            'hi-IN': '✓ आपके पर्चे से मेल खाती है!',
            'mr-IN': '✓ तुमच्या प्रिस्क्रिप्शनशी जुळते!'
        },
        saved: {
            'en-US': 'Medicine details saved',
            'hi-IN': 'दवाई का विवरण सहेजा गया',
            'mr-IN': 'औषधाचे तपशील जतन केले'
        },
        tryAgain: {
            'en-US': 'Try Again',
            'hi-IN': 'फिर से कोशिश करें',
            'mr-IN': 'पुन्हा प्रयत्न करा'
        },
        done: {
            'en-US': 'Done',
            'hi-IN': 'हो गया',
            'mr-IN': 'झाले'
        }
    };

    const getText = (key) => t[key]?.[language] || t[key]?.['en-US'];

    // Open camera
    const openCamera = async () => {
        triggerAction();
        setState(STATES.CAMERA);

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
        } catch (err) {
            console.error('Camera error:', err);
            // Fallback to file input
            setState(STATES.IDLE);
            fileInputRef.current?.click();
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    // Capture from video
    const capturePhoto = () => {
        if (!videoRef.current) return;

        triggerAction();
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);

        stopCamera();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];

        setPreviewUrl(dataUrl);
        imageDataRef.current = { base64, mimeType: 'image/jpeg' };
        setState(STATES.PREVIEW);

        // Auto-analyze after showing preview
        setTimeout(() => analyzePhoto(), 1000);
    };

    // Handle file selection
    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const preview = createPreviewUrl(file);
            setPreviewUrl(preview);

            const compressed = await compressImage(file);
            imageDataRef.current = compressed;
            setState(STATES.PREVIEW);

            // Auto-analyze
            setTimeout(() => analyzePhoto(), 1000);
        } catch (err) {
            console.error('File processing error:', err);
            setError('Could not process image');
            setState(STATES.ERROR);
        }
    };

    // Analyze the photo with Gemini
    const analyzePhoto = async () => {
        if (!imageDataRef.current) return;

        setState(STATES.ANALYZING);
        speak(getText('analyzing'));

        try {
            const result = await analyzeMedicinePhoto(
                imageDataRef.current.base64,
                imageDataRef.current.mimeType,
                medicine?.name
            );

            if (result.success) {
                setVerificationResult(result.data);
                setState(STATES.RESULTS);
                triggerSuccess();

                // Update medicine record if we have an ID
                if (medicine?.id) {
                    await updateMedicineVisual(medicine.id, result.data, previewUrl);
                }

                // Announce result
                const description = result.data.visualDescription || 'medicine';
                speak(`${getText('looksLike')}: ${description}`);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setError(err.message || 'Could not analyze medicine');
            setState(STATES.ERROR);
            triggerAlert();
        }
    };

    // Reset for retry
    const handleRetry = () => {
        if (previewUrl) revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
        setVerificationResult(null);
        setError('');
        imageDataRef.current = null;
        setState(STATES.IDLE);
    };

    // Complete and close
    const handleDone = () => {
        triggerSuccess();
        speak(getText('saved'));
        onVerified?.(verificationResult);
        onClose?.();
    };

    // Cleanup
    const handleClose = () => {
        stopCamera();
        if (previewUrl) revokePreviewUrl(previewUrl);
        onClose?.();
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <motion.div
                    className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl"
                    initial={{ scale: 0.9, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-white flex items-center justify-between">
                        <h2 className="text-xl font-bold">{getText('title')}</h2>
                        <button 
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-4">
                        {/* Medicine info */}
                        {medicine && (
                            <div className="bg-gray-50 rounded-2xl p-3 mb-4 flex items-center gap-3">
                                <div className="text-3xl">💊</div>
                                <div>
                                    <p className="font-semibold text-gray-800">{medicine.name}</p>
                                    <p className="text-sm text-gray-500">{medicine.dosage}</p>
                                </div>
                            </div>
                        )}

                        {/* IDLE State - Capture options */}
                        {state === STATES.IDLE && (
                            <div className="space-y-4">
                                <p className="text-center text-gray-600">{getText('instruction')}</p>
                                
                                <motion.button
                                    onClick={openCamera}
                                    className="w-full p-6 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="text-4xl mb-2">📷</div>
                                    <span className="text-lg font-semibold">Take Photo</span>
                                </motion.button>

                                <motion.button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full p-4 rounded-2xl border-2 border-gray-200 text-gray-700"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <span className="text-2xl mr-2">🖼️</span>
                                    <span>From Gallery</span>
                                </motion.button>
                            </div>
                        )}

                        {/* CAMERA State - Live preview */}
                        {state === STATES.CAMERA && (
                            <div className="space-y-4">
                                <div className="relative rounded-2xl overflow-hidden border-4 border-primary">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full"
                                        style={{ maxHeight: '300px' }}
                                    />
                                </div>

                                <motion.button
                                    onClick={capturePhoto}
                                    className="w-full p-4 rounded-full bg-primary text-white font-bold text-lg"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    📸 Capture
                                </motion.button>
                            </div>
                        )}

                        {/* PREVIEW / ANALYZING State */}
                        {(state === STATES.PREVIEW || state === STATES.ANALYZING) && previewUrl && (
                            <div className="space-y-4">
                                <img 
                                    src={previewUrl} 
                                    alt="Medicine" 
                                    className="w-full rounded-2xl"
                                    style={{ maxHeight: '250px', objectFit: 'cover' }}
                                />
                                
                                {state === STATES.ANALYZING && (
                                    <div className="flex items-center justify-center gap-3">
                                        <motion.div
                                            className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        />
                                        <span className="text-gray-600">{getText('analyzing')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* RESULTS State */}
                        {state === STATES.RESULTS && verificationResult && (
                            <div className="space-y-4">
                                {/* Photo preview */}
                                {previewUrl && (
                                    <img 
                                        src={previewUrl} 
                                        alt="Your medicine" 
                                        className="w-full h-40 object-cover rounded-2xl"
                                    />
                                )}

                                {/* Visual description */}
                                <div className="bg-blue-50 rounded-2xl p-4">
                                    <p className="text-sm text-blue-600 mb-1">{getText('looksLike')}:</p>
                                    <p className="text-lg font-semibold text-blue-800">
                                        {verificationResult.visualDescription || 'Medicine'}
                                    </p>
                                </div>

                                {/* Expiry date */}
                                {verificationResult.expiryDate && (
                                    <div className="bg-amber-50 rounded-2xl p-4 flex items-center gap-3">
                                        <span className="text-2xl">📅</span>
                                        <div>
                                            <p className="text-sm text-amber-600">{getText('expires')}</p>
                                            <p className="text-lg font-bold text-amber-800">
                                                {verificationResult.expiryDate}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Match indicator */}
                                {verificationResult.matchesExpected && (
                                    <div className="bg-green-50 rounded-2xl p-4 text-center">
                                        <p className="text-lg font-semibold text-green-700">
                                            {getText('matches')}
                                        </p>
                                    </div>
                                )}

                                {/* Done button */}
                                <motion.button
                                    onClick={handleDone}
                                    className="w-full p-4 rounded-2xl bg-green-500 text-white font-bold text-lg"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    ✓ {getText('done')}
                                </motion.button>
                            </div>
                        )}

                        {/* ERROR State */}
                        {state === STATES.ERROR && (
                            <div className="text-center space-y-4">
                                <div className="text-5xl">❌</div>
                                <p className="text-red-600">{error}</p>
                                <motion.button
                                    onClick={handleRetry}
                                    className="px-6 py-3 bg-primary text-white rounded-full font-semibold"
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {getText('tryAgain')}
                                </motion.button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MedicineVerifier;
