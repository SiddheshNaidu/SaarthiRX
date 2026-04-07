import React from 'react';
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
    ASKING_AGE: 'ASKING_AGE',
    LISTENING_AGE: 'LISTENING_AGE',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
};

/**
 * Extract a valid age (18-100) from raw voice transcript.
 * If the transcript contains multiple 2-digit sequences, use the FIRST one.
 * e.g. "fifty five fifty five" → 55, "25 25" → 25, "one hundred and two" → skipped
 */
const extractAge = (transcript) => {
    // Convert spoken words to digits first
    const wordToNum = {
        'zero':0,'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,
        'eight':8,'nine':9,'ten':10,'eleven':11,'twelve':12,'thirteen':13,
        'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,'eighteen':18,
        'nineteen':19,'twenty':20,'thirty':30,'forty':40,'fifty':50,'sixty':60,
        'seventy':70,'eighty':80,'ninety':90,'hundred':100,
        // Hindi words
        'aath':8,'teen':3,'char':4,'paanch':5,'chhe':6,'sat':7,'nau':9,'das':10,
        'pachees':25,'tees':30,'chalees':40,'pachaas':50,'saath':60,'sattar':70,
        'assi':80,'nabbe':90,'sau':100
    };

    let normalized = transcript.toLowerCase().trim();

    // Replace hyphenated numbers e.g., "twenty-five"
    normalized = normalized.replace(/-/g, ' ');

    // Try to extract raw digit sequences first (most reliable)
    const digitMatches = normalized.match(/\b\d+\b/g);
    if (digitMatches) {
        // Take the FIRST digit group (handles double-spoken: "55 55" → 55)
        for (const d of digitMatches) {
            const n = parseInt(d, 10);
            if (n >= 18 && n <= 100) return n;
        }
    }

    // Try spoken-word parsing
    const words = normalized.split(/\s+/);
    let total = 0;
    let current = 0;
    let found = false;

    for (const word of words) {
        if (wordToNum[word] !== undefined) {
            const val = wordToNum[word];
            if (val === 100) {
                current = current === 0 ? 100 : current * 100;
            } else if (val >= 10) {
                current += val;
            } else {
                current += val;
            }
            found = true;
        } else if (found && (word === 'and' || word === 'aur')) {
            // keep accumulating
        } else if (found) {
            // Non-number word after numbers — stop, evaluate
            total = current;
            break;
        }
    }
    if (found && total === 0) total = current;

    if (total >= 18 && total <= 100) return total;
    return null;
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
    const [userAge, setUserAge] = useState(null);
    const [ageError, setAgeError] = useState('');
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

    // Process voice transcript for AGE
    useEffect(() => {
        if (transcript && authState === AUTH_STATES.LISTENING_AGE) {
            const age = extractAge(transcript);
            resetTranscript();

            if (age !== null) {
                setUserAge(age);
                setAgeError('');
                stopListening();
                handleAgeCaptured(age);
            } else {
                // Out of range or unclear — tell user and retry
                const raw = transcript.trim();
                const retry = language === 'hi-IN'
                    ? `मुझे समझ नहीं आया। कृपया 18 से 100 के बीच की आयु बताएं।`
                    : `Sorry, I didn't catch that. Please say your age between 18 and 100.`;
                setAgeError(raw ? `"${raw}" — please say a number between 18 and 100.` : retry);
                // Speak retry prompt
                speak(retry).then(() => {
                    setTimeout(() => startListening(), 1200);
                });
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

    // Handle Name Capture → now proceeds to age step
    const handleNameCaptured = async (name) => {
        if (!verifiedUid) return;

        const confirmPrompt = getPrompt('NAME_CONFIRM', language, { name });
        await speak(confirmPrompt);

        // Proceed to age collection
        setAuthState(AUTH_STATES.ASKING_AGE);
        const askAgePrompt = language === 'hi-IN'
            ? `${name}, आपकी उम्र कितनी है? कृपया 18 से 100 के बीच बताएं।`
            : `${name}, how old are you? Please say a number between 18 and 100.`;
        await speak(askAgePrompt);

        setTimeout(() => {
            setAuthState(AUTH_STATES.LISTENING_AGE);
            setAgeError('');
            startListening();
        }, 1400);
    };

    // Handle Age Capture and save complete profile
    const handleAgeCaptured = async (age) => {
        if (!verifiedUid) return;

        const confirmAgePrompt = language === 'hi-IN'
            ? `आपकी उम्र ${age} साल है — ठीक है।`
            : `Got it, you are ${age} years old.`;
        await speak(confirmAgePrompt);

        try {
            const userData = {
                name: userName,
                phone: formattedPhone || phoneNumber,
                language: language,
                age: String(age),
                gender: 'unknown'
            };

            await saveUserToFirestore(verifiedUid, userData);
            saveUser({ uid: verifiedUid, ...userData });

            triggerSuccess();
            setAuthState(AUTH_STATES.SUCCESS);

            const successPrompt = getPrompt('LOGIN_SUCCESS', language);
            await speak(successPrompt);

            setTimeout(() => navigate('/dashboard'), 1000);
        } catch (err) {
            console.error('Error saving user:', err);
            const errPrompt = getPrompt('ERR_GENERIC', language);
            await speak(errPrompt);
            setAuthState(AUTH_STATES.ERROR);
        }
    };

    // Back navigation: from name step → restart voice login from beginning
    const handleGoBackFromName = async () => {
        stopListening();
        setUserName('');
        setAgeError('');
        const msg = language === 'hi-IN'
            ? 'ठीक है, फिर से शुरू करते हैं।'
            : 'Okay, let\'s start over.';
        await speak(msg);
        startVoiceLogin();
    };

    // Back navigation: from age step → go back to name step
    const handleGoBackFromAge = async () => {
        stopListening();
        setUserAge(null);
        setAgeError('');
        setAuthState(AUTH_STATES.ASKING_NAME);
        const askNamePrompt = getPrompt('ASK_NAME', language);
        await speak(askNamePrompt);
        setTimeout(() => {
            setAuthState(AUTH_STATES.LISTENING_NAME);
            startListening();
        }, 1400);
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
            className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 pb-40 overflow-hidden bg-[#0a0a0a]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] rounded-full bg-orange-500/20 blur-[120px] mix-blend-screen"
                    animate={{ x: [0, 40, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full bg-violet-500/15 blur-[120px] mix-blend-screen"
                    animate={{ x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />
            </div>

            {/* Hidden reCAPTCHA container */}
            <div id="recaptcha-container" ref={recaptchaContainerRef} className="z-10" />

            {/* OTP Waiting Overlay */}
            <OTPWaitingOverlay
                isVisible={authState === AUTH_STATES.WAITING_OTP}
                onVoicePrompt={handleVoicePrompt}
                remainingTime={remainingTime}
                language={language}
            />

            <div className="z-10 w-full max-w-sm flex flex-col items-center relative">
                {/* Logo with 3D Float effect */}
                <motion.div
                    className="relative w-28 h-28 mb-6"
                    initial={{ scale: 0, opacity: 0, rotateY: 90 }}
                    animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                >
                    <div className="absolute inset-0 bg-orange-500/30 blur-2xl rounded-full" />
                    <img src="/logo.png" alt="SaarthiRx" className="w-full h-full object-contain relative z-10 drop-shadow-2xl" />
                </motion.div>

                {/* Typography with deep elegant contrast */}
                <motion.h1
                    className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 tracking-tight mb-3 text-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                >
                    {getPrompt('TITLE_LOGIN', language, { default: 'Login' })}
                </motion.h1>
                <motion.p
                    className="text-lg sm:text-xl text-white/50 font-medium tracking-wide mb-10 text-center uppercase"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                >
                    {getPrompt('SUBTITLE_LOGIN', language, { default: 'Voice Powered' })}
                </motion.p>

                {/* Main Content Area - Glassmorphism Panel */}
                <div className="w-full relative">
                    <AnimatePresence mode="wait">
                        {/* IDLE State - Start Button */}
                        {authState === AUTH_STATES.IDLE && (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="w-full"
                            >
                                <motion.button
                                    onClick={startVoiceLogin}
                                    className="relative w-full overflow-hidden group p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col items-center justify-center gap-4 transition-all"
                                    whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)" }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    
                                    <motion.div
                                        className="relative w-20 h-20 rounded-full flex items-center justify-center before:absolute before:inset-0 before:rounded-full before:bg-orange-500/20 before:blur-xl"
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full opacity-80 backdrop-blur-sm" />
                                        <svg className="w-8 h-8 text-white relative z-10 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                        </svg>
                                    </motion.div>
                                    <span className="text-xl font-semibold text-white/90 tracking-wide relative z-10 drop-shadow-sm">
                                        {getPrompt('START_LOGIN', language, { default: 'Start Login' })}
                                    </span>
                                </motion.button>
                            </motion.div>
                        )}

                        {/* LISTENING State */}
                        {(authState === AUTH_STATES.LISTENING_NUMBER || authState === AUTH_STATES.ASKING_NUMBER) && (
                            <motion.div
                                key="listening"
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                                className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent pointer-events-none" />
                                <motion.div
                                    className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center"
                                >
                                    <motion.div 
                                        className="absolute inset-0 bg-orange-500/30 rounded-full blur-xl"
                                        animate={{ scale: isListening ? [1, 1.5, 1] : 1, opacity: isListening ? [0.3, 0.6, 0.3] : 0.3 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <div className="absolute inset-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full" />
                                    <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                    </svg>
                                </motion.div>

                                <p className="text-xl font-medium text-white/90 mb-6 tracking-wide drop-shadow-md">{getPrompt('LISTENING', language, { default: 'Listening...' })}</p>

                                {phoneNumber && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-black/30 border border-white/5 p-4 rounded-2xl relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                                        <p className="text-3xl font-bold text-orange-400 tracking-widest drop-shadow-xl">
                                            {phoneNumber}
                                        </p>
                                        <p className="text-sm font-medium text-white/40 mt-2 tracking-widest uppercase">
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
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
                                <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />
                                    <div className="absolute inset-1 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full" />
                                    <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-2xl font-bold text-white tracking-wider mb-2">{formattedPhone}</p>
                                <p className="text-white/60 font-medium tracking-wide">{getPrompt('SENDING_CODE', language)}</p>
                            </motion.div>
                        )}

                        {/* SENDING OTP State */}
                        {authState === AUTH_STATES.SENDING_OTP && (
                            <motion.div
                                key="sending"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-center relative overflow-hidden"
                            >
                                <div className="relative w-20 h-20 mx-auto mb-6">
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-[3px] border-orange-500/20"
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-[3px] border-orange-500 border-t-transparent"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                </div>
                                <p className="text-xl font-medium text-white/90 tracking-wide">{getPrompt('SENDING_CODE', language)}</p>
                            </motion.div>
                        )}

                        {/* FALLBACK Voice OTP Input */}
                        {authState === AUTH_STATES.FALLBACK_VOICE && (
                            <motion.div
                                key="fallback"
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                                className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
                                <motion.div
                                    className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center"
                                >
                                    <motion.div 
                                        className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl"
                                        animate={{ scale: isListening ? [1, 1.5, 1] : 1, opacity: isListening ? [0.3, 0.6, 0.3] : 0.3 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <div className="absolute inset-2 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full" />
                                    <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                    </svg>
                                </motion.div>

                                <p className="text-xl font-medium text-white/90 mb-6 tracking-wide drop-shadow-md">{getPrompt('FALLBACK_ASK_CODE', language)}</p>

                                {otpCode && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-black/30 border border-white/5 p-4 rounded-2xl"
                                    >
                                        <p className="text-4xl font-bold text-blue-400 tracking-[0.5em] ml-2 drop-shadow-xl">
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
                                className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
                                <div className="relative w-20 h-20 mx-auto mb-6">
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20"
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-[3px] border-emerald-500 border-t-transparent"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                </div>
                                <p className="text-xl font-medium text-white/90 tracking-wide drop-shadow-md">{getPrompt('VERIFYING_CODE', language)}</p>
                            </motion.div>
                        )}

                        {/* ASKING NAME State */}
                        {(authState === AUTH_STATES.ASKING_NAME || authState === AUTH_STATES.LISTENING_NAME) && (
                            <motion.div
                                key="askingName"
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                                className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-rose-500/10 to-transparent pointer-events-none" />
                                <motion.div
                                    className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center"
                                >
                                    <motion.div 
                                        className="absolute inset-0 bg-rose-500/30 rounded-full blur-xl"
                                        animate={{ scale: isListening ? [1, 1.5, 1] : 1, opacity: isListening ? [0.3, 0.6, 0.3] : 0.3 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <div className="absolute inset-2 bg-gradient-to-br from-rose-400 to-pink-600 rounded-full flex items-center justify-center" />
                                    <span className="text-4xl relative z-10 drop-shadow-lg">👋</span>
                                </motion.div>

                                <p className="text-xl font-medium text-white/90 mb-6 tracking-wide drop-shadow-md">{getPrompt('ASK_NAME', language)}</p>

                                {userName && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-3xl font-bold flex flex-col items-center justify-center"
                                    >
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-200 to-pink-300 drop-shadow-md">
                                            {userName}
                                        </span>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* SUCCESS State */}
                        {authState === AUTH_STATES.SUCCESS && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent pointer-events-none" />
                                <motion.div
                                    className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                >
                                    <div className="absolute inset-0 bg-emerald-500/40 blur-2xl rounded-full" />
                                    <div className="absolute inset-1 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full" />
                                    <svg className="w-12 h-12 text-white relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </motion.div>
                                <p className="text-2xl font-bold text-white tracking-wide">{getPrompt('LOGIN_SUCCESS', language)}</p>
                            </motion.div>
                        )}

                        {/* ERROR State */}
                        {authState === AUTH_STATES.ERROR && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/5 backdrop-blur-2xl border border-red-500/20 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(239,68,68,0.2)] text-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent pointer-events-none" />
                                <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                                    <div className="absolute inset-2 bg-gradient-to-br from-red-400/20 to-red-600/20 border border-red-500/30 rounded-full" />
                                    <svg className="w-10 h-10 text-red-400 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-red-300 font-medium tracking-wide mb-6 drop-shadow-sm">{error}</p>
                                <motion.button
                                    onClick={handleRetry}
                                    className="w-full relative overflow-hidden group px-6 py-4 rounded-xl bg-white/5 border border-white/10 font-semibold text-white tracking-wide transition-all"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative z-10 drop-shadow-sm">{getPrompt('RETRY', language, { default: 'Retry' })}</span>
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Listening Indicator - Floats above */}
            {isListening && (
                <motion.div
                    className="fixed bottom-[120px] inset-x-0 mx-auto w-max z-40 px-4 pointer-events-none"
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    <div className="relative overflow-hidden bg-white/10 backdrop-blur-3xl border border-white/20 text-white px-8 py-4 rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] flex items-center gap-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-purple-500/20 opacity-50" />
                        <motion.div
                            className="w-4 h-4 bg-orange-400 rounded-full shadow-[0_0_15px_rgba(251,146,60,0.8)]"
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className="font-semibold tracking-wider text-xl drop-shadow-md z-10 relative">
                            {getPrompt('LISTENING', language, { default: 'Listening...' })}
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Global Action Button (Wait, should be above gradient or outside main div? keeping it inside as before) */}
            <GlobalActionButton isActive={isListening} />
        </motion.div>
    );
};

export default Login;
