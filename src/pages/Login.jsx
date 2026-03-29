import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { useVoice } from '../context/VoiceContext';
import { useWebOTP } from '../hooks/useWebOTP';
import { triggerSuccess, triggerAlert, triggerAction } from '../utils/haptics';
import { cleanAndFormatPhoneNumber, formatPhoneForVoice } from '../utils/numberParser';
import { setupRecaptcha, sendOtp, verifyOtpDirect, getAuthErrorMessage } from '../services/authService';
import { getUserFromFirestore, saveUserToFirestore } from '../services/userService';
import { getPrompt } from '../utils/translations';
import OTPWaitingOverlay from '../components/OTPWaitingOverlay';
import GlobalActionButton from '../components/GlobalActionButton';

// Auth Flow States
const AUTH_STATES = {
    IDLE: 'IDLE',
    ASKING_NUMBER: 'ASKING_NUMBER',
    LISTENING_NUMBER: 'LISTENING_NUMBER',
    CONFIRMING_NUMBER: 'CONFIRMING_NUMBER',
    SENDING_OTP: 'SENDING_OTP',
    WAITING_OTP: 'WAITING_OTP',
    FALLBACK_VOICE: 'FALLBACK_VOICE',
    VERIFYING: 'VERIFYING',
    ASKING_NAME: 'ASKING_NAME',
    LISTENING_NAME: 'LISTENING_NAME',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
};

