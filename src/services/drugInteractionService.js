/**
 * ══════════════════════════════════════════════════════════════════
 * SaarthiRx — Drug Interaction Detection Service
 * ══════════════════════════════════════════════════════════════════
 *
 * Two-layer safety system:
 *   Layer 1 (local):  Check against DANGEROUS_COMBOS from medicineDatabase.js
 *   Layer 2 (Gemini): AI pharmacist check for ANY medicine not in the local DB
 *
 * Fail-safe: If all Gemini models fail → default to SAFE (never falsely block)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { DANGEROUS_COMBOS } from '../data/medicineDatabase';

// ─── Severity Enum ────────────────────────────────────────────────────────────
export const SEVERITY = {
    FATAL: 'FATAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    SAFE: 'SAFE'
};

// ─── Gemini Setup ─────────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash'
];

const GEMINI_TIMEOUT_MS = 8000;

// ─── Layer 1: Local Database Check ────────────────────────────────────────────

/**
 * Check new medicine against DANGEROUS_COMBOS from medicineDatabase.js
 * Uses bidirectional includes() matching for robust name comparison.
 *
 * @param {string} newMedicineName
 * @param {Array} existingMedicines - Array of { name, ... }
 * @returns {{ found: boolean, severity?: string, reason?: string, conflictingMedicine?: string }}
 */
const checkLocal = (newMedicineName, existingMedicines) => {
    const newNameLower = newMedicineName.toLowerCase().trim();

    for (const combo of DANGEROUS_COMBOS) {
        const d1 = combo.drugs[0].toLowerCase();
        const d2 = combo.drugs[1].toLowerCase();

        // Bidirectional matching: new medicine ↔ drug in combo
        const newIsD1 = newNameLower.includes(d1) || d1.includes(newNameLower);
        const newIsD2 = newNameLower.includes(d2) || d2.includes(newNameLower);

        // Check if any existing medicine matches the other drug
        const existHasD1 = existingMedicines.some(m => {
            const name = (m.name || '').toLowerCase().trim();
            return name.includes(d1) || d1.includes(name);
        });
        const existHasD2 = existingMedicines.some(m => {
            const name = (m.name || '').toLowerCase().trim();
            return name.includes(d2) || d2.includes(name);
        });

        // Hit: new medicine is one drug, existing medicines has the other
        if ((newIsD1 && existHasD2) || (newIsD2 && existHasD1)) {
            // Determine the conflicting existing medicine name
            let conflictDrug = d1;
            if (newIsD1) conflictDrug = d2;
            if (newIsD2) conflictDrug = d1;

            const conflictingMed = existingMedicines.find(m => {
                const name = (m.name || '').toLowerCase().trim();
                return name.includes(conflictDrug) || conflictDrug.includes(name);
            });

            // Escalate severity: combo.severity HIGH → FATAL, others → HIGH
            const mappedSeverity = combo.severity === 'HIGH' ? SEVERITY.FATAL : SEVERITY.HIGH;

            console.log(`🚨 Local interaction detected: ${newMedicineName} × ${conflictingMed?.name || conflictDrug} → ${mappedSeverity}`);

            return {
                found: true,
                severity: mappedSeverity,
                reason: combo.warning,
                precautions: [
                    'Do NOT take this medicine without consulting your doctor',
                    'Show both medicines to your doctor or pharmacist',
                    'If you have already taken it, seek medical attention immediately'
                ],
                conflictingMedicine: conflictingMed?.name || conflictDrug,
                source: 'local-database'
            };
        }
    }

    return { found: false };
};

// ─── Layer 2: Gemini AI Check ─────────────────────────────────────────────────

/**
 * Ask Gemini to evaluate drug interaction safety.
 * Fires only when Layer 1 finds nothing — covers medicines NOT in local DB.
 *
 * @param {string} newMedicineName
 * @param {Array} existingMedicines
 * @returns {Promise<{ severity: string, reason: string, precautions: string[], conflictingMedicine: string|null, source: string }>}
 */
