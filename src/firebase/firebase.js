import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentSingleTabManager
} from "firebase/firestore";
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

const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;

if (isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);

        // App Check (only when key is configured)
        if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
            try {
                initializeAppCheck(app, {
                    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
                    isTokenAutoRefreshEnabled: true
                });
            } catch (e) {
                console.warn('App Check initialization failed (non-fatal):', e);
            }
        }

        auth = getAuth(app);

        // Bug #6 fix: Use persistentSingleTabManager instead of persistentMultipleTabManager.
        // The multi-tab manager requires SharedWorker/BroadcastChannel APIs which are
        // unavailable in iOS Safari, causing db initialization to fail silently on mobile.
        // Single-tab manager works on all browsers including iOS Safari.
        db = initializeFirestore(app, {
            cache: persistentLocalCache({
                tabManager: persistentSingleTabManager({ forceOwnership: true })
            })
        });
        // ─────────────────────────────────────────────────────────────────────

        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
    }
} else {
    console.warn(
        '⚠️ Firebase config missing. Add these to your .env file:\n' +
        'VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,\n' +
        'VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID'
    );
}

export { auth, db };
