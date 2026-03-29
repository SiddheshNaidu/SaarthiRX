import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useVoice } from './VoiceContext';
import { useApp } from './AppContext';

const VoiceButlerContext = createContext();

export const useVoiceButler = () => {
    const context = useContext(VoiceButlerContext);
    if (!context) {
        throw new Error('useVoiceButler must be used within VoiceButlerProvider');
    }
    return context;
};

export const VoiceButlerProvider = ({ children }) => {
    const { speak, startListening } = useVoice();
    const { language } = useApp();
    const [isAutoListening, setIsAutoListening] = useState(false);
    const [lastSpeechTime, setLastSpeechTime] = useState(null);

    // Auto-activate mic after TTS with 500ms delay (reduced for elderly)
    const announcePageAndAction = useCallback(async (pageName, primaryAction, autoActivateMic = true) => {
        const announcement = `${pageName}. ${primaryAction}`;

        try {
            await speak(announcement);

            if (autoActivateMic) {
                // Echo Buffer: 500ms delay after TTS ends (faster response)
                setTimeout(() => {
                    setIsAutoListening(true);
                    setLastSpeechTime(Date.now());
                    if (startListening) {
                        startListening();
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Voice butler error:', error);
        }
    }, [speak, startListening]);

    // 8-second timeout prompt
    useEffect(() => {
        if (!isAutoListening || !lastSpeechTime) return;

        const timeoutId = setTimeout(() => {
            // If still listening and no voice detected after 8s
            speak("I'm listening. Please speak now");
        }, 8000);

        return () => clearTimeout(timeoutId);
    }, [isAutoListening, lastSpeechTime, speak]);

    // Announce with multi-language support
    const announceMultiLang = useCallback(async (messages, autoActivateMic = true) => {
        const message = messages[language] || messages['en-US'];
        await speak(message);

        if (autoActivateMic) {
            // Echo Buffer: 500ms delay (faster response)
            setTimeout(() => {
                setIsAutoListening(true);
                setLastSpeechTime(Date.now());
                if (startListening) {
                    startListening();
                }
            }, 500);
        }
    }, [speak, language, startListening]);

    // Quick announcement without auto-activation
    const announce = useCallback(async (text) => {
        await speak(text);
    }, [speak]);

    // Stop auto-listening
    const stopAutoListening = useCallback(() => {
        setIsAutoListening(false);
        setLastSpeechTime(null);
    }, []);

    const value = {
        announcePageAndAction,
        announceMultiLang,
        announce,
        isAutoListening,
        stopAutoListening,
    };

    return (
        <VoiceButlerContext.Provider value={value}>
            {children}
        </VoiceButlerContext.Provider>
    );
};
