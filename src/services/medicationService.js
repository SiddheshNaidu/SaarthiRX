/**
 * Medication Service
 * Handles medication logging, reminders, and Firestore sync for Smart Patient Module
 */

import { 
    collection, 
    addDoc, 
    updateDoc,
    doc,
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    limit,
    getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

const MEDICINES_COLLECTION = 'medicines';
const MEDICATION_LOGS_COLLECTION = 'medication_logs';

/**
 * Check for existing medicines to prevent duplicates
 * @param {string} userId - User ID
 * @param {string} medicineName - Medicine name to check
 * @returns {Promise<boolean>} True if medicine already exists
 */
const checkMedicineExists = async (userId, medicineName) => {
    const q = query(
        collection(db, MEDICINES_COLLECTION),
        where('userId', '==', userId),
        where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const normalizedName = medicineName.toLowerCase().trim();
    
    return snapshot.docs.some(doc => {
        const existingName = doc.data().name?.toLowerCase().trim();
        return existingName === normalizedName || 
               existingName?.includes(normalizedName) || 
               normalizedName.includes(existingName);
    });
};

/**
 * Save medicines from prescription scan to Firestore with DEDUPLICATION
 * @param {array} medicines - Array of medicine objects from Gemini extraction
 * @param {object} prescriptionMeta - Doctor name, date, etc.
 * @returns {Promise<object>} { savedIds, duplicates, newCount, duplicateCount }
 */
export const saveMedicines = async (medicines, prescriptionMeta = {}) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const savedIds = [];
    const duplicates = [];
    const now = new Date();

    // Also check localStorage for medicines (fallback)
    const localMedicines = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');

    for (const medicine of medicines) {
        // ANTI-DUPLICATE GATEKEEPER: Check if medicine already exists
        const existsInFirestore = await checkMedicineExists(userId, medicine.name);
        const existsInLocal = localMedicines.some(m => 
            m.name?.toLowerCase().trim() === medicine.name?.toLowerCase().trim()
        );

        if (existsInFirestore || existsInLocal) {
            console.log(`⚠️ Duplicate detected: ${medicine.name} - NOT adding`);
            duplicates.push(medicine.name);
            continue; // Skip this medicine
        }

        const medicineDoc = {
            userId,
            name: medicine.name,
            dosage: medicine.dosage || '',
            frequency: medicine.frequency || 'OD',
            timing: medicine.timing || ['morning'],
            timesPerDay: medicine.timesPerDay || 1,
            reminderTimes: medicine.reminderTimes || ['08:00'],
            durationDays: medicine.durationDays || 5,
            withFood: medicine.withFood ?? true,
            visualType: medicine.visualType || 'Tablet',
            visualColor: medicine.visualColor || 'White',
            visualDescription: medicine.visualDescription || '',
            specialInstructions: medicine.specialInstructions || '',
            
            // Visual verifier data (populated later when user photographs pill)
            userPhoto: null,
            expiryDate: null,
            verifiedVisual: null,
            
            // Prescription metadata
            doctorName: prescriptionMeta.doctorName || null,
            prescriptionDate: prescriptionMeta.date || null,
            
            // Inventory
            quantity: 30, // Default 30 pills
            
            // Tracking
            startDate: now.toISOString(),
            endDate: new Date(now.getTime() + (medicine.durationDays || 5) * 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, MEDICINES_COLLECTION), medicineDoc);
        savedIds.push(docRef.id);
        console.log(`💊 Saved medicine: ${medicine.name} (ID: ${docRef.id})`);
    }

    return {
        savedIds,
        duplicates,
        newCount: savedIds.length,
        duplicateCount: duplicates.length
    };
};

/**
 * Update medicine with visual verification data from user photo
 * @param {string} medicineId - Firestore document ID
 * @param {object} visualData - Data from analyzeMedicinePhoto
 * @param {string} photoUrl - URL/base64 of user's photo
 */
export const updateMedicineVisual = async (medicineId, visualData, photoUrl = null) => {
    const medicineRef = doc(db, MEDICINES_COLLECTION, medicineId);
    
    await updateDoc(medicineRef, {
        userPhoto: photoUrl,
        expiryDate: visualData.expiryDate || null,
        verifiedVisual: visualData.visualDescription || null,
        visualColor: visualData.color || null,
        visualShape: visualData.shape || null,
        updatedAt: serverTimestamp()
    });

    console.log(`📸 Updated visual data for medicine: ${medicineId}`);
};

/**
 * Log a medication action (taken/missed/snoozed)
 * @param {string} medicineId - Medicine document ID
 * @param {string} medicineName - Medicine name for display
 * @param {string} action - 'taken' | 'missed' | 'snoozed'
 * @param {object} details - Additional details
 */
export const logMedicationAction = async (medicineId, medicineName, action, details = {}) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.warn('Cannot log action: User not authenticated');
        return null;
    }

    const logDoc = {
        userId,
        medicineId,
        medicineName,
        action,  // 'taken' | 'missed' | 'snoozed'
        scheduledTime: details.scheduledTime || null,
        actionTime: serverTimestamp(),
        timing: details.timing || null,  // 'morning', 'night', etc.
        notes: details.notes || null,
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, MEDICATION_LOGS_COLLECTION), logDoc);
    console.log(`📝 Logged ${action}: ${medicineName} (ID: ${docRef.id})`);
    return docRef.id;
};

/**
 * Get user's active medicines
 * @param {function} onUpdate - Callback for real-time updates
 * @returns {function} Unsubscribe function
 */
export const subscribeToActiveMedicines = (onUpdate, onError) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        onUpdate([]);
        return () => {};
    }

    const q = query(
        collection(db, MEDICINES_COLLECTION),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, 
        (snapshot) => {
            const medicines = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            onUpdate(medicines);
        },
        onError
    );
};

/**
 * Get today's medication logs for a user
 */
export const getTodaysLogs = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        collection(db, MEDICATION_LOGS_COLLECTION),
        where('userId', '==', userId),
        where('createdAt', '>=', today),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

/**
 * Deactivate a medicine (stop reminders)
 */
export const deactivateMedicine = async (medicineId) => {
    const medicineRef = doc(db, MEDICINES_COLLECTION, medicineId);
    await updateDoc(medicineRef, {
        isActive: false,
        updatedAt: serverTimestamp()
    });
    console.log(`🛑 Deactivated medicine: ${medicineId}`);
};
