import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Firebase config (Vite uses import.meta.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate config — prevent silent crash on missing .env
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);

    // Initialize App Check with reCAPTCHA v3
    if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true
        });
        console.log('App Check initialized successfully');
      } catch (error) {
        console.warn('App Check initialization failed:', error);
      }
    }

    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn(
    '⚠️ Firebase config missing. Create a .env file in project root with:\n' +
    'VITE_FIREBASE_API_KEY=your_key\n' +
    'VITE_FIREBASE_AUTH_DOMAIN=your_domain\n' +
    'VITE_FIREBASE_PROJECT_ID=your_project_id\n' +
    'VITE_FIREBASE_STORAGE_BUCKET=your_bucket\n' +
    'VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id\n' +
    'VITE_FIREBASE_APP_ID=your_app_id'
  );
}

// Export services (may be null if config is missing — app still renders)
export { auth, db };
