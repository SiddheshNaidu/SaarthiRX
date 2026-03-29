# SaarthiRx — Product Requirements Document
## Workflow PRD: Screen-by-Screen Analysis, UX Refinement & Future Scope

**Version:** 1.0  
**Product:** SaarthiRx (साथीRx) — Prescription Clarity Companion  
**Domain:** HealthTech / Elder-Friendly AI  
**Stack:** React 19 + Vite 7 + Firebase + Google Gemini AI + Web Speech API  
**Prepared for:** Nakshatra Hackathon 2026 — HC-01 HealthTech Track  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Problem Statement](#2-product-vision--problem-statement)
3. [User Personas](#3-user-personas)
4. [Complete Screen-by-Screen Workflow](#4-complete-screen-by-screen-workflow)
5. [Voice & TTS Architecture](#5-voice--tts-architecture)
6. [Gemini AI Integration — Current State & Refinement](#6-gemini-ai-integration--current-state--refinement)
7. [Elder-Friendly UI/UX Design System](#7-elder-friendly-uiux-design-system)
8. [Current Gaps & Known Issues](#8-current-gaps--known-issues)
9. [Future Scope & Roadmap](#9-future-scope--roadmap)
10. [AI Output Refinement Guidelines for Elder Users](#10-ai-output-refinement-guidelines-for-elder-users)

---

## 1. Executive Summary

SaarthiRx (साथी = "companion" in Hindi) is a voice-first, AI-powered mobile web application designed to eliminate the prescription comprehension gap for India's elderly population. The product combines Google Gemini's vision AI with the browser's Web Speech API and Firebase infrastructure to deliver a complete medication management lifecycle — from scanning a handwritten prescription to triggering medicine reminders — entirely through voice, touch, and conversational feedback in Hindi, English, and Marathi.

The core product loop is: **Scan → Understand → Remind → Verify → Log.** Every step is executable without reading small text, navigating complex menus, or requiring a caregiver. The application is designed to be operated by a 75-year-old with mild visual impairment and no prior smartphone experience, using only voice commands and large-touch-target buttons.

From a technical architecture perspective, the application is a single React SPA with client-side voice processing, Firebase Auth (phone OTP), Firestore for cloud sync, and Gemini AI for prescription OCR and medicine photo verification. All core features degrade gracefully to localStorage when Firebase is unavailable, ensuring offline-first reliability for rural users on poor connectivity.

**Key metrics this PRD targets:**
- Zero-touch prescription scanning: user taps once, AI handles extraction
- Sub-15-second prescription analysis with voice readback
- Voice-command navigation coverage: 11 distinct global commands + 3 context-aware commands
- Elder-safe TTS: rate 0.9x, preferred regional voice, 1.5s silence detection
- Anti-hallucination medicine extraction: 80% confidence threshold with blacklist filtering

---

## 2. Product Vision & Problem Statement

### The Problem

India has approximately 140 million elderly citizens above age 60. A significant majority manage chronic conditions requiring multiple daily medications. The prescription delivery pipeline in India creates compounding barriers for this group:

**Barrier 1 — Handwritten prescriptions.** Indian doctors predominantly write prescriptions by hand, often in abbreviated medical notation (OD, BD, TDS, 1-0-1). These are difficult to read for anyone, let alone someone with declining vision.

**Barrier 2 — Language mismatch.** Medical prescriptions are typically written in English while patients are fluent only in Hindi, Marathi, Tamil, or other regional languages. The patient cannot read what they have been prescribed.

**Barrier 3 — Cognitive load.** Managing multiple medicines with different timings, food instructions, and durations is complex. Missed doses lead to disease progression; wrong doses can be fatal.

**Barrier 4 — Technology gap.** Existing healthcare apps (Practo, 1mg, PharmEasy) are designed for urban, literate, smartphone-native users. Their UI paradigms — small text, complex navigation, form-based interactions — exclude the elderly entirely.

**Barrier 5 — No verification mechanism.** There is no easy way for an elderly patient to verify that the pill they are holding matches what the doctor prescribed. Look-alike pills are a leading cause of medication errors.

### The Vision

SaarthiRx exists to be the first AI system that makes prescription management truly accessible for India's elderly population. The product vision statement:

> *"Every elderly Indian should be able to understand exactly what medicines they are taking, when to take them, and why — in their own language, without needing to read anything or rely on a caregiver."*

### How SaarthiRx Solves It

| Problem | SaarthiRx Solution |
|---|---|
| Unreadable handwritten prescriptions | Gemini Vision OCR with 80%+ confidence threshold and fuzzy name correction |
| Language barrier | Full trilingual support (Hindi, English, Marathi) with TTS readback |
| Complex dosing schedules | Auto-scheduler converts prescription timing codes to actual clock reminders |
| Medication verification | Blind photo verification cross-references pill photos against saved prescription |
| Technology gap | Voice-first navigation, 80px+ touch targets, 24px minimum text, no forms |
| Connectivity issues | localStorage-first architecture, Firebase syncs when available |

---

## 3. User Personas

### Persona 1 — Primary: Ramesh Kumar, 72 (The Solo Patient)
**Location:** Tier-2 city, Maharashtra  
**Devices:** Android smartphone (gifted by son), 4G connectivity  
**Medical context:** Type 2 Diabetes + Hypertension, takes 4 medicines daily  
**Literacy:** Can read Marathi; English is difficult; cannot read doctor's handwriting  
**Tech comfort:** Uses WhatsApp with voice messages; can tap large buttons  
**Pain points:** Often confuses morning and night medicines; forgets whether he took his dose; worries about taking the wrong pill  
**Interaction pattern:** Relies on TTS to understand everything; taps the orange mic button; says "दवाई" to see his medicines  
**Success scenario:** Scans prescription → hears each medicine read aloud in Marathi → gets reminded at 9 AM and 9 PM → taps "✓ Taken" on the alarm screen  

---

### Persona 2 — Secondary: Sunita Devi, 68 (The Visually Impaired User)
**Location:** Rural Rajasthan  
**Devices:** Low-end Android, 2G/3G connectivity  
**Medical context:** Cataracts, Arthritis — difficulty seeing and touching small targets  
**Literacy:** Hindi; cannot read prescription at all  
**Tech comfort:** Minimal; uses phone for calls only  
**Pain points:** Cannot see pill descriptions; cannot distinguish between pills of similar color/size; cannot read reminder notifications  
**Interaction pattern:** Exclusively voice-driven; uses "मदद" for help; holds phone close to ear  
**Success scenario:** Hands phone to grandson to scan prescription → all subsequent interactions via voice → "दवाई दिखाओ" reads medicine descriptions aloud → reminder announces "Sunita ji, दवाई का समय"  

---

### Persona 3 — Tertiary: Meera Krishnan, 55 (The Caregiver)
**Location:** Urban Chennai  
**Devices:** iPhone 14  
**Medical context:** Managing her 80-year-old mother's 6 prescriptions  
**Literacy:** Fully literate; English-fluent  
**Tech comfort:** High; uses multiple health apps  
**Pain points:** Cannot be physically present to ensure doses are taken; wants verification that mother took medicines; concerned about drug interactions  
**Interaction pattern:** Sets up the app for her mother; checks medicine history remotely; trusts AI to flag interaction warnings  
**Success scenario:** Scans prescription on mother's phone → drug interaction checker flags Aspirin + Warfarin combination → alerts family → reviews medicine history log remotely

---

### Anti-Persona: Urban Millennial Self-Medicator
SaarthiRx is **not** designed for users who want to self-diagnose, search drug databases, or manage complex health records. The product is intentionally scoped to prescription management for existing patients. Features like drug information lookup, pharmacy integration, and doctor search are explicitly out of scope for the core experience.

---

## 4. Complete Screen-by-Screen Workflow

The application flow is a linear onboarding path that branches into a hub-and-spoke dashboard model. Below is the complete documented workflow for every screen.

---

### 4.1 Welcome Screen (`/` → `Welcome.jsx`)

**Purpose:** Language selection gate. The first and only decision the user makes before the system takes over.

**Layout:**
- SaarthiRx logo (96×96px) centered at top
- Tagline: "Your Prescription Clarity Companion"
- Two large language buttons (minimum 90px height): English (🇬🇧) and हिंदी (🇮🇳)
- Each button has: flag icon, native language text, subtitle in that language, right-arrow indicator
- Orange mic FAB at bottom center
- Voice hint: "🎙️ Or tap the mic and say your language"

**Interaction flows:**
1. **Tap flow:** User taps language button → TTS confirms in selected language → navigates to `/register` after TTS completes (max 2s fallback)
2. **Voice flow:** User taps mic → black overlay appears with pulsing mic → user says "English" or "हिंदी" → INSTANT navigation (no TTS wait) — this is intentional for speed
3. **Voice keywords recognized:** english, हिंदी, हिन्दी, hindi, इंग्रजी, अंग्रेजी

**State management:** `setLanguage()` persists to `localStorage('saarthi_language')` and AppContext.

**TTS behavior:** On tap: speaks confirmation ("You have selected English" / "आपने हिंदी चुनी है"), waits for completion, then navigates. On voice: cancels all speech immediately and navigates.

**Known UX issue:** Marathi (मराठी) is supported in the app but not shown on the Welcome screen — users must select Hindi and the app carries Marathi TTS support. This creates a discoverability gap. Future versions should add a third Marathi button.

**Voice overlay:** Dark backdrop blur + centered mic animation + "Say: English or हिंदी" hint. Tap overlay to dismiss.

---

### 4.2 Registration Screen (`/register` → `Register.jsx`)

**Purpose:** Phone OTP authentication + new user profile collection in a conversational, voice-guided step wizard.

**Architecture:** Multi-step form with 5 possible questions, rendered one at a time. Active questions filter based on whether user is new or returning.

**Questions (in order):**

| Step | Question ID | Shown to | Input Type |
|---|---|---|---|
| 1 | `phone` | All users | Numeric (10 digits) |
| 2 | `otp` | All users | Numeric (6 digits) |
| 3 | `name` | New users only | Text |
| 4 | `gender` | New users only | Button selection |
| 5 | `age` | New users only | Numeric |

**Phone step behavior:**
- TTS reads the question ("What is your phone number?")
- User speaks or types 10-digit number
- Voice parser converts spoken words to digits: "नब्बे छह..." → "906..."
- Validation: must start with 6/7/8/9, exactly 10 digits
- On valid input: auto-formats to `+91XXXXXXXXXX`, sends OTP via Firebase Phone Auth
- Error states: invalid format, too-many-requests, network error — each with localized TTS error

**OTP step behavior:**
- Invisible reCAPTCHA (singleton pattern prevents double-rendering)
- WebOTP API listens for SMS autofill on Android Chrome 84+
- If WebOTP succeeds: auto-verifies, no user input needed
- If WebOTP times out (30s): falls back to `FALLBACK_VOICE` state for voice digit input
- Countdown timer shown via `OTPWaitingOverlay` component (pulsing shield animation)

**Returning user fast-path:** After OTP verification, Firestore profile check runs. If profile is complete (name + gender + age + phone), user is navigated directly to `/dashboard` — skipping steps 3/4/5 entirely.

**Voice auto-advance:** When mic stops and `tempAnswer` is populated, a 1.5-second timer auto-advances the form. This prevents elderly users from needing to manually tap "Next."

**Progress bar:** Animated orange gradient bar shows current step/total steps.

**Elder-specific silence handling:** Registration route uses 6-second silence timeout (vs 1.5s on other pages) because elderly users speak more slowly and pause between digits.

**Listening overlay:** When mic is active, a full dark backdrop appears with a centered pulsing mic icon and live transcript display. Tap anywhere on overlay to stop listening.

---

### 4.3 Dashboard (`/dashboard` → `Dashboard.jsx`)

**Purpose:** Primary hub screen. Entry point for all core features. Designed for maximum speed of access — user should be able to initiate any action within 2 seconds of landing here.

**Layout:**
- App logo (80×80px) centered, with spring-animation entrance
- Personalized greeting: "Hello, [Name]!" in selected language
- Subtitle: "How can I help you today?"
- Primary CTA: "Scan Prescription" (full-width, orange gradient, 📸 icon)
- 2×2 secondary grid: My Medicines (💊), Reminders (⏰), Scan Medicine (🔍), History (📋)
- Voice commands info card (blue outline, collapsible awareness)
- Bottom: DualActionButtons (speaker 🔊 + mic 🎙️)

**Auto-behavior on mount:**
1. Speaks "Namaste." (1 syllable only — intentionally short, gives control back immediately)
2. After 1 second, auto-starts mic listening
3. Sets `currentPageContent` for Repeat command support

**Voice commands active on this page (beyond global):**
- "read" / "padho" → reads next scheduled reminder aloud
- "check medicine" / "जांच करो" → navigates to `/scan-medicine`
- "add reminder" → navigates to `/reminders`
- "stop" / "रुको" → cancels TTS immediately (`window.speechSynthesis.cancel()`)

**Speaker (repeat) button:** Re-announces personalized greeting. Useful when user missed the initial announcement.

**Navigation cards:** All cards use `cardHover` + `staggerItem` Framer Motion variants — staggered entrance animation, scale on hover, scale-down on tap.

---

### 4.4 Scan Prescription (`/scan` → `ScanPrescription.jsx`)

**Purpose:** The core value-creation screen. Transforms a photo of a handwritten prescription into structured, voice-readable medicine data with automatic reminders.

**States (linear progression):**

```
IDLE → CAMERA_LIVE → PREVIEW → ANALYZING → RESULTS
                                           ↓
                                         ERROR
```

**IDLE state:**
- Two options: "📷 Take Photo" (primary, full-width orange) + "🖼️ From Gallery" (secondary, white border)
- Voice commands: "camera" → opens live camera, "gallery" → opens file picker
- Context-aware voice commands via `VoiceNavigation` global event bus: `voiceAction` CustomEvent dispatched and caught by local `window.addEventListener`

**CAMERA_LIVE state:**
- Live `<video>` feed from rear camera (`facingMode: 'environment'`)
- Dashed white overlay frame guides framing
- Large circular capture button (96px) at bottom center
- Voice command "click" / "क्लिक" triggers `captureFromVideo()`
- Cancel button stops camera stream and returns to IDLE

**PREVIEW state:**
- Shows captured/selected image (max 256px height)
- Auto-advances to ANALYZING after 1 second (no user action needed)
- Image is compressed to max 1024px width, JPEG 80% quality before API call

**ANALYZING state:**
- Spinning orange border circle animation
- TTS: "Reading your prescription..." in selected language
- Gemini API called with compressed base64 image
- 15-second timeout enforced (elderly users shouldn't wait forever)
- Three model fallback: `gemini-2.0-flash` → `gemini-2.5-flash` → `gemini-flash-latest`

**Gemini prompt design (current):**
- OCR-mode instructions for handwritten Indian prescriptions
- Frequency code parsing: OD, BD, TDS, 1-1-1, 1-0-1 patterns
- Anti-hallucination rules: 80% confidence threshold, blacklist filtering
- Returns structured JSON: name, dosage, frequency, timing, duration, visual type/color

**Post-analysis auto-commit flow (Phase 1 feature):**
1. Deduplication check against localStorage medicines by name (case-insensitive)
2. New medicines saved to `localStorage('saarthi_medicines')`
3. `createRemindersFromPrescription()` converts timing codes to HH:MM reminders
4. Optional Firebase sync (fails silently if not authenticated)
5. TTS voice feedback: "I have automatically added X medicines and set Y reminders"

**RESULTS state:**
- Medicine cards (one per medicine): name, dosage, timing icon (☀️🌤️🌅🌙), visual description
- Green confirmation banner: "All medicines saved! Reminders have been set automatically."
- Drug interaction warnings (if any) shown as red pulsing banner before medicine cards
- No "Save" button needed — everything auto-committed

**ERROR states:**
- API timeout → "It is taking too long. Please ensure you have good internet."
- Quota exceeded → "The AI helper is busy right now. Please wait 2 minutes."
- Handwriting parse error → "I had trouble reading the doctor's handwriting. Please try again with better light."
- Image too large → validated before API call

**Demo mode (`/scan?demo=true`):**
- Triggered by DevTools "Demo AI Scan" button
- Uses hardcoded `DEMO_PRESCRIPTION` data (4 medicines: Metformin, Amlodipine, Atorvastatin, Aspirin)
- Shows full 3-second analyzing animation, then renders real results
- Perfect for judge demonstrations without consuming API quota

---

### 4.5 My Medicines (`/medicines` → `MyMedicines.jsx`)

**Purpose:** Medicine inventory view with visual identification, quantity tracking, and blind verification.

**Layout:**
- Blue gradient header with page title and "Your medicine inventory" subtitle
- Back button (← chevron)
- Medicine list: compact cards (min 90px height)

**Medicine card anatomy:**
- Left color bar (1.5px, medicine's `visualColor`)
- Pill visual: user photo (if verified) OR colored circle with pill color
- Medicine name (truncated) + type/dosage
- Quantity badge (red when < 3 pills — low stock warning)
- 👁️ "Info" button → opens full detail modal

**Detail modal (full-screen slide-up):**
- Orange gradient header: "Prescription Details" + doctor name + date
- Medicine name card with colored left border
- "How it looks" section: circular pill photo (if scanned) or colored circle
- Visual description text: "Small, round, white tablet"
- "When to Take" section: timing pills (🌅 Morning 9 AM, ☀️ Afternoon 2 PM, etc.)
- Food instruction card: 🍽️ "Take with food" or 🚫 "Take on empty stomach"
- Duration card: 📅 "30 days"
- Bottom buttons: "← Go Back" + "🔊 Repeat Instructions" (speaks full medicine summary via TTS)

**Blind verification flow (camera verification):**
- User taps camera → `verifyMedicinePhoto()` Gemini call
- Gemini reads text from pill packaging/strip (anti-hallucination: must read actual text, not guess by color/shape)
- If readable: cross-references against saved prescription medicines
- Match → green overlay "✅ Match Found!" + medicine name
- No match → red overlay "⚠️ Not in Prescription" + warning to consult doctor
- Unreadable → "I cannot read the label clearly. Please hold steady and try again."
- Results modal includes user's photo of the pill for visual confirmation

**Low stock alert:** When `quantity < 3`, card shows red badge and "⚠️ Running Low!" text. No automated reorder (future scope).

---

### 4.6 Reminder List (`/reminders` → `ReminderList.jsx`)

**Purpose:** Full reminder management — create, edit, toggle, delete medicine reminders with a time picker.

**Layout:**
- Orange gradient header
- Notification permission banner (if not yet granted): blue info card with "Enable" button
- Notification status: green pulse dot "Notifications enabled" (if granted) or red warning (if denied)
- Reminder cards list
- Floating "+ Add Reminder" button above mic button (positioned at `bottom-32`)
- DualActionButtons at bottom

**Reminder card anatomy:**
- Left color bar (medicine's pill color)
- Colored pill circle visual
- Medicine name + formatted time ("8:00 AM") + period ("Morning") + repeat days
- Toggle switch (green = on, gray = off) — tap to toggle
- 🗑️ Delete button → confirmation modal
- Tap card body → opens ReminderForm for editing

**ReminderForm modal (bottom sheet on mobile, centered on desktop):**
- Sticky header: "Add Reminder" / "Edit Reminder"
- Medicine name text input (required)
- Description input (optional, "e.g., blue round tablet")
- Pill color selector: 8 colored circles, tap to select (new reminders only)
- Time picker trigger → opens `TimePicker` component
- Repeat days: 7 day buttons (S M T W T F S) + "Every Day" toggle
- Sticky footer: Cancel + Save/Update buttons

**TimePicker component:**
- Alarm-style drum roll: ▲ Hours ▲ : ▲ Minutes ▲ + AM/PM toggle
- 5-minute increment for minutes
- 4 quick presets: 🌅 Morning 8AM, ☀️ Afternoon 1PM, 🌆 Evening 6PM, 🌙 Night 9PM
- All touch targets ≥ 48px
- Confirm with "✓ Set Time" button

**Background scheduler (`useReminderScheduler`):**
- Runs every 10 seconds, checks `HH:MM` match against current time
- Checks day-of-week match against `repeatDays` array
- Fires `triggerNotification()` for matching reminders
- Marks reminder as fired in localStorage (resets at midnight) to prevent duplicate fires
- If tab focused: immediately navigates to `/reminder/alert/:id`

---

### 4.7 Reminder Alert (`/reminder/alert/:id` → `ReminderAlert.jsx`)

**Purpose:** Full-screen medicine alarm overlay. Triggered by scheduler or notification click.

**Layout (alarm active):**
- Full orange-red gradient background with pulsing opacity animation
- Giant ⏰ emoji with shake animation
- Title: "Medicine Time!" in large bold text
- Voice message: "[Name], it is time for your [medicine]. Please take it now."
- Colored pill circle (bouncing float animation)
- Scheduled time display
- Action buttons:
  - ✓ "I have taken it" (white button, green text, 100px height, pulsing ring)
  - 😴 Snooze (with sub-menu: 5/10/15 min options)
  - ⏭️ Skip

**Interaction flows:**
- **Taken:** Logs to `saarthi_medicine_history`, navigates to `/reminders` after 1s
- **Snooze:** Schedules delayed browser notification, navigates to `/reminders`
- **Skip:** Logs as skipped, navigates to `/reminders`
- **Voice:** Detects "taken" / "ले लिया" / "skip" / "snooze" from transcript

**Voice announcement:** Auto-announces on mount via `VoiceButler.announce()`. Repeats every 10 seconds via interval. Haptic vibration every 2 seconds.

---

### 4.8 Alarm Page (`/alarm/:id` → `AlarmPage.jsx`)

**Purpose:** Standalone full-screen medicine alarm — a more advanced version of ReminderAlert designed for lock-screen style display. Does NOT use the PremiumLayout wrapper.

**Key differences from ReminderAlert:**
- Standalone route (no nav, no layout wrapper)
- Uses AlarmPage for external medicine alarms (from notification click with medicine ID, not reminder ID)
- Snooze has a 3-strike limit: after 3 snoozes, auto-marks as "Not Taken" with a red flash screen
- Stale alarm detection: if >2 hours past scheduled time, shows "Missed Dose" title and different voice message
- Inventory decrement: `decrementMedicineQuantity()` called when "Taken" is tapped
- Forced skip state: red flash overlay with harsh warning message

**3-Strike Snooze system:**
- Snooze count stored in `localStorage('snooze_[medicineId]_[date]')`
- Counter resets daily
- Strike 1/2: "Okay, snoozing 15 min. Warning: X snoozes left."
- Strike 3: Red flash + auto-log as skipped + voice warning about medication safety

---

### 4.9 Scan Medicine (`/scan-medicine` → `ScanMedicine.jsx`)

**Purpose:** Blind verification — user photographs an actual pill/strip to verify it matches their saved prescription.

**States:** IDLE → CAMERA_LIVE → ANALYZING → MATCH_FOUND / NO_MATCH

**Verification flow:**
1. User photographs pill or packaging
2. `verifyMedicinePhoto()` Gemini call with conservative anti-hallucination prompt
3. Gemini MUST read actual printed text — cannot guess by color/shape alone
4. Confidence threshold enforced; unreadable image returns `isReadable: false`
5. Detected medicine name cross-referenced against saved `saarthi_medicines`
6. Local medicine database fuzzy matching as secondary check (Levenshtein distance, 60% threshold)
7. Result: MATCH (green ✅) or NO_MATCH (amber ⚠️)

**Safety-first design decisions:**
- False positive (saying safe when unsafe) is more dangerous than false negative
- If unreadable: always says "try again" rather than guessing
- NO_MATCH warning is prominent and vocal: "This medicine is NOT in your prescription. Please consult your doctor."
- Confidence threshold: 90%+ required for text reading

---

### 4.10 Medicine History (`/history` → `MedicineHistory.jsx`)

**Purpose:** Adherence tracking — chronological log of taken/skipped doses.

**Layout:**
- Purple gradient header with stats (count of taken vs skipped)
- Filter tabs: All / ✓ Taken / ⏭️ Skipped
- Grouped by date (Today, Yesterday, DD Mon)
- Per-item: green (taken) or gray (skipped) left border + action time

**Data source:** `localStorage('saarthi_medicine_history')` — array of `{id, medicineName, action, time, scheduledTime}` objects written by AlarmPage and ReminderAlert on user action.

---

### 4.11 Prescription View (`/prescription/:id` → `PrescriptionView.jsx`)

**Purpose:** Read-only detailed view of a single medicine from a prescription.

**Currently:** Uses static sample data (Amlodipine 5mg). Not yet connected to dynamic prescription data from Firestore.

**Layout:**
- Medicine name + dosage
- Animated 3D pill visual (CSS-rendered from visual description string)
- Timing timeline with morning/evening pills
- Food instructions card
- Full instruction text (localized)
- "🔊 Repeat Instructions" button

**Gap identified:** This screen is not linked from anywhere in the current navigation flow. It exists as a route but is orphaned. Future work: link from MyMedicines detail view.

---

### 4.12 Login (`/login` → `Login.jsx`)

**Purpose:** Alternative auth flow — state-machine-driven voice login for returning users. More sophisticated than Register's step-wizard approach.

**Auth states:** IDLE → ASKING_NUMBER → LISTENING_NUMBER → CONFIRMING_NUMBER → SENDING_OTP → WAITING_OTP → FALLBACK_VOICE → VERIFYING → ASKING_NAME → SUCCESS → ERROR

**Key behaviors:**
- Singleton reCAPTCHA verifier (prevents double-render bug)
- WebOTP API integration with 30-second countdown overlay (`OTPWaitingOverlay`)
- Auto-reads back phone number before sending OTP ("I heard 98765 43210. Sending the secret code now.")
- New user detection: post-OTP Firestore profile check → if incomplete → asks for name

**Note:** Both `/register` and `/login` handle the same auth flow. Register is the primary onboarding route; Login exists as a secondary entry point. Both use the same Firebase Phone Auth underneath.

---

## 5. Voice & TTS Architecture

### 5.1 The Three-Layer Voice System

SaarthiRx implements voice through three independent but cooperative systems:

```
┌──────────────────────────────────────────────────────────┐
│  Layer 3: VoiceButler (page-level announcements)         │
│  "Namaste. I am ready." on dashboard mount               │
├──────────────────────────────────────────────────────────┤
│  Layer 2: VoiceNavigation (global command routing)       │
│  "Scan" → /scan | "Home" → /dashboard                   │
├──────────────────────────────────────────────────────────┤
│  Layer 1: VoiceContext (speech recognition + TTS core)   │
│  WebSpeechAPI | SpeechSynthesis | Airlock protocol       │
└──────────────────────────────────────────────────────────┘
```

---

### 5.2 VoiceContext — The Core Engine

**Speech Recognition:**
- Uses `webkitSpeechRecognition` / `SpeechRecognition` (Chrome recommended)
- `continuous: true` — stays open for multi-word input
- `interimResults: true` — shows live transcript feedback
- Language: dynamically set to `AppContext.language` code

**Two silence timeout modes (route-aware):**
- `ELDER_FRIENDLY_ROUTES` (`/register`, `/login`): 6-second silence timeout, 8-second no-speech timeout
- All other routes: 1.5-second silence timeout, 5-second no-speech timeout
- Rationale: registration requires speaking digits slowly; navigation commands are quick and decisive

**Transcript accumulation modes:**
- Elder routes: ACCUMULATE — appends successive speech segments (enables "nine eight seven" → "987" across pauses)
- Other routes: REPLACE — only keeps latest segment (prevents stale command bleed)

**Airlock Protocol (route change protection):**
- On every route change: TTS cancelled, mic stopped, transcript cleared
- 500ms "dead zone" after route change before mic can re-activate
- Prevents previous page's voice state from bleeding into new page

**MUTEX (TTS ↔ Mic):**
- Mic CANNOT start while TTS is active (`isSpeaking: true`)
- TTS starting force-stops mic immediately
- This prevents the system from "hearing itself" — no feedback loops

**TTS Configuration:**
- Rate: 0.9 (10% slower than default — important for elderly comprehension)
- Pitch: 1.0 (natural)
- Volume: 1.0 (full)
- Voice: prefers regional voice matching `utterance.lang` (e.g., `hi-IN`, `mr-IN`)
- Returns Promise — callers can `await speak(text)` for sequential announcements

---

### 5.3 VoiceNavigation — Global Command Router

Processes every `transcript` update and routes to one of 11 global actions or 3 context-aware actions.

**Global commands (active on every page except `/register` and `/`):**

| Command | Keywords (sample) | Action |
|---|---|---|
| HOME | home, होम, घर | Navigate to /dashboard |
| SCAN | scan, स्कैन, camera | Navigate to /scan |
| MEDICINES | medicines, दवाई, औषध | Navigate to /medicines |
| REMINDERS | reminders, रिमाइंडर | Navigate to /reminders |
| BACK | back, वापस, मागे | history.back() |
| REPEAT | repeat, दोहराओ | Speak currentPageContent |
| HELP | help, मदद | List all commands via TTS |
| VERIFY_MEDICINE | check medicine, जांच करो | Navigate to /scan-medicine |
| ALARM | emergency, इमरजेंसी | Navigate to /alarm |
| STOP | stop, रुको, बस | Cancel TTS immediately |
| UNKNOWN | — | Ignored silently |

**Priority routing logic for "scan medicine" ambiguity:**
- If transcript contains BOTH a medicine word AND a check/verify word → `VERIFY_MEDICINE` (safety priority)
- If transcript contains medicine word AND scan word → `VERIFY_MEDICINE` (conservative default)
- Plain "scan" alone → `SCAN` (prescription scan)

**Context-aware commands (route-specific):**
- `/scan` route only: CAMERA → open camera, GALLERY → open file picker, CLICK → capture photo
- These are dispatched as `CustomEvent('voiceAction')` and caught by the page's local listener

**Fuzzy matching engine (`Fuse.js`):**
- Threshold: 0.4 (moderate — allows for accented speech and slight mispronunciation)
- `ignoreLocation: true` — matches keyword anywhere in the transcript
- Filler word stripping before matching: "please open scan" → "scan"
- Falls through to exact substring match first (faster), fuzzy match as fallback

**AI Medicine Addition (bonus feature):**
- If transcript contains a medicine name + addition intent word, routes to `addMedicineByVoice()`
- Gemini parses natural language: "Add Paracetamol 500mg morning and night" → structured medicine object
- Duplicate check before adding
- Voice feedback confirms addition or reports duplicate

---

### 5.4 VoiceButler — Page Announcement System

A higher-level abstraction that combines TTS announcements with automatic mic activation.

**`announcePageAndAction(pageName, primaryAction, autoActivateMic)`:**
- Speaks: `${pageName}. ${primaryAction}`
- After TTS completes + 500ms echo buffer → auto-activates mic
- 8-second timeout: if no speech detected, says "I'm listening. Please speak now"

**Elder UX rationale for echo buffer:** Without a delay between the system speaking and the mic activating, the trailing audio of TTS gets picked up as mic input. 500ms clears this.

---

### 5.5 DualActionButtons Component

The persistent UI element present on every screen (except Welcome and full-screen alarm pages).

**Layout:** Two circular buttons, side by side, fixed at bottom center:
- 🔊 Blue speaker button (left): replays current page's TTS content
- 🎙️ Orange mic button (right): starts/stops voice recognition

**Animation states:**
- Speaker pulsing blue ring → currently speaking
- Mic pulsing orange ring + waveform bars → currently listening
- Both buttons disabled (grayed) when speaker is active — mic cannot be triggered mid-TTS

**Size:** 64px (mobile) → 80px (sm) → 96px (md) — intentionally large for elderly touch targets.

---

## 6. Gemini AI Integration — Current State & Refinement

### 6.1 Three Distinct Gemini Calls

| Call | Function | Model | Timeout | Output |
|---|---|---|---|---|
| Prescription OCR | `analyzePrescription()` | gemini-2.0-flash → 2.5-flash → flash-latest | 15s | Structured medicine JSON |
| Medicine Photo Analysis | `analyzeMedicinePhoto()` | gemini-2.0-flash → 2.5-flash | None (should add) | Visual details + expiry |
| Blind Verification | `verifyMedicinePhoto()` | gemini-2.0-flash → 2.5-flash | 15s | Match result + detected name |

---

### 6.2 Prescription OCR — Current Prompt Analysis

**What works well:**
- Explicit OCR-mode framing ("You are an expert pharmacist OCR system")
- Indian medical frequency code coverage (OD, BD, TDS, 1-1-1, 1-0-1)
- Anti-hallucination confidence scoring (0-100, threshold at 80)
- Blacklisted drug filtering
- Raw JSON output instruction ("no markdown, no backticks")
- Three-model fallback for quota resilience

**Current prompt weaknesses and refinements needed:**

**Issue 1 — Duration defaulting to 5 days:**
The prompt says "Use 5 as default if not specified." Most chronic disease prescriptions (diabetes, hypertension) are for 30 days. A 5-day default causes incorrect reminder end-dates and patient confusion.
- **Fix:** Default to 30 days for medicines in chronic disease categories (determined by drug class). Add a `durationWasGuessed: true` flag and surface it to users: "I set this for 30 days. Please confirm with your doctor."

**Issue 2 — Visual color/type reliability:**
The current prompt asks for `visual_color` and `visual_type` but these are rarely written on prescriptions. Gemini guesses from drug knowledge, which is unreliable.
- **Fix:** Separate the visual identification concern to the `analyzeMedicinePhoto()` call. The prescription scan should only extract text-based data. Visual data is populated when the user photographs their actual pill.

**Issue 3 — Probable reason field:**
Currently extracts "probable reason" from prescription context. This can mislead elderly users into self-diagnosing or worrying.
- **Fix:** Remove `probable_reason` from the TTS readback. Only show it in the detail view with a disclaimer: "This is a general use case — always follow your doctor's instructions."

**Issue 4 — JSON parse failures on complex handwriting:**
When Gemini returns partial JSON (truncated on long prescriptions), the `JSON.parse()` throws and the entire scan fails.
- **Fix:** Add a JSON repair step: attempt to complete truncated JSON by appending `}]}` before parsing. Log the repair for debugging.

---

### 6.3 Blind Verification — Current Prompt Analysis

**What works well:**
- Conservative framing: "You MUST read actual text. Do NOT guess by color/shape alone."
- Readable/unreadable binary forces honest output
- Confidence threshold at 90% for text reading

**Refinements needed:**

**Issue 1 — Generic medicine brand name vs. generic name mismatch:**
A doctor writes "Amlodipine" on the prescription. The medicine strip says "Amlovas" (a brand name). Current fuzzy matching fails this case because it compares brand vs. generic directly.
- **Fix:** Expand the medicine database with brand-name aliases. Add `brands: ['Amlovas', 'Amlokind', 'Stamlo']` to each medicine entry. Fuzzy match against both.

**Issue 2 — Strip vs. pill photography:**
The prompt works for printed packaging but struggles with loose pills (no text). Currently returns "unreadable" for loose pills, which is technically correct but unhelpful.
- **Fix:** For unreadable pills (no text), run a secondary visual-only analysis: "Describe the physical appearance of this pill (color, shape, size, any markings)." Cross-reference the description against the saved medicine's `visualDescription` field.

**Issue 3 — Language on packaging:**
Some Indian generics have Hindi/Devanagari text on packaging. The prompt is English-centric.
- **Fix:** Add to prompt: "The packaging may contain text in Hindi, English, or both. Read all text visible regardless of language."

---

### 6.4 Voice Summary Generation — Current State & Refinement

`generateVoiceSummary()` produces TTS-ready text. Current output for 3 medicines:
> "I found 3 medicines. Metformin for morning, Amlodipine for morning, Aspirin for morning."

**Problems:**
1. Repeats "for morning" three times — sounds robotic to elderly listeners
2. No dosage information in readback
3. No food instruction mentioned
4. No indication of how many pills to take

**Improved template:**
> "I found 3 medicines for you. First, Metformin 500mg — take this with breakfast, morning and night. Second, Amlodipine 5mg — take this in the morning. Third, Aspirin 75mg — take this after breakfast. All reminders have been set."

**Implementation:** Restructure `generateVoiceSummary()` to iterate with ordinals (First, Second, Third), include dosage and food instruction. Limit to first 3 medicines in TTS to avoid 60-second monologues; add "And 2 more. Check My Medicines to see all." for larger prescriptions.

---

### 6.5 AI Medicine Addition via Voice

`addMedicineByVoice()` uses Gemini to parse natural language medicine descriptions. This feature enables elderusers to add medicines without scanning — by simply saying "Add Paracetamol 500mg morning and night."

**Current confidence threshold:** 0.5 (50%) — too permissive. A wrong medicine added silently is a safety risk.
- **Fix:** Raise to 0.75. Below threshold, ask confirmation: "I think you said Paracetamol. Is that correct?"

**Missing feature:** No TTS readback of the interpreted medicine before saving. Users cannot verify what the system understood.
- **Fix:** Always confirm before saving: "I will add Paracetamol 500mg, morning and night. Say yes to confirm or no to cancel."

---

## 7. Elder-Friendly UI/UX Design System

### 7.1 Core Design Principles

The entire SaarthiRx design system is derived from a single constraint: **every interaction must be completable by a 75-year-old with mild visual impairment and no prior smartphone experience.**

This translates to five non-negotiable design rules:

1. **No small text.** Minimum 24px body text (`font-size: 24px` on `body`). Headers at 32-48px. No exceptions.
2. **No small touch targets.** Minimum 80px button height on primary actions. FAB (Floating Action Button) at 96px diameter on all screen sizes.
3. **Everything speaks.** Every state change, every navigation, every error has a TTS announcement.
4. **High contrast.** Orange (#FF8C00) on white/cream backgrounds. No gray-on-gray. No light text on light backgrounds.
5. **One thing at a time.** Each screen has one primary action. Secondary actions are subordinate, not competing.

---

### 7.2 Color System

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| Safety Orange | `#FF8C00` | `primary` | Primary buttons, mic button, active states |
| Warm White | `#FDFCF0` | `premium-gradient-start` | Background start |
| Cream | `#FFF5E6` | `warm-bg-start` | Background mid |
| Dark Gray | `#2D3748` | `text-dark` | Body text (max readability on cream) |
| Success Green | `#10B981` | `green-500` | Taken confirmation, match found |
| Warning Red | `#EF4444` | `red-500` | Drug interactions, not-in-prescription |
| Info Blue | `#3B82F6` | `blue-500` | Reminder page, medicine scan page |

**Color semantics for elder users:**
- **Orange** = action, do something now
- **Green** = safe, correct, done
- **Red** = warning, stop, danger
- **Blue** = information, no action needed
- **Gray** = disabled, unavailable

---

### 7.3 Typography

```css
body {
  font-family: 'Inter', 'Quicksand', 'Segoe UI', sans-serif;
  font-size: 24px;  /* Elder-first base size */
  line-height: 1.6;
}
```

| Element | Size | Weight | Notes |
|---|---|---|---|
| Page headers (h1) | 36-48px | Bold (700) | Fraunces display font on some screens |
| Section headers (h2) | 28-32px | Semibold (600) | |
| Body text | 24px | Regular (400) | Never go below this |
| Helper/label text | 18-20px | Medium (500) | Minimum for secondary info |
| Badge/chip text | 14-16px | Semibold | Always on colored background for contrast |

---

### 7.4 Animation System (Framer Motion)

All animations serve one of three purposes: **orientation** (where am I?), **feedback** (did it work?), or **state indication** (what's happening?).

**Orientation animations:**
- Page transitions: slide-up enter, fade-out exit (40ms delay, easeOut)
- Staggered card entrance: 0.1s delay between items (shows hierarchy)

**Feedback animations:**
- Button tap: `scale: 0.95` for 150ms (confirms touch registered)
- Success: spring scale from 0 to 1 (confirms action completed)
- Error: horizontal shake (red feedback pattern)

**State indication animations:**
- Mic listening: continuous orange pulse + waveform bars
- TTS speaking: continuous blue pulse on speaker button
- Loading: rotating border circle (not spinner — more readable for elderly)
- Alarm: pulsing ring + floating pill + shaking clock emoji

**Elder-specific animation considerations:**
- No rapid animations (>3 per second) — can cause disorientation
- All critical animations run at natural speed (no `fast` mode)
- `prefers-reduced-motion` should be respected (not currently implemented — future work)

---

### 7.5 Touch Target Standards

| Element | Current Size | Standard | Status |
|---|---|---|---|
| Mic FAB | 96px (all screens) | 80px min | ✅ Exceeds |
| Speaker FAB | 64-96px (responsive) | 80px min | ⚠️ Mobile may be 64px |
| Primary buttons | `min-h-button` (custom) | 80px | ✅ |
| Secondary buttons | 44-64px | 44px min | ✅ |
| Day selector buttons | 44px | 44px | ✅ |
| Toggle switches | 28-36px height | 28px min | ✅ |
| Delete (🗑️) | 32-40px | 44px | ⚠️ Too small on mobile |

**Gap:** Delete buttons on reminder cards are too small. They're also co-located with the toggle, increasing accidental deletion risk. Future UX: separate delete to a swipe gesture or long-press → confirmation.

---

### 7.6 Screen Flow Clarity Map

```
Welcome (language)
    ↓
Register / Login (OTP auth)
    ↓
Dashboard (hub)
    ├── Scan Prescription (/scan)
    │       └── [auto-commit] → Medicines + Reminders updated
    ├── My Medicines (/medicines)
    │       └── [detail modal] → Prescription View (orphaned)
    ├── Reminders (/reminders)
    │       └── [fires at time] → Reminder Alert (/reminder/alert/:id)
    ├── Scan Medicine (/scan-medicine)
    │       └── [photo verification] → Match/No-match result
    └── History (/history)
            └── [read-only log]
```

**Navigation back:** All non-dashboard pages have a prominent ← Back button. Voice "वापस" / "back" works globally.

---

## 8. Current Gaps & Known Issues

### 8.1 Critical UX Gaps

| # | Gap | Impact | Priority |
|---|---|---|---|
| G1 | Marathi missing from Welcome screen | Marathi speakers must select Hindi | High |
| G2 | `PrescriptionView` route is orphaned — no navigation leads to it | Feature is dead | High |
| G3 | `analyzeMedicinePhoto()` has no API timeout | Hangs indefinitely on poor connectivity | High |
| G4 | Delete button on reminder cards too small (32px) | Accidental deletion risk for elderly | Medium |
| G5 | Medicine duration defaults to 5 days for all prescriptions | Wrong reminder end-dates for chronic meds | High |
| G6 | Voice confirmation before saving via `addMedicineByVoice()` absent | Silent wrong medicine addition | High |
| G7 | `prefers-reduced-motion` not respected | Accessibility regression for photosensitive users | Medium |
| G8 | No offline state indicator | User doesn't know Firebase sync failed | Medium |
| G9 | `ScanMedicine.jsx` loaded independently but shares no state with `MyMedicines.jsx` | Two sources of truth for "verified" medicines | Medium |
| G10 | Low-stock alert (quantity < 3) has no reorder CTA | Alert is informational only | Low |

---

### 8.2 Technical Debt

| # | Issue | File | Notes |
|---|---|---|---|
| T1 | `useVoice.js` is a duplicate of `VoiceContext.jsx` | `hooks/useVoice.js` | Legacy hook — `VoiceContext` is the canonical implementation. Hook should be removed. |
| T2 | `Reminder.jsx` is dead code | `pages/Reminder.jsx` | `ReminderAlert.jsx` handles the same function. Causes confusion. |
| T3 | `NamasteGateway.jsx` is commented out | `App.jsx` | Gateway route disabled but file retained. Should be formally removed or re-enabled. |
| T4 | `AlarmPage` and `ReminderAlert` overlap | Both pages | Two separate alarm UIs with similar purpose but different trigger paths. Should be unified. |
| T5 | DevTools visible in production with env flag | `DevTools.jsx` | `VITE_SHOW_DEVTOOLS=true` in Vercel env would expose judge tools to real users. |
| T6 | `window.recaptchaVerifier` global state | `authService.js` | Global singleton works but is fragile. Should be scoped to module. |

---

### 8.3 Voice System Edge Cases

| Edge Case | Current Behavior | Recommended Fix |
|---|---|---|
| User speaks in Hinglish (mixed Hindi + English) | Partial recognition, may miss commands | Add Hinglish keyword variants |
| Background noise / TV on | Random command triggers | Add push-to-talk mode option in settings |
| Browser doesn't support Web Speech API (Firefox) | Error state, no mic | Show static UI fallback with "Use Chrome for voice features" message |
| iOS Safari voice | Limited SpeechRecognition support | Detect iOS, show dedicated notice and degrade to tap-only mode |
| Multiple family members speaking | Wrong person's voice triggers commands | No fix currently — out of scope for v1 |

---

## 9. Future Scope & Roadmap

### 9.1 Phase 2 — Stability & Language Expansion (0–3 months)

**P2.1 — Marathi Welcome Screen**
Add Marathi (मराठी) as a third language option on the Welcome screen. Currently Marathi TTS works in-app but the language is unselectable from the first screen.

**P2.2 — Unified Alarm Page**
Merge `AlarmPage.jsx` and `ReminderAlert.jsx` into a single `MedicineAlarmPage.jsx`. One component handles both reminder-triggered and notification-triggered alarms. Reduces code duplication and inconsistent behavior.

**P2.3 — Prescription View Reconnection**
Link `PrescriptionView` from medicine detail cards. Pass medicine ID and render the animated 3D pill visual with full localized instructions. Makes the visual pill renderer a functional part of the flow.

**P2.4 — API Timeout on analyzeMedicinePhoto**
Add `withTimeout()` wrapper to `analyzeMedicinePhoto()`. Display "Taking too long" TTS and retry option after 15 seconds.

**P2.5 — Offline State Indicator**
Detect Firebase sync failures and show a subtle banner: "Changes saved locally. Will sync when online." Reduces user anxiety on poor connectivity.

**P2.6 — `prefers-reduced-motion` Support**
Wrap all Framer Motion animations in a `useReducedMotion()` hook. Users with photosensitivity or vertigo won't experience jarring animations.

---

### 9.2 Phase 3 — Intelligence Upgrade (3–6 months)

**P3.1 — Chronic Disease Duration Intelligence**
Replace the 5-day default with AI-assisted duration inference. If a medicine is classified as an antihypertensive, antidiabetic, or statin, default to 30 days with a confirmation prompt.

**Prompt addition:**
```
If duration is not specified AND the medicine is a chronic disease drug 
(antihypertensive, antidiabetic, lipid-lowering, thyroid), 
set duration_days to 30 and flag duration_was_inferred: true.
```

**P3.2 — Brand Name to Generic Resolution**
Expand `MEDICINE_DATABASE` to include brand name aliases. Doctors write "Glycomet" but the strip says "Metformin." Both should match.

**Data structure enhancement:**
```javascript
{
  id: 'metformin',
  name: 'Metformin',
  genericName: 'Metformin Hydrochloride',
  brands: ['Glycomet', 'Glucophage', 'Obimet', 'Bigomet', 'Gluformin'],
  aliases: [...]
}
```

**P3.3 — Visual-Only Pill Identification Fallback**
When `verifyMedicinePhoto()` cannot read text (loose pill, worn label), run a secondary analysis:
> "Describe the pill's physical appearance: color, shape, size, any visible markings or numbers."

Cross-reference description against `visualDescription` field in saved medicines using a similarity prompt:
> "Does this pill description match any of these: [list of saved medicine visual descriptions]?"

**P3.4 — Refusal Confirmation for Voice Medicine Addition**
Raise confidence threshold to 0.75 and add pre-save confirmation:
> "I understood: Paracetamol 500mg, morning and night. Should I add this? Say yes to confirm."

**P3.5 — Prescription History Cloud Sync**
Complete the `prescriptionService.js` integration. Store scanned prescriptions in Firestore `users/{uid}/prescriptions` subcollection. Show prescription history screen with thumbnail and date.

---

### 9.3 Phase 4 — Caregiver & Family Features (6–12 months)

**P4.1 — Family Alert System**
When an elderly user misses a dose (no "Taken" action within 30 minutes of reminder), send a WhatsApp message to a registered family member.

**Integration path:** Twilio WhatsApp API (already in tech stack consideration from Nadi PRD). Message format:
> "SaarthiRx Alert: Ramesh did not take Metformin at 9 AM. Please check on him."

**P4.2 — Caregiver Dashboard (Web Portal)**
A separate read-only web portal for family members to view:
- Adherence calendar (green/red daily grid)
- Upcoming reminders
- Medicine inventory levels
- Last login time

**P4.3 — Doctor Share Feature**
Generate a PDF adherence report (medicine list + taken/missed history) shareable with the doctor during follow-up visits. Single tap → PDF generated → share via WhatsApp.

**P4.4 — Multi-User Profiles**
Allow one phone to manage multiple profiles (e.g., husband and wife). Profile switcher on dashboard with large photo/name cards.

---

### 9.4 Phase 5 — Platform Expansion (12–18 months)

**P5.1 — ABHA Integration**
Link with Ayushman Bharat Health Account (ABHA ID). Import prescriptions directly from the National Health Stack. Eliminates need for photo scanning for users with digital health records.

**P5.2 — Pharmacy Integration**
Low-stock detection (<3 pills) triggers a one-tap medicine reorder via PharmEasy/1mg API. Order status tracked in-app.

**P5.3 — Push Notifications (Service Worker)**
Replace the in-browser scheduler with a proper Service Worker background sync. Enables reliable reminders even when the browser tab is closed or the phone is locked.

**Technical path:**
```
Service Worker registration → Push API subscription → 
Firebase Cloud Messaging (FCM) → Background notification → 
Tap notification → Navigate to alarm page
```

**P5.4 — Voice Biometrics (Optional)**
For security: voice print enrollment during registration. Future authentication can verify the elderly user's identity by voice pattern, replacing OTP for daily use.

**P5.5 — Regional Language Expansion**
Add Tamil (ta-IN), Telugu (te-IN), Bengali (bn-IN), Gujarati (gu-IN). The architecture already supports any `lang` code — expansion is primarily prompt translation + TTS voice availability verification.

**P5.6 — Wearable Integration**
Smartwatch companion that displays medicine name + timing on wrist at reminder time. Tap watch → confirm taken. No phone interaction required.

---

### 9.5 Prioritized UX Improvement Backlog

| Priority | Item | Effort | Impact |
|---|---|---|---|
| 1 | Marathi Welcome screen | Low | High |
| 2 | Unified alarm page | Medium | High |
| 3 | Add timeout to `analyzeMedicinePhoto` | Low | High |
| 4 | Pre-save confirmation for voice medicine add | Low | High |
| 5 | Brand name alias database expansion | Medium | High |
| 6 | Chronic disease duration inference | Medium | High |
| 7 | Reduced motion support | Low | Medium |
| 8 | Offline state indicator | Low | Medium |
| 9 | Delete button size increase on reminder cards | Low | Medium |
| 10 | PrescriptionView reconnection | Low | Medium |
| 11 | Remove dead code (useVoice.js, Reminder.jsx) | Low | Low |
| 12 | Service Worker push notifications | High | Very High |

---

## 10. AI Output Refinement Guidelines for Elder Users

This section defines the standards for all AI-generated text (Gemini output, TTS scripts, voice summaries) that reaches an elderly user's ears or screen. Poor AI output is not just unhelpful — it is dangerous when the user is managing medications.

---

### 10.1 The Elder-Safe Language Framework

Every AI output passing through TTS to an elderly user must satisfy these five criteria:

**Criterion 1 — Concrete, not abstract**
| ❌ Bad | ✅ Good |
|---|---|
| "Take this medicine as directed" | "Take one tablet in the morning with water" |
| "Frequency: BD" | "Take this twice a day — morning and night" |
| "Duration: 30 days" | "Take this for 30 days" |

**Criterion 2 — Short sentences (max 15 words per TTS segment)**
| ❌ Bad | ✅ Good |
|---|---|
| "I found 4 medicines in your prescription and I have automatically added them to your medicine list and created reminders for the appropriate times of day." | "I found 4 medicines. I have saved them and set reminders. I will remind you at the right time." |

**Criterion 3 — Ordinal structure for multiple items**
| ❌ Bad | ✅ Good |
|---|---|
| "Metformin for morning, Amlodipine for morning, Aspirin for morning" | "First, Metformin in the morning. Second, Amlodipine in the morning. Third, Aspirin after breakfast." |

**Criterion 4 — Action-first phrasing**
| ❌ Bad | ✅ Good |
|---|---|
| "Metformin 500mg is a medicine that should be taken twice daily" | "Take Metformin 500mg twice a day — morning and night" |

**Criterion 5 — No medical jargon without explanation**
| ❌ Bad | ✅ Good |
|---|---|
| "Contraindicated with NSAIDs" | "Warning: This medicine should not be taken with pain killers like Ibuprofen" |
| "Antihypertensive agent" | "This medicine controls your blood pressure" |

---

### 10.2 TTS Script Templates (Production Ready)

These are the exact TTS scripts to use for each scenario, in all three languages:

**Prescription scan success (3 medicines):**
```
EN: "I found {count} medicines. First, {name1}, take {dosage1} {timing1}. 
     Second, {name2}, take {dosage2} {timing2}. 
     Third, {name3}, take {dosage3} {timing3}. 
     I have set reminders for all of them."

HI: "मुझे {count} दवाइयां मिलीं। पहली, {name1}, {dosage1} {timing1} लें। 
     दूसरी, {name2}, {dosage2} {timing2} लें। 
     तीसरी, {name3}, {dosage3} {timing3} लें। 
     मैंने सबके लिए रिमाइंडर सेट कर दिए हैं।"

MR: "मला {count} औषधे सापडली. पहिले, {name1}, {dosage1} {timing1} घ्या. 
     दुसरे, {name2}, {dosage2} {timing2} घ्या. 
     तिसरे, {name3}, {dosage3} {timing3} घ्या. 
     मी सर्वांसाठी रिमाइंडर सेट केले आहेत."
```

**Drug interaction warning:**
```
EN: "Warning! Two of these medicines can cause problems together. 
     {drug1} and {drug2} should not be taken together. 
     Please call your doctor before starting these medicines."

HI: "चेतावनी! इनमें से दो दवाइयां एक साथ लेना खतरनाक हो सकता है। 
     {drug1} और {drug2} एक साथ नहीं लेनी चाहिए। 
     कृपया इन दवाइयों को शुरू करने से पहले अपने डॉक्टर को फ़ोन करें।"
```

**Medicine reminder (alarm):**
```
EN: "{name}, it is time for your {medicineName}. 
     Please take {dosage} with water now. 
     Say 'Taken' when done."

HI: "{name}, आपकी {medicineName} लेने का समय हो गया। 
     अभी {dosage} पानी के साथ लें। 
     लेने के बाद 'ले लिया' बोलें।"
```

**Unreadable prescription:**
```
EN: "I could not read this prescription clearly. 
     Please try again in better light. 
     Hold the prescription flat and steady."

HI: "मैं इस पर्चे को साफ नहीं पढ़ सका। 
     अच्छी रोशनी में फिर से कोशिश करें। 
     पर्चे को सपाट और स्थिर रखें।"
```

---

### 10.3 Gemini Prompt Improvements for Elder-Safe Output

**Improvement 1 — Force plain language in probable_reason:**
Add to prescription OCR prompt:
```
For "probable_reason": Write in simple language a patient can understand. 
Example: Instead of "Antihypertensive" write "Controls blood pressure". 
Instead of "Hypoglycemic agent" write "Manages blood sugar". 
Maximum 6 words. Avoid all medical jargon.
```

**Improvement 2 — Force elder-safe dosage description:**
Add to prescription OCR prompt:
```
For "visual_description": Write as if explaining to a 70-year-old. 
Example: "Small white round tablet" not "Circular compressed tablet, 
white film-coated". Keep under 6 words.
```

**Improvement 3 — Timing in natural language:**
Instead of returning `timing: ["morning", "night"]`, also return:
```json
"timing_natural": {
  "en-US": "morning and night",
  "hi-IN": "सुबह और रात",
  "mr-IN": "सकाळी आणि रात्री"
}
```
This eliminates the client-side translation layer and reduces bugs.

**Improvement 4 — Elder-safe warning messages:**
Add to drug interaction check:
```
Generate warning_simple: A one-sentence warning understandable to a 
70-year-old patient with no medical education. 
Example: "These two medicines together can cause too much bleeding."
```

---

### 10.4 Screen Text Refinement Checklist

For every new screen or feature, run this checklist before shipping:

- [ ] Does every error message have a TTS-friendly version? (no symbols, no jargon)
- [ ] Is the most important information in the first sentence? (elderly may stop listening)
- [ ] Are numbers spoken as words? ("take 2 tablets" not "take 2 tabs")
- [ ] Are all abbreviations expanded in TTS? (BD → "twice a day", OD → "once a day")
- [ ] Is there a haptic companion for every audio alert? (for hearing-impaired users)
- [ ] Does the screen work with zero text visible? (voice-only navigation test)
- [ ] Is the primary action button orange and at least 80px tall?
- [ ] Does the page auto-announce on mount without requiring user to tap repeat?

---

### 10.5 Failure Mode Design

When AI fails, the fallback experience must be designed — not accidental.

| AI Failure | Bad fallback | Elder-safe fallback |
|---|---|---|
| Prescription unreadable | "Error: Could not parse JSON" | "I could not read this. Please try in better light." + retry button |
| API timeout | Loading spinner forever | "This is taking too long. Please check your internet." + cancel + retry |
| Wrong medicine detected | Silent wrong add | Show detected name, ask confirmation, allow correction |
| Drug interaction false positive | Block all medicines | Show warning, allow override with "My doctor said this is okay" |
| OTP not received | Generic error | "The secret code takes 1-2 minutes. Keep the app open." + countdown |
| Voice not understood | No feedback | "I didn't understand. Please say that again." + gentle haptic |

The design principle: **a confused elderly user will not try again — they will put the phone down and call their child.** Every failure mode must give a clear, calm, specific next action.

---

## Appendix A — Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite 7 | Core UI framework |
| Styling | Tailwind CSS 3 + custom tokens | Elder-friendly design system |
| Animation | Framer Motion | State-indication animations |
| Routing | React Router 7 + AnimatePresence | Page transitions with exit animations |
| Voice Input | Web Speech API (SpeechRecognition) | STT — Hindi, English, Marathi |
| Voice Output | Web Speech API (SpeechSynthesis) | TTS — rate 0.9, regional voices |
| AI Vision | Google Gemini 2.0 Flash | Prescription OCR + medicine verification |
| AI Language | Google Gemini 2.0 Flash | Natural language medicine parsing |
| Auth | Firebase Phone Auth + reCAPTCHA | Phone OTP (WebOTP API for auto-fill) |
| Database | Firestore + localStorage | Cloud sync + offline-first fallback |
| Fuzzy Matching | Fuse.js | Voice command matching + medicine name correction |

---

## Appendix B — Voice Command Quick Reference

| Say this | In Hindi | In Marathi | What happens |
|---|---|---|---|
| Scan | स्कैन | स्कॅन | Opens prescription scanner |
| Home | होम / घर | होम / घर | Returns to dashboard |
| Medicines | दवाई / दवाइयां | औषध / औषधे | Opens medicine list |
| Reminders | रिमाइंडर | रिमाइंडर | Opens reminders |
| Check medicine | दवाई जांचो | औषध तपासा | Opens medicine verifier |
| Back | वापस | मागे | Goes to previous page |
| Repeat | दोहराओ | पुन्हा सांगा | Re-reads current page |
| Stop | रुको / बस | थांबा / बस | Silences TTS immediately |
| Help | मदद | मदत | Lists all commands |
| Camera | कैमरा | कॅमेरा | Opens camera (on /scan only) |
| Click | क्लिक / खींचो | क्लिक / घ्या | Captures photo (on /scan only) |

---

*Document version 1.0 | SaarthiRx Hackathon PRD | Nakshatra 2026*
