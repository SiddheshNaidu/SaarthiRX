/**
 * Medicine Database for SaarthiRx
 * ─────────────────────────────────────────────────────────────────────────────
 * Expanded: 60+ most-prescribed Indian medicines
 * • Brand → Generic mapping for OCR correction
 * • Multiple OCR aliases per medicine (handles handwriting variants)
 * • Dangerous combination matrix sourced from standard pharmacology references
 * • Visual type/color for elderly identification
 */

// ─── Dangerous Combinations ───────────────────────────────────────────────────
// Source: Standard Drug Interaction references (Stockley's, MIMS India, CIMS)
export const DANGEROUS_COMBOS = [
    // ── NSAIDs + Anticoagulants ──
    { drugs: ['aspirin', 'warfarin'],       warning: 'NSAIDs + Anticoagulant: serious GI bleeding risk',             severity: 'HIGH' },
    { drugs: ['aspirin', 'clopidogrel'],    warning: 'Dual antiplatelet: major bleeding risk without cardiac indication', severity: 'HIGH' },
    { drugs: ['ibuprofen', 'warfarin'],     warning: 'NSAID reduces warfarin clearance; major bleeding risk',         severity: 'HIGH' },
    { drugs: ['diclofenac', 'warfarin'],    warning: 'Diclofenac + Warfarin: severe bleeding risk',                   severity: 'HIGH' },
    { drugs: ['aceclofenac', 'warfarin'],   warning: 'NSAID + Anticoagulant: bleeding risk',                          severity: 'HIGH' },

    // ── Cardiac ──
    { drugs: ['digoxin', 'amiodarone'],     warning: 'Amiodarone doubles digoxin levels: toxicity / arrhythmia risk', severity: 'HIGH' },
    { drugs: ['amlodipine', 'simvastatin'], warning: 'Amlodipine raises simvastatin levels: myopathy risk',           severity: 'MEDIUM' },
    { drugs: ['metoprolol', 'verapamil'],   warning: 'Beta-blocker + CCB: severe bradycardia and heart block',        severity: 'HIGH' },
    { drugs: ['atenolol', 'verapamil'],     warning: 'Beta-blocker + CCB: severe bradycardia',                        severity: 'HIGH' },

    // ── Statins ──
    { drugs: ['simvastatin', 'grapefruit'], warning: 'Grapefruit inhibits statin metabolism: muscle damage risk',     severity: 'MEDIUM' },
    { drugs: ['atorvastatin', 'clarithromycin'], warning: 'Clarithromycin raises statin: rhabdomyolysis risk',        severity: 'HIGH' },
    { drugs: ['atorvastatin', 'erythromycin'],   warning: 'Erythromycin raises statin: myopathy risk',               severity: 'MEDIUM' },

    // ── Diabetes ──
    { drugs: ['metformin', 'alcohol'],      warning: 'Alcohol + Metformin: lactic acidosis and hypoglycaemia risk',   severity: 'HIGH' },
    { drugs: ['glimepiride', 'alcohol'],    warning: 'Alcohol + Sulfonylurea: severe hypoglycaemia',                  severity: 'HIGH' },
    { drugs: ['glipizide', 'fluconazole'],  warning: 'Fluconazole increases sulfonylurea: hypoglycaemia',             severity: 'HIGH' },

    // ── BP / ACE Inhibitors ──
    { drugs: ['lisinopril', 'potassium'],   warning: 'ACE inhibitor + Potassium supplement: dangerous hyperkalaemia', severity: 'HIGH' },
    { drugs: ['enalapril', 'potassium'],    warning: 'ACE inhibitor + Potassium: hyperkalaemia risk',                 severity: 'HIGH' },
    { drugs: ['lisinopril', 'ibuprofen'],   warning: 'NSAID blunts ACE inhibitor and worsens kidney function',        severity: 'MEDIUM' },
    { drugs: ['telmisartan', 'potassium'],  warning: 'ARB + Potassium: hyperkalaemia risk',                           severity: 'MEDIUM' },

    // ── Antibiotics ──
    { drugs: ['methotrexate', 'nsaid'],     warning: 'NSAID reduces methotrexate clearance: kidney / bone marrow toxicity', severity: 'HIGH' },
    { drugs: ['ciprofloxacin', 'antacid'],  warning: 'Antacid reduces ciprofloxacin absorption by 70%',               severity: 'MEDIUM' },
    { drugs: ['azithromycin', 'amiodarone'], warning: 'QT prolongation risk: arrhythmia',                             severity: 'HIGH' },

    // ── Psychotropics ──
    { drugs: ['sertraline', 'tramadol'],    warning: 'SSRI + Tramadol: serotonin syndrome risk',                      severity: 'HIGH' },
    { drugs: ['fluoxetine', 'tramadol'],    warning: 'SSRI + Tramadol: serotonin syndrome',                           severity: 'HIGH' },
    { drugs: ['alprazolam', 'alcohol'],     warning: 'Benzodiazepine + Alcohol: fatal CNS depression',                severity: 'HIGH' },
    { drugs: ['clonazepam', 'alcohol'],     warning: 'Benzodiazepine + Alcohol: severe respiratory depression',       severity: 'HIGH' },

    // ── Thyroid ──
    { drugs: ['levothyroxine', 'calcium'],  warning: 'Calcium binds levothyroxine: take thyroid 4hr apart',           severity: 'MEDIUM' },
    { drugs: ['levothyroxine', 'antacid'],  warning: 'Antacid reduces thyroid hormone absorption',                    severity: 'MEDIUM' },

    // ── Steroids ──
    { drugs: ['prednisolone', 'ibuprofen'], warning: 'Steroid + NSAID: high GI ulcer and bleeding risk',              severity: 'HIGH' },
    { drugs: ['dexamethasone', 'nsaid'],    warning: 'Steroid + NSAID: GI bleeding risk',                             severity: 'HIGH' },
];

