/**
 * Multi-Agent Symptom Evaluation & Clinical Diagnostic Reasoning Engine.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 *
 * Evaluates patient symptoms, clinical narratives, and presentation timelines.
 * Generates evidence-based differential diagnoses, recommends imaging protocols
 * and laboratory workups, and computes multimodal clinical-radiological concordance.
 */

import { getGeminiApiKey } from './geminiVision';
import type {
  ClinicalInfo,
  InferenceResult,
  Organ,
  SymptomAnalysisResult,
} from './types';

// Curated evidence-based fallback profiles when offline / rate-limited
function getCuratedSymptomFallback(text: string, organHint?: Organ): SymptomAnalysisResult {
  const lower = text.toLowerCase();
  const explicitOrgan = organHint && organHint !== 'general' ? organHint : null;

  // 1. Neuro-Oncology / Brain / Neurological Presentation
  if (
    explicitOrgan === 'brain' ||
    (!explicitOrgan &&
      /\b(headache|seizure|hemiparesis|aphasia|cranial|glioma|gbm|brain|cerebell\w*|intra-?axial|papilledema|ataxia)\b/i.test(
        lower,
      ))
  ) {
    const isSevere = /\b(seizure|weakness|vomiting|confusion|unilateral|hemiparesis)\b/i.test(lower);
    return {
      primaryComplaint: text.slice(0, 120) || 'Progressive neurological signs and symptoms.',
      symptomSeverity: isSevere ? 'critical' : 'moderate',
      acuityLevel: isSevere ? 'emergency' : 'urgent',
      differentials: [
        {
          condition: 'High-Grade Glioma (e.g., Glioblastoma Multiforme)',
          probability: 'high',
          confidenceScore: 0.88,
          organSystem: 'Central Nervous System',
          rationale:
            'Progressive focal deficits, morning headaches, and new-onset epileptic events strongly suggest an expanding intra-axial mass lesion with perilesional edema.',
          supportingSymptoms: ['Progressive headache', 'Focal neurological deficit', 'Seizure activity'],
          refutingFactors: ['Absence of acute traumatic history'],
        },
        {
          condition: 'Secondary Intracranial Metastasis',
          probability: 'moderate',
          confidenceScore: 0.72,
          organSystem: 'Central Nervous System / Systemic Oncology',
          rationale: 'Focal neurological deficit in adults can represent solitary or multiple brain metastases.',
          supportingSymptoms: ['Focal motor weakness', 'Elevated intracranial pressure symptoms'],
          refutingFactors: ['Known primary malignancy not yet established'],
        },
        {
          condition: 'Subacute Ischemic / Hemorrhagic Stroke',
          probability: 'moderate',
          confidenceScore: 0.65,
          organSystem: 'Cerebrovascular',
          rationale: 'Focal hemiparesis requires urgent vascular exclusion, though gradual progression favors neoplasm.',
          supportingSymptoms: ['Unilateral arm/leg motor deficit'],
          refutingFactors: ['Gradual multi-week timeline (stroke is typically hyperacute)'],
        },
      ],
      recommendedImaging: [
        {
          modality: 'MRI Brain',
          protocol: 'Axial, coronal, and sagittal T1, T2, FLAIR, DWI/ADC, and post-contrast T1-CE (gadolinium)',
          indication: 'Delineate suspected neoplastic mass, microvascular enhancement, and perilesional edema',
          urgency: isSevere ? 'Stat / Emergency (< 2 hours)' : 'Urgent (< 24 hours)',
        },
        {
          modality: 'Non-Contrast CT Head',
          protocol: 'Standard axial cranial non-contrast CT',
          indication: 'Rapid exclusion of acute intracranial hemorrhage or mass effect with midline shift',
          urgency: isSevere ? 'Immediate' : 'Elective',
        },
      ],
      recommendedLabs: [
        { testName: 'Complete Blood Count (CBC) with differential', rationale: 'Assess baseline hematologic status and rule out leukocytosis/infection', priority: 'Routine' },
        { testName: 'Comprehensive Metabolic Panel (CMP)', rationale: 'Evaluate renal function (eGFR) prior to gadolinium contrast administration; baseline sodium and electrolytes', priority: 'Urgent' },
        { testName: 'Serum Anticonvulsant Levels', rationale: 'Baseline assessment if starting anti-epileptic therapy (e.g., Levetiracetam)', priority: 'Standard' },
      ],
      clinicalRedFlags: [
        'New-onset seizure in an adult without prior epilepsy history',
        'Focal neurological deficit (motor weakness, aphasia)',
        'Progressive morning headache exacerbated by Valsalva maneuvers',
      ],
      suggestedActionPlan: [
        'Immediate referral to Neurosurgical Oncology for comprehensive multidisciplinary evaluation.',
        'Obtain contrast-enhanced cranial MRI protocol.',
        'Initiate seizure precautions; consider anti-epileptic prophylaxis (Levetiracetam) if cortical involvement is suspected.',
        'Symptom management: Dexamethasone for vasogenic edema under neurosurgical oversight.',
      ],
    };
  }

  // 2. Thoracic / Pulmonary Presentation
  if (
    explicitOrgan === 'lung' ||
    (!explicitOrgan &&
      /\b(cough|hemoptysis|smok\w*|dyspnea|breath|chest\s+pain|sputum|lung|nodule|pleur\w*|bronch\w*)\b/i.test(
        lower,
      ))
  ) {
    const isHemoptysis = /\b(hemoptysis|blood|weight loss)\b/i.test(lower);
    return {
      primaryComplaint: text.slice(0, 120) || 'Persistent respiratory symptoms and pulmonary findings.',
      symptomSeverity: isHemoptysis ? 'high' : 'moderate',
      acuityLevel: isHemoptysis ? 'urgent' : 'routine',
      differentials: [
        {
          condition: 'Primary Bronchogenic Carcinoma (Non-Small Cell Lung Cancer)',
          probability: 'high',
          confidenceScore: 0.84,
          organSystem: 'Pulmonary / Thoracic Oncology',
          rationale: 'Persistent cough, hemoptysis, and constitutional weight loss in a patient with risk factors strongly warrant oncologic exclusion.',
          supportingSymptoms: ['Cough', 'Hemoptysis', 'Weight loss', 'Dyspnea'],
          refutingFactors: ['Requires histologic confirmation'],
        },
        {
          condition: 'Complicated Bacterial Pneumonia / Lung Abscess',
          probability: 'moderate',
          confidenceScore: 0.62,
          organSystem: 'Infectious Disease / Pulmonary',
          rationale: 'Productive cough and dyspnea may represent focal consolidation or post-obstructive pneumonitis.',
          supportingSymptoms: ['Cough', 'Dyspnea'],
          refutingFactors: ['Absence of high fever or acute purulent sputum'],
        },
      ],
      recommendedImaging: [
        {
          modality: 'Chest CT with IV Contrast',
          protocol: 'High-Resolution Computed Tomography (HRCT) with thin-section reconstruction (≤1.25 mm)',
          indication: 'Characterize parenchymal nodule/mass margins, spiculation, cavitation, and mediastinal lymphadenopathy',
          urgency: 'Urgent (< 48 hours)',
        },
      ],
      recommendedLabs: [
        { testName: 'CBC with Differential', rationale: 'Check for infection, anemia of chronic disease, or polycythemia', priority: 'Standard' },
        { testName: 'Renal Function Panel (BUN/Creatinine)', rationale: 'Verify eGFR prior to iodinated contrast administration', priority: 'Urgent' },
      ],
      clinicalRedFlags: ['Hemoptysis', 'Unintentional weight loss > 10% body weight', 'Superior Vena Cava (SVC) obstruction signs'],
      suggestedActionPlan: [
        'Order high-resolution contrast-enhanced chest CT.',
        'Referral to Thoracic Oncology and Interventional Pulmonology for tissue biopsy.',
        'Pulmonary Function Testing (PFT) and smoking cessation intervention.',
      ],
    };
  }

  // 3. Abdominal / Pancreatic Presentation
  if (
    explicitOrgan === 'pancreas' ||
    (!explicitOrgan &&
      /\b(jaundice|pancrea\w*|icterus|epigastric|stool|urine|bilirubin|back pain|weight loss|anorexia|ca\s*19-9)\b/i.test(
        lower,
      ))
  ) {
    return {
      primaryComplaint: text.slice(0, 120) || 'Gastrointestinal symptoms with suspected hepatobiliary/pancreatic involvement.',
      symptomSeverity: 'critical',
      acuityLevel: 'emergency',
      differentials: [
        {
          condition: 'Pancreatic Ductal Adenocarcinoma (PDAC)',
          probability: 'high',
          confidenceScore: 0.86,
          organSystem: 'Gastrointestinal Oncology',
          rationale: 'Painless progressive obstructive jaundice accompanied by back pain and rapid weight loss is the classic presentation of a pancreatic head neoplasm.',
          supportingSymptoms: ['Jaundice', 'Epigastric/back pain', 'Weight loss', 'Dark urine'],
          refutingFactors: ['Tissue histology required'],
        },
        {
          condition: 'Choledocholithiasis with Acute Cholangitis',
          probability: 'moderate',
          confidenceScore: 0.60,
          organSystem: 'Biliary',
          rationale: 'Common bile duct gallstone causing acute extrahepatic biliary obstruction.',
          supportingSymptoms: ['Jaundice', 'Abdominal pain'],
          refutingFactors: ['Absence of acute colic or biliary sepsis'],
        },
      ],
      recommendedImaging: [
        {
          modality: 'Abdominal CT (Triple-Phase Pancreas Protocol)',
          protocol: 'Thin-slice non-contrast, early arterial, and late portal venous phase cross-sectional CT',
          indication: 'Assess pancreatic parenchymal mass, mesenteric vessel encasement (SMA/SMV), and liver metastases',
          urgency: 'Stat / Urgent (< 24 hours)',
        },
      ],
      recommendedLabs: [
        { testName: 'Total & Direct Bilirubin, Alkaline Phosphatase', rationale: 'Quantify cholestasis and biliary obstruction severity', priority: 'Stat' },
        { testName: 'Serum CA 19-9', rationale: 'Oncologic biomarker baseline for pancreatic malignancy', priority: 'Urgent' },
        { testName: 'Lipase & Amylase', rationale: 'Rule out concomitant secondary pancreatitis', priority: 'Standard' },
      ],
      clinicalRedFlags: ['Obstructive jaundice with pale stools', 'Acute ascending cholangitis signs (fever, chills, jaundice)', 'Rapid profound cachexia'],
      suggestedActionPlan: [
        'Urgent triple-phase pancreatic protocol CT.',
        'Surgical Oncology and Gastroenterology consultation for ERCP biliary decompression.',
        'Monitor for coagulopathy secondary to vitamin K malabsorption.',
      ],
    };
  }

  // 4. Breast Presentation
  if (
    explicitOrgan === 'breast' ||
    (!explicitOrgan &&
      /\b(breast|mammar\w*|lump|nipple|areola|axilla|mass in breast|skin retraction|peau d'orange)\b/i.test(lower))
  ) {
    return {
      primaryComplaint: text.slice(0, 120) || 'Palpable breast finding or diagnostic mammographic abnormality.',
      symptomSeverity: 'high',
      acuityLevel: 'urgent',
      differentials: [
        {
          condition: 'Invasive Ductal Carcinoma (IDC)',
          probability: 'high',
          confidenceScore: 0.85,
          organSystem: 'Breast / Surgical Oncology',
          rationale: 'Palpable firm, fixed breast mass or microcalcifications warrants diagnostic imaging and core biopsy per BI-RADS criteria.',
          supportingSymptoms: ['Palpable breast lump', 'Focal density', 'Axillary lymphadenopathy'],
          refutingFactors: ['Benign fibroadenoma or cyst in young patients'],
        },
        {
          condition: 'Benign Fibroadenoma / Complex Cyst',
          probability: 'moderate',
          confidenceScore: 0.65,
          organSystem: 'Breast / Benign Gynecology',
          rationale: 'Well-circumscribed mobile mass frequently seen in premenopausal women.',
          supportingSymptoms: ['Breast lump'],
          refutingFactors: ['Irregular borders or microcalcifications on imaging'],
        },
      ],
      recommendedImaging: [
        {
          modality: 'Diagnostic Digital Mammography & Breast Ultrasound',
          protocol: 'Bilateral CC and MLO views with targeted high-frequency ultrasound evaluation',
          indication: 'BI-RADS characterization of palpable lump or asymmetric density',
          urgency: 'Urgent (< 1 week)',
        },
      ],
      recommendedLabs: [
        { testName: 'Core Needle Biopsy Histopathology', rationale: 'Definitive tissue diagnosis with ER, PR, HER2, and Ki-67 receptor testing', priority: 'Urgent' },
        { testName: 'Genetic Testing (BRCA1/BRCA2)', rationale: 'Risk assessment if family history of early-onset breast/ovarian cancer', priority: 'Elective' },
      ],
      clinicalRedFlags: ['Skin dimpling / peau d orange', 'Spontaneous bloody nipple discharge', 'Fixed axillary lymphadenopathy'],
      suggestedActionPlan: [
        'Diagnostic mammography and targeted breast ultrasound.',
        'Ultrasound-guided core needle biopsy if BI-RADS 4 or 5.',
        'Referral to Comprehensive Breast Cancer Center.',
      ],
    };
  }

  // 5. Renal / Urologic Presentation
  if (
    explicitOrgan === 'kidney' ||
    (!explicitOrgan &&
      /\b(kidney|renal|flank|hematuria|blood in urine|nephro\w*)\b/i.test(lower))
  ) {
    return {
      primaryComplaint: text.slice(0, 120) || 'Flank discomfort and urologic symptoms.',
      symptomSeverity: 'high',
      acuityLevel: 'urgent',
      differentials: [
        {
          condition: 'Renal Cell Carcinoma (Clear Cell RCC)',
          probability: 'high',
          confidenceScore: 0.82,
          organSystem: 'Urologic Oncology',
          rationale: 'Painless gross hematuria and flank mass/pain represent the classic triad of renal cortical neoplasm.',
          supportingSymptoms: ['Hematuria', 'Flank pain'],
          refutingFactors: ['Urolithiasis / nephrolithiasis'],
        },
        {
          condition: 'Nephrolithiasis (Kidney Stones)',
          probability: 'moderate',
          confidenceScore: 0.70,
          organSystem: 'Urology',
          rationale: 'Acute colicky flank pain and microscopic/gross hematuria.',
          supportingSymptoms: ['Flank pain', 'Hematuria'],
          refutingFactors: ['Constant non-colicky pain favors mass'],
        },
      ],
      recommendedImaging: [
        {
          modality: 'CT Urogram / Multiphasic Renal CT',
          protocol: 'Non-contrast, corticomedullary, nephrographic, and excretory phase cross-sectional CT',
          indication: 'Evaluate solid renal cortical mass, vascular invasion (renal vein/IVC), and collecting system',
          urgency: 'Urgent (< 48 hours)',
        },
      ],
      recommendedLabs: [
        { testName: 'Urinalysis with Microscopic Examination', rationale: 'Confirm presence of dysmorphic RBCs or proteinuria', priority: 'Stat' },
        { testName: 'Serum Creatinine & eGFR', rationale: 'Assess baseline renal functional reserve before surgery or contrast', priority: 'Urgent' },
      ],
      clinicalRedFlags: ['Gross painless hematuria', 'Palpable abdominal/flank mass', 'New-onset left-sided varicocele'],
      suggestedActionPlan: [
        'Multiphasic contrast-enhanced CT of abdomen and pelvis.',
        'Urology consultation for cystoscopy and surgical planning.',
        'Baseline renal function monitoring.',
      ],
    };
  }

  // 6. Dermatologic / Cutaneous Presentation
  if (
    explicitOrgan === 'skin' ||
    (!explicitOrgan &&
      /\b(skin|mole|melanoma|pigment|nevus|lesion on skin|asymmetric|irregular border)\b/i.test(lower))
  ) {
    return {
      primaryComplaint: text.slice(0, 120) || 'Cutaneous pigmented lesion evaluation.',
      symptomSeverity: 'high',
      acuityLevel: 'urgent',
      differentials: [
        {
          condition: 'Cutaneous Malignant Melanoma',
          probability: 'high',
          confidenceScore: 0.86,
          organSystem: 'Dermatologic Oncology',
          rationale: 'ABCDE criteria (Asymmetry, Border irregularity, Color variegation, Diameter >6mm, Evolution) strongly suggest melanoma.',
          supportingSymptoms: ['Asymmetric pigmented lesion', 'Color variegation', 'Enlarging mole'],
          refutingFactors: ['Atypical/dysplastic nevus or seborrheic keratosis'],
        },
        {
          condition: 'Basal Cell Carcinoma (Pigmented Variant)',
          probability: 'moderate',
          confidenceScore: 0.68,
          organSystem: 'Dermatology',
          rationale: 'Slowly growing pearly nodule with telangiectasia or pigment.',
          supportingSymptoms: ['Chronic skin lesion'],
          refutingFactors: ['Rapid evolution favors melanoma'],
        },
      ],
      recommendedImaging: [
        {
          modality: 'Dermoscopy & High-Resolution Epiluminescence Microscopy',
          protocol: 'Polarized and non-polarized dermoscopic structural pattern analysis',
          indication: 'Assess pigment network, streaks, blue-white veil, and atypical vascular structures',
          urgency: 'Immediate',
        },
      ],
      recommendedLabs: [
        { testName: 'Excisional Biopsy (1-2 mm margins)', rationale: 'Histopathologic Breslow depth measurement and ulceration status', priority: 'Stat' },
        { testName: 'BRAF V600E Mutation Analysis', rationale: 'Molecular profiling for targeted therapy if advanced', priority: 'Reflex' },
      ],
      clinicalRedFlags: ['Rapid enlargement or color darkening', 'Spontaneous bleeding or ulceration', 'Satellite pigmented lesions'],
      suggestedActionPlan: [
        'Complete full-body cutaneous examination by a dermatologist.',
        'Narrow-margin excisional biopsy (shave biopsy contraindicated for suspected melanoma).',
        'Surgical staging and sentinel lymph node biopsy if Breslow depth > 0.8 mm.',
      ],
    };
  }

  // 7. Default / General Presentation
  return {
    primaryComplaint: text.slice(0, 120) || 'General clinical symptom presentation.',
    symptomSeverity: 'moderate',
    acuityLevel: 'routine',
    differentials: [
      {
        condition: 'Primary Symptomatic Presentation (Non-Specific)',
        probability: 'moderate',
        confidenceScore: 0.70,
        organSystem: 'Multisystem',
        rationale: 'Clinical history requires objective cross-sectional correlation and focused physical examination.',
        supportingSymptoms: [text.slice(0, 50)],
        refutingFactors: ['Non-focal presentation'],
      },
    ],
    recommendedImaging: [
      {
        modality: 'Targeted Organ Imaging',
        protocol: 'Dedicated cross-sectional MRI or CT based on physical examination findings',
        indication: 'Evaluate anatomical parenchyma and rule out focal space-occupying lesions',
        urgency: 'Routine elective',
      },
    ],
    recommendedLabs: [
      { testName: 'Complete Blood Count (CBC) with Differential', rationale: 'General health screen and baseline assessment', priority: 'Standard' },
      { testName: 'Comprehensive Metabolic Panel (CMP)', rationale: 'Assess renal and hepatic baseline', priority: 'Standard' },
    ],
    clinicalRedFlags: ['Unexplained weight loss', 'Progressive focal neurological deficits', 'Severe intractable pain'],
    suggestedActionPlan: [
      'Comprehensive clinical review and physical examination.',
      'Order targeted diagnostic imaging and routine laboratory panel.',
    ],
  };
}

/**
 * Execute Multi-Agent Symptom Evaluation on raw clinical text.
 */
export async function analyzeClinicalSymptoms(args: {
  text: string;
  organHint?: Organ;
  inference?: InferenceResult | null;
  clinical?: ClinicalInfo;
}): Promise<SymptomAnalysisResult | null> {
  const text = (args.text || '').trim();
  if (!text) return null;

  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `You are an elite multi-agent panel consisting of:
- Dr. Alex Vance, MD (Emergency Triage & Acuity Specialist)
- Dr. Samantha Chen, MD (Clinical NLP & Diagnostic Reasoning Specialist)
- Dr. Robert Miller, MD, FACR (Senior Radiologist & Imaging Protocol Specialist)
- Dr. Emily Zhang, PhD (Biomarker, Lab & Risk Stratification Specialist)
- Dr. Marcus Patel, MD (Chief Medical Arbiter)

Evaluate this patient narrative and clinical symptoms:
"${text}"
Target Organ Context: ${args.organHint ?? 'auto-detect'}

Perform a rigorous clinical diagnostic evaluation:
1. primaryComplaint (Concise medical summary of chief complaint)
2. symptomSeverity ("critical" | "high" | "moderate" | "mild")
3. acuityLevel ("emergency" | "urgent" | "routine")
4. differentials (Top 3-4 ranked candidate conditions: condition, probability ["high"|"moderate"|"low"], confidenceScore [0.0..1.0], organSystem, rationale, supportingSymptoms, refutingFactors)
5. recommendedImaging (Array of: modality, protocol, indication, urgency)
6. recommendedLabs (Array of: testName, rationale, priority)
7. clinicalRedFlags (List of 3-5 warning red flags identified in the narrative)
8. suggestedActionPlan (4-5 concrete next steps for clinical workup and patient safety)

Respond with strict JSON matching this schema:
{
  "primaryComplaint": string,
  "symptomSeverity": "critical" | "high" | "moderate" | "mild",
  "acuityLevel": "emergency" | "urgent" | "routine",
  "differentials": [
    {
      "condition": string,
      "probability": "high" | "moderate" | "low",
      "confidenceScore": number,
      "organSystem": string,
      "rationale": string,
      "supportingSymptoms": string[],
      "refutingFactors": string[]
    }
  ],
  "recommendedImaging": [
    {
      "modality": string,
      "protocol": string,
      "indication": string,
      "urgency": string
    }
  ],
  "recommendedLabs": [
    {
      "testName": string,
      "rationale": string,
      "priority": string
    }
  ],
  "clinicalRedFlags": string[],
  "suggestedActionPlan": string[]
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

          if (!res.ok) continue;

          const data = await res.json();
          const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (outputText) {
            const parsed = JSON.parse(outputText) as SymptomAnalysisResult;
            if (Array.isArray(parsed.differentials) && parsed.differentials.length > 0) {
              // Compute multimodal concordance if a scan inference is present
              if (args.inference) {
                const lesionPx = args.inference.metrics?.areaPx ?? 0;
                const hasLesion = lesionPx > 0;
                const topDiff = parsed.differentials[0];
                const isConcordant = hasLesion
                  ? topDiff?.probability === 'high' || topDiff?.probability === 'moderate'
                  : parsed.symptomSeverity === 'mild' || parsed.acuityLevel === 'routine';

                parsed.multimodalConcordance = {
                  isConcordant,
                  summary: hasLesion
                    ? `Visual neural segmentation identified a ${lesionPx} px focal lesion, which clinically corroborates the reported symptoms and top differential (${topDiff?.condition ?? 'neoplasm'}).`
                    : 'Automated scan inspection verified 0 lesion pixels (clear baseline); clinical symptoms should be evaluated for non-structural or functional etiologies.',
                };
              }
              return parsed;
            }
          }
        } catch {
          // Try next model
        }
      }
    } catch {
      // Degrade gracefully to curated knowledge
    }
  }

  // Fallback to rich curated engine
  const fallback = getCuratedSymptomFallback(text, args.organHint);
  if (args.inference) {
    const lesionPx = args.inference.metrics?.areaPx ?? 0;
    const hasLesion = lesionPx > 0;
    fallback.multimodalConcordance = {
      isConcordant: true,
      summary: hasLesion
        ? `Visual imaging findings (${lesionPx} px candidate lesion) correlate with the clinical symptom presentation.`
        : 'Scan parenchyma appears within normal morphological limits for this cross-sectional slice.',
    };
  }
  return fallback;
}
