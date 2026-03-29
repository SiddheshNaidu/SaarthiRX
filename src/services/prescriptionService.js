/**
 * Prescription Service - Firestore operations for prescriptions
 * Stores prescriptions as subcollection under users/{userId}/prescriptions
 */

import { 
    collection, 
    doc, 
    addDoc, 
    getDoc, 
    getDocs, 
    query, 
    orderBy,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Save a prescription to Firestore
 * @param {string} uid - User's Firebase UID
 * @param {object} prescriptionData - Prescription data from Gemini
 * @returns {Promise<string>} - The saved prescription ID
 */
export const savePrescription = async (uid, prescriptionData) => {
    try {
        if (!uid) {
            throw new Error('User ID is required to save prescription');
        }

        const prescriptionsRef = collection(db, 'users', uid, 'prescriptions');
        
        const prescriptionDoc = {
            patient: prescriptionData.patient || null,
            doctor: prescriptionData.doctor || null,
            prescriptionDate: prescriptionData.prescriptionDate || null,
            diagnosis: prescriptionData.diagnosis || null,
            medicines: prescriptionData.medicines || [],
            generalAdvice: prescriptionData.generalAdvice || null,
            followUp: prescriptionData.followUp || null,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(prescriptionsRef, prescriptionDoc);
        
        console.log('💾 Prescription saved to Firestore:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving prescription to Firestore:', error);
        throw error;
    }
};

/**
 * Get all prescriptions for a user
 * @param {string} uid - User's Firebase UID
 * @returns {Promise<array>} - Array of prescriptions
 */
export const getUserPrescriptions = async (uid) => {
    try {
        if (!uid) {
            throw new Error('User ID is required to fetch prescriptions');
        }

        const prescriptionsRef = collection(db, 'users', uid, 'prescriptions');
        const q = query(prescriptionsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const prescriptions = [];
        querySnapshot.forEach((doc) => {
            prescriptions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`📋 Fetched ${prescriptions.length} prescriptions for user:`, uid);
        return prescriptions;
    } catch (error) {
        console.error('Error fetching prescriptions from Firestore:', error);
        throw error;
    }
};

/**
 * Get a specific prescription by ID
 * @param {string} uid - User's Firebase UID
 * @param {string} prescriptionId - Prescription document ID
 * @returns {Promise<object|null>} - Prescription data or null
 */
export const getPrescriptionById = async (uid, prescriptionId) => {
    try {
        if (!uid || !prescriptionId) {
            throw new Error('User ID and Prescription ID are required');
        }

        const prescriptionRef = doc(db, 'users', uid, 'prescriptions', prescriptionId);
        const docSnap = await getDoc(prescriptionRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching prescription from Firestore:', error);
        throw error;
    }
};
