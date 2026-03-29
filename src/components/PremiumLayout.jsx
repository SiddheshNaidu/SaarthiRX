import { motion } from 'framer-motion';

const PremiumLayout = ({ children }) => {
    return (
        <>
            {/* Background Gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-premium-gradient-start via-warm-bg-start to-premium-gradient-end -z-10" />

            {/* Centered Mobile Container */}
            <div className="min-h-screen w-full flex items-stretch justify-center p-0 md:p-4 md:py-8">
                <motion.div
                    className="w-full md:max-w-mobile bg-white md:rounded-3xl md:shadow-premium-lg overflow-hidden relative flex flex-col"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    {children}
                </motion.div>
            </div>
        </>
    );
};

export default PremiumLayout;
