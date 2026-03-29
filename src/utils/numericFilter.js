/**
 * Numeric Filter Utility
 * Filters non-digit noise from phone/age inputs for elderly users
 * Converts word-numbers to digits and removes filler words
 */

// Word to digit mappings for multiple languages
// Note: Some Hindi and Marathi words are identical (like शून्य, एक, तीन, चार, सात, आठ)
// We keep unique entries only to avoid duplicate keys
const WORD_TO_DIGIT = {
    // English
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12',
    // Hindi
    'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
    'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
    'दस': '10', 'ग्यारह': '11', 'बारह': '12',
    // Marathi (only unique words not in Hindi)
    'दोन': '2', 'पाच': '5', 'सहा': '6', 'नऊ': '9',
    'दहा': '10', 'अकरा': '11', 'बारा': '12',
};

// Filler words to ignore
const FILLER_WORDS = [
    'um', 'uh', 'ah', 'okay', 'so', 'like', 'hmm', 'err',
    'अम', 'आह', 'ठीक', 'हां', 'हाँ',
    'अं', 'आ', 'ठीक', 'हो'
];

/**
 * Filters and sanitizes numeric voice input
 * @param {string} text - Raw voice transcript
 * @param {string} inputType - 'phone' | 'age' | 'otp'
 * @returns {object} { sanitized: string, digits: string, isValid: boolean }
 */
export const filterNumericInput = (text, inputType = 'phone') => {
    if (!text) return { sanitized: '', digits: '', isValid: false };

    let processed = text.toLowerCase().trim();

    // Remove filler words
    FILLER_WORDS.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        processed = processed.replace(regex, '');
    });

    // Convert word-numbers to digits
    Object.entries(WORD_TO_DIGIT).forEach(([word, digit]) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        processed = processed.replace(regex, digit);
    });

    // Extract only digits
    const digits = processed.replace(/\D/g, '');

    // Validation based on input type
    let isValid = false;
    switch (inputType) {
        case 'phone':
            isValid = digits.length === 10;
            break;
        case 'age':
            isValid = digits.length >= 1 && digits.length <= 3 && parseInt(digits) <= 120;
            break;
        case 'otp':
            isValid = digits.length === 6;
            break;
        default:
            isValid = digits.length > 0;
    }

    return {
        sanitized: processed,
        digits,
        isValid
    };
};

/**
 * Check if transcript contains only numeric intent
 * Used to determine if user is trying to enter a number vs a command
 * @param {string} text - Raw transcript
 * @returns {boolean}
 */
export const isNumericIntent = (text) => {
    if (!text) return false;

    const lower = text.toLowerCase();

    // Check if it contains number words or digits
    const hasDigits = /\d/.test(text);
    const hasNumberWords = Object.keys(WORD_TO_DIGIT).some(word =>
        lower.includes(word.toLowerCase())
    );

    // Check if it contains navigation commands
    const hasCommands = /\b(scan|home|repeat|help|back)\b/i.test(lower) ||
        /\b(स्कैन|होम|दोहराएं|मदद|वापस)\b/i.test(lower);

    return (hasDigits || hasNumberWords) && !hasCommands;
};
