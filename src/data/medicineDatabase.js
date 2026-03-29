/**
 * Medicine Database for SaarthiRx
 * Contains verified medicine names with aliases and metadata
 * Used for fuzzy matching to correct OCR errors from prescription scanning
 */

export const MEDICINE_DATABASE = [
    {
        id: 'alprax',
        name: 'Alprax',
        genericName: 'Alprazolam',
        aliases: ['alprax', 'alpraz', 'alprex', 'alpax', 'alprazolam', 'alprazo'],
        category: 'Anxiolytic',
        usualUse: 'Anxiety and panic disorders, helps with sleep',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['0.25mg', '0.5mg', '1mg'],
        manufacturer: 'Torrent Pharmaceuticals'
    },
    {
        id: 'cn-paxet',
        name: 'CN Paxet',
        genericName: 'Clonazepam + Paroxetine',
        aliases: ['cn paxet', 'cnpaxet', 'cn-paxet', 'paxet cn', 'cn paxit', 'cn paxat', 'c n paxet', 'cnpaxit'],
        category: 'Antidepressant + Anxiolytic',
        usualUse: 'Depression and anxiety disorders',
        visualType: 'Tablet',
        visualColor: 'Pink',
        commonDosages: ['0.5mg + 12.5mg', '0.5mg + 25mg'],
        manufacturer: 'Various'
    },
    {
        id: 'diclofen-sp',
        name: 'Diclofen-SP',
        genericName: 'Diclofenac Sodium + Serratiopeptidase',
        aliases: [
            'diclofen sp', 'diclofen-sp', 'diclofensp', 'diclofen', 
            'diclofin sp', 'diclofen-s', 'diclofinsp', 'diclofenac sp',
            'diclo sp', 'diclosp', 'diclofen serratiopeptidase'
        ],
        category: 'NSAID + Anti-inflammatory Enzyme',
        usualUse: 'Pain relief, inflammation, swelling reduction',
        visualType: 'Tablet',
        visualColor: 'Yellow',
        commonDosages: ['50mg + 10mg', '50mg + 15mg'],
        manufacturer: 'Various'
    }
];

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy string matching
 */
const levenshteinDistance = (str1, str2) => {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
};

/**
 * Calculate similarity score between two strings (0-100)
 */
const similarityScore = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 100;
    
    const distance = levenshteinDistance(s1, s2);
    return Math.round((1 - distance / maxLen) * 100);
};

/**
 * Find the best matching medicine from database for a given input name
 * @param {string} inputName - The possibly misspelled medicine name from OCR
 * @param {number} threshold - Minimum similarity score to consider a match (default: 65)
 * @returns {object|null} - Best matching medicine or null if no match found
 */
export const findBestMedicineMatch = (inputName, threshold = 65) => {
    if (!inputName || inputName.trim().length < 2) return null;
    
    const input = inputName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const medicine of MEDICINE_DATABASE) {
        // Check exact match with name
        if (medicine.name.toLowerCase() === input) {
            return { medicine, score: 100, matchedAlias: medicine.name };
        }

        // Check against all aliases
        for (const alias of medicine.aliases) {
            const score = similarityScore(input, alias);
            
            // Also check if input contains the alias or vice versa
            const containsBonus = (input.includes(alias) || alias.includes(input)) ? 15 : 0;
            const adjustedScore = Math.min(100, score + containsBonus);
            
            if (adjustedScore > bestScore) {
                bestScore = adjustedScore;
                bestMatch = { medicine, score: adjustedScore, matchedAlias: alias };
            }
        }

        // Also check generic name
        const genericScore = similarityScore(input, medicine.genericName.toLowerCase());
        if (genericScore > bestScore) {
            bestScore = genericScore;
            bestMatch = { medicine, score: genericScore, matchedAlias: medicine.genericName };
        }
    }

    // Return match only if above threshold
    if (bestMatch && bestMatch.score >= threshold) {
        console.log(`🎯 Fuzzy match: "${inputName}" → "${bestMatch.medicine.name}" (${bestMatch.score}% via "${bestMatch.matchedAlias}")`);
        return bestMatch;
    }

    console.log(`⚠️ No match found for: "${inputName}" (best score: ${bestScore}%)`);
    return null;
};

/**
 * Correct a medicine name using fuzzy matching
 * Returns the corrected name or original if no match
 * @param {string} inputName - The possibly misspelled medicine name
 * @param {number} threshold - Minimum similarity score (default: 65)
 * @returns {object} - { correctedName, wasCorrected, matchScore, medicineData }
 */
export const correctMedicineName = (inputName, threshold = 65) => {
    const match = findBestMedicineMatch(inputName, threshold);
    
    if (match) {
        return {
            correctedName: match.medicine.name,
            wasCorrected: match.medicine.name.toLowerCase() !== inputName.toLowerCase().trim(),
            matchScore: match.score,
            medicineData: match.medicine
        };
    }
    
    return {
        correctedName: inputName,
        wasCorrected: false,
        matchScore: 0,
        medicineData: null
    };
};

/**
 * Get all medicines from database (for display/selection)
 */
export const getAllMedicines = () => MEDICINE_DATABASE;

/**
 * Get medicine by ID
 */
export const getMedicineById = (id) => MEDICINE_DATABASE.find(m => m.id === id);

export default {
    MEDICINE_DATABASE,
    findBestMedicineMatch,
    correctMedicineName,
    getAllMedicines,
    getMedicineById
};
