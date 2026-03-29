# SaarthiRx - Feature Documentation

> **Your Healthcare Companion for Elderly & Visually Challenged Users**

---

## 🎯 Mission

SaarthiRx is designed to help elderly Indian users (60-80+ years) understand and manage their prescriptions through voice-first interaction, visual accessibility, and AI-powered medicine extraction.

---

## ✅ Working Features

### 1. Voice-First Navigation

| Feature | Description | Status |
|---------|-------------|--------|
| **Speech Recognition** | Listens to user voice commands in Hindi, Marathi, and English | ✅ Working |
| **Text-to-Speech (TTS)** | Reads all screen content aloud for visually impaired users | ✅ Working |
| **Auto-silence Detection** | Mic automatically stops after 1.5s of silence | ✅ Working |
| **5-second Timeout** | If no speech detected for 5s, mic auto-stops | ✅ Working |
| **Haptic Feedback** | Vibration patterns for success, action, and alerts | ✅ Working |

### 2. Multi-Language Support

| Language | TTS | Speech Recognition | UI Translations |
|----------|-----|-------------------|-----------------|
| **Hindi (hi-IN)** | ✅ | ✅ | ✅ |
| **English (en-US)** | ✅ | ✅ | ✅ |
| **Marathi (mr-IN)** | ⚠️ Browser-limited | ✅ | ✅ |

**Special Feature:** Transliterated English words in Devanagari script are recognized:
- "वन टू थ्री" → 123
- "फाईव सिक्स" → 56

### 3. User Registration & Authentication

| Feature | Description |
|---------|-------------|
| **Phone OTP Login** | Firebase-based phone authentication with OTP |
| **Profile Storage** | Firestore database for user profiles |
| **Returning User Detection** | Automatically recognizes returning users |
| **Language Persistence** | Selected language saved to localStorage |

### 4. Prescription Scanning (AI-Powered)

| Feature | Description |
|---------|-------------|
| **Live Camera Preview** | Opens device camera with live video feed |
| **Gallery Upload** | Select existing prescription images |
| **Gemini AI Analysis** | Extracts medicine name, dosage, frequency, timing |
| **Visual Description** | AI describes pill appearance (color, shape, size) |
| **Timing Icons** | ☀️ Morning, 🌤️ Afternoon, 🌅 Evening, 🌙 Night |

**AI Model:** Gemini 2.0 Flash (with fallback to 1.5-flash, 1.5-pro, pro-vision)

### 5. Medicine Safety Shield

| Feature | Description |
|---------|-------------|
| **Drug Interaction Check** | Detects dangerous combinations (e.g., Aspirin + Warfarin) |
| **Red Alert Warning** | Screen flashes red with heavy vibration |
| **Voice Warning** | Speaks warning in user's language |
| **History Comparison** | Compares new medicines with saved history |

**Dangerous Combinations Database:**
- Aspirin + Clopidogrel (Blood thinners)
- Aspirin + Warfarin (Bleeding risk)
- Warfarin + Ibuprofen (Bleeding risk)
- Metformin + Alcohol (Low blood sugar)
- Lisinopril + Potassium (High potassium)
- Simvastatin + Grapefruit (Muscle damage)

### 6. Elder-Friendly UI