const Login = () => {
    const navigate = useNavigate();
    const { language, saveUser } = useApp();
    const { announce, announceMultiLang } = useVoiceButler();
    const { transcript, isListening, startListening, stopListening, resetTranscript, speak } = useVoice();

    // State
    const [authState, setAuthState] = useState(AUTH_STATES.IDLE);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [formattedPhone, setFormattedPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [userName, setUserName] = useState('');
    const [error, setError] = useState('');
    const [remainingTime, setRemainingTime] = useState(30);
    const [verifiedUid, setVerifiedUid] = useState(null);

    // Refs
    const recaptchaContainerRef = useRef(null);
    const timerRef = useRef(null);
    const hasInitialized = useRef(false);

    // WebOTP Hook - for automatic OTP capture
    const {
        startListening: startOTPListener,
        stopListening: stopOTPListener,
        isListening: isOTPListening,
        supportsWebOTP
    } = useWebOTP({
        onReceived: async (code) => {
            console.log('🎉 OTP received via WebOTP:', code);
            setOtpCode(code);
            triggerSuccess();
            await handleOTPReceived(code);
        },
        onTimeout: () => {
            console.log('⏰ WebOTP timeout - falling back to voice');
            setAuthState(AUTH_STATES.FALLBACK_VOICE);
            handleFallbackVoice();
        },
        timeoutMs: 30000
    });

    // Countdown timer for OTP waiting
    useEffect(() => {
        if (authState === AUTH_STATES.WAITING_OTP) {
            setRemainingTime(30);
            timerRef.current = setInterval(() => {
                setRemainingTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [authState]);

    // Initialize reCAPTCHA on mount
    useEffect(() => {
        if (recaptchaContainerRef.current && !hasInitialized.current) {
            hasInitialized.current = true;
            try {
                setupRecaptcha('recaptcha-container');
            } catch (e) {
                console.error('reCAPTCHA setup error:', e);
            }
        }
    }, []);

    // Process voice transcript for phone number
    useEffect(() => {
        if (transcript && authState === AUTH_STATES.LISTENING_NUMBER) {
            const result = cleanAndFormatPhoneNumber(transcript, language);
            console.log('📱 Parsed phone:', result);

            if (result.digits.length > 0) {
                setPhoneNumber(result.digits);
                setFormattedPhone(result.formatted);
            }

            // If we have 10 digits, stop listening and confirm
            if (result.isValid) {
                stopListening();
                setAuthState(AUTH_STATES.CONFIRMING_NUMBER);
                handleConfirmNumber(result.formatted, result.digits);
            }

            resetTranscript();
        }
    }, [transcript, authState, language]);

    // Process voice transcript for OTP fallback
    useEffect(() => {
        if (transcript && authState === AUTH_STATES.FALLBACK_VOICE) {
            // Extract 6 digits from voice
            const digits = transcript.replace(/\D/g, '');
            if (digits.length >= 6) {
                const code = digits.substring(0, 6);
                setOtpCode(code);
                stopListening();
                resetTranscript();
                handleOTPReceived(code);
            }
        }
    }, [transcript, authState]);

    // Process voice transcript for NAME
    useEffect(() => {
        if (transcript && authState === AUTH_STATES.LISTENING_NAME) {
            const name = transcript.trim();
            if (name.length > 2) {
                setUserName(name);
                stopListening();
                resetTranscript();
                handleNameCaptured(name);
            }
        }
    }, [transcript, authState]);

    // Start the voice login flow
    const startVoiceLogin = useCallback(async () => {
        setError('');
        setAuthState(AUTH_STATES.ASKING_NUMBER);

        // Ask for phone number
        const prompt = getPrompt('ASK_NUMBER', language, { default: 'What is your phone number?' });
        await speak(prompt);

        // Start listening after TTS (Echo Buffer: 1500ms)
        setTimeout(() => {
            setAuthState(AUTH_STATES.LISTENING_NUMBER);
            startListening();
        }, 1500);
    }, [speak, language, startListening]);

    // Confirm the phone number before sending OTP
    const handleConfirmNumber = async (formatted, digits) => {
        // Read back the number
        const readableNumber = formatPhoneForVoice(formatted, language);
        const heardPrompt = getPrompt('HEARD_NUMBER', language, { number: readableNumber, default: `I heard ${readableNumber}` });
        const sendingPrompt = getPrompt('SENDING_CODE', language, { default: 'Sending the secret code now.' });

        triggerAction();
        await speak(`${heardPrompt}. ${sendingPrompt}`);

        // Proceed to send OTP
        await handleSendOTP(formatted);
    };

    // Send OTP to the phone number
    const handleSendOTP = async (phone) => {
        setAuthState(AUTH_STATES.SENDING_OTP);

        try {
            await sendOtp(phone);
            console.log('✅ OTP sent successfully');

            // Start waiting for OTP
            setAuthState(AUTH_STATES.WAITING_OTP);

            // Announce waiting state
            const waitingPrompt = getPrompt('WAITING_CODE', language, { default: 'Waiting for your secure code.' });
            await speak(waitingPrompt);

            // Start WebOTP listener if supported
            if (supportsWebOTP) {
                console.log('🔐 Starting WebOTP listener...');
                startOTPListener();
            } else {
                console.log('📱 WebOTP not supported, will rely on voice fallback');
                // Set a manual timeout for voice fallback
                setTimeout(() => {
                    if (authState === AUTH_STATES.WAITING_OTP) {
                        setAuthState(AUTH_STATES.FALLBACK_VOICE);
                        handleFallbackVoice();
                    }
                }, 30000);
            }
        } catch (error) {
            console.error('❌ OTP send error:', error);
            triggerAlert();
            const errorMsg = getAuthErrorMessage(error, language);
            setError(errorMsg);
            await speak(errorMsg);
            setAuthState(AUTH_STATES.ERROR);
        }
    };

    // Handle fallback to voice OTP input
    const handleFallbackVoice = async () => {
        stopOTPListener();
        triggerAlert();
        const fallbackPrompt = getPrompt('FALLBACK_ASK_CODE', language, { default: 'Please tell me the 6-digit code.' });
        await speak(fallbackPrompt);

        setTimeout(() => {
            startListening();
        }, 1500);
    };

    // Handle OTP received (from WebOTP or voice)
    const handleOTPReceived = async (code) => {
        setAuthState(AUTH_STATES.VERIFYING);
        const verifyingPrompt = getPrompt('VERIFYING_CODE', language, { default: 'Verifying your code...' });
        await speak(verifyingPrompt);

        try {
            const user = await verifyOtpDirect(code);
            console.log('✅ User verified:', user.uid);
            setVerifiedUid(user.uid);

            // Load user profile from Firestore
            const profile = await getUserFromFirestore(user.uid);

            if (profile) {
                // Existing user
                saveUser(profile);
                triggerSuccess();
                setAuthState(AUTH_STATES.SUCCESS);
                const successPrompt = getPrompt('LOGIN_SUCCESS', language, { default: 'Login successful.' });
                await speak(successPrompt);

                // Navigate to dashboard
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1000);
            } else {
                // New User - Ask for Name
                setAuthState(AUTH_STATES.ASKING_NAME);
                const newUserGreeting = getPrompt('NEW_USER_GREETING', language);
                await speak(newUserGreeting);

                setTimeout(() => {
                    setAuthState(AUTH_STATES.LISTENING_NAME);
                    startListening();
                }, 1500);
            }
        } catch (error) {
            console.error('❌ OTP verification error:', error);
            triggerAlert();
            const errorMsg = getAuthErrorMessage(error, language);
            setError(errorMsg);
            await speak(errorMsg);
            setAuthState(AUTH_STATES.ERROR);

            // Allow retry
            setTimeout(() => {
                setAuthState(AUTH_STATES.FALLBACK_VOICE);
                handleFallbackVoice();
            }, 2000);
        }
    };

    // Handle Name Capture and User Creation
    const handleNameCaptured = async (name) => {
        if (!verifiedUid) return;

        const confirmPrompt = getPrompt('NAME_CONFIRM', language, { name });
        await speak(confirmPrompt);

        // Saving user to Firestore
        try {
            const userData = {
                name: name,
                phone: formattedPhone || phoneNumber, // Fallback
                language: language,
                // Default values for now, can be updated later
                age: '0',
                gender: 'unknown'
            };

            await saveUserToFirestore(verifiedUid, userData);
            saveUser({ uid: verifiedUid, ...userData });

            triggerSuccess();
            setAuthState(AUTH_STATES.SUCCESS);

            const successPrompt = getPrompt('LOGIN_SUCCESS', language);
            await speak(successPrompt);

            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);

        } catch (err) {
            console.error('Error saving user:', err);
            const errPrompt = getPrompt('ERR_GENERIC', language);
            await speak(errPrompt);
            setAuthState(AUTH_STATES.ERROR);
        }
    };

    // Voice prompt callback for OTP waiting overlay
    const handleVoicePrompt = useCallback(() => {
        const stillWaitingPrompt = getPrompt('STILL_WAITING', language, { default: 'Still waiting based on timer.' });
        speak(stillWaitingPrompt);
    }, [speak, language]);

    // Retry from error state
    const handleRetry = () => {
        setError('');
        setPhoneNumber('');
        setFormattedPhone('');
        setOtpCode('');
        startVoiceLogin();
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 pb-40 bg-gradient-to-br from-slate-50 to-orange-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Hidden reCAPTCHA container */}
            <div id="recaptcha-container" ref={recaptchaContainerRef} />

            {/* OTP Waiting Overlay */}
            <OTPWaitingOverlay
                isVisible={authState === AUTH_STATES.WAITING_OTP}
                onVoicePrompt={handleVoicePrompt}
                remainingTime={remainingTime}
                language={language}
            />

            {/* Logo */}
            <motion.img
                src="/logo.png"
                alt="SaarthiRx"
                className="w-24 h-24 sm:w-28 sm:h-28 mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
            />

            {/* Title */}
            <motion.h1
                className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 text-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {getPrompt('TITLE_LOGIN', language, { default: 'Login' })}
            </motion.h1>
            <motion.p
                className="text-base sm:text-lg text-gray-600 mb-8 text-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                {getPrompt('SUBTITLE_LOGIN', language, { default: 'Voice Powered' })}
            </motion.p>

            {/* Main Content Area */}
            <div className="w-full max-w-sm space-y-6">
                <AnimatePresence mode="wait">
                    {/* IDLE State - Start Button */}
                    {authState === AUTH_STATES.IDLE && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="space-y-4"
                        >
                            <motion.button
                                onClick={startVoiceLogin}
                                className="w-full p-6 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-semibold text-xl shadow-2xl flex flex-col items-center justify-center gap-3"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <motion.div
                                    className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                    </svg>
                                </motion.div>
                                <span>{getPrompt('START_LOGIN', language, { default: 'Start Login' })}</span>
                            </motion.button>
                        </motion.div>
                    )}

                    {/* LISTENING State */}
                    {(authState === AUTH_STATES.LISTENING_NUMBER || authState === AUTH_STATES.ASKING_NUMBER) && (
                        <motion.div
                            key="listening"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white p-6 rounded-3xl shadow-premium text-center"
                        >
                            <motion.div
                                className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center"
                                animate={{
                                    scale: isListening ? [1, 1.1, 1] : 1,
                                    boxShadow: isListening
                                        ? ['0 0 0 0 rgba(251, 146, 60, 0.4)', '0 0 0 20px rgba(251, 146, 60, 0)', '0 0 0 0 rgba(251, 146, 60, 0.4)']
                                        : '0 0 0 0 rgba(251, 146, 60, 0)'
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                </svg>
                            </motion.div>

                            <p className="text-lg text-gray-700 mb-4">{getPrompt('LISTENING', language, { default: 'Listening...' })}</p>

                            {/* Show captured number */}
                            {phoneNumber && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-orange-50 p-4 rounded-2xl"
                                >
                                    <p className="text-2xl font-bold text-orange-600 tracking-wider">
                                        {phoneNumber}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {phoneNumber.length}/10 digits
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* CONFIRMING State */}
                    {authState === AUTH_STATES.CONFIRMING_NUMBER && (
                        <motion.div
                            key="confirming"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white p-6 rounded-3xl shadow-premium text-center"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-xl font-semibold text-gray-800">{formattedPhone}</p>
                            <p className="text-gray-500 mt-2">{getPrompt('SENDING_CODE', language)}</p>
                        </motion.div>
                    )}

                    {/* SENDING OTP State */}
                    {authState === AUTH_STATES.SENDING_OTP && (
                        <motion.div
                            key="sending"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white p-6 rounded-3xl shadow-premium text-center"
                        >
                            <motion.div
                                className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-orange-500 border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <p className="text-lg text-gray-700">{getPrompt('SENDING_CODE', language)}</p>
                        </motion.div>
                    )}

                    {/* FALLBACK Voice OTP Input */}
                    {authState === AUTH_STATES.FALLBACK_VOICE && (
                        <motion.div
                            key="fallback"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-white p-6 rounded-3xl shadow-premium text-center"
                        >
                            <motion.div
                                className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center"
                                animate={{ scale: isListening ? [1, 1.1, 1] : 1 }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                </svg>
                            </motion.div>

                            <p className="text-lg text-gray-700 mb-4">{getPrompt('FALLBACK_ASK_CODE', language)}</p>

                            {/* Show captured OTP */}
                            {otpCode && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-blue-50 p-4 rounded-2xl"
                                >
                                    <p className="text-3xl font-bold text-blue-600 tracking-[0.5em]">
                                        {otpCode}
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* VERIFYING State */}
                    {authState === AUTH_STATES.VERIFYING && (
                        <motion.div
                            key="verifying"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white p-6 rounded-3xl shadow-premium text-center"
                        >
                            <motion.div
                                className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-green-500 border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <p className="text-lg text-gray-700">{getPrompt('VERIFYING_CODE', language)}</p>
                        </motion.div>
                    )}

                    {/* ASKING NAME State */}
                    {(authState === AUTH_STATES.ASKING_NAME || authState === AUTH_STATES.LISTENING_NAME) && (
                        <motion.div
                            key="askingName"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white p-6 rounded-3xl shadow-premium text-center"
                        >
                            <motion.div
                                className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center"
                                animate={{
                                    scale: isListening ? [1, 1.1, 1] : 1,
                                    boxShadow: isListening
                                        ? ['0 0 0 0 rgba(236, 72, 153, 0.4)', '0 0 0 20px rgba(236, 72, 153, 0)', '0 0 0 0 rgba(236, 72, 153, 0.4)']
                                        : '0 0 0 0 rgba(236, 72, 153, 0)'
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <span className="text-4xl">👋</span>
                            </motion.div>

                            <p className="text-lg text-gray-700 mb-4">{getPrompt('ASK_NAME', language)}</p>

                            {userName && (
                                <div className="text-2xl font-bold text-gray-800">{userName}</div>
                            )}
                        </motion.div>
                    )}

                    {/* SUCCESS State */}
                    {authState === AUTH_STATES.SUCCESS && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-6 rounded-3xl shadow-premium text-center"
                        >
                            <motion.div
                                className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200 }}
                            >
                                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </motion.div>
                            <p className="text-xl font-semibold text-green-600">{getPrompt('LOGIN_SUCCESS', language)}</p>
                        </motion.div>
                    )}

                    {/* ERROR State */}
                    {authState === AUTH_STATES.ERROR && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-6 rounded-3xl shadow-premium text-center"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-red-600 mb-4">{error}</p>
                            <button
                                onClick={handleRetry}
                                className="px-6 py-3 bg-orange-500 text-white rounded-full font-semibold"
                            >
                                {getPrompt('RETRY', language, { default: 'Retry' })}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Listening Indicator */}
            {isListening && (
                <motion.div
                    className="fixed top-20 inset-x-0 mx-auto w-max z-40 px-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg flex items-center gap-2">
                        <motion.div
                            className="w-3 h-3 bg-white rounded-full"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                        🎙️ {getPrompt('LISTENING', language, { default: 'Listening...' })}
                    </div>
                </motion.div>
            )}

            <GlobalActionButton isActive={isListening} />
        </motion.div>
    );
};

export default Login;
