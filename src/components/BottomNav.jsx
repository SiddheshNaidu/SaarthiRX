import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { triggerHaptic, triggerAction } from '../utils/haptics';
import { HomeIcon, PillIcon, CameraIcon, ClipboardIcon, MicIcon, SpeakerIcon } from './Icons';
import './BottomNav.css';

const HIDDEN_ROUTES = ['/', '/login', '/register'];
const ALARM_PREFIXES = ['/alarm', '/reminder/alert'];

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
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

    const handleTabClick = (path) => {
        triggerAction();
        navigate(path);
    };

    const labels = {
        speaker: { 'en-US': 'Repeat', 'hi-IN': 'दोहराएं', 'mr-IN': 'पुन्हा' },
        mic: { 'en-US': 'Speak', 'hi-IN': 'बोलें', 'mr-IN': 'बोला' },
        home: { 'en-US': 'Home', 'hi-IN': 'होम', 'mr-IN': 'होम' },
        medicines: { 'en-US': 'Pills', 'hi-IN': 'दवाएं', 'mr-IN': 'औषधे' },
        scan: { 'en-US': 'Scan', 'hi-IN': 'स्कैन', 'mr-IN': 'स्कॅन' },
        history: { 'en-US': 'History', 'hi-IN': 'इतिहास', 'mr-IN': 'इतिहास' }
    };

    const getLabel = (key) => labels[key]?.[language] || labels[key]?.['en-US'];

    const tabs = [
        { id: 'home', icon: HomeIcon, path: '/dashboard', label: getLabel('home') },
        { id: 'medicines', icon: PillIcon, path: '/medicines', label: getLabel('medicines') },
        { id: 'scan', icon: CameraIcon, path: '/scan', label: getLabel('scan') },
        { id: 'history', icon: ClipboardIcon, path: '/history', label: getLabel('history') },
    ];

    return (
        <>
            {/* Screen-wide visual feedback for Voice/Speech */}
            <AnimatePresence>
                {isListening && (
                    <motion.div
                        key="listening-glow"
                        className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Refined smoother explosion ripple */}
                        <motion.div
                            className="absolute rounded-full bg-orange-500/40"
                            style={{ 
                                left: 'calc(50% + 60px)', bottom: '152px', 
                                width: '100vw', height: '100vw', 
                                x: '-50%', y: '50%' 
                            }}
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                        {/* Ambient pulsing screen vignette */}
                        <motion.div 
                            className="absolute inset-0 shadow-[inset_0_0_120px_rgba(249,115,22,0.15)]"
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        {/* Bottom wave light */}
                        <motion.div 
                            className="absolute bottom-0 w-full h-[30vh] bg-gradient-to-t from-orange-500/20 to-transparent"
                            animate={{ opacity: [0.4, 0.8, 0.4], scaleY: [1, 1.05, 1] }}
                            style={{ transformOrigin: "bottom" }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>
                )}
                {isSpeaking && (
                    <motion.div
                        key="speaking-glow"
                        className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Refined smoother explosion ripple */}
                        <motion.div
                            className="absolute rounded-full bg-blue-500/40"
                            style={{ 
                                left: 'calc(50% - 60px)', bottom: '152px', 
                                width: '100vw', height: '100vw', 
                                x: '-50%', y: '50%' 
                            }}
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                        {/* Ambient pulsing screen vignette */}
                        <motion.div 
                            className="absolute inset-0 shadow-[inset_0_0_120px_rgba(59,130,246,0.15)]"
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        {/* Bottom wave light */}
                        <motion.div 
                            className="absolute bottom-0 w-full h-[30vh] bg-gradient-to-t from-blue-500/20 to-transparent"
                            animate={{ opacity: [0.4, 0.8, 0.4], scaleY: [1, 1.05, 1] }}
                            style={{ transformOrigin: "bottom" }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className="fixed left-0 right-0 bottom-0 z-40 w-full pointer-events-none flex flex-col items-center"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                data-global-voice-controls="true"
            >
            {/* Dual CTA Voice Controls Floating Above Tabs */}
            <div className="flex items-center justify-center gap-6 mb-6">
                <motion.button
                    onClick={handleSpeakerClick}
                    disabled={isSpeaking}
                    className={`pointer-events-auto dual-btn-3d dual-btn-blue relative ${isSpeaking ? 'dual-btn-speaking' : ''}`}
                    aria-label={`🔊 ${getLabel('speaker')}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                    {isSpeaking && (
                        <motion.div 
                            className="absolute inset-0 rounded-full border-[3px] border-blue-200 z-0"
                            initial={{ scale: 1, opacity: 0.8 }}
                            animate={{ scale: 1.6, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        />
                    )}
                    <div className="dual-btn-content relative z-10">
                        <motion.div
                            animate={isSpeaking ? { scale: [1, 1.3, 1], filter: ["drop-shadow(0px 0px 0px rgba(255,255,255,0))", "drop-shadow(0px 0px 8px rgba(255,255,255,0.8))", "drop-shadow(0px 0px 0px rgba(255,255,255,0))"] } : {}}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <SpeakerIcon className="dual-btn-icon" />
                        </motion.div>
                        <span className="dual-btn-caption">{getLabel('speaker')}</span>
                    </div>
                </motion.button>

                <motion.button
                    onClick={handleMicClick}
                    disabled={isSpeaking}
                    className={`pointer-events-auto dual-btn-3d dual-btn-orange relative ${isListening ? 'dual-btn-listening' : ''}`}
                    aria-label={isListening ? `🎙️ ${getLabel('mic')} stop` : `🎙️ ${getLabel('mic')}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                    {isListening && (
                        <motion.div 
                            className="absolute inset-0 rounded-full border-[3px] border-orange-200 z-0"
                            initial={{ scale: 1, opacity: 0.8 }}
                            animate={{ scale: 1.6, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        />
                    )}
                    <div className="dual-btn-content relative z-10">
                        <motion.div
                            animate={isListening ? { scale: [1, 1.3, 1], filter: ["drop-shadow(0px 0px 0px rgba(255,255,255,0))", "drop-shadow(0px 0px 8px rgba(255,255,255,0.8))", "drop-shadow(0px 0px 0px rgba(255,255,255,0))"] } : {}}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <MicIcon className="dual-btn-icon" />
                        </motion.div>
                        <span className="dual-btn-caption">{getLabel('mic')}</span>
                    </div>
                </motion.button>
            </div>

            {/* Bottom 4 Tabs */}
            <div className="pointer-events-auto w-full max-w-mobile h-[80px] bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center justify-between px-6 rounded-t-3xl">
                {tabs.map((tab) => {
                    const isActive = location.pathname.startsWith(tab.path);
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.path)}
                            className="flex flex-col items-center justify-center gap-1 min-w-[64px]"
                            aria-label={tab.label}
                        >
                            <Icon className={`w-7 h-7 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                            <span className={`text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
        </>
    );
};

export default BottomNav;
