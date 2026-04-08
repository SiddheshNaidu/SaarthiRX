export const VOICE_PROMPTS = {
    // System Commands
    HOME: {
        'en-US': 'Going to Dashboard',
        'hi-IN': 'डैशबोर्ड पर जा रहे हैं',
        'mr-IN': 'डॅशबोर्डवर जात आहे'
    },
    SCAN: {
        'en-US': 'Opening camera. Please hold the prescription steady.',
        'hi-IN': 'कैमरा खोल रहा हूँ। कृपया पर्चे को स्थिर रखें।',
        'mr-IN': 'कॅमेरा उघडत आहे. कृपया प्रिस्क्रिप्शन स्थिर ठेवा.'
    },
    MEDICINES: {
        'en-US': 'Showing your medicines.',
        'hi-IN': 'आपकी दवाइयां दिखा रहा हूँ।',
        'mr-IN': 'तुमची औषधे दाखवत आहे.'
    },
    REMINDERS: {
        'en-US': 'Opening reminders.',
        'hi-IN': 'रिमाइंडर खोल रहा हूँ।',
        'mr-IN': 'रिमाइंडर उघडत आहे.'
    },
    HELP: {
        'en-US': 'You can say: Home, Scan, Repeat, or Medicines',
        'hi-IN': 'आप कह सकते हैं: घर, स्कैन, दोहराएं, या दवाइयां',
        'mr-IN': 'तुम्ही म्हणू शकता: घर, स्कॅन, पुन्हा सांग, किंवा औषधे'
    },
    REPEAT: {
        'en-US': 'Repeating last message.',
        'hi-IN': 'पिछला संदेश दोहरा रहा हूँ।',
        'mr-IN': 'मागील संदेश पुन्हा सांगत आहे.'
    },

    // Auth & Identity
    LOGIN_SUCCESS: {
        'en-US': 'Login successful. Welcome back.',
        'hi-IN': 'लॉगिन सफल। वापस स्वागत है।',
        'mr-IN': 'लॉगिन यशस्वी. परत स्वागत आहे.'
    },
    NEW_USER_GREETING: {
        'en-US': 'Login successful. I don\'t know your name yet. Please tell me your name.',
        'hi-IN': 'लॉगिन सफल। मुझे अभी आपका नाम नहीं पता। कृपया अपना नाम बताएं।',
        'mr-IN': 'लॉगिन यशस्वी. मला तुमचे नाव माहित नाही. कृपया तुमचे नाव सांगा.'
    },
    ASK_NAME: {
        'en-US': 'What is your name?',
        'hi-IN': 'आपका नाम क्या है?',
        'mr-IN': 'तुमचे नाव काय आहे?'
    },
    NAME_CONFIRM: {
        'en-US': 'I heard {name}. Is this correct?',
        'hi-IN': 'मैंने {name} सुना। क्या यह सही है?',
        'mr-IN': 'मी ऐकले {name}. हे बरोबर आहे का?'
    },
    REGISTRATION_COMPLETE: {
        'en-US': 'Registration complete.',
        'hi-IN': 'पंजीकरण पूरा हुआ।',
        'mr-IN': 'नोंदणी पूर्ण झाली.'
    },

    // Validation Errors
    ERR_INVALID_PHONE: {
        'en-US': 'I\'m sorry, that number isn\'t correct. Please say it again.',
        'hi-IN': 'क्षमा करें, वह नंबर सही नहीं है। कृपया इसे फिर से बोलें।',
        'mr-IN': 'क्षमस्व, तो नंबर बरोबर नाही. कृपया पुन्हा सांगा.'
    },
    ERR_INVALID_CODE: {
        'en-US': 'That code is incorrect. Please check your messages and try again.',
        'hi-IN': 'वह कोड गलत है। कृपया अपने संदेश जांचें और पुनः प्रयास करें।',
        'mr-IN': 'तो कोड चुकीचा आहे. कृपया तुमचे संदेश तपासा आणि पुन्हा प्रयत्न करा.'
    },
    ERR_CODE_EXPIRED: {
        'en-US': 'The secret code has expired. Let me send you a new one.',
        'hi-IN': 'गुप्त कोड समाप्त हो गया है। मुझे आपको एक नया भेजने दें।',
        'mr-IN': 'गुप्त कोड कालबाह्य झाला आहे. मला तुम्हाला नवीन पाठवू द्या.'
    },
    ERR_NETWORK: {
        'en-US': 'I am having trouble reaching the internet. Please check your connection.',
        'hi-IN': 'मुझे इंटरनेट तक पहुँचने में समस्या हो रही है। कृपया अपना कनेक्शन जांचें।',
        'mr-IN': 'मला इंटरनेटपर्यंत पोहोचण्यात अडचण येत आहे. कृपया तुमचे कनेक्शन तपासा.'
    },
    ERR_GENERIC: {
        'en-US': 'Something went wrong. Please try again.',
        'hi-IN': 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
        'mr-IN': 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.'
    },
    ERR_CONFIG: {
        'en-US': 'Service configuration error. Please contact support.',
        'hi-IN': 'सेवा कॉन्फ़िगरेशन त्रुटि। कृपया सहायता से संपर्क करें।',
        'mr-IN': 'सेवा कॉन्फिगरेशन त्रुटी. कृपया सपोर्टशी संपर्क साधा.'
    },
    ERR_TOO_MANY: {
        'en-US': 'Too many attempts. Please wait a few minutes and try again.',
        'hi-IN': 'बहुत अधिक प्रयास। कृपया कुछ मिनट प्रतीक्षा करें और पुनः प्रयास करें।',
        'mr-IN': 'खूप जास्त प्रयत्न. कृपया काही मिनिटे थांबा आणि पुन्हा प्रयत्न करा.'
    },

    // Dashboard
    DASHBOARD_SUBTITLE: {
        'en-US': 'How can I help you today?',
        'hi-IN': 'आज मैं आपकी कैसे मदद कर सकता हूँ?',
        'mr-IN': 'आज मी तुम्हाला कशी मदत करू शकतो?'
    },
    DASHBOARD_SCAN_TITLE: {
        'en-US': 'Scan Prescription',
        'hi-IN': 'पर्चा स्कैन करें',
        'mr-IN': 'प्रिस्क्रिप्शन स्कॅन करा'
    },
    DASHBOARD_SCAN_SUBTITLE: {
        'en-US': 'Take a photo of your prescription',
        'hi-IN': 'अपने पर्चे की फोटो लें',
        'mr-IN': 'तुमच्या प्रिस्क्रिप्शनचा फोटो घ्या'
    },
    DASHBOARD_MEDICINES: {
        'en-US': 'My Medicines',
        'hi-IN': 'मेरी दवाइयां',
        'mr-IN': 'माझी औषधे'
    },
    DASHBOARD_REMINDERS: {
        'en-US': 'Reminders',
        'hi-IN': 'रिमाइंडर',
        'mr-IN': 'रिमाइंडर'
    },
    DASHBOARD_HISTORY: {
        'en-US': 'History',
        'hi-IN': 'इतिहास',
        'mr-IN': 'इतिहास'
    },
    DASHBOARD_SCAN_MEDICINE: {
        'en-US': 'Scan Medicine',
        'hi-IN': 'दवाई स्कैन',
        'mr-IN': 'औषध स्कॅन'
    },
    DASHBOARD_VOICE_TITLE: {
        'en-US': 'Voice Commands:',
        'hi-IN': 'वॉइस कमांड:',
        'mr-IN': 'व्हॉइस कमांड:'
    },
    DASHBOARD_VOICE_SCAN: {
        'en-US': '🎙️ "Scan" - Read a prescription',
        'hi-IN': '🎙️ "स्कैन" - पर्चा पढ़ें',
        'mr-IN': '🎙️ "स्कॅन" - प्रिस्क्रिप्शन वाचा'
    },
    DASHBOARD_VOICE_HOME: {
        'en-US': '🎙️ "Home" - Return to dashboard',
        'hi-IN': '🎙️ "होम" - डैशबोर्ड पर वापस',
        'mr-IN': '🎙️ "होम" - डॅशबोर्डवर परत'
    },
    DASHBOARD_VOICE_REPEAT: {
        'en-US': '🎙️ "Repeat" - Hear again',
        'hi-IN': '🎙️ "दोहराएं" - फिर से सुनें',
        'mr-IN': '🎙️ "पुन्हा" - पुन्हा ऐका'
    },
    DASHBOARD_VOICE_MEDICINES: {
        'en-US': '🎙️ "Medicines" - View your medicines',
        'hi-IN': '🎙️ "दवाई" - अपनी दवाइयां देखें',
        'mr-IN': '🎙️ "औषध" - तुमची औषधे पहा'
    },
    DASHBOARD_VOICE_REMINDERS: {
        'en-US': '🎙️ "Reminders" - View your reminders',
        'hi-IN': '🎙️ "रिमाइंडर" - अपने रिमाइंडर देखें',
        'mr-IN': '🎙️ "रिमाइंडर" - तुमचे रिमाइंडर पहा'
    },
    DASHBOARD_VOICE_BACK: {
        'en-US': '🎙️ "Back" - Go to previous page',
        'hi-IN': '🎙️ "वापस" - पिछले पेज पर जाएं',
        'mr-IN': '🎙️ "मागे" - मागील पृष्ठावर जा'
    },
    DASHBOARD_VOICE_HELP: {
        'en-US': '🎙️ "Help" - Hear all commands',
        'hi-IN': '🎙️ "मदद" - सभी कमांड सुनें',
        'mr-IN': '🎙️ "मदत" - सर्व कमांड ऐका'
    },
    DASHBOARD_ANNOUNCE: {
        'en-US': 'Namaste. I am ready.',
        'hi-IN': 'नमस्ते। मैं तैयार हूँ।',
        'mr-IN': 'नमस्कार. मी तयार आहे.'
    },

    // Reminder Page
    REMINDER_TITLE: {
        'en-US': 'My Reminders',
        'hi-IN': 'मेरे रिमाइंडर',
        'mr-IN': 'माझे रिमाइंडर'
    },
    REMINDER_ADD: {
        'en-US': 'Add Reminder',
        'hi-IN': 'रिमाइंडर जोड़ें',
        'mr-IN': 'रिमाइंडर जोडा'
    },
    REMINDER_EMPTY: {
        'en-US': 'No reminders yet. Tap the button to add your first reminder.',
        'hi-IN': 'अभी कोई रिमाइंडर नहीं। अपना पहला रिमाइंडर जोड़ने के लिए बटन दबाएं।',
        'mr-IN': 'अद्याप कोणतेही रिमाइंडर नाहीत. तुमचा पहिला रिमाइंडर जोडण्यासाठी बटण दाबा.'
    },
    REMINDER_TAKEN: {
        'en-US': 'I have taken it',
        'hi-IN': 'मैंने ले लिया',
        'mr-IN': 'मी घेतली'
    },
    REMINDER_SNOOZE: {
        'en-US': 'Snooze',
        'hi-IN': 'स्नूज़',
        'mr-IN': 'स्नूझ'
    },
    REMINDER_SKIP: {
        'en-US': 'Skip',
        'hi-IN': 'छोड़ें',
        'mr-IN': 'वगळा'
    }
};

export const getPrompt = (key, language = 'hi-IN', params = {}) => {
    const prompts = VOICE_PROMPTS[key] || VOICE_PROMPTS.ERR_GENERIC;
    let text = prompts[language] || prompts['hi-IN'] || prompts['en-US'];

    // Replace params
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });

    return text;
};
