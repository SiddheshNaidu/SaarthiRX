import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * OTPWaitingOverlay - Displays a pulsing shield animation while waiting for OTP
 * 
 * Features:
 * - Giant pulsing shield with gradient animation
 * - "Waiting for secure code..." text
 * - Countdown timer display
 * - Voice prompts every 10 seconds
 */
const OTPWaitingOverlay = ({
    isVisible,
    onVoicePrompt,
    remainingTime = 30,
    language = 'hi-IN'
}) => {
    const promptIntervalRef = useRef(null);
    const lastPromptTimeRef = useRef(Date.now());

    const messages = {
        'en-US': {
            waiting: 'Waiting for secure code...',
            keepOpen: 'Keep the app open',
            seconds: 'seconds remaining'
        },
        'hi-IN': {
            waiting: 'सुरक्षित कोड का इंतजार...',
            keepOpen: 'ऐप खुला रखें',
            seconds: 'सेकंड बाकी'
        },
        'mr-IN': {
            waiting: 'सुरक्षित कोडची वाट पाहत आहे...',
            keepOpen: 'अॅप उघडे ठेवा',
            seconds: 'सेकंद बाकी'
        }
    };

    const msg = messages[language] || messages['hi-IN'];

    // Voice prompts every 10 seconds
    useEffect(() => {
        if (!isVisible || !onVoicePrompt) return;

        lastPromptTimeRef.current = Date.now();

        promptIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastPromptTimeRef.current;

            if (elapsed >= 10000) {
                lastPromptTimeRef.current = now;
                onVoicePrompt();
            }
        }, 1000);

        return () => {
            if (promptIntervalRef.current) {
                clearInterval(promptIntervalRef.current);
            }
        };
    }, [isVisible, onVoicePrompt]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        {/* Pulsing Shield Container */}
                        <div className="relative mb-8">
                            {/* Outer glow rings */}
                            <motion.div
                                className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/30 to-amber-500/30 blur-2xl"
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.5, 0.8, 0.5]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{ width: 200, height: 200, left: -25, top: -25 }}
                            />

                            {/* Middle pulse ring */}
                            <motion.div
                                className="absolute inset-0 rounded-full border-4 border-orange-400/40"
                                animate={{
                                    scale: [1, 1.5, 2],
                                    opacity: [0.6, 0.3, 0]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeOut"
                                }}
                                style={{ width: 150, height: 150 }}
                            />

                            {/* Inner pulse ring */}
                            <motion.div
                                className="absolute inset-0 rounded-full border-4 border-amber-400/40"
                                animate={{
                                    scale: [1, 1.3, 1.6],
                                    opacity: [0.8, 0.4, 0]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeOut",
                                    delay: 0.5
                                }}
                                style={{ width: 150, height: 150 }}
                            />

                            {/* Main Shield Circle */}
                            <motion.div
                                className="relative w-[150px] h-[150px] rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-2xl flex items-center justify-center"
                                animate={{
                                    scale: [1, 1.05, 1],
                                    boxShadow: [
                                        '0 0 40px rgba(251, 146, 60, 0.4)',
                                        '0 0 60px rgba(251, 146, 60, 0.6)',
                                        '0 0 40px rgba(251, 146, 60, 0.4)'
                                    ]
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                {/* Shield Icon */}
                                <motion.svg
                                    className="w-20 h-20 text-white drop-shadow-lg"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                                </motion.svg>
                            </motion.div>
                        </div>

                        {/* Waiting Text */}
                        <motion.h2
                            className="text-2xl sm:text-3xl font-bold text-white mb-3"
                            animate={{ opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {msg.waiting}
                        </motion.h2>

                        {/* Countdown Timer */}
                        <motion.div
                            className="flex items-center justify-center gap-2 text-orange-300 text-lg mb-4"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                        >
                            <motion.span
                                className="text-4xl font-bold text-orange-400"
                                key={remainingTime}
                                initial={{ scale: 1.2, opacity: 0.5 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                {remainingTime}
                            </motion.span>
                            <span className="text-orange-300/80">{msg.seconds}</span>
                        </motion.div>

                        {/* Keep Open Message */}
                        <motion.p
                            className="text-gray-400 text-base"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            📱 {msg.keepOpen}
                        </motion.p>

                        {/* Animated dots loader */}
                        <div className="flex gap-2 mt-6">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-3 h-3 rounded-full bg-orange-400"
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        delay: i * 0.2
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OTPWaitingOverlay;
