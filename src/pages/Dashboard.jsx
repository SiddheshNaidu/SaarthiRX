import React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { triggerAction } from '../utils/haptics';
import { cardHover, staggerContainer, staggerItem } from '../utils/animations';
import { getPrompt } from '../utils/translations';
import { CameraIcon, PillIcon, BellIcon, SearchIcon, ClipboardIcon } from '../components/Icons';

// Session-level key: resets when browser tab closes (fresh login = new session)
const SESSION_GREETED_KEY = 'saarthi_dashboard_greeted';

const Dashboard = () => {
    const navigate = useNavigate();
    const { language, setCurrentPageContent, user, saveUser } = useApp();
    const { speak, startListening, transcript, resetTranscript, isListening } = useVoice();

    // Tracks if we've already mounted once (prevents StrictMode double-fire)
    const mountedRef = useRef(false);

    // Use user from context (synced with Firestore)
    const userName = user?.name || 'Friend';

    const greetings = {
        'en-US': `Hello, ${userName}!`,
        'hi-IN': `नमस्ते, ${userName}!`,
        'mr-IN': `नमस्कार, ${userName}!`
    };

    const greeting = greetings[language] || greetings['en-US'];

    // ─── FIRST-VISIT GREETING ────────────────────────────────────────────────
    // Speaks once per login session. sessionStorage resets on tab close / new login.
    // Subsequent navigation back to dashboard is silent.
    useEffect(() => {
        if (mountedRef.current) return; // Already ran in this mount cycle
        mountedRef.current = true;

        // Check if we already greeted in this browser session
        const alreadyGreeted = sessionStorage.getItem(SESSION_GREETED_KEY) === 'true';
        if (alreadyGreeted) return; // Silent return — not the first visit

        // Mark as greeted for the rest of this session
        sessionStorage.setItem(SESSION_GREETED_KEY, 'true');

        // Build the full first-visit message: greeting + command list
        const firstVisitMessage = {
            'en-US':
                `Namaste ${userName}! Welcome to SaarthiRx. ` +
                `You can say: Scan, to read a prescription. ` +
                `Medicines, to view your medicines. ` +
                `Reminders, to manage your reminders. ` +
                `Help, to hear all commands.`,
            'hi-IN':
                `नमस्ते ${userName}! SaarthiRx में आपका स्वागत है। ` +
                `आप कह सकते हैं: स्कैन, पर्चा पढ़ने के लिए। ` +
                `दवाई, अपनी दवाइयां देखने के लिए। ` +
                `रिमाइंडर, अनुस्मारक प्रबंधित करने के लिए। ` +
                `मदद, सभी कमांड सुनने के लिए।`,
        };

        const msgToSpeak = firstVisitMessage[language] || firstVisitMessage['en-US'];
        setCurrentPageContent(msgToSpeak);
        speak(msgToSpeak).then(() => {
            // After first-visit greeting finishes, update speaker button to say short help prompt
            const helpPrompt = {
                'en-US': `Namaste ${userName}, how can I help you?`,
                'hi-IN': `नमस्ते ${userName}, मैं आपकी कैसे मदद कर सकता हूँ?`,
                'mr-IN': `नमस्कार ${userName}, मी तुम्हाला कशी मदत करू शकतो?`
            };
            setCurrentPageContent(helpPrompt[language] || helpPrompt['en-US']);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps — intentionally run only once per component mount

    // ─── SET SPEAKER CONTENT on return visits ────────────────────────────────
    // If user navigates back (already greeted), silently set what the speaker
    // button should say when tapped.
    useEffect(() => {
        const alreadyGreeted = sessionStorage.getItem(SESSION_GREETED_KEY) === 'true';
        if (alreadyGreeted) {
            const helpPrompt = {
                'en-US': `Namaste ${userName}, how can I help you?`,
                'hi-IN': `नमस्ते ${userName}, मैं आपकी कैसे मदद कर सकता हूँ?`,
                'mr-IN': `नमस्कार ${userName}, मी तुम्हाला कशी मदत करू शकतो?`
            };
            setCurrentPageContent(helpPrompt[language] || helpPrompt['en-US']);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, userName]);


    // ═══════════════════════════════════════════════════════════════════════
    // DASHBOARD COMMAND DICTIONARY - Voice Command Center
    // Handles dashboard-specific commands before global router
    // ═══════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!transcript) return;

        const cmd = transcript.toLowerCase();
        
        // STOP command - highest priority (immediately silence TTS)
        const stopPatterns = ['stop', 'ruko', 'रुको', 'bas', 'बस', 'chup', 'चुप'];
        if (stopPatterns.some(p => cmd.includes(p))) {
            window.speechSynthesis.cancel();
            resetTranscript();
            return;
        }
        
        // READ INSTRUCTIONS / Next Reminder
        const readPatterns = ['read', 'padho', 'पढ़ो', 'instructions', 'next medicine', 'next reminder', 'अगली दवाई'];
        if (readPatterns.some(p => cmd.includes(p))) {
            resetTranscript();
            triggerAction();
            
            // Read next upcoming reminder from localStorage
            const reminders = JSON.parse(localStorage.getItem('saarthi_reminders') || '[]');
            const enabledReminders = reminders.filter(r => r.enabled);
            
            if (enabledReminders.length > 0) {
                const nextReminder = enabledReminders[0];
                const readMsg = {
                    'en-US': `Your next medicine is ${nextReminder.medicineName} at ${nextReminder.time}.`,
                    'hi-IN': `आपकी अगली दवाई ${nextReminder.medicineName} ${nextReminder.time} बजे है।`,
                    'mr-IN': `तुमचे पुढचे औषध ${nextReminder.medicineName} ${nextReminder.time} वाजता आहे.`
                };
                speak(readMsg[language] || readMsg['en-US']);
            } else {
                const noRemindersMsg = {
                    'en-US': 'You have no reminders set.',
                    'hi-IN': 'आपके कोई रिमाइंडर नहीं हैं।',
                    'mr-IN': 'तुमचे कोणतेही रिमाइंडर नाहीत.'
                };
                speak(noRemindersMsg[language] || noRemindersMsg['en-US']);
            }
            return;
        }
        
        // LOGOUT command
        const logoutPatterns = ['logout', 'log out', 'sign out', 'bahar jao', 'बाहर जाओ', 'लॉग आउट', 'बाहेर पडा'];
        if (logoutPatterns.some(p => cmd.includes(p))) {
            resetTranscript();
            triggerAction();
            const logoutMsg = {
                'en-US': 'Logging out.',
                'hi-IN': 'लॉग आउट कर रहे हैं।',
                'mr-IN': 'लॉग आउट करत आहे.'
            };
            speak(logoutMsg[language] || logoutMsg['en-US']).then(() => {
                sessionStorage.removeItem(SESSION_GREETED_KEY);
                saveUser(null);
                navigate('/');
            });
            return;
        }

        // SCAN PRESCRIPTION - Navigate to prescription scanner
        const scanPatterns = ['scan prescription', 'scan my prescription', 'nuskha', 'नुस्खा', 'स्कॅन', 'स्कैन', 'scan'];
        // Ensure "scan medicine" doesn't falsely trigger "scan prescription" if we check it first, 
        // by making sure "check medicine" is handled first, OR just keep them distinct. 
        // We'll put this right before "check medicine", but "check medicine" doesn't have the word "scan" in its patterns, so it's safe.
        if (scanPatterns.some(p => cmd.includes(p))) {
            resetTranscript();
            triggerAction();
            const scanMsg = {
                'en-US': 'Opening scanner. Please point the camera at your prescription.',
                'hi-IN': 'स्कैनर खोल रहा हूँ। कृपया कैमरा पर्चे पर रखें।',
                'mr-IN': 'स्कॅनर उघडत आहे. कृपया कॅमेरा प्रिस्क्रिप्शनवर ठेवा.'
            };
            speak(scanMsg[language] || scanMsg['en-US']);
            navigate('/scan');
            return;
        }

        // CHECK MEDICINE - Navigate to verification page
        const checkMedicinePatterns = ['check medicine', 'sahi hai kya', 'सही है क्या', 'जांच करो', 'verify', 'is this safe'];
        if (checkMedicinePatterns.some(p => cmd.includes(p))) {
            resetTranscript();
            triggerAction();
            const verifyMsg = {
                'en-US': 'Opening verification camera. Show me the medicine.',
                'hi-IN': 'जांच कैमरा खोल रहा हूँ। दवाई दिखाओ।',
                'mr-IN': 'तपासणी कॅमेरा उघडतो आहे. औषध दाखवा.'
            };
            speak(verifyMsg[language] || verifyMsg['en-US']);
            navigate('/scan-medicine');
            return;
        }
        
        // ADD REMINDER - Navigate to reminder page
        const addReminderPatterns = ['add reminder', 'new reminder', 'रिमाइंडर जोड़ें', 'नवीन रिमाइंडर'];
        if (addReminderPatterns.some(p => cmd.includes(p))) {
            resetTranscript();
            triggerAction();
            navigate('/reminder');
            return;
        }
    }, [transcript, navigate, resetTranscript, speak, language]);

    const handleAction = (action) => {
        triggerAction();
        if (action === 'scan') {
            navigate('/scan');
        } else if (action === 'medicines') {
            navigate('/medicines');
        } else if (action === 'reminders') {
            navigate('/reminders');
        } else if (action === 'history') {
            navigate('/history');
        } else if (action === 'scanMedicine') {
            navigate('/scan-medicine');
        }
    };

    // ─── SPEAKER BUTTON TAP ──────────────────────────────────────────────────
    // Not the first-visit full tour — just a short helpful prompt.
    const handleRepeat = useCallback(() => {
        const helpPrompt = {
            'en-US': `Namaste ${userName}, how can I help you?`,
            'hi-IN': `नमस्ते ${userName}, मैं आपकी कैसे मदद कर सकता हूँ?`,
            'mr-IN': `नमस्कार ${userName}, मी तुम्हाला कशी मदत करू शकतो?`
        };
        speak(helpPrompt[language] || helpPrompt['en-US']);
    }, [speak, language, userName]);

    return (
        <motion.div
            className="min-h-screen flex flex-col p-6 pb-44 relative overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Top Bar with Logout Button */}
            <div className="absolute top-6 right-6 z-[60]">
                <button
                    onClick={() => {
                        triggerAction();
                        sessionStorage.removeItem(SESSION_GREETED_KEY);
                        saveUser(null);
                        navigate('/');
                    }}
                    className="w-12 h-12 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center shadow-sm hover:shadow-md hover:bg-red-100 transition-all"
                    aria-label="Logout"
                >
                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>

            {/* Hero Greeting */}
            <motion.div
                className="text-center mb-10 mt-8"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Logo */}
                <motion.img
                    src="/logo.png"
                    alt="SaarthiRx Logo"
                    className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                />
                <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-800 mb-2">
                    {greeting}
                </h1>
                <p className="text-xl text-gray-500">
                    {getPrompt('DASHBOARD_SUBTITLE', language)}
                </p>
            </motion.div>

            {/* Main Action Cards */}
            <motion.div
                className="space-y-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                {/* Scan Prescription - Primary Action */}
                <motion.button
                    onClick={() => handleAction('scan')}
                    className="
            w-full p-8 rounded-3xl
            bg-gradient-to-br from-primary to-primary-dark
            text-white shadow-premium-lg
            relative overflow-hidden
            group
          "
                    variants={{ ...cardHover, ...staggerItem }}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                >
                    <div className="relative z-10">
                        {/* Icon */}
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                <CameraIcon className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        {/* Text - Localized */}
                        <h2 className="text-3xl font-bold mb-2">
                            {getPrompt('DASHBOARD_SCAN_TITLE', language)}
                        </h2>
                        <p className="text-lg opacity-90">
                            {getPrompt('DASHBOARD_SCAN_SUBTITLE', language)}
                        </p>
                    </div>

                    {/* Animated Background */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-primary-light to-primary opacity-0 group-hover:opacity-100"
                        transition={{ duration: 0.3 }}
                    />
                </motion.button>

                {/* Secondary Actions Grid - 2x2 */}
                <div className="grid grid-cols-2 gap-4">
                    {/* My Medicines */}
                    <motion.button
                        onClick={() => handleAction('medicines')}
                        className="p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-md hover:shadow-premium transition-all flex flex-col items-center justify-center min-h-[120px]"
                        variants={{ ...cardHover, ...staggerItem }}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                    >
                        <div className="mb-2 text-primary"><PillIcon className="w-10 h-10" /></div>
                        <div className="text-lg font-semibold text-gray-800 text-center">
                            {getPrompt('DASHBOARD_MEDICINES', language)}
                        </div>
                    </motion.button>

                    {/* Reminders */}
                    <motion.button
                        onClick={() => handleAction('reminders')}
                        className="p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-md hover:shadow-premium transition-all flex flex-col items-center justify-center min-h-[120px]"
                        variants={{ ...cardHover, ...staggerItem }}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                    >
                        <div className="mb-2 text-primary"><BellIcon className="w-10 h-10" /></div>
                        <div className="text-lg font-semibold text-gray-800 text-center">
                            {getPrompt('DASHBOARD_REMINDERS', language)}
                        </div>
                    </motion.button>

                    {/* Scan Medicine - NEW */}
                    <motion.button
                        onClick={() => handleAction('scanMedicine')}
                        className="p-5 rounded-2xl bg-white border-2 border-blue-200 shadow-md hover:shadow-premium transition-all flex flex-col items-center justify-center min-h-[120px]"
                        variants={{ ...cardHover, ...staggerItem }}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                    >
                        <div className="mb-2 text-blue-500"><SearchIcon className="w-10 h-10" /></div>
                        <div className="text-lg font-semibold text-gray-800 text-center">
                            {getPrompt('DASHBOARD_SCAN_MEDICINE', language)}
                        </div>
                    </motion.button>

                    {/* History */}
                    <motion.button
                        onClick={() => handleAction('history')}
                        className="p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-md hover:shadow-premium transition-all flex flex-col items-center justify-center min-h-[120px]"
                        variants={{ ...cardHover, ...staggerItem }}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                    >
                        <div className="mb-2 text-primary"><ClipboardIcon className="w-10 h-10" /></div>
                        <div className="text-lg font-semibold text-gray-800 text-center">
                            {getPrompt('DASHBOARD_HISTORY', language)}
                        </div>
                    </motion.button>
                </div>

                {/* Voice Commands Info - Localized */}
                <motion.div
                    className="mt-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl"
                    variants={staggerItem}
                >
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">
                        {getPrompt('DASHBOARD_VOICE_TITLE', language)}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-base text-blue-700">
                        <p>{getPrompt('DASHBOARD_VOICE_SCAN', language)}</p>
                        <p>{getPrompt('DASHBOARD_VOICE_MEDICINES', language)}</p>
                        <p>{getPrompt('DASHBOARD_VOICE_REMINDERS', language)}</p>
                        <p>{getPrompt('DASHBOARD_VOICE_HOME', language)}</p>
                        <p>{getPrompt('DASHBOARD_VOICE_REPEAT', language)}</p>
                        <p>{getPrompt('DASHBOARD_VOICE_HELP', language)}</p>
                    </div>
                </motion.div>
            </motion.div>

            {/* Speaker + Mic now merged into global BottomNav */}
        </motion.div>
    );
};

export default Dashboard;
