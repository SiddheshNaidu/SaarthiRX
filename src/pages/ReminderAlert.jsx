import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { useVoice } from '../context/VoiceContext';
import { getReminderById, formatTime } from '../services/reminderService';
import { triggerAlert, triggerSuccess } from '../utils/haptics';

/**
 * ReminderAlert - Full-screen alert when a reminder fires
 * Can be triggered from:
 * 1. ReminderScheduler (passes reminder ID)
 * 2. Notification click (passes medicine ID)
 */
const ReminderAlert = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { language, savedMedicines } = useApp();
    const { announce } = useVoiceButler();
    const { transcript } = useVoice();

    const [reminder, setReminder] = useState(null);
    const [dismissed, setDismissed] = useState(false);
    const [skipped, setSkipped] = useState(false);
    const [snoozed, setSnoozed] = useState(false);
    const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

    const vibrationInterval = useRef(null);
    const voiceInterval = useRef(null);

    // Get user name from localStorage (works even if context isn't ready)
    const userData = JSON.parse(localStorage.getItem('saarthi_user') || localStorage.getItem('userData') || '{}');
    const userName = userData.name || 'Friend';

    // Labels
    const labels = {
        'en-US': {
            title: 'Medicine Time!',
            taken: '✓ I have taken it',
            snooze: 'Snooze',
            skip: 'Skip',
            voiceHint: 'Or say "Taken"',
            snoozed: 'Snoozed for {minutes} minutes',
            snoozeOptions: ['5 min', '10 min', '15 min']
        },
        'hi-IN': {
            title: 'दवा का समय!',
            taken: '✓ मैंने ले लिया',
            snooze: 'स्नूज़',
            skip: 'छोड़ें',
            voiceHint: 'या "ले लिया" बोलें',
            snoozed: '{minutes} मिनट के लिए स्नूज़',
            snoozeOptions: ['5 मिनट', '10 मिनट', '15 मिनट']
        },
        'mr-IN': {
            title: 'औषधाची वेळ!',
            taken: '✓ मी घेतली',
            snooze: 'स्नूझ',
            skip: 'वगळा',
            voiceHint: 'किंवा "घेतली" म्हणा',
            snoozed: '{minutes} मिनिटांसाठी स्नूझ',
            snoozeOptions: ['5 मिनिटे', '10 मिनिटे', '15 मिनिटे']
        }
    };

    const t = labels[language] || labels['en-US'];

    // Helper function to convert color names to hex
    const getColorHex = (colorName) => {
        const colors = {
            'white': '#F9FAFB',
            'pink': '#F472B6',
            'blue': '#3B82F6',
            'red': '#EF4444',
            'yellow': '#FBBF24',
            'green': '#10B981',
            'orange': '#F97316',
            'brown': '#92400E',
            'purple': '#8B5CF6',
            'gray': '#6B7280'
        };
        return colors[colorName?.toLowerCase()] || colors.blue;
    };

    // Load reminder or medicine data
    useEffect(() => {
        if (id) {
            // First try to load as a reminder
            const reminderData = getReminderById(id);
            if (reminderData) {
                setReminder(reminderData);
                return;
            }
            
            // If not found as reminder, try to load as medicine (from notification click)
            // First check context, then localStorage
            const storedMedicines = savedMedicines.length > 0 
                ? savedMedicines 
                : JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
            
            const medicineData = storedMedicines.find(m => m.id === id);
            if (medicineData) {
                // Convert medicine data to reminder format for display
                setReminder({
                    id: medicineData.id,
                    medicineName: medicineData.name,
                    description: medicineData.visualDescription || `${medicineData.visualColor || 'blue'} tablet`,
                    color: getColorHex(medicineData.visualColor) || '#3B82F6',
                    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                });
                return;
            }
            
            // Fallback demo if nothing found
            setReminder({
                id: 'demo',
                medicineName: 'Your Medicine',
                description: 'tablet',
                color: '#3B82F6',
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            });
        } else {
            // Demo reminder if no ID
            setReminder({
                id: 'demo',
                medicineName: 'Amlodipine 5mg',
                description: 'blue round tablet',
                color: '#3B82F6',
                time: '08:00'
            });
        }
    }, [id, savedMedicines]);

    // Create message
    const getMessage = () => {
        if (!reminder) return '';
        const messages = {
            'en-US': `${userName}, it is time for your ${reminder.medicineName}. Please take it now.`,
            'hi-IN': `${userName}, आपकी ${reminder.medicineName} लेने का समय हो गया है। कृपया अभी लें।`,
            'mr-IN': `${userName}, तुमची ${reminder.medicineName} घेण्याची वेळ झाली आहे. कृपया आता घ्या.`
        };
        return messages[language] || messages['en-US'];
    };

    // Utility function to clear intervals
    const clearIntervals = () => {
        clearInterval(vibrationInterval.current);
        clearInterval(voiceInterval.current);
    };

    // Handle taken - defined before useEffect that uses it
    const handleTaken = () => {
        triggerSuccess();
        setDismissed(true);
        clearIntervals();
        
        // Save to history
        const history = JSON.parse(localStorage.getItem('saarthi_medicine_history') || '[]');
        history.push({
            id: Date.now().toString(),
            medicineName: reminder?.medicineName || 'Medicine',
            action: 'taken',
            time: new Date().toISOString(),
            scheduledTime: reminder?.time
        });
        localStorage.setItem('saarthi_medicine_history', JSON.stringify(history));
        
        setTimeout(() => {
            navigate('/reminders');
        }, 1000);
    };

    // Handle snooze
    const handleSnooze = (_minutes) => {
        triggerSuccess();
        setSnoozed(true);
        setShowSnoozeOptions(false);
        clearIntervals();

        // In a real app, you'd schedule a new notification
        setTimeout(() => {
            navigate('/reminders');
        }, 1500);
    };

    // Handle skip - shows different feedback than taken
    const handleSkip = () => {
        setSkipped(true);
        clearIntervals();
        
        // Save to history as skipped
        const history = JSON.parse(localStorage.getItem('saarthi_medicine_history') || '[]');
        history.push({
            id: Date.now().toString(),
            medicineName: reminder?.medicineName || 'Medicine',
            action: 'skipped',
            time: new Date().toISOString(),
            scheduledTime: reminder?.time
        });
        localStorage.setItem('saarthi_medicine_history', JSON.stringify(history));
        
        setTimeout(() => {
            navigate('/reminders');
        }, 800);
    };

    // Start alerts
    useEffect(() => {
        if (!reminder || dismissed || snoozed || skipped) return;

        // Vibration every 2 seconds
        vibrationInterval.current = setInterval(() => {
            triggerAlert();
        }, 2000);

        // Voice every 10 seconds
        voiceInterval.current = setInterval(() => {
            announce(getMessage());
        }, 10000);

        // Initial announcement
        announce(getMessage());

        return () => {
            clearInterval(vibrationInterval.current);
            clearInterval(voiceInterval.current);
        };
    }, [reminder, dismissed, snoozed, announce, getMessage]);

    // Listen for voice commands
    useEffect(() => {
        if (!transcript) return;
        const lower = transcript.toLowerCase();
        if (lower.includes('taken') || lower.includes('ले लिया') || lower.includes('घेतली')) {
            handleTaken();
        }
    }, [transcript, handleTaken]);

    // Dismissed state
    if (dismissed) {
        return (
            <motion.div
                className="min-h-screen flex items-center justify-center bg-green-500"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="text-white text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    <div className="text-8xl mb-4">✓</div>
                    <p className="text-2xl font-bold">Great job!</p>
                </motion.div>
            </motion.div>
        );
    }

    // Snoozed state
    if (snoozed) {
        return (
            <motion.div
                className="min-h-screen flex items-center justify-center bg-blue-500"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="text-white text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    <div className="text-8xl mb-4">😴</div>
                    <p className="text-2xl font-bold">Snoozed</p>
                </motion.div>
            </motion.div>
        );
    }

    // Skipped state - different visual (gray/neutral)
    if (skipped) {
        return (
            <motion.div
                className="min-h-screen flex items-center justify-center bg-gray-400"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="text-white text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    <div className="text-8xl mb-4">⏭️</div>
                    <p className="text-2xl font-bold">Skipped</p>
                </motion.div>
            </motion.div>
        );
    }

    if (!reminder) return null;

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-red-500 via-orange-500 to-red-600 text-white relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Pulsing Background */}
            <motion.div
                className="absolute inset-0 bg-red-600/30"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Content */}
            <div className="relative z-10 text-center w-full max-w-md">
                {/* Alert Icon */}
                <motion.div
                    className="mb-6"
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="text-8xl">⏰</div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    className="text-4xl md:text-5xl font-display font-bold mb-4"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                >
                    {t.title}
                </motion.h1>

                {/* Message */}
                <motion.p
                    className="text-2xl mb-6 leading-relaxed px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {getMessage()}
                </motion.p>

                {/* Pill Visual */}
                <motion.div
                    className="flex justify-center mb-8"
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div
                        className="w-24 h-24 rounded-full shadow-2xl border-4 border-white"
                        style={{
                            backgroundColor: reminder.color,
                            boxShadow: '0 15px 40px rgba(0,0,0,0.4), inset 0 -8px 15px rgba(0,0,0,0.2)'
                        }}
                    />
                </motion.div>

                {/* Time */}
                <p className="text-xl opacity-80 mb-8">
                    {formatTime(reminder.time)}
                </p>

                {/* Main Action - Take Button */}
                <motion.button
                    onClick={handleTaken}
                    className="w-full min-h-[100px] px-8 py-6 bg-white text-green-600 rounded-3xl font-bold text-3xl shadow-2xl border-4 border-green-400 mb-4"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                        boxShadow: [
                            '0 0 0 0 rgba(255,255,255,0.7)',
                            '0 0 0 20px rgba(255,255,255,0)',
                        ]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {t.taken}
                </motion.button>

                {/* Secondary Actions */}
                <div className="flex gap-3">
                    {/* Snooze */}
                    <div className="flex-1 relative">
                        <motion.button
                            onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                            className="w-full py-4 px-6 bg-white/20 backdrop-blur rounded-2xl font-semibold text-lg border-2 border-white/30"
                            whileTap={{ scale: 0.95 }}
                        >
                            😴 {t.snooze}
                        </motion.button>

                        {/* Snooze Options */}
                        {showSnoozeOptions && (
                            <motion.div
                                className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl p-2 shadow-xl"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {[5, 10, 15].map((mins, idx) => (
                                    <motion.button
                                        key={mins}
                                        onClick={() => handleSnooze(mins)}
                                        className="w-full py-3 text-gray-800 font-semibold hover:bg-gray-100 rounded-xl"
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {t.snoozeOptions[idx]}
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </div>

                    {/* Skip */}
                    <motion.button
                        onClick={handleSkip}
                        className="flex-1 py-4 px-6 bg-white/20 backdrop-blur rounded-2xl font-semibold text-lg border-2 border-white/30"
                        whileTap={{ scale: 0.95 }}
                    >
                        ⏭️ {t.skip}
                    </motion.button>
                </div>

                {/* Voice Hint */}
                <motion.p
                    className="mt-6 text-lg opacity-80"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {t.voiceHint} 🎙️
                </motion.p>
            </div>
        </motion.div>
    );
};

export default ReminderAlert;
