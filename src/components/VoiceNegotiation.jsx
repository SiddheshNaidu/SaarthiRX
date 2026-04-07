import React from 'react';
/**
 * VoiceNegotiation Component
 * Handles the voice confirmation loop after prescription scan
 * Implements: Announce → Listen → Confirm/Change times
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '../context/VoiceContext';
import { useApp } from '../context/AppContext';
import { triggerSuccess, triggerAction, triggerAlert } from '../utils/haptics';

// Negotiation states
const STATES = {
    IDLE: 'IDLE',
    ANNOUNCING: 'ANNOUNCING',
    WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
    ASKING_TIME: 'ASKING_TIME',
    LISTENING_TIME: 'LISTENING_TIME',
    CONFIRMED: 'CONFIRMED',
    UPDATING: 'UPDATING'
};

// Time slot defaults
const DEFAULT_TIMES = {
    morning: { hour: 8, display: '8:00 AM', displayHindi: 'सुबह 8 बजे', displayMarathi: 'सकाळी 8 वाजता' },
    afternoon: { hour: 14, display: '2:00 PM', displayHindi: 'दोपहर 2 बजे', displayMarathi: 'दुपारी 2 वाजता' },
    evening: { hour: 18, display: '6:00 PM', displayHindi: 'शाम 6 बजे', displayMarathi: 'संध्याकाळी 6 वाजता' },
    night: { hour: 21, display: '9:00 PM', displayHindi: 'रात 9 बजे', displayMarathi: 'रात्री 9 वाजता' }
};

/**
 * Parse spoken time to hour
 * Handles: "8 AM", "morning", "आठ बजे", "सुबह"
 */
