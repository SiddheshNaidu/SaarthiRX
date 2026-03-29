/**
 * BottomNav — Elder-first dual action bar
 *
 * Simplified to only:
 * - Speaker (repeat current page guidance)
 * - Mic (start/stop listening)
 */

import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { triggerHaptic } from '../utils/haptics';

const HIDDEN_ROUTES = ['/', '/login', '/register'];
const ALARM_PREFIXES = ['/alarm', '/reminder/alert'];

const BottomNav = () => {
    const location = useLocation();
    const { language } = useApp();
    const { isListening, isSpeaking, startListening, stopListening, repeatContent } = useVoice();

    // Hide on auth/alarm pages
    const shouldHide = HIDDEN_ROUTES.includes(location.pathname)
        || ALARM_PREFIXES.some(p => location.pathname.startsWith(p));

    if (shouldHide) return null;

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
        if (!isSpeaking) {
            repeatContent();
        }
    };

    const labels = {
        speaker: { 'en-US': 'Repeat', 'hi-IN': 'दोहराएं', 'mr-IN': 'पुन्हा' },
        mic: { 'en-US': 'Speak', 'hi-IN': 'बोलें', 'mr-IN': 'बोला' },
    };

    const getLabel = (key) => labels[key]?.[language] || labels[key]?.['en-US'];

    return (
        <div
            className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 pointer-events-none w-full max-w-mobile px-4"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            data-global-voice-controls="true"
        >
            <div className="flex items-center justify-center gap-8 mb-4">
                <motion.button
                    onClick={handleSpeakerClick}
                    disabled={isSpeaking}
                    className={`
                        pointer-events-auto w-24 h-24 rounded-full border-4 border-white flex items-center justify-center
                        bg-gradient-to-b ${isSpeaking ? 'from-gray-300 to-gray-400 text-gray-500' : 'from-blue-400 to-blue-600 text-white'}
                    `}
                    initial={{ y: 0, boxShadow: isSpeaking ? '0px 8px 0px #9ca3af, 0px 15px 25px rgba(0,0,0,0.2)' : '0px 8px 0px #1d4ed8, 0px 15px 25px rgba(0,0,0,0.3)' }}
                    whileTap={!isSpeaking ? { y: 8, boxShadow: '0px 0px 0px #1d4ed8, 0px 5px 10px rgba(0,0,0,0.4)', scale: 0.95 } : {}}
                    animate={isSpeaking ? {
                        y: [0, 2, 0],
                        boxShadow: [
                            '0px 8px 0px #9ca3af, 0px 15px 25px rgba(0,0,0,0.2)',
                            '0px 6px 0px #9ca3af, 0px 12px 20px rgba(0,0,0,0.25)',
                            '0px 8px 0px #9ca3af, 0px 15px 25px rgba(0,0,0,0.2)'
                        ]
                    } : {}}
                    transition={isSpeaking ? { duration: 1.5, repeat: Infinity } : { type: "spring", stiffness: 400, damping: 25 }}
                    aria-label={`🔊 ${getLabel('speaker')}`}
                >
                    <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                </motion.button>

                <motion.button
                    onClick={handleMicClick}
                    disabled={isSpeaking}
                    className={`
                        pointer-events-auto w-24 h-24 rounded-full border-4 border-white flex items-center justify-center relative overflow-hidden
                        bg-gradient-to-b ${isSpeaking ? 'from-gray-300 to-gray-400 text-gray-500' : 'from-orange-400 to-orange-600 text-white'}
                    `}
                    initial={{ y: 0, boxShadow: isSpeaking ? '0px 8px 0px #9ca3af, 0px 15px 25px rgba(0,0,0,0.2)' : '0px 8px 0px #c2410c, 0px 15px 25px rgba(0,0,0,0.3)' }}
                    whileTap={!isSpeaking ? { y: 8, boxShadow: '0px 0px 0px #c2410c, 0px 5px 10px rgba(0,0,0,0.4)', scale: 0.95 } : {}}
                    animate={isListening ? {
                        y: [0, 4, 0],
                        boxShadow: [
                            '0px 8px 0px #c2410c, 0px 15px 25px rgba(255,140,0,0.5)',
                            '0px 4px 0px #c2410c, 0 0 0 20px rgba(255,140,0,0)',
                            '0px 8px 0px #c2410c, 0px 15px 25px rgba(255,140,0,0.5)',
                        ]
                    } : {}}
                    transition={isListening ? { duration: 1.4, repeat: Infinity } : { type: "spring", stiffness: 400, damping: 25 }}
                    aria-label={isListening ? `🎙️ ${getLabel('mic')} stop` : `🎙️ ${getLabel('mic')}`}
                >
                    {isListening && (
                        <div className="absolute inset-0 flex items-center justify-center space-x-0.5" aria-hidden="true">
                            {[...Array(4)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1 bg-white/50 rounded-full"
                                    animate={{ height: ['25%', '70%', '40%', '70%', '25%'] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                                />
                            ))}
                        </div>
                    )}
                    <svg className="w-9 h-9 relative z-10" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                </motion.button>
            </div>
        </div>
    );
};

export default BottomNav;
