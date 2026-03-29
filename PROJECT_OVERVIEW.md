# 🏥 SaarthiRx — Prescription Clarity Companion

> **Making Healthcare Accessible for India's Elderly Population**

---

## 📖 Project Overview

**SaarthiRx** is a voice-first healthcare companion application designed specifically for elderly users (60-80+ years) and visually challenged individuals. The app helps users understand and manage their medical prescriptions through intuitive voice navigation, AI-powered prescription scanning, and multi-language support.

The name "Saarthi" (साथी) means "companion" in Hindi, reflecting the app's mission to be a helpful guide in managing daily medications.

---

## 🎯 Problem Statement

Elderly patients in India face significant challenges:
- **Complex Prescriptions**: Medical prescriptions are often difficult to read and understand
- **Language Barriers**: Many elderly users are more comfortable with regional languages
- **Visual Impairments**: Small text and complex layouts are hard to comprehend
- **Medication Errors**: Risk of taking wrong medicines or incorrect dosages
- **Technology Gap**: Most healthcare apps are not designed for elderly users

---

## 💡 Our Solution

SaarthiRx addresses these challenges through:

| Feature | Benefit |
|---------|---------|
| **Voice-First Interface** | Complete hands-free navigation and interaction |
| **AI Prescription Scanning** | Automatic extraction of medicine details using Gemini AI |
| **Multi-Language Support** | Hindi, English, and Marathi for regional accessibility |
| **Elder-Friendly UI** | Large buttons (80px+), high contrast, simple layouts |
| **Smart Reminders** | Voice-enabled medicine reminders with persistence |
| **Medicine Safety Shield** | Drug interaction warnings to prevent dangerous combinations |

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | Core UI framework |
| **Vite** | Fast build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Smooth animations |
| **React Router v7** | Client-side routing |

### Backend Services
| Service | Purpose |
|---------|---------|
| **Firebase Auth** | Phone OTP authentication |
| **Firestore** | User profile & prescription storage |
| **Google Gemini AI** | Prescription OCR & medicine analysis |

### Voice Technologies
| API | Purpose |
|-----|---------|
| **Web Speech API** | Speech recognition (voice input) |
| **Speech Synthesis API** | Text-to-Speech (voice output) |
| **Vibration API** | Haptic feedback for confirmations |

---

## 📱 Key Features

### 1. 🎙️ Voice-First Navigation
- **Speech Recognition**: Listens to voice commands in Hindi, Marathi, and English
- **Text-to-Speech (TTS)**: Reads all screen content aloud
- **Auto-Silence Detection**: Mic auto-stops after 1.5 seconds of silence
- **Haptic Feedback**: Vibration patterns for actions and alerts

### 2. 📷 AI-Powered Prescription Scanning
- Live camera preview for capturing prescriptions
- Gallery upload option for existing images
- **Gemini AI** extracts:
  - Medicine name
  - Dosage amount
  - Frequency (once/twice/thrice daily)
  - Timing (Morning ☀️, Afternoon 🌤️, Evening 🌅, Night 🌙)
  - Visual pill description (color, shape, size)
  - Probable reason for prescription
  - Expiry date

### 3. 💊 Medicine Verification
- Scan any medicine to check if it matches your prescription
- Displays full prescription details for matched medicines
- Shows typical use and warnings for non-prescription medicines

### 4. 🛡️ Medicine Safety Shield
Detects dangerous drug interactions:
- Aspirin + Clopidogrel (Blood thinners)
- Aspirin + Warfarin (Bleeding risk)
- Warfarin + Ibuprofen (Bleeding risk)
- Metformin + Alcohol (Low blood sugar)
- Lisinopril + Potassium (High potassium)
- Simvastatin + Grapefruit (Muscle damage)

**Alert System**: Red screen flash + heavy vibration + voice warning

### 5. ⏰ Smart Reminders
- Schedule medicine reminders for specific times
- Voice announcements for each reminder
- Persistent alerts with vibration loops
- Snooze functionality

### 6. 🌐 Multi-Language Support
| Language | Speech Recognition | TTS | UI |
|----------|-------------------|-----|----|
| Hindi (hi-IN) | ✅ | ✅ | ✅ |
| English (en-US) | ✅ | ✅ | ✅ |
| Marathi (mr-IN) | ✅ | ⚠️ Limited | ✅ |

**Special Feature**: Recognizes transliterated English in Devanagari script:
- "वन टू थ्री" → 123
- "फाईव सिक्स" → 56

---

## 📂 Project Structure

