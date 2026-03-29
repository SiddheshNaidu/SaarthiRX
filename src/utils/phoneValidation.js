// Indian phone number validation
const INDIAN_PHONE_REGEX = /^\+91[6-9]\d{9}$/;
const INDIAN_PHONE_DIGITS_REGEX = /^[6-9]\d{9}$/;

/**
 * Validate and format Indian phone number
 * @param {string} input - User input (can be voice or text)
 * @returns {{isValid: boolean, formatted: string, error: string}}
 */
export const validateIndianPhone = (input) => {
    if (!input) {
        return { isValid: false, formatted: '', error: 'Phone number is required' };
    }

    // Remove spaces and special characters except +
    const cleaned = input.replace(/[\s\-()]/g, '');

    // Check if already has +91
    if (INDIAN_PHONE_REGEX.test(cleaned)) {
        return { isValid: true, formatted: cleaned, error: '' };
    }

    // Check if it's 10 digits starting with 6-9
    if (INDIAN_PHONE_DIGITS_REGEX.test(cleaned)) {
        return { isValid: true, formatted: `+91${cleaned}`, error: '' };
    }

    // Invalid format
    if (cleaned.length !== 10 && !cleaned.startsWith('+91')) {
        return {
            isValid: false,
            formatted: '',
            error: 'Phone number must be 10 digits'
        };
    }

    if (!cleaned.match(/^[6-9]/)) {
        return {
            isValid: false,
            formatted: '',
            error: 'Indian numbers must start with 6, 7, 8, or 9'
        };
    }

    return {
        isValid: false,
        formatted: '',
        error: 'Invalid phone number format'
    };
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number with +91
 * @returns {string} Formatted display (e.g., +91 98765 43210)
 */
export const formatPhoneDisplay = (phone) => {
    if (!phone) return '';

    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+91')) {
        const number = cleaned.substring(3);
        return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
    }

    return phone;
};
