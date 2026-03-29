import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import { VoiceProvider } from './context/VoiceContext';
import { VoiceButlerProvider } from './context/VoiceButlerContext';
import PremiumLayout from './components/PremiumLayout';
import VoiceNavigation from './components/VoiceNavigation';
import ReminderScheduler from './components/ReminderScheduler';
import NamasteGateway from './pages/NamasteGateway';
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
        {/* NamasteGateway route disabled - keeping file for potential future use */}
        {/* <Route path="/namaste" element={<NamasteGateway />} /> */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scan" element={<ScanPrescription />} />
        <Route path="/prescription/:id" element={<PrescriptionView />} />
        <Route path="/reminders" element={<ReminderList />} />
        <Route path="/reminder" element={<Navigate to="/reminders" replace />} />
        <Route path="/reminder/alert/:id" element={<ReminderAlert />} />
        <Route path="/reminder/alert" element={<ReminderAlert />} />
        <Route path="/medicines" element={<MyMedicines />} />
        <Route path="/history" element={<MedicineHistory />} />
        <Route path="/scan-medicine" element={<ScanMedicine />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const location = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isAlarmPage = location.startsWith('/alarm');

  return (
    <AppProvider>
      <Router>
        <VoiceProvider>
          <VoiceButlerProvider>
            {/* Alarm Page - Standalone (no layout wrapper) */}
            {isAlarmPage ? (
              <Routes>
                <Route path="/alarm/:id" element={<AlarmPage />} />
                <Route path="/alarm" element={<AlarmPage />} />
              </Routes>
            ) : (
              /* Regular pages with PremiumLayout and ReminderScheduler */
              <PremiumLayout>
                <VoiceNavigation>
                  <ReminderScheduler>
                    <AnimatedRoutes />
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