// ─── Medicine Database ─────────────────────────────────────────────────────────
export const MEDICINE_DATABASE = [

    // ══════════════════════════════════════════════════════════════
    // PAIN / FEVER (Most prescribed category in India)
    // ══════════════════════════════════════════════════════════════
    {
        id: 'dolo-650',
        name: 'Dolo 650',
        genericName: 'Paracetamol 650mg',
        aliases: ['dolo', 'dolo650', 'dolo 650', 'dolo-650', 'dolo65', 'doloe 650', 'dola 650', 'paracetamol 650'],
        category: 'Analgesic / Antipyretic',
        usualUse: 'Fever and mild to moderate pain',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['650mg'],
        manufacturer: 'Micro Labs'
    },
    {
        id: 'crocin',
        name: 'Crocin 500',
        genericName: 'Paracetamol 500mg',
        aliases: ['crocin', 'crocin 500', 'crocin500', 'crosin', 'krocin', 'paracetamol 500', 'paracetamol'],
        category: 'Analgesic / Antipyretic',
        usualUse: 'Fever, headache, and mild pain',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['500mg'],
        manufacturer: 'GSK'
    },
    {
        id: 'combiflam',
        name: 'Combiflam',
        genericName: 'Ibuprofen 400mg + Paracetamol 325mg',
        aliases: ['combiflam', 'combiflem', 'combiflame', 'combi flam', 'combiflam tab', 'combiflan'],
        category: 'NSAID + Analgesic Combination',
        usualUse: 'Pain, fever, joint aches, and inflammation',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['400mg+325mg'],
        manufacturer: 'Sanofi'
    },
    {
        id: 'zerodol-sp',
        name: 'Zerodol SP',
        genericName: 'Aceclofenac 100mg + Paracetamol 325mg + Serratiopeptidase 15mg',
        aliases: ['zerodol sp', 'zerodolsp', 'zerodol-sp', 'zerodol s p', 'zero dol sp', 'zerodol', 'aceclo sp'],
        category: 'NSAID + Analgesic + Anti-inflammatory Enzyme',
        usualUse: 'Musculoskeletal pain, post-operative swelling, joint pain',
        visualType: 'Tablet',
        visualColor: 'Yellow',
        commonDosages: ['100mg+325mg+15mg'],
        manufacturer: 'Ipca Laboratories'
    },
    {
        id: 'voveran',
        name: 'Voveran 50',
        genericName: 'Diclofenac Sodium 50mg',
        aliases: ['voveran', 'voveran 50', 'voltaren', 'diclofenac', 'diclofenac sodium', 'diclofen sodium'],
        category: 'NSAID',
        usualUse: 'Arthritis, dental pain, menstrual pain, sports injuries',
        visualType: 'Tablet',
        visualColor: 'Pink',
        commonDosages: ['50mg', '75mg'],
        manufacturer: 'Novartis'
    },
    {
        id: 'diclofen-sp',
        name: 'Diclofen-SP',
        genericName: 'Diclofenac Sodium + Serratiopeptidase',
        aliases: ['diclofen sp', 'diclofen-sp', 'diclofensp', 'diclofen', 'diclofin sp', 'diclofen-s', 'diclofinsp', 'diclofenac sp', 'diclo sp', 'diclosp'],
        category: 'NSAID + Anti-inflammatory Enzyme',
        usualUse: 'Pain relief, inflammation, swelling reduction',
        visualType: 'Tablet',
        visualColor: 'Yellow',
        commonDosages: ['50mg + 10mg', '50mg + 15mg'],
        manufacturer: 'Various'
    },

    // ══════════════════════════════════════════════════════════════
    // STOMACH / GI (Second most common category)
    // ══════════════════════════════════════════════════════════════
    {
        id: 'pan-40',
        name: 'Pan 40',
        genericName: 'Pantoprazole 40mg',
        aliases: ['pan 40', 'pan40', 'pan-40', 'pantoprazole', 'pantop', 'pantocid', 'pantosec', 'pan 20'],
        category: 'Proton Pump Inhibitor',
        usualUse: 'Acidity, gastric ulcer, GERD, stomach protection with NSAIDs',
        visualType: 'Tablet',
        visualColor: 'Yellow',
        commonDosages: ['20mg', '40mg'],
        manufacturer: 'Alkem Laboratories'
    },
    {
        id: 'pan-d',
        name: 'Pan-D',
        genericName: 'Pantoprazole 40mg + Domperidone 10mg',
        aliases: ['pan d', 'pan-d', 'pand', 'pan d capsule', 'pantodac d', 'pantocid d', 'pantop d'],
        category: 'PPI + Prokinetic',
        usualUse: 'Acid reflux with nausea or bloating, gastroparesis',
        visualType: 'Capsule',
        visualColor: 'Red',
        commonDosages: ['40mg + 10mg'],
        manufacturer: 'Alkem Laboratories'
    },
    {
        id: 'omez',
        name: 'Omez 20',
        genericName: 'Omeprazole 20mg',
        aliases: ['omez', 'omez 20', 'omez20', 'omeprazole', 'omeprazol', 'omez cap', 'omiez'],
        category: 'Proton Pump Inhibitor',
        usualUse: 'Acidity, stomach ulcer, GERD',
        visualType: 'Capsule',
        visualColor: 'Pink',
        commonDosages: ['20mg', '40mg'],
        manufacturer: 'Dr. Reddy\'s'
    },
    {
        id: 'omez-d',
        name: 'Omez-D',
        genericName: 'Omeprazole 20mg + Domperidone 10mg',
        aliases: ['omez d', 'omez-d', 'omezd', 'omez dom', 'omeprazole domperidone'],
        category: 'PPI + Prokinetic',
        usualUse: 'Acidity with vomiting or nausea',
        visualType: 'Capsule',
        visualColor: 'Purple',
        commonDosages: ['20mg + 10mg'],
        manufacturer: 'Dr. Reddy\'s'
    },
    {
        id: 'razo',
        name: 'Razo 20',
        genericName: 'Rabeprazole 20mg',
        aliases: ['razo', 'razo 20', 'rabeprazole', 'razo d', 'razo 20 d', 'rablet'],
        category: 'Proton Pump Inhibitor',
        usualUse: 'GERD, duodenal ulcers, Helicobacter pylori',
        visualType: 'Tablet',
        visualColor: 'Pink',
        commonDosages: ['20mg'],
        manufacturer: 'Dr. Reddy\'s'
    },
    {
        id: 'metrogyl',
        name: 'Metrogyl 400',
        genericName: 'Metronidazole 400mg',
        aliases: ['metrogyl', 'metrogyl 400', 'metronidazole', 'flagyl', 'metrogyl tab', 'metrogy'],
        category: 'Antibiotic / Antiprotozoal',
        usualUse: 'Amoebic dysentery, giardia, bacterial infections, dental infections',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['200mg', '400mg'],
        manufacturer: 'J.B. Chemicals'
    },

    // ══════════════════════════════════════════════════════════════
    // ANTIBIOTICS
    // ══════════════════════════════════════════════════════════════
    {
        id: 'amoxicillin',
        name: 'Amoxicillin 500',
        genericName: 'Amoxicillin 500mg',
        aliases: ['amoxicillin', 'amoxy', 'amox 500', 'mox 500', 'novamox', 'amoxil', 'amoxicillin 500', 'amoxcillin'],
        category: 'Antibiotic (Penicillin)',
        usualUse: 'Throat, ear, chest, and urinary infections',
        visualType: 'Capsule',
        visualColor: 'Red',
        commonDosages: ['250mg', '500mg'],
        manufacturer: 'Various'
    },
    {
        id: 'augmentin',
        name: 'Augmentin 625',
        genericName: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
        aliases: ['augmentin', 'augmentin 625', 'augmentin625', 'augment', 'amoxyclav', 'amoxicillin clavulanate', 'clavam 625'],
        category: 'Antibiotic (Penicillin + Beta-lactamase inhibitor)',
        usualUse: 'Resistant bacterial infections, sinusitis, pneumonia',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['625mg', '1000mg'],
        manufacturer: 'GSK'
    },
    {
        id: 'azithromycin',
        name: 'Azee 500',
        genericName: 'Azithromycin 500mg',
        aliases: ['azee', 'azee 500', 'azithromycin', 'azithro', 'azee 250', 'zithromax', 'azithral', 'azit', 'azithromycin 500'],
        category: 'Antibiotic (Macrolide)',
        usualUse: 'Chest infections, throat infections, typhoid',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['250mg', '500mg'],
        manufacturer: 'Cipla'
    },
    {
        id: 'cefixime',
        name: 'Taxim-O 200',
        genericName: 'Cefixime 200mg',
        aliases: ['taxim o', 'taxim-o', 'cefixime', 'cefix', 'cefixim', 'ceftas', 'taxim o 200', 'zifi 200'],
        category: 'Antibiotic (Cephalosporin)',
        usualUse: 'Urinary tract infections, ear infections, throat infections',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['100mg', '200mg'],
        manufacturer: 'Alkem'
    },
    {
        id: 'doxycycline',
        name: 'Doxy 100',
        genericName: 'Doxycycline 100mg',
        aliases: ['doxy', 'doxy 100', 'doxycycline', 'doxycyc', 'doxyl', 'doxycycline 100', 'doxt'],
        category: 'Antibiotic (Tetracycline)',
        usualUse: 'Chest infections, acne, lyme disease, malaria prevention',
        visualType: 'Capsule',
        visualColor: 'Yellow',
        commonDosages: ['100mg'],
        manufacturer: 'Various'
    },
    {
        id: 'ciprofloxacin',
        name: 'Ciplox 500',
        genericName: 'Ciprofloxacin 500mg',
        aliases: ['ciplox', 'ciplox 500', 'ciprofloxacin', 'cipro', 'cipro 500', 'cifran', 'cifran 500', 'ciproflox'],
        category: 'Antibiotic (Fluoroquinolone)',
        usualUse: 'UTI, gastroenteritis, respiratory infections',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['250mg', '500mg', '750mg'],
        manufacturer: 'Cipla'
    },

    // ══════════════════════════════════════════════════════════════
    // BLOOD PRESSURE
    // ══════════════════════════════════════════════════════════════
    {
        id: 'amlodipine',
        name: 'Amlodipine 5',
        genericName: 'Amlodipine 5mg',
        aliases: ['amlodipine', 'amlodipine 5', 'amlo 5', 'amlod', 'stamlo', 'norvasc', 'amlopress', 'amlodipine 10'],
        category: 'Calcium Channel Blocker',
        usualUse: 'High blood pressure and angina',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['2.5mg', '5mg', '10mg'],
        manufacturer: 'Various'
    },
    {
        id: 'telmisartan',
        name: 'Telma 40',
        genericName: 'Telmisartan 40mg',
        aliases: ['telma', 'telma 40', 'telmisartan', 'telmikind', 'telmisar', 'telmikind 40', 'telma 80', 'telmisartan 40'],
        category: 'ARB (Angiotensin Receptor Blocker)',
        usualUse: 'High blood pressure, kidney protection in diabetics',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['20mg', '40mg', '80mg'],
        manufacturer: 'Glenmark'
    },
    {
        id: 'telmisartan-hctz',
        name: 'Telma H',
        genericName: 'Telmisartan 40mg + Hydrochlorothiazide 12.5mg',
        aliases: ['telma h', 'telmah', 'telma-h', 'telmisartan hctz', 'telmisartan hydrochlorothiazide'],
        category: 'ARB + Diuretic Combination',
        usualUse: 'High blood pressure (combination)',
        visualType: 'Tablet',
        visualColor: 'Yellow',
        commonDosages: ['40mg + 12.5mg'],
        manufacturer: 'Glenmark'
    },
    {
        id: 'atenolol',
        name: 'Atenolol 50',
        genericName: 'Atenolol 50mg',
        aliases: ['atenolol', 'atenolol 50', 'ateno', 'tenormin', 'aten 50', 'aten50', 'tenolol'],
        category: 'Beta Blocker',
        usualUse: 'High blood pressure, rapid heartbeat, angina',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['25mg', '50mg', '100mg'],
        manufacturer: 'Various'
    },
    {
        id: 'metoprolol',
        name: 'Metolar 25',
        genericName: 'Metoprolol Succinate 25mg',
        aliases: ['metoprolol', 'metolar', 'metolar 25', 'betaloc', 'betaloc zok', 'lopressor', 'metoprolol succinate'],
        category: 'Beta Blocker',
        usualUse: 'High blood pressure, heart failure, irregular heartbeat',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['25mg', '50mg', '100mg'],
        manufacturer: 'Cipla'
    },
    {
        id: 'lisinopril',
        name: 'Listril 5',
        genericName: 'Lisinopril 5mg',
        aliases: ['lisinopril', 'listril', 'listril 5', 'zestril', 'lisoril', 'aceril', 'lisinopril 5'],
        category: 'ACE Inhibitor',
        usualUse: 'High blood pressure, heart failure, kidney protection',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['2.5mg', '5mg', '10mg'],
        manufacturer: 'Various'
    },

    // ══════════════════════════════════════════════════════════════
    // DIABETES
    // ══════════════════════════════════════════════════════════════
    {
        id: 'metformin',
        name: 'Glycomet 500',
        genericName: 'Metformin 500mg',
        aliases: ['glycomet', 'glycomet 500', 'metformin', 'metformin 500', 'glucophage', 'glicomet', 'glycomet sr', 'metformin sr'],
        category: 'Antidiabetic (Biguanide)',
        usualUse: 'Type 2 Diabetes — lowers blood sugar',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['500mg', '850mg', '1000mg'],
        manufacturer: 'USV'
    },
    {
        id: 'glimepiride',
        name: 'Amaryl 1',
        genericName: 'Glimepiride 1mg',
        aliases: ['amaryl', 'amaryl 1', 'glimepiride', 'glimep', 'glimp', 'glimp 1', 'glimepride', 'glimy 1'],
        category: 'Antidiabetic (Sulfonylurea)',
        usualUse: 'Type 2 Diabetes — stimulates insulin secretion',
        visualType: 'Tablet',
        visualColor: 'Pink',
        commonDosages: ['1mg', '2mg', '3mg', '4mg'],
        manufacturer: 'Sanofi'
    },
    {
        id: 'glycomet-gp',
        name: 'Glycomet GP 1',
        genericName: 'Glimepiride 1mg + Metformin 500mg',
        aliases: ['glycomet gp', 'glycomet gp 1', 'glycomet gp1', 'gp 1 forte', 'glimep metformin', 'glycomet gp 2'],
        category: 'Antidiabetic Combination',
        usualUse: 'Type 2 Diabetes combination therapy',
        visualType: 'Tablet',
        visualColor: 'Purple',
        commonDosages: ['1mg + 500mg', '2mg + 500mg'],
        manufacturer: 'USV'
    },
    {
        id: 'januvia',
        name: 'Januvia 50',
        genericName: 'Sitagliptin 50mg',
        aliases: ['januvia', 'januvia 50', 'sitagliptin', 'zita', 'istavel', 'glictus', 'januvia 100'],
        category: 'Antidiabetic (DPP-4 Inhibitor)',
        usualUse: 'Type 2 Diabetes — works with diet and exercise',
        visualType: 'Tablet',
        visualColor: 'Beige',
        commonDosages: ['25mg', '50mg', '100mg'],
        manufacturer: 'MSD'
    },

    // ══════════════════════════════════════════════════════════════
    // CHOLESTEROL
    // ══════════════════════════════════════════════════════════════
    {
        id: 'atorvastatin',
        name: 'Atorva 10',
        genericName: 'Atorvastatin 10mg',
        aliases: ['atorva', 'atorva 10', 'atorvastatin', 'lipitor', 'storvas', 'atorvastatin 10', 'atorvastatin 20', 'atocor'],
        category: 'Statin (Cholesterol Lowering)',
        usualUse: 'High cholesterol, prevention of heart attack and stroke',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['5mg', '10mg', '20mg', '40mg', '80mg'],
        manufacturer: 'Pfizer / Zydus'
    },
    {
        id: 'rosuvastatin',
        name: 'Rozavel 10',
        genericName: 'Rosuvastatin 10mg',
        aliases: ['rozavel', 'rozavel 10', 'rosuvastatin', 'crestor', 'rosuvas', 'rosufit', 'rosuvastatin 10'],
        category: 'Statin (Cholesterol Lowering)',
        usualUse: 'High cholesterol, atherosclerosis prevention',
        visualType: 'Tablet',
        visualColor: 'Pink',
        commonDosages: ['5mg', '10mg', '20mg', '40mg'],
        manufacturer: 'Sun Pharma'
    },

    // ══════════════════════════════════════════════════════════════
    // THYROID
    // ══════════════════════════════════════════════════════════════
    {
        id: 'levothyroxine',
        name: 'Thyronorm 50',
        genericName: 'Levothyroxine 50mcg',
        aliases: ['thyronorm', 'thyronorm 50', 'levothyroxine', 'eltroxin', 'thyrox', 'synthroid', 'thyronorm 75', 'thyronorm 100', 'thyrowel'],
        category: 'Thyroid Hormone',
        usualUse: 'Hypothyroidism (underactive thyroid)',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['25mcg', '50mcg', '75mcg', '100mcg', '125mcg', '150mcg'],
        manufacturer: 'Abbott'
    },

    // ══════════════════════════════════════════════════════════════
    // ALLERGY / RESPIRATORY
    // ══════════════════════════════════════════════════════════════
    {
        id: 'cetirizine',
        name: 'Cetirizine 10',
        genericName: 'Cetirizine 10mg',
        aliases: ['cetirizine', 'cetzine', 'zyrtec', 'alerid', 'cetriz', 'cetzin', 'cetirizin', 'cetrizine'],
        category: 'Antihistamine',
        usualUse: 'Allergies, runny nose, itching, hives',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['5mg', '10mg'],
        manufacturer: 'Various'
    },
    {
        id: 'montelukast-levo',
        name: 'Montair LC',
        genericName: 'Montelukast 10mg + Levocetirizine 5mg',
        aliases: ['montair lc', 'montairlc', 'montelukast levocetirizine', 'monte lc', 'lcz', 'levocet m', 'telekast l', 'mont levo'],
        category: 'Antihistamine + Leukotriene Antagonist',
        usualUse: 'Allergic rhinitis, asthma, chronic urticaria',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['10mg + 5mg'],
        manufacturer: 'Cipla'
    },
    {
        id: 'allegra',
        name: 'Allegra 120',
        genericName: 'Fexofenadine 120mg',
        aliases: ['allegra', 'allegra 120', 'fexofenadine', 'fexo', 'fexo 120', 'allegra 180', 'fexofast'],
        category: 'Non-sedating Antihistamine',
        usualUse: 'Allergies, hay fever, chronic urticaria',
        visualType: 'Tablet',
        visualColor: 'Peach',
        commonDosages: ['60mg', '120mg', '180mg'],
        manufacturer: 'Sanofi'
    },
    {
        id: 'salbutamol',
        name: 'Asthalin Inhaler',
        genericName: 'Salbutamol 100mcg',
        aliases: ['asthalin', 'asthalin inhaler', 'salbutamol', 'ventolin', 'albuterol', 'asthrel', 'salbair'],
        category: 'Bronchodilator (SABA)',
        usualUse: 'Asthma attack relief, COPD',
        visualType: 'Inhaler',
        visualColor: 'Blue',
        commonDosages: ['100mcg/dose'],
        manufacturer: 'Cipla'
    },
    {
        id: 'budesonide-formoterol',
        name: 'Foracort 200',
        genericName: 'Budesonide 200mcg + Formoterol 6mcg',
        aliases: ['foracort', 'foracort 200', 'budesonide formoterol', 'symbicort', 'budamate', 'formont'],
        category: 'ICS + LABA (Asthma controller)',
        usualUse: 'Asthma control, COPD maintenance',
        visualType: 'Inhaler',
        visualColor: 'Red',
        commonDosages: ['100/6mcg', '200/6mcg', '400/6mcg'],
        manufacturer: 'Cipla'
    },

    // ══════════════════════════════════════════════════════════════
    // VITAMINS / SUPPLEMENTS (Extremely common in Indian prescriptions)
    // ══════════════════════════════════════════════════════════════
    {
        id: 'vitamin-d3',
        name: 'Vitamin D3 60K',
        genericName: 'Cholecalciferol 60000 IU',
        aliases: ['vitamin d3', 'vit d3', 'd3', 'calcirol', 'calcirol 60k', 'dical', 'uprise d3', 'cholecalciferol', '60 k', '60k'],
        category: 'Vitamin / Supplement',
        usualUse: 'Vitamin D deficiency, bone strength, immunity',
        visualType: 'Capsule',
        visualColor: 'Yellow',
        commonDosages: ['60000 IU'],
        manufacturer: 'Various'
    },
    {
        id: 'calcium-d3',
        name: 'Shelcal 500',
        genericName: 'Calcium 500mg + Vitamin D3 250 IU',
        aliases: ['shelcal', 'shelcal 500', 'calcium d3', 'calcimax', 'calfosol', 'ostocalcium', 'calcium vit d3', 'calcium carbonate'],
        category: 'Mineral + Vitamin Supplement',
        usualUse: 'Osteoporosis prevention, calcium deficiency, bone health',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['500mg + 250IU'],
        manufacturer: 'Elder Pharma'
    },
    {
        id: 'b12',
        name: 'Mecobalamin 500',
        genericName: 'Mecobalamin (Methylcobalamin) 500mcg',
        aliases: ['mecobalamin', 'methylcobalamin', 'mecob', 'mecoblamin', 'mecobal', 'neurobion forte', 'mycobalamin', 'meco'],
        category: 'Vitamin B12',
        usualUse: 'Nerve damage, B12 deficiency, diabetic neuropathy',
        visualType: 'Tablet',
        visualColor: 'Orange',
        commonDosages: ['500mcg', '1500mcg'],
        manufacturer: 'Various'
    },
    {
        id: 'folic-acid',
        name: 'Folvite',
        genericName: 'Folic Acid 5mg',
        aliases: ['folvite', 'folic acid', 'folate', 'folic', 'folicacid', 'fol 5'],
        category: 'Vitamin B9',
        usualUse: 'Anaemia prevention, pregnancy, megaloblastic anaemia',
        visualType: 'Tablet',
        visualColor: 'Yellow',
        commonDosages: ['1mg', '5mg'],
        manufacturer: 'Various'
    },
    {
        id: 'iron',
        name: 'Ferrous Sulfate',
        genericName: 'Ferrous Sulfate 200mg',
        aliases: ['ferrous sulfate', 'iron tablet', 'ferium', 'hemsi', 'fersol', 'haem up', 'iron supplement', 'ferrex'],
        category: 'Iron Supplement',
        usualUse: 'Iron deficiency anaemia',
        visualType: 'Tablet',
        visualColor: 'Red',
        commonDosages: ['100mg', '150mg', '200mg'],
        manufacturer: 'Various'
    },

    // ══════════════════════════════════════════════════════════════
    // PSYCHOTROPICS / NEURO
    // ══════════════════════════════════════════════════════════════
    {
        id: 'alprax',
        name: 'Alprax',
        genericName: 'Alprazolam 0.5mg',
        aliases: ['alprax', 'alpraz', 'alprex', 'alpax', 'alprazolam', 'alprazo', 'xanax'],
        category: 'Anxiolytic (Benzodiazepine)',
        usualUse: 'Anxiety and panic disorders, helps with sleep',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['0.25mg', '0.5mg', '1mg'],
        manufacturer: 'Torrent Pharmaceuticals'
    },
    {
        id: 'clonazepam',
        name: 'Clonafit',
        genericName: 'Clonazepam 0.5mg',
        aliases: ['clonafit', 'clonazepam', 'lonazep', 'rivotril', 'clona', 'klonopin', 'clonaz'],
        category: 'Anxiolytic / Antiepilpetic (Benzodiazepine)',
        usualUse: 'Epilepsy, panic disorder, anxiety, restless legs',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['0.25mg', '0.5mg', '1mg', '2mg'],
        manufacturer: 'Intas Pharma'
    },
    {
        id: 'sertraline',
        name: 'Serlift 50',
        genericName: 'Sertraline 50mg',
        aliases: ['serlift', 'sertraline', 'zoloft', 'serta', 'sertraline 50', 'daxid', 'serta 50'],
        category: 'Antidepressant (SSRI)',
        usualUse: 'Depression, OCD, panic disorder, social anxiety',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['25mg', '50mg', '100mg'],
        manufacturer: 'Torrent Pharma'
    },
    {
        id: 'escitalopram',
        name: 'Nexito 10',
        genericName: 'Escitalopram 10mg',
        aliases: ['nexito', 'nexito 10', 'escitalopram', 'cipralex', 'escital', 'stalopam', 'rexipra'],
        category: 'Antidepressant (SSRI)',
        usualUse: 'Depression and anxiety disorders',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['5mg', '10mg', '20mg'],
        manufacturer: 'Sun Pharma'
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
        id: 'gabapentin',
        name: 'Gabapin 300',
        genericName: 'Gabapentin 300mg',
        aliases: ['gabapin', 'gabapin 300', 'gabapentin', 'neurontin', 'gab 300', 'gabantin', 'gabatin'],
        category: 'Anticonvulsant / Neuropathic Pain',
        usualUse: 'Nerve pain, epilepsy, restless legs',
        visualType: 'Capsule',
        visualColor: 'Yellow',
        commonDosages: ['100mg', '300mg', '400mg'],
        manufacturer: 'Intas'
    },
    {
        id: 'pregabalin',
        name: 'Pregabalin 75',
        genericName: 'Pregabalin 75mg',
        aliases: ['pregabalin', 'lyrica', 'pregalin', 'pregabalin 75', 'maxgalin', 'rejunuron', 'pregab'],
        category: 'Anticonvulsant / Neuropathic Pain',
        usualUse: 'Diabetic neuropathy, fibromyalgia, generalised anxiety',
        visualType: 'Capsule',
        visualColor: 'White',
        commonDosages: ['25mg', '75mg', '150mg', '300mg'],
        manufacturer: 'Sun Pharma'
    },

    // ══════════════════════════════════════════════════════════════
    // SKIN / TOPICAL
    // ══════════════════════════════════════════════════════════════
    {
        id: 'betamethasone',
        name: 'Betnovate',
        genericName: 'Betamethasone 0.1% Cream',
        aliases: ['betnovate', 'betamethasone', 'betnovat', 'betnovet', 'betnovate cream', 'betnvate', 'betno'],
        category: 'Topical Corticosteroid',
        usualUse: 'Eczema, psoriasis, allergic skin rash',
        visualType: 'Cream',
        visualColor: 'White',
        commonDosages: ['0.05%', '0.1%'],
        manufacturer: 'GSK'
    },

    // ══════════════════════════════════════════════════════════════
    // ANTI-ULCER / ANTACIDS
    // ══════════════════════════════════════════════════════════════
    {
        id: 'antacid',
        name: 'Gelusil',
        genericName: 'Magnesium Hydroxide + Aluminium Hydroxide + Simethicone',
        aliases: ['gelusil', 'digene', 'digene gel', 'antacid', 'pudin hara', 'eno', 'mucaine', 'maalox'],
        category: 'Antacid',
        usualUse: 'Acidity, heartburn, gas, bloating',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['Standard'],
        manufacturer: 'Pfizer'
    },

    // ══════════════════════════════════════════════════════════════
    // STEROIDS / ANTI-INFLAMMATORY
    // ══════════════════════════════════════════════════════════════
    {
        id: 'prednisolone',
        name: 'Wysolone 10',
        genericName: 'Prednisolone 10mg',
        aliases: ['wysolone', 'wysolone 10', 'prednisolone', 'omnacortil', 'predmet', 'prednisol', 'depomedrol'],
        category: 'Corticosteroid',
        usualUse: 'Severe allergies, asthma, arthritis, autoimmune conditions',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['5mg', '10mg', '20mg', '40mg'],
        manufacturer: 'Pfizer'
    },
    {
        id: 'dexamethasone',
        name: 'Decadron',
        genericName: 'Dexamethasone 0.5mg',
        aliases: ['decadron', 'dexamethasone', 'dexona', 'dexacort', 'dexa', 'dexam'],
        category: 'Corticosteroid',
        usualUse: 'Severe inflammation, allergies, COVID-related inflammation',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['0.5mg', '4mg', '8mg'],
        manufacturer: 'Various'
    },

    // ══════════════════════════════════════════════════════════════
    // ANTI-PLATELETS / BLOOD THINNERS
    // ══════════════════════════════════════════════════════════════
    {
        id: 'aspirin-75',
        name: 'Ecosprin 75',
        genericName: 'Aspirin 75mg',
        aliases: ['ecosprin', 'ecosprin 75', 'aspirin 75', 'aspirin', 'disprin', 'aspilet', 'aspin'],
        category: 'Antiplatelet',
        usualUse: 'Heart attack and stroke prevention, blood thinning',
        visualType: 'Tablet',
        visualColor: 'White',
        commonDosages: ['75mg', '150mg'],
        manufacturer: 'USV'
    },
    {
        id: 'clopidogrel',
        name: 'Clopivas 75',
        genericName: 'Clopidogrel 75mg',
        aliases: ['clopivas', 'clopidogrel', 'plavix', 'clopi', 'clopilet', 'clopidogrel 75', 'clodrel'],
        category: 'Antiplatelet',
        usualUse: 'Heart attack and stroke prevention (with or without aspirin)',
        visualType: 'Tablet',
        visualColor: 'Pink',
        commonDosages: ['75mg'],
        manufacturer: 'Cipla'
    },
    {
        id: 'warfarin',
        name: 'Warf 2',
        genericName: 'Warfarin 2mg',
        aliases: ['warf', 'warfarin', 'coumadin', 'warf 2', 'warf 5', 'warfin', 'warfine'],
        category: 'Anticoagulant',
        usualUse: 'Blood clot prevention, atrial fibrillation, DVT',
        visualType: 'Tablet',
        visualColor: 'Pink',
        commonDosages: ['1mg', '2mg', '5mg'],
        manufacturer: 'Cipla'
    },

    // ══════════════════════════════════════════════════════════════
    // URINARY / KIDNEY
    // ══════════════════════════════════════════════════════════════
    {
        id: 'tamsulosin',
        name: 'Veltam 0.4',
        genericName: 'Tamsulosin 0.4mg',
        aliases: ['veltam', 'tamsulosin', 'urimax', 'flomax', 'tamsu', 'tamsulosin 0.4', 'urimax 0.4'],
        category: 'Alpha Blocker',
        usualUse: 'Enlarged prostate (BPH), urinary difficulty',
        visualType: 'Capsule',
        visualColor: 'Orange',
        commonDosages: ['0.2mg', '0.4mg'],
        manufacturer: 'Intas'
    },
    {
        id: 'nitrofurantoin',
        name: 'Macrobid',
        genericName: 'Nitrofurantoin 100mg',
        aliases: ['macrobid', 'nitrofurantoin', 'furadantin', 'nitrofu', 'nitro mac'],
        category: 'Urinary Antibiotic',
        usualUse: 'Urinary tract infections (UTI)',
        visualType: 'Capsule',
        visualColor: 'Yellow',
        commonDosages: ['50mg', '100mg'],
        manufacturer: 'Various'
    },
];