const parseSpokenTime = (speech, language) => {
    const text = speech.toLowerCase().trim();
    
    // Direct hour patterns
    const hourMatch = text.match(/(\d{1,2})\s*(am|pm|बजे|वाजता)?/i);
    if (hourMatch) {
        let hour = parseInt(hourMatch[1]);
        const modifier = hourMatch[2]?.toLowerCase();
        
        if (modifier === 'pm' && hour < 12) hour += 12;
        if (modifier === 'am' && hour === 12) hour = 0;
        
        return { success: true, hour, display: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}` };
    }
    
    // Time of day patterns
    const patterns = {
        morning: ['morning', 'सुबह', 'सकाळी', 'subah', 'sakali'],
        afternoon: ['afternoon', 'दोपहर', 'दुपारी', 'dopahar', 'dupari'],
        evening: ['evening', 'शाम', 'संध्याकाळी', 'sham', 'sandhyakali'],
        night: ['night', 'रात', 'रात्री', 'raat', 'ratri']
    };
    
    for (const [slot, keywords] of Object.entries(patterns)) {
        if (keywords.some(k => text.includes(k))) {
            return { success: true, hour: DEFAULT_TIMES[slot].hour, display: DEFAULT_TIMES[slot].display };
        }
    }
    
    return { success: false };
};

/**
 * Check if user said yes/no
 */
const parseYesNo = (speech, language) => {
    const text = speech.toLowerCase().trim();
    
    const yesPatterns = ['yes', 'हां', 'हाँ', 'होय', 'ha', 'haan', 'change', 'बदलो', 'बदल'];
    const noPatterns = ['no', 'नहीं', 'नाही', 'nahi', 'nahin', 'okay', 'ठीक', 'theek', 'fine'];
    
    if (yesPatterns.some(p => text.includes(p))) return 'yes';
    if (noPatterns.some(p => text.includes(p))) return 'no';
    
    return null;
};

const VoiceNegotiation = ({ 
    medicines = [], 
    onComplete, 
    onTimesUpdated,
    visible = false 
}) => {
    const { language } = useApp();
    const { speak, transcript, isListening, startListening, stopListening, resetTranscript, isSpeaking } = useVoice();
    
    const [state, setState] = useState(STATES.IDLE);
    const [currentMedicineIndex, setCurrentMedicineIndex] = useState(0);
    const [updatedTimes, setUpdatedTimes] = useState({});
    const listenTimeoutRef = useRef(null);
    const silenceTimeoutRef = useRef(null);
    
    const currentMedicine = medicines[currentMedicineIndex];

    // Translations
    const t = {
        foundMedicine: {
            'en-US': (name, times) => `I found ${name}. I have set reminders for ${times}. Do you want to change this? Say Yes or No.`,
            'hi-IN': (name, times) => `मुझे ${name} मिली। मैंने ${times} के लिए याद दिलाने का समय रखा है। क्या आप बदलना चाहते हैं? हां या ना कहें।`,
            'mr-IN': (name, times) => `मला ${name} सापडले. मी ${times} साठी स्मरणपत्र सेट केले आहे. तुम्हाला बदलायचे आहे का? हो किंवा नाही म्हणा.`
        },
        askTime: {
            'en-US': 'What time do you prefer?',
            'hi-IN': 'आप कौन सा समय पसंद करेंगे?',
            'mr-IN': 'तुम्हाला कोणती वेळ आवडेल?'
        },
        saved: {
            'en-US': (times) => `Saved! Reminders set for ${times}.`,
            'hi-IN': (times) => `सहेजा गया! ${times} के लिए याद दिलाया जाएगा।`,
            'mr-IN': (times) => `जतन केले! ${times} साठी स्मरणपत्र सेट केले.`
        },
        updated: {
            'en-US': (time) => `Updated to ${time}. Saved!`,
            'hi-IN': (time) => `${time} पर अपडेट किया गया। सहेजा गया!`,
            'mr-IN': (time) => `${time} वर अपडेट केले. जतन केले!`
        },
        allDone: {
            'en-US': 'All medicines have been set up. You will be reminded at the right times.',
            'hi-IN': 'सभी दवाइयां सेट हो गईं। आपको सही समय पर याद दिलाया जाएगा।',
            'mr-IN': 'सर्व औषधे सेट झाली. तुम्हाला योग्य वेळी आठवण करून दिली जाईल.'
        }
    };

    const getText = (key, ...args) => {
        const template = t[key]?.[language] || t[key]?.['en-US'];
        return typeof template === 'function' ? template(...args) : template;
    };

    const formatTimes = (timings) => {
        if (!timings || timings.length === 0) return '8 AM';
        return timings.map(t => DEFAULT_TIMES[t]?.display || t).join(' and ');
    };

    // Start negotiation when visible and medicines available
    useEffect(() => {
        if (visible && medicines.length > 0 && state === STATES.IDLE) {
            startNegotiation();
        }
    }, [visible, medicines]);

    // Handle transcript changes
    useEffect(() => {
        if (!transcript || isSpeaking) return;

        if (state === STATES.WAITING_CONFIRMATION) {
            handleConfirmationResponse(transcript);
        } else if (state === STATES.LISTENING_TIME) {
            handleTimeResponse(transcript);
        }
    }, [transcript, state, isSpeaking]);

    const startNegotiation = async () => {
        if (!currentMedicine) {
            onComplete?.();
            return;
        }

        setState(STATES.ANNOUNCING);
        const times = formatTimes(currentMedicine.timing);
        const announcement = getText('foundMedicine', currentMedicine.name, times);
        
        await speak(announcement);
        
        // Start listening after TTS completes
        setTimeout(() => {
            setState(STATES.WAITING_CONFIRMATION);
            resetTranscript();
            startListening();
            
            // Auto-confirm after 4 seconds of silence
            silenceTimeoutRef.current = setTimeout(() => {
                if (state === STATES.WAITING_CONFIRMATION) {
                    handleConfirmationResponse('no'); // Treat silence as "no change"
                }
            }, 4000);
        }, 500);
    };

    const handleConfirmationResponse = async (speech) => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        stopListening();
        resetTranscript();

        const response = parseYesNo(speech, language);
        
        if (response === 'yes') {
            // User wants to change time
            triggerAction();
            setState(STATES.ASKING_TIME);
            await speak(getText('askTime'));
            
            setTimeout(() => {
                setState(STATES.LISTENING_TIME);
                startListening();
                
                // Timeout for time input
                listenTimeoutRef.current = setTimeout(() => {
                    handleTimeResponse(''); // Use default if no response
                }, 5000);
            }, 500);
        } else {
            // User confirmed default times
            confirmCurrentMedicine();
        }
    };

    const handleTimeResponse = async (speech) => {
        if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
        stopListening();
        resetTranscript();

        const parsedTime = parseSpokenTime(speech, language);
        
        if (parsedTime.success) {
            triggerSuccess();
            
            // Save updated time
            setUpdatedTimes(prev => ({
                ...prev,
                [currentMedicine.name]: parsedTime.hour
            }));
            
            onTimesUpdated?.(currentMedicine.name, parsedTime.hour);
            
            setState(STATES.UPDATING);
            await speak(getText('updated', parsedTime.display));
        } else {
            // Use default time
            triggerAction();
        }
        
        // Move to next medicine or complete
        moveToNext();
    };

    const confirmCurrentMedicine = async () => {
        triggerSuccess();
        setState(STATES.CONFIRMED);
        
        const times = formatTimes(currentMedicine.timing);
        await speak(getText('saved', times));
        
        moveToNext();
    };

    const moveToNext = () => {
        if (currentMedicineIndex < medicines.length - 1) {
            setCurrentMedicineIndex(prev => prev + 1);
            setState(STATES.IDLE);
            
            // Small delay before next medicine
            setTimeout(() => {
                startNegotiation();
            }, 1000);
        } else {
            // All done
            setState(STATES.CONFIRMED);
            speak(getText('allDone')).then(() => {
                onComplete?.(updatedTimes);
            });
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        };
    }, []);

    if (!visible || medicines.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                >
                    {/* Medicine indicator */}
                    <div className="text-center mb-4">
                        <span className="text-sm text-gray-500">
                            {currentMedicineIndex + 1} / {medicines.length}
                        </span>
                    </div>

                    {/* Current medicine */}
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3">💊</div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {currentMedicine?.name || 'Medicine'}
                        </h2>
                        <p className="text-gray-500">
                            {currentMedicine?.dosage} • {currentMedicine?.frequency}
                        </p>
                    </div>

                    {/* Status indicator */}
                    <div className="flex flex-col items-center gap-4">
                        {(state === STATES.ANNOUNCING || state === STATES.ASKING_TIME) && (
                            <motion.div
                                className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                <span className="text-3xl">🔊</span>
                            </motion.div>
                        )}

                        {(state === STATES.WAITING_CONFIRMATION || state === STATES.LISTENING_TIME) && (
                            <motion.div
                                className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center"
                                animate={{ 
                                    scale: [1, 1.2, 1],
                                    boxShadow: ['0 0 0 0 rgba(249, 115, 22, 0.4)', '0 0 0 20px rgba(249, 115, 22, 0)', '0 0 0 0 rgba(249, 115, 22, 0.4)']
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <span className="text-3xl text-white">🎙️</span>
                            </motion.div>
                        )}

                        {state === STATES.CONFIRMED && (
                            <motion.div
                                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                <span className="text-3xl text-white">✓</span>
                            </motion.div>
                        )}

                        {/* Status text */}
                        <p className="text-lg text-gray-600 text-center">
                            {state === STATES.WAITING_CONFIRMATION && (language === 'hi-IN' ? 'हां या ना कहें...' : 'Say Yes or No...')}
                            {state === STATES.LISTENING_TIME && (language === 'hi-IN' ? 'समय बताएं...' : 'Tell me the time...')}
                            {state === STATES.CONFIRMED && '✓'}
                        </p>
                    </div>

                    {/* Scheduled times display */}
                    <div className="mt-6 bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm text-gray-500 mb-2">Reminder Times:</p>
                        <div className="flex flex-wrap gap-2">
                            {currentMedicine?.timing?.map((time, i) => (
                                <span 
                                    key={i}
                                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                                >
                                    {DEFAULT_TIMES[time]?.display || time}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VoiceNegotiation;
