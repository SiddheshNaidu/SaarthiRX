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
    getTimePeriod
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
            addNew: 'Add Reminder',
            empty: 'No reminders yet',
            emptyHint: 'Tap the button below to add your first reminder',
            everyday: 'Every day',
            deleteTitle: 'Delete Reminder?',
            deleteConfirm: 'Delete',
            cancel: 'Cancel',
            enabled: 'On',
            disabled: 'Off'
        },
        'hi-IN': {
            title: 'मेरे रिमाइंडर',
            subtitle: 'अपना दवा शेड्यूल प्रबंधित करें',
            addNew: 'रिमाइंडर जोड़ें',
            empty: 'अभी कोई रिमाइंडर नहीं',
            emptyHint: 'अपना पहला रिमाइंडर जोड़ने के लिए नीचे बटन दबाएं',
            everyday: 'हर दिन',
            deleteTitle: 'रिमाइंडर हटाएं?',
            deleteConfirm: 'हटाएं',
            cancel: 'रद्द करें',
            enabled: 'चालू',
            disabled: 'बंद'
        },
        'mr-IN': {
            title: 'माझे रिमाइंडर',
            subtitle: 'तुमचे औषध वेळापत्रक व्यवस्थापित करा',
            addNew: 'रिमाइंडर जोडा',
            empty: 'अद्याप कोणतेही रिमाइंडर नाहीत',
            emptyHint: 'तुमचा पहिला रिमाइंडर जोडण्यासाठी खालील बटण दाबा',
            everyday: 'दररोज',
            deleteTitle: 'रिमाइंडर हटवायचा?',
            deleteConfirm: 'हटवा',
            cancel: 'रद्द करा',
            enabled: 'चालू',
            disabled: 'बंद'
        }
    };

    const t = labels[language] || labels['en-US'];

    // Load reminders function - defined before useEffect that uses it
    const loadReminders = () => {
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
            className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-6 pt-8 pb-10 rounded-b-3xl shadow-premium-lg">
                <motion.button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="text-2xl">←</span>
                    <span className="text-lg">Back</span>
                </motion.button>
                <h1 className="text-4xl font-display font-bold mb-2">{t.title}</h1>
                <p className="text-lg text-white/80">{t.subtitle}</p>
            </div>

            {/* Notification Permission Banner */}
            {notificationStatus === 'default' && (
                <motion.div
                    className="mx-6 mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🔔</span>
                        <div className="flex-1">
                            <p className="font-semibold text-blue-800">Enable Notifications</p>
                            <p className="text-sm text-blue-600">Get reminded when it's time to take your medicine</p>
                        </div>
                        <motion.button
                            onClick={handleEnableNotifications}
                            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-xl"
                            whileTap={{ scale: 0.95 }}
                        >
                            Enable
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* Notification Status Indicator */}
            {notificationStatus === 'granted' && (
                <div className="mx-6 mt-4 flex items-center gap-2 text-green-600 text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Notifications enabled - you'll be reminded automatically
                </div>
            )}

            {notificationStatus === 'denied' && (
                <motion.div
                    className="mx-6 mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <p className="text-sm text-red-700">
                            Notifications are blocked. Please enable them in your browser settings to receive reminders.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Content */}
            <div className="flex-1 p-6 -mt-4">
                {reminders.length === 0 ? (
                    /* Empty State */
                    <motion.div
                        className="flex flex-col items-center justify-center py-16 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="text-8xl mb-6">💊</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t.empty}</h2>
                        <p className="text-gray-500 max-w-xs">{t.emptyHint}</p>
                    </motion.div>
                ) : (
                    /* Reminder Cards */
                    <div className="space-y-3">
                        {reminders.map((reminder, index) => (
                            <motion.div
                                key={reminder.id}
                                className="bg-white rounded-2xl p-3 sm:p-5 shadow-md border border-gray-100 relative overflow-hidden"
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
                                        <h3 className="text-base sm:text-xl font-bold text-gray-800 truncate">
                                            {reminder.medicineName}
                                        </h3>
                                        <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                                            <span className="text-sm sm:text-lg text-primary font-semibold">
                                                {formatTime(reminder.time)}
                                            </span>
                                            <span className="text-gray-400 text-xs sm:text-base">•</span>
                                            <span className="text-gray-500 text-xs sm:text-base">
                                                {getTimePeriod(reminder.time)}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
                                            {formatDays(reminder.repeatDays)}
                                        </p>
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
                                        >
                                            <motion.div
                                                className="w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full shadow-md"
                                                animate={{ x: reminder.enabled ? (window.innerWidth < 640 ? 20 : 28) : 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        </motion.button>

                                        {/* Delete Button */}
                                        <motion.button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirm(reminder);
                                            }}
                                            className="text-red-400 hover:text-red-600 p-1 sm:p-2 text-sm sm:text-base"
                                            whileTap={{ scale: 0.9 }}
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
                className="fixed bottom-32 inset-x-0 mx-auto w-fit bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-full font-medium shadow-md flex items-center gap-2 z-40"
                whileTap={{ scale: 0.97 }}
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
                            className="bg-white rounded-3xl p-6 max-w-sm w-full"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">
                                {t.deleteTitle}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {deleteConfirm.medicineName}
                            </p>
                            <div className="flex gap-3">
                                <motion.button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold"
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
            <DualActionButtons onRepeat={() => announce(t.title)} />
        </motion.div>
    );
};

export default ReminderList;
