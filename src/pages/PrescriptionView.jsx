import React from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { triggerAction } from '../utils/haptics';
import DualActionButtons from '../components/DualActionButtons';

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
                style={{ backgroundColor: color, boxShadow: `0 20px 40px ${color}40` }}
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
            className="min-h-[100dvh] bg-gradient-to-b from-orange-50 to-amber-50 flex flex-col relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-4 shadow-lg rounded-b-2xl">
                <button
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 text-white/80 hover:text-white"
                    aria-label={t('back')}
                >
                    <span className="text-2xl">←</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-36 z-10 relative">
                {/* Decorative Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="bg-white rounded-3xl p-6 shadow-md border border-orange-200 mb-6 relative overflow-hidden text-center">
                    <p className="text-base text-gray-500 font-medium">{t('title')}</p>
                    <h1 className="text-3xl font-bold text-gray-900 mt-1">{prescription.name}</h1>
                    <p className="text-xl text-gray-600 mt-1">{prescription.dosage || t('dosageFallback')}</p>
                    <PillVisual description={prescription.visualDescription || ''} />
                    {prescription.visualDescription && (
                        <p className="text-base text-gray-600 text-center">💊 {prescription.visualDescription}</p>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-3xl shadow-md border border-orange-200">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('whenToTake')}</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {timings.map((item, idx) => (
                                <div key={`${item.label}-${idx}`} className="flex items-center justify-center gap-2 p-4 bg-orange-50 rounded-2xl border border-orange-200">
                                    <span className="text-2xl">{item.icon}</span>
                                    <span className="text-lg font-semibold text-gray-800">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-md border border-orange-200">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('food')}</h2>
                        <p className="text-xl text-gray-700">
                            {prescription.withFood ? `🍽️ ${t('withFood')}` : `🚫 ${t('emptyStomach')}`}
                        </p>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-200 shadow-sm">
                        <h2 className="text-2xl font-semibold text-blue-700 mb-2">{t('instructions')}</h2>
                        <p className="text-xl leading-relaxed text-blue-800 font-medium">{instruction}</p>
                    </div>

                    

                    <button
                        onClick={() => navigate('/medicines')}
                        className="w-full min-h-[64px] p-4 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-md"
                        aria-label={t('backToMedicines')}
                    >
                        {t('backToMedicines')}
                    </button>
                </div>
            </div>
            <DualActionButtons />
        </motion.div>
    );
};

export default PrescriptionView;
