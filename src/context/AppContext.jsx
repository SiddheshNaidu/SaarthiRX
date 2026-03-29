import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { getUserFromFirestore } from '../services/userService';

const AppContext = createContext();

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    // Language state - persistent via localStorage (default: Hindi)
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('saarthi_language') || 'hi-IN';
    });

    // User data - persistent via localStorage
    const [user, setUserState] = useState(() => {
        const savedUser = localStorage.getItem('saarthi_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // Firebase auth state
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState(null);

    // Current page content for "Repeat" voice command
    const [currentPageContent, setCurrentPageContent] = useState('');

    // Listen for Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                // User is signed in - try to load profile from Firestore
                try {
                    const profile = await getUserFromFirestore(fbUser.uid);
                    if (profile) {
                        setUserState(profile);
                        localStorage.setItem('saarthi_user', JSON.stringify(profile));

                        // Apply saved language preference
                        if (profile.language) {
                            setLanguageState(profile.language);
                            localStorage.setItem('saarthi_language', profile.language);
                        }
                    }
                } catch (error) {
                    console.error('Error loading user profile:', error);
                }
            }

            setIsAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Update language and persist
    const setLanguage = (lang) => {
        setLanguageState(lang);
        localStorage.setItem('saarthi_language', lang);
    };

    // Save user data and persist (to localStorage - Firestore is handled separately)
    const saveUser = (userData) => {
        setUserState(userData);
        localStorage.setItem('saarthi_user', JSON.stringify(userData));
    };

    // Clear user data
    const clearUser = () => {
        setUserState(null);
        setFirebaseUser(null);
        localStorage.removeItem('saarthi_user');
    };

    // Get language display name
    const getLanguageName = () => {
        const names = {
            'en-US': 'English',
            'hi-IN': 'हिंदी',
            'mr-IN': 'मराठी'
        };
        return names[language] || 'English';
    };

    // Check if user is authenticated
    const isAuthenticated = () => {
        return firebaseUser !== null || user !== null;
    };

    // Saved medicines state (Phase 5: Medicine Safety Shield)
    const [savedMedicines, setSavedMedicines] = useState(() => {
        const saved = localStorage.getItem('saarthi_medicines');
        return saved ? JSON.parse(saved) : [];
    });

    // Add medicine to saved list
    const addMedicine = (medicine) => {
        const updated = [...savedMedicines, { ...medicine, addedAt: Date.now() }];
        setSavedMedicines(updated);
        localStorage.setItem('saarthi_medicines', JSON.stringify(updated));
    };

    // Get all saved medicines
    const getMedicines = () => savedMedicines;

    // Clear all medicines
    const clearMedicines = () => {
        setSavedMedicines([]);
        localStorage.removeItem('saarthi_medicines');
    };

    // Update a specific medicine (e.g., decrement quantity)
    const updateMedicine = (medicineId, updates) => {
        const updated = savedMedicines.map(med => 
            med.id === medicineId ? { ...med, ...updates } : med
        );
        setSavedMedicines(updated);
        localStorage.setItem('saarthi_medicines', JSON.stringify(updated));
        return updated.find(m => m.id === medicineId);
    };

    // Decrement medicine quantity by 1 (for "Taken" action)
    const decrementMedicineQuantity = (medicineId) => {
        const medicine = savedMedicines.find(m => m.id === medicineId);
        if (medicine && medicine.quantity > 0) {
            return updateMedicine(medicineId, { quantity: medicine.quantity - 1 });
        }
        return medicine;
    };

    const value = {
        language,
        setLanguage,
        getLanguageName,
        user,
        saveUser,
        clearUser,
        currentPageContent,
        setCurrentPageContent,
        firebaseUser,
        isAuthLoading,
        isAuthenticated,
        savedMedicines,
        addMedicine,
        getMedicines,
        clearMedicines,
        updateMedicine,
        decrementMedicineQuantity,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
