import { motion } from 'framer-motion';
import { useVoice } from '../context/VoiceContext';
import { triggerHaptic } from '../utils/haptics';

/**
 * DualActionButtons - Speaker (blue) + Mic (orange) side by side
 * 
 * - Speaker: Pulses blue when speaking, tap to repeat question
 * - Mic: Pulses orange when listening, tap to start/stop listening
 */
const DualActionButtons = ({ onRepeat }) => {
    const { isListening, isSpeaking, startListening, stopListening } = useVoice();

    const handleMicClick = () => {
        triggerHaptic();
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleSpeakerClick = () => {
        triggerHaptic();
        if (onRepeat && !isSpeaking) {
            onRepeat();
        }
    };

    return (
        <div className="fixed bottom-6 sm:bottom-8 left-0 right-0 z-40 flex justify-center items-center gap-6 sm:gap-8">
            {/* Speaker Button (Always Blue) */}
            <motion.button
                onClick={handleSpeakerClick}
                disabled={isSpeaking}
                className={`
                    w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24
                    rounded-full
                    flex items-center justify-center
                    shadow-xl
                    border-4 border-white/30
                    transition-all duration-300
                    bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600
                    ${isSpeaking ? 'cursor-not-allowed' : 'hover:from-blue-500 hover:via-blue-600 hover:to-blue-700'}
                `}
                animate={isSpeaking ? {
                    scale: [1, 1.06, 1],
                    boxShadow: [
                        '0 10px 40px rgba(59, 130, 246, 0.3)',
                        '0 10px 60px rgba(59, 130, 246, 0.6)',
                        '0 10px 40px rgba(59, 130, 246, 0.3)',
                    ]
                } : {}}
                transition={isSpeaking ? {
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                } : {}}
                whileHover={!isSpeaking ? { scale: 1.05 } : {}}
                whileTap={!isSpeaking ? { scale: 0.95 } : {}}
            >
                {/* Speaker Icon */}
                <svg
                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white drop-shadow-md"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>

                {/* Pulsing Ring when speaking */}
                {isSpeaking && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 sm:border-4 border-blue-300"
                        animate={{
                            scale: [1, 1.3],
                            opacity: [0.7, 0]
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: 'easeOut'
                        }}
                    />
                )}
            </motion.button>

            {/* Mic Button (Orange) */}
            <motion.button
                onClick={handleMicClick}
                disabled={isSpeaking}
                className={`
                    w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24
                    rounded-full
                    flex items-center justify-center
                    shadow-xl
                    border-4 border-white/30
                    transition-all duration-300
                    ${isSpeaking
                        ? 'bg-gray-300 opacity-50 cursor-not-allowed'
                        : 'bg-gradient-to-br from-orange-400 via-primary to-orange-600'
                    }
                `}
                animate={isListening ? {
                    scale: [1, 1.06, 1],
                    boxShadow: [
                        '0 10px 40px rgba(255, 140, 0, 0.4)',
                        '0 10px 60px rgba(255, 140, 0, 0.7)',
                        '0 10px 40px rgba(255, 140, 0, 0.4)',
                    ]
                } : {}}
                transition={isListening ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                } : {}}
                whileHover={!isSpeaking ? { scale: 1.08 } : {}}
                whileTap={!isSpeaking ? { scale: 0.92 } : {}}
            >
                {/* Waveform Animation Background (when listening) */}
                {isListening && (
                    <div className="absolute inset-0 flex items-center justify-center space-x-0.5 sm:space-x-1">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-0.5 sm:w-1 bg-white/40 rounded-full"
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
                    className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 relative z-10 drop-shadow-md ${isSpeaking ? 'text-gray-500' : 'text-white'}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>

                {/* Pulsing Ring when listening */}
                {isListening && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 sm:border-4 border-white/50"
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
        </div>
    );
};

export default DualActionButtons;
