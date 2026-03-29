import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReminders, getRemindersForTime } from '../services/reminderService';
import { triggerNotification, getNotificationStatus } from '../services/notificationService';

/**
 * Storage key for tracking which reminders have fired today
 */
const FIRED_REMINDERS_KEY = 'saarthirx_fired_reminders';

/**
 * Get today's date as a string key
 */
const getTodayKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

/**
 * Get the set of reminder IDs that have already fired today
 */
const getFiredReminders = () => {
    try {
        const data = localStorage.getItem(FIRED_REMINDERS_KEY);
        if (!data) return { date: getTodayKey(), ids: [] };

        const parsed = JSON.parse(data);
        // Reset if it's a new day
        if (parsed.date !== getTodayKey()) {
            return { date: getTodayKey(), ids: [] };
        }
        return parsed;
    } catch {
        return { date: getTodayKey(), ids: [] };
    }
};

/**
 * Mark a reminder as fired for today
 */
const markReminderFired = (reminderId) => {
    const fired = getFiredReminders();
    if (!fired.ids.includes(reminderId)) {
        fired.ids.push(reminderId);
    }
    localStorage.setItem(FIRED_REMINDERS_KEY, JSON.stringify(fired));
};

/**
 * Check if a reminder has already fired today
 */
const hasReminderFired = (reminderId) => {
    const fired = getFiredReminders();
    return fired.ids.includes(reminderId);
};

/**
 * Custom hook that runs a background scheduler to check reminder times
 * and trigger notifications when it's time to take medicine
 * 
 * @param {boolean} enabled - Whether the scheduler should run
 */
export const useReminderScheduler = (enabled = true) => {
    const navigate = useNavigate();
    const intervalRef = useRef(null);
    const lastCheckedMinute = useRef(null);

    /**
     * Get current time in HH:MM format
     */
    const getCurrentTime = useCallback(() => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }, []);

    /**
     * Check for reminders that should fire now
     */
    const checkReminders = useCallback(() => {
        const currentTime = getCurrentTime();

        // Only check once per minute
        if (lastCheckedMinute.current === currentTime) {
            return;
        }
        lastCheckedMinute.current = currentTime;

        console.log(`⏰ Checking reminders at ${currentTime}`);

        // Get reminders that match current time and day
        const matchingReminders = getRemindersForTime(currentTime);

        if (matchingReminders.length === 0) {
            return;
        }

        console.log(`🔔 Found ${matchingReminders.length} reminder(s) for ${currentTime}`);

        // Fire notifications for each matching reminder (that hasn't fired today)
        matchingReminders.forEach((reminder) => {
            if (hasReminderFired(reminder.id)) {
                console.log(`⏭️ Reminder ${reminder.id} already fired today, skipping`);
                return;
            }

            // Mark as fired first to prevent duplicates
            markReminderFired(reminder.id);

            console.log(`🚀 Triggering notification for: ${reminder.medicineName}`);

            // Trigger browser notification
            const notification = triggerNotification(
                '💊 Medicine Time!',
                `It's time to take your ${reminder.medicineName}`,
                reminder.id
            );

            // If notification clicked, it will navigate via the notification service
            // Also navigate immediately if the tab is focused
            if (document.hasFocus()) {
                setTimeout(() => {
                    navigate(`/reminder/alert/${reminder.id}`);
                }, 500);
            }
        });
    }, [getCurrentTime, navigate]);

    /**
     * Start the scheduler
     */
    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        console.log('🚀 Reminder scheduler started');

        // Check immediately on mount
        checkReminders();

        // Check every 10 seconds (to ensure we catch the exact minute)
        intervalRef.current = setInterval(checkReminders, 10000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            console.log('⏹️ Reminder scheduler stopped');
        };
    }, [enabled, checkReminders]);

    return {
        notificationStatus: getNotificationStatus(),
        checkReminders
    };
};

export default useReminderScheduler;
