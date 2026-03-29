/**
 * Demo Data Loader
 * Populates localStorage with sample medicines and reminders for testing
 * Use this when Gemini API is unavailable
 */

// Sample medicines with visual descriptions
const DEMO_MEDICINES = [
    {
        id: 'demo-1',
        name: 'Amlodipine',
        dosage: '5mg',
        timing: ['morning'],
        frequency: 'Once daily',
        durationDays: 30,
        withFood: false,
        visualType: 'Tablet',
        visualColor: 'white',
        visualDescription: 'Small white round tablet',
        specialInstructions: 'Take on empty stomach',
        quantity: 28,
        addedAt: Date.now(),
        prescriptionDate: new Date().toISOString()
    },
    {
        id: 'demo-2',
        name: 'Metformin',
        dosage: '500mg',
        timing: ['morning', 'night'],
        frequency: 'Twice daily',
        durationDays: 30,
        withFood: true,
        visualType: 'Tablet',
        visualColor: 'white',
        visualDescription: 'Oval white tablet with marking',
        specialInstructions: 'Take with meals',
        quantity: 56,
        addedAt: Date.now(),
        prescriptionDate: new Date().toISOString()
    },
    {
        id: 'demo-3',
        name: 'Paracetamol',
        dosage: '650mg',
        timing: ['morning', 'afternoon', 'night'],
        frequency: 'Three times daily',
        durationDays: 7,
        withFood: false,
        visualType: 'Tablet',
        visualColor: 'yellow',
        visualDescription: 'Yellow round tablet',
        specialInstructions: 'Take for fever or pain',
        quantity: 15,
        addedAt: Date.now(),
        prescriptionDate: new Date().toISOString()
    },
    {
        id: 'demo-4',
        name: 'Vitamin D3',
        dosage: '60000 IU',
        timing: ['morning'],
        frequency: 'Once weekly',
        durationDays: 60,
        withFood: true,
        visualType: 'Capsule',
        visualColor: 'orange',
        visualDescription: 'Orange soft gel capsule',
        specialInstructions: 'Take with fatty meal for better absorption',
        quantity: 8,
        addedAt: Date.now(),
        prescriptionDate: new Date().toISOString()
    },
    {
        id: 'demo-5',
        name: 'Aspirin',
        dosage: '75mg',
        timing: ['morning'],
        frequency: 'Once daily',
        durationDays: 30,
        withFood: true,
        visualType: 'Tablet',
        visualColor: 'pink',
        visualDescription: 'Small pink coated tablet',
        specialInstructions: 'Blood thinner - take after breakfast',
        quantity: 2, // Low stock for testing alert
        addedAt: Date.now(),
        prescriptionDate: new Date().toISOString()
    }
];

// Sample reminders
const DEMO_REMINDERS = [
    {
        id: 'rem-1',
        medicineName: 'Amlodipine',
        description: '5mg - Small white round tablet',
        color: '#3B82F6',
        time: '09:00',
        nextFireTime: getTomorrowTime(9, 0),
        nextFireHour: 9,
        nextFireMinute: 0,
        enabled: true,
        repeatDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        createdAt: new Date().toISOString()
    },
    {
        id: 'rem-2',
        medicineName: 'Metformin',
        description: '500mg - Oval white tablet',
        color: '#10B981',
        time: '09:00',
        nextFireTime: getTomorrowTime(9, 0),
        nextFireHour: 9,
        nextFireMinute: 0,
        enabled: true,
        repeatDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        createdAt: new Date().toISOString()
    },
    {
        id: 'rem-3',
        medicineName: 'Metformin',
        description: '500mg - Oval white tablet',
        color: '#10B981',
        time: '21:00',
        nextFireTime: getTomorrowTime(21, 0),
        nextFireHour: 21,
        nextFireMinute: 0,
        enabled: true,
        repeatDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        createdAt: new Date().toISOString()
    },
    {
        id: 'rem-4',
        medicineName: 'Aspirin',
        description: '75mg - Small pink tablet',
        color: '#EC4899',
        time: '09:00',
        nextFireTime: getTomorrowTime(9, 0),
        nextFireHour: 9,
        nextFireMinute: 0,
        enabled: true,
        repeatDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        createdAt: new Date().toISOString()
    }
];