| Feature | Description |
|---------|-------------|
| **Large Touch Targets** | Minimum 80px button height |
| **High Contrast Colors** | Orange (#FF8C00) on white background |
| **Simple Navigation** | Maximum 2-3 actions per screen |
| **Animated Feedback** | Framer Motion animations for visual confirmation |
| **Fixed Mic Button** | Stable position at bottom center |

### 7. Dashboard

| Feature | Description |
|---------|-------------|
| **Personalized Greeting** | "Namaste, [Name]!" with voice |
| **One-Shot Announcement** | Greeting speaks only once, not on every re-render |
| **Quick Actions** | Scan Prescription, My Medicines, Reminders |
| **Voice Commands List** | Shows available voice commands |

---

## 🛠️ Technical Architecture

### Frontend
- **React 18** with Vite
- **Framer Motion** for animations
- **React Router** for navigation
- **Tailwind CSS** for styling

### Backend Services
- **Firebase Auth** - Phone OTP Authentication
- **Firestore** - User profile storage
- **Google Gemini AI** - Prescription OCR & Analysis

### Voice
- **Web Speech API** - Speech Recognition
- **Speech Synthesis API** - Text-to-Speech

---

## 🔮 Future Roadmap (High Fidelity)

### Phase 1: ABHA ID Integration

> **Ayushman Bharat Health Account (ABHA)** is India's digital health ID system.

| Feature | Description | Priority |
|---------|-------------|----------|
| **ABHA Login** | Link ABHA ID to SaarthiRx profile | 🔴 High |
| **Health Records Sync** | Pull prescription history from ABDM | 🔴 High |
| **Doctor Verification** | Verify prescriber via ABHA registry | 🟡 Medium |
| **Digital Prescription** | Accept e-prescriptions via ABHA | 🟡 Medium |

**Implementation:**
1. Integrate [ABDM Sandbox APIs](https://sandbox.abdm.gov.in/)
2. OAuth2 flow for ABHA authentication
3. Pull PHR (Personal Health Record) data
4. Display unified medication history

### Phase 2: Smart Reminders

| Feature | Description |
|---------|-------------|
| **Push Notifications** | Remind at exact medicine times |
| **Voice Reminders** | Auto-play TTS reminder |
| **Snooze Support** | "Remind me in 10 minutes" via voice |
| **Adherence Tracking** | Track if medicine was taken |
| **Family Alerts** | Notify family if dose missed |

### Phase 3: Pharmacy Integration

| Feature | Description |
|---------|-------------|
| **Medicine Ordering** | Order refills from local pharmacy |
| **Price Comparison** | Show prices from multiple pharmacies |
| **Generic Alternatives** | Suggest cheaper generic options |
| **Delivery Tracking** | Track medicine delivery status |

### Phase 4: Doctor Connect

| Feature | Description |
|---------|-------------|
| **Video Consultation** | Video call with doctor |
| **E-Prescription** | Receive digital prescriptions |
| **Follow-up Reminders** | Remind about doctor appointments |
| **Lab Reports** | Store and display lab results |

### Phase 5: Wearable Integration

| Feature | Description |
|---------|-------------|
| **Smartwatch App** | Companion app for WearOS/watchOS |
| **Vital Monitoring** | Track BP, heart rate, glucose |
| **Emergency SOS** | One-tap emergency alert |
| **Fall Detection** | Auto-alert on fall detection |

### Phase 6: Offline Mode

| Feature | Description |
|---------|-------------|
| **Local Storage** | Cache medicines offline |
| **Offline TTS** | Pre-download voice packs |
| **Sync When Online** | Auto-sync when internet available |

---

## 📊 Accessibility Compliance

| Standard | Status |
|----------|--------|
| WCAG 2.1 AA | 🟡 Partial |
| Voice-only Navigation | ✅ Yes |
| Screen Reader Compatible | ✅ Yes |
| Large Text Support | ✅ Yes |
| High Contrast Mode | 🔴 Planned |

---

## 🏆 Hackathon Demo Highlights

1. **Live Camera Preview** - Shows camera actually works
2. **Voice Input** - Speak phone number in Hindi/Marathi
3. **AI Medicine Extraction** - Gemini reads prescriptions
4. **Drug Safety Alert** - Red warning with vibration
5. **Multi-language** - Seamless Hindi/English switch

---

## 📝 Known Limitations

| Issue | Workaround |
|-------|------------|
| Marathi TTS not available | Use Hindi (understood by Marathi speakers) |
| Gemini API quota limits | Wait for daily reset or use new API key |
| Camera not on desktop | Falls back to file upload |
| Offline not supported | Requires internet connection |

---

## 📞 Contact

**Team SaarthiRx**  
Built with ❤️ for India's elderly population

---

*Last Updated: January 2026*
