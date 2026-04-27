/**
 * Reminder Service
 * Manages medication reminders with localStorage persistence
 */

const STORAGE_KEY = 'saarthirx_reminders';

/**
 * Generate a unique ID for reminders
 */
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 2: SILENT SCHEDULER - Time Normalization Utility
 * Converts time string to ISO timestamp for proper alarm scheduling
 * ═══════════════════════════════════════════════════════════════════════
 * @param {string} timeString - Time string like "09:00" or "Morning"
 * @returns {Date} JavaScript Date object for next occurrence
 */
export const parseTimingToISO = (timeString) => {
    const now = new Date();
    let hours = 9, minutes = 0;

    // Parse based on keywords
    const lower = (timeString || '').toLowerCase();
    if (lower.includes('morning') || lower === '09:00') {
        hours = 9; minutes = 0;
    } else if (lower.includes('afternoon') || lower === '14:00') {
        hours = 14; minutes = 0;
    } else if (lower.includes('evening') || lower === '18:00') {
        hours = 18; minutes = 0;
    } else if (lower.includes('night') || lower === '21:00') {
        hours = 21; minutes = 0;
    } else if (timeString?.includes(':')) {
        // Parse "HH:MM" format
        const [h, m] = timeString.split(':').map(Number);
        hours = h || 9;
        minutes = m || 0;
    }

    // Create date for today at that time
    const fireTime = new Date(now);
    fireTime.setHours(hours, minutes, 0, 0);

    // If time has already passed today, schedule for tomorrow
    if (fireTime <= now) {
        fireTime.setDate(fireTime.getDate() + 1);
    }

    return fireTime;
};

/**
 * Get all reminders from storage
 * @returns {Array} Array of reminder objects
 */
export const getReminders = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading reminders:', error);
        return [];
    }
};

/**
 * Save reminders to storage
 * @param {Array} reminders - Array of reminder objects
 */
const saveReminders = (reminders) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (error) {
        console.error('Error saving reminders:', error);
    }
};

/**
 * Add a new reminder with proper ISO timestamp
 * @param {Object} reminder - Reminder data (without id)
 * @returns {Object} The created reminder with id and nextFireTime
 */
export const addReminder = (reminder) => {
    const reminders = getReminders();
    
    // Calculate next fire time using Phase 2 utility
    const nextFireTime = parseTimingToISO(reminder.time);

    // ═══════════════════════════════════════════════════════════════════
    // DURATION-BASED EXPIRY
    // If the prescription specifies a duration (e.g. 7 days, 15 days),
    // compute an expiresAt date so reminders auto-stop after the course.
    // null durationDays = chronic/maintenance med → no expiry.
    // ═══════════════════════════════════════════════════════════════════
    const durationDays = reminder.durationDays && reminder.durationDays > 0
        ? reminder.durationDays
        : null;
    const startDate = new Date().toISOString();
    const expiresAt = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
    
    const newReminder = {
        id: generateId(),
        medicineName: reminder.medicineName || 'Medicine',
        description: reminder.description || '',
        color: reminder.color || '#3B82F6',
        time: reminder.time || '08:00',
        // Phase 2: ISO timestamp for alarm firing
        nextFireTime: nextFireTime.toISOString(),
        nextFireHour: nextFireTime.getHours(),
        nextFireMinute: nextFireTime.getMinutes(),
        enabled: reminder.enabled !== undefined ? reminder.enabled : true,
        repeatDays: reminder.repeatDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        createdAt: startDate,
        // Duration-based expiry fields
        startDate: startDate,
        durationDays: durationDays,
        expiresAt: expiresAt
    };
    reminders.push(newReminder);
    saveReminders(reminders);
    return newReminder;
};

/**
 * Update an existing reminder
 * @param {string} id - Reminder ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated reminder or null if not found
 */
