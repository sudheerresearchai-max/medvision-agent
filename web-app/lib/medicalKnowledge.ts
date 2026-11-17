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

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
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
          signal: AbortSignal.timeout(12000),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as Omit<ClinicalKnowledgeBrief, 'retrievedAt'>;
          if (parsed.condition && parsed.commonSymptoms && parsed.clinicalSideEffects) {
            return {
              ...parsed,
              retrievedAt: now,
            };
          }
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
  }

  return { ...CURATED_KNOWLEDGE.gbm, retrievedAt: now };
}
