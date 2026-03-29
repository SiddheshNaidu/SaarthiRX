/**
 * Gemini AI Service for Prescription Analysis
 * Uses Google's Gemini 1.5 Flash for prescription OCR and drug interaction checks
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { correctMedicineName } from '../data/medicineDatabase';

// Initialize Gemini with API key validation
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// DEV: Log API key status (never log the actual key!)
if (import.meta.env.DEV) {
    console.log(`🔑 Gemini API Key: ${API_KEY ? 'CONFIGURED (' + API_KEY.substring(0, 8) + '...)' : '❌ MISSING!'}`);
}

if (!API_KEY) {
    console.error('❌ CRITICAL: VITE_GEMINI_API_KEY is not set in .env file!');
}

const genAI = new GoogleGenerativeAI(API_KEY || 'MISSING_KEY');

// Known dangerous drug combinations (Phase 5: Safety Shield)
const DANGEROUS_COMBOS = [
    { drugs: ['aspirin', 'clopidogrel'], warning: 'Blood thinners - increased bleeding risk' },
    { drugs: ['aspirin', 'warfarin'], warning: 'Blood thinners - serious bleeding risk' },
    { drugs: ['warfarin', 'ibuprofen'], warning: 'Increased bleeding risk' },
    { drugs: ['warfarin', 'aspirin'], warning: 'Major bleeding risk' },
    { drugs: ['metformin', 'alcohol'], warning: 'Low blood sugar risk' },
    { drugs: ['lisinopril', 'potassium'], warning: 'High potassium levels' },
    { drugs: ['simvastatin', 'grapefruit'], warning: 'Muscle damage risk' },
    { drugs: ['methotrexate', 'nsaid'], warning: 'Kidney damage risk' },
    { drugs: ['digoxin', 'amiodarone'], warning: 'Heart rhythm problems' },
];

// ═══════════════════════════════════════════════════════════════════════════
// ANTI-HALLUCINATION SAFETY LAYER
// ═══════════════════════════════════════════════════════════════════════════

// Blacklisted high-risk drugs - NEVER display, silent flag only
const BLACKLISTED_DRUGS = [
    'methamphetamine', 'fentanyl', 'heroin', 'cocaine',
    'morphine sulfate injection', 'oxycontin', 'hydrocodone',
    'lsd', 'ecstasy', 'mdma', 'pcp', 'ketamine recreational'
];

// Minimum confidence threshold for medicine extraction (0-100)
// Medicines below this threshold will be filtered out
const CONFIDENCE_THRESHOLD = 80;

// API timeout in milliseconds - elderly users shouldn't wait more than 15 seconds
const API_TIMEOUT_MS = 15000;

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} - Resolves with result or rejects on timeout
 */
const withTimeout = (promise, ms = API_TIMEOUT_MS) => {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API_TIMEOUT')), ms);
    });
    return Promise.race([promise, timeout]);
};

/**
 * Repair truncated JSON strings returned by the LLM
 */
const repairTruncatedJSON = (text) => {
    try {
        let repaired = text.trim();
        const opens = (repaired.match(/\[/g) || []).length;
        const closes = (repaired.match(/\]/g) || []).length;
        const braceOpens = (repaired.match(/\{/g) || []).length;
        const braceCloses = (repaired.match(/\}/g) || []).length;
        for (let i = 0; i < braceOpens - braceCloses; i++) repaired += '}';
        for (let i = 0; i < opens - closes; i++) repaired += ']';
        return repaired;
    } catch (e) {
        return text;
    }
};

/**
 * Parse frequency codes to actual time slots
 * Handles: OD, BD, TDS, QID, 1-1-1, 1-0-1, etc.
 */
