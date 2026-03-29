/**
 * ScanPrescription Page
 * Elder-friendly prescription capture with Gemini AI analysis
 * Enhanced with Voice Negotiation, Visual Verifier, and Auto-Scheduler
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { triggerAction, triggerSuccess, triggerAlert } from '../utils/haptics';
import { compressImage, createPreviewUrl, revokePreviewUrl, clearImageData, validateImageFile } from '../utils/imageUtils';
import { analyzePrescription, checkDrugInteractions, generateVoiceSummary, generateConflictWarning } from '../services/geminiService';
import { saveMedicines } from '../services/medicationService';
import { createRemindersFromPrescription } from '../services/reminderService';
import { getPrompt } from '../utils/translations';
import DualActionButtons from '../components/DualActionButtons';
import VoiceNegotiation from '../components/VoiceNegotiation';
import MedicineVerifier from '../components/MedicineVerifier';
import { getDemoPrescriptionData } from '../utils/demoData';

// Scan states
const SCAN_STATES = {
    IDLE: 'IDLE',
    CAMERA_LIVE: 'CAMERA_LIVE',
    CAPTURING: 'CAPTURING',
    PREVIEW: 'PREVIEW',
    ANALYZING: 'ANALYZING',
    RESULTS: 'RESULTS',
    ERROR: 'ERROR'
};

const ScanPrescription = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language, user } = useApp();
    const { speak, transcript, resetTranscript } = useVoice();
    
    // Check for demo mode from URL param
    const isDemoMode = new URLSearchParams(location.search).get('demo') === 'true';

    const [scanState, setScanState] = useState(SCAN_STATES.IDLE);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [conflicts, setConflicts] = useState([]);
    const [error, setError] = useState('');
    
    // Voice Negotiation & Visual Verifier states
    const [showNegotiation, setShowNegotiation] = useState(false);
    const [showVerifier, setShowVerifier] = useState(false);
    const [selectedMedicineForVerify, setSelectedMedicineForVerify] = useState(null);
    const [savedMedicineIds, setSavedMedicineIds] = useState([]);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const imageDataRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Translations
    const t = {
        title: {
            'en-US': 'Scan Prescription',
            'hi-IN': 'पर्चा स्कैन करें',
            'mr-IN': 'प्रिस्क्रिप्शन स्कॅन करा'
        },
        camera: {
            'en-US': 'Take Photo',
            'hi-IN': 'फोटो लें',
            'mr-IN': 'फोटो घ्या'
        },
        gallery: {
            'en-US': 'From Gallery',
            'hi-IN': 'गैलरी से',
            'mr-IN': 'गॅलरीमधून'
        },
        analyzing: {
            'en-US': 'Reading your prescription...',
            'hi-IN': 'आपका पर्चा पढ़ रहा हूँ...',
            'mr-IN': 'तुमचे प्रिस्क्रिप्शन वाचत आहे...'
        },
        tryAgain: {
            'en-US': 'Try Again',
            'hi-IN': 'फिर से कोशिश करें',
            'mr-IN': 'पुन्हा प्रयत्न करा'
        },
        saveRemind: {
            'en-US': 'Save & Remind Me',
            'hi-IN': 'सहेजें और याद दिलाएं',
            'mr-IN': 'जतन करा आणि आठवण करा'
        },
        morning: {
            'en-US': 'Morning',
            'hi-IN': 'सुबह',
            'mr-IN': 'सकाळ'
        },
        afternoon: {
            'en-US': 'Afternoon',
            'hi-IN': 'दोपहर',
            'mr-IN': 'दुपार'
        },
        evening: {
            'en-US': 'Evening',
            'hi-IN': 'शाम',
            'mr-IN': 'संध्याकाळ'
        },
        night: {
            'en-US': 'Night',
            'hi-IN': 'रात',
            'mr-IN': 'रात्री'
        },
        quotaError: {
            'en-US': 'The AI helper is busy right now. Please wait 2 minutes and try again.',
            'hi-IN': 'AI सहायक अभी व्यस्त है। कृपया 2 मिनट रुकें और फिर से कोशिश करें।',
            'mr-IN': 'AI सहाय्यक सध्या व्यस्त आहे. कृपया 2 मिनिटे थांबा आणि पुन्हा प्रयत्न करा.'
        },
        noMedicinesFound: {
            'en-US': 'I could not read this prescription clearly. Please take a clearer photo.',
            'hi-IN': 'मैं यह पर्चा स्पष्ट रूप से नहीं पढ़ सका। कृपया एक साफ फोटो लें।',
            'mr-IN': 'मला हे प्रिस्क्रिप्शन स्पष्टपणे वाचता आले नाही. कृपया स्पष्ट फोटो घ्या.'
        },
        timeoutError: {
            'en-US': 'It is taking too long. Please ensure you have good internet and try again.',
            'hi-IN': 'इसमें बहुत समय लग रहा है। कृपया इंटरनेट की जाँच करें और फिर से प्रयास करें।',
            'mr-IN': 'याला खूप वेळ लागत आहे. कृपया तुमचे इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.'
        },
        handwritingError: {
            'en-US': 'I had trouble reading the doctor\'s handwriting. Please try again with better light.',
            'hi-IN': 'मुझे डॉक्टर की लिखावट पढ़ने में परेशानी हुई। कृपया बेहतर रोशनी में फिर से कोशिश करें।',
            'mr-IN': 'मला डॉक्टरांचे हस्ताक्षर वाचण्यात अडचण आली. कृपया चांगल्या प्रकाशात पुन्हा प्रयत्न करा.'
        }
    };

    const getText = (key) => t[key]?.[language] || t[key]?.['en-US'] || key;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) revokePreviewUrl(previewUrl);
            if (imageDataRef.current) {
                clearImageData(imageDataRef.current);
                imageDataRef.current = null;
            }
            // Stop camera stream on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [previewUrl]);

    // Demo Mode: Simulate AI scanning experience for judges
    useEffect(() => {
        if (!isDemoMode) return;
        
        console.log('🎬 Demo mode activated - simulating AI scan...');
        
        // Get demo prescription data
        const demoData = getDemoPrescriptionData();
        
        // Step 1: Show "analyzing" state with animation
        setScanState(SCAN_STATES.ANALYZING);
        speak(getText('analyzing'));
        
        // Step 2: After 3 seconds, show results
        const resultsTimer = setTimeout(async () => {
            // Build the analysis result in the same format as real API
            const simulatedResult = {
                medicines: demoData.medicines.map(m => ({
                    ...m,
                    timesPerDay: m.timing.length,
                    reminderTimes: m.timing.map(t => 
                        t === 'morning' ? '08:00' : 
                        t === 'afternoon' ? '14:00' : 
                        t === 'night' ? '21:00' : '08:00'
                    ),
                    durationWasGuessed: false
                })),
                doctorName: demoData.doctorName,
                date: demoData.date
            };
            
            setAnalysisResult(simulatedResult);
            setScanState(SCAN_STATES.RESULTS);
            triggerSuccess();
            
            // Generate and speak the voice summary
            const summary = generateVoiceSummary(simulatedResult.medicines, language);
            await speak(summary);
            
            // Auto-commit the medicines and reminders (same as real flow)
            await autoCommitMedicinesAndReminders(simulatedResult);
            
        }, 3000); // 3 second "analyzing" animation
        
        return () => clearTimeout(resultsTimer);
    }, [isDemoMode, language]);

    // Voice command detection for camera control (local handling)
    useEffect(() => {
        if (!transcript) return;

        const cmd = transcript.toLowerCase().trim();
        console.log('🎤 Voice command detected:', cmd);

        // Commands to OPEN camera (when in IDLE state)
        const openCameraCommands = ['camera', 'कैमरा', 'कॅमेरा', 'photo', 'फोटो', 'scan', 'स्कैन'];

        // Commands to CLICK/CAPTURE (when camera is live)
        const captureCommands = ['click', 'क्लिक', 'खींचो', 'capture', 'take', 'लो', 'ले लो', 'खिंचो'];

        // Check for camera open command
        if (scanState === SCAN_STATES.IDLE) {
            if (openCameraCommands.some(c => cmd.includes(c))) {
                console.log('📷 Opening camera via voice command');
                resetTranscript();
                startCamera();
                return;
            }
        }

        // Check for capture command
        if (scanState === SCAN_STATES.CAMERA_LIVE) {
            if (captureCommands.some(c => cmd.includes(c))) {
                console.log('📸 Capturing via voice command');
                resetTranscript();
                captureFromVideo();
                return;
            }
        }
    }, [transcript, scanState]);

    // ═══════════════════════════════════════════════════════════════════════
    // GLOBAL OMNI-ROUTER: Listen for voiceAction events from VoiceNavigation
    // This enables context-aware commands like "Photo lo" via the global listener
    // ═══════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const handleVoiceAction = (event) => {
            const { action } = event.detail;
            console.log('🎯 VoiceAction received:', action, 'State:', scanState);

            switch (action) {
                case 'CAMERA':
                    if (scanState === SCAN_STATES.IDLE) {
                        console.log('📷 Opening camera via Omni-Router');
                        startCamera();
                    }
                    break;
                    
                case 'GALLERY':
                    if (scanState === SCAN_STATES.IDLE) {
                        console.log('🖼️ Opening gallery via Omni-Router');
                        fileInputRef.current?.click();
                    }
                    break;
                    
                case 'CLICK':
                    if (scanState === SCAN_STATES.CAMERA_LIVE) {
                        console.log('📸 Capturing via Omni-Router');
                        captureFromVideo();
                    }
                    break;
                    
                default:
                    break;
            }
        };

        window.addEventListener('voiceAction', handleVoiceAction);
        return () => window.removeEventListener('voiceAction', handleVoiceAction);
    }, [scanState]);

    // Start live camera preview
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

            speak(getPrompt('SCAN', language));
        } catch (err) {
            console.error('Camera error:', err);
            // Fallback to file input if camera not available (desktop)
            setScanState(SCAN_STATES.IDLE);
            cameraInputRef.current?.click();
        }
    };

    // Stop camera stream
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setScanState(SCAN_STATES.IDLE);
    };

    // Capture photo from video stream
    const captureFromVideo = async () => {
        if (!videoRef.current) return;

        triggerAction();

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);

        // Stop camera
        stopCamera();

        // Get image data
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];

        setPreviewUrl(dataUrl);
        imageDataRef.current = {
            base64,
            mimeType: 'image/jpeg',
            previewUrl: dataUrl
        };

        setScanState(SCAN_STATES.PREVIEW);

        // Auto-analyze after brief preview
        setTimeout(() => {
            analyzeImage();
        }, 1000);
    };

    // Handle camera capture (fallback for file input)
    const handleCameraCapture = () => {
        // Try live camera first
        startCamera();
    };

    // Handle gallery selection
    const handleGallerySelect = () => {
        triggerAction();
        fileInputRef.current?.click();
    };

    // Process selected/captured image
    const handleImageSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error);
            setScanState(SCAN_STATES.ERROR);
            speak(validation.error);
            return;
        }

        try {
            setScanState(SCAN_STATES.PREVIEW);

            // Create preview
            const preview = createPreviewUrl(file);
            setPreviewUrl(preview);

            // Compress image
            const compressed = await compressImage(file);
            imageDataRef.current = { ...compressed, previewUrl: preview };

            // Auto-analyze after brief preview
            setTimeout(() => {
                analyzeImage();
            }, 1000);

        } catch (err) {
            console.error('Image processing error:', err);
            setError('Failed to process image');
            setScanState(SCAN_STATES.ERROR);
        }
    };

    // Analyze image with Gemini
    const analyzeImage = async () => {
        if (!imageDataRef.current) return;

        setScanState(SCAN_STATES.ANALYZING);
        speak(getText('analyzing'));

        try {
            const result = await analyzePrescription(
                imageDataRef.current.base64,
                imageDataRef.current.mimeType
            );

            // Privacy: Clear image data immediately after API call
            clearImageData(imageDataRef.current);
            imageDataRef.current = null;

            if (result.success && result.data?.medicines?.length > 0) {
                setAnalysisResult(result.data);

                // Check for drug interactions (Phase 5)
                const savedMeds = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
                const drugConflicts = checkDrugInteractions(result.data.medicines, savedMeds);
                setConflicts(drugConflicts);

                setScanState(SCAN_STATES.RESULTS);
                triggerSuccess();

                // Announce results
                const summary = generateVoiceSummary(result.data.medicines, language);
                await speak(summary);

                // If conflicts, announce warning with heavy vibration
                if (drugConflicts.length > 0) {
                    triggerAlert(); // Heavy vibration
                    setTimeout(async () => {
                        const warning = generateConflictWarning(drugConflicts, language);
                        await speak(warning);
                    }, 1500);
                }

                // ═══════════════════════════════════════════════════════════
                // PHASE 1: AUTO-COMMIT - Zero-Touch Medicine & Reminder Save
                // No "Save" button needed - happens instantly after analysis
                // ═══════════════════════════════════════════════════════════
                await autoCommitMedicinesAndReminders(result.data);

            } else {
                // Better error message for elders
                const errorMsg = result.isQuotaError
                    ? getText('quotaError')
                    : getText('noMedicinesFound');
                throw new Error(errorMsg);
            }

        } catch (err) {
            console.error('Analysis error:', err);
            
            let errorMessage = err.message;
            
            // Handle specific error types with user-friendly messages
            if (errorMessage === 'API_TIMEOUT') {
                errorMessage = getText('timeoutError');
            } else if (errorMessage === 'HANDWRITING_PARSE_ERROR' || errorMessage.includes('JSON')) {
                errorMessage = getText('handwritingError');
            }
            
            setError(errorMessage);
            setScanState(SCAN_STATES.ERROR);
            triggerAlert();

            // Speak the elder-friendly error message
            speak(errorMessage);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: AUTO-COMMIT - Brain-to-Body Connection
    // Automatically saves medicines & creates reminders after Gemini analysis
    // ═══════════════════════════════════════════════════════════════════════
    const autoCommitMedicinesAndReminders = async (analysisData) => {
        if (!analysisData?.medicines || analysisData.medicines.length === 0) return;

        console.log('🔄 Auto-commit starting for', analysisData.medicines.length, 'medicines');

        // STEP 1: LOCAL STORAGE SAVE (GUARANTEED - no auth required)
        const existing = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
        const duplicates = [];
        const newMedicines = [];

        analysisData.medicines.forEach(medicine => {
            // Check for duplicates in localStorage
            const isDuplicate = existing.some(m => 
                m.name?.toLowerCase().trim() === medicine.name?.toLowerCase().trim()
            );
            
            if (isDuplicate) {
                duplicates.push(medicine.name);
                console.log(`⚠️ Duplicate detected: ${medicine.name} - NOT adding`);
            } else {
                newMedicines.push({
                    ...medicine,
                    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    quantity: 30,
                    addedAt: Date.now(),
                    prescriptionDate: analysisData.date,
                    doctorName: analysisData.doctorName
                });
            }
        });

        // Save new medicines to localStorage
        if (newMedicines.length > 0) {
            localStorage.setItem('saarthi_medicines', JSON.stringify([...existing, ...newMedicines]));
            console.log(`💊 Saved ${newMedicines.length} medicines to localStorage`);
        }

        const newCount = newMedicines.length;
        const duplicateCount = duplicates.length;

        // STEP 2: CREATE REMINDERS (GUARANTEED - no auth required)
        let remindersCreated = 0;
        if (newMedicines.length > 0) {
            const schedulerResult = createRemindersFromPrescription(newMedicines, language);
            remindersCreated = schedulerResult.created;
            console.log(`📅 Auto-scheduled ${remindersCreated} reminders`);
        }

        // STEP 3: TRY FIREBASE SYNC (OPTIONAL - if user is authenticated)
        try {
            const saveResult = await saveMedicines(analysisData.medicines, {
                doctorName: analysisData.doctorName,
                date: analysisData.date
            });
            setSavedMedicineIds(saveResult.savedIds);
            console.log('☁️ Firebase sync successful');
        } catch (firebaseErr) {
            console.warn('☁️ Firebase sync skipped (not logged in):', firebaseErr.message);
            // No problem - localStorage is the source of truth for demo
        }

        // STEP 4: VOICE FEEDBACK
        let voiceMessage;
        if (duplicateCount > 0 && newCount > 0) {
            voiceMessage = {
                'en-US': `I have automatically added ${newCount} new ${newCount === 1 ? 'medicine' : 'medicines'} and set ${remindersCreated} ${remindersCreated === 1 ? 'reminder' : 'reminders'}. ${duplicateCount} ${duplicateCount === 1 ? 'was' : 'were'} already in your list.`,
                'hi-IN': `मैंने ${newCount} नई ${newCount === 1 ? 'दवाई' : 'दवाइयां'} जोड़ दी और ${remindersCreated} रिमाइंडर सेट कर दिए। ${duplicateCount} पहले से आपकी सूची में ${duplicateCount === 1 ? 'थी' : 'थीं'}।`,
                'mr-IN': `मी ${newCount} नवीन ${newCount === 1 ? 'औषध' : 'औषधे'} जोडले आणि ${remindersCreated} रिमाइंडर सेट केले. ${duplicateCount} आधीपासून तुमच्या यादीत ${duplicateCount === 1 ? 'होते' : 'होती'}.`
            };
        } else if (duplicateCount > 0 && newCount === 0) {
            voiceMessage = {
                'en-US': `All ${duplicateCount} medicines are already in your list. No new medicines added.`,
                'hi-IN': `सभी ${duplicateCount} दवाइयां पहले से आपकी सूची में हैं। कोई नई दवाई नहीं जोड़ी।`,
                'mr-IN': `सर्व ${duplicateCount} औषधे आधीपासून तुमच्या यादीत आहेत. कोणतेही नवीन औषध जोडले नाही.`
            };
        } else {
            voiceMessage = {
                'en-US': `I have automatically added ${newCount} ${newCount === 1 ? 'medicine' : 'medicines'} and set ${remindersCreated} ${remindersCreated === 1 ? 'reminder' : 'reminders'}. I will remind you at the right time.`,
                'hi-IN': `मैंने ${newCount} ${newCount === 1 ? 'दवाई' : 'दवाइयां'} जोड़ दी और ${remindersCreated} रिमाइंडर सेट कर दिए। मैं आपको सही समय पर याद दिलाऊंगा।`,
                'mr-IN': `मी ${newCount} ${newCount === 1 ? 'औषध' : 'औषधे'} जोडले आणि ${remindersCreated} रिमाइंडर सेट केले. मी तुम्हाला योग्य वेळी आठवण करून देईन.`
            };
        }
        
        // Announce after a brief delay
        setTimeout(async () => {
            await speak(voiceMessage[language] || voiceMessage['en-US']);
            triggerSuccess();
        }, 2000);
    };

    // Save medicines and set reminders (with Auto-Scheduler + Deduplication)
    const handleSaveAndRemind = async () => {
        if (!analysisResult?.medicines) return;

        triggerAction();

        try {
            // Save to Firestore (with deduplication)
            const saveResult = await saveMedicines(analysisResult.medicines, {
                doctorName: analysisResult.doctorName,
                date: analysisResult.date
            });
            
            const { savedIds, duplicates, newCount, duplicateCount } = saveResult;
            setSavedMedicineIds(savedIds);

            // Only save NEW medicines to localStorage (not duplicates)
            if (newCount > 0) {
                const existing = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
                const newMedicines = analysisResult.medicines
                    .filter(m => !duplicates.includes(m.name))
                    .map((m, i) => ({
                        ...m,
                        id: savedIds[i],
                        quantity: 30,
                        addedAt: Date.now(),
                        prescriptionDate: analysisResult.date
                    }));
                localStorage.setItem('saarthi_medicines', JSON.stringify([...existing, ...newMedicines]));
            }

            // Phase 2: Auto-Scheduler - Only for NEW medicines
            const newMeds = analysisResult.medicines.filter(m => !duplicates.includes(m.name));
            if (newMeds.length > 0) {
                const schedulerResult = createRemindersFromPrescription(newMeds, language);
                console.log(`📅 Auto-scheduled ${schedulerResult.created} reminders`);
            }

            // Generate friendly voice feedback about duplicates
            let voiceMessage;
            if (duplicateCount > 0 && newCount > 0) {
                // Some new, some duplicates
                voiceMessage = {
                    'en-US': `I added ${newCount} new ${newCount === 1 ? 'medicine' : 'medicines'}. ${duplicateCount} ${duplicateCount === 1 ? 'was' : 'were'} already in your list.`,
                    'hi-IN': `मैंने ${newCount} नई ${newCount === 1 ? 'दवाई' : 'दवाइयां'} जोड़ी। ${duplicateCount} पहले से आपकी सूची में ${duplicateCount === 1 ? 'थी' : 'थीं'}।`,
                    'mr-IN': `मी ${newCount} नवीन ${newCount === 1 ? 'औषध' : 'औषधे'} जोडली. ${duplicateCount} आधीपासून तुमच्या यादीत ${duplicateCount === 1 ? 'होते' : 'होती'}.`
                };
            } else if (duplicateCount > 0 && newCount === 0) {
                // All duplicates
                voiceMessage = {
                    'en-US': `All ${duplicateCount} medicines are already in your list. I did not add them again.`,
                    'hi-IN': `सभी ${duplicateCount} दवाइयां पहले से आपकी सूची में हैं। मैंने उन्हें दोबारा नहीं जोड़ा।`,
                    'mr-IN': `सर्व ${duplicateCount} औषधे आधीपासून तुमच्या यादीत आहेत. मी त्यांना पुन्हा जोडले नाही.`
                };
            } else {
                // All new
                voiceMessage = {
                    'en-US': `Added ${newCount} ${newCount === 1 ? 'medicine' : 'medicines'}. I will remind you at the right time.`,
                    'hi-IN': `${newCount} ${newCount === 1 ? 'दवाई' : 'दवाइयां'} जोड़ी। मैं आपको सही समय पर याद दिलाऊंगा।`,
                    'mr-IN': `${newCount} ${newCount === 1 ? 'औषध' : 'औषधे'} जोडले. मी तुम्हाला योग्य वेळी आठवण करून देईन.`
                };
            }
            await speak(voiceMessage[language] || voiceMessage['en-US']);

            triggerSuccess();

            // Navigate to dashboard
            setTimeout(() => {
                navigate('/dashboard');
            }, 2500);
        } catch (err) {
            console.error('Save error:', err);
            // Still navigate - data is in localStorage
            navigate('/dashboard');
        }
    };

    // Open medicine verifier for a specific medicine
    const handleCheckMedicine = (medicine, index) => {
        setSelectedMedicineForVerify({
            ...medicine,
            id: savedMedicineIds[index] || null
        });
        setShowVerifier(true);
    };

    // Handle voice negotiation complete
    const handleNegotiationComplete = (updatedTimes) => {
        setShowNegotiation(false);
        console.log('Negotiation complete, updated times:', updatedTimes);
    };

    // Retry scan
    const handleRetry = () => {
        setError('');
        setAnalysisResult(null);
        setConflicts([]);
        setScanState(SCAN_STATES.IDLE);
        if (previewUrl) {
            revokePreviewUrl(previewUrl);
            setPreviewUrl(null);
        }
    };

    // Get timing icon
    const getTimingIcon = (timing) => {
        if (timing?.includes('morning')) return '☀️';
        if (timing?.includes('afternoon')) return '🌤️';
        if (timing?.includes('evening')) return '🌅';
        if (timing?.includes('night')) return '🌙';
        return '💊';
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col p-6 pb-32 bg-gradient-to-b from-gray-50 to-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Hidden file inputs */}
            <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
            />
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
            />

            {/* Back Button */}
            <motion.button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
                whileTap={{ scale: 0.95 }}
            >
                <span className="text-2xl">←</span>
                <span className="text-lg font-medium">
                    {language === 'hi-IN' ? 'वापस' : language === 'mr-IN' ? 'मागे' : 'Back'}
                </span>
            </motion.button>

            {/* Title */}
            <motion.h1
                className="text-3xl font-bold text-gray-800 text-center mb-8"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                {getText('title')}
            </motion.h1>

            <AnimatePresence mode="wait">
                {/* IDLE State - Capture Options */}
                {scanState === SCAN_STATES.IDLE && (
                    <motion.div
                        key="idle"
                        className="flex-1 flex flex-col gap-6 justify-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {/* Camera Button - Primary */}
                        <motion.button
                            onClick={handleCameraCapture}
                            className="w-full p-8 rounded-3xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-premium-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="text-6xl mb-4">📷</div>
                            <div className="text-2xl font-bold">{getText('camera')}</div>
                        </motion.button>

                        {/* Gallery Button - Secondary */}
                        <motion.button
                            onClick={handleGallerySelect}
                            className="w-full p-6 rounded-2xl bg-white border-2 border-gray-200 shadow-md"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="text-4xl mb-2">🖼️</div>
                            <div className="text-xl font-semibold text-gray-700">{getText('gallery')}</div>
                        </motion.button>
                    </motion.div>
                )}

                {/* CAMERA_LIVE State - Live Camera Preview */}
                {scanState === SCAN_STATES.CAMERA_LIVE && (
                    <motion.div
                        key="camera-live"
                        className="flex-1 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Live Video Feed */}
                        <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-lg border-4 border-primary">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-auto"
                                style={{ maxHeight: '50vh' }}
                            />
                            {/* Camera overlay frame */}
                            <div className="absolute inset-0 border-4 border-dashed border-white/50 m-4 rounded-xl pointer-events-none" />
                        </div>

                        {/* Capture Button - BIG */}
                        <motion.button
                            onClick={captureFromVideo}
                            className="mt-6 w-24 h-24 rounded-full bg-white border-4 border-primary shadow-xl flex items-center justify-center"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <div className="w-16 h-16 rounded-full bg-primary" />
                        </motion.button>

                        {/* Cancel Button */}
                        <motion.button
                            onClick={stopCamera}
                            className="mt-4 px-6 py-2 text-gray-600 text-lg"
                            whileTap={{ scale: 0.95 }}
                        >
                            ✕ Cancel
                        </motion.button>
                    </motion.div>
                )}

                {/* PREVIEW State */}
                {scanState === SCAN_STATES.PREVIEW && previewUrl && (
                    <motion.div
                        key="preview"
                        className="flex-1 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <img
                            src={previewUrl}
                            alt="Prescription preview"
                            className="max-w-full max-h-64 rounded-2xl shadow-lg"
                        />
                        <motion.div
                            className="mt-6 text-xl text-gray-600"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            {getText('analyzing')}
                        </motion.div>
                    </motion.div>
                )}

                {/* ANALYZING State */}
                {scanState === SCAN_STATES.ANALYZING && (
                    <motion.div
                        key="analyzing"
                        className="flex-1 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <p className="mt-6 text-xl text-gray-600">{getText('analyzing')}</p>
                    </motion.div>
                )}

                {/* RESULTS State */}
                {scanState === SCAN_STATES.RESULTS && analysisResult && (
                    <motion.div
                        key="results"
                        className="flex-1 space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Conflict Warning */}
                        {conflicts.length > 0 && (
                            <motion.div
                                className="p-4 bg-red-100 border-2 border-red-500 rounded-2xl"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 0.5, repeat: 3 }}
                            >
                                <div className="text-2xl mb-2">⚠️ {conflicts[0].warning}</div>
                                <p className="text-red-700">
                                    {generateConflictWarning(conflicts, language)}
                                </p>
                            </motion.div>
                        )}

                        {/* Medicine Cards */}
                        {analysisResult.medicines.map((med, idx) => (
                            <motion.div
                                key={idx}
                                className="p-5 bg-white rounded-2xl shadow-md border-l-4 border-primary"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl">
                                        {getTimingIcon(med.timing)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-800">{med.name}</h3>
                                        <p className="text-gray-600">{med.dosage} - {med.frequency}</p>
                                        {med.visualDescription && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                💊 {med.visualDescription}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Auto-Save Confirmation - No manual buttons needed */}
                        <div className="mb-24 p-4 bg-green-50 rounded-2xl border-2 border-green-200">
                            <div className="flex items-center gap-3 text-green-700">
                                <span className="text-3xl">✅</span>
                                <div>
                                    <p className="font-bold text-lg">
                                        {language === 'hi-IN' ? 'सभी दवाइयां सहेज ली गईं!' : 
                                         language === 'mr-IN' ? 'सर्व औषधे जतन केली!' : 
                                         'All medicines saved!'}
                                    </p>
                                    <p className="text-sm text-green-600">
                                        {language === 'hi-IN' ? 'रिमाइंडर भी सेट हो गए।' : 
                                         language === 'mr-IN' ? 'रिमाइंडर देखील सेट झाले.' : 
                                         'Reminders have been set automatically.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ERROR State */}
                {scanState === SCAN_STATES.ERROR && (
                    <motion.div
                        key="error"
                        className="flex-1 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="text-6xl mb-4">❌</div>
                        <p className="text-xl text-red-600 text-center mb-6">{error}</p>
                        <motion.button
                            onClick={handleRetry}
                            className="px-8 py-4 bg-primary text-white rounded-full text-xl font-semibold"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {getText('tryAgain')}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Negotiation Overlay */}
            {showNegotiation && analysisResult?.medicines && (
                <VoiceNegotiation
                    medicines={analysisResult.medicines}
                    visible={showNegotiation}
                    onComplete={handleNegotiationComplete}
                    onTimesUpdated={(name, hour) => console.log(`Updated ${name} to ${hour}:00`)}
                />
            )}

            {/* Medicine Verifier Modal */}
            {showVerifier && selectedMedicineForVerify && (
                <MedicineVerifier
                    medicine={selectedMedicineForVerify}
                    onVerified={(result) => {
                        console.log('Verified:', result);
                    }}
                    onClose={() => {
                        setShowVerifier(false);
                        setSelectedMedicineForVerify(null);
                    }}
                />
            )}

            {/* Global Voice/Mic Button - always at bottom */}
            <DualActionButtons />
        </motion.div>
    );
};

export default ScanPrescription;
