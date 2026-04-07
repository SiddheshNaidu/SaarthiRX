import React from 'react';
/**
 * AlarmPage - Full-Screen Medication Alarm
 * "Lock Screen" style emergency overlay for elderly users
 * Phase 3: Interactive Alarm with Taken/Not Taken/Snooze
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { useVoice } from '../context/VoiceContext';
import { triggerAlert, triggerSuccess, triggerAction } from '../utils/haptics';
import { logMedicationAction } from '../services/medicationService';
import { scheduleReminderNotification } from '../utils/notifications';

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

const AlarmPage = () => {
    const navigate = useNavigate();
    const { id: medicineId } = useParams();
    const [searchParams] = useSearchParams();
    const { language, user, savedMedicines: contextMedicines, decrementMedicineQuantity } = useApp();
    const { announce } = useVoiceButler();
    const { transcript, resetTranscript } = useVoice();
    
    const [status, setStatus] = useState('active'); // 'active' | 'taken' | 'skipped' | 'snoozed'
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [localMedicines, setLocalMedicines] = useState([]);
    const vibrationRef = useRef(null);
    const hasSpoken = useRef(false);

    // Get user name
    const userName = user?.name || localStorage.getItem('saarthi_user') 
        ? JSON.parse(localStorage.getItem('saarthi_user') || '{}').name || 'Friend'
        : 'Friend';

    // Load medicines from localStorage on mount (backup for when context isn't ready)
    useEffect(() => {
        const storedMedicines = localStorage.getItem('saarthi_medicines');
        if (storedMedicines) {
            setLocalMedicines(JSON.parse(storedMedicines));
        }
        // Give a small delay to ensure context has loaded
        setTimeout(() => setIsInitializing(false), 300);
    }, []);

    // Use context medicines if available, otherwise use localStorage
    const savedMedicines = contextMedicines.length > 0 ? contextMedicines : localMedicines;

    // Find medicine from combined sources
    const medicine = savedMedicines.find(m => m.id === medicineId) || {
        id: medicineId,
        name: 'Your Medicine',
        visualDescription: 'tablet',
        visualColor: 'blue',
        dosage: ''
    };

    // Check if this is a stale alarm (>2 hours late)
    const scheduledTime = searchParams.get('scheduled');
    const isStale = scheduledTime 
        ? (Date.now() - new Date(scheduledTime).getTime()) > 2 * 60 * 60 * 1000 
        : false;

    // Get color for visual pill
    const pillColor = COLOR_MAP[medicine.visualColor?.toLowerCase()] || COLOR_MAP.blue;

    // Translations
    const t = {
        title: {
            'en-US': isStale ? 'Missed Dose' : 'Medicine Time!',
            'hi-IN': isStale ? 'दवाई छूट गई' : 'दवा का समय!',
            'mr-IN': isStale ? 'औषध चुकले' : 'औषधाची वेळ!'
        },
        medicineName: medicine.name,
        instruction: {
            'en-US': `Take ${medicine.dosage || '1 dose'} with water`,
            'hi-IN': `${medicine.dosage || '1 खुराक'} पानी के साथ लें`,
            'mr-IN': `${medicine.dosage || '1 डोस'} पाण्यासोबत घ्या`
        },
        voiceNormal: {
            'en-US': `${userName}, it is time for your ${medicine.name}. Please take it now.`,
            'hi-IN': `${userName}, आपकी ${medicine.name} लेने का समय हो गया है। कृपया अभी लें।`,
            'mr-IN': `${userName}, तुमची ${medicine.name} घेण्याची वेळ झाली आहे. कृपया आता घ्या.`
        },
        voiceStale: {
            'en-US': `${userName}, you missed your scheduled time for ${medicine.name}. Do you still want to take it?`,
            'hi-IN': `${userName}, आपने ${medicine.name} का समय चूक गया। क्या आप अभी भी लेना चाहते हैं?`,
            'mr-IN': `${userName}, तुम्ही ${medicine.name} ची वेळ चुकवली. तरीही घ्यायचे का?`
        },
        taken: {
            'en-US': '✓ TAKEN',
            'hi-IN': '✓ ले लिया',
            'mr-IN': '✓ घेतले'
        },
        notTaken: {
            'en-US': '✕ NOT TAKING',
            'hi-IN': '✕ नहीं लूंगा',
            'mr-IN': '✕ घेणार नाही'
        },
        snooze: {
            'en-US': '⏰ REMIND IN 15 MIN',
            'hi-IN': '⏰ 15 मिनट बाद याद दिलाएं',
            'mr-IN': '⏰ 15 मिनिटांनी आठवण करा'
        },
        successTaken: {
            'en-US': 'Great job! Medicine recorded.',
            'hi-IN': 'शाबाश! दवाई नोट कर ली।',
            'mr-IN': 'छान! औषध नोंदवले.'
        },
        successSkipped: {
            'en-US': 'Okay, I recorded that you skipped this dose.',
            'hi-IN': 'ठीक है, मैंने नोट कर लिया कि आपने यह खुराक छोड़ दी।',
            'mr-IN': 'ठीक आहे, तुम्ही हा डोस वगळला असे नोंदवले.'
        },
        successSnoozed: {
            'en-US': 'Okay, I will remind you again in 15 minutes.',
            'hi-IN': 'ठीक है, मैं 15 मिनट में फिर याद दिलाऊंगा।',
            'mr-IN': 'ठीक आहे, मी 15 मिनिटांनी पुन्हा आठवण करेन.'
        }
    };

    // Only redirect if medicine not found AFTER initialization is complete
    useEffect(() => {
        // Don't redirect while still initializing
        if (isInitializing) return;
        
        // For 'default' ID, always show demo medicine
        if (medicineId === 'default') return;
        
        // Only redirect if we've loaded medicines but still can't find the one we need
        if (savedMedicines.length > 0 && !savedMedicines.find(m => m.id === medicineId)) {
            console.warn('Medicine not found in saved list, showing demo alarm');
            // Don't redirect, just show with default medicine
        }
    }, [medicineId, savedMedicines, navigate, isInitializing]);

    // Auto-start voice announcement on mount
    useEffect(() => {
        if (status === 'active' && !hasSpoken.current) {
            hasSpoken.current = true;
            const voiceMessage = isStale 
                ? t.voiceStale[language] || t.voiceStale['en-US']
                : t.voiceNormal[language] || t.voiceNormal['en-US'];
            
            triggerAlert();
            announce(voiceMessage);

            // Start vibration pattern
            vibrationRef.current = setInterval(() => {
                if ('vibrate' in navigator) {
                    navigator.vibrate([200, 100, 200]);
                }
            }, 3000);
        }

        return () => {
            if (vibrationRef.current) clearInterval(vibrationRef.current);
        };
    }, [status, isStale, language, announce]);

    // Handle TAKEN action
    const handleTaken = async () => {
        setIsLoading(true);
        triggerSuccess();
        
        // Decrement inventory
        decrementMedicineQuantity(medicineId);
        
        // Log to history
        await logMedicationAction(medicineId, 'taken', {
            medicineName: medicine.name,
            timestamp: new Date().toISOString()
        });

        setStatus('taken');
        const msg = t.successTaken[language] || t.successTaken['en-US'];
        await announce(msg);

        setTimeout(() => navigate('/dashboard'), 2000);
    };

    // Handle NOT TAKEN action
    const handleNotTaken = async () => {
        setIsLoading(true);
        triggerAction();
        
        // Log as skipped
        await logMedicationAction(medicineId, 'skipped', {
            medicineName: medicine.name,
            reason: 'User Skipped',
            timestamp: new Date().toISOString()
        });

        setStatus('skipped');
        const msg = t.successSkipped[language] || t.successSkipped['en-US'];
        await announce(msg);

        setTimeout(() => navigate('/dashboard'), 2000);
    };

    // Handle SNOOZE action with MAX LIMIT
    const MAX_SNOOZES = 3;
    const snoozeKey = `snooze_${medicineId}_${new Date().toDateString()}`;
    
    const handleSnooze = async () => {
        setIsLoading(true);
        
        // Get current snooze count for this instance
        const currentCount = parseInt(localStorage.getItem(snoozeKey) || '0');
        const snoozesLeft = MAX_SNOOZES - currentCount - 1;
        
        // Check if max snoozes reached (0, 1, 2 = 3 attempts)
        if (currentCount >= MAX_SNOOZES - 1) {
            // ═══════════════════════════════════════════════════════════
            // STRIKE THREE: Max snooze reached - Force skip
            // ═══════════════════════════════════════════════════════════
            triggerAlert();
            setStatus('forcedSkip');
            
            // Log as auto-skipped
            await logMedicationAction(medicineId, 'skipped', {
                medicineName: medicine.name,
                reason: 'Auto-Closed due to excessive snoozing',
                snoozeCount: currentCount + 1,
                timestamp: new Date().toISOString()
            });
            
            // Clear snooze counter for this instance
            localStorage.removeItem(snoozeKey);
            
            // Voice warning
            const warningMsg = {
                'en-US': `You have delayed this medicine too many times. For your safety, I am marking it as Not Taken. Please try better tomorrow.`,
                'hi-IN': `आपने इस दवाई को बहुत बार टाला है। आपकी सुरक्षा के लिए, मैं इसे नहीं लिया के रूप में चिह्नित कर रहा हूं। कृपया कल बेहतर प्रयास करें।`,
                'mr-IN': `तुम्ही हे औषध खूप वेळा पुढे ढकलले आहे. तुमच्या सुरक्षिततेसाठी, मी हे घेतले नाही म्हणून नोंदवत आहे. कृपया उद्या चांगले प्रयत्न करा.`
            };
            await announce(warningMsg[language] || warningMsg['en-US']);
            
            // Wait for red flash overlay, then redirect
            setTimeout(() => navigate('/dashboard'), 3000);
            return;
        }
        
        // ═══════════════════════════════════════════════════════════
        // STRIKE ONE/TWO: Allow snooze, warn about remaining
        // ═══════════════════════════════════════════════════════════
        triggerAction();
        
        // Increment snooze count
        localStorage.setItem(snoozeKey, String(currentCount + 1));
        
        // Schedule notification for 15 minutes later
        scheduleReminderNotification(medicine.name, 15 * 60 * 1000, language);
        
        // Log snooze
        await logMedicationAction(medicineId, 'snoozed', {
            medicineName: medicine.name,
            snoozeCount: currentCount + 1,
            snoozesRemaining: snoozesLeft,
            snoozeUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            timestamp: new Date().toISOString()
        });

        setStatus('snoozed');
        
        // Voice announcement with warning
        const snoozeMsg = {
            'en-US': `Okay, snoozing for 15 minutes. Warning: You have ${snoozesLeft} snooze${snoozesLeft === 1 ? '' : 's'} left.`,
            'hi-IN': `ठीक है, 15 मिनट के लिए याद दिला रहा हूं। चेतावनी: आपके पास ${snoozesLeft} स्नूज़ बचे हैं।`,
            'mr-IN': `ठीक आहे, 15 मिनिटांसाठी आठवण करतो. इशारा: तुमच्याकडे ${snoozesLeft} स्नूझ उरले आहेत.`
        };
        await announce(snoozeMsg[language] || snoozeMsg['en-US']);

        // Close/minimize the alarm page
        setTimeout(() => navigate('/dashboard'), 2000);
    };

    // Voice command detection
    useEffect(() => {
        if (!transcript || status !== 'active') return;
        
        const lower = transcript.toLowerCase();
        
        if (lower.includes('taken') || lower.includes('ले लिया') || lower.includes('घेतले')) {
            resetTranscript();
            handleTaken();
        } else if (lower.includes('skip') || lower.includes('नहीं') || lower.includes('नाही')) {
            resetTranscript();
            handleNotTaken();
        } else if (lower.includes('snooze') || lower.includes('later') || lower.includes('बाद') || lower.includes('नंतर')) {
            resetTranscript();
            handleSnooze();
        }
    }, [transcript, status]);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-red-50 to-orange-100 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Title */}
            <motion.div
                className="text-center mb-6"
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-2">
                    {t.title[language] || t.title['en-US']}
                </h1>
            </motion.div>

            {/* Central Pill Visual */}
            <motion.div
                className="relative mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
            >
                {medicine.userPhoto ? (
                    <img 
                        src={medicine.userPhoto} 
                        alt={medicine.name}
                        className="w-48 h-48 sm:w-56 sm:h-56 rounded-full object-cover shadow-2xl border-4 border-white"
                    />
                ) : (
                    <div 
                        className="w-48 h-48 sm:w-56 sm:h-56 rounded-full shadow-2xl flex items-center justify-center border-4 border-white"
                        style={{ 
                            backgroundColor: pillColor,
                            boxShadow: `0 20px 60px ${pillColor}60`
                        }}
                    >
                        <span className="text-6xl opacity-80">💊</span>
                    </div>
                )}
                
                {/* Pulse animation */}
                <motion.div
                    className="absolute inset-0 rounded-full border-4 border-orange-400"
                    animate={{ 
                        scale: [1, 1.15, 1],
                        opacity: [0.6, 0, 0.6]
                    }}
                    transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
            </motion.div>

            {/* Medicine Name */}
            <motion.h2
                className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                {medicine.name}
            </motion.h2>

            {/* Visual Description */}
            <motion.p
                className="text-lg text-gray-600 text-center mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                {medicine.visualDescription || `${medicine.visualColor || ''} tablet`}
            </motion.p>

            {/* Instruction */}
            <motion.p
                className="text-xl text-gray-700 text-center mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                {t.instruction[language] || t.instruction['en-US']}
            </motion.p>

            {/* Action Buttons */}
            <AnimatePresence mode="wait">
                {status === 'active' && (
                    <motion.div
                        className="w-full max-w-md space-y-4"
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        {/* TAKEN Button - Large Green */}
                        <motion.button
                            onClick={handleTaken}
                            disabled={isLoading}
                            className="w-full h-28 sm:h-32 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-3xl text-2xl sm:text-3xl font-bold shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {t.taken[language] || t.taken['en-US']}
                        </motion.button>

                        {/* NOT TAKEN Button - Red */}
                        <motion.button
                            onClick={handleNotTaken}
                            disabled={isLoading}
                            className="w-full h-20 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-2xl text-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {t.notTaken[language] || t.notTaken['en-US']}
                        </motion.button>

                        {/* SNOOZE Button - Blue/Gray */}
                        <motion.button
                            onClick={handleSnooze}
                            disabled={isLoading}
                            className="w-full h-20 bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded-2xl text-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {t.snooze[language] || t.snooze['en-US']}
                        </motion.button>
                    </motion.div>
                )}

                {/* Success State */}
                {(status === 'taken' || status === 'skipped' || status === 'snoozed') && (
                    <motion.div
                        className="text-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                    >
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                            status === 'taken' ? 'bg-green-500' : 
                            status === 'skipped' ? 'bg-red-400' : 'bg-blue-500'
                        }`}>
                            <span className="text-4xl text-white">
                                {status === 'taken' ? '✓' : status === 'skipped' ? '✕' : '⏰'}
                            </span>
                        </div>
                        <p className="text-xl font-semibold text-gray-700">
                            {status === 'taken' && (t.successTaken[language] || t.successTaken['en-US'])}
                            {status === 'skipped' && (t.successSkipped[language] || t.successSkipped['en-US'])}
                            {status === 'snoozed' && (t.successSnoozed[language] || t.successSnoozed['en-US'])}
                        </p>
                    </motion.div>
                )}

                {/* Forced Skip State - Red Flash Overlay */}
                {status === 'forcedSkip' && (
                    <motion.div
                        className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-gradient-to-b from-red-500 to-red-700 p-6"
                        initial={{ opacity: 0 }}
                        animate={{ 
                            opacity: 1,
                            backgroundColor: ['#EF4444', '#DC2626', '#EF4444']
                        }}
                        transition={{ 
                            opacity: { duration: 0.3 },
                            backgroundColor: { duration: 0.5, repeat: 3 }
                        }}
                    >
                        <motion.div
                            className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mb-6"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <span className="text-6xl">❌</span>
                        </motion.div>
                        <motion.h2
                            className="text-4xl font-bold text-white text-center mb-4"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {{
                                'en-US': 'Dose Skipped',
                                'hi-IN': 'खुराक छोड़ी गई',
                                'mr-IN': 'डोस वगळला'
                            }[language] || 'Dose Skipped'}
                        </motion.h2>
                        <motion.p
                            className="text-lg text-white/80 text-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {{
                                'en-US': 'Too many snoozes. Marked as Not Taken.',
                                'hi-IN': 'बहुत ज़्यादा स्नूज़। नहीं लिया के रूप में चिह्नित।',
                                'mr-IN': 'खूप स्नूझ. घेतले नाही म्हणून नोंदवले.'
                            }[language] || 'Too many snoozes. Marked as Not Taken.'}
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Hint */}
            {status === 'active' && (
                <motion.p
                    className="absolute bottom-8 text-sm text-gray-500 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    🎙️ Say "Taken", "Skip", or "Snooze"
                </motion.p>
            )}
        </motion.div>
    );
};

export default AlarmPage;
