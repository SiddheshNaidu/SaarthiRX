import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoice } from '../context/VoiceContext';
import { triggerSuccess, triggerAction, triggerAlert } from '../utils/haptics';
import { validateIndianPhone } from '../utils/phoneValidation';
import { parseSpokenAge, parseSpokenPhone } from '../utils/numberParser';
import { slideUpTransition } from '../utils/animations';
import DualActionButtons from '../components/DualActionButtons';
import { setupRecaptcha, sendOtp, verifyOtp, getAuthErrorMessage } from '../services/authService';
import { getUserFromFirestore, saveUserToFirestore, isProfileComplete } from '../services/userService';

// Elder-friendly UI translations
const uiTranslations = {
    'en-US': {
        stepOf: 'Step {current} of {total}',
        tapMic: 'Tap mic to speak or type below',
        next: 'Next ➔',
        complete: 'Done ✓',
        male: 'Male',
        female: 'Female',
        other: 'Other',
        enterOtp: 'Enter 6-digit OTP',
        sendingOtp: 'Sending OTP...',
        verifyingOtp: 'Verifying...',
        savingProfile: 'Saving your profile...',
        otpSent: 'OTP sent to your phone!',
        welcomeBack: 'Welcome back!'
    },
    'hi-IN': {
        stepOf: 'चरण {current} / {total}',
        tapMic: 'बोलने के लिए माइक दबाएं या नीचे टाइप करें',
        next: 'आगे ➔',
        complete: 'हो गया ✓',
        male: 'पुरुष',
        female: 'महिला',
        other: 'अन्य',
        enterOtp: '6 अंकों का OTP दर्ज करें',
        sendingOtp: 'OTP भेज रहे हैं...',
        verifyingOtp: 'जाँच हो रही है...',
        savingProfile: 'आपकी प्रोफ़ाइल सहेज रहे हैं...',
        otpSent: 'आपके फ़ोन पर OTP भेजा गया!',
        welcomeBack: 'वापस स्वागत है!'
    },
    'mr-IN': {
        stepOf: 'चरण {current} / {total}',
        tapMic: 'बोलण्यासाठी माइक दाबा किंवा खाली टाइप करा',
        next: 'पुढे ➔',
        complete: 'झालं ✓',
        male: 'पुरुष',
        female: 'महिला',
        other: 'इतर',
        enterOtp: '6 अंकी OTP टाका',
        sendingOtp: 'OTP पाठवत आहे...',
        verifyingOtp: 'तपासत आहे...',
        savingProfile: 'तुमची प्रोफाइल सेव करत आहे...',
        otpSent: 'तुमच्या फोनवर OTP पाठवला!',
        welcomeBack: 'परत स्वागत आहे!'
    }
};

// Localized gender options
const getGenderOptions = (lang) => {
    const t = uiTranslations[lang] || uiTranslations['en-US'];
    return [
        { value: 'Male', label: t.male },
        { value: 'Female', label: t.female },
        { value: 'Other', label: t.other }
    ];
};

// Questions for new user registration (phone and OTP are always asked)
const questions = [
    { id: 'phone', text: { 'en-US': 'What is your phone number?', 'hi-IN': 'आपका फोन नंबर क्या है?', 'mr-IN': 'तुमचा फोन नंबर काय आहे?' } },
    { id: 'otp', text: { 'en-US': 'Enter the OTP sent to your phone', 'hi-IN': 'आपके फोन पर भेजा गया OTP दर्ज करें', 'mr-IN': 'तुमच्या फोनवर पाठवलेला OTP टाका' } },
    { id: 'name', text: { 'en-US': 'What is your name?', 'hi-IN': 'आपका नाम क्या है?', 'mr-IN': 'तुमचे नाव काय आहे?' }, newUserOnly: true },
    { id: 'gender', text: { 'en-US': 'Are you Male or Female?', 'hi-IN': 'आप पुरुष हैं या महिला?', 'mr-IN': 'तुम्ही पुरुष आहात की स्त्री?' }, hasOptions: true, newUserOnly: true },
    { id: 'age', text: { 'en-US': 'How old are you?', 'hi-IN': 'आपकी उम्र क्या है?', 'mr-IN': 'तुमचे वय किती आहे?' }, newUserOnly: true }
];

