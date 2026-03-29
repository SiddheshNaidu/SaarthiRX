import Fuse from 'fuse.js';

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL COMMANDS - Active on every page
// ═══════════════════════════════════════════════════════════════════════════
const commands = [
    {
        action: 'HOME',
        keywords: ['home', 'dashboard', 'main', 'go home', 'wapas', 'back home'],
        hindiKeywords: ['होम', 'घर', 'डैशबोर्ड', 'वापस', 'मुख्य'],
        marathiKeywords: ['घर', 'होम', 'डॅशबोर्ड', 'मुख्य', 'परत']
    },
    {
        action: 'SCAN',
        keywords: ['scan', 'camera', 'photo', 'picture', 'new', 'prescription', 'add prescription'],
        hindiKeywords: ['स्कैन', 'कैमरा', 'फोटो', 'नया', 'पर्चा'],
        marathiKeywords: ['स्कॅन', 'कॅमेरा', 'फोटो', 'नवीन', 'प्रिस्क्रिप्शन']
    },
    {
        action: 'MEDICINES',
        keywords: ['medicines', 'pills', 'medicine', 'pill', 'my medicines', 'list', 'show medicines', 'inventory'],
        hindiKeywords: ['दवाई', 'दवाइयां', 'गोली', 'गोलियां', 'मेरी दवाई', 'दवाइयां दिखाओ', 'दवाई दिखाओ'],
        marathiKeywords: ['औषध', 'औषधे', 'गोळी', 'गोळ्या', 'माझी औषधे', 'औषधे दाखवा']
    },
    {
        action: 'REMINDERS',
        keywords: ['reminders', 'reminder', 'alarm', 'alarms', 'alerts', 'bell', 'schedule', 'ghanti'],
        hindiKeywords: ['रिमाइंडर', 'अलार्म', 'याद', 'घंटी', 'समय'],
        marathiKeywords: ['रिमाइंडर', 'आठवण', 'अलार्म', 'घंटा', 'वेळ']
    },
    {
        action: 'BACK',
        keywords: ['back', 'return', 'go back', 'previous'],
        hindiKeywords: ['वापस', 'पीछे', 'लौटो', 'पिछला'],
        marathiKeywords: ['मागे', 'परत', 'मागे जा']
    },
    {
        action: 'REPEAT',
        keywords: ['repeat', 'again', 'what', 'pardon', 'say again'],
        hindiKeywords: ['दोहराओ', 'फिर से', 'क्या', 'दोबारा'],
        marathiKeywords: ['पुन्हा', 'परत सांग', 'पुन्हा सांगा']
    },
    {
        action: 'HELP',
        keywords: ['help', 'commands', 'assist', 'what can i say', 'options'],
        hindiKeywords: ['मदद', 'सहायता', 'हेल्प', 'क्या बोलूं'],
        marathiKeywords: ['मदत', 'साहाय्य', 'हेल्प', 'काय बोलू']
    },
    // ═══════════════════════════════════════════════════════════════════════
    // NEW COMMANDS - Voice Command Center Expansion
    // ═══════════════════════════════════════════════════════════════════════
    {
        action: 'VERIFY_MEDICINE',
        keywords: ['verify', 'check medicine', 'is this safe', 'janch', 'sahi hai', 'medicine check', 'verify medicine', 'check my medicine'],
        hindiKeywords: ['जांच', 'दवाई जांचो', 'सही है क्या', 'चेक करो', 'जांच करो', 'दवाई चेक'],
        marathiKeywords: ['तपासा', 'औषध तपासा', 'बरोबर आहे का', 'तपासणी']
    },
    {
        action: 'ALARM',
        keywords: ['emergency', 'madad', 'test alarm', 'sos', 'panic'],
        hindiKeywords: ['इमरजेंसी', 'मदद', 'बचाओ', 'एसओएस'],
        marathiKeywords: ['आणीबाणी', 'मदत', 'वाचवा']
    },
    {
        action: 'STOP',
        keywords: ['stop', 'silence', 'quiet', 'shut up', 'ruko', 'bas', 'enough'],
        hindiKeywords: ['रुको', 'बस', 'चुप', 'बंद करो', 'थांबो'],
        marathiKeywords: ['थांबा', 'बस', 'शांत', 'बंद करा']
    }
];

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-AWARE COMMANDS - Only active on specific routes
// ═══════════════════════════════════════════════════════════════════════════
const contextCommands = [
    {
        action: 'CAMERA',
        routes: ['/scan'],
        keywords: ['camera', 'open camera', 'take photo', 'capture', 'photo lo'],
        hindiKeywords: ['कैमरा', 'कैमरा खोलो', 'फोटो लो', 'फोटो खींचो'],
        marathiKeywords: ['कॅमेरा', 'कॅमेरा उघडा', 'फोटो घ्या']
    },
    {
        action: 'GALLERY',
        routes: ['/scan'],
        keywords: ['gallery', 'upload', 'from gallery', 'choose', 'select', 'pick'],
        hindiKeywords: ['गैलरी', 'अपलोड', 'गैलरी खोलो', 'गैलरी से'],
        marathiKeywords: ['गॅलरी', 'अपलोड', 'गॅलरीमधून']
    },
    {
        action: 'CLICK',
        routes: ['/scan'],
        keywords: ['click', 'capture', 'take', 'shoot', 'snap'],
        hindiKeywords: ['क्लिक', 'खींचो', 'लो', 'ले लो', 'खिंचो'],
        marathiKeywords: ['क्लिक', 'घ्या', 'काढा']
    }
];

