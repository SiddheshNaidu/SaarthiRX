import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    query, 
    collection, 
    where, 
    getDocs,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const USERS_COLLECTION = 'users';

/**
 * Save user profile to Firestore
 * @param {string} uid - Firebase user UID
 * @param {object} userData - User profile data
 * @returns {Promise<void>}
 */
export const saveUserToFirestore = async (uid, userData) => {
    try {
        if (!db) {
            console.warn(`🔥 Mock Mode: Faking saveUserToFirestore for ${uid}`);
            return {
                uid,
                phone: userData.phone,
                name: userData.name,
                gender: userData.gender,
                age: parseInt(userData.age || '0', 10),
                language: userData.language || 'hi-IN',
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }

        const userRef = doc(db, USERS_COLLECTION, uid);
        
        const userDoc = {
            uid,
            phone: userData.phone,
            name: userData.name,
            gender: userData.gender,
            age: parseInt(userData.age, 10),
            language: userData.language || 'hi-IN',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(userRef, userDoc);
        
        console.log('User saved to Firestore:', uid);
        return userDoc;
    } catch (error) {
        console.error('Error saving user to Firestore:', error);
        throw error;
    }
};

/**
 * Get user profile from Firestore with exponential backoff retry.
 * @param {string} uid - Firebase user UID
 * @returns {Promise<object|null|undefined>}
 *   object    = profile found (returning user)
 *   null      = confirmed new user (document doesn't exist)
 *   undefined = transient network error after all retries — do NOT treat as new user
 */
export const getUserFromFirestore = async (uid) => {
    if (!db) {
        console.warn(`🔥 Mock Mode: getUserFromFirestore(${uid}) returning null`);
        return null;
    }

    const MAX_ATTEMPTS = 3;
    const BASE_DELAY_MS = 300; // 300ms → 600ms → 1200ms

    const isTransientError = (error) => {
        const code = error?.code || '';
        const msg  = error?.message?.toLowerCase() || '';
        return (
            ['unavailable', 'deadline-exceeded', 'resource-exhausted', 'cancelled', 'aborted']
                .some(c => code.includes(c)) ||
            msg.includes('offline') ||
            msg.includes('client is offline') ||
            msg.includes('timeout')
        );
    };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const userRef = doc(db, USERS_COLLECTION, uid);

            // Race getDoc against a 15s per-attempt timeout.
            // IndexedDB cache usually wins this race on warm loads (sub-100ms).
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firestore getDoc timeout')), 15000)
            );

            const userSnap = await Promise.race([getDoc(userRef), timeoutPromise]);

            if (userSnap.exists()) {
                return userSnap.data(); // Returning user
            }
            return null; // Confirmed new user — document does not exist
        } catch (error) {
            if (!isTransientError(error)) {
                // Permission error, invalid query, etc. — do not retry
                console.error('Error fetching user from Firestore:', error);
                throw error;
            }

            if (attempt < MAX_ATTEMPTS) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(
                    `⚠️ Firestore transient error (attempt ${attempt}/${MAX_ATTEMPTS}), ` +
                    `retrying in ${delay}ms:`, error.message
                );
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // All retries exhausted — status unknown, not safe to assume new user
                console.warn(
                    `⚠️ Firestore failed after ${MAX_ATTEMPTS} attempts for ${uid}:`, error.message
                );
                return undefined;
            }
        }
    }
};



/**
 * Update user profile in Firestore
 * @param {string} uid - Firebase user UID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateUserInFirestore = async (uid, updates) => {
    try {
        if (!db) {
            console.warn(`🔥 Mock Mode: Faking updateUserInFirestore for ${uid}`);
            return;
        }

        const userRef = doc(db, USERS_COLLECTION, uid);
        
        await updateDoc(userRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        
        console.log('User updated in Firestore:', uid);
    } catch (error) {
        console.error('Error updating user in Firestore:', error);
        throw error;
    }
};

/**
 * Check if a user exists by phone number
 * @param {string} phoneNumber - Phone number to check (without country code)
 * @returns {Promise<object|null>} User data if exists, null otherwise
 */
export const checkUserExistsByPhone = async (phoneNumber) => {
    try {
        if (!db) {
            console.warn('🔥 Mock Mode: Faking checkUserExistsByPhone');
            return null;
        }

        // Normalize phone number
        const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-10);
        
        const usersRef = collection(db, USERS_COLLECTION);
        const q = query(usersRef, where('phone', '==', normalizedPhone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data();
        }
        
        return null;
    } catch (error) {
        console.error('Error checking user by phone:', error);
        throw error;
    }
};

/**
 * Check if user profile is complete
 * @param {object} userData - User data object
 * @returns {boolean} True if profile has all required fields
 */
export const isProfileComplete = (userData) => {
    if (!userData) return false;
    
    const requiredFields = ['name', 'gender', 'age', 'phone'];
    return requiredFields.every(field => 
        userData[field] !== undefined && 
        userData[field] !== null && 
        userData[field] !== ''
    );
};
