import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import { VoiceProvider } from './context/VoiceContext';
import { VoiceButlerProvider } from './context/VoiceButlerContext';
import PremiumLayout from './components/PremiumLayout';
import VoiceNavigation from './components/VoiceNavigation';
import ReminderScheduler from './components/ReminderScheduler';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ScanPrescription from './pages/ScanPrescription';
import PrescriptionView from './pages/PrescriptionView';
import ReminderList from './pages/ReminderList';
import ReminderAlert from './pages/ReminderAlert';
import MyMedicines from './pages/MyMedicines';
import MedicineHistory from './pages/MedicineHistory';
import ScanMedicine from './pages/ScanMedicine';
import AlarmPage from './pages/AlarmPage';
import DevTools from './components/DevTools';


function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes — redirect to / if not authenticated */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><ScanPrescription /></ProtectedRoute>} />
        <Route path="/prescription/:id" element={<ProtectedRoute><PrescriptionView /></ProtectedRoute>} />
        <Route path="/reminders" element={<ProtectedRoute><ReminderList /></ProtectedRoute>} />
        <Route path="/reminder" element={<Navigate to="/reminders" replace />} />
        <Route path="/reminder/alert/:id" element={<ProtectedRoute><ReminderAlert /></ProtectedRoute>} />
        <Route path="/reminder/alert" element={<ProtectedRoute><ReminderAlert /></ProtectedRoute>} />
        <Route path="/medicines" element={<ProtectedRoute><MyMedicines /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><MedicineHistory /></ProtectedRoute>} />
        <Route path="/scan-medicine" element={<ProtectedRoute><ScanMedicine /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const location = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isAlarmPage = location.startsWith('/alarm');

  return (
    <AppProvider>
      <Router>
        <VoiceProvider>
          <VoiceButlerProvider>
            {/* Global Offline Banner */}
            {isOffline && (
              <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-3 z-[9999] font-bold text-base shadow-md animate-pulse">
                ⚠️ You are offline. Voice AI and Scan features may not work.
              </div>
            )}
            
            {/* Alarm Page - Standalone (no layout wrapper) */}
            {isAlarmPage ? (
              <Routes>
                <Route path="/alarm/:id" element={<AlarmPage />} />
                <Route path="/alarm" element={<AlarmPage />} />
              </Routes>
            ) : (
              /* Regular pages with PremiumLayout, BottomNav, and ReminderScheduler */
              <PremiumLayout>
                <VoiceNavigation>
                  <ReminderScheduler>
                    <AnimatedRoutes />
                    <BottomNav />
                    <DevTools />
                  </ReminderScheduler>
                </VoiceNavigation>
              </PremiumLayout>
            )}
          </VoiceButlerProvider>
        </VoiceProvider>
      </Router>
    </AppProvider>
  );
}

export default App;
