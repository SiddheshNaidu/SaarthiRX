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
 * Get user profile from Firestore
 * @param {string} uid - Firebase user UID
 * @returns {Promise<object|null>} User profile or null if not found
 */
export const getUserFromFirestore = async (uid) => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data();
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching user from Firestore:', error);
        throw error;
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
