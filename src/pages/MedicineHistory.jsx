/**
 * MedicineHistory Page
 * Shows history of taken/skipped medicines for tracking adherence
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import DualActionButtons from '../components/DualActionButtons';

const MedicineHistory = () => {
    const navigate = useNavigate();
    const { language } = useApp();
    const [history, setHistory] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all', 'taken', 'skipped'

    // Labels
    const labels = {
        'en-US': {
            title: 'Medicine History',
            subtitle: 'Your medication log',
            all: 'All',
            taken: 'Taken',
            skipped: 'Skipped',
            empty: 'No history yet',
            emptyHint: 'Your medicine records will appear here',
            back: 'Back',
            today: 'Today',
            yesterday: 'Yesterday',
            takenAt: 'Taken at',
            skippedAt: 'Skipped at'
        },
        'hi-IN': {
            title: 'दवाई इतिहास',
            subtitle: 'आपकी दवाई का रिकॉर्ड',
            all: 'सभी',
            taken: 'ली गई',
            skipped: 'छोड़ी गई',
            empty: 'कोई इतिहास नहीं',
            emptyHint: 'आपकी दवाई का रिकॉर्ड यहाँ दिखेगा',
            back: 'वापस',
            today: 'आज',
            yesterday: 'कल',
            takenAt: 'ली गई',
            skippedAt: 'छोड़ी गई'
        },
        'mr-IN': {
            title: 'औषध इतिहास',
            subtitle: 'तुमचा औषध नोंद',
            all: 'सर्व',
            taken: 'घेतले',
            skipped: 'वगळले',
            empty: 'इतिहास नाही',
            emptyHint: 'तुमची औषध नोंद येथे दिसेल',
            back: 'मागे',
            today: 'आज',
            yesterday: 'काल',
            takenAt: 'घेतले',
            skippedAt: 'वगळले'
        }
    };

    const t = labels[language] || labels['en-US'];

    // Load history
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('saarthi_medicine_history') || '[]');
        // Sort by time descending (newest first)
        saved.sort((a, b) => new Date(b.time) - new Date(a.time));
        setHistory(saved);
    }, []);

    // Filter history
    const filteredHistory = filter === 'all' 
        ? history 
        : history.filter(h => h.action === filter);

    // Format date
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return t.today;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return t.yesterday;
        } else {
            return date.toLocaleDateString(language === 'en-US' ? 'en-US' : 'hi-IN', {
                day: 'numeric',
                month: 'short'
            });
        }
    };

    // Format time
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString(language === 'en-US' ? 'en-US' : 'hi-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Group by date
    const groupedHistory = filteredHistory.reduce((groups, item) => {
        const date = formatDate(item.time);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(item);
        return groups;
    }, {});

    // Get stats
    const stats = {
        total: history.length,
        taken: history.filter(h => h.action === 'taken').length,
        skipped: history.filter(h => h.action === 'skipped').length
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white px-4 py-6 pt-8 pb-10 rounded-b-3xl shadow-xl">
                <motion.button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="text-2xl">←</span>
                    <span className="text-lg">{t.back}</span>
                </motion.button>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t.title}</h1>
                <p className="text-base sm:text-lg text-white/80">{t.subtitle}</p>

                {/* Stats */}
                <div className="flex gap-4 mt-4">
                    <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                        <div className="text-2xl font-bold">{stats.taken}</div>
                        <div className="text-xs opacity-80">✓ {t.taken}</div>
                    </div>
                    <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                        <div className="text-2xl font-bold">{stats.skipped}</div>
                        <div className="text-xs opacity-80">⏭️ {t.skipped}</div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 px-4 -mt-4 mb-4">
                {['all', 'taken', 'skipped'].map((f) => (
                    <motion.button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                            filter === f
                                ? 'bg-purple-500 text-white shadow-md'
                                : 'bg-white text-gray-600 shadow-sm'
                        }`}
                        whileTap={{ scale: 0.95 }}
                    >
                        {f === 'all' && t.all}
                        {f === 'taken' && `✓ ${t.taken}`}
                        {f === 'skipped' && `⏭️ ${t.skipped}`}
                    </motion.button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 px-4">
                {filteredHistory.length === 0 ? (
                    <motion.div
                        className="flex flex-col items-center justify-center py-16 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="text-8xl mb-6">📋</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t.empty}</h2>
                        <p className="text-gray-500">{t.emptyHint}</p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedHistory).map(([date, items]) => (
                            <div key={date}>
                                {/* Date Header */}
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                                    {date}
                                </h3>
                                
                                {/* Items */}
                                <div className="space-y-2">
                                    {items.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${
                                                item.action === 'taken'
                                                    ? 'border-green-500'
                                                    : 'border-gray-400'
                                            }`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                        item.action === 'taken'
                                                            ? 'bg-green-100 text-green-600'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {item.action === 'taken' ? '✓' : '⏭️'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800">
                                                            {item.medicineName}
                                                        </h4>
                                                        <p className="text-xs text-gray-500">
                                                            {item.action === 'taken' ? t.takenAt : t.skippedAt} {formatTime(item.time)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Global Action Button */}
            <DualActionButtons />
        </motion.div>
    );
};

export default MedicineHistory;