// ═══════════════════════════════════════════════════════════════════════════
// LINGUISTIC ROBUSTNESS - Filler word stripping
// ═══════════════════════════════════════════════════════════════════════════
const FILLER_WORDS = [
    // English fillers
    'please', 'go to', 'open', 'show', 'take me to', 'i want', 'i need',
    'can you', 'could you', 'would you', 'show me', 'let me see',
    // Hindi fillers
    'कृपया', 'दिखाओ', 'खोलो', 'जाओ', 'मुझे', 'चाहिए',
    // Marathi fillers
    'कृपया', 'दाखवा', 'उघडा', 'मला', 'हवे'
];

/**
 * Strip common filler words from input for better matching
 * @param {string} input - Raw voice input
 * @returns {string} Cleaned input
 */
const stripFillerWords = (input) => {
    if (!input) return '';
    let cleaned = input.toLowerCase().trim();
    
    // Sort by length (longest first) to avoid partial replacements
    const sortedFillers = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
    
    sortedFillers.forEach(filler => {
        cleaned = cleaned.replace(new RegExp(filler, 'gi'), ' ');
    });
    
    // Clean up multiple spaces
    return cleaned.replace(/\s+/g, ' ').trim();
};

// Flatten all keywords for fuzzy matching
const getAllKeywords = () => {
    return commands.flatMap(cmd => [
        ...cmd.keywords.map(k => ({ keyword: k, action: cmd.action })),
        ...cmd.hindiKeywords.map(k => ({ keyword: k, action: cmd.action })),
        ...cmd.marathiKeywords.map(k => ({ keyword: k, action: cmd.action }))
    ]);
};

// Flatten context keywords
const getAllContextKeywords = () => {
    return contextCommands.flatMap(cmd => [
        ...cmd.keywords.map(k => ({ keyword: k, action: cmd.action, routes: cmd.routes })),
        ...cmd.hindiKeywords.map(k => ({ keyword: k, action: cmd.action, routes: cmd.routes })),
        ...cmd.marathiKeywords.map(k => ({ keyword: k, action: cmd.action, routes: cmd.routes }))
    ]);
};

// Configure Fuse.js for fuzzy matching
const fuse = new Fuse(getAllKeywords(), {
    keys: ['keyword'],
    threshold: 0.4, // Lower = more strict, Higher = more fuzzy
    ignoreLocation: true,
    minMatchCharLength: 2
});

// Context-aware Fuse instance
const contextFuse = new Fuse(getAllContextKeywords(), {
    keys: ['keyword'],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2
});

/**
 * Parse user voice input with fuzzy matching (GLOBAL commands)
 * @param {string} input - User's voice input
 * @returns {Object} { action: string, confidence: number }
 */
