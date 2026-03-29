import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useWebOTP - React hook for automatic SMS OTP capture using WebOTP API
 * 
 * The WebOTP API allows websites to programmatically read SMS messages
 * containing OTP codes. Only works on Chrome for Android 84+.
 * 
 * SMS must be formatted with origin binding:
 * Your SaarthiRx code is: 123456
 * @saarthirx.com #123456
 */
export const useWebOTP = ({
    onReceived,
    onTimeout,
    onError,
    timeoutMs = 30000
}) => {
    const [isListening, setIsListening] = useState(false);
    const [otpCode, setOtpCode] = useState(null);
    const abortControllerRef = useRef(null);
    const timeoutRef = useRef(null);

    // Check if WebOTP API is supported
    const supportsWebOTP = useCallback(() => {
        return 'OTPCredential' in window;
    }, []);

    // Start listening for OTP SMS
    const startListening = useCallback(async () => {
        // Check browser support
        if (!supportsWebOTP()) {
            console.log('WebOTP API not supported in this browser');
            return false;
        }

        // Cleanup any existing listener
        stopListening();

        setIsListening(true);
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        // Set timeout for fallback
        timeoutRef.current = setTimeout(() => {
            console.log('WebOTP timeout reached');
            stopListening();
            if (onTimeout) {
                onTimeout();
            }
        }, timeoutMs);

        try {
            // Request OTP credential
            const content = await navigator.credentials.get({
                otp: { transport: ['sms'] },
                signal
            });

            // Clear timeout since we got a response
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            if (content && content.code) {
                console.log('OTP received via WebOTP:', content.code);
                setOtpCode(content.code);
                setIsListening(false);

                if (onReceived) {
                    onReceived(content.code);
                }

                return content.code;
            }
        } catch (error) {
            // Clear timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            setIsListening(false);

            if (error.name === 'AbortError') {
                // User cancelled or we aborted - not an error
                console.log('WebOTP aborted');
                return null;
            }

            console.error('WebOTP error:', error);
            if (onError) {
                onError(error);
            }
        }

        return null;
    }, [supportsWebOTP, timeoutMs, onReceived, onTimeout, onError]);

    // Stop listening for OTP
    const stopListening = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setIsListening(false);
    }, []);

    // Reset state
    const reset = useCallback(() => {
        stopListening();
        setOtpCode(null);
    }, [stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    return {
        startListening,
        stopListening,
        reset,
        isListening,
        otpCode,
        supportsWebOTP: supportsWebOTP()
    };
};

export default useWebOTP;