function getTomorrowTime(hours, minutes) {
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    if (date <= new Date()) {
        date.setDate(date.getDate() + 1);
    }
    return date.toISOString();
}

/**
 * Load demo data into localStorage
 * Call this from browser console: loadDemoData()
 */
export function loadDemoData() {
    // Save demo medicines
    localStorage.setItem('saarthi_medicines', JSON.stringify(DEMO_MEDICINES));
    
    // Save demo reminders
    localStorage.setItem('saarthirx_reminders', JSON.stringify(DEMO_REMINDERS));
    
    console.log('✅ Demo data loaded!');
    console.log(`   📦 ${DEMO_MEDICINES.length} medicines added`);
    console.log(`   ⏰ ${DEMO_REMINDERS.length} reminders added`);
    console.log('   🔄 Reloading page to apply changes...');
    
    setTimeout(() => window.location.reload(), 1000);
    
    return { medicines: DEMO_MEDICINES, reminders: DEMO_REMINDERS };
}

/**
 * Clear all demo data
 */
export function clearDemoData() {
    localStorage.removeItem('saarthi_medicines');
    localStorage.removeItem('saarthirx_reminders');
    console.log('🧹 Demo data cleared!');
    console.log('   🔄 Reloading page to apply changes...');
    
    setTimeout(() => window.location.reload(), 1000);
}

// Demo prescription data for showcasing to judges
const DEMO_PRESCRIPTION = {
    id: 'demo-prescription-1',
    patientName: 'Mr. Ramesh Kumar',
    doctorName: 'Dr. Sanjay Mehta',
    hospital: 'City Care Hospital',
    date: new Date().toLocaleDateString('en-IN'),
    diagnosis: 'Type 2 Diabetes with Hypertension',
    imageUrl: null, // No actual image needed for demo
    medicines: [
        {
            id: 'rx-med-1',
            name: 'Metformin',
            genericName: 'Metformin Hydrochloride',
            dosage: '500mg',
            timing: ['morning', 'night'],
            frequency: 'Twice daily',
            durationDays: 30,
            withFood: true,
            visualType: 'Tablet',
            visualColor: 'white',
            visualDescription: 'Oval white tablet with "MET 500" marking',
            specialInstructions: 'Take with meals to reduce stomach upset. Do not crush.',
            quantity: 60,
            sideEffects: 'May cause mild nausea initially',
            warnings: 'Avoid alcohol while taking this medicine'
        },
        {
            id: 'rx-med-2',
            name: 'Amlodipine',
            genericName: 'Amlodipine Besylate',
            dosage: '5mg',
            timing: ['morning'],
            frequency: 'Once daily',
            durationDays: 30,
            withFood: false,
            visualType: 'Tablet',
            visualColor: 'white',
            visualDescription: 'Small round white tablet',
            specialInstructions: 'Take at the same time every day for best results',
            quantity: 30,
            sideEffects: 'May cause mild swelling in feet',
            warnings: 'Do not stop suddenly without consulting doctor'
        },
        {
            id: 'rx-med-3',
            name: 'Atorvastatin',
            genericName: 'Atorvastatin Calcium',
            dosage: '10mg',
            timing: ['night'],
            frequency: 'Once daily at bedtime',
            durationDays: 30,
            withFood: false,
            visualType: 'Tablet',
            visualColor: 'pink',
            visualDescription: 'Small pink oval tablet',
            specialInstructions: 'Take at bedtime for best effect on cholesterol',
            quantity: 30,
            sideEffects: 'Report any muscle pain immediately',
            warnings: 'Avoid grapefruit juice'
        },
        {
            id: 'rx-med-4',
            name: 'Aspirin',
            genericName: 'Acetylsalicylic Acid',
            dosage: '75mg',
            timing: ['morning'],
            frequency: 'Once daily',
            durationDays: 30,
            withFood: true,
            visualType: 'Tablet',
            visualColor: 'yellow',
            visualDescription: 'Small yellow coated tablet',
            specialInstructions: 'Take after breakfast. Blood thinner for heart protection.',
            quantity: 30,
            sideEffects: 'May cause stomach irritation',
            warnings: 'Stop 5 days before any surgery'
        }
    ],
    summary: {
        'en-US': 'You have 4 medicines to take. Metformin twice daily with meals, Amlodipine once in the morning, Atorvastatin at bedtime, and Aspirin after breakfast.',
        'hi-IN': 'आपको 4 दवाइयां लेनी हैं। मेटफॉर्मिन दिन में दो बार खाने के साथ, एम्लोडिपिन सुबह एक बार, एटोरवास्टेटिन सोने से पहले, और एस्पिरिन नाश्ते के बाद।'
    }
};

