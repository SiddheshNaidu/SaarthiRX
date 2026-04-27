import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import {
    getReminders,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    formatTime,
    getTimePeriod,
    cleanExpiredReminders,
    getRemainingDays
} from '../services/reminderService';
import {
    getNotificationStatus,
    requestNotificationPermission,
    sendTestNotification
} from '../services/notificationService';
import ReminderForm from '../components/ReminderForm';
import DualActionButtons from '../components/DualActionButtons';

import { triggerAction, triggerSuccess } from '../utils/haptics';

/**
 * ReminderList - Main reminder management page
 */
const ReminderList = () => {
    const navigate = useNavigate();
    const { language } = useApp();
    const { announce } = useVoiceButler();

    const [reminders, setReminders] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [notificationStatus, setNotificationStatus] = useState('default');

    const hasAnnounced = useRef(false);

    // Labels
    const labels = {
        'en-US': {
            title: 'My Reminders',
            subtitle: 'Manage your medication schedule',
            back: 'Back',
            addNew: 'Add Reminder',
            empty: 'No reminders yet',
            emptyHint: 'Tap the button below to add your first reminder',
            everyday: 'Every day',
            enableNotificationsTitle: 'Enable Notifications',
            enableNotificationsDesc: "Get reminded when it's time to take your medicine",
            enableButton: 'Enable',
            notificationsEnabled: "Notifications enabled - you'll be reminded automatically",
            notificationsBlocked: 'Notifications are blocked. Please enable them in your browser settings to receive reminders.',
            deleteTitle: 'Delete Reminder?',
            deleteConfirm: 'Delete',
            cancel: 'Cancel',
            enabled: 'On',
            disabled: 'Off',
            daysLeft: 'days left',
            dayLeft: 'day left',
            ongoing: 'Ongoing',
            courseComplete: 'Course complete ✅'
        },
        'hi-IN': {
            title: 'मेरे रिमाइंडर',
            subtitle: 'अपना दवा शेड्यूल प्रबंधित करें',
            back: 'वापस',
            addNew: 'रिमाइंडर जोड़ें',
            empty: 'अभी कोई रिमाइंडर नहीं',
            emptyHint: 'अपना पहला रिमाइंडर जोड़ने के लिए नीचे बटन दबाएं',
            everyday: 'हर दिन',
            enableNotificationsTitle: 'सूचनाएं चालू करें',
            enableNotificationsDesc: 'दवाई लेने का समय होने पर आपको याद दिलाया जाएगा',
            enableButton: 'चालू करें',
            notificationsEnabled: 'सूचनाएं चालू हैं - आपको समय पर याद दिलाया जाएगा',
            notificationsBlocked: 'सूचनाएं बंद हैं। रिमाइंडर पाने के लिए ब्राउज़र सेटिंग में इन्हें चालू करें।',
            deleteTitle: 'रिमाइंडर हटाएं?',
            deleteConfirm: 'हटाएं',
            cancel: 'रद्द करें',
            enabled: 'चालू',
            disabled: 'बंद',
            daysLeft: 'दिन बाकी',
            dayLeft: 'दिन बाकी',
            ongoing: 'चालू',
            courseComplete: 'कोर्स पूरा ✅'
        },
        'mr-IN': {
            title: 'माझे रिमाइंडर',
            subtitle: 'तुमचे औषध वेळापत्रक व्यवस्थापित करा',
            back: 'मागे',
            addNew: 'रिमाइंडर जोडा',
            empty: 'अद्याप कोणतेही रिमाइंडर नाहीत',
            emptyHint: 'तुमचा पहिला रिमाइंडर जोडण्यासाठी खालील बटण दाबा',
            everyday: 'दररोज',
            enableNotificationsTitle: 'सूचना चालू करा',
            enableNotificationsDesc: 'औषध घेण्याची वेळ झाली की तुम्हाला आठवण दिली जाईल',
            enableButton: 'चालू करा',
            notificationsEnabled: 'सूचना चालू आहेत - तुम्हाला आपोआप आठवण दिली जाईल',
            notificationsBlocked: 'सूचना बंद आहेत. रिमाइंडर मिळवण्यासाठी ब्राउझर सेटिंगमध्ये त्या चालू करा.',
            deleteTitle: 'रिमाइंडर हटवायचा?',
            deleteConfirm: 'हटवा',
            cancel: 'रद्द करा',
            enabled: 'चालू',
            disabled: 'बंद',
            daysLeft: 'दिवस बाकी',
            dayLeft: 'दिवस बाकी',
            ongoing: 'चालू',
            courseComplete: 'कोर्स पूर्ण ✅'
        }
    };

    const t = labels[language] || labels['en-US'];

    // Load reminders function - defined before useEffect that uses it
    const loadReminders = () => {
        // Auto-expire finished medicine courses before loading
        cleanExpiredReminders();
        const data = getReminders();
        // Sort by time
        data.sort((a, b) => a.time.localeCompare(b.time));
        setReminders(data);
    };

    // Load reminders and check notification status on mount
    useEffect(() => {
        loadReminders();
        setNotificationStatus(getNotificationStatus());
    }, []);

    // Announce page
    useEffect(() => {
        if (!hasAnnounced.current) {
            hasAnnounced.current = true;
            announce(t.title);
        }
    }, [announce, t.title]);

    // Handle enabling notifications
    const handleEnableNotifications = async () => {
        triggerAction();
        const status = await requestNotificationPermission();
        setNotificationStatus(status);
        if (status === 'granted') {
            triggerSuccess();
            sendTestNotification();
        }
    };

    // Handle add
    const handleAdd = () => {
        triggerAction();
        setEditingReminder(null);
        setIsFormOpen(true);
    };

    // Handle edit
    const handleEdit = (reminder) => {
        triggerAction();
        setEditingReminder(reminder);
        setIsFormOpen(true);
    };

    // Handle save (add or update)
    const handleSave = (formData) => {
        if (editingReminder) {
            updateReminder(editingReminder.id, formData);
        } else {
            addReminder(formData);
        }
        triggerSuccess();
        loadReminders();
    };

    // Handle toggle
    const handleToggle = (id) => {
        triggerAction();
        toggleReminder(id);
        loadReminders();
    };

    // Handle delete
    const handleDelete = (id) => {
        deleteReminder(id);
        triggerSuccess();
        setDeleteConfirm(null);
        loadReminders();
    };

    // Format days display
    const formatDays = (days) => {
        if (days.length === 7) return t.everyday;
        return days.join(', ');
    };

    return (
        <motion.div
            className="min-h-[100dvh] bg-gradient-to-b from-orange-50 to-amber-50 flex flex-col relative overflow-hidden pb-44"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white p-6 pt-8 max-h-min pb-10 rounded-b-3xl shadow-xl relative z-10">
                <motion.button
                    onClick={() => navigate('/dashboard')}
                    className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 text-white/80 hover:text-white mb-6"
                    whileTap={{ scale: 0.95 }}
                    aria-label={t.back}
                >
                    <span className="text-2xl">←</span>
                </motion.button>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">{t.title}</h1>
                <p className="text-base sm:text-lg text-white/80 font-medium">{t.subtitle}</p>
            </div>

            {/* Notification Permission Banner */}
            {notificationStatus === 'default' && (
                <motion.div
                    className="mx-6 mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl relative z-10 backdrop-blur-md"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🔔</span>
                        <div className="flex-1">
                            <p className="font-semibold text-blue-400 text-lg tracking-tight">{t.enableNotificationsTitle}</p>
                            <p className="text-base text-blue-100/70 font-medium">{t.enableNotificationsDesc}</p>
                        </div>
                        <motion.button
                            onClick={handleEnableNotifications}
                            className="px-4 py-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 font-semibold rounded-xl text-base"
                            whileTap={{ scale: 0.95 }}
                            aria-label={t.enableButton}
                        >
                            {t.enableButton}
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* Notification Status Indicator */}
            {notificationStatus === 'granted' && (
                <div className="mx-6 mt-4 flex items-center gap-2 text-green-400 text-base font-medium relative z-10">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    {t.notificationsEnabled}
                </div>
            )}

            {notificationStatus === 'denied' && (
                <motion.div
                    className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative z-10 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <p className="text-base text-red-400 font-medium">
                            {t.notificationsBlocked}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Content */}
            <div className="flex-1 p-6 z-0 relative">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
                {reminders.length === 0 ? (
                    /* Empty State */
                    <motion.div
                        className="flex flex-col items-center justify-center py-16 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="w-32 h-32 mx-auto bg-orange-100 rounded-full flex items-center justify-center border border-orange-200 mb-6 shadow-inner">
                            <span className="text-6xl drop-shadow-lg">💊</span>
                        </div>
                        <h2 className="text-2xl font-bold text-orange-800 mb-2 tracking-tight">{t.empty}</h2>
                        <p className="text-orange-600/70 font-medium max-w-xs text-lg">{t.emptyHint}</p>
                    </motion.div>
                ) : (
                    /* Reminder Cards */
                    <div className="space-y-3">
                        {reminders.map((reminder, index) => (
                            <motion.div
                                key={reminder.id}
                                className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-md border border-orange-100 relative overflow-hidden"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1, duration: 0.3 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleEdit(reminder)}
                            >
                                {/* Color Bar */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1.5 sm:w-2"
                                    style={{ backgroundColor: reminder.color }}
                                />

                                <div className="flex items-start gap-2 sm:gap-4 pl-2 sm:pl-3">
                                    {/* Pill Icon - Smaller on mobile */}
                                    <div
                                        className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 shadow-inner"
                                        style={{ backgroundColor: reminder.color + '20' }}
                                    >
                                        <div
                                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                                            style={{ backgroundColor: reminder.color }}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base sm:text-xl font-bold text-orange-900 truncate">
                                            {reminder.medicineName}
                                        </h3>
                                        <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                                            <span className="text-lg text-primary font-semibold">
                                                {formatTime(reminder.time)}
                                            </span>
                                            <span className="text-orange-300 text-base">•</span>
                                            <span className="text-orange-700/60 text-base">
                                                {getTimePeriod(reminder.time)}
                                            </span>
                                        </div>
                                        <p className="text-base text-orange-700/60 mt-1">
                                            {formatDays(reminder.repeatDays)}
                                        </p>
                                        {/* Duration Badge */}
                                        {(() => {
                                            const duration = getRemainingDays(reminder);
                                            if (duration.isExpired) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm font-medium">
                                                        {t.courseComplete}
                                                    </span>
                                                );
                                            } else if (duration.remaining !== null) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm font-medium">
                                                        ⏳ {duration.remaining} {duration.remaining === 1 ? t.dayLeft : t.daysLeft}
                                                    </span>
                                                );
                                            } else {
                                                return (
                                                    <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm font-medium">
                                                        🔄 {t.ongoing}
                                                    </span>
                                                );
                                            }
                                        })()}
                                    </div>

                                    {/* Toggle & Actions */}
                                    <div className="flex flex-col items-end gap-1 sm:gap-2">
                                        {/* Toggle Switch - Smaller on mobile */}
                                        <motion.button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggle(reminder.id);
                                            }}
                                            className={`
                                                w-12 h-7 sm:w-16 sm:h-9 rounded-full p-0.5 sm:p-1 transition-colors
                                                ${reminder.enabled
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-300'
                                                }
                                            `}
                                            whileTap={{ scale: 0.95 }}
                                            aria-label={`${reminder.enabled ? t.enabled : t.disabled} ${reminder.medicineName}`}
                                        >
                                            <motion.div
                                                className="w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full shadow-md"
                                                animate={{ x: reminder.enabled ? (window.innerWidth < 640 ? 20 : 28) : 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        </motion.button>

                                        {/* Delete Button - Larger Touch Target */}
                                        <motion.button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirm(reminder);
                                            }}
                                            className="text-red-400 hover:text-red-300 min-w-[48px] min-h-[48px] p-3 sm:p-4 text-xl sm:text-2xl hover:bg-red-500/10 rounded-xl transition-colors mt-2 flex items-center justify-center"
                                            whileTap={{ scale: 0.9 }}
                                            aria-label={`${t.deleteConfirm} ${reminder.medicineName}`}
                                        >
                                            🗑️
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Button - Above Mic, Centered, Simple */}
            <motion.button
                onClick={handleAdd}
                className="fixed bottom-48 inset-x-0 mx-auto w-fit bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-4 rounded-full font-bold text-lg shadow-[0_10px_40px_rgba(37,99,235,0.3)] flex items-center gap-2 z-40 border border-white/10"
                whileTap={{ scale: 0.97 }}
                aria-label={t.addNew}
            >
                <span>+</span>
                <span>{t.addNew}</span>
            </motion.button>

            {/* Reminder Form Modal */}
            <ReminderForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingReminder(null);
                }}
                onSave={handleSave}
                reminder={editingReminder}
            />

            {/* Delete Confirmation */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            className="bg-white/95 border border-orange-100 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-bold text-orange-900 mb-4">
                                {t.deleteTitle}
                            </h3>
                            <p className="text-orange-700 font-medium mb-6">
                                {deleteConfirm.medicineName}
                            </p>
                            <div className="flex gap-3">
                                <motion.button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-3 px-4 bg-orange-100 text-orange-800 border border-orange-200 rounded-xl font-semibold"
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {t.cancel}
                                </motion.button>
                                <motion.button
                                    onClick={() => handleDelete(deleteConfirm.id)}
                                    className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-semibold"
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {t.deleteConfirm}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Speaker + Mic Dual Action Buttons */}
            <DualActionButtons />
        </motion.div>
    );
};

export default ReminderList;