const parseFrequencyToTimes = (frequency) => {
    if (!frequency) return { times: ['morning'], timesPerDay: 1 };
    
    const freq = frequency.toString().toUpperCase().trim();
    
    const patterns = {
        // Standard medical abbreviations
        'OD': { times: ['morning'], timesPerDay: 1 },
        'ONCE DAILY': { times: ['morning'], timesPerDay: 1 },
        'BD': { times: ['morning', 'night'], timesPerDay: 2 },
        'TWICE DAILY': { times: ['morning', 'night'], timesPerDay: 2 },
        'TDS': { times: ['morning', 'afternoon', 'night'], timesPerDay: 3 },
        'THREE TIMES': { times: ['morning', 'afternoon', 'night'], timesPerDay: 3 },
        'TID': { times: ['morning', 'afternoon', 'night'], timesPerDay: 3 },
        'QID': { times: ['morning', 'afternoon', 'evening', 'night'], timesPerDay: 4 },
        'FOUR TIMES': { times: ['morning', 'afternoon', 'evening', 'night'], timesPerDay: 4 },
        'QHS': { times: ['night'], timesPerDay: 1 },
        'HS': { times: ['night'], timesPerDay: 1 },
        'AT NIGHT': { times: ['night'], timesPerDay: 1 },
        'MORNING': { times: ['morning'], timesPerDay: 1 },
        
        // Indian prescription patterns (1-1-1 format)
        '1-1-1': { times: ['morning', 'afternoon', 'night'], timesPerDay: 3 },
        '1-0-1': { times: ['morning', 'night'], timesPerDay: 2 },
        '0-0-1': { times: ['night'], timesPerDay: 1 },
        '1-0-0': { times: ['morning'], timesPerDay: 1 },
        '0-1-0': { times: ['afternoon'], timesPerDay: 1 },
        '1-1-0': { times: ['morning', 'afternoon'], timesPerDay: 2 },
        '0-1-1': { times: ['afternoon', 'night'], timesPerDay: 2 },
        '1-1-1-1': { times: ['morning', 'afternoon', 'evening', 'night'], timesPerDay: 4 },
    };
    
    // Direct match
    if (patterns[freq]) return patterns[freq];
    
    // Check if contains any pattern
    for (const [pattern, result] of Object.entries(patterns)) {
        if (freq.includes(pattern)) return result;
    }
    
    // Try to extract from "X times" format
    const timesMatch = freq.match(/(\d+)\s*TIMES?/i);
    if (timesMatch) {
        const count = parseInt(timesMatch[1]);
        if (count === 1) return { times: ['morning'], timesPerDay: 1 };
        if (count === 2) return { times: ['morning', 'night'], timesPerDay: 2 };
        if (count === 3) return { times: ['morning', 'afternoon', 'night'], timesPerDay: 3 };
        if (count >= 4) return { times: ['morning', 'afternoon', 'evening', 'night'], timesPerDay: 4 };
    }
    
    // Default fallback
    return { times: ['morning'], timesPerDay: 1 };
};

/**
 * Default reminder times for each slot
 */
const DEFAULT_TIMES = {
    morning: '08:00',
    afternoon: '14:00',
    evening: '18:00',
    night: '21:00'
};

/**
 * Analyze prescription image using Gemini AI with STRICT JSON schema
 * @param {string} base64Image - Base64 encoded image
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<object>} Extracted medicine data with parsed frequencies
 */
