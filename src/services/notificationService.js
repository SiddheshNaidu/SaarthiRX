/**
 * Notification Service
 * Handles browser notifications for medication reminders
 */

/**
 * Check if browser supports notifications
 * @returns {boolean}
 */
export const isNotificationSupported = () => {
    return 'Notification' in window;
};

/**
 * Get current notification permission status
 * @returns {string} 'granted' | 'denied' | 'default' | 'unsupported'
 */
export const getNotificationStatus = () => {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
};

/**
 * Request notification permission from user
 * Must be called from a user gesture (click, tap, etc.)
 * @returns {Promise<string>} Permission status
 */
export const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
        console.warn('Browser does not support notifications');
        return 'unsupported';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission result:', permission);
        return permission;
    } catch (error) {
        console.error('Notification permission request failed:', error);
        return 'error';
    }
};

/**
 * Trigger a browser notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {string} reminderId - Optional reminder ID for click handling
 * @param {object} options - Additional notification options
 * @returns {Notification|null}
 */
export const triggerNotification = (title, body, reminderId = null, options = {}) => {
    console.log('Triggering notification:', { title, body, reminderId });

    // Haptic feedback (vibration)
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 300]);
    }

    if (!isNotificationSupported()) {
        console.error('Notifications not supported');
        // Fallback to alert
        alert(`📢 ${title}\n\n${body}`);
        return null;
    }

    if (Notification.permission !== 'granted') {
        console.error('Notification permission not granted:', Notification.permission);
        alert(`📢 ${title}\n\n${body}`);
        return null;
    }

    try {
        const notification = new Notification(title, {
            body,
            icon: '/logo.png',
            badge: '/logo.png',
            requireInteraction: true,
            tag: `medication-reminder-${reminderId || Date.now()}`,
            silent: false,
            ...options
        });

        // Handle notification click
        notification.onclick = () => {
            window.focus();
            notification.close();

            // Navigate to reminder alert page if reminderId provided
            if (reminderId) {
                window.location.href = `/reminder/alert/${reminderId}`;
            }
        };

        // Auto-close after 30 seconds
        setTimeout(() => notification.close(), 30000);

        console.log('Notification created successfully');
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        alert(`📢 ${title}\n\n${body}`);
        return null;
    }
};

/**
 * Send a test notification to verify setup
 * @returns {Notification|null}
 */
export const sendTestNotification = () => {
    return triggerNotification(
        '🔔 SaarthiRx Notifications Enabled!',
        'You will now receive medication reminders.'
    );
};
