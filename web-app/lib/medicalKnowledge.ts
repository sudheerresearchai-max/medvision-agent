/**
 * Medical Knowledge & Clinical Literature Retrieval Engine.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * Retrieves evidence-based oncology knowledge, symptoms, side effects,
 * treatment modalities, mandatory precautions, and acute red flags for detected
 * lesions and normal control studies.
 */

import { getGeminiApiKey } from './geminiVision';
import { extractJsonFromText } from './utils';
import type { ClinicalKnowledgeBrief, MedicalSourceRef, Organ } from './types';

// Curated evidence-based clinical knowledge bases for fallback / offline / instant delivery
const CURATED_KNOWLEDGE: Record<string, Omit<ClinicalKnowledgeBrief, 'retrievedAt'>> = {
  gbm: {
    condition: 'Glioblastoma Multiforme (Glioblastoma, IDH-wildtype)',
    category: 'Central Nervous System Malignancy (Neuro-Oncology)',
    whoClassification: 'WHO Grade 4 Diffuse Astrocytic Tumor',
    summary:
      'Glioblastoma is the most aggressive and malignant primary brain tumor in adults. Characterized by rapid diffuse parenchymal infiltration, hypervascularity, robust microvascular proliferation, and areas of central ischemic necrosis.',
    pathologyDetails:
      'Histopathologic hallmarks include hyperchromatic, pleomorphic glial nuclei, microvascular pseudopalisading necrosis, and brisk mitotic activity. Molecular profiling typically reveals IDH-wildtype status, TERT promoter mutations, EGFR amplification, and chromosome +7/-10 copy number alterations. MGMT promoter methylation is a critical prognostic factor for temozolomide responsiveness.',
    commonSymptoms: [
      'Progressive morning headaches that worsen with Valsalva or recumbency (elevated intracranial pressure).',
      'New-onset focal neurological deficits (hemiparesis, dysphasia, sensory loss, visual field defects).',
      'Focal or generalized tonic-clonic epileptic seizures (first presentation in 30-50% of patients).',
      'Cognitive decline, memory impairment, apathy, or personality changes.',
      'Nausea and projectile vomiting associated with cerebral edema.',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Vasogenic cerebral edema causing perilesional white matter swelling and mass effect.',
        'Midline shift and risk of uncal or subfalcine cerebral herniation.',
        'Obstructive hydrocephalus secondary to ventricular compression or CSF pathway entrapment.',
        'Deep vein thrombosis (DVT) and pulmonary embolism (PE) secondary to hypercoagulable state of malignancy.',
      ],
      treatmentRelated: [
        'Temozolomide (TMZ): Myelosuppression (thrombocytopenia, leukopenia), fatigue, nausea, elevated transaminases.',
        'Radiation Therapy (XRT): Radiation-induced cerebral edema, scalp alopecia, fatigue, pseudo-progression (mimicking recurrence), late radiation necrosis.',
        'Corticosteroids (Dexamethasone): Iatrogenic Cushingoid state, steroid-induced hyperglycemia, proximal myopathy, insomnia, immunosuppression.',
        'Antiepileptics (Levetiracetam): Somnolence, behavioral agitation, mood instability.',
      ],
    },
    treatmentModalities: [
      'Maximal Safe Surgical Resection: Craniotomy with intraoperative neuronavigation / 5-ALA fluorescence guidance.',
      'Stupp Protocol: Concurrent fractionated external beam radiotherapy (60 Gy / 30 fractions) with daily Temozolomide (75 mg/m²).',
      'Adjuvant Temozolomide: 6 maintenance cycles (150-200 mg/m² for 5 days every 28 days).',
      'Tumor Treating Fields (TTFields): Low-intensity alternating electric fields delivering antimitotic biophysical disruption.',
      'Second-Line Therapies: Bevacizumab (VEGF inhibitor for recurrent edema/progression), re-resection, or clinical trial protocols.',
    ],
    mandatoryPrecautions: [
      'Seizure Precautions: Anti-epileptic prophylaxis (e.g. Levetiracetam) in patients with prior seizures or cortical irritation.',
      'Driving & Operating Machinery Prohibition: Mandatory legal cessation of driving until cleared by neuro-oncology (typically 6-12 months seizure-free).',
      'Venous Thromboembolism (VTE) Vigilance: High index of suspicion for lower extremity DVT; caution with anticoagulation given intracranial hemorrhage risk.',
      'Steroid Tapering Protocol: Gradual dexamethasone taper under strict clinical supervision to prevent acute rebound cerebral edema.',
      'Fall Prevention Protocols: Implement assisted ambulation and home physical therapy evaluations for motor/proprioceptive deficits.',
    ],
    emergencyRedFlags: [
      'Acute pupillary asymmetry (anisocoria) or sluggish pupillary light reflex (heralds impending uncal herniation).',
      'Rapidly declining Glasgow Coma Scale (GCS) or progressive somnolence / unresponsiveness.',
      'Cushing\'s Triad: Hypertension with widening pulse pressure, bradycardia, and irregular/Cheyne-Stokes respirations.',
      'Status epilepticus or cluster seizures refractory to rescue medications.',
      'Sudden onset of dense unilateral hemiplegia or complete loss of vision.',
    ],
    sources: [
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Central Nervous System Cancers',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1425',
        citation: 'NCCN Guidelines Version 1.2024 — Central Nervous System Cancers: Glioblastoma Protocol.',
      },
      {
        name: 'WHO Classification of Tumours: Central Nervous System Tumours (5th Edition)',
        sourceType: 'registry',
        url: 'https://tumourclassification.iarc.who.int/',
        citation: 'Louis DN, et al. The 2021 WHO Classification of Tumors of the Central Nervous System: a summary. Neuro-Oncology. 2021;23(8):1231-1251.',
      },
      {
        name: 'New England Journal of Medicine (Stupp Protocol Trial)',
        sourceType: 'peer_reviewed',
        url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa043330',
        citation: 'Stupp R, et al. Radiotherapy plus concomitant and adjuvant temozolomide for glioblastoma. N Engl J Med. 2005;352(10):987-996.',
      },
      {
        name: 'National Cancer Institute (NCI) Adult Brain Tumors Treatment PDQ',
        sourceType: 'database',
        url: 'https://www.cancer.gov/types/brain/hp/adult-brain-treatment-pdq',
        citation: 'NCI Comprehensive Cancer Information: Adult Brain and Spinal Cord Tumors PDQ.',
      },
    ],
  },

  nsclc: {
    condition: 'Non-Small Cell Lung Carcinoma (NSCLC, Adenocarcinoma/Squamous)',
    category: 'Thoracic Oncology (Pulmonary Malignancy)',
    whoClassification: 'WHO Classification of Thoracic Tumours: Invasive Epithelial Malignancy',
    summary:
      'Non-Small Cell Lung Carcinoma encompasses the majority of primary pulmonary malignancies, presenting most commonly as peripheral adenocarcinomas or central squamous cell carcinomas. Often detected as solitary pulmonary nodules (SPN) with spiculated margins and pleural retraction.',
    pathologyDetails:
      'Histopathologic features display glandular differentiation, acinar/papillary architectural patterns, and mucin production. Molecular biomarker analysis is required for EGFR mutations (Exon 19 del, L858R), ALK fusions, ROS1, BRAF V600E, KRAS G12C, and PD-L1 TPS (Tumor Proportion Score) expression.',
    commonSymptoms: [
      'Persistent cough or change in chronic smoker\'s cough.',
      'Hemoptysis (streaks of blood in sputum or active hemoptysis).',
      'Unexplained progressive dyspnea and shortness of breath upon exertion.',
      'Unilateral dull, aching chest or pleuritic pain.',
      'Constitutional symptoms: Unintentional weight loss, anorexia, and fatigue.',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Post-obstructive atelectasis and recurrent non-resolving pneumonia.',
        'Malignant pleural effusion causing acute compression of lung parenchyma.',
        'Superior Vena Cava (SVC) Syndrome (facial plethora, neck vein distension).',
        'Metastatic spread to brain, bone, adrenal glands, and liver.',
      ],
      treatmentRelated: [
        'Chemotherapy (Carboplatin / Pemetrexed): Pancytopenia, nephrotoxicity, peripheral neuropathy, nausea.',
        'Immune Checkpoint Inhibitors (Pembrolizumab / Nivolumab): Immune-related adverse events (irAEs) including autoimmune pneumonitis, colitis, hepatitis, and thyroiditis.',
        'Thoracic Radiotherapy: Radiation pneumonitis, esophagitis (dysphagia/odynophagia), chest wall pain.',
        'Targeted TKIs (Osimertinib, etc.): Diarrhea, paronychia, papulopustular rash, QTc prolongation.',
      ],
    },
    treatmentModalities: [
      'Surgical Resection: Video-Assisted Thoracoscopic Surgery (VATS) lobectomy or anatomical segmentectomy with systematic mediastinal lymphadenectomy.',
      'Stereotactic Body Radiotherapy (SBRT / SABR): Curative-intent conformal radiation for early-stage inoperable candidates.',
      'Neoadjuvant / Adjuvant Chemo-Immunotherapy: Nivolumab + platinum-doublet prior to surgery for resectable stage IB-IIIA.',
      'Targeted Tyrosine Kinase Inhibitors (TKIs): Precision therapies for actionable EGFR, ALK, or ROS1 alterations.',
      'Definitive Concurrent Chemoradiation: For unresectable locally advanced stage III disease followed by consolidation Durvalumab.',
    ],
    mandatoryPrecautions: [
      'Smoking Cessation: Immediate referral to cessation program; reduces surgical complications and improves chemoradiation efficacy.',
      'Pulmonary Function Testing (PFT): Pre-treatment spirometry, DLCO, and baseline arterial blood gas verification.',
      'Vigilance for Immune Pneumonitis: Immediate evaluation for dry cough or worsening hypoxemia in patients receiving immunotherapy.',
      'Infection Prophylaxis: Annual influenza, COVID-19, and pneumococcal conjugate vaccinations.',
      'Oxygen Saturation Monitoring: Home pulse oximetry monitoring for progressive dyspnea.',
    ],
    emergencyRedFlags: [
      'Massive hemoptysis (>100 mL blood over 24 hours) risking asphyxiation and hemodynamic collapse.',
      'Superior Vena Cava Syndrome: Facial edema, cyanosis, and jugular venous engorgement.',
      'Acute severe respiratory failure with stridor or acute hypoxic decompensation.',
      'Signs of cord compression: Sudden paraparesis or loss of bowel/bladder control in patients with spine metastases.',
      'Tension pneumothorax: Sudden sharp pleuritic pain, tracheal deviation, and hypotension.',
    ],
    sources: [
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Non-Small Cell Lung Cancer',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1450',
        citation: 'NCCN Guidelines Version 2.2024 — Non-Small Cell Lung Cancer.',
      },
      {
        name: 'WHO Classification of Thoracic Tumours (5th Edition)',
        sourceType: 'registry',
        url: 'https://tumourclassification.iarc.who.int/',
        citation: 'WHO Classification of Tumours Editorial Board. Thoracic Tumours. Lyon (France): IARC; 2021.',
      },
      {
        name: 'American Society of Clinical Oncology (ASCO) Systemic Therapy Guidelines',
        sourceType: 'peer_reviewed',
        url: 'https://ascopubs.org/doi/10.1200/JCO.21.01828',
        citation: 'Hanna NH, et al. Therapy for Stage IV Non-Small-Cell Lung Cancer: ASCO Guideline Update. J Clin Oncol. 2021;39(36):4040-4071.',
      },
    ],
  },

  pancreas: {
    condition: 'Pancreatic Head Ductal Adenocarcinoma (PDAC)',
    category: 'Gastrointestinal / Abdominal Oncology',
    whoClassification: 'WHO Classification of Digestive System Tumours: Invasive Ductal Adenocarcinoma',
    summary:
      'Pancreatic ductal adenocarcinoma is a highly lethal gastrointestinal malignancy originating in the exocrine epithelium of the pancreatic ductal system. It is characterized by extensive desmoplastic stroma, neurotropism, and early vascular invasion.',
    pathologyDetails:
      'Histopathologic evaluation shows irregular, poorly formed glandular structures infiltrating dense fibrotic (desmoplastic) stroma. Greater than 90% harbor activating KRAS point mutations (commonly G12D, G12V), coupled with inactivation of TP53, SMAD4, and CDKN2A tumor suppressor genes.',
    commonSymptoms: [
      'Painless progressive obstructive jaundice (scleral icterus, dark tea-colored urine, acholic clay-colored stools).',
      'Severe epigastric pain radiating directly to the mid-back (worse in supine position).',
      'Rapid, profound unintentional weight loss and cachexia.',
      'New-onset type 2 diabetes mellitus in an elderly patient without traditional metabolic risk factors.',
      'Pruritus (severe generalized itching secondary to accumulated bile salts).',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Biliary tree obstruction and secondary cholangitis (Charcot\'s triad: fever, RUQ pain, jaundice).',
        'Duodenal outlet obstruction causing recurrent postprandial vomiting.',
        'Extensive perineural invasion causing severe intractable visceral pain.',
        'Trousseau Syndrome (migratory thrombophlebitis / recurrent thromboembolic disease).',
      ],
      treatmentRelated: [
        'FOLFIRINOX: Severe neutropenia, diarrhea, cholinergic syndrome (irinotecan), oxaliplatin-induced cold dysesthesia and peripheral sensory neuropathy.',
        'Gemcitabine / Nab-Paclitaxel: Bone marrow suppression, peripheral edema, stomatitis.',
        'Whipple Procedure (Pancreaticoduodenectomy): Delayed gastric emptying, pancreatic anastomotic fistula, bile leak, exocrine insufficiency (steatorrhea).',
        'Pancreatic Enzyme Replacement: Malabsorption if dosing is inadequate.',
      ],
    },
    treatmentModalities: [
      'Surgical Resection: Classic or pylorus-preserving Pancreaticoduodenectomy (Whipple Procedure) for anatomically resectable tumors with patent SMA/SMV.',
      'Neoadjuvant Chemotherapy: FOLFIRINOX or Gemcitabine + Nab-Paclitaxel for borderline resectable lesions to achieve R0 surgical margins.',
      'Adjuvant Systemic Therapy: Modified FOLFIRINOX for 6 months post-resection.',
      'Palliative Biliary Stenting: Endoscopic Retrograde Cholangiopancreatography (ERCP) with self-expanding metal stent (SEMS) placement.',
      'Celiac Plexus Neurolysis: Percutaneous or endoscopic block for refractory malignant back pain.',
    ],
    mandatoryPrecautions: [
      'Biliary Decompression Precaution: Urgent stenting indicated if bilirubin exceeds 5-10 mg/dL or sign of cholangitis emerges.',
      'Pancreatic Enzyme Replacement Therapy (PERT): Mandatory with meals to prevent severe fat malabsorption and micronutrient deficiency.',
      'Aggressive Anticoagulation Prophylaxis: Highest incidence of VTE among solid malignancies; prophylactic low molecular weight heparin (LMWH) indicated.',
      'Glycemic Control Monitoring: Frequent blood glucose monitoring for brittle pancreatogenic (Type 3c) diabetes.',
      'Nutritional Counseling: High-calorie, high-protein supplements and dietitian oversight to combat cancer cachexia.',
    ],
    emergencyRedFlags: [
      'Acute Ascending Cholangitis: Reynold\'s Pentad (fever, chills, jaundice, hypotension, and altered mental status) — emergency decompression required.',
      'Massive upper gastrointestinal bleeding from pseudoaneurysm rupture or direct duodenal invasion.',
      'Acute complete duodenal bowel obstruction with intractable bilious vomiting and dehydration.',
      'Acute pulmonary embolism or severe acute deep vein thrombosis.',
    ],
    sources: [
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Pancreatic Adenocarcinoma',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1455',
        citation: 'NCCN Guidelines Version 1.2024 — Pancreatic Adenocarcinoma.',
      },
      {
        name: 'WHO Classification of Digestive System Tumours (5th Edition)',
        sourceType: 'registry',
        url: 'https://tumourclassification.iarc.who.int/',
        citation: 'WHO Classification of Tumours Editorial Board. Digestive System Tumours. Lyon: IARC; 2019.',
      },
      {
        name: 'New England Journal of Medicine (PRODIGE 24/CCTG PA.6 Trial)',
        sourceType: 'peer_reviewed',
        url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1809770',
        citation: 'Conroy T, et al. FOLFIRINOX or Gemcitabine as Adjuvant Therapy for Pancreatic Cancer. N Engl J Med. 2018;379(25):2395-2406.',
      },
    ],
  },

  breast: {
    condition: 'Invasive Ductal Carcinoma (Infiltrating Ductal Carcinoma, IDC)',
    category: 'Breast Malignancy (Mammary Oncology)',
    whoClassification: 'WHO Classification of Breast Tumours: Invasive Breast Carcinoma of No Special Type (NST)',
    summary:
      'Invasive ductal carcinoma is the most common histological subtype of breast cancer, originating in the mammary epithelial lining and infiltrating surrounding stroma. Characterized by dense fibrotic architectural distortion, microcalcifications, and potential axillary lymphatic dissemination.',
    pathologyDetails:
      'Histopathologic features demonstrate cohesive infiltration of malignant ductal epithelial cells into fibrous stroma. Mandatory biomarker profiling includes Estrogen Receptor (ER), Progesterone Receptor (PR), HER2/neu amplification (IHC/FISH), and Ki-67 proliferation index.',
    commonSymptoms: [
      'Painless, firm, fixed breast lump with irregular contours.',
      'Skin retraction, puckering, or nipple inversion.',
      'Spontaneous serosanguinous or bloody nipple discharge.',
      'Unilateral axillary lymph node enlargement.',
      'Cutaneous changes: Peau d orange texture secondary to dermal lymphatic obstruction.',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Local invasion of chest wall musculature (pectoralis major).',
        'Axillary and internal mammary lymph node metastasis.',
        'Distant metastasis to bone, liver, lungs, and central nervous system.',
        'Secondary breast pain or inflammatory skin changes.',
      ],
      treatmentRelated: [
        'Endocrine Therapy (Tamoxifen/Aromatase Inhibitors): Hot flashes, arthralgias, osteopenia/osteoporosis, thromboembolism.',
        'HER2-Targeted Therapy (Trastuzumab): Reversible cardiomyopathy / reduced left ventricular ejection fraction (LVEF).',
        'Chemotherapy (AC-T): Myelosuppression, alopecia, peripheral sensory neuropathy (taxanes).',
        'Radiation Therapy: Local erythema, breast fibrosis, hyperpigmentation.',
      ],
    },
    treatmentModalities: [
      'Surgical Intervention: Breast-Conserving Surgery (Lumpectomy) with negative margins or Total Mastectomy, combined with Sentinel Lymph Node Biopsy (SLNB).',
      'Adjuvant / Neoadjuvant Chemotherapy: Dose-dense Doxorubicin + Cyclophosphamide followed by Paclitaxel (AC-T).',
      'Targeted Anti-HER2 Therapy: Trastuzumab + Pertuzumab for HER2-positive phenotypes.',
      'Endocrine Therapy: Tamoxifen (premenopausal) or Aromatase Inhibitors (postmenopausal) for hormone-receptor-positive disease.',
      'Adjuvant Radiotherapy: Whole-breast radiotherapy post-lumpectomy or post-mastectomy radiation for high-risk nodal involvement.',
    ],
    mandatoryPrecautions: [
      'Lymphedema Prevention: Avoid blood pressure cuffs, venipuncture, and heavy carrying on the ipsilateral arm following axillary dissection.',
      'Cardiac Monitoring: Baseline and serial Echocardiograms or MUGA scans every 3 months during Trastuzumab therapy.',
      'Bone Health Maintenance: Baseline DEXA scan; calcium, vitamin D supplementation, and bisphosphonate evaluation for patients on aromatase inhibitors.',
      'Fertility Preservation Consultation: Discuss embryo/oocyte cryopreservation prior to gonadotoxic chemotherapy in premenopausal women.',
    ],
    emergencyRedFlags: [
      'Sudden onset of severe focal back pain or paraparesis concerning for malignant spinal cord compression.',
      'Acute severe dyspnea or pleuritic chest pain concerning for pulmonary embolism or massive malignant pleural effusion.',
      'Signs of acute cardiac decompensation (peripheral edema, orthopnea, paroxysmal nocturnal dyspnea).',
    ],
    sources: [
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Breast Cancer',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1419',
        citation: 'NCCN Guidelines Version 2.2024 — Breast Cancer Protocol.',
      },
      {
        name: 'WHO Classification of Breast Tumours (5th Edition)',
        sourceType: 'registry',
        url: 'https://tumourclassification.iarc.who.int/',
        citation: 'WHO Classification of Tumours Editorial Board. Breast Tumours. Lyon: IARC; 2019.',
      },
    ],
  },

  kidney: {
    condition: 'Renal Cell Carcinoma (Clear Cell RCC, ccRCC)',
    category: 'Urologic Oncology (Renal Cortical Malignancy)',
    whoClassification: 'WHO Classification of Urinary and Male Genital Tumours: Clear Cell Renal Cell Carcinoma',
    summary:
      'Clear cell renal cell carcinoma arises from the proximal convoluted tubule epithelium, representing the predominant subtype of adult primary renal cancer. Highly vascular with characteristic loss of the VHL tumor suppressor gene on chromosome 3p, promoting robust VEGF-driven neoangiogenesis.',
    pathologyDetails:
      'Microscopic features reveal sheets of round to polygonal cells with clear, lipid- and glycogen-rich cytoplasm bounded by distinct cell membranes and surrounded by an intricate, delicate capillary network. Frequent mutations in VHL, PBRM1, BAP1, and SETD2.',
    commonSymptoms: [
      'Gross or microscopic hematuria (classic urologic sign).',
      'Dull, aching flank or lateral abdominal pain.',
      'Palpable flank or abdominal mass.',
      'Unexplained constitutional symptoms: Persistent fever, night sweats, anorexia, weight loss.',
      'New-onset left-sided varicocele in adult men (renal vein tumor thrombus).',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Renal vein and inferior vena cava (IVC) tumor thrombus extension.',
        'Secondary hypertension from renin hypersecretion.',
        'Paraneoplastic syndromes: Hypercalcemia (PTHrP), erythrocytosis (erythropoietin), Stauffer syndrome (reversible hepatic dysfunction).',
        'Metastatic seeding to lungs, bones, liver, and brain.',
      ],
      treatmentRelated: [
        'VEGF Tyrosine Kinase Inhibitors (Cabozantinib, Sunitinib): Hypertension, hand-foot skin reaction, diarrhea, fatigue, proteinuria.',
        'Immune Checkpoint Inhibitors (Nivolumab, Ipilimumab): Immune-related adverse events (hypophysitis, colitis, hepatitis, pneumonitis).',
        'Partial / Radical Nephrectomy: Chronic kidney disease (CKD), post-operative hemorrhage, urine leak.',
      ],
    },
    treatmentModalities: [
      'Surgical Resection: Partial Nephrectomy (nephron-sparing for T1a/T1b tumors) or Radical Nephrectomy with regional lymphadenectomy.',
      'Ablative Therapies: Cryoablation or Radiofrequency Ablation (RFA) for small cortical tumors (< 3 cm) in comorbid patients.',
      'First-Line Systemic Dual Immunotherapy: Nivolumab + Ipilimumab for intermediate/poor-risk metastatic disease.',
      'IO-TKI Combination: Pembrolizumab + Axitinib or Lenvatinib + Pembrolizumab across all IMDC risk groups.',
      'Active Surveillance: Structured protocol for small incidental renal masses (< 2 cm) in elderly candidates.',
    ],
    mandatoryPrecautions: [
      'Renal Function Preservation: Serial eGFR and serum creatinine monitoring; strict avoidance of nephrotoxic medications (NSAIDs, aminoglycosides).',
      'Blood Pressure Surveillance: Daily home blood pressure log; aggressive management of VEGF-induced hypertension.',
      'Contrast Precaution: Hydration protocols and contrast minimization for residual solitary kidney.',
    ],
    emergencyRedFlags: [
      'Severe intractable gross hematuria with clot retention risking acute bladder outlet obstruction.',
      'Acute severe bilateral lower extremity edema or collateral abdominal wall venous engorgement (IVC occlusion).',
      'Hypercalcemic crisis (confusion, lethargy, cardiac arrhythmias, severe dehydration).',
    ],
    sources: [
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Kidney Cancer',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1440',
        citation: 'NCCN Guidelines Version 1.2024 — Kidney Cancer.',
      },
      {
        name: 'European Association of Urology (EAU) Guidelines on Renal Cell Carcinoma',
        sourceType: 'guideline',
        url: 'https://uroweb.org/guidelines/renal-cell-carcinoma',
        citation: 'Ljungberg B, et al. EAU Guidelines on Renal Cell Carcinoma. Eur Urol. 2022;82(4):399-410.',
      },
    ],
  },

  skin: {
    condition: 'Cutaneous Malignant Melanoma',
    category: 'Dermatologic Oncology (Cutaneous Malignancy)',
    whoClassification: 'WHO Classification of Skin Tumours: Superficial Spreading / Nodular Melanoma',
    summary:
      'Cutaneous melanoma is a highly aggressive skin malignancy arising from epidermal melanocytes. Displays early propensity for vertical dermal invasion, regional lymph node spread, and distant visceral metastasis. Staged primarily by Breslow tumor depth and ulceration status.',
    pathologyDetails:
      'Histopathologic evaluation demonstrates atypical melanocytes proliferating in nests along the dermo-epidermal junction and invading vertically into the dermis. Molecular profiling is mandatory for BRAF V600 (V600E/K), NRAS, and c-KIT mutations in advanced stages.',
    commonSymptoms: [
      'Asymmetry: Two halves of the lesion do not match.',
      'Border: Scalloped, notched, or poorly defined margins.',
      'Color: Variegation with shades of brown, black, blue, white, or red.',
      'Diameter: Exceeding 6 mm (pencil eraser size), though can present smaller.',
      'Evolving: Change in size, shape, surface bleeding, or elevation over time.',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Satellite and in-transit dermal or subcutaneous metastases.',
        'Regional sentinel lymph node micrometastasis.',
        'Distant visceral metastases to brain, lungs, liver, and gastrointestinal tract.',
      ],
      treatmentRelated: [
        'BRAF/MEK Inhibitors (Dabrafenib + Trametinib): Pyrexia, cutaneous squamous cell carcinomas, fatigue, diarrhea.',
        'Anti-PD-1 / Anti-CTLA-4 Immunotherapy (Nivolumab + Ipilimumab): Immune-related colitis, endocrinopathies, vitiligo.',
        'Wide Local Excision: Surgical scarring, wound dehiscence, secondary lymphedema following lymphadenectomy.',
      ],
    },
    treatmentModalities: [
      'Wide Local Excision (WLE): Definitive surgical excision with 1 cm margins for Breslow depth ≤ 1 mm; 2 cm margins for Breslow depth > 2 mm.',
      'Sentinel Lymph Node Biopsy (SLNB): Mandatory staging procedure for melanomas with Breslow depth ≥ 0.8 mm or with ulceration.',
      'Targeted Therapy: Dual BRAF/MEK inhibition (Dabrafenib/Trametinib or Encorafenib/Binimetinib) for BRAF V600-mutant disease.',
      'Immune Checkpoint Blockade: Adjuvant or first-line metastatic Pembrolizumab, Nivolumab, or Nivolumab + Relatlimab.',
    ],
    mandatoryPrecautions: [
      'Total Cutaneous Surveillance: Complete full-body skin examination every 3-6 months; patient self-examination using ABCDE criteria.',
      'Sun Protection Measures: Strict UV avoidance, broad-spectrum SPF 50+ sunscreen, protective clothing.',
      'Family Screening: First-degree relatives should undergo baseline dermatologic evaluation.',
    ],
    emergencyRedFlags: [
      'Acute neurological symptoms (new seizure, headache, focal deficit) indicating brain metastasis.',
      'Rapidly enlarging subcutaneous or lymph node mass.',
      'Severe immune-mediated diarrhea / abdominal pain concerning for immune colitis.',
    ],
    sources: [
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Melanoma: Cutaneous',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1443',
        citation: 'NCCN Guidelines Version 1.2024 — Melanoma: Cutaneous.',
      },
    ],
  },

  liver: {
    condition: 'Hepatocellular Carcinoma (HCC)',
    category: 'Gastrointestinal & Hepatobiliary Oncology',
    whoClassification: 'WHO Classification of Digestive System Tumours: Hepatocellular Carcinoma',
    summary:
      'Hepatocellular carcinoma is the primary malignant neoplasm of hepatocytes, developing almost exclusively in the background of chronic cirrhosis, hepatitis B/C viral infection, or metabolic dysfunction-associated steatohepatitis (MASH). Features unique diagnostic arterial phase hyperenhancement and venous washout.',
    pathologyDetails:
      'Histopathologic architecture shows trabecular, pseudoglandular, and solid growth patterns of pleomorphic hepatocytes with bile production. Molecular alterations commonly involve TERT promoter mutations, CTNNB1, and TP53. Serum alpha-fetoprotein (AFP) serves as the primary tumor biomarker.',
    commonSymptoms: [
      'Right upper quadrant (RUQ) dull aching abdominal pain.',
      'Worsening jaundice, scleral icterus, and pruritus.',
      'Rapidly accumulating ascites refractory to diuretic therapy.',
      'Profound anorexia, early satiety, and cachexia.',
      'Hepatosplenomegaly and prominent collateral abdominal wall veins.',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Portal vein tumor thrombosis (PVTT) with acute portal hypertension.',
        'Spontaneous tumor rupture causing life-threatening intraperitoneal hemorrhage.',
        'Hepatic encephalopathy secondary to acute-on-chronic liver failure.',
        'Bleeding esophageal varices.',
      ],
      treatmentRelated: [
        'Transarterial Chemoembolization (TACE): Post-embolization syndrome (fever, RUQ pain, nausea), transient hepatic decompensation.',
        'Systemic Immunotherapy (Atezolizumab + Bevacizumab): Upper GI bleeding from varices, hypertension, proteinuria, autoimmune hepatitis.',
        'Tyrosine Kinase Inhibitors (Sorafenib/Lenvatinib): Diarrhea, hand-foot syndrome, fatigue, weight loss.',
      ],
    },
    treatmentModalities: [
      'Curative Surgical Resection: For solitary tumors in non-cirrhotic liver or compensated Child-Pugh A cirrhosis without portal hypertension.',
      'Orthotopic Liver Transplantation (OLT): Curative modality for patients meeting Milan Criteria (solitary tumor ≤ 5 cm, or up to 3 lesions ≤ 3 cm).',
      'Locoregional Therapy: Radiofrequency Ablation (RFA) or Microwave Ablation (MWA) for small lesions (< 3 cm); TACE for intermediate stage (BCLC B).',
      'Systemic First-Line Therapy: Atezolizumab + Bevacizumab or Durvalumab + Tremelimumab for advanced unresectable disease.',
    ],
    mandatoryPrecautions: [
      'Upper Endoscopy Clearance: Esophagogastroduodenoscopy (EGD) to evaluate and band high-risk esophageal varices prior to initiating VEGF inhibitor therapy.',
      'Liver Functional Monitoring: Regular Child-Pugh and MELD score recalculations to titrate interventions.',
      'Viral Suppression: Antiviral therapy (e.g. Entecavir/Tenofovir for HBV) to suppress ongoing viral replication and prevent decompensation.',
    ],
    emergencyRedFlags: [
      'Sudden severe abdominal pain with hemodynamic shock and drop in hemoglobin (acute HCC rupture into peritoneum).',
      'Massive hematemesis or melena from bleeding gastroesophageal varices.',
      'Acute confusion, asterixis, or lethargy (hepatic encephalopathy).',
    ],
    sources: [
      {
        name: 'AASLD Practice Guidance: Diagnosis, Staging, and Management of Hepatocellular Carcinoma',
        sourceType: 'guideline',
        url: 'https://www.aasld.org/practice-guidelines',
        citation: 'Singal AG, et al. AASLD Practice Guidance on Prevention, Diagnosis, and Treatment of HCC. Hepatology. 2023;78(6):1922-1965.',
      },
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Hepatobiliary Cancers',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1438',
        citation: 'NCCN Guidelines Version 1.2024 — Hepatobiliary Cancers.',
      },
    ],
  },

  colon: {
    condition: 'Colorectal Adenocarcinoma',
    category: 'Gastrointestinal Oncology (Lower GI Malignancy)',
    whoClassification: 'WHO Classification of Digestive System Tumours: Colorectal Adenocarcinoma',
    summary:
      'Colorectal adenocarcinoma arises from the glandular epithelial lining of the large intestine, typically progressing through the adenoma-carcinoma sequence via chromosomal instability (APC, KRAS, TP53) or DNA mismatch repair deficiency (dMMR / MSI-High).',
    pathologyDetails:
      'Histopathologic features display gland-forming columnar epithelial cells with nuclear stratification, luminal necrosis (dirty necrosis), and desmoplasia. Molecular reflex testing includes MMR/MSI, KRAS/NRAS, BRAF V600E, and HER2 amplification.',
    commonSymptoms: [
      'Persistent change in bowel habits (alternating diarrhea and constipation).',
      'Hematochezia (bright red rectal bleeding) or dark melenic stools.',
      'Unexplained iron deficiency anemia (fatigue, pallor) especially in right-sided lesions.',
      'Persistent abdominal discomfort, cramping, or feeling of incomplete evacuation (tenesmus).',
      'Unintentional weight loss and progressive malaise.',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Complete mechanical large bowel obstruction.',
        'Tumor perforation causing fecal peritonitis and sepsis.',
        'Metastatic dissemination primarily to the liver (via portal venous circulation), peritoneum, and lungs.',
      ],
      treatmentRelated: [
        'Oxaliplatin (FOLFOX): Acute cold dysesthesia and cumulative peripheral sensory neuropathy.',
        'Irinotecan (FOLFIRI): Acute cholinergic syndrome and severe delayed diarrhea.',
        'Anti-EGFR Antibodies (Cetuximab): Acneiform rash, hypomagnesemia, paronychia.',
      ],
    },
    treatmentModalities: [
      'Curative Surgical Resection: Partial colectomy or proctectomy with en bloc regional lymphadenectomy (minimum 12 lymph nodes evaluated).',
      'Adjuvant Chemotherapy: Modified FOLFOX6 or CAPOX for high-risk stage II and all stage III resected colon cancers.',
      'Neoadjuvant Total Neoadjuvant Therapy (TNT): For locally advanced rectal cancer (chemotherapy + chemoradiation prior to surgery).',
      'Targeted Biologic Therapy: Bevacizumab (anti-VEGF) or Cetuximab/Panitumumab (anti-EGFR for KRAS/NRAS/BRAF wild-type tumors).',
      'Immunotherapy: Pembrolizumab or Nivolumab + Ipilimumab for dMMR / MSI-H metastatic colorectal cancer.',
    ],
    mandatoryPrecautions: [
      'Cold Sensitivity Precaution: Avoid cold beverages, ice, and cold ambient temperatures during and 5 days after Oxaliplatin infusions.',
      'Electrolyte & Magnesium Surveillance: Frequent serum magnesium monitoring in patients receiving Cetuximab.',
      'Stoma Care Nursing: Pre-operative stoma site marking and education for patients undergoing colostomy or ileostomy.',
    ],
    emergencyRedFlags: [
      'Acute mechanical bowel obstruction: Inability to pass stool or flatus, progressive severe abdominal distension, and feculent vomiting.',
      'Acute peritonitis: Sudden severe diffuse abdominal pain with rebound tenderness and rigidity (viscus perforation).',
      'Massive lower gastrointestinal bleeding causing hemodynamic instability.',
    ],
    sources: [
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Colon Cancer',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1428',
        citation: 'NCCN Guidelines Version 1.2024 — Colon Cancer.',
      },
    ],
  },

  prostate: {
    condition: 'Prostate Adenocarcinoma (Acinar)',
    category: 'Genitourinary / Urologic Oncology',
    whoClassification: 'WHO Classification of Tumours: Acinar Adenocarcinoma of the Prostate',
    summary:
      'Acinar adenocarcinoma of the prostate is the most prevalent solid non-cutaneous cancer in men, arising predominantly in the peripheral zone of the prostate gland. Driven primarily by androgen receptor (AR) signaling, tumors are graded according to the ISUP / Gleason Grade Group system.',
    pathologyDetails:
      'Histopathologic architecture shows small, crowded malignant glands lacking the outer basal cell layer, with prominent nucleoli. Graded into Gleason Grade Groups 1 (3+3) through 5 (4+5, 5+5). Biomarkers include serum PSA, PSA velocity, and genomic classifiers (Decipher, Oncotype DX).',
    commonSymptoms: [
      'Increased urinary frequency, especially nocturia.',
      'Weak or interrupted urinary stream; difficulty initiating urination (hesitancy).',
      'Hematuria or hematospermia.',
      'Erectile dysfunction.',
      'Dull aching bone pain in lower back, hips, or pelvis in advanced metastatic disease.',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'Acute bladder outlet obstruction / acute urinary retention.',
        'Osteoblastic bone metastases causing pathological fractures and bone pain.',
        'Malignant spinal cord compression from vertebral metastases.',
        'Secondary hydronephrosis from ureteral meatus compression.',
      ],
      treatmentRelated: [
        'Androgen Deprivation Therapy (ADT - Leuprolide, Degarelix): Hot flashes, loss of libido, sarcopenia, gynecomastia, osteoporosis, cardiovascular risk.',
        'Radical Prostatectomy: Stress urinary incontinence and erectile dysfunction.',
        'External Beam Radiotherapy: Radiation cystitis, proctitis (tenesmus, rectal bleeding), erectile dysfunction.',
      ],
    },
    treatmentModalities: [
      'Active Surveillance: Preferred strategy for low-risk disease (Grade Group 1, PSA < 10 ng/mL) with serial PSA and mpMRI.',
      'Radical Prostatectomy: Open or robotic-assisted laparoscopic prostatectomy with nerve-sparing technique when oncologically safe.',
      'Definitive Radiotherapy: External Beam Radiotherapy (EBRT) or Brachytherapy with or without concurrent and adjuvant ADT.',
      'Novel Androgen Receptor Pathway Inhibitors (ARPI): Enzalutamide, Apalutamide, or Darolutamide for castrate-resistant or high-risk metastatic disease.',
      'PARP Inhibitors: Olaparib or Rucaparib for BRCA1/BRCA2-mutated metastatic castration-resistant prostate cancer.',
    ],
    mandatoryPrecautions: [
      'Bone Mineral Density Preservation: Baseline DEXA scan; calcium, vitamin D, and bisphosphonates (Zoledronic acid) or Denosumab during long-term ADT.',
      'Cardiovascular Risk Management: Optimize lipid profile and blood pressure; regular cardiovascular monitoring during hormonal blockade.',
      'PSA Doubling Time Monitoring: Serial PSA every 3 months for biochemical recurrence surveillance post-curative therapy.',
    ],
    emergencyRedFlags: [
      'Signs of acute spinal cord compression: Progressive lower extremity weakness, sensory level deficit, or loss of bowel/bladder control.',
      'Acute complete urinary retention requiring urgent bladder decompression.',
      'Intractable severe bone pain or sudden inability to bear weight.',
    ],
    sources: [
      {
        name: 'NCCN Clinical Practice Guidelines in Oncology: Prostate Cancer',
        sourceType: 'guideline',
        url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1459',
        citation: 'NCCN Guidelines Version 2.2024 — Prostate Cancer.',
      },
    ],
  },

  normal: {
    condition: 'Normal Baseline / Negative Study',
    category: 'Diagnostic Health Screening & Normal Anatomy',
    whoClassification: 'Within Normal Biological & Morphological Limits',
    summary:
      'Automated neural multimodal evaluation and multi-agent review identified no abnormal focal mass, hyperintense contrast enhancement, pathological nodule, or mass effect within the examined organ parenchyma.',
    pathologyDetails:
      'Organ parenchymal architecture displays normal organ-specific morphological symmetry. Corticomedullary / gray-white matter differentiation is preserved, ventricular and vascular geometries are anatomical, and zero suspicious hyperdense or hypodense lesions were detected above activation thresholds.',
    commonSymptoms: [
      'Scan was performed for screening, headache, cough, non-specific abdominal discomfort, or routine pre-operative clearance.',
      'Absence of focal neurological deficits, constitutional oncologic symptoms, or progressive parenchymal impairment.',
    ],
    clinicalSideEffects: {
      diseaseRelated: [
        'No oncologic or neoplastic disease manifestations identified on this cross-sectional slice.',
      ],
      treatmentRelated: [
        'No oncologic intervention, chemotherapy, or radiotherapy indicated.',
      ],
    },
    treatmentModalities: [
      'No surgical or pharmacological oncologic intervention required.',
      'Symptomatic management of non-oncologic complaints (e.g. tension headache, transient reflux, or benign cough) under primary care physician.',
      'Routine age-appropriate preventive screening as clinically indicated.',
    ],
    mandatoryPrecautions: [
      'Single-Slice Imaging Limitation: A negative single 2D slice does not completely exclude sub-centimeter lesions located outside the scanned plane.',
      'Multi-Planar Physician Correlation: Automated negative screening must be correlated with complete volume DICOM series by a board-certified radiologist.',
      'Clinical Vigilance: If clinical symptoms persist, progress, or change in character, prompt clinical re-evaluation is advised.',
    ],
    emergencyRedFlags: [
      'Sudden onset of "thunderclap" headache (worst headache of life) requiring acute CT exclusion of subarachnoid hemorrhage.',
      'Acute new focal motor deficits, sudden severe dyspnea, or severe acute abdominal rigidity.',
    ],
    sources: [
      {
        name: 'American College of Radiology (ACR) Appropriateness Criteria',
        sourceType: 'guideline',
        url: 'https://www.acr.org/Clinical-Resources/ACR-Appropriateness-Criteria',
        citation: 'ACR Appropriateness Criteria: Diagnostic Imaging & Follow-up Protocols.',
      },
      {
        name: 'Radiological Society of North America (RSNA) Normal Anatomy Guidelines',
        sourceType: 'registry',
        url: 'https://www.radiologyinfo.org/',
        citation: 'RSNA Diagnostic Radiology Reference: Normal Cranial, Thoracic, and Abdominal Anatomy.',
      },
    ],
  },
};

