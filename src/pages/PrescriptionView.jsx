import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useVoiceButler } from '../context/VoiceButlerContext';
import { triggerAction } from '../utils/haptics';
import { staggerContainer, staggerItem } from '../utils/animations';
import DualActionButtons from '../components/DualActionButtons';

// Enhanced 3D Visual pill component with premium rendering
const PillVisual = ({ description }) => {
    // Parse description (e.g., "Small round blue tablet")
    const desc = description.toLowerCase();
    const isRound = desc.includes('round');
    const isOval = desc.includes('oval');
    const isTablet = desc.includes('tablet');
    const isCapsule = desc.includes('capsule');

    // Determine color
    let color = '#3B82F6'; // default blue
    let borderColor = '#2563EB';
    if (desc.includes('white')) {
        color = '#F3F4F6';
        borderColor = '#D1D5DB';
    }
    if (desc.includes('yellow')) {
        color = '#FCD34D';
        borderColor = '#F59E0B';
    }
    if (desc.includes('pink')) {
        color = '#F472B6';
        borderColor = '#EC4899';
    }
    if (desc.includes('green')) {
        color = '#10B981';
        borderColor = '#059669';
    }
    if (desc.includes('orange')) {
        color = '#FB923C';
        borderColor = '#F97316';
    }
    if (desc.includes('red')) {
        color = '#EF4444';
        borderColor = '#DC2626';
    }

    // Determine shape and size
    let shapeClasses = 'w-32 h-32 rounded-full'; // Default round
    if (isOval || isCapsule) {
        shapeClasses = 'w-40 h-24 rounded-full';
    }
    if (isTablet && !isRound) {
        shapeClasses = 'w-32 h-32 rounded-2xl';
    }

    return (
        <div className="flex items-center justify-center my-8">
            <motion.div
                className={`
          ${shapeClasses}
          border-4
          relative
        `}
                style={{
                    backgroundColor: color,
                    borderColor: borderColor,
                    boxShadow: `
            0 20px 50px rgba(0,0,0,0.25),
            inset 0 -10px 20px rgba(0,0,0,0.15),
            inset 0 10px 20px rgba(255,255,255,0.3)
          `
                }}
                initial={{ scale: 0, rotateY: 0, rotateX: 0 }}
                animate={{
                    scale: 1,
                    rotateY: 360,
                    rotateX: 10
                }}
                transition={{
                    scale: { duration: 0.6, delay: 0.2 },
                    rotateY: { duration: 1.5, delay: 0.3, ease: "easeOut" }
                }}
            >
                {/* Shine effect */}
                <div
                    className="absolute inset-0 rounded-inherit opacity-40"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.8) 100%)',
                        borderRadius: 'inherit'
                    }}
                />

                {/* Center line for tablets */}
                {isTablet && !isRound && (
                    <div
                        className="absolute top-0 bottom-0 left-1/2 w-0.5 transform -translate-x-1/2"
                        style={{
                            backgroundColor: borderColor,
                            opacity: 0.3
                        }}
                    />
                )}
            </motion.div>
        </div>
    );
};

const PrescriptionView = () => {
    const { id } = useParams();
    const { language, setCurrentPageContent } = useApp();
    const { announcePageAndAction } = useVoiceButler();

    // Sample prescription data
    const prescription = {
        name: 'Amlodipine',
        dosage: '5mg',
        visualDescription: 'Small round blue tablet',
        timing: [
            { time: 'morning', icon: '☀️', label: 'Morning' },
            { time: 'evening', icon: '🌙', label: 'Evening' }
        ],
        withFood: true,
        instructions: {
            'en-US': 'Take one tablet in the morning and one in the evening with food.',
            'hi-IN': 'सुबह और शाम को भोजन के साथ एक गोली लें।',
            'mr-IN': 'सकाळी आणि संध्याकाळी जेवणासोबत एक गोळी घ्या.'
        }
    };

    const instruction = prescription.instructions[language] || prescription.instructions['en-US'];

    useEffect(() => {
        setCurrentPageContent(instruction);
        announcePageAndAction('Prescription Details', instruction, false);
    }, [instruction, setCurrentPageContent, announcePageAndAction]);

    const handleRepeat = () => {
        triggerAction();
        announcePageAndAction('', instruction, false);
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col p-6 pb-32 overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <motion.div
                className="text-center mb-6 mt-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <h1 className="text-4xl font-display font-bold text-gray-800">
                    {prescription.name}
                </h1>
                <p className="text-2xl text-gray-500 mt-1">{prescription.dosage}</p>
            </motion.div>

            {/* Enhanced 3D Pill Visual */}
            <PillVisual description={prescription.visualDescription} />
            <motion.p
                className="text-center text-lg text-gray-600 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                {prescription.visualDescription}
            </motion.p>

            {/* Content Cards */}
            <motion.div
                className="space-y-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                {/* Timing Timeline */}
                <motion.div
                    className="bg-white p-6 rounded-2xl shadow-premium border-2 border-gray-100"
                    variants={staggerItem}
                >
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">When to Take</h2>
                    <div className="flex items-center justify-around">
                        {prescription.timing.map((time, index) => (
                            <motion.div
                                key={time.time}
                                className="flex flex-col items-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                            >
                                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-3xl shadow-premium mb-2">
                                    {time.icon}
                                </div>
                                <p className="text-lg font-medium text-gray-700">{time.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Food Instructions */}
                <motion.div
                    className="bg-white p-6 rounded-2xl shadow-premium border-2 border-gray-100"
                    variants={staggerItem}
                >
                    <h2 className="text-2xl font-semibold text-gray-800 mb-3">Food Instructions</h2>
                    <div className="flex items-center space-x-3">
                        <div className="text-4xl">{prescription.withFood ? '✅' : '❌'}</div>
                        <p className="text-xl text-gray-700">
                            {prescription.withFood ? 'Take with food' : 'Take on empty stomach'}
                        </p>
                    </div>
                </motion.div>

                {/* Full Instructions */}
                <motion.div
                    className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-2 border-blue-200"
                    variants={staggerItem}
                >
                    <h2 className="text-2xl font-semibold text-blue-900 mb-3">Instructions</h2>
                    <p className="text-xl leading-relaxed text-blue-800">
                        {instruction}
                    </p>
                </motion.div>

                {/* Repeat Button */}
                <motion.button
                    onClick={handleRepeat}
                    className="
            w-full min-h-button p-4 rounded-xl
            bg-white border-2 border-primary
            text-primary font-bold text-xl
            shadow-md hover:shadow-premium
            transition-all
          "
                    variants={staggerItem}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    🔊 Repeat Instructions
                </motion.button>
            </motion.div>

            {/* Global Action Button */}
            <DualActionButtons />
        </motion.div>
    );
};

export default PrescriptionView;
