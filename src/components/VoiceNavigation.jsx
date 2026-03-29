/**
 * VoiceNavigation - Global Voice Command Handler
 * Mounted at Root Level to listen on every page
 * Simple One-Word Keywords for Elder-Friendly navigation
 * + AI Medicine Addition via natural language
 * + Context-Aware Commands (e.g., "Photo lo" on /scan)
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVoice } from '../context/VoiceContext';
import { useApp } from '../context/AppContext';
import { parseFuzzyCommand, parseContextCommand } from '../utils/fuzzyCommands';
import { triggerAction, triggerSuccess, triggerAlert } from '../utils/haptics';
import { isMedicineAdditionCommand, addMedicineByVoice } from '../services/aiMedicineManager';

const VoiceNavigation = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { transcript, isListening, speak, resetTranscript } = useVoice();
    const { language, currentPageContent } = useApp();
    const processingRef = useRef(false);

    // Friendly navigation messages (not robotic)
    const getNavigationMessage = useCallback((destination) => {
        const messages = {
            'home': {
                'en-US': 'Taking you home',
                'hi-IN': 'घर ले जा रहा हूँ',
                'mr-IN': 'घरी नेतो आहे'
            },
            'scan': {
                'en-US': 'Opening camera',
                'hi-IN': 'कैमरा खोल रहा हूँ',
                'mr-IN': 'कॅमेरा उघडतो आहे'
            },
            'medicines': {
                'en-US': 'Showing your medicines',
                'hi-IN': 'आपकी दवाइयां दिखा रहा हूँ',
                'mr-IN': 'तुमची औषधे दाखवतो आहे'
            },
            'reminders': {
                'en-US': 'Opening reminders',
                'hi-IN': 'रिमाइंडर खोल रहा हूँ',
                'mr-IN': 'रिमाइंडर उघडतो आहे'
            },
            'back': {
                'en-US': 'Going back',
                'hi-IN': 'वापस जा रहा हूँ',
                'mr-IN': 'मागे जातो आहे'
            },
            'camera': {
                'en-US': 'Opening camera',
                'hi-IN': 'कैमरा खोल रहा हूँ',
                'mr-IN': 'कॅमेरा उघडतो आहे'
            },
            'gallery': {
                'en-US': 'Opening gallery',
                'hi-IN': 'गैलरी खोल रहा हूँ',
                'mr-IN': 'गॅलरी उघडतो आहे'
            },
            'click': {
                'en-US': 'Capturing',
                'hi-IN': 'फोटो ले रहा हूँ',
                'mr-IN': 'फोटो घेतो आहे'
            },
            'verify': {
                'en-US': 'Opening verification camera. Show me the medicine.',
                'hi-IN': 'जांच कैमरा खोल रहा हूँ। दवाई दिखाओ।',
                'mr-IN': 'तपासणी कॅमेरा उघडतो आहे. औषध दाखवा.'
            },
            'alarm': {
                'en-US': 'Opening emergency alarm',
                'hi-IN': 'इमरजेंसी अलार्म खोल रहा हूँ',
                'mr-IN': 'आणीबाणी अलार्म उघडतो आहे'
            },
            'stop': {
                'en-US': '',
                'hi-IN': '',
                'mr-IN': ''
            }
        };
        return messages[destination]?.[language] || messages[destination]?.['en-US'] || 'OK';
    }, [language]);

    // Handle AI medicine addition
    const handleAIMedicineAddition = useCallback(async (input) => {
        if (processingRef.current) return;
        processingRef.current = true;

        try {
            const processingMsg = {
                'en-US': 'Adding medicine...',
                'hi-IN': 'दवाई जोड़ रहा हूँ...',
                'mr-IN': 'औषध जोडत आहे...'
            };
            speak(processingMsg[language] || processingMsg['en-US']);

            const result = await addMedicineByVoice(input, language);
            
            if (result.success) {
                triggerSuccess();
            } else {
                triggerAlert();
            }
            
            speak(result.voiceFeedback);
        } catch (error) {
            console.error('AI medicine addition error:', error);
            triggerAlert();
        } finally {
            processingRef.current = false;
        }
    }, [language, speak]);

    // Listen for voice commands globally
    useEffect(() => {
        if (!transcript || !transcript.trim()) return;

        // Don't interfere with Register page voice input
        if (location.pathname === '/register') {
            return;
        }

        // Don't interfere with Welcome page (language selection)
        if (location.pathname === '/') {
            return;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // VOICE COMMAND AUDIT - Debug logging
        // ═══════════════════════════════════════════════════════════════════════
        console.log('🗣️ Voice Command Recognized:', transcript, '| Route:', location.pathname);

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 1: Check CONTEXT-AWARE commands first (route-specific)
        // ═══════════════════════════════════════════════════════════════════
        const contextResult = parseContextCommand(transcript, location.pathname);
        
        if (contextResult.confidence > 0.5) {
            triggerAction();
            resetTranscript?.();
            
            // Emit custom event for page-specific handling
            const voiceEvent = new CustomEvent('voiceAction', {
                detail: { 
                    action: contextResult.action,
                    transcript: transcript
                }
            });
            window.dispatchEvent(voiceEvent);
            
            // Play feedback sound
            const feedbackKey = contextResult.action.toLowerCase();
            speak(getNavigationMessage(feedbackKey));
            
            console.log(`🎯 Context command: ${contextResult.action} on ${location.pathname}`);
            return;
        }

        // Check for AI medicine addition command
        if (isMedicineAdditionCommand(transcript)) {
            triggerAction();
            resetTranscript?.();
            handleAIMedicineAddition(transcript);
            return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 2: Check GLOBAL commands (work on any page)
        // ═══════════════════════════════════════════════════════════════════
        const { action, confidence } = parseFuzzyCommand(transcript);

        // Only act on confident matches
        if (confidence > 0.5) {
            // Haptic feedback on command recognition
            triggerAction();
            
            // Clear transcript after processing
            resetTranscript?.();

            switch (action) {
                case 'HOME':
                    speak(getNavigationMessage('home'));
                    setTimeout(() => navigate('/dashboard'), 300);
                    break;

                case 'SCAN':
                    speak(getNavigationMessage('scan'));
                    setTimeout(() => navigate('/scan'), 300);
                    break;

                case 'MEDICINES':
                    speak(getNavigationMessage('medicines'));
                    setTimeout(() => navigate('/medicines'), 300);
                    break;

                case 'REMINDERS':
                    speak(getNavigationMessage('reminders'));
                    setTimeout(() => navigate('/reminders'), 300);
                    break;

                case 'BACK':
                    speak(getNavigationMessage('back'));
                    setTimeout(() => navigate(-1), 300);
                    break;

                case 'REPEAT':
                    if (currentPageContent) {
                        speak(currentPageContent);
                    } else {
                        const repeatMsg = {
                            'en-US': 'Nothing to repeat',
                            'hi-IN': 'दोहराने के लिए कुछ नहीं',
                            'mr-IN': 'पुन्हा सांगायला काही नाही'
                        };
                        speak(repeatMsg[language] || repeatMsg['en-US']);
                    }
                    break;

                case 'HELP':
                    const helpMsg = {
                        'en-US': 'You can say: Home, Scan, Medicines, Reminders, Check Medicine, Emergency, or Stop.',
                        'hi-IN': 'आप बोल सकते हैं: होम, स्कैन, दवाई, रिमाइंडर, जांच करो, इमरजेंसी, या रुको।',
                        'mr-IN': 'तुम्ही बोलू शकता: होम, स्कॅन, औषध, रिमाइंडर, तपासा, आणीबाणी, किंवा थांबा.'
                    };
                    speak(helpMsg[language] || helpMsg['en-US']);
                    break;

                // ═══════════════════════════════════════════════════════════
                // NEW VOICE COMMANDS - Voice Command Center Expansion
                // ═══════════════════════════════════════════════════════════
                case 'VERIFY_MEDICINE':
                    // Route guard: don't reload if already on verification page
                    if (location.pathname !== '/scan-medicine') {
                        speak(getNavigationMessage('verify'));
                        setTimeout(() => navigate('/scan-medicine'), 300);
                    } else {
                        const alreadyVerifyMsg = {
                            'en-US': 'I am already ready to verify. Show me the medicine.',
                            'hi-IN': 'मैं पहले से जांच के लिए तैयार हूँ। दवाई दिखाओ।',
                            'mr-IN': 'मी आधीच तपासणीसाठी तयार आहे. औषध दाखवा.'
                        };
                        speak(alreadyVerifyMsg[language] || alreadyVerifyMsg['en-US']);
                    }
                    break;

                case 'ALARM':
                    speak(getNavigationMessage('alarm'));
                    setTimeout(() => navigate('/alarm'), 300);
                    break;

                case 'STOP':
                    // Immediately silence TTS - no feedback needed
                    window.speechSynthesis.cancel();
                    break;

                default:
                    // Unknown command - ignore silently for elder-friendliness
                    break;
            }
        }
    }, [transcript, navigate, speak, currentPageContent, location.pathname, language, getNavigationMessage, resetTranscript, handleAIMedicineAddition]);

    return (
        <>
            {children}
        </>
    );
};

export default VoiceNavigation;
