/**
 * AI Medicine Manager Service
 * Allows Gemini to analyze user voice input and add/manage medicines
 * Elder-Friendly: Simple voice commands to add medicines without scanning
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Parse natural language medicine input from user voice
 * @param {string} voiceInput - User's spoken medicine description
 * @param {string} language - User's language preference
 * @returns {Promise<object>} Parsed medicine object
 */
export const parseMedicineFromVoice = async (voiceInput, language = 'en-US') => {
    const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    const prompt = `You are a medical assistant for elderly patients. Parse the following voice input about a medicine.

VOICE INPUT: "${voiceInput}"
LANGUAGE: ${language}

TASK: Extract medicine information and return ONLY this JSON:
{
    "name": "Medicine name (e.g., Paracetamol, Amlodipine)",
    "dosage": "Dosage if mentioned (e.g., 500mg, 5mg)",
    "timing": ["morning", "night"] or ["morning"] etc based on when to take,
    "frequency": "once daily" or "twice daily" or "every other day",
    "durationDays": Number of days if mentioned, default 30,
    "withFood": true or false,
    "visualColor": "white" or "pink" or "blue" etc if mentioned,
    "visualType": "tablet" or "capsule" or "syrup",
    "specialInstructions": "Any special instructions mentioned",
    "confidence": 0.0 to 1.0 (how confident you are in the parsing)
}

EXAMPLES:
- "Add Paracetamol 500mg morning and night" → {name: "Paracetamol", dosage: "500mg", timing: ["morning", "night"]...}
- "मुझे Amlodipine रात को लेना है" → {name: "Amlodipine", timing: ["night"]...}
- "Take Metformin with food" → {name: "Metformin", withFood: true...}

Return ONLY valid JSON.`;

    for (const modelName of MODELS) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            const parsed = JSON.parse(text);
            console.log('🤖 AI parsed medicine:', parsed);

            return {
                success: true,
                medicine: {
                    id: Date.now().toString(),
                    name: parsed.name || 'Unknown Medicine',
                    dosage: parsed.dosage || '',
                    timing: parsed.timing || ['morning'],
                    frequency: parsed.frequency || 'once daily',
                    durationDays: parsed.durationDays || 30,
                    withFood: parsed.withFood ?? true,
                    visualColor: parsed.visualColor || 'white',
                    visualType: parsed.visualType || 'tablet',
                    specialInstructions: parsed.specialInstructions || '',
                    quantity: 30,
                    addedAt: Date.now(),
                    addedBy: 'voice'
                },
                confidence: parsed.confidence || 0.8
            };
        } catch (error) {
            console.warn(`AI medicine parsing failed with ${modelName}:`, error);
            continue;
        }
    }

    return { success: false, medicine: null, confidence: 0 };
};

/**
 * Add medicine via voice command
 * @param {string} voiceInput - User's voice input
 * @param {string} language - Language code
 * @returns {Promise<object>} Result with medicine and voice feedback
 */
export const addMedicineByVoice = async (voiceInput, language = 'en-US') => {
    try {
        const result = await parseMedicineFromVoice(voiceInput, language);

        if (!result.success || result.confidence < 0.5) {
            return {
                success: false,
                voiceFeedback: {
                    'en-US': "I couldn't understand the medicine name. Please try again.",
                    'hi-IN': "मुझे दवाई का नाम समझ नहीं आया। कृपया फिर से कहें।",
                    'mr-IN': "मला औषधाचे नाव समजले नाही. कृपया पुन्हा सांगा."
                }[language] || "I couldn't understand. Please try again."
            };
        }

        // Check for duplicates in localStorage
        const existing = JSON.parse(localStorage.getItem('saarthi_medicines') || '[]');
        const isDuplicate = existing.some(m => 
            m.name?.toLowerCase().includes(result.medicine.name.toLowerCase()) ||
            result.medicine.name.toLowerCase().includes(m.name?.toLowerCase())
        );

        if (isDuplicate) {
            return {
                success: false,
                voiceFeedback: {
                    'en-US': `${result.medicine.name} is already in your list. I did not add it again.`,
                    'hi-IN': `${result.medicine.name} पहले से आपकी सूची में है। मैंने इसे दोबारा नहीं जोड़ा।`,
                    'mr-IN': `${result.medicine.name} आधीपासून तुमच्या यादीत आहे. मी ते पुन्हा जोडले नाही.`
                }[language] || `${result.medicine.name} is already in your list.`
            };
        }

        // Add to localStorage
        const updated = [...existing, result.medicine];
        localStorage.setItem('saarthi_medicines', JSON.stringify(updated));

        // Generate confirmation message
        const timingText = {
            'en-US': result.medicine.timing.join(' and '),
            'hi-IN': result.medicine.timing.map(t => 
                t === 'morning' ? 'सुबह' : t === 'night' ? 'रात' : t === 'afternoon' ? 'दोपहर' : t
            ).join(' और '),
            'mr-IN': result.medicine.timing.map(t => 
                t === 'morning' ? 'सकाळी' : t === 'night' ? 'रात्री' : t === 'afternoon' ? 'दुपारी' : t
            ).join(' आणि ')
        }[language] || result.medicine.timing.join(' and ');

        return {
            success: true,
            medicine: result.medicine,
            voiceFeedback: {
                'en-US': `Added ${result.medicine.name}. Take it ${timingText}.`,
                'hi-IN': `${result.medicine.name} जोड़ दी। ${timingText} लेनी है।`,
                'mr-IN': `${result.medicine.name} जोडले. ${timingText} घ्यायचे आहे.`
            }[language] || `Added ${result.medicine.name}.`
        };

    } catch (error) {
        console.error('Voice medicine addition error:', error);
        return {
            success: false,
            voiceFeedback: "Something went wrong. Please try again."
        };
    }
};

/**
 * Check if user input is a medicine addition command
 * @param {string} transcript - User's voice input
 * @returns {boolean} True if this looks like a medicine addition command
 */
export const isMedicineAdditionCommand = (transcript) => {
    if (!transcript) return false;
    const lower = transcript.toLowerCase();
    
    const addPatterns = [
        'add', 'जोड़', 'जोड़ो', 'जोडा', 'new medicine', 'नई दवाई', 'नवीन औषध',
        'take', 'लेना है', 'घ्यायचे', 'मुझे', 'मला'
    ];

    // Check if it contains medicine-related keywords AND an addition intent
    const hasAddIntent = addPatterns.some(p => lower.includes(p));
    const hasMedicineName = /[A-Z][a-z]+|paracetamol|amlodipine|metformin|aspirin|crocin|dolo/i.test(transcript);
    
    return hasAddIntent && hasMedicineName;
};

export default {
    parseMedicineFromVoice,
    addMedicineByVoice,
    isMedicineAdditionCommand
};
