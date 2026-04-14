import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '../context/VoiceContext';
import { triggerAlert } from '../utils/haptics';
import { SEVERITY } from '../services/drugInteractionService';

/**
 * ══════════════════════════════════════════════════════════════════
 * DrugInteractionModal — Full-Screen Elder-First Danger Warning
 * ══════════════════════════════════════════════════════════════════
 * 
 * Covers the ENTIRE screen when a dangerous drug interaction is detected.
 * Designed for partially visually impaired elderly users.
 * NO "add anyway" button — only dismiss and consult doctor.
 */

// ─── Trilingual Content ───────────────────────────────────────────────────────

const CONTENT = {
    title: {
        FATAL: {
            'en-US': '⛔ LIFE THREATENING',
            'hi-IN': '⛔ जानलेवा खतरा',
            'mr-IN': '⛔ जीवघेणा धोका'
        },
        HIGH: {
            'en-US': '⚠️ SERIOUS WARNING',
            'hi-IN': '⚠️ गंभीर चेतावनी',
            'mr-IN': '⚠️ गंभीर इशारा'
        },
        MEDIUM: {
            'en-US': '⚠️ MEDICINE WARNING',
            'hi-IN': '⚠️ दवाई की चेतावनी',
            'mr-IN': '⚠️ औषधाचा इशारा'
        }
    },
    conflict: {
        'en-US': (med, conflict) => `${med} is dangerous with your ${conflict}`,
        'hi-IN': (med, conflict) => `${med} आपकी ${conflict} के साथ खतरनाक है`,
        'mr-IN': (med, conflict) => `${med} तुमच्या ${conflict} सोबत धोकादायक आहे`
    },
    whyLabel: {
        'en-US': 'WHY THIS IS DANGEROUS',
        'hi-IN': 'यह खतरनाक क्यों है',
        'mr-IN': 'हे का धोकादायक आहे'
    },
    whatLabel: {
        'en-US': 'WHAT YOU MUST DO',
        'hi-IN': 'आपको क्या करना चाहिए',
        'mr-IN': 'तुम्ही काय केले पाहिजे'
    },
    notAdded: {
        'en-US': '❌ This medicine was NOT added',
        'hi-IN': '❌ यह दवाई नहीं जोड़ी गई',
        'mr-IN': '❌ हे औषध जोडले गेले नाही'
    },
    doctorAdvice: {
        'en-US': 'Please consult your doctor before taking this medicine',
        'hi-IN': 'कृपया यह दवाई लेने से पहले अपने डॉक्टर से बात करें',
        'mr-IN': 'कृपया हे औषध घेण्यापूर्वी तुमच्या डॉक्टरांशी बोला'
    },
    dismiss: {
        'en-US': 'I Understand — Go Back',
        'hi-IN': 'मैं समझ गया — वापस जाएं',
        'mr-IN': 'मला समजले — मागे जा'
    }
};

// ─── Severity Visual Config ───────────────────────────────────────────────────

const SEVERITY_CONFIG = {
    FATAL: {
        gradient: 'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)',
        buttonColor: '#b91c1c',
        icon: '⛔',
        overlayColor: 'rgba(127, 29, 29, 0.35)'
    },
    HIGH: {
        gradient: 'linear-gradient(180deg, #ea580c 0%, #991b1b 100%)',
        buttonColor: '#ea580c',
        icon: '⚠️',
        overlayColor: 'rgba(234, 88, 12, 0.3)'
    },
    MEDIUM: {
        gradient: 'linear-gradient(180deg, #f97316 0%, #c2410c 100%)',
        buttonColor: '#c2410c',
        icon: '⚠️',
        overlayColor: 'rgba(249, 115, 22, 0.25)'
    }
};

// ─── TTS Message Builder ──────────────────────────────────────────────────────