const checkWithGemini = async (newMedicineName, existingMedicines) => {
    // If no existing medicines, nothing to interact with
    if (!existingMedicines || existingMedicines.length === 0) {
        return {
            severity: SEVERITY.SAFE,
            reason: 'No existing medicines to check against',
            precautions: [],
            conflictingMedicine: null,
            source: 'gemini-skipped-empty'
        };
    }

    // If no API key, fail safe
    if (!genAI) {
        console.warn('⚠️ No Gemini API key — skipping AI interaction check');
        return {
            severity: SEVERITY.SAFE,
            reason: 'AI check unavailable',
            precautions: [],
            conflictingMedicine: null,
            source: 'gemini-no-key'
        };
    }

    const medicineListStr = existingMedicines
        .map(m => `- ${m.name}${m.dosage ? ' (' + m.dosage + ')' : ''}`)
        .join('\n');

    const prompt = `You are a licensed clinical pharmacist reviewing medications for an elderly patient's safety.

PATIENT'S CURRENT MEDICINES:
${medicineListStr}

NEW MEDICINE BEING ADDED: ${newMedicineName}

TASK: Evaluate whether "${newMedicineName}" has any dangerous drug-drug interaction with the patient's current medicines.

SEVERITY DEFINITIONS:
- FATAL: Life-threatening interaction (e.g., serotonin syndrome, fatal bleeding, respiratory failure)
- HIGH: Serious adverse effect requiring medical attention (e.g., severe hypoglycemia, significant bleeding risk)
- MEDIUM: Clinically significant interaction requiring monitoring or dose adjustment
- SAFE: No clinically significant interaction found

IMPORTANT:
- Consider generic names AND brand names (Indian brands especially)
- Consider drug CLASS interactions (e.g., all NSAIDs with anticoagulants)
- Be conservative: if unsure, classify as MEDIUM rather than SAFE
- Patient safety is the TOP priority

Return ONLY valid JSON with no markdown formatting, no backticks, no preamble:
{
    "severity": "FATAL",
    "interaction_found": true,
    "reason": "Single sentence explaining the interaction",
    "precautions": ["First precaution", "Second precaution"],
    "conflicting_medicine": "Name of the conflicting medicine from the list",
    "confidence": 90
}

If no interaction: {"severity": "SAFE", "interaction_found": false, "reason": "No significant interaction found", "precautions": [], "conflicting_medicine": null, "confidence": 95}`;

    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`🔍 Checking drug interaction with: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), GEMINI_TIMEOUT_MS)
            );

            const result = await Promise.race([
                model.generateContent(prompt),
                timeoutPromise
            ]);

            const response = await result.response;
            let text = response.text();

            // Strip markdown fences if present
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            const data = JSON.parse(text);
            console.log(`✅ Gemini interaction check result (${modelName}):`, data);

            return {
                severity: SEVERITY[data.severity] || SEVERITY.SAFE,
                reason: data.reason || 'Unknown interaction',
                precautions: Array.isArray(data.precautions) ? data.precautions : [],
                conflictingMedicine: data.conflicting_medicine || null,
                source: `gemini-${modelName}`
            };

        } catch (error) {
            console.warn(`⚠️ Gemini interaction check failed with ${modelName}:`, error.message);
            continue;
        }
    }

    // All models failed → fail-safe to SAFE (never falsely block)
    console.warn('⚠️ All Gemini models failed for interaction check — defaulting to SAFE');
    return {
        severity: SEVERITY.SAFE,
        reason: 'AI interaction check unavailable',
        precautions: [],
        conflictingMedicine: null,
        source: 'gemini-failed'
    };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check if a new medicine has dangerous interactions with existing medicines.
 * Runs Layer 1 (local) first. If no hit, runs Layer 2 (Gemini AI).
 *
 * @param {string} newMedicineName - Name of the medicine being added
 * @param {Array} existingMedicines - Array of { name, dosage, ... } from localStorage
 * @returns {Promise<{ severity: string, reason: string, precautions: string[], conflictingMedicine: string|null, source: string }>}
 */
export const checkDrugInteraction = async (newMedicineName, existingMedicines) => {
    // Guard: nothing to check
    if (!newMedicineName || !existingMedicines || existingMedicines.length === 0) {
        return {
            severity: SEVERITY.SAFE,
            reason: 'No medicines to check against',
            precautions: [],
            conflictingMedicine: null,
            source: 'skipped'
        };
    }

    try {
        // ── Layer 1: Local database check ──────────────────────────
        console.log(`🔍 Layer 1: Checking "${newMedicineName}" against ${existingMedicines.length} saved medicines...`);
        const localResult = checkLocal(newMedicineName, existingMedicines);

        if (localResult.found) {
            console.log('✅ Layer 1 hit — returning local result');
            return localResult;
        }

        console.log('ℹ️ Layer 1: No local match — escalating to Layer 2 (Gemini AI)...');

        // ── Layer 2: Gemini AI check ───────────────────────────────
        const geminiResult = await checkWithGemini(newMedicineName, existingMedicines);
        console.log('✅ Layer 2 complete:', geminiResult.severity, geminiResult.source);
        return geminiResult;

    } catch (error) {
        console.error('❌ Drug interaction check failed:', error);
        // Fail-safe: never block on error
        return {
            severity: SEVERITY.SAFE,
            reason: 'Interaction check failed — proceeding with caution',
            precautions: [],
            conflictingMedicine: null,
            source: 'error-fallback'
        };
    }
};