/**
 * Fetch online or curated evidence-based medical knowledge for the detected condition.
 */
export async function fetchMedicalKnowledge(args: {
  diagnosis: string;
  organ: Organ;
  hasTumor: boolean;
}): Promise<ClinicalKnowledgeBrief> {
  const now = new Date().toISOString();

  // If normal / negative study
  if (!args.hasTumor || /normal|negative|clear|unremarkable/i.test(args.diagnosis)) {
    return {
      ...CURATED_KNOWLEDGE.normal,
      retrievedAt: now,
    };
  }

  // Try online retrieval via Gemini API if key is present
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const prompt = `You are an expert clinical oncologist and academic medical researcher.
Provide authoritative clinical oncology intelligence for: "${args.diagnosis}" (${args.organ.toUpperCase()} scan).
Generate comprehensive, factual, professional medical details:
1. condition (Formal name, e.g. Glioblastoma Multiforme, IDH-wildtype)
2. category (e.g. WHO Grade 4 Central Nervous System Malignancy)
3. whoClassification (Official WHO classification and grade)
4. summary (3-4 concise professional sentences describing the condition and its biological behavior)
5. pathologyDetails (Histological architecture, cellular characteristics, and key molecular/genetic biomarkers like IDH, MGMT, EGFR, KRAS, TP53, PD-L1)
6. commonSymptoms (5 bullet points describing typical patient-reported manifestations and clinical signs)
7. clinicalSideEffects:
   - diseaseRelated (4 bullet points describing secondary disease effects: edema, mass effect, herniation, obstruction)
   - treatmentRelated (4 bullet points describing toxicities from standard therapies: chemotherapy, radiation, steroids, surgery)
8. treatmentModalities (5 bullet points detailing the evidence-based standard of care: surgical resection, chemoradiation, adjuvant protocols, targeted therapy)
9. mandatoryPrecautions (5 bullet points of crucial clinical precautions: seizures, driving, DVT, infection, steroids)
10. emergencyRedFlags (5 bullet points of acute red flags requiring immediate ER / neurosurgery emergency transfer)
11. sources (Array of 3-4 objects with: name, sourceType ["guideline"|"registry"|"peer_reviewed"], url, citation)

Respond with strict JSON matching this schema:
{
  "condition": string,
  "category": string,
  "whoClassification": string,
  "summary": string,
  "pathologyDetails": string,
  "commonSymptoms": string[],
  "clinicalSideEffects": {
    "diseaseRelated": string[],
    "treatmentRelated": string[]
  },
  "treatmentModalities": string[],
  "mandatoryPrecautions": string[],
  "emergencyRedFlags": string[],
  "sources": [
    {
      "name": string,
      "sourceType": "guideline" | "registry" | "peer_reviewed" | "database",
      "url": string,
      "citation": string
    }
  ]
}`;

      const models = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-2.0-flash-lite',
        'gemini-1.5-pro',
        'gemini-flash-latest',
      ];

      for (const m of models) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  response_mime_type: 'application/json',
                  temperature: 0.1,
                },
              }),
              signal: AbortSignal.timeout(10000),
            },
          );

          if (!res.ok) {
            if (res.status === 400 || res.status === 401 || res.status === 403) {
              break;
            }
            continue;
          }

          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = extractJsonFromText<Omit<ClinicalKnowledgeBrief, 'retrievedAt'>>(text);
            if (parsed && parsed.condition && parsed.commonSymptoms && parsed.clinicalSideEffects) {
              return {
                ...parsed,
                retrievedAt: now,
              };
            }
          }
        } catch {
          // Try next model
        }
      }
    } catch {
      // Degrade gracefully to curated knowledge base
    }
  }

  // Fallback to rich curated knowledge base
  const diagLower = args.diagnosis.toLowerCase();
  if (diagLower.includes('glioblastoma') || diagLower.includes('gbm') || diagLower.includes('glioma') || args.organ === 'brain') {
    return { ...CURATED_KNOWLEDGE.gbm, retrievedAt: now };
  } else if (diagLower.includes('lung') || diagLower.includes('nsclc') || diagLower.includes('carcinoma') || args.organ === 'lung') {
    return { ...CURATED_KNOWLEDGE.nsclc, retrievedAt: now };
  } else if (diagLower.includes('pancrea') || args.organ === 'pancreas') {
    return { ...CURATED_KNOWLEDGE.pancreas, retrievedAt: now };
  } else if (diagLower.includes('breast') || diagLower.includes('ductal') || diagLower.includes('mammar') || args.organ === 'breast') {
    return { ...CURATED_KNOWLEDGE.breast, retrievedAt: now };
  } else if (diagLower.includes('kidney') || diagLower.includes('renal') || diagLower.includes('rcc') || args.organ === 'kidney') {
    return { ...CURATED_KNOWLEDGE.kidney, retrievedAt: now };
  } else if (diagLower.includes('melanoma') || diagLower.includes('skin') || args.organ === 'skin') {
    return { ...CURATED_KNOWLEDGE.skin, retrievedAt: now };
  } else if (diagLower.includes('liver') || diagLower.includes('hcc') || diagLower.includes('hepat') || args.organ === 'liver') {
    return { ...CURATED_KNOWLEDGE.liver, retrievedAt: now };
  } else if (diagLower.includes('colon') || diagLower.includes('colorectal') || diagLower.includes('bowel') || args.organ === 'colon') {
    return { ...CURATED_KNOWLEDGE.colon, retrievedAt: now };
  } else if (diagLower.includes('prostate') || diagLower.includes('psa') || args.organ === 'prostate') {
    return { ...CURATED_KNOWLEDGE.prostate, retrievedAt: now };
  }

  return { ...CURATED_KNOWLEDGE.gbm, retrievedAt: now };
}