const buildTTSMessage = (severity, newMedicine, conflictingMedicine, reason, language) => {
    const lang = language || 'en-US';

    if (lang === 'hi-IN') {
        const opening = severity === 'FATAL' ? 'खतरा! जानलेवा दवा संपर्क!' :
            severity === 'HIGH' ? 'गंभीर चेतावनी!' : 'दवाई की चेतावनी!';
        return `${opening} ${newMedicine} आपकी ${conflictingMedicine || 'मौजूदा दवाई'} के साथ खतरनाक है। ${reason || ''} यह दवाई नहीं जोड़ी गई है। कृपया अपने डॉक्टर से बात करें।`;
    }

    if (lang === 'mr-IN') {
        const opening = severity === 'FATAL' ? 'धोका! जीवघेणा औषध संवाद!' :
            severity === 'HIGH' ? 'गंभीर इशारा!' : 'औषधाचा इशारा!';
        return `${opening} ${newMedicine} तुमच्या ${conflictingMedicine || 'सध्याच्या औषधा'} सोबत धोकादायक आहे। ${reason || ''} हे औषध जोडले गेले नाही। कृपया तुमच्या डॉक्टरांशी बोला।`;
    }

    // en-US
    const opening = severity === 'FATAL' ? 'Danger! Life-threatening drug interaction!' :
        severity === 'HIGH' ? 'Serious Warning!' : 'Medicine Warning!';
    return `${opening} ${newMedicine} is dangerous with your ${conflictingMedicine || 'current medicine'}. ${reason || ''} This medicine has NOT been added. Please consult your doctor.`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const DrugInteractionModal = ({
    isVisible,
    severity = 'HIGH',
    newMedicine = '',
    conflictingMedicine = '',
    reason = '',
    precautions = [],
    onDismiss,
    language = 'en-US'
}) => {
    const { speak } = useVoice();
    const hasSpokenRef = useRef(false);

    const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.HIGH;
    const lang = language || 'en-US';

    // ── TTS on visibility ─────────────────────────────────────────
    useEffect(() => {
        if (isVisible && !hasSpokenRef.current) {
            hasSpokenRef.current = true;

            // Delay to let the visual render complete first
            const timer = setTimeout(() => {
                triggerAlert();
                const message = buildTTSMessage(severity, newMedicine, conflictingMedicine, reason, lang);
                speak(message);
            }, 400);

            return () => clearTimeout(timer);
        }

        if (!isVisible) {
            hasSpokenRef.current = false;
        }
    }, [isVisible, severity, newMedicine, conflictingMedicine, reason, lang, speak]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                        background: config.gradient,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {/* Pulsing overlay */}
                    <motion.div
                        animate={{ opacity: [0.1, 0.35, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: config.overlayColor,
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Content */}
                    <div style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '32px 20px',
                        gap: '20px',
                        minHeight: '100vh',
                        boxSizing: 'border-box'
                    }}>
                        {/* Animated Icon */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, -5, 5, 0]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ fontSize: '80px', marginTop: '16px' }}
                        >
                            {config.icon}
                        </motion.div>

                        {/* Severity Title */}
                        <h1 style={{
                            fontSize: 'clamp(28px, 8vw, 48px)',
                            fontWeight: 800,
                            color: '#ffffff',
                            textAlign: 'center',
                            margin: 0,
                            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            lineHeight: 1.2
                        }}>
                            {CONTENT.title[severity]?.[lang] || CONTENT.title.HIGH[lang] || CONTENT.title.HIGH['en-US']}
                        </h1>

                        {/* Conflict Line */}
                        {conflictingMedicine && (
                            <p style={{
                                fontSize: 'clamp(18px, 5vw, 28px)',
                                color: 'rgba(255,255,255,0.95)',
                                textAlign: 'center',
                                margin: 0,
                                fontWeight: 600,
                                lineHeight: 1.4,
                                padding: '0 8px'
                            }}>
                                {CONTENT.conflict[lang]
                                    ? CONTENT.conflict[lang](newMedicine, conflictingMedicine)
                                    : CONTENT.conflict['en-US'](newMedicine, conflictingMedicine)}
                            </p>
                        )}

                        {/* WHY Box */}
                        {reason && (
                            <div style={{
                                width: '100%',
                                maxWidth: '500px',
                                background: 'rgba(0,0,0,0.35)',
                                borderRadius: '16px',
                                padding: '16px 20px',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                <p style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: 'rgba(255,255,255,0.7)',
                                    margin: '0 0 8px 0',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {CONTENT.whyLabel[lang] || CONTENT.whyLabel['en-US']}
                                </p>
                                <p style={{
                                    fontSize: 'clamp(16px, 4.5vw, 22px)',
                                    color: '#ffffff',
                                    margin: 0,
                                    fontWeight: 500,
                                    lineHeight: 1.5
                                }}>
                                    {reason}
                                </p>
                            </div>
                        )}

                        {/* WHAT Box */}
                        {precautions.length > 0 && (
                            <div style={{
                                width: '100%',
                                maxWidth: '500px',
                                background: 'rgba(0,0,0,0.35)',
                                borderRadius: '16px',
                                padding: '16px 20px',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                <p style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: 'rgba(255,255,255,0.7)',
                                    margin: '0 0 8px 0',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {CONTENT.whatLabel[lang] || CONTENT.whatLabel['en-US']}
                                </p>
                                <ul style={{
                                    margin: 0,
                                    paddingLeft: '20px',
                                    listStyleType: 'disc'
                                }}>
                                    {precautions.map((p, i) => (
                                        <li key={i} style={{
                                            fontSize: 'clamp(15px, 4vw, 20px)',
                                            color: '#ffffff',
                                            fontWeight: 500,
                                            lineHeight: 1.6,
                                            marginBottom: '4px'
                                        }}>
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Not Added Badge */}
                        <div style={{
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: '12px',
                            padding: '12px 24px',
                            maxWidth: '500px',
                            width: '100%',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: 'clamp(16px, 4.5vw, 22px)',
                                fontWeight: 700,
                                color: '#ffffff',
                                margin: 0
                            }}>
                                {CONTENT.notAdded[lang] || CONTENT.notAdded['en-US']}
                            </p>
                        </div>

                        {/* Doctor Advice */}
                        <p style={{
                            fontSize: 'clamp(14px, 3.5vw, 18px)',
                            color: 'rgba(255,255,255,0.85)',
                            textAlign: 'center',
                            margin: 0,
                            fontStyle: 'italic',
                            padding: '0 16px',
                            lineHeight: 1.5
                        }}>
                            {CONTENT.doctorAdvice[lang] || CONTENT.doctorAdvice['en-US']}
                        </p>

                        {/* Spacer to push button down */}
                        <div style={{ flex: 1, minHeight: '20px' }} />

                        {/* Dismiss Button — ONLY action available */}
                        <motion.button
                            onClick={onDismiss}
                            whileTap={{ scale: 0.96 }}
                            style={{
                                width: '100%',
                                maxWidth: '500px',
                                padding: '22px 24px',
                                minHeight: '80px',
                                borderRadius: '16px',
                                background: '#ffffff',
                                color: config.buttonColor,
                                fontSize: 'clamp(18px, 5vw, 24px)',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                marginBottom: '32px',
                                WebkitTapHighlightColor: 'transparent'
                            }}
                        >
                            {CONTENT.dismiss[lang] || CONTENT.dismiss['en-US']}
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DrugInteractionModal;
