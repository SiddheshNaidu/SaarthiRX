// Premium Haptic Signatures for SaarthiRx

export const triggerHaptic = (pattern = 50) => {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

// Success: Light double tap [50, 30, 50]
export const triggerSuccess = () => {
    if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
    }
};

// Alert: Heavy pulse [200, 100, 200]
export const triggerAlert = () => {
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
    }
};

// Action: Quick tap
export const triggerAction = () => {
    if ('vibrate' in navigator) {
        navigator.vibrate(30);
    }
};

// Error: Three short bursts
export const triggerError = () => {
    if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }
};

// Legacy double tap (deprecated)
export const triggerDoubleTap = () => {
    triggerSuccess();
};