export const updateReminder = (id, updates) => {
    const reminders = getReminders();
    const index = reminders.findIndex(r => r.id === id);

    if (index === -1) {
        console.error('Reminder not found:', id);
        return null;
    }

    reminders[index] = {
        ...reminders[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    saveReminders(reminders);
    return reminders[index];
};

/**
 * Delete a reminder
 * @param {string} id - Reminder ID
 * @returns {boolean} Success status
 */
export const deleteReminder = (id) => {
    const reminders = getReminders();
    const filtered = reminders.filter(r => r.id !== id);

    if (filtered.length === reminders.length) {
        console.error('Reminder not found:', id);
        return false;
    }

    saveReminders(filtered);
    return true;
};

/**
 * Toggle reminder enabled state
 * @param {string} id - Reminder ID
 * @returns {Object|null} Updated reminder or null if not found
 */
export const toggleReminder = (id) => {
    const reminders = getReminders();
    const reminder = reminders.find(r => r.id === id);

    if (!reminder) {
        console.error('Reminder not found:', id);
        return null;
    }

    return updateReminder(id, { enabled: !reminder.enabled });
};

/**
 * Get a single reminder by ID
 * @param {string} id - Reminder ID
 * @returns {Object|null} Reminder or null if not found
 */
export const getReminderById = (id) => {
    const reminders = getReminders();
    return reminders.find(r => r.id === id) || null;
};

/**
 * Get reminders for a specific time
 * @param {string} time - Time in HH:MM format
 * @returns {Array} Array of matching reminders
 */
export const getRemindersForTime = (time) => {
    const reminders = getReminders();
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = dayNames[now.getDay()];

    return reminders.filter(r =>
        r.enabled &&
        r.time === time &&
        r.repeatDays.includes(today)
    );
};

/**
 * Format time for display (12-hour format)
 * @param {string} time - Time in HH:MM format
 * @returns {string} Formatted time like "8:00 AM"
 */
export const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Get time period label
 * @param {string} time - Time in HH:MM format
 * @returns {string} Period label (Morning, Afternoon, Evening, Night)
 */
export const getTimePeriod = (time) => {
    if (!time) return '';
    const hours = parseInt(time.split(':')[0], 10);

    if (hours >= 5 && hours < 12) return 'Morning';
    if (hours >= 12 && hours < 17) return 'Afternoon';
    if (hours >= 17 && hours < 21) return 'Evening';
    return 'Night';
};

/**
 * Pill color options for the UI
 */
export const PILL_COLORS = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Orange', value: '#F97316' },
    { name: 'White', value: '#F3F4F6' }
];

/**
 * Quick time presets
 */
export const TIME_PRESETS = [
    { label: 'Morning', time: '08:00', icon: '🌅' },
    { label: 'Afternoon', time: '13:00', icon: '☀️' },
    { label: 'Evening', time: '18:00', icon: '🌆' },
    { label: 'Night', time: '21:00', icon: '🌙' }
];

/**
 * Days of the week
 */
export const DAYS_OF_WEEK = [
    { short: 'Sun', full: 'Sunday' },
    { short: 'Mon', full: 'Monday' },
    { short: 'Tue', full: 'Tuesday' },
    { short: 'Wed', full: 'Wednesday' },
    { short: 'Thu', full: 'Thursday' },
    { short: 'Fri', full: 'Friday' },
    { short: 'Sat', full: 'Saturday' }
];

/**
 * Auto-Scheduler: Create reminders from prescription analysis
 * Converts timing (morning/night) to actual times (9:00 AM/9:00 PM)
 * @param {Array} medicines - Array of medicine objects from Gemini extraction
 * @returns {Object} { created: number, reminders: Array, voiceAnnouncement: string }
 */
export const createRemindersFromPrescription = (medicines, language = 'en-US') => {
    if (!medicines || medicines.length === 0) {
        return { created: 0, reminders: [], voiceAnnouncement: '' };
    }

    // Timing to actual time mapping
    const timeMapping = {
        morning: '09:00',
        afternoon: '14:00',
        evening: '18:00',
        night: '21:00'
    };

    // Color mapping for pill visuals
    const colorMapping = {
        white: '#F3F4F6',
        pink: '#EC4899',
        blue: '#3B82F6',
        red: '#EF4444',
        yellow: '#F59E0B',
        green: '#10B981',
        orange: '#F97316',
        purple: '#8B5CF6'
    };

    const createdReminders = [];
    const announcementParts = [];

    medicines.forEach(medicine => {
        const timings = medicine.timing || ['morning'];
        const color = colorMapping[medicine.visualColor?.toLowerCase()] || '#3B82F6';

        timings.forEach(timing => {
            const time = timeMapping[timing] || '09:00';
            
            // Check if reminder already exists for this medicine + time
            const existingReminders = getReminders();
            const exists = existingReminders.some(
                r => r.medicineName.toLowerCase() === medicine.name.toLowerCase() && r.time === time
            );

            if (!exists) {
                const newReminder = addReminder({
                    medicineName: medicine.name,
                    description: medicine.visualDescription || `${medicine.dosage || ''} ${medicine.visualType || 'Tablet'}`.trim(),
                    color: color,
                    time: time,
                    enabled: true,
                    repeatDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    // Pass prescription duration for auto-expiry
                    // NOTE: Gemini outputs camelCase durationDays (not snake_case duration_days)
                    durationDays: medicine.durationDays || null
                });
                createdReminders.push(newReminder);
            }
        });

        // Build announcement
        const timeDisplay = timings.map(t => {
            if (t === 'morning') return '9 AM';
            if (t === 'afternoon') return '2 PM';
            if (t === 'evening') return '6 PM';
            if (t === 'night') return '9 PM';
            return t;
        }).join(' and ');

        announcementParts.push(`${medicine.name} at ${timeDisplay}`);
    });

    // Generate voice announcement
    const voiceTemplates = {
        'en-US': `I have set reminders for ${announcementParts.join(', ')}. You can change this in the Reminders section.`,
        'hi-IN': `मैंने ${announcementParts.join(', ')} के लिए रिमाइंडर सेट कर दिया है। आप रिमाइंडर सेक्शन में इसे बदल सकते हैं।`,
        'mr-IN': `मी ${announcementParts.join(', ')} साठी रिमाइंडर सेट केले आहेत. तुम्ही रिमाइंडर विभागात हे बदलू शकता.`
    };

    return {
        created: createdReminders.length,
        reminders: createdReminders,
        voiceAnnouncement: voiceTemplates[language] || voiceTemplates['en-US']
    };
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DURATION-BASED AUTO-EXPIRY
 * Scans all reminders and auto-disables any whose course has ended.
 * Call this on app startup (Dashboard mount) and ReminderList mount.
 * ═══════════════════════════════════════════════════════════════════════
 * @returns {Array} List of reminders that were just expired (for voice announcement)
 */
export const cleanExpiredReminders = () => {
    const reminders = getReminders();
    const now = new Date();
    const newlyExpired = [];

    const updated = reminders.map(r => {
        // Skip if no expiry, already disabled, or already marked expired
        if (!r.expiresAt || !r.enabled || r.courseComplete) return r;

        if (new Date(r.expiresAt) <= now) {
            console.log(`⏰ Course complete: ${r.medicineName} (${r.durationDays} days expired)`);
            newlyExpired.push(r);
            return {
                ...r,
                enabled: false,
                courseComplete: true,
                courseCompletedAt: now.toISOString()
            };
        }
        return r;
    });

    if (newlyExpired.length > 0) {
        saveReminders(updated);
        console.log(`🧹 Auto-expired ${newlyExpired.length} reminder(s)`);
    }

    return newlyExpired;
};

/**
 * Get remaining days for a reminder's course
 * @param {Object} reminder - Reminder object
 * @returns {Object} { remaining: number|null, total: number|null, isExpired: boolean, label: string }
 */
export const getRemainingDays = (reminder) => {
    // No duration set = chronic/ongoing medicine
    if (!reminder.durationDays || !reminder.expiresAt) {
        return { remaining: null, total: null, isExpired: false, label: 'Ongoing' };
    }

    const now = Date.now();
    const expiresAt = new Date(reminder.expiresAt).getTime();
    const remaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));

    if (remaining <= 0 || reminder.courseComplete) {
        return {
            remaining: 0,
            total: reminder.durationDays,
            isExpired: true,
            label: 'Course complete'
        };
    }

    return {
        remaining,
        total: reminder.durationDays,
        isExpired: false,
        label: `${remaining} day${remaining !== 1 ? 's' : ''} left`
    };
};
