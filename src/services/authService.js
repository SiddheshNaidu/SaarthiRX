import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signOut
} from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { getPrompt } from '../utils/translations';

// Test number for development
const TEST_NUMBER = '+919999888877';

// Store confirmation result globally for OTP verification
let confirmationResult = null;

/**
 * Setup invisible reCAPTCHA verifier (Singleton Pattern)
 * FIX: Prevents "reCAPTCHA already rendered" error
 * @param {string} containerId - ID of the container element for reCAPTCHA
 * @returns {RecaptchaVerifier} The reCAPTCHA verifier instance
 */
export const setupRecaptcha = (containerId) => {
    // 1. Check if the DOM element actually exists
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Recaptcha container #${containerId} not found in DOM.`);
        return null;
    }

    // 2. SINGLETON: If it already exists, return it. DO NOT create a new one.
    if (window.recaptchaVerifier) {
        console.log('♻️ Reusing existing reCAPTCHA verifier');
        return window.recaptchaVerifier;
    }

    try {
        // 3. Initialize only if null
        console.log('🔧 Creating new reCAPTCHA verifier');
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => {
                console.log('✅ reCAPTCHA solved - allow signIn');
            },
            'expired-callback': () => {
                console.warn('⏰ reCAPTCHA expired - will reset on next attempt');
                // Don't clear immediately, let the next sendOtp handle it
            }
        });

        return window.recaptchaVerifier;
    } catch (error) {
        console.error('❌ reCAPTCHA Init Error:', error);
        return null;
    }
};

/**
 * Send OTP to phone number with Slow Network Buffer
 * FIX: Handles race conditions on 3G networks
 * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
 * @returns {Promise<boolean>} True if OTP sent successfully
 */
export const sendOtp = async (phoneNumber) => {
    try {
        // 1. Ensure verifier exists (Singleton check)
        if (!window.recaptchaVerifier) {
            console.log('🔄 reCAPTCHA not found, initializing...');
            setupRecaptcha('recaptcha-container');
        }

        const appVerifier = window.recaptchaVerifier;

        if (!appVerifier) {
            throw new Error('reCAPTCHA not initialized');
        }

        // Format phone number with India country code if not present
        const formattedPhone = phoneNumber.startsWith('+')
            ? phoneNumber
            : `+91${phoneNumber}`;

        // DYNAMIC AUTH SETTING:
        // Enable testing mode ONLY for the specific test number in DEV
        if (import.meta.env.DEV && formattedPhone === TEST_NUMBER) {
            auth.settings.appVerificationDisabledForTesting = true;
            console.log('🔧 Testing mode ENABLED for', formattedPhone);
        } else {
            auth.settings.appVerificationDisabledForTesting = false;
            console.log('📡 Real SMS mode ENABLED for', formattedPhone);
        }

        // 2. THE BUFFER: Wait 1s for external scripts to load on slow networks
        console.log('⏳ Waiting for reCAPTCHA scripts to load...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`📤 Sending OTP to ${formattedPhone}...`);
        confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);

        console.log('✅ OTP sent successfully!');
        return true;

    } catch (error) {
        console.error('❌ Error sending OTP:', error.code, error.message);

        // 3. CRITICAL ERROR LOGGING for developer
        if (error.code === 'auth/invalid-app-credential') {
            console.error('🚨 CRITICAL: You must add "localhost" to Authorized Domains in Firebase Console!');
            console.error('   Go to: Firebase Console → Authentication → Settings → Authorized domains');
        }

        // 4. SMART ERROR HANDLING: Only destroy verifier on critical errors
        // If it's just a network timeout, keeping the verifier is safer for retry
        if (error.code !== 'auth/network-request-failed') {
            if (window.recaptchaVerifier) {
                console.log('🧹 Clearing reCAPTCHA due to error');
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        } else {
            console.log('🌐 Network error - keeping reCAPTCHA for retry');
        }

        throw error;
    }
};

/**
 * Verify OTP and sign in user
 * @param {string} otp - 6-digit OTP entered by user
 * @returns {Promise<object>} Firebase user object
 */
export const verifyOtp = async (otp) => {
    try {
        if (!confirmationResult) {
            throw new Error('OTP not sent yet. Please request OTP first.');
        }

        const result = await confirmationResult.confirm(otp);
        confirmationResult = null; // Clear after successful verification

        return result.user;
    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw error;
    }
};

/**
 * Get the current confirmation result
 * Useful for external OTP verification (e.g., WebOTP)
 * @returns {object|null} Confirmation result or null
 */
export const getConfirmationResult = () => confirmationResult;

/**
 * Verify OTP using direct confirmation result
 * Used when WebOTP captures the code automatically
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<object>} Firebase user object
 */
export const verifyOtpDirect = async (otp) => {
    const confirmation = getConfirmationResult();
    if (!confirmation) {
        throw new Error('No pending OTP verification');
    }

    const result = await confirmation.confirm(otp);
    confirmationResult = null;
    return result.user;
};

/**
 * Get current authenticated user
 * @returns {object|null} Current user or null
 */
export const getCurrentUser = () => {
    return auth.currentUser;
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const signOutUser = async () => {
    try {
        await signOut(auth);
        confirmationResult = null;

        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

/**
 * Get user-friendly error message
 * @param {Error} error - Firebase error
 * @param {string} language - Current language code
 * @returns {string} User-friendly error message
 */
export const getAuthErrorMessage = (error, language = 'hi-IN') => {
    const code = error.code || 'default';
    console.error('🔥 Firebase Auth Error Code:', code, error.message);

    // Map Firebase error codes to our translation keys
    const errorMap = {
        'auth/invalid-phone-number': 'ERR_INVALID_PHONE',
        'auth/invalid-verification-code': 'ERR_GENERIC',
        'auth/code-expired': 'ERR_CODE_EXPIRED',
        'auth/network-request-failed': 'ERR_NETWORK',
        'auth/quota-exceeded': 'ERR_NETWORK',
        'auth/missing-app-credential': 'ERR_GENERIC',
        'auth/invalid-app-credential': 'ERR_CONFIG', // New: Config error
        'auth/too-many-requests': 'ERR_TOO_MANY',
        'default': 'ERR_GENERIC'
    };

    const promptKey = errorMap[code] || 'ERR_GENERIC';
    return getPrompt(promptKey, language);
};