export const analyzePrescription = async (base64Image, mimeType = 'image/jpeg') => {
    // Models to try in order of preference
    // NOTE: Model names available for this API key (as per API query)
    const MODELS_TO_TRY = [
        'gemini-2.0-flash',       // Primary: Latest flash with vision
        'gemini-2.5-flash',       // Fallback: Newer flash model
        'gemini-flash-latest',    // Last resort: Generic flash
    ];

    // OCR-optimized prompt for handwritten Indian prescriptions
    // ANTI-HALLUCINATION: Conservative extraction with confidence scoring
    const prompt = `You are an expert pharmacist OCR system specialized in reading handwritten Indian medical prescriptions.

TASK: Read this prescription image and extract medicine information.

═══════════════════════════════════════════════════════════════════════════════
OCR MODE - CRITICAL INSTRUCTIONS:
1. This image contains HANDWRITTEN medical text. Focus on reading drug names, dosages, and frequencies.
2. Ignore layout noise, letterheads, stamps, and irrelevant marks.
3. Indian doctors often write: Dosage codes like OD, BD, TDS, 1-1-1, 1-0-1
4. Common Indian medicine formats: "Tab. Dolo 650", "Cap. Omez 20", "Inj. Pan 40"
═══════════════════════════════════════════════════════════════════════════════

ANTI-HALLUCINATION RULES:
1. Do NOT invent medicines. Only extract what is CLEARLY READABLE.
2. If text is blurry, smudged, or ambiguous - SKIP that medicine entirely.
3. For EACH medicine, include a confidence score (0-100).
4. It is BETTER to miss a medicine than to guess wrong.

OUTPUT FORMAT - Return RAW JSON only (no markdown, no backticks, no preamble):
{
  "medicines": [
    {
      "name": "Medicine Name (EXACTLY as written)",
      "confidence": 95,
      "dosage": "5mg, 500mg, etc.",
      "frequency": "OD, BD, TDS, 1-1-1, 1-0-1, etc.",
      "duration_days": 5,
      "with_food": true,
      "visual_type": "Tablet | Capsule | Syrup | Injection",
      "visual_color": "White | Pink | Blue | Red | Yellow",
      "special_instructions": "Any specific notes",
      "probable_reason": "Simple explanation: High BP, Diabetes, Pain, Fever, etc."
    }
  ],
  "extraction_quality": "CLEAR | PARTIAL | POOR",
  "doctor_name": "Name if visible or null",
  "prescription_date": "DD/MM/YYYY if visible or null",
  "unreadable_sections": ["Parts that could not be read"],
  "missing_info": ["Fields that were unclear"]
}

RULES:
1. Return ONLY the JSON object - no text before or after
2. Do NOT wrap in markdown code blocks
3. duration_days: Use 30 as default for chronic/maintenance meds, 5 only for clearly acute conditions like fever/pain if not specified
4. confidence: 80-100 for clear, 50-79 for partial, skip below 50
5. Extract ALL medicines that are clearly readable`;

    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🔄 Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Wrap API call with timeout - elderly users shouldn't wait forever
            const result = await withTimeout(
                model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType,
                            data: base64Image
                        }
                    }
                ]),
                API_TIMEOUT_MS
            );

            const response = await result.response;
            let text = response.text();

            // Clean up response - remove markdown code blocks if present
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            // Parse JSON with repair logic
            const rawData = JSON.parse(repairTruncatedJSON(text));

            console.log(`✅ Success with model: ${modelName}`);
            console.log('📋 Raw Gemini extraction:', rawData);

            // ═══════════════════════════════════════════════════════════════
            // ANTI-HALLUCINATION SAFETY FILTER
            // ═══════════════════════════════════════════════════════════════
            const safeMedicines = (rawData.medicines || []).filter(med => {
                const confidence = med.confidence || 0;
                const nameLower = (med.name || '').toLowerCase();
                
                // 1. Filter by confidence threshold
                if (confidence < CONFIDENCE_THRESHOLD) {
                    console.warn(`⚠️ SKIPPED low-confidence medicine: "${med.name}" (${confidence}% < ${CONFIDENCE_THRESHOLD}%)`);
                    return false;
                }
                
                // 2. Filter blacklisted drugs (silent flag - security concern)
                const isBlacklisted = BLACKLISTED_DRUGS.some(drug => nameLower.includes(drug));
                if (isBlacklisted) {
                    console.error(`🚨 BLACKLISTED DRUG DETECTED AND BLOCKED: "${med.name}"`);
                    // TODO: Log to security audit in production
                    return false;
                }
                
                // 3. Skip obviously invalid names
                if (!med.name || med.name.length < 2 || med.name === 'Unknown Medicine') {
                    console.warn(`⚠️ SKIPPED invalid medicine name: "${med.name}"`);
                    return false;
                }
                
                return true;
            });

            console.log(`🛡️ Safety filter: ${rawData.medicines?.length || 0} → ${safeMedicines.length} medicines passed`);

            // Post-process medicines with frequency parsing and fuzzy name correction
            const processedMedicines = safeMedicines.map(med => {
                const frequencyInfo = parseFrequencyToTimes(med.frequency);
                
                // Apply fuzzy matching to correct OCR errors
                const nameCorrection = correctMedicineName(med.name || 'Unknown Medicine');
                if (nameCorrection.wasCorrected) {
                    console.log(`📝 Name corrected: "${med.name}" → "${nameCorrection.correctedName}" (${nameCorrection.matchScore}% match)`);
                }
                
                // Use corrected data from database if available
                const dbMedicine = nameCorrection.medicineData;
                
                return {
                    name: nameCorrection.correctedName,
                    originalName: nameCorrection.wasCorrected ? med.name : null, // Track original for debugging
                    nameCorrected: nameCorrection.wasCorrected,
                    confidence: med.confidence || 100,
                    dosage: med.dosage || '',
                    frequency: med.frequency || 'OD',
                    timing: frequencyInfo.times,
                    timesPerDay: frequencyInfo.timesPerDay,
                    reminderTimes: frequencyInfo.times.map(t => DEFAULT_TIMES[t]),
                    durationDays: med.duration_days || 30,
                    withFood: med.with_food ?? true,
                    visualType: dbMedicine?.visualType || med.visual_type || 'Tablet',
                    visualColor: dbMedicine?.visualColor || med.visual_color || 'White',
                    visualDescription: dbMedicine 
                        ? `${dbMedicine.visualColor} ${dbMedicine.visualType}`
                        : `${med.visual_color || 'White'} ${med.visual_type || 'Tablet'}`.trim(),
                    specialInstructions: med.special_instructions || '',
                    probableReason: dbMedicine?.usualUse || med.probable_reason || '',
                    // Track if duration was explicitly set or defaulted
                    durationWasGuessed: !med.duration_days
                };
            });

            const processedData = {
                medicines: processedMedicines,
                doctorName: rawData.doctor_name || null,
                date: rawData.prescription_date || null,
                extractionQuality: rawData.extraction_quality || 'CLEAR',
                unreadableSections: rawData.unreadable_sections || [],
                missingInfo: rawData.missing_info || [],
                // Flag if any medicine needs duration confirmation
                needsDurationConfirmation: processedMedicines.some(m => m.durationWasGuessed),
                // Safety metrics
                filteredCount: (rawData.medicines?.length || 0) - processedMedicines.length
            };

            console.log('📋 Processed prescription:', processedData);
            return { success: true, data: processedData };

        } catch (error) {
            console.warn(`⚠️ Model ${modelName} failed:`, error.message);
            lastError = error;

            // If quota exhausted, try next model
            if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                continue;
            }

            // If it's a different error, still try next model
            continue;
        }
    }

    // All models failed
    console.error('❌ All Gemini models failed:', lastError);

    const isQuotaError = lastError?.message?.includes('429') ||
        lastError?.message?.includes('quota') ||
        lastError?.message?.includes('RESOURCE_EXHAUSTED');

    return {
        success: false,
        error: isQuotaError
            ? 'AI service is temporarily busy. Please try again in a few minutes.'
            : (lastError?.message || 'Failed to analyze prescription'),
        data: null,
        isQuotaError
    };
};

