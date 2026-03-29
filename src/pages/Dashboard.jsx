import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { triggerAction } from '../utils/haptics';
import { cardHover, staggerContainer, staggerItem } from '../utils/animations';
import { getPrompt } from '../utils/translations';
import DualActionButtons from '../components/DualActionButtons';

const Dashboard = () => {
    const navigate = useNavigate();
    const { language, setCurrentPageContent, user } = useApp();
    const { speak, startListening, transcript, resetTranscript, isListening } = useVoice();

    // One-shot flag to prevent audio loop
    const hasAnnounced = useRef(false);

    // Use user from context (synced with Firestore)
    const userName = user?.name || 'Friend';

    const greetings = {
        'en-US': `Hello, ${userName}!`,
        'hi-IN': `नमस्ते, ${userName}!`,
        'mr-IN': `नमस्कार, ${userName}!`
    };

    const greeting = greetings[language] || greetings['en-US'];

    // Ultra-short greeting on mount - gives immediate control to user
    useEffect(() => {
        if (!hasAnnounced.current) {
            hasAnnounced.current = true;

            setCurrentPageContent(getPrompt('DASHBOARD_ANNOUNCE', language));

            // Just say "Namaste" - ultra short (< 1 second)
            const shortGreeting = {
                'en-US': 'Namaste.',
                'hi-IN': 'नमस्ते।',
                'mr-IN': 'नमस्कार.'
            };
            speak(shortGreeting[language] || shortGreeting['en-US']);

            // Auto-start mic after 1 second so user can immediately speak
            setTimeout(() => {
                if (!isListening) {
                    try {
                        startListening();
                        console.log('🎙️ Auto-started mic for voice control');
                    } catch (e) {
                        console.log('Mic auto-start skipped');
                    }
                }
            }, 1000);
        }
    }, [language, setCurrentPageContent, speak, startListening, isListening]);

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

    // Handle repeat (speaker button) - re-announces greeting
    const handleRepeat = useCallback(() => {
        const shortGreeting = {
            'en-US': `Hello ${userName}. How can I help you today?`,
            'hi-IN': `नमस्ते ${userName}। आज मैं आपकी कैसे मदद कर सकता हूँ?`,
            'mr-IN': `नमस्कार ${userName}. आज मी तुम्हाला कशी मदत करू शकतो?`
        };
        speak(shortGreeting[language] || shortGreeting['en-US']);
    }, [speak, language, userName]);

    return (
        <motion.div
            className="min-h-screen flex flex-col p-6 pb-32 relative overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
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
                                <span className="text-5xl">📸</span>
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
                        <div className="text-4xl mb-2">💊</div>
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
                        <div className="text-4xl mb-2">⏰</div>
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
                        <div className="text-4xl mb-2">🔍</div>
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
                        <div className="text-4xl mb-2">📋</div>
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

            {/* Speaker + Mic Dual Action Buttons */}
            <DualActionButtons onRepeat={handleRepeat} />
        </motion.div>
    );
};

export default Dashboard;
