/**
 * Browser Notification Utility
 * Serverless notification system using Web Notifications API
 * For elderly-friendly medication reminders without backend
 */

/**
 * Request notification permission gracefully
 * @returns {Promise<boolean>} Whether permission was granted
 */
export const requestNotificationPermission = async () => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

    // Already granted
    if (Notification.permission === 'granted') {
        return true;
    }

    // Already denied - can't ask again
    if (Notification.permission === 'denied') {
        console.warn('Notification permission was denied');
        return false;
    }

    // Request permission
    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
};

/**
 * Trigger a browser notification with optional vibration
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} options - Additional options
 * @returns {Notification|null} The notification object or null if failed
 */
export const triggerBrowserNotification = (title, body, options = {}) => {
    // Check permission
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.warn('Notifications not available or not permitted');
        return null;
    }

    try {
        const notification = new Notification(title, {
            body,
            icon: '/pill-icon.png', // Will fallback gracefully if not present
            badge: '/badge-icon.png',
            tag: options.tag || 'medication-reminder',
            renotify: options.renotify || true,
            requireInteraction: options.requireInteraction ?? true, // Keep visible until clicked
            silent: options.silent || false,
            vibrate: options.vibrate || [200, 100, 200, 100, 200], // Vibration pattern
            ...options
        });

        // Handle click - navigate to app
        notification.onclick = () => {
            window.focus();
            notification.close();
            if (options.onClick) {
                options.onClick();
            }
        };

        // Auto-close after 30 seconds if not interacted
        if (options.autoClose !== false) {
            setTimeout(() => {
                notification.close();
            }, options.autoCloseTime || 30000);
        }

        // Trigger device vibration if supported
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        return notification;

    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

/**
 * Schedule a reminder notification (for demo simulation)
 * @param {string} medicineName - Medicine name
 * @param {number} delayMs - Delay in milliseconds before firing
 * @param {string} language - Language code
 * @returns {number} Timeout ID for cancellation
 */
export const scheduleReminderNotification = (medicineName, delayMs, language = 'en-US') => {
    const titles = {
        'en-US': 'Medicine Reminder',
        'hi-IN': 'दवा की याद',
        'mr-IN': 'औषधाची आठवण'
    };

    const bodies = {
        'en-US': `Time to take ${medicineName}. Please don't forget!`,
        'hi-IN': `${medicineName} लेने का समय। कृपया न भूलें!`,
        'mr-IN': `${medicineName} घेण्याची वेळ. कृपया विसरू नका!`
    };

    const timeoutId = setTimeout(() => {
        triggerBrowserNotification(
            titles[language] || titles['en-US'],
            bodies[language] || bodies['en-US'],
            { tag: `reminder-${medicineName}` }
        );
    }, delayMs);

    return timeoutId;
};

/**
 * Trigger "missed dose" notification after timeout
 * Deep-links to ReminderAlert page on click (same tab)
 * @param {object} medicine - Medicine object with name, visualDescription, visualColor, id
 * @param {string} language - Language code
 * @param {string} scheduledTime - ISO timestamp of when reminder was scheduled (for stale detection)
 */
export const triggerMissedDoseNotification = (medicine, language = 'en-US', scheduledTime = null) => {
    // Handle both string (name only) and object (full medicine)
    const medicineName = typeof medicine === 'string' ? medicine : medicine.name;
    const visualDesc = typeof medicine === 'object' 
        ? (medicine.visualDescription || `${medicine.visualColor || 'blue'} tablet`)
        : 'your medicine';
    const medicineId = typeof medicine === 'object' ? medicine.id : null;

    const titles = {
        'en-US': '💊 Medicine Time!',
        'hi-IN': '💊 दवा का समय!',
        'mr-IN': '💊 औषधाची वेळ!'
    };

    const bodies = {
        'en-US': `Time for ${medicineName} (${visualDesc}). Tap to respond.`,
        'hi-IN': `${medicineName} (${visualDesc}) लेने का समय। टैप करें।`,
        'mr-IN': `${medicineName} (${visualDesc}) घेण्याची वेळ. टॅप करा.`
    };

    return triggerBrowserNotification(
        titles[language] || titles['en-US'],
        bodies[language] || bodies['en-US'],
        { 
            tag: `alarm-${medicineName}`,
            requireInteraction: true,
            onClick: () => {
                // Navigate to ReminderAlert page in the same tab (not a new tab)
                const alertUrl = medicineId 
                    ? `/reminder/alert/${medicineId}${scheduledTime ? `?scheduled=${encodeURIComponent(scheduledTime)}` : ''}`
                    : '/reminder/alert';
                
                // Focus the existing window/tab and navigate
                window.focus();
                window.location.href = alertUrl;
            }
        }
    );
};


export default {
    requestNotificationPermission,
    triggerBrowserNotification,
    scheduleReminderNotification,
    triggerMissedDoseNotification
};

/**
 * TEST FUNCTION: Instantly fire a test notification
 * Call from browser console: testNotification()
 */
export const testNotification = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
        console.error('❌ Notification permission denied. Please allow notifications.');
        return;
    }
    
    // Get first medicine from localStorage or use demo
    const medicines = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
    const testMedicine = medicines[0] || {
        id: 'test-1',
        name: 'Paracetamol',
        visualDescription: 'yellow round tablet',
        visualColor: 'yellow'
    };
    
    console.log('🔔 Sending test notification for:', testMedicine.name);
    
    triggerMissedDoseNotification(testMedicine, 'en-US');
    
    return '✅ Notification sent! Check your system notifications.';
};

// Expose to window for console access
if (typeof window !== 'undefined') {
    window.testNotification = testNotification;
}