```
SaarthiRx/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── MicButton.jsx        # Voice input button
│   │   ├── VoiceNavigation.jsx  # Global voice command wrapper
│   │   ├── MedicineVerifier.jsx # Medicine verification component
│   │   ├── ReminderForm.jsx     # Reminder creation form
│   │   └── TimePicker.jsx       # Time picker for reminders
│   │
│   ├── pages/                # Main application screens
│   │   ├── Welcome.jsx          # Language selection
│   │   ├── Register.jsx         # Phone OTP registration
│   │   ├── Login.jsx            # Returning user login
│   │   ├── Dashboard.jsx        # Main home screen
│   │   ├── ScanPrescription.jsx # Prescription scanning
│   │   ├── ScanMedicine.jsx     # Medicine verification
│   │   ├── MyMedicines.jsx      # Medicine list view
│   │   ├── ReminderList.jsx     # All reminders
│   │   └── AlarmPage.jsx        # Active alarm display
│   │
│   ├── services/             # Business logic & API calls
│   │   ├── geminiService.js     # Gemini AI integration
│   │   ├── authService.js       # Firebase authentication
│   │   ├── prescriptionService.js # Prescription storage
│   │   ├── reminderService.js   # Reminder management
│   │   └── medicationService.js # Medicine data handling
│   │
│   ├── context/              # React Context for state
│   │   └── AppContext.jsx       # Global app state
│   │
│   ├── hooks/                # Custom React hooks
│   │   └── useVoice.js          # Voice API hook
│   │
│   ├── utils/                # Utility functions
│   │   └── haptics.js           # Vibration utilities
│   │
│   ├── firebase/             # Firebase configuration
│   │   └── config.js            # Firebase setup
│   │
│   └── App.jsx               # Main app with routing
│
├── public/                   # Static assets
├── .env                      # Environment variables (API keys)
├── firebase.json             # Firebase hosting config
└── package.json              # Dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Firebase project with Auth and Firestore enabled
- Google Gemini API key
- Modern web browser (Chrome recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/SaarthiRx.git

# Navigate to project directory
cd SaarthiRx

# Install dependencies
npm install

# Set up environment variables
# Create .env file with:
# VITE_FIREBASE_API_KEY=your_firebase_key
# VITE_GEMINI_API_KEY=your_gemini_key

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Deployment

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

---

## 🎨 Design System

### Colors
- **Primary**: Safety Orange (#FF8C00)
- **Background**: Warm gradient (#FDFCF0 → #FFF5E6)
- **Text**: Dark gray (#2D3748)

### Typography
- Body text: **Minimum 24px**
- Headers: **32px - 48px**
- All fonts optimized for readability

### Touch Targets
- Standard buttons: **80px minimum height**
- Voice mic button: **150px diameter**
- Ample padding and spacing

---

## ♿ Accessibility Features

| Feature | Implementation |
|---------|----------------|
| **ARIA Labels** | All interactive elements labeled |
| **Keyboard Navigation** | Full keyboard support |
| **High Contrast** | Orange on white/cream backgrounds |
| **Focus Indicators** | Clear visual focus states |
| **Screen Reader** | Compatible with screen readers |
| **Voice-Only Mode** | Complete app control via voice |

---

## 🔮 Future Roadmap

### Phase 1: ABHA Integration
- Link with Ayushman Bharat Health Account
- Sync health records from ABDM
- Digital prescription support

### Phase 2: Enhanced Reminders
- Push notifications
- Family alerts for missed doses
- Adherence tracking

### Phase 3: Pharmacy Integration
- Order medicine refills
- Price comparisons
- Generic alternatives

### Phase 4: Doctor Connect
- Video consultations
- E-prescriptions
- Lab report storage

### Phase 5: Wearable Support
- Smartwatch companion app
- Vital monitoring
- Emergency SOS

---

## 👥 Target Users

1. **Elderly Patients (60-80+ years)**
   - Managing multiple medications
   - Difficulty reading small text
   - Need voice assistance

2. **Visually Impaired Users**
   - Rely on screen readers
   - Need audio descriptions
   - Benefit from haptic feedback

3. **Caregivers & Family Members**
   - Monitor elderly relatives' medications
   - Receive missed dose alerts
   - Manage reminders remotely

---

## 📄 License

This project was created for educational and hackathon purposes.

---

## 🙏 Acknowledgments

- **Google Gemini AI** for prescription analysis capabilities
- **Firebase** for authentication and database services
- **Web Speech API** for voice technology support

---

<div align="center">

**SaarthiRx** — Your Trusted Healthcare Companion 🏥💙

*Making healthcare accessible for everyone*

*Built with ❤️ for India's elderly population*

</div>
