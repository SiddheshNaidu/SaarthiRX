// Shared Framer Motion animation variants for SaarthiRx

export const pageTransition = {
    initial: {
        opacity: 0,
        y: 50
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.6, -0.05, 0.01, 0.99]
        }
    },
    exit: {
        opacity: 0,
        y: -50,
        transition: {
            duration: 0.3
        }
    }
};

export const slideUpTransition = {
    initial: {
        opacity: 0,
        y: 100,
        scale: 0.95
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: [0.6, -0.05, 0.01, 0.99]
        }
    },
    exit: {
        opacity: 0,
        y: -50,
        scale: 0.95,
        transition: {
            duration: 0.3
        }
    }
};

export const cardHover = {
    rest: {
        scale: 1,
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
    },
    hover: {
        scale: 1.03,
        boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
        transition: {
            duration: 0.2,
            ease: "easeOut"
        }
    },
    tap: {
        scale: 0.98
    }
};

export const pulseAnimation = {
    animate: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

export const rippleEffect = {
    initial: {
        scale: 0,
        opacity: 0.6
    },
    animate: {
        scale: 3,
        opacity: 0,
        transition: {
            duration: 0.8,
            ease: "easeOut"
        }
    }
};

export const fadeIn = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.3 }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

export const progressBarAnimation = {
    initial: { width: "0%" },
    animate: (progress) => ({
        width: `${progress}%`,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    })
};

export const floatingAnimation = {
    animate: {
        y: [0, -10, 0],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export const staggerItem = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4
        }
    }
};
