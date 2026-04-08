import React from 'react';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from './AppContext';
import { triggerHaptic } from '../utils/haptics';
import { sanitizeVoiceInput } from '../utils/numberParser';

const VoiceContext = createContext();

export const useVoice = () => {
    const context = useContext(VoiceContext);
    if (!context) {
        throw new Error('useVoice must be used within VoiceProvider');
    }
    return context;
};

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE-AWARE SILENCE TIMEOUTS
// Registration/Login: LONG timeout for elders who speak slowly
// In-app navigation: SHORT timeout for quick command execution
// ═══════════════════════════════════════════════════════════════════════════
const ELDER_FRIENDLY_ROUTES = ['/register', '/login'];
const ELDER_SILENCE_TIMEOUT = 6000;  // 6 seconds for elders on registration
const QUICK_SILENCE_TIMEOUT = 1500;   // 1.5 seconds for in-app navigation
const NO_SPEECH_TIMEOUT = 8000;       // 8 seconds if no speech at all on elder routes

export const VoiceProvider = ({ children }) => {
    const { language, currentPageContent } = useApp();
    const location = useLocation();
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false); // Airlock cool-down
    const [inputType, setInputType] = useState('text'); // 'text', 'tel', 'name'

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const silenceTimerRef = useRef(null);
    const cooldownTimerRef = useRef(null);
    const accumulatedTranscriptRef = useRef(''); // For accumulating speech during registration
    // ─── DEDUPLICATION: track which resultIndex values we've already committed ───
    // Fixes: Chrome/Android fires onresult multiple times for the same final segment
    // when continuous=true, causing digits/words to appear doubled.
    const processedResultIndices = useRef(new Set());

    // Check if current route needs elder-friendly long timeout
    const isElderRoute = ELDER_FRIENDLY_ROUTES.some(r => location.pathname.startsWith(r));
    const currentSilenceTimeout = isElderRoute ? ELDER_SILENCE_TIMEOUT : QUICK_SILENCE_TIMEOUT;

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true; // Keep listening for longer inputs like phone numbers
            recognition.interimResults = true;
            recognition.lang = language;

            recognition.onstart = () => {
                console.log('🎙️ Speech recognition started');
                setIsListening(true);
                setError(null);
                accumulatedTranscriptRef.current = '';   // Reset accumulator on new session
                processedResultIndices.current.clear();  // Reset deduplication set
            };

            recognition.onresult = (event) => {
                // ─── Collect only genuinely NEW results ────────────────────────
                // Chrome/Android bug: with continuous=true, the engine sometimes
                // re-emits already-final segments under a new resultIndex wrap.
                // We guard against this with processedResultIndices.
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const piece = result[0].transcript;

                    if (result.isFinal) {
                        // ── DEDUP GUARD: skip if already processed ──────────
                        if (processedResultIndices.current.has(i)) {
                            console.log(`⚠️ Dedup: skipping already-processed index ${i} ("${piece.trim()}")`);
                            continue;
                        }
                        processedResultIndices.current.add(i);
                        finalTranscript += piece;
                    } else {
                        interimTranscript += piece;
                    }
                }

                // ═══════════════════════════════════════════════════════════════
                // ELDER-FRIENDLY ACCUMULATION AND TYPE FILTERING
                // ═══════════════════════════════════════════════════════════════
                const isElderPage = ELDER_FRIENDLY_ROUTES.some(r =>
                    location.pathname.startsWith(r)
                );

                let filteredFinal = finalTranscript;
                let filteredInterim = interimTranscript;

                // Enforce digit or character only if needed
                if (inputType === 'tel' || inputType === 'age' || inputType === 'numeric') {
                    filteredFinal   = filteredFinal.replace(/\D/g, '');
                    filteredInterim = filteredInterim.replace(/\D/g, '');
                } else if (inputType === 'name' || inputType === 'characters') {
                    filteredFinal   = filteredFinal.replace(/\d/g, '');
                    filteredInterim = filteredInterim.replace(/\d/g, '');
                }

                if (filteredFinal) {
                    if (isElderPage) {
                        // ACCUMULATE: append only NEW final chunks
                        accumulatedTranscriptRef.current =
                            (accumulatedTranscriptRef.current + ' ' + filteredFinal)
                                .replace(/\s+/g, ' ')
                                .trim();
                        console.log('✅ Accumulated transcript:', accumulatedTranscriptRef.current);
                        setTranscript(accumulatedTranscriptRef.current);
                    } else {
                        // REPLACE: use only the latest segment for nav commands
                        console.log('✅ Final transcript:', filteredFinal);
                        setTranscript(filteredFinal.trim());
                    }
                } else if (filteredInterim) {
                    // Show live interim preview (never accumulated, just for display)
                    console.log('📝 Interim:', filteredInterim);
                    if (isElderPage) {
                        // Preview = already-committed text + what's being spoken right now
                        const preview =
                            (accumulatedTranscriptRef.current + ' ' + filteredInterim)
                                .replace(/\s+/g, ' ')
                                .trim();
                        setTranscript(preview);
                    } else {
                        setTranscript(filteredInterim.trim());
                    }
                }

                // Auto-stop: reset silence timer on every speech event
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                const timeout = isElderPage ? ELDER_SILENCE_TIMEOUT : QUICK_SILENCE_TIMEOUT;
                silenceTimerRef.current = setTimeout(() => {
                    console.log(`🤫 Silence detected (${timeout}ms), auto-stopping mic...`);
                    triggerHaptic([50, 50]);
                    if (recognitionRef.current) {
                        try { recognitionRef.current.stop(); } catch (e) { }
                    }
                }, timeout);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setError(event.error);
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognition.onend = () => {
                console.log('🛑 Speech recognition ended');
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognitionRef.current = recognition;
        } else {
            setError('Speech recognition not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [language, location.pathname]);

    // AIRLOCK PROTOCOL: Reset voice state on route change
    useEffect(() => {
        console.log('🚪 Route changed to:', location.pathname);
        
        // Kill any active TTS and mic
        if (synthRef.current) synthRef.current.cancel();
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) { }
        }
        
        // Clear transcript buffer AND accumulator
        setTranscript('');
        accumulatedTranscriptRef.current = '';
        setIsListening(false);
        setIsSpeaking(false);
        
        // Enable 500ms cool-down "dead zone"
        setIsProcessing(true);
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
            setIsProcessing(false);
            console.log('✅ Airlock cool-down complete, mic ready');
        }, 500);
        
        return () => {
            if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        };
    }, [location.pathname]);

    // Start listening
    const startListening = useCallback(() => {
        // MUTEX: Don't allow listening while speaking
        if (isSpeaking) {
            console.warn('🔇 Mic blocked: TTS is currently active');
            return;
        }
        
        // AIRLOCK: Block during cool-down period
        if (isProcessing) {
            console.warn('🔇 Mic blocked: Airlock cool-down active');
            return;
        }

        if (recognitionRef.current && !isListening) {
            setTranscript('');
            accumulatedTranscriptRef.current = '';      // Clear accumulator
            processedResultIndices.current.clear();     // Clear dedup set for fresh session
            setError(null);
            try {
                recognitionRef.current.start();
                console.log(`🎙️ Started listening (timeout: ${isElderRoute ? 'ELDER' : 'QUICK'})...`);

                // Start "no speech" timeout - longer for elder routes
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                const noSpeechTimeout = isElderRoute ? NO_SPEECH_TIMEOUT : 5000;
                silenceTimerRef.current = setTimeout(() => {
                    console.log(`⏱️ No speech detected for ${noSpeechTimeout/1000}s, auto-stopping...`);
                    triggerHaptic([30, 30]); // Soft haptic for timeout
                    if (recognitionRef.current) {
                        try {
                            recognitionRef.current.stop();
                        } catch (e) { }
                    }
                }, noSpeechTimeout);

            } catch (err) {
                console.error('Error starting recognition:', err);
            }
        }
    }, [isListening, isSpeaking, isProcessing, isElderRoute]);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch (e) { }
        }
    }, [isListening]);

    // Reset transcript
    const resetTranscript = useCallback(() => {
        setTranscript('');
        accumulatedTranscriptRef.current = '';
        processedResultIndices.current.clear(); // Also clear dedup set on manual reset
    }, []);

    // Text-to-Speech function
    const speak = useCallback((text, options = {}) => {
        return new Promise((resolve, reject) => {
            if (!text) {
                resolve();
                return;
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
                resolve();
            };

            utterance.onerror = (event) => {
                setIsSpeaking(false);
                if (event.error === 'not-allowed') {
                    console.warn('⚠️ Speech blocked by browser autoplay policy. User interaction required.');
                } else if (event.error === 'interrupted' || event.error === 'canceled') {
                    // This is expected when we call cancel() programmatically
                    // We don't need to log this as an error
                } else {
                    console.error('Speech synthesis error:', event);
                }
                resolve(); // Just resolve to keep flow moving
            };

            synthRef.current.speak(utterance);
        });
    }, [language]);

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        synthRef.current.cancel();
        setIsSpeaking(false);
    }, []);

    // Repeat current page content
    const repeatContent = useCallback(() => {
        if (currentPageContent) {
            speak(currentPageContent);
        }
    }, [currentPageContent, speak]);

    const value = {
        isListening,
        isSpeaking,
        isProcessing,
        transcript,
        error,
        inputType,
        setInputType,
        startListening,
        stopListening,
        resetTranscript,
        speak,
        stopSpeaking,
        repeatContent,
        sanitizeVoiceInput: (text) => sanitizeVoiceInput(text, inputType, language),
    };

    return (
        <VoiceContext.Provider value={value}>
            {children}
        </VoiceContext.Provider>
    );
};
