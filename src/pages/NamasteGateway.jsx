import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { triggerHaptic } from '../utils/haptics';

const NamasteGateway = () => {
    const navigate = useNavigate();
    const [isUnlocking, setIsUnlocking] = useState(false);

    const handleUnlock = async () => {
        if (isUnlocking) return;

        setIsUnlocking(true);
        triggerHaptic(50);

        try {
            // Silent utterance to unlock audio context
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            window.speechSynthesis.speak(utterance);

            // Wait for silent utterance to complete
            await new Promise(resolve => {
                utterance.onend = resolve;
                setTimeout(resolve, 100); // Fallback
            });

            // Now ask for language preference via TTS in Hindi
            const languagePrompt = new SpeechSynthesisUtterance(
                "सार्थीआरएक्स में आपका स्वागत है। कृपया अपनी भाषा बोलें: अंग्रेजी, हिंदी, या मराठी"
            );
            languagePrompt.lang = 'hi-IN';
            languagePrompt.rate = 0.9;
            languagePrompt.pitch = 1;
            window.speechSynthesis.speak(languagePrompt);

            // Wait for TTS to complete, then navigate
            await new Promise(resolve => {
                languagePrompt.onend = resolve;
                setTimeout(resolve, 6000); // Fallback after 6 seconds
            });

            // Transition to welcome screen
            setTimeout(() => {
                navigate('/welcome');
            }, 500);
        } catch (error) {
            console.error('Audio unlock error:', error);
            // Still navigate even if speech fails
            setTimeout(() => {
                navigate('/welcome');
            }, 800);
        }
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-premium-gradient-start via-warm-bg-start to-premium-gradient-end p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
        >
            {/* Content - Centered Container */}
            <div className="flex flex-col items-center justify-center text-center">
                {/* Logo/Title */}
                <motion.h1
                    className="text-5xl md:text-6xl font-display font-bold text-gray-800 mb-4"
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    🙏 Namaste
                </motion.h1>

                <motion.p
                    className="text-xl md:text-2xl text-gray-600 mb-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    Your Healthcare Companion
                </motion.p>

                {/* Massive Namaste Button with Pulsing Heart - Properly Centered */}
                <motion.button
                    onClick={handleUnlock}
                    disabled={isUnlocking}
                    className="
            w-56 h-56 md:w-64 md:h-64 rounded-full
            bg-gradient-to-br from-orange-500 via-primary to-orange-600
            shadow-premium-lg
            flex items-center justify-center
            overflow-hidden
            disabled:opacity-70
            mx-auto
          "
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                    whileHover={!isUnlocking ? { scale: 1.05 } : {}}
                    whileTap={!isUnlocking ? { scale: 0.95 } : {}}
                >
                    {/* Pulsing Heart Animation */}
                    <motion.div
                        className="flex items-center justify-center"
                        animate={{
                            scale: isUnlocking ? [1, 1.2, 1] : [1, 1.1, 1]
                        }}
                        transition={{
                            duration: isUnlocking ? 0.6 : 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <div className="text-8xl md:text-9xl filter drop-shadow-lg">❤️</div>
                    </motion.div>

                    {/* Ripple Effect */}
                    {!isUnlocking && (
                        <motion.div
                            className="absolute inset-0 rounded-full border-4 border-white/40"
                            animate={{
                                scale: [1, 1.5],
                                opacity: [0.6, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeOut"
                            }}
                        />
                    )}
                </motion.button>

                {/* Label Below Button */}
                <motion.p
                    className="mt-6 text-2xl font-bold text-primary"
                    animate={{ opacity: isUnlocking ? 0.5 : 1 }}
                >
                    {isUnlocking ? 'Starting...' : 'Tap to Say'}
                </motion.p>

                {/* Subtitle */}
                <motion.p
                    className="mt-2 text-lg text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    Touch the heart
                </motion.p>
            </div>
        </motion.div>
    );
};

export default NamasteGateway;
