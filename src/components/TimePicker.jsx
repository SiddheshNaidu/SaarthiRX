import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TIME_PRESETS } from '../services/reminderService';
import { useApp } from '../context/AppContext';

/**
 * TimePicker - Alarm-style time picker with scrollable wheels
 * Elder-friendly design with large touch targets
 */
const TimePicker = ({ value = '08:00', onChange, onConfirm, onCancel }) => {
    const { language } = useApp();

    const copy = {
        title: {
            'en-US': 'Set Reminder Time',
            'hi-IN': 'रिमाइंडर समय सेट करें',
            'mr-IN': 'रिमाइंडर वेळ सेट करा'
        },
        quickPresets: {
            'en-US': 'Quick Presets',
            'hi-IN': 'जल्दी समय विकल्प',
            'mr-IN': 'जलद वेळ पर्याय'
        },
        cancel: {
            'en-US': 'Cancel',
            'hi-IN': 'रद्द करें',
            'mr-IN': 'रद्द करा'
        },
        setTime: {
            'en-US': 'Set Time',
            'hi-IN': 'समय सेट करें',
            'mr-IN': 'वेळ सेट करा'
        },
        increaseHours: {
            'en-US': 'Increase hours',
            'hi-IN': 'घंटे बढ़ाएं',
            'mr-IN': 'तास वाढवा'
        },
        decreaseHours: {
            'en-US': 'Decrease hours',
            'hi-IN': 'घंटे घटाएं',
            'mr-IN': 'तास कमी करा'
        },
        increaseMinutes: {
            'en-US': 'Increase minutes',
            'hi-IN': 'मिनट बढ़ाएं',
            'mr-IN': 'मिनिटे वाढवा'
        },
        decreaseMinutes: {
            'en-US': 'Decrease minutes',
            'hi-IN': 'मिनट घटाएं',
            'mr-IN': 'मिनिटे कमी करा'
        },
        selectAm: {
            'en-US': 'Select AM',
            'hi-IN': 'AM चुनें',
            'mr-IN': 'AM निवडा'
        },
        selectPm: {
            'en-US': 'Select PM',
            'hi-IN': 'PM चुनें',
            'mr-IN': 'PM निवडा'
        }
    };

    const t = (key) => copy[key]?.[language] || copy[key]?.['en-US'];

    // Parse initial value
    const parseTime = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return {
            hours: h % 12 || 12,
            minutes: m,
            period: h >= 12 ? 'PM' : 'AM'
        };
    };

    const [time, setTime] = useState(parseTime(value));
    const hoursRef = useRef(null);
    const minutesRef = useRef(null);

    // Convert to 24-hour format for storage
    const get24HourTime = () => {
        let h = time.hours;
        if (time.period === 'PM' && h !== 12) h += 12;
        if (time.period === 'AM' && h === 12) h = 0;
        return `${h.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;
    };

    // Notify parent of changes
    useEffect(() => {
        if (onChange) {
            onChange(get24HourTime());
        }
    }, [time]);

    // Handle hour change
    const changeHour = (delta) => {
        setTime(prev => {
            let newHour = prev.hours + delta;
            if (newHour > 12) newHour = 1;
            if (newHour < 1) newHour = 12;
            return { ...prev, hours: newHour };
        });
    };

    // Handle minute change
    const changeMinute = (delta) => {
        setTime(prev => {
            let newMin = prev.minutes + delta;
            if (newMin >= 60) newMin = 0;
            if (newMin < 0) newMin = 55;
            return { ...prev, minutes: newMin };
        });
    };

    // Toggle AM/PM
    const togglePeriod = () => {
        setTime(prev => ({
            ...prev,
            period: prev.period === 'AM' ? 'PM' : 'AM'
        }));
    };

    // Apply preset
    const applyPreset = (presetTime) => {
        const parsed = parseTime(presetTime);
        setTime(parsed);
    };

    // Handle confirm
    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm(get24HourTime());
        }
    };

    return (
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-premium-lg w-full max-w-md mx-auto">
            {/* Header */}
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 text-center mb-4 sm:mb-6">
                {t('title')}
            </h3>

            {/* Time Wheels */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
                {/* Hours Wheel */}
                <div className="flex flex-col items-center">
                    <motion.button
                        onClick={() => changeHour(1)}
                        className="w-14 sm:w-20 h-10 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl text-primary"
                        whileTap={{ scale: 0.9 }}
                        aria-label={t('increaseHours')}
                    >
                        ▲
                    </motion.button>
                    <div
                        ref={hoursRef}
                        className="w-16 sm:w-24 h-14 sm:h-20 bg-gradient-to-b from-gray-100 to-gray-50 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 border-primary shadow-inner"
                    >
                        <span className="text-3xl sm:text-5xl font-bold text-gray-800">
                            {time.hours.toString().padStart(2, '0')}
                        </span>
                    </div>
                    <motion.button
                        onClick={() => changeHour(-1)}
                        className="w-14 sm:w-20 h-10 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl text-primary"
                        whileTap={{ scale: 0.9 }}
                        aria-label={t('decreaseHours')}
                    >
                        ▼
                    </motion.button>
                </div>

                {/* Separator */}
                <div className="text-3xl sm:text-5xl font-bold text-gray-400 pb-2">:</div>

                {/* Minutes Wheel */}
                <div className="flex flex-col items-center">
                    <motion.button
                        onClick={() => changeMinute(5)}
                        className="w-14 sm:w-20 h-10 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl text-primary"
                        whileTap={{ scale: 0.9 }}
                        aria-label={t('increaseMinutes')}
                    >
                        ▲
                    </motion.button>
                    <div
                        ref={minutesRef}
                        className="w-16 sm:w-24 h-14 sm:h-20 bg-gradient-to-b from-gray-100 to-gray-50 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 border-primary shadow-inner"
                    >
                        <span className="text-3xl sm:text-5xl font-bold text-gray-800">
                            {time.minutes.toString().padStart(2, '0')}
                        </span>
                    </div>
                    <motion.button
                        onClick={() => changeMinute(-5)}
                        className="w-14 sm:w-20 h-10 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl text-primary"
                        whileTap={{ scale: 0.9 }}
                        aria-label={t('decreaseMinutes')}
                    >
                        ▼
                    </motion.button>
                </div>

                {/* AM/PM Toggle */}
                <div className="flex flex-col gap-1 sm:gap-2 ml-1 sm:ml-2">
                    <motion.button
                        onClick={togglePeriod}
                        className={`
                            w-12 sm:w-16 h-10 sm:h-12 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg
                            transition-all duration-200
                            ${time.period === 'AM'
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }
                        `}
                        whileTap={{ scale: 0.95 }}
                        aria-label={t('selectAm')}
                    >
                        AM
                    </motion.button>
                    <motion.button
                        onClick={togglePeriod}
                        className={`
                            w-12 sm:w-16 h-10 sm:h-12 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg
                            transition-all duration-200
                            ${time.period === 'PM'
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }
                        `}
                        whileTap={{ scale: 0.95 }}
                        aria-label={t('selectPm')}
                    >
                        PM
                    </motion.button>
                </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-4 sm:mb-6">
                <p className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-2 sm:mb-3">
                    {t('quickPresets')}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {TIME_PRESETS.map((preset) => (
                        <motion.button
                            key={preset.label}
                            onClick={() => applyPreset(preset.time)}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 bg-gray-50 hover:bg-primary/10 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-primary transition-all"
                            whileTap={{ scale: 0.95 }}
                            aria-label={`Set ${preset.label}`}
                        >
                            <span className="text-xl sm:text-2xl">{preset.icon}</span>
                            <div className="text-left">
                                <div className="font-semibold text-base text-gray-700">{preset.label}</div>
                                <div className="text-sm text-gray-600">
                                    {parseInt(preset.time.split(':')[0]) > 12
                                        ? `${parseInt(preset.time.split(':')[0]) - 12}:00 PM`
                                        : `${parseInt(preset.time.split(':')[0])}:00 AM`
                                    }
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3">
                {onCancel && (
                    <motion.button
                        onClick={onCancel}
                        className="flex-1 py-3 sm:py-4 px-4 sm:px-6 bg-gray-100 text-gray-700 rounded-xl sm:rounded-2xl font-semibold text-base sm:text-lg hover:bg-gray-200 transition-colors"
                        whileTap={{ scale: 0.95 }}
                        aria-label={t('cancel')}
                    >
                        {t('cancel')}
                    </motion.button>
                )}
                <motion.button
                    onClick={handleConfirm}
                    className="flex-1 py-3 sm:py-4 px-4 sm:px-6 bg-primary text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-premium hover:shadow-premium-lg transition-all"
                    whileTap={{ scale: 0.95 }}
                    aria-label={t('setTime')}
                >
                    ✓ {t('setTime')}
                </motion.button>
            </div>
        </div>
    );
};

export default TimePicker;