const Register = () => {
    const navigate = useNavigate();
    const { language, saveUser, setLanguage } = useApp();
    const { transcript, resetTranscript, isListening, isSpeaking, speak, stopListening } = useVoice();

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [tempAnswer, setTempAnswer] = useState('');
    const [validationError, setValidationError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isNewUser, setIsNewUser] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState(null);

    const hasSpokenRef = useRef(false);
    const recaptchaInitialized = useRef(false);

    // Get translations for current language
    const t = uiTranslations[language] || uiTranslations['en-US'];
    const genderOptions = getGenderOptions(language);

    // Filter questions based on user status
    const activeQuestions = questions.filter(q => !q.newUserOnly || isNewUser);
    const progress = ((currentQuestion + 1) / activeQuestions.length) * 100;
    const question = activeQuestions[currentQuestion];
    const questionText = question?.text[language] || question?.text['en-US'];

    // Format step text
    const stepText = t.stepOf
        .replace('{current}', currentQuestion + 1)
        .replace('{total}', activeQuestions.length);

    // Initialize reCAPTCHA on mount
    useEffect(() => {
        if (!recaptchaInitialized.current) {
            try {
                setupRecaptcha('recaptcha-container');
                recaptchaInitialized.current = true;
            } catch (error) {
                console.error('reCAPTCHA setup error:', error);
            }
        }
    }, []);

    // Auto-speak question on load and when question changes
    useEffect(() => {
        if (!question) return;

        const timer = setTimeout(() => {
            speak(questionText);
        }, currentQuestion === 0 && !hasSpokenRef.current ? 800 : 300);
        hasSpokenRef.current = true;
        return () => clearTimeout(timer);
    }, [currentQuestion, questionText, speak, question]);

    // Track previous listening state for auto-advance
    const prevListeningRef = useRef(isListening);
    const autoAdvanceRef = useRef(null);

    // Capture voice input
    useEffect(() => {
        if (transcript) {
            // Remove spaces for phone/otp/age fields (elder-friendly)
            let cleanedTranscript = transcript;
            if (question?.id === 'phone' || question?.id === 'otp' || question?.id === 'age') {
                cleanedTranscript = transcript.replace(/\s+/g, '');
            }
            setTempAnswer(cleanedTranscript);
        }
    }, [transcript, question?.id]);

    // Auto-advance when mic stops AND we have a valid transcript
    useEffect(() => {
        const wasListening = prevListeningRef.current;
        prevListeningRef.current = isListening;

        // Mic just stopped (was listening, now not listening)
        if (wasListening && !isListening && tempAnswer && !isLoading) {
            // Clear any existing auto-advance timer
            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);

            // Auto-advance after 1.5s delay (gives elderly user time to see their input)
            autoAdvanceRef.current = setTimeout(() => {
                console.log('🚀 Auto-advancing after voice input...');
                handleNextRef.current?.();
            }, 1500);
        }

        return () => {
            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        };
    }, [isListening, tempAnswer, isLoading]);

    // Ref to handleNext for auto-advance (avoids stale closure)
    const handleNextRef = useRef(null);


    // Handle repeat question (speaker button)
    const handleRepeat = () => {
        speak(questionText);
    };

    // Handle sending OTP
    const handleSendOtp = async (phoneNumber) => {
        setIsLoading(true);
        setLoadingMessage(t.sendingOtp);

        try {
            await sendOtp(phoneNumber);
            triggerSuccess();
            speak(t.otpSent);
            return true;
        } catch (error) {
            triggerAlert();
            const errorMsg = getAuthErrorMessage(error, language);
            speak(errorMsg);
            setValidationError(errorMsg);

            // Re-initialize reCAPTCHA
            try {
                setupRecaptcha('recaptcha-container');
            } catch (e) {
                console.error('reCAPTCHA re-init error:', e);
            }

            return false;
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    // Handle verifying OTP
    const handleVerifyOtp = async (otp) => {
        setIsLoading(true);
        setLoadingMessage(t.verifyingOtp);

        try {
            const user = await verifyOtp(otp);
            setFirebaseUser(user);
            triggerSuccess();

            // Check if user profile exists in Firestore
            const existingProfile = await getUserFromFirestore(user.uid);

            if (existingProfile && isProfileComplete(existingProfile)) {
                // Returning user - load profile and go to dashboard
                setIsNewUser(false);
                speak(t.welcomeBack);

                // IMPORTANT: Keep user's CURRENT language selection, don't override
                // Only use saved language if user hasn't already selected one this session
                // (Language is already set from Welcome page)

                // Save to context and localStorage
                saveUser(existingProfile);

                // Navigate to dashboard after brief delay
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1500);

                return false; // Don't continue to next question
            } else {
                // New user - continue with profile questions
                setIsNewUser(true);
                return true;
            }
        } catch (error) {
            triggerAlert();
            const errorMsg = getAuthErrorMessage(error, language);
            speak(errorMsg);
            setValidationError(errorMsg);
            return false;
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    // Handle saving profile to Firestore
    const handleSaveProfile = async (userData) => {
        setIsLoading(true);
        setLoadingMessage(t.savingProfile);

        try {
            const profileData = {
                ...userData,
                language // Store current language preference
            };

            await saveUserToFirestore(firebaseUser.uid, profileData);

            // Save to context and localStorage
            saveUser(profileData);

            triggerSuccess();
            navigate('/dashboard');
        } catch (error) {
            console.error('Error saving profile:', error);
            triggerAlert();
            // Still navigate - data is in localStorage at least
            saveUser(userData);
            navigate('/dashboard');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleNext = async () => {
        if (!tempAnswer || isLoading) return;

        let processedAnswer = tempAnswer;

        // Parse numbers for phone, otp and age fields
        if (question.id === 'phone') {
            processedAnswer = parseSpokenPhone(tempAnswer, language);
            const validation = validateIndianPhone(processedAnswer);

            if (!validation.isValid) {
                triggerAlert();
                const errorMessages = {
                    'en-US': "That doesn't look like a valid 10-digit number. Please try again.",
                    'hi-IN': "यह वैध 10 अंकों का नंबर नहीं लगता। कृपया फिर से प्रयास करें।",
                    'mr-IN': "हा वैध 10 अंकी नंबर वाटत नाही. कृपया पुन्हा प्रयत्न करा."
                };
                speak(errorMessages[language] || errorMessages['en-US']);
                setValidationError(validation.error);
                setTempAnswer('');
                resetTranscript();
                return;
            }
            processedAnswer = validation.formatted;

            // Send OTP
            const success = await handleSendOtp(processedAnswer);
            if (!success) {
                setTempAnswer('');
                resetTranscript();
                return;
            }
        } else if (question.id === 'otp') {
            // Extract only digits from OTP input
            const otpDigits = tempAnswer.replace(/\D/g, '');
            if (otpDigits.length !== 6) {
                triggerAlert();
                const errorMessages = {
                    'en-US': "Please enter a valid 6-digit OTP.",
                    'hi-IN': "कृपया 6 अंकों का OTP दर्ज करें।",
                    'mr-IN': "कृपया 6 अंकी OTP टाका."
                };
                speak(errorMessages[language] || errorMessages['en-US']);
                setValidationError('Please enter a 6-digit OTP');
                setTempAnswer('');
                resetTranscript();
                return;
            }
            processedAnswer = otpDigits;

            // Verify OTP
            const shouldContinue = await handleVerifyOtp(processedAnswer);
            if (!shouldContinue) {
                // Either error or returning user (navigating to dashboard)
                if (!firebaseUser) {
                    setTempAnswer('');
                    resetTranscript();
                }
                return;
            }
        } else if (question.id === 'age') {
            processedAnswer = parseSpokenAge(tempAnswer, language);
            const age = parseInt(processedAnswer, 10);
            if (isNaN(age) || age < 1 || age > 120) {
                triggerAlert();
                const errorMessages = {
                    'en-US': "Please tell me a valid age.",
                    'hi-IN': "कृपया सही उम्र बताएं।",
                    'mr-IN': "कृपया योग्य वय सांगा."
                };
                speak(errorMessages[language] || errorMessages['en-US']);
                setValidationError('Please provide a valid age');
                setTempAnswer('');
                resetTranscript();
                return;
            }
        }

        // Store the answer
        const newAnswers = { ...answers, [question.id]: processedAnswer };
        setAnswers(newAnswers);

        triggerSuccess();
        setTempAnswer('');
        resetTranscript();
        setValidationError('');

        if (currentQuestion < activeQuestions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            // Save to Firestore
            await handleSaveProfile(newAnswers);
        }
    };

    // Keep ref updated for auto-advance
    handleNextRef.current = handleNext;

    const handleOptionClick = (option) => {
        triggerAction();
        setTempAnswer(option);
    };

    const handleInputChange = (e) => {
        let value = e.target.value;
        // Remove spaces for phone/otp/age fields
        if (question?.id === 'phone' || question?.id === 'otp' || question?.id === 'age') {
            value = value.replace(/\s+/g, '');
        }
        setTempAnswer(value);
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col p-6 pb-40 relative overflow-y-auto"
            {...slideUpTransition}
        >
            {/* reCAPTCHA Container - Invisible */}
            <div id="recaptcha-container"></div>

            {/* Loading Overlay */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl p-8 shadow-premium-lg flex flex-col items-center"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                        >
                            <motion.div
                                className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            <p className="mt-4 text-xl font-medium text-gray-700">{loadingMessage}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary-light"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
                <motion.p
                    className="text-sm text-gray-500 mt-2 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {stepText}
                </motion.p>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                {question && (
                    <motion.div
                        key={currentQuestion}
                        className="flex-1 flex flex-col justify-center"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Question Text */}
                        <div className="text-center mb-8">
                            <motion.h2
                                className="text-3xl md:text-4xl font-display font-bold text-gray-800 mb-4"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                {questionText}
                            </motion.h2>
                        </div>

                        {/* Answer Input */}
                        {question.hasOptions ? (
                            /* Multiple Choice Options - Localized */
                            <div className="space-y-3 mb-8">
                                {genderOptions.map((option) => (
                                    <motion.button
                                        key={option.value}
                                        onClick={() => handleOptionClick(option.value)}
                                        className={`
                                            w-full min-h-button p-4 rounded-xl
                                            border-2 transition-all
                                            ${tempAnswer === option.value
                                                ? 'border-primary bg-primary text-white shadow-premium'
                                                : 'border-gray-300 bg-white text-gray-800 hover:border-primary'
                                            }
                                        `}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="text-2xl font-medium">{option.label}</div>
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            /* Text/Voice Input */
                            <div className="mb-8">
                                <motion.input
                                    type={question.id === 'otp' ? 'tel' : 'text'}
                                    inputMode={question.id === 'phone' || question.id === 'otp' || question.id === 'age' ? 'numeric' : 'text'}
                                    value={tempAnswer}
                                    onChange={handleInputChange}
                                    placeholder={question.id === 'otp' ? t.enterOtp : t.tapMic}
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-2xl md:text-3xl font-medium text-gray-800 text-center focus:border-primary focus:outline-none transition-colors"
                                    animate={tempAnswer ? { borderColor: '#FF8C00' } : {}}
                                    maxLength={question.id === 'otp' ? 6 : question.id === 'phone' ? 10 : undefined}
                                />
                            </div>
                        )}

                        {/* Validation Error */}
                        {validationError && (
                            <motion.div
                                className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <p className="text-xl text-red-700 font-medium">❌ {validationError}</p>
                            </motion.div>
                        )}

                        {/* Next Button - Pulses when input is valid */}
                        <motion.button
                            onClick={handleNext}
                            disabled={!tempAnswer || isLoading}
                            className={`
                                w-full min-h-button rounded-xl font-bold text-2xl
                                transition-all
                                ${tempAnswer && !isLoading
                                    ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-premium'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }
                            `}
                            whileHover={tempAnswer && !isLoading ? { scale: 1.02 } : {}}
                            whileTap={tempAnswer && !isLoading ? { scale: 0.98 } : {}}
                            initial={{ opacity: 0, y: 20 }}
                            animate={tempAnswer && !isLoading ? {
                                opacity: 1,
                                y: 0,
                                scale: [1, 1.03, 1],
                                boxShadow: [
                                    '0 4px 20px rgba(255, 107, 53, 0.3)',
                                    '0 4px 30px rgba(255, 107, 53, 0.5)',
                                    '0 4px 20px rgba(255, 107, 53, 0.3)'
                                ]
                            } : { opacity: 1, y: 0 }}
                            transition={tempAnswer && !isLoading ? {
                                scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                                boxShadow: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                                opacity: { delay: 0.2 },
                                y: { delay: 0.2 }
                            } : { delay: 0.2 }}
                        >
                            {currentQuestion < activeQuestions.length - 1 ? t.next : t.complete}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dark Overlay + Listening Modal - Tap anywhere to dismiss */}
            <AnimatePresence>
                {isListening && (
                    <>
                        {/* Dark Overlay - Click to dismiss */}
                        <motion.div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 cursor-pointer"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={stopListening}
                        />

                        {/* Centered Listening Indicator - Click to dismiss */}
                        <motion.div
                            className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6 cursor-pointer"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={stopListening}
                        >
                            {/* Pulsing Mic Icon */}
                            <motion.div
                                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/20 flex items-center justify-center mb-6"
                                animate={{
                                    scale: [1, 1.1, 1],
                                    boxShadow: [
                                        '0 0 0 0 rgba(255, 107, 53, 0.4)',
                                        '0 0 0 20px rgba(255, 107, 53, 0)',
                                        '0 0 0 0 rgba(255, 107, 53, 0)'
                                    ]
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <span className="text-5xl sm:text-6xl">🎙️</span>
                            </motion.div>

                            {/* Live Transcript Display */}
                            <motion.div
                                className="bg-white/10 backdrop-blur-md px-6 sm:px-8 py-4 rounded-2xl border border-white/20 min-w-[200px] max-w-[80%]"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <p className="text-xl sm:text-2xl text-white font-medium text-center min-h-[32px]">
                                    {transcript || tempAnswer || '...'}
                                </p>
                            </motion.div>

                            {/* Small tap hint at bottom */}
                            <motion.p
                                className="text-sm text-white/50 mt-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 2 }}
                            >
                                Tap to stop
                            </motion.p>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Dual Action Buttons (Speaker + Mic) */}
            <DualActionButtons onRepeat={handleRepeat} />
        </motion.div>
    );
};

export default Register;
