import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadDemoData, clearDemoData, loadDemoPrescription, startDemoScan } from '../utils/demoData';
import { testNotification } from '../utils/notifications';

const DevTools = () => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Show in development OR when explicitly enabled via env variable
    // To enable in production: set VITE_SHOW_DEVTOOLS=true in Vercel environment variables
    const showDevTools = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEVTOOLS === 'true';
    if (!showDevTools) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="bg-gray-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl mb-4 border border-gray-700 w-64"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-sm text-gray-300">🛠️ Developer Tools</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        
                        <div className="space-y-2">
                            {/* Demo AI Scan - Shows full AI experience for judges */}
                            <button
                                onClick={() => startDemoScan()}
                                className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg"
                            >
                                🤖 Demo AI Scan
                            </button>

                            <button
                                onClick={() => loadDemoData()}
                                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            > 
                                📦 Load Demo Data
                            </button>
                            
                            <button
                                onClick={() => clearDemoData()}
                                className="w-full py-2 px-3 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                🧹 Clear All Data
                            </button>

                            <button
                                onClick={() => testNotification()}
                                className="w-full py-2 px-3 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                🔔 Test Notification
                            </button>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-700 text-[10px] text-gray-500 text-center">
                            Auto-reloads page after action
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 bg-gray-900/90 backdrop-blur text-white rounded-full shadow-xl flex items-center justify-center border border-gray-700 hover:bg-gray-800 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                🛠️
            </motion.button>
        </div>
    );
};

export default DevTools;