export const parseFuzzyCommand = (input) => {
    if (!input || typeof input !== 'string') {
        return { action: 'UNKNOWN', confidence: 0 };
    }

    // Strip filler words first
    const cleanedInput = stripFillerWords(input);
    const normalizedInput = cleanedInput.toLowerCase().trim();

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY LOGIC: "scan medicine" or "check medicine" → VERIFY_MEDICINE
    // This prevents confusion - "scan my medicine" should verify, not add prescription
    // ═══════════════════════════════════════════════════════════════════════
    const medicineWords = ['medicine', 'dawa', 'dawai', 'औषध', 'दवाई', 'गोली', 'pill'];
    const checkWords = ['check', 'verify', 'janch', 'sahi', 'safe', 'जांच', 'तपासा'];
    
    const hasMedicineWord = medicineWords.some(w => normalizedInput.includes(w));
    const hasCheckWord = checkWords.some(w => normalizedInput.includes(w));
    
    // If both "medicine" and "check/verify" words present → Verification route
    if (hasMedicineWord && hasCheckWord) {
        return { action: 'VERIFY_MEDICINE', confidence: 1 };
    }
    
    // Also: "scan medicine" (without check) → still goes to verification for safety
    const hasScanWord = ['scan', 'स्कैन', 'स्कॅन'].some(w => normalizedInput.includes(w));
    if (hasMedicineWord && hasScanWord) {
        return { action: 'VERIFY_MEDICINE', confidence: 1 };
    }

    // First try exact/includes match (faster, more reliable)
    for (const cmd of commands) {
        const allKeywords = [...cmd.keywords, ...cmd.hindiKeywords, ...cmd.marathiKeywords];
        if (allKeywords.some(k => normalizedInput.includes(k.toLowerCase()))) {
            return { action: cmd.action, confidence: 1 };
        }
    }

    // Fuzzy match fallback
    const results = fuse.search(normalizedInput);

    if (results.length > 0) {
        return {
            action: results[0].item.action,
            confidence: 1 - results[0].score // Convert score to confidence
        };
    }

    return { action: 'UNKNOWN', confidence: 0 };
};

/**
 * Parse CONTEXT-AWARE voice commands (route-specific)
 * @param {string} input - User's voice input
 * @param {string} currentRoute - Current page route (e.g., '/scan')
 * @returns {Object} { action: string, confidence: number }
 */
export const parseContextCommand = (input, currentRoute) => {
    if (!input || typeof input !== 'string' || !currentRoute) {
        return { action: 'UNKNOWN', confidence: 0 };
    }

    // Strip filler words
    const cleanedInput = stripFillerWords(input);
    const normalizedInput = cleanedInput.toLowerCase().trim();

    // First try exact/includes match for context commands
    for (const cmd of contextCommands) {
        // Check if command is active on current route
        if (!cmd.routes.some(r => currentRoute.startsWith(r))) {
            continue;
        }

        const allKeywords = [...cmd.keywords, ...cmd.hindiKeywords, ...cmd.marathiKeywords];
        if (allKeywords.some(k => normalizedInput.includes(k.toLowerCase()))) {
            return { action: cmd.action, confidence: 1 };
        }
    }

    // Fuzzy match for context commands
    const results = contextFuse.search(normalizedInput);

    if (results.length > 0) {
        const match = results[0].item;
        // Verify route match
        if (match.routes.some(r => currentRoute.startsWith(r))) {
            return {
                action: match.action,
                confidence: 1 - results[0].score
            };
        }
    }

    return { action: 'UNKNOWN', confidence: 0 };
};

/**
 * Get command suggestions based on partial input
 * @param {string} input - Partial input
 * @returns {Array} List of suggested commands
 */
export const getCommandSuggestions = (input) => {
    if (!input) return [];

    const results = fuse.search(input, { limit: 3 });
    return results.map(r => ({
        action: r.item.action,
        keyword: r.item.keyword
    }));
};

/**
 * Check if input matches any context command for given route
 * @param {string} input - Voice input
 * @param {string} route - Current route
 * @returns {boolean}
 */
export const hasContextMatch = (input, route) => {
    const result = parseContextCommand(input, route);
    return result.confidence > 0.5;
};