/**
 * Analyze a photo of actual medicine (pill/bottle/blister pack)
 * Used for Visual Verifier feature - helps elderly identify their medicines
 * @param {string} base64Image - Base64 encoded image of the medicine
 * @param {string} mimeType - Image MIME type
 * @param {string} expectedMedicine - Medicine name from prescription (optional)
 * @returns {Promise<object>} Visual details and expiry information
 */
export const analyzeMedicinePhoto = async (base64Image, mimeType = 'image/jpeg', expectedMedicine = null) => {
    // Use available model names for this API key
    const MODELS_TO_TRY = [
        'gemini-2.0-flash',       // Primary: Latest flash with vision
        'gemini-2.5-flash',       // Fallback: Newer flash model
    ];

    const prompt = `You are analyzing a photo of medicine (tablet, capsule, syrup, or packaging).

TASK: Extract visual identification details, expiry information, and usage.

${expectedMedicine ? `EXPECTED MEDICINE(S) from user's prescription: ${expectedMedicine}` : ''}

STRICT OUTPUT FORMAT - Return ONLY this JSON:
{
    "expiry_date": "MM/YYYY format if visible, null if not",
    "visual_description": "Detailed description (e.g., 'Small round pink tablet with 'A' engraving')",
    "shape": "Round | Oval | Oblong | Square | Capsule",
    "color": "Primary color (e.g., Pink, White, Blue)",
    "size": "Small | Medium | Large",
    "medicine_type": "Tablet | Capsule | Syrup | Injection | Cream | Drops",
    "packaging_text": "Any medicine name visible on packaging",
    "matches_expected": ${expectedMedicine ? 'true if this medicine matches any in the expected list, false otherwise' : 'null'},
    "usual_use": "Common medical conditions this medicine is typically prescribed for (e.g., 'Blood pressure control', 'Pain relief', 'Fever and cold')"
}

Return ONLY valid JSON, no explanation.`;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🔍 Analyzing medicine photo with: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await withTimeout(
                model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType,
                            data: base64Image
                        }
                    }
                ]),
                API_TIMEOUT_MS
            );

            const response = await result.response;
            let text = response.text();
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            const data = JSON.parse(repairTruncatedJSON(text));
            console.log('💊 Medicine photo analysis:', data);

            return {
                success: true,
                data: {
                    expiryDate: data.expiry_date,
                    visualDescription: data.visual_description,
                    shape: data.shape,
                    color: data.color,
                    size: data.size,
                    medicineType: data.medicine_type,
                    packagingText: data.packaging_text,
                    matchesExpected: data.matches_expected,
                    usualUse: data.usual_use
                }
            };

        } catch (error) {
            console.warn(`⚠️ Medicine photo analysis failed with ${modelName}:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: 'Could not analyze the medicine photo. Please try again with a clearer image.',
        data: null
    };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLIND VERIFICATION - User takes photo, AI identifies and cross-references
 * ═══════════════════════════════════════════════════════════════════════════
 * @param {string} base64Image - Photo of physical medicine strip/bottle
 * @param {string} mimeType - Image MIME type
 * @param {array} prescriptionMedicines - List of medicines from scanned prescription
 * @returns {object} Match result with verification status
 */
