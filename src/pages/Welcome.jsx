import React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { triggerSuccess } from '../utils/haptics';
import { cardHover, staggerContainer, staggerItem } from '../utils/animations';
import GlobalActionButton from '../components/GlobalActionButton';

// Helper: check if a user profile has the minimum required fields
const isProfileComplete = (profile) => !!(profile?.name && profile?.phone);

// Language definitions (outside component — never changes)
const LANGUAGES = [
    {
        code: 'en-US',
        label: 'English',
        buttonText: 'English',
        flag: '🇬🇧',
        subtitle: 'Tap to continue in English',
        confirmationMessage: 'You have selected English.',
        gradient: 'from-blue-500 to-blue-700',
        voiceKeywords: ['english', 'अंग्रेजी', 'इंग्लिश', 'इंग्रजी']
    },
    {
        code: 'hi-IN',
        label: 'Hindi',
        buttonText: 'हिंदी',
        flag: '🇮🇳',
        subtitle: 'हिंदी में जारी रखें',
        confirmationMessage: 'आपने हिंदी चुनी है।',
        gradient: 'from-orange-500 to-orange-700',
        voiceKeywords: ['hindi', 'हिंदी', 'हिन्दी']
    }
];

const Welcome = () => {
    const navigate = useNavigate();
    const { language, setLanguage, setCurrentPageContent, firebaseUser, isAuthLoading, user } = useApp();
    const { transcript, isListening, stopListening, resetTranscript } = useVoice();

    const uiText = {
        selectLanguage: {
            'en-US': 'Select Your Preferred Language',
            'hi-IN': 'अपनी पसंदीदा भाषा चुनें',
            'mr-IN': 'तुमची पसंतीची भाषा निवडा'
        },
        voiceHint: {
            'en-US': 'Or tap the mic and say your language',
            'hi-IN': 'या माइक दबाकर अपनी भाषा बोलें',
            'mr-IN': 'किंवा माइक दाबून तुमची भाषा बोला'
        },
        listening: {
            'en-US': 'Listening...',
            'hi-IN': 'सुन रहा हूँ...',
            'mr-IN': 'ऐकत आहे...'
        }
    };

    const getUiText = (key) => uiText[key]?.[language] || uiText[key]?.['en-US'];

    // ── HOOK 1: Auth-Implementation-Patterns Route Guard ─────────────────────
    // MUST be declared before any early returns (Rules of Hooks).
    // If Firebase auth session exists AND profile is complete → go to dashboard.
    // The user should NEVER re-register if they've already set up their profile.
    useEffect(() => {
        if (isAuthLoading) return; // Wait for auth state to settle

        if (firebaseUser && isProfileComplete(user)) {
            console.log('✅ Returning user detected — redirecting to dashboard');
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthLoading, firebaseUser, user, navigate]);
    // ─────────────────────────────────────────────────────────────────────────

    // ── HOOK 2: Set page content for voice "Repeat" command ──────────────────
    // MUST be before early returns (Rules of Hooks).
    useEffect(() => {
        const content = {
            'en-US': 'Choose your language: English or Hindi.',
            'hi-IN': 'अपनी भाषा चुनें: English या हिंदी।',
            'mr-IN': 'तुमची भाषा निवडा: English किंवा हिंदी.'
        };
        setCurrentPageContent(content[language] || content['en-US']);
    }, [setCurrentPageContent, language]);
    // ─────────────────────────────────────────────────────────────────────────

    // ── HOOK 3: Voice input for language selection — INSTANT SWITCH ──────────
    // MUST be before early returns (Rules of Hooks).
    useEffect(() => {
        if (!transcript) return;

        const lowerTranscript = transcript.toLowerCase().trim();
        console.log('Voice input on Welcome:', lowerTranscript);

        for (const lang of LANGUAGES) {
            const match = lang.voiceKeywords.some(keyword =>
                lowerTranscript.includes(keyword.toLowerCase())
            );

            if (match) {
                console.log('⚡ INSTANT SWITCH: Language matched:', lang.label);

                window.speechSynthesis.cancel();
                stopListening();
                resetTranscript();

                triggerSuccess();
                setLanguage(lang.code);

                try {
                    const utterance = new SpeechSynthesisUtterance(lang.confirmationMessage);
                    utterance.lang = lang.code;
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);
                } catch (error) {
                    console.error('TTS error:', error);
                }

                navigate('/register');
                return;
            }
        }
    }, [transcript, stopListening, resetTranscript, setLanguage, navigate]);
    // ─────────────────────────────────────────────────────────────────────────

    // ── EARLY RETURNS (after all hooks) ──────────────────────────────────────
    // Show loading spinner while auth state resolves (prevents language picker
    // from flashing for returning users before the redirect fires).
    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-warm-bg-start to-warm-bg-end">
                <div className="flex flex-col items-center gap-4">
                    <img src="/logo.png" alt="SaarthiRx" className="w-20 h-20 animate-pulse" />
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-base text-gray-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Handle tap-based language selection
    const handleLanguageSelect = async (langCode, confirmationMessage) => {
        triggerSuccess();
        setLanguage(langCode);

        try {
            const utterance = new SpeechSynthesisUtterance(confirmationMessage);
            utterance.lang = langCode;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);

            await new Promise(resolve => {
                utterance.onend = resolve;
                setTimeout(resolve, 2000);
            });
        } catch (error) {
            console.error('TTS error:', error);
        }

        navigate('/register');
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 pt-6 sm:pt-8 pb-40 sm:pb-48"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Logo and Header */}
            <div className="text-center mb-6">
                <motion.img
                    src="/logo.png"
                    alt="SaarthiRx Logo"
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-3"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                />

                <motion.h1
                    className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gray-800 mb-1"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    SaarthiRx
                </motion.h1>
                <motion.p
                    className="text-base sm:text-lg md:text-xl text-gray-600 font-medium"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    Your Prescription Clarity Companion
                </motion.p>
            </div>

            {/* Language Cards */}
            <motion.div
                className="w-full max-w-sm sm:max-w-md space-y-4 mt-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                <motion.p
                    className="text-base sm:text-lg text-center text-gray-500 mb-4 font-medium"
                    variants={staggerItem}
                >
                    {getUiText('selectLanguage')}
                </motion.p>

                {LANGUAGES.map((lang, index) => (
                    <motion.button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code, lang.confirmationMessage)}
                        aria-label={`Select ${lang.label}`}
                        className={`
                            w-full min-h-[90px] sm:min-h-[100px] p-4 sm:p-5 rounded-3xl
                            bg-gradient-to-br ${lang.gradient}
                            text-white
                            shadow-xl hover:shadow-2xl
                            flex items-center space-x-4 sm:space-x-5
                            overflow-hidden relative
                            transform transition-all duration-300
                        `}
                        variants={{
                            ...cardHover,
                            ...staggerItem
                        }}
                        initial="rest"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        custom={index}
                    >
                        <div className="w-16 h-16 sm:w-18 sm:h-18 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <span className="text-4xl sm:text-5xl">{lang.flag}</span>
                        </div>

                        <div className="flex-1 text-left">
                            <div className="text-2xl sm:text-3xl font-bold mb-1">{lang.buttonText}</div>
                            <div className="text-base sm:text-lg opacity-90">{lang.subtitle}</div>
                        </div>

                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.6 }}
                        />
                    </motion.button>
                ))}

                {/* Voice Hint */}
                <motion.div
                    className="flex items-center justify-center gap-2 mt-6 text-gray-400"
                    variants={staggerItem}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <span className="text-xl">🎙️</span>
                    <span className="text-base">{getUiText('voiceHint')}</span>
                </motion.div>
            </motion.div>

            {/* Dark Overlay + Listening Modal */}
            {isListening && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.div
                        className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <motion.div
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/20 flex items-center justify-center mb-6"
                            animate={{
                                scale: [1, 1.1, 1],
                                boxShadow: [
                                    '0 0 0 0 rgba(255, 107, 53, 0.4)',
                                    '0 0 0 20px rgba(255, 107, 53, 0)',
                                    '0 0 0 0 rgba(255, 107, 53, 0)'
                                ]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <span className="text-5xl sm:text-6xl">🎙️</span>
                        </motion.div>

                        <motion.p
                            className="text-2xl sm:text-3xl font-bold text-white mb-4"
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            {getUiText('listening')}
                        </motion.p>

                        <div className="bg-white/10 backdrop-blur-md px-6 sm:px-8 py-4 rounded-2xl border border-white/20">
                            <p className="text-lg sm:text-xl text-white font-medium text-center">
                                Say: <span className="text-blue-300">English</span> or <span className="text-orange-300">हिंदी</span>
                            </p>
                        </div>
                    </motion.div>
                </>
            )}

            <GlobalActionButton isActive={isListening} />
        </motion.div>
    );
};

export default Welcome;
