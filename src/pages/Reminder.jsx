/**
 * Reminder Page - Cognitive Notification Overlay
 * Full-screen alarm for elderly users with visual medicine identification
 * Phase 4: Smart Patient Module
 * + Serverless Browser Notifications
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { useVoice } from '../context/VoiceContext';
import { triggerAlert, triggerSuccess, triggerAction } from '../utils/haptics';
import { logMedicationAction } from '../services/medicationService';
import { requestNotificationPermission, triggerMissedDoseNotification } from '../utils/notifications';

// Color mapping for visual pills
const COLOR_MAP = {
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

const Reminder = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { language } = useApp();
    const { announce } = useVoiceButler();
    const { transcript, resetTranscript, isListening } = useVoice();
    
    const [status, setStatus] = useState('active'); // 'active' | 'taken' | 'snoozed' | 'missed'
    const vibrationRef = useRef(null);
    const voiceRef = useRef(null);

    // Get user data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userName = userData.name || 'Friend';

    // Get medicine from URL params or localStorage
    const medicineId = searchParams.get('id');
    const timing = searchParams.get('timing') || 'morning';
    
    // Load medicine from localStorage (or could be from Firestore)
    const savedMedicines = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
    const medicine = medicineId 
        ? savedMedicines.find(m => m.id === medicineId) 
        : savedMedicines[0] || {
            name: 'Your Medicine',
            visualDescription: 'blue round tablet',
            visualColor: 'blue',
            dosage: '5mg'
        };

    // Get color for visual pill
    const pillColor = COLOR_MAP[medicine.visualColor?.toLowerCase()] || COLOR_MAP.blue;

    // Construct the visual description for voice
    const visualDesc = medicine.visualDescription || `${medicine.visualColor || 'blue'} tablet`;

    // Translations
    const t = {
        title: {
            'en-US': 'Medicine Time!',
            'hi-IN': 'दवा का समय!',
            'mr-IN': 'औषधाची वेळ!'
        },
        message: {
            'en-US': `${userName}, it is time for your ${visualDesc}. Please take it now.`,
            'hi-IN': `${userName}, आपकी ${visualDesc} लेने का समय हो गया है। कृपया अभी लें।`,
            'mr-IN': `${userName}, तुमची ${visualDesc} घेण्याची वेळ झाली आहे. कृपया आता घ्या.`
        },
        taken: {
            'en-US': '✓ I Have Taken It',
            'hi-IN': '✓ मैंने ले लिया',
            'mr-IN': '✓ मी घेतले'
        },
        later: {
            'en-US': '⏱️ Remind Later',
            'hi-IN': '⏱️ बाद में याद दिलाएं',
            'mr-IN': '⏱️ नंतर आठवण करा'
        },
        notTaking: {
            'en-US': '❌ Not Taking',
            'hi-IN': '❌ नहीं लूंगा',
            'mr-IN': '❌ घेणार नाही'
        },
        voiceHint: {
            'en-US': 'Say "Taken" or "Later" 🎙️',
            'hi-IN': '"ले लिया" या "बाद में" बोलें 🎙️',
            'mr-IN': '"घेतले" किंवा "नंतर" म्हणा 🎙️'
        },
        snoozed: {
            'en-US': 'I will remind you in 15 minutes',
            'hi-IN': 'मैं आपको 15 मिनट में याद दिलाऊंगा',
            'mr-IN': 'मी तुम्हाला 15 मिनिटांत आठवण करून देईन'
        },
        missed: {
            'en-US': 'Dose marked as missed',
            'hi-IN': 'खुराक छूटी हुई मानी गई',
            'mr-IN': 'डोस चुकला म्हणून नोंदवले'
        }
    };

    const getText = (key) => t[key]?.[language] || t[key]?.['en-US'];
    const message = getText('message');

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Track if notification was sent
    const missedNotificationSent = useRef(false);

    // Start alerts on mount
    useEffect(() => {
        if (status !== 'active') return;

        // Continuous alert haptic
        vibrationRef.current = setInterval(() => {
            triggerAlert();
        }, 2000);

        // Voice announcement every 10 seconds
        voiceRef.current = setInterval(() => {
            announce(message);
        }, 10000);

        // Initial announcement
        announce(message);

        // ═══════════════════════════════════════════════════════════
        // SERVERLESS NOTIFICATION: Fire browser notification after 1 minute
        // if user hasn't clicked "Taken" (demo simulation)
        // ═══════════════════════════════════════════════════════════
        const missedDoseTimeout = setTimeout(() => {
            if (status === 'active' && !missedNotificationSent.current) {
                missedNotificationSent.current = true;
                // Pass full medicine object for rich description
                triggerMissedDoseNotification(medicine, language);
            }
        }, 60000); // 1 minute

        return () => {
            if (vibrationRef.current) clearInterval(vibrationRef.current);
            if (voiceRef.current) clearInterval(voiceRef.current);
            clearTimeout(missedDoseTimeout);
        };
    }, [message, announce, status, medicine, language]);

    // Voice command detection
    useEffect(() => {
        if (!transcript || status !== 'active') return;

        const cmd = transcript.toLowerCase();
        
        // Check for "taken" commands
        const takenPatterns = ['taken', 'ले लिया', 'ली', 'घेतले', 'घेतली', 'done', 'हो गया'];
        if (takenPatterns.some(p => cmd.includes(p))) {
            resetTranscript();
            handleTaken();
            return;
        }

        // Check for "later" commands
        const laterPatterns = ['later', 'बाद में', 'नंतर', 'snooze', 'remind'];
        if (laterPatterns.some(p => cmd.includes(p))) {
            resetTranscript();
            handleLater();
            return;
        }

        // Check for "not taking" commands
        const skipPatterns = ['not taking', 'skip', 'नहीं', 'नाही', 'छोड़'];
        if (skipPatterns.some(p => cmd.includes(p))) {
            resetTranscript();
            handleNotTaking();
            return;
        }
    }, [transcript, status]);

    // Handle "Taken" action with Inventory Decrement
    const handleTaken = async () => {
        triggerSuccess();
        setStatus('taken');

        // Log to Firestore
        await logMedicationAction(
            medicine.id || 'unknown',
            medicine.name,
            'taken',
            { timing, scheduledTime: new Date().toISOString() }
        );

        // Phase 4: Inventory Decrement
        const allMedicines = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
        const updatedMedicines = allMedicines.map(m => {
            if (m.id === medicine.id || (m.name === medicine.name && !medicine.id)) {
                const newQty = Math.max((m.quantity || 30) - 1, 0);
                return { ...m, quantity: newQty };
            }
            return m;
        });
        localStorage.setItem('saarthi_medicines', JSON.stringify(updatedMedicines));

        // Check for low stock (quantity < 3)
        const updatedMed = updatedMedicines.find(m => 
            m.id === medicine.id || (m.name === medicine.name && !medicine.id)
        );
        if (updatedMed && updatedMed.quantity < 3) {
            const lowStockMsg = {
                'en-US': `Warning! You are running low on ${medicine.name}.`,
                'hi-IN': `चेतावनी! आपकी ${medicine.name} कम हो रही है।`,
                'mr-IN': `चेतावणी! तुमची ${medicine.name} कमी होत आहे.`
            };
            setTimeout(() => {
                announce(lowStockMsg[language] || lowStockMsg['en-US']);
            }, 1500);
        }

        // Stop alerts
        if (vibrationRef.current) clearInterval(vibrationRef.current);
        if (voiceRef.current) clearInterval(voiceRef.current);

        // Navigate after delay
        setTimeout(() => {
            navigate('/dashboard');
        }, 2500);
    };

    // Handle "Later" action (snooze for 15 mins)
    const handleLater = async () => {
        triggerAction();
        setStatus('snoozed');

        // Log snooze to Firestore
        await logMedicationAction(
            medicine.id || 'unknown',
            medicine.name,
            'snoozed',
            { timing, snoozeMinutes: 15 }
        );

        // Stop current alerts
        if (vibrationRef.current) clearInterval(vibrationRef.current);
        if (voiceRef.current) clearInterval(voiceRef.current);

        // Announce snooze
        announce(getText('snoozed'));

        // TODO: Schedule a new reminder in 15 minutes (would use notification API)

        setTimeout(() => {
            navigate('/dashboard');
        }, 2000);
    };

    // Handle "Not Taking" action
    const handleNotTaking = async () => {
        triggerAlert();
        setStatus('missed');

        // Log missed to Firestore
        await logMedicationAction(
            medicine.id || 'unknown',
            medicine.name,
            'missed',
            { timing, reason: 'user_declined' }
        );

        // Stop alerts
        if (vibrationRef.current) clearInterval(vibrationRef.current);
        if (voiceRef.current) clearInterval(voiceRef.current);

        announce(getText('missed'));

        setTimeout(() => {
            navigate('/dashboard');
        }, 2000);
    };

    // Success/Snoozed/Missed confirmation screens
    if (status === 'taken') {
        return (
            <motion.div
                className="min-h-screen flex flex-col items-center justify-center bg-green-500 text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <motion.div
                    className="text-8xl mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                >
                    ✓
                </motion.div>
                <p className="text-2xl">Logged!</p>
            </motion.div>
        );
    }

    if (status === 'snoozed') {
        return (
            <motion.div
                className="min-h-screen flex flex-col items-center justify-center bg-yellow-500 text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="text-8xl mb-4">⏰</div>
                <p className="text-2xl text-center px-8">{getText('snoozed')}</p>
            </motion.div>
        );
    }

    if (status === 'missed') {
        return (
            <motion.div
                className="min-h-screen flex flex-col items-center justify-center bg-gray-600 text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="text-8xl mb-4">😔</div>
                <p className="text-2xl text-center px-8">{getText('missed')}</p>
            </motion.div>
        );
    }

    // Main Alarm UI
    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-500 via-orange-500 to-red-600 text-white relative overflow-hidden"
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
                    className="mb-4"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="text-7xl">⏰</div>
                </motion.div>

                {/* Title */}
                <h1 className="text-4xl font-bold mb-4">{getText('title')}</h1>

                {/* Message */}
                <p className="text-xl mb-6 leading-relaxed px-2">{message}</p>

                {/* Visual Pill - User's Photo or Colored Circle */}
                <motion.div
                    className="flex justify-center mb-8"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    {medicine.userPhoto ? (
                        <img 
                            src={medicine.userPhoto} 
                            alt={medicine.name}
                            className="w-28 h-28 rounded-xl object-cover border-4 border-white shadow-2xl"
                        />
                    ) : (
                        <div
                            className="w-28 h-28 rounded-full shadow-2xl border-4 border-white flex items-center justify-center"
                            style={{
                                backgroundColor: pillColor,
                                boxShadow: '0 15px 40px rgba(0,0,0,0.4), inset 0 -8px 15px rgba(0,0,0,0.2)'
                            }}
                        >
                            <span className="text-white text-sm font-bold opacity-80">
                                {medicine.dosage}
                            </span>
                        </div>
                    )}
                </motion.div>

                {/* Medicine Name & Details */}
                <p className="text-2xl font-bold mb-6">{medicine.name}</p>

                {/* Action Buttons - 3 buttons as specified */}
                <div className="space-y-3 mb-6">
                    {/* TAKEN Button - Large, Primary */}
                    <motion.button
                        onClick={handleTaken}
                        className="w-full min-h-[100px] px-6 py-4 bg-white text-green-600 rounded-3xl font-bold text-2xl shadow-2xl border-4 border-green-400"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{
                            boxShadow: [
                                '0 0 0 0 rgba(255,255,255,0.7)',
                                '0 0 0 15px rgba(255,255,255,0)',
                            ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        {getText('taken')}
                    </motion.button>

                    {/* Secondary Buttons Row */}
                    <div className="flex gap-3">
                        {/* LATER Button */}
                        <motion.button
                            onClick={handleLater}
                            className="flex-1 min-h-[70px] px-4 py-3 bg-yellow-400 text-yellow-900 rounded-2xl font-bold text-lg shadow-lg"
                            whileTap={{ scale: 0.95 }}
                        >
                            {getText('later')}
                        </motion.button>

                        {/* NOT TAKING Button */}
                        <motion.button
                            onClick={handleNotTaking}
                            className="flex-1 min-h-[70px] px-4 py-3 bg-white/20 text-white rounded-2xl font-bold text-lg border-2 border-white/40"
                            whileTap={{ scale: 0.95 }}
                        >
                            {getText('notTaking')}
                        </motion.button>
                    </div>
                </div>

                {/* Voice Hint */}
                <motion.p
                    className="text-base opacity-80"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {getText('voiceHint')}
                </motion.p>

                {/* Listening indicator */}
                {isListening && (
                    <motion.div
                        className="mt-4 flex items-center justify-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.div
                            className="w-3 h-3 bg-white rounded-full"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        />
                        <span>Listening...</span>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default Reminder;