/**
 * Load demo prescription and navigate to view it
 * Perfect for showcasing to judges how the app works
 */
export function loadDemoPrescription() {
    // Store the demo prescription
    const prescriptions = JSON.parse(localStorage.getItem('saarthi_prescriptions') || '[]');
    
    // Remove any existing demo prescription
    const filtered = prescriptions.filter(p => p.id !== DEMO_PRESCRIPTION.id);
    filtered.unshift({ ...DEMO_PRESCRIPTION, scannedAt: Date.now() });
    
    localStorage.setItem('saarthi_prescriptions', JSON.stringify(filtered));
    
    // Also add the medicines from prescription to medicines list
    const medicines = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
    const existingIds = new Set(medicines.map(m => m.id));
    
    const newMedicines = DEMO_PRESCRIPTION.medicines
        .filter(m => !existingIds.has(m.id))
        .map(m => ({
            ...m,
            addedAt: Date.now(),
            prescriptionDate: new Date().toISOString(),
            prescriptionId: DEMO_PRESCRIPTION.id
        }));
    
    localStorage.setItem('saarthi_medicines', JSON.stringify([...newMedicines, ...medicines]));
    
    console.log('✅ Demo prescription loaded!');
    console.log(`   📋 Prescription: ${DEMO_PRESCRIPTION.diagnosis}`);
    console.log(`   💊 ${DEMO_PRESCRIPTION.medicines.length} medicines added`);
    console.log('   🔄 Navigating to dashboard...');
    
    // Navigate to dashboard to show the prescription
    setTimeout(() => {
        window.location.href = '/dashboard';
    }, 500);
    
    return DEMO_PRESCRIPTION;
}

/**
 * Start a simulated AI scan experience for demos
 * Shows the full scanning flow: preview → analyzing animation → results with voice summary
 * Perfect for showing judges how the AI works without using API quota
 */
export function startDemoScan() {
    console.log('🎬 Starting demo scan experience...');
    console.log('   📋 Will simulate AI prescription analysis');
    console.log('   🔊 Voice summary will play after "analysis"');
    
    // Navigate to scan page with demo mode flag
    window.location.href = '/scan?demo=true';
    
    return true;
}

/**
 * Get demo prescription data (for use by ScanPrescription page)
 */
export function getDemoPrescriptionData() {
    return DEMO_PRESCRIPTION;
}

// Make available globally for console access
if (typeof window !== 'undefined') {
    window.loadDemoData = loadDemoData;
    window.clearDemoData = clearDemoData;
    window.loadDemoPrescription = loadDemoPrescription;
    window.startDemoScan = startDemoScan;
    window.getDemoPrescriptionData = getDemoPrescriptionData;
}

export default { 
    loadDemoData, 
    clearDemoData, 
    loadDemoPrescription, 
    startDemoScan,
    getDemoPrescriptionData,
    DEMO_MEDICINES, 
    DEMO_REMINDERS, 
    DEMO_PRESCRIPTION 
};
