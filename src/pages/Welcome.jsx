import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { useVoice } from '../context/VoiceContext';
import { triggerSuccess } from '../utils/haptics';
import { cardHover, staggerContainer, staggerItem } from '../utils/animations';
import GlobalActionButton from '../components/GlobalActionButton';

const Welcome = () => {
    const navigate = useNavigate();
    const { setLanguage, setCurrentPageContent } = useApp();
    const { announcePageAndAction } = useVoiceButler();
    const { transcript, isListening, stopListening, resetTranscript } = useVoice();

    const languages = [
        {
            code: 'en-US',
            label: 'English',           // Label for display
            buttonText: 'English',      // Text shown on button
            flag: '🇬🇧',
            subtitle: 'Tap to continue in English',
            confirmationMessage: 'You have selected English.',
            gradient: 'from-blue-500 to-blue-700',
            voiceKeywords: ['english', 'अंग्रेजी', 'इंग्लिश', 'इंग्रजी']
        },
        {
            code: 'hi-IN',
            label: 'Hindi',             // English label for page
            buttonText: 'हिंदी',         // Native text on button
            flag: '🇮🇳',
            subtitle: 'हिंदी में जारी रखें',
            confirmationMessage: 'आपने हिंदी चुनी है।',
            gradient: 'from-orange-500 to-orange-700',
            voiceKeywords: ['hindi', 'हिंदी', 'हिन्दी']
        }
    ];

    useEffect(() => {
        const content = 'Choose your language: English or Hindi.';
        setCurrentPageContent(content);
        // Silent welcome - no TTS on page load
    }, [setCurrentPageContent, announcePageAndAction]);

    // Listen for voice input and select language - INSTANT SWITCH
    useEffect(() => {
        if (!transcript) return;

        const lowerTranscript = transcript.toLowerCase().trim();
        console.log('Voice input on Welcome:', lowerTranscript);

        // Check each language for matching keywords
        for (const lang of languages) {
            const match = lang.voiceKeywords.some(keyword =>
                lowerTranscript.includes(keyword.toLowerCase())
            );

            if (match) {
                console.log('⚡ INSTANT SWITCH: Language matched:', lang.label);
                
                // IMMEDIATE ACTION: Kill TTS and mic instantly
                window.speechSynthesis.cancel();
                stopListening();
                resetTranscript();
                
                // Trigger haptic and set language
                triggerSuccess();
                setLanguage(lang.code);
                
                // Play TTS confirmation in background (fire-and-forget)
                try {
                    const utterance = new SpeechSynthesisUtterance(lang.confirmationMessage);
                    utterance.lang = lang.code;
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);
                } catch (error) {
                    console.error('TTS error:', error);
                }
                
                // NAVIGATE IMMEDIATELY - don't wait for TTS
                navigate('/register');
                return;
            }
        }
    }, [transcript, stopListening, resetTranscript, setLanguage, navigate]);

    // Handle tap-based language selection (still waits for TTS for UX)
    const handleLanguageSelect = async (langCode, langLabel, confirmationMessage) => {
        triggerSuccess();
        setLanguage(langCode);

        // Play TTS confirmation in selected language
        try {
            const utterance = new SpeechSynthesisUtterance(confirmationMessage);
            utterance.lang = langCode;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);

            // Wait for TTS to complete (better UX for tap), then navigate
            await new Promise(resolve => {
                utterance.onend = resolve;
                setTimeout(resolve, 2000); // Reduced fallback to 2 seconds
            });
        } catch (error) {
            console.error('TTS error:', error);
        }

        // Navigate to register page
        navigate('/register');
    };

    // Listen for voice input and select language
    useEffect(() => {
        if (!transcript) return;

        const lowerTranscript = transcript.toLowerCase().trim();
        console.log('Voice input on Welcome:', lowerTranscript);

        // Check each language for matching keywords
        for (const lang of languages) {
            const match = lang.voiceKeywords.some(keyword =>
                lowerTranscript.includes(keyword.toLowerCase())
            );

            if (match) {
                console.log('Language matched:', lang.label);
                handleLanguageSelect(lang.code, lang.label, lang.confirmationMessage);
                return;
            }
        }
    }, [transcript, languages, handleLanguageSelect]);

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
                {/* Logo Image - Bigger for elder visibility */}
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

            {/* Language Cards - Optimized for 2 languages */}
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
                    Select Your Preferred Language
                </motion.p>

                {languages.map((lang, index) => (
                    <motion.button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code, lang.label, lang.confirmationMessage)}
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
                        {/* Flag Icon - Larger */}
                        <div className="w-16 h-16 sm:w-18 sm:h-18 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <span className="text-4xl sm:text-5xl">{lang.flag}</span>
                        </div>

                        {/* Language Info */}
                        <div className="flex-1 text-left">
                            <div className="text-2xl sm:text-3xl font-bold mb-1">{lang.buttonText}</div>
                            <div className="text-sm sm:text-base opacity-90">{lang.subtitle}</div>
                        </div>

                        {/* Arrow Icon */}
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Shine Effect */}
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
                    <span className="text-sm">Or tap the mic and say your language</span>
                </motion.div>
            </motion.div>

            {/* Dark Overlay + Listening Modal */}
            {isListening && (
                <>
                    {/* Dark Overlay to fade background */}
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Centered Listening Indicator */}
                    <motion.div
                        className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        {/* Pulsing Mic Icon */}
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

                        {/* Listening Text */}
                        <motion.p
                            className="text-2xl sm:text-3xl font-bold text-white mb-4"
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            Listening...
                        </motion.p>

                        {/* Language Options */}
                        <div className="bg-white/10 backdrop-blur-md px-6 sm:px-8 py-4 rounded-2xl border border-white/20">
                            <p className="text-lg sm:text-xl text-white font-medium text-center">
                                Say: <span className="text-blue-300">English</span> or <span className="text-orange-300">हिंदी</span>
                            </p>
                        </div>
                    </motion.div>
                </>
            )}

            {/* Global Action Button */}
            <GlobalActionButton isActive={isListening} />
        </motion.div>
    );
};

export default Welcome;
