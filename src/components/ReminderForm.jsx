import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TimePicker from './TimePicker';
import { PILL_COLORS, DAYS_OF_WEEK } from '../services/reminderService';
import { useApp } from '../context/AppContext';

/**
 * ReminderForm - Modal form for adding/editing reminders
 */
const ReminderForm = ({ isOpen, onClose, onSave, reminder = null }) => {
    const { language } = useApp();
    const isEditing = !!reminder;

    // Form state
    const [formData, setFormData] = useState({
        medicineName: '',
        description: '',
        color: PILL_COLORS[0].value,
        time: '08:00',
        repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        enabled: true
    });

    const [showTimePicker, setShowTimePicker] = useState(false);

    // Labels
    const labels = {
        'en-US': {
            title: isEditing ? 'Edit Reminder' : 'Add Reminder',
            medicineName: 'Medicine Name',
            description: 'Description (optional)',
            color: 'Pill Color',
            time: 'Reminder Time',
            repeatDays: 'Repeat Days',
            everyday: 'Every Day',
            save: isEditing ? 'Update Reminder' : 'Add Reminder',
            cancel: 'Cancel',
            placeholder: 'e.g. Amlodipine 5mg',
            descPlaceholder: 'e.g. blue round tablet'
        },
        'hi-IN': {
            title: isEditing ? 'रिमाइंडर संपादित करें' : 'रिमाइंडर जोड़ें',
            medicineName: 'दवा का नाम',
            description: 'विवरण (वैकल्पिक)',
            color: 'गोली का रंग',
            time: 'रिमाइंडर समय',
            repeatDays: 'दोहराने के दिन',
            everyday: 'हर दिन',
            save: isEditing ? 'अपडेट करें' : 'जोड़ें',
            cancel: 'रद्द करें',
            placeholder: 'जैसे: एम्लोडिपिन 5mg',
            descPlaceholder: 'जैसे: नीली गोल गोली'
        },
        'mr-IN': {
            title: isEditing ? 'रिमाइंडर संपादित करा' : 'रिमाइंडर जोडा',
            medicineName: 'औषधाचे नाव',
            description: 'वर्णन (पर्यायी)',
            color: 'गोळीचा रंग',
            time: 'रिमाइंडर वेळ',
            repeatDays: 'पुनरावृत्तीचे दिवस',
            everyday: 'दररोज',
            save: isEditing ? 'अपडेट करा' : 'जोडा',
            cancel: 'रद्द करा',
            placeholder: 'उदा: अम्लोडिपिन 5mg',
            descPlaceholder: 'उदा: निळी गोल गोळी'
        }
    };

    const t = labels[language] || labels['en-US'];

    // Initialize form when editing
    useEffect(() => {
        if (reminder) {
            setFormData({
                medicineName: reminder.medicineName || '',
                description: reminder.description || '',
                color: reminder.color || PILL_COLORS[0].value,
                time: reminder.time || '08:00',
                repeatDays: reminder.repeatDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                enabled: reminder.enabled !== undefined ? reminder.enabled : true
            });
        } else {
            // Reset for new reminder
            setFormData({
                medicineName: '',
                description: '',
                color: PILL_COLORS[0].value,
                time: '08:00',
                repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                enabled: true
            });
        }
    }, [reminder, isOpen]);

    // Handle day toggle
    const toggleDay = (day) => {
        setFormData(prev => {
            const days = prev.repeatDays.includes(day)
                ? prev.repeatDays.filter(d => d !== day)
                : [...prev.repeatDays, day];
            return { ...prev, repeatDays: days };
        });
    };

    // Toggle all days
    const toggleAllDays = () => {
        const allDays = DAYS_OF_WEEK.map(d => d.short);
        setFormData(prev => ({
            ...prev,
            repeatDays: prev.repeatDays.length === 7 ? [] : allDays
        }));
    };

    // Handle save
    const handleSave = () => {
        if (!formData.medicineName.trim()) {
            // Basic validation - require medicine name
            return;
        }
        onSave(formData);
        onClose();
    };

    // Format time for display
    const formatTimeDisplay = (time) => {
        const [h, m] = time.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-100 rounded-t-3xl">
                        <h2 className="text-2xl font-bold text-gray-800">{t.title}</h2>
                    </div>

                    {/* Form Content */}
                    <div className="p-6 space-y-6">
                        {/* Medicine Name */}
                        <div>
                            <label className="block text-lg font-semibold text-gray-700 mb-2">
                                {t.medicineName} *
                            </label>
                            <input
                                type="text"
                                value={formData.medicineName}
                                onChange={(e) => setFormData(prev => ({ ...prev, medicineName: e.target.value }))}
                                placeholder={t.placeholder}
                                className="w-full p-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-lg font-semibold text-gray-700 mb-2">
                                {t.description}
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t.descPlaceholder}
                                className="w-full p-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Pill Color - Only show when adding new reminder */}
                        {!isEditing && (
                            <div>
                                <label className="block text-lg font-semibold text-gray-700 mb-3">
                                    {t.color}
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {PILL_COLORS.map((color) => (
                                        <motion.button
                                            key={color.value}
                                            onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                                            className={`
                                                w-12 h-12 rounded-full border-4 transition-all
                                                ${formData.color === color.value
                                                    ? 'border-primary scale-110 shadow-lg'
                                                    : 'border-transparent hover:scale-105'
                                                }
                                            `}
                                            style={{ backgroundColor: color.value }}
                                            whileTap={{ scale: 0.9 }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Time Picker */}
                        <div>
                            <label className="block text-lg font-semibold text-gray-700 mb-3">
                                {t.time}
                            </label>
                            {showTimePicker ? (
                                <TimePicker
                                    value={formData.time}
                                    onChange={(time) => setFormData(prev => ({ ...prev, time }))}
                                    onConfirm={(time) => {
                                        setFormData(prev => ({ ...prev, time }));
                                        setShowTimePicker(false);
                                    }}
                                    onCancel={() => setShowTimePicker(false)}
                                />
                            ) : (
                                <motion.button
                                    onClick={() => setShowTimePicker(true)}
                                    className="w-full p-5 bg-gray-50 border-2 border-gray-200 rounded-2xl flex items-center justify-between hover:border-primary transition-colors"
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <span className="text-3xl">⏰</span>
                                    <span className="text-2xl font-bold text-gray-800">
                                        {formatTimeDisplay(formData.time)}
                                    </span>
                                    <span className="text-gray-400 text-xl">✎</span>
                                </motion.button>
                            )}
                        </div>

                        {/* Repeat Days */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-lg font-semibold text-gray-700">
                                    {t.repeatDays}
                                </label>
                                <motion.button
                                    onClick={toggleAllDays}
                                    className={`
                                        px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                                        ${formData.repeatDays.length === 7
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }
                                    `}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {t.everyday}
                                </motion.button>
                            </div>
                            <div className="flex justify-between">
                                {DAYS_OF_WEEK.map((day) => (
                                    <motion.button
                                        key={day.short}
                                        onClick={() => toggleDay(day.short)}
                                        className={`
                                            w-11 h-11 rounded-xl font-semibold text-sm transition-all
                                            ${formData.repeatDays.includes(day.short)
                                                ? 'bg-primary text-white shadow-md'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }
                                        `}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        {day.short.charAt(0)}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 bg-white p-6 pt-4 border-t border-gray-100 flex gap-3">
                        <motion.button
                            onClick={onClose}
                            className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-200 transition-colors"
                            whileTap={{ scale: 0.95 }}
                        >
                            {t.cancel}
                        </motion.button>
                        <motion.button
                            onClick={handleSave}
                            disabled={!formData.medicineName.trim()}
                            className={`
                                flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all
                                ${formData.medicineName.trim()
                                    ? 'bg-primary text-white shadow-premium hover:shadow-premium-lg'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }
                            `}
                            whileTap={{ scale: formData.medicineName.trim() ? 0.95 : 1 }}
                        >
                            {t.save}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ReminderForm;
