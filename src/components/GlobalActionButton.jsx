import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '../context/VoiceContext';
import { triggerHaptic } from '../utils/haptics';

const GlobalActionButton = ({ isActive = false }) => {
    const [showRipple, setShowRipple] = useState(false);
    const { isListening, startListening, stopListening } = useVoice();
    const location = useLocation();

    // ═══════════════════════════════════════════════════════════════════════
    // ELDER-FRIENDLY SIZING - LARGE ON ALL VIEWS
    // 96px everywhere for easy touch/click
    // ═══════════════════════════════════════════════════════════════════════
    const buttonSizeClass = 'w-24 h-24';  // 96px on ALL screens
    const iconSizeClass = 'w-10 h-10';    // Icon scales with button

    const handleClick = () => {
        triggerHaptic();
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 800);

        // Toggle listening state
        if (isListening) {
            stopListening();
        } else {
            try {
                startListening();
                console.log('🎙️ Started listening via Global Mic Button');
            } catch (err) {
                console.error('Failed to start listening:', err);
            }
        }
    };

    return (
        <>
            {/* Ripple Effect Overlay */}
            <AnimatePresence>
                {showRipple && (
                    <motion.div
                        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="rounded-full bg-primary w-24 h-24"
                            initial={{ scale: 0, opacity: 0.6 }}
                            animate={{ scale: 15, opacity: 0 }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Action Button - ELDER-FRIENDLY MASSIVE SIZE */}
            <motion.button
                onClick={handleClick}
                className={`
                    fixed bottom-6 sm:bottom-8 z-50
                    left-0 right-0 mx-auto
                    ${buttonSizeClass}
                    rounded-full
                    flex items-center justify-center
                    shadow-xl
                    bg-gradient-to-br from-orange-400 via-primary to-orange-600
                    border-4 border-white/30
                `}
                whileTap={{ scale: 0.95 }}
                animate={isListening || isActive ? {
                    boxShadow: [
                        '0 10px 40px rgba(255, 140, 0, 0.4)',
                        '0 10px 60px rgba(255, 140, 0, 0.7)',
                        '0 10px 40px rgba(255, 140, 0, 0.4)',
                    ]
                } : {}}
                transition={isListening || isActive ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                } : {}}
            >
                {/* Waveform Animation Background (when listening) */}
                {(isListening || isActive) && (
                    <div className="absolute inset-0 flex items-center justify-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-1 bg-white/40 rounded-full"
                                animate={{
                                    height: ['20%', '70%', '35%', '70%', '20%'],
                                }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: i * 0.1
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Mic Icon */}
                <svg
                    className={`${iconSizeClass} text-white relative z-10 drop-shadow-md`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>

                {/* Pulsing Ring */}
                {(isListening || isActive) && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-4 border-white/50"
                        animate={{
                            scale: [1, 1.3],
                            opacity: [0.7, 0]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeOut'
                        }}
                    />
                )}
            </motion.button>
        </>
    );
};

export default GlobalActionButton;
