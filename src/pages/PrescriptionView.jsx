import React from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { triggerAction } from '../utils/haptics';

const PillVisual = ({ description = '' }) => {
    const desc = description.toLowerCase();
    const isOval = desc.includes('oval') || desc.includes('capsule');

    let color = '#3B82F6';
    if (desc.includes('white')) color = '#F3F4F6';
    if (desc.includes('yellow')) color = '#FCD34D';
    if (desc.includes('pink')) color = '#F472B6';
    if (desc.includes('green')) color = '#10B981';
    if (desc.includes('orange')) color = '#FB923C';
    if (desc.includes('red')) color = '#EF4444';

    return (
        <div className="flex items-center justify-center my-4" aria-hidden="true">
            <div
                className={`${isOval ? 'w-40 h-24' : 'w-28 h-28'} rounded-full border-4 border-white shadow-lg`}
                style={{ backgroundColor: color }}
            />
        </div>
    );
};

const PrescriptionView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { language, setCurrentPageContent } = useApp();
    const { announcePageAndAction } = useVoiceButler();

    const prescription = location.state?.medicine;

    const text = {
        title: {
            'en-US': 'Prescription Details',
            'hi-IN': 'पर्चे का विवरण',
            'mr-IN': 'प्रिस्क्रिप्शन तपशील'
        },
        back: {
            'en-US': 'Back',
            'hi-IN': 'वापस',
            'mr-IN': 'मागे'
        },
        whenToTake: {
            'en-US': 'When to Take',
            'hi-IN': 'कब लेना है',
            'mr-IN': 'कधी घ्यायचे'
        },
        food: {
            'en-US': 'Food Instructions',
            'hi-IN': 'खाने के निर्देश',
            'mr-IN': 'जेवणासंबंधी सूचना'
        },
        instructions: {
            'en-US': 'Instructions',
            'hi-IN': 'निर्देश',
            'mr-IN': 'सूचना'
        },
        withFood: {
            'en-US': 'Take with food',
            'hi-IN': 'खाने के साथ लें',
            'mr-IN': 'जेवणासोबत घ्या'
        },
        emptyStomach: {
            'en-US': 'Take on empty stomach',
            'hi-IN': 'खाली पेट लें',
            'mr-IN': 'रिकाम्या पोटी घ्या'
        },
        repeat: {
            'en-US': 'Repeat Instructions',
            'hi-IN': 'निर्देश दोहराएं',
            'mr-IN': 'सूचना पुन्हा सांगा'
        },
        morning: {
            'en-US': 'Morning',
            'hi-IN': 'सुबह',
            'mr-IN': 'सकाळ'
        },
        afternoon: {
            'en-US': 'Afternoon',
            'hi-IN': 'दोपहर',
            'mr-IN': 'दुपार'
        },
        evening: {
            'en-US': 'Evening',
            'hi-IN': 'शाम',
            'mr-IN': 'संध्याकाळ'
        },
        night: {
            'en-US': 'Night',
            'hi-IN': 'रात',
            'mr-IN': 'रात्र'
        },
        dosageFallback: {
            'en-US': 'As prescribed',
            'hi-IN': 'डॉक्टर के अनुसार',
            'mr-IN': 'डॉक्टरांच्या सल्ल्यानुसार'
        },
        backToMedicines: {
            'en-US': 'Go to My Medicines',
            'hi-IN': 'मेरी दवाइयों पर जाएं',
            'mr-IN': 'माझ्या औषधांकडे जा'
        }
    };

    const t = (key) => text[key]?.[language] || text[key]?.['en-US'];

    useEffect(() => {
        if (!prescription) {
            navigate('/medicines', { replace: true });
        }
    }, [prescription, navigate]);

    if (!prescription) return null;

    const instruction = prescription.instructions?.[language]
        || `${prescription.name}. ${prescription.visualDescription || ''} ${prescription.frequency || ''}. ${prescription.withFood ? t('withFood') : t('emptyStomach')}.`;

    useEffect(() => {
        setCurrentPageContent(instruction);
        announcePageAndAction(t('title'), instruction, false);
    }, [instruction, setCurrentPageContent, announcePageAndAction]);

    const handleRepeat = () => {
        triggerAction();
        announcePageAndAction('', instruction, false);
    };

    const timingInfo = {
        morning: { icon: '🌅', label: t('morning') },
        afternoon: { icon: '☀️', label: t('afternoon') },
        evening: { icon: '🌆', label: t('evening') },
        night: { icon: '🌙', label: t('night') }
    };

    const timings = (prescription.timing || ['morning']).map((time) => timingInfo[time] || timingInfo.morning);

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3">
                <button
                    onClick={() => navigate(-1)}
                    className="min-h-[52px] px-4 rounded-xl bg-gray-100 text-gray-800 text-lg font-semibold"
                    aria-label={t('back')}
                >
                    ← {t('back')}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36 sm:pb-28">
                <div className="bg-white rounded-3xl p-5 shadow-md border border-gray-100 mb-4">
                    <p className="text-base text-gray-500 font-medium">{t('title')}</p>
                    <h1 className="text-3xl font-bold text-gray-800 mt-1">{prescription.name}</h1>
                    <p className="text-xl text-gray-600 mt-1">{prescription.dosage || t('dosageFallback')}</p>
                    <PillVisual description={prescription.visualDescription || ''} />
                    {prescription.visualDescription && (
                        <p className="text-base text-gray-600 text-center">💊 {prescription.visualDescription}</p>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-3">{t('whenToTake')}</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {timings.map((item, idx) => (
                                <div key={`${item.label}-${idx}`} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                                    <span className="text-2xl">{item.icon}</span>
                                    <span className="text-lg font-semibold text-gray-700">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-3">{t('food')}</h2>
                        <p className="text-xl text-gray-700">
                            {prescription.withFood ? `🍽️ ${t('withFood')}` : `🚫 ${t('emptyStomach')}`}
                        </p>
                    </div>

                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200">
                        <h2 className="text-2xl font-semibold text-blue-900 mb-2">{t('instructions')}</h2>
                        <p className="text-xl leading-relaxed text-blue-800">{instruction}</p>
                    </div>

                    <button
                        onClick={handleRepeat}
                        className="w-full min-h-[64px] p-4 rounded-2xl bg-white border-2 border-primary text-primary font-bold text-xl"
                        aria-label={t('repeat')}
                    >
                        🔊 {t('repeat')}
                    </button>

                    <button
                        onClick={() => navigate('/medicines')}
                        className="w-full min-h-[64px] p-4 rounded-2xl bg-gray-100 text-gray-800 font-bold text-xl"
                        aria-label={t('backToMedicines')}
                    >
                        {t('backToMedicines')}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default PrescriptionView;
