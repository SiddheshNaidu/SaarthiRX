import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

export const useVoice = () => {
    const { language, currentPageContent } = useApp();
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const speechQueueRef = useRef([]);
    const currentUtteranceRef = useRef(null);

    const silenceTimerRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language;

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcriptPiece;
                    }
                }
                if (finalTranscript) {
                    setTranscript(finalTranscript.trim());
                }

                // Auto-stop detection: Reset timer on every result (speech detected)
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                // 1.5 seconds of silence stops the listener (faster for elderly)
                silenceTimerRef.current = setTimeout(() => {
                    console.log('🤫 Silence detected, auto-stopping mic...');
                    // Success haptic chime: [50, 50] pattern
                    triggerHaptic([50, 50]);
                    if (recognitionRef.current) recognitionRef.current.stop();
                }, 1500);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setError(event.error);
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognition.onend = () => {
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognitionRef.current = recognition;
        } else {
            setError('Speech recognition not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [language]);

    // Start listening
    const startListening = useCallback(() => {
        // STRICT MUTEX: Do not allow listening if speaking
        if (isSpeaking) {
            console.warn('🔇 Mic blocked: TTS is currently active');
            return;
        }

        if (recognitionRef.current && !isListening) {
            setTranscript('');
            setError(null);
            try {
                recognitionRef.current.start();

                // Start a 5-second "no speech" timeout
                // If user doesn't say anything, auto-stop after 5 seconds
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    console.log('⏱️ No speech detected for 5s, auto-stopping...');
                    if (recognitionRef.current) recognitionRef.current.stop();
                }, 5000);

            } catch (err) {
                console.error('Error starting recognition:', err);
            }
        }
    }, [isListening, isSpeaking]);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current) { // && isListening removed to allow force stop
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore error if already stopped
            }
        }
    }, []); // Removed dependency on isListening to allow force stop anytime

    // Text-to-Speech function
    const speak = useCallback((text, options = {}) => {
        return new Promise((resolve, reject) => {
            if (!text) {
                resolve();
                return;
            }

            // STRICT MUTEX: Stop listening the microsecond speak is called
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                    setIsListening(false);
                    console.log('🛑 Mic forced off for TTS');
                } catch (e) {
                    console.warn('Error stopping mic for TTS:', e);
                }
            }

            // Cancel any ongoing speech
            synthRef.current.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = options.lang || language;
            utterance.rate = options.rate || 0.9;
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || 1;

            // Select appropriate voice
            const voices = synthRef.current.getVoices();
            const preferredVoice = voices.find(voice => voice.lang === utterance.lang);
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            utterance.onstart = () => {
                setIsSpeaking(true);
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                currentUtteranceRef.current = null;
                resolve();
            };

            utterance.onerror = (event) => {
                setIsSpeaking(false);
                currentUtteranceRef.current = null;
                console.error('Speech synthesis error:', event);

                // Resolve anyway to prevent hanging
                resolve();
            };

            currentUtteranceRef.current = utterance;
            synthRef.current.speak(utterance);
        });
    }, [language]);

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        synthRef.current.cancel();
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
    }, []);

    // Repeat current page content
    const repeatContent = useCallback(() => {
        if (currentPageContent) {
            speak(currentPageContent);
        }
    }, [currentPageContent, speak]);

    // Parse voice commands
    const parseCommand = useCallback((text) => {
        const lowerText = text.toLowerCase();

        // Home command
        if (lowerText.includes('home') || lowerText.includes('होम') || lowerText.includes('घर')) {
            return { type: 'NAVIGATE', target: '/dashboard' };
        }

        // Scan command
        if (lowerText.includes('scan') || lowerText.includes('स्कैन') || lowerText.includes('स्कॅन')) {
            return { type: 'NAVIGATE', target: '/scan' };
        }

        // Repeat command
        if (lowerText.includes('repeat') || lowerText.includes('दोहराएं') || lowerText.includes('पुन्हा')) {
            return { type: 'REPEAT' };
        }

        // Yes/No commands
        if (lowerText.includes('yes') || lowerText.includes('हां') || lowerText.includes('हो')) {
            return { type: 'CONFIRM', value: true };
        }

        if (lowerText.includes('no') || lowerText.includes('नहीं') || lowerText.includes('नाही')) {
            return { type: 'CONFIRM', value: false };
        }

        return { type: 'UNKNOWN', text };
    }, []);

    // Reset transcript for clean state between inputs
    const resetTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    return {
        isListening,
        isSpeaking,
        transcript,
        error,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        repeatContent,
        parseCommand,
        resetTranscript,
    };
};
