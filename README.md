<div align="center">

# 🏥 SaarthiRx — Prescription Clarity Companion

### Making Healthcare Accessible for India's Elderly Population

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.7-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

*A voice-first healthcare companion designed specifically for elderly users (60-80+ years) and visually challenged individuals*

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Tech Stack](#%EF%B8%8F-tech-stack) • [Contributing](#-contributing)

</div>

---

## 📖 About

**SaarthiRx** (साथी = "companion" in Hindi) is an AI-powered mobile-first web application that helps elderly users understand and manage their medical prescriptions through intuitive voice navigation, AI-powered prescription scanning, and multi-language support.

### 🎯 Problem Statement

Elderly patients in India face significant challenges:
- 📋 **Complex Prescriptions** — Difficult to read and understand medical prescriptions
- 🌐 **Language Barriers** — More comfortable with regional languages than English
- 👁️ **Visual Impairments** — Small text and complex layouts are hard to comprehend
- 💊 **Medication Errors** — Risk of taking wrong medicines or incorrect dosages
- 📱 **Technology Gap** — Most healthcare apps are not designed for elderly users

---

## ✨ Features

### 🎙️ Voice-First Navigation
- Complete hands-free navigation using speech recognition
- Text-to-Speech reads all screen content aloud
- Auto-silence detection (1.5s) for natural conversations
- Haptic feedback for confirmations and alerts

### 📷 AI-Powered Prescription Scanning
- Live camera preview and gallery upload
- **Google Gemini AI** extracts:
  - Medicine name & dosage
  - Frequency & timing (Morning ☀️, Afternoon 🌤️, Evening 🌅, Night 🌙)
  - Visual pill description (color, shape, size)
  - Probable reason for prescription
  - Expiry date

### 💊 Medicine Verification
- Scan any medicine to verify against your prescription
- Full prescription details for matched medicines
- Typical use & warnings for unrecognized medicines

### 🛡️ Medicine Safety Shield
Detects dangerous drug interactions:
- Aspirin + Clopidogrel (Blood thinners)
- Aspirin + Warfarin (Bleeding risk)
- Warfarin + Ibuprofen (Bleeding risk)
- Metformin + Alcohol (Low blood sugar)
- Lisinopril + Potassium (High potassium)
- Simvastatin + Grapefruit (Muscle damage)

**Alert System:** Red screen flash + heavy vibration + voice warning

### ⏰ Smart Reminders
- Schedule medicine reminders for specific times
- Voice announcements for each reminder
- Persistent alerts with vibration loops
- Snooze functionality

### 🌐 Multi-Language Support

| Language    | Speech Recognition | TTS | UI |
|-------------|:-----------------:|:---:|:--:|
| Hindi (hi-IN)   | ✅ | ✅ | ✅ |
| English (en-US) | ✅ | ✅ | ✅ |
| Marathi (mr-IN) | ✅ | ⚠️  | ✅ |

**Special Feature:** Recognizes transliterated English in Devanagari script:
- "वन टू थ्री" → 123
- "फाईव सिक्स" → 56

---

## 🖼️ Demo

### User Flow
1. **Welcome Screen** — Select preferred language
2. **Registration** — Phone OTP authentication
3. **Dashboard** — Access main features
4. **Scan Prescription** — Upload or capture prescription image
5. **View Medicines** — See simplified medicine instructions
6. **Set Reminders** — Schedule medicine alerts

---

## 🚀 Installation

### Prerequisites
- Node.js 16+ and npm
- Firebase project with Auth and Firestore enabled
- Google Gemini API key
- Modern web browser (Chrome recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/saloni080613/SaarthiRx.git

# Navigate to project directory
cd SaarthiRx

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Build
npm run build

# Preview production build
npm run preview

# Deploy to Firebase Hosting
firebase deploy
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | Core UI framework |
| **Vite 7** | Fast build tool and dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **Framer Motion** | Smooth animations |
| **React Router 7** | Client-side routing |

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
| **Vibration API** | Haptic feedback |

---

## 📂 Project Structure

```
SaarthiRx/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── MicButton.jsx        # Voice input button
│   │   ├── VoiceNavigation.jsx  # Global voice command wrapper
│   │   ├── MedicineVerifier.jsx # Medicine verification
│   │   └── ReminderForm.jsx     # Reminder creation form
│   │
│   ├── pages/                # Main application screens
│   │   ├── Welcome.jsx          # Language selection
│   │   ├── Register.jsx         # Phone OTP registration
│   │   ├── Dashboard.jsx        # Main home screen
│   │   ├── ScanPrescription.jsx # Prescription scanning
│   │   ├── ScanMedicine.jsx     # Medicine verification
│   │   ├── MyMedicines.jsx      # Medicine list view
│   │   └── ReminderList.jsx     # All reminders
│   │
│   ├── services/             # Business logic & API calls
│   │   ├── geminiService.js     # Gemini AI integration
│   │   ├── authService.js       # Firebase authentication
│   │   └── prescriptionService.js # Prescription storage
│   │
│   ├── context/              # React Context for state
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   └── firebase/             # Firebase configuration
│
├── public/                   # Static assets
├── firebase.json             # Firebase hosting config
└── package.json              # Dependencies
```

---

## 🎨 Design System

### Elder-Friendly Design Principles
- **Large Touch Targets:** Minimum 80px button height
- **High Contrast:** Orange on white/cream backgrounds
- **Readable Typography:** 24px minimum body text, 32-48px headers
- **Voice Mic Button:** 150px diameter for easy access

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Safety Orange | `#FF8C00` | Primary actions |
| Warm White | `#FDFCF0` | Background start |
| Cream | `#FFF5E6` | Background end |
| Dark Gray | `#2D3748` | Primary text |

---

## ♿ Accessibility

| Feature | Implementation |
|---------|----------------|
| **ARIA Labels** | All interactive elements labeled |
| **Keyboard Navigation** | Full keyboard support |
| **High Contrast** | Orange on white/cream backgrounds |
| **Focus Indicators** | Clear visual focus states |
| **Screen Reader** | Compatible with screen readers |
| **Voice-Only Mode** | Complete app control via voice |

---

## 🌐 Browser Support

| Browser | Support Level |
|---------|---------------|
| Chrome/Edge | ✅ Full (recommended) |
| Android Chrome | ✅ Full + haptic feedback |
| iOS Safari | ⚠️ Limited haptic support |
| Firefox | ⚠️ Limited speech recognition |

---

## 🔮 Roadmap

- [ ] **ABHA Integration** — Link with Ayushman Bharat Health Account
- [ ] **Push Notifications** — Background medicine reminders
- [ ] **Family Alerts** — Notify family for missed doses
- [ ] **Pharmacy Integration** — Order medicine refills
- [ ] **Doctor Connect** — Video consultations
- [ ] **Wearable Support** — Smartwatch companion app

---

## 👥 Target Users

1. **Elderly Patients (60-80+ years)** — Managing multiple medications
2. **Visually Impaired Users** — Rely on screen readers and voice
3. **Caregivers & Family** — Monitor elderly relatives' medications

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

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

**Built with ❤️ for India's elderly population**

*Making healthcare accessible for everyone* 🏥💙

</div>