export const verifyMedicinePhoto = async (base64Image, mimeType = 'image/jpeg', prescriptionMedicines = []) => {
    // Use available model names for this API key
    const MODELS_TO_TRY = [
        'gemini-2.0-flash',       // Primary: Latest flash with vision
        'gemini-2.5-flash',       // Fallback: Newer flash model
    ];

    const prescriptionList = prescriptionMedicines.map(m => m.name).join(', ');

    const prompt = `You are a CONSERVATIVE medicine identification system for elderly users.

TASK: Identify the medicine in this photo by reading TEXT on the packaging/strip/bottle. The packaging may contain text in Hindi, English, or both. Read all text visible regardless of language.

═══════════════════════════════════════════════════════════════════════════════
STRICT ANTI-HALLUCINATION RULES:
1. You MUST read the ACTUAL TEXT printed on the medicine packaging
2. Do NOT guess based on pill color, shape, or size alone
3. If text is blurry, has glare, or is not clearly readable, set "readable": false
4. Only return a medicine name if you are 90%+ confident you read it correctly
5. It is BETTER to say "unreadable" than to guess wrong
═══════════════════════════════════════════════════════════════════════════════

PRESCRIPTION MEDICINES TO MATCH AGAINST:
${prescriptionList || 'None provided'}

OUTPUT FORMAT (JSON only):
{
    "readable": true,
    "detected_text": "Exact text you can read on packaging (e.g., 'AMLODIPINE 5MG')",
    "detected_medicine_name": "Medicine name extracted from text",
    "confidence": 95,
    "reason_if_unreadable": null,
    "visual_description": "Brief description of what you see"
}

If image is blurry or text is unreadable:
{
    "readable": false,
    "detected_text": null,
    "detected_medicine_name": null,
    "confidence": 0,
    "reason_if_unreadable": "Blurry | Glare | No text visible | Too far away | etc.",
    "visual_description": "Brief description of what you see"
}

Return ONLY valid JSON, no explanation.`;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🔍 Blind verification with: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Wrap API call with timeout
            const result = await withTimeout(
                model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType,
                            data: base64Image
                        }
                    }
                ]),
                API_TIMEOUT_MS
            );

            const response = await result.response;
            let text = response.text();
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            const data = JSON.parse(repairTruncatedJSON(text));
            console.log('🔍 Blind verification result:', data);

            // If not readable, return early with retry suggestion
            if (!data.readable) {
                return {
                    success: true,
                    isReadable: false,
                    reason: data.reason_if_unreadable || 'Could not read text',
                    visualDescription: data.visual_description,
                    shouldRetry: true,
                    matchFound: false,
                    detectedName: null,
                    matchedMedicine: null
                };
            }

            // Cross-reference detected medicine against prescription list
            const detectedName = (data.detected_medicine_name || '').toLowerCase().trim();
            let matchedMedicine = null;
            let matchFound = false;

            for (const med of prescriptionMedicines) {
                const prescriptionName = med.name.toLowerCase().trim();
                
                // Fuzzy matching - check if names contain each other
                if (prescriptionName.includes(detectedName) || 
                    detectedName.includes(prescriptionName) ||
                    // Also check first word (brand name often differs from generic)
                    prescriptionName.split(' ')[0] === detectedName.split(' ')[0]) {
                    matchFound = true;
                    matchedMedicine = med;
                    break;
                }
            }

            console.log(`🎯 Match result: ${matchFound ? 'FOUND' : 'NOT FOUND'} - "${data.detected_medicine_name}"`);

            return {
                success: true,
                isReadable: true,
                detectedText: data.detected_text,
                detectedName: data.detected_medicine_name,
                confidence: data.confidence,
                visualDescription: data.visual_description,
                matchFound,
                matchedMedicine,
                shouldRetry: false
            };

        } catch (error) {
            console.warn(`⚠️ Blind verification failed with ${modelName}:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: 'Could not analyze the medicine. Please try again.',
        isReadable: false,
        matchFound: false
    };
};

/**
 * Check for dangerous drug interactions
 * @param {array} newMedicines - Newly scanned medicines
 * @param {array} existingMedicines - User's saved medicine history
 * @returns {array} List of conflicts with warnings
 */
export const checkDrugInteractions = (newMedicines, existingMedicines = []) => {
    const conflicts = [];
    const allDrugs = [
        ...newMedicines.map(m => m.name.toLowerCase()),
        ...existingMedicines.map(m => m.name.toLowerCase())
    ];

    DANGEROUS_COMBOS.forEach(combo => {
        const [drug1, drug2] = combo.drugs;
        const hasDrug1 = allDrugs.some(d => d.includes(drug1));
        const hasDrug2 = allDrugs.some(d => d.includes(drug2));

        if (hasDrug1 && hasDrug2) {
            conflicts.push({
                drug1,
                drug2,
                warning: combo.warning,
                severity: 'HIGH'
            });
        }
    });

    return conflicts;
};

/**
 * Generate voice-friendly summary of medicines
 * @param {array} medicines - Medicine list
 * @param {string} language - Language code
 * @returns {string} TTS-ready summary
 */
export const generateVoiceSummary = (medicines, language = 'hi-IN') => {
    if (!medicines || medicines.length === 0) {
        const noMeds = {
            'en-US': 'I could not find any medicines in this prescription.',
            'hi-IN': 'मुझे इस पर्चे में कोई दवाई नहीं मिली।',
            'mr-IN': 'मला या प्रिस्क्रिप्शनमध्ये कोणतीही औषधे सापडली नाहीत.'
        };
        return noMeds[language] || noMeds['hi-IN'];
    }

    const count = medicines.length;
    const templates = {
        'en-US': {
            found: `I found ${count} medicine${count > 1 ? 's' : ''}.`,
            morning: 'for morning',
            afternoon: 'for afternoon',
            evening: 'for evening',
            night: 'for night',
            ordinals: ['First', 'Second', 'Third']
        },
        'hi-IN': {
            found: `मुझे ${count} दवाई${count > 1 ? 'यां' : ''} मिली${count > 1 ? 'ं' : ''}।`,
            morning: 'सुबह के लिए',
            afternoon: 'दोपहर के लिए',
            evening: 'शाम के लिए',
            night: 'रात के लिए',
            ordinals: ['पहली', 'दूसरी', 'तीसरी']
        },
        'mr-IN': {
            found: `मला ${count} औषध${count > 1 ? 'े' : ''} सापडल${count > 1 ? 'ी' : 'े'}.`,
            morning: 'सकाळसाठी',
            afternoon: 'दुपारसाठी',
            evening: 'संध्याकाळसाठी',
            night: 'रात्रीसाठी',
            ordinals: ['पहिले', 'दुसरे', 'तिसरे']
        }
    };

    const t = templates[language] || templates['hi-IN'];
    let summary = t.found + ' ';

    // Cap at 3 medicines to avoid overwhelmingly long TTS
    const medsToAnnounce = medicines.slice(0, 3);
    
    medsToAnnounce.forEach((med, i) => {
        const timing = med.timing?.[0] || 'morning';
        const timingText = t[timing] || t.morning;
        const ordinal = t.ordinals[i] || '';
        
        const dosage = med.dosage ? `${med.dosage} ` : '';
        const foodPrefix = language === 'hi-IN' ? (med.withFood ? 'खाने के बाद' : 'खाली पेट') :
                           language === 'mr-IN' ? (med.withFood ? 'जेवणानंतर' : 'रिकाम्या पोटी') :
                           (med.withFood ? 'after food' : 'empty stomach');

        summary += `${ordinal}, ${med.name} ${dosage}${timingText} ${foodPrefix}. `;
    });

    if (count > 3) {
        summary += language === 'hi-IN' ? 'और अन्य दवाइयां भी हैं जिन्हें आप स्क्रीन पर देख सकते हैं।' : 
                   language === 'mr-IN' ? 'आणि इतर औषधे तुम्ही स्क्रीनवर पाहू शकता.' : 
                   'And other medicines you can view on screen.';
    }

    return summary;
};

/**
 * Generate conflict warning message
 * @param {array} conflicts - List of drug conflicts
 * @param {string} language - Language code
 * @returns {string} Warning message for TTS
 */
export const generateConflictWarning = (conflicts, language = 'hi-IN') => {
    if (!conflicts || conflicts.length === 0) return null;

    const conflict = conflicts[0]; // Most severe
    const templates = {
        'en-US': `Warning! Please be careful. You are already taking a blood thinner. ${conflict.warning}. Consult your doctor before adding this new medicine.`,
        'hi-IN': `चेतावनी! कृपया सावधान रहें। आप पहले से एक खून पतला करने वाली दवा ले रहे हैं। ${conflict.warning}। इस नई दवा को जोड़ने से पहले अपने डॉक्टर से सलाह लें।`,
        'mr-IN': `चेतावनी! कृपया काळजी घ्या. तुम्ही आधीच रक्त पातळ करणारे औषध घेत आहात. ${conflict.warning}. हे नवीन औषध जोडण्यापूर्वी तुमच्या डॉक्टरांचा सल्ला घ्या.`
    };

    return templates[language] || templates['hi-IN'];
};