// ─── Fuzzy Matching Engine ─────────────────────────────────────────────────────
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

const similarityScore = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 100;
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 100;
    const distance = levenshteinDistance(s1, s2);
    return Math.round((1 - distance / maxLen) * 100);
};

export const findBestMedicineMatch = (inputName, threshold = 65) => {
    if (!inputName || inputName.trim().length < 2) return null;
    const input = inputName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const medicine of MEDICINE_DATABASE) {
        if (medicine.name.toLowerCase() === input) {
            return { medicine, score: 100, matchedAlias: medicine.name };
        }
        for (const alias of medicine.aliases) {
            const score = similarityScore(input, alias);
            const containsBonus = (input.includes(alias) || alias.includes(input)) ? 15 : 0;
            const adjustedScore = Math.min(100, score + containsBonus);
            if (adjustedScore > bestScore) {
                bestScore = adjustedScore;
                bestMatch = { medicine, score: adjustedScore, matchedAlias: alias };
            }
        }
        const genericScore = similarityScore(input, medicine.genericName.toLowerCase());
        if (genericScore > bestScore) {
            bestScore = genericScore;
            bestMatch = { medicine, score: genericScore, matchedAlias: medicine.genericName };
        }
    }
    if (bestMatch && bestMatch.score >= threshold) {
        console.log(`🎯 Fuzzy match: "${inputName}" → "${bestMatch.medicine.name}" (${bestMatch.score}% via "${bestMatch.matchedAlias}")`);
        return bestMatch;
    }
    console.log(`⚠️ No match for: "${inputName}" (best: ${bestScore}%)`);
    return null;
};

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
    return { correctedName: inputName, wasCorrected: false, matchScore: 0, medicineData: null };
};

export const getAllMedicines = () => MEDICINE_DATABASE;
export const getMedicineById = (id) => MEDICINE_DATABASE.find(m => m.id === id);

export default {
    MEDICINE_DATABASE,
    DANGEROUS_COMBOS,
    findBestMedicineMatch,
    correctMedicineName,
    getAllMedicines,
    getMedicineById
};
