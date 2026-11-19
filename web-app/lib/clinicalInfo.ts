/**
 * Clinical information extraction — rule-based first, optional LLM second.
 *
 * RESEARCH PROTOTYPE ONLY — NOT APPROVED FOR CLINICAL DIAGNOSIS.
 * The rule engine is intentionally simple keyword/regex NLP: transparent,
 * dependency-free, and easy for students to extend. The optional LLM pass
 * (LLM_API_KEY + LLM_BASE_URL, OpenAI-compatible) merges additional fields and
 * always falls back safely to rules-only output on any failure.
 */
import {
  EMPTY_CLINICAL_INFO,
  type ClinicalInfo,
  type Modality,
  type Organ,
} from './types';
import { errorMessage, fetchWithTimeout } from './utils';

// ---------------------------------------------------------------------------
// Rule dictionaries
// ---------------------------------------------------------------------------

const ORGAN_RULES: Array<{ organ: Organ; pattern: RegExp }> = [
  { organ: 'brain', pattern: /\b(brain|cerebr\w*|cranial|intracranial|glioma|meningioma|glioblastoma|neuro\w*|temporal\s+lobe|frontal\s+lobe|parietal\s+lobe|occipital\s+lobe|cerebellum)\b/i },
  { organ: 'lung', pattern: /\b(lung|pulmonar\w*|bronch\w*|chest\s+(?:ct|mri|x-?ray)?|thoracic|pleural|hemoptysis)\b/i },
  { organ: 'pancreas', pattern: /\b(pancrea\w*|panc\b|ductal\s+adenocarcinoma|whipple)\b/i },
  { organ: 'breast', pattern: /\b(breast|mammar\w*|mammogram|ductal|lobular|nipple|areola|axillary)\b/i },
  { organ: 'liver', pattern: /\b(liver|hepat\w*|hcc|hepatic|portal\s+vein|cirrhosis)\b/i },
  { organ: 'kidney', pattern: /\b(kidney|renal|rcc|nephr\w*|flank)\b/i },
  { organ: 'skin', pattern: /\b(skin|derma\w*|melanoma|cutaneous|mole|epiderm\w*)\b/i },
  { organ: 'colon', pattern: /\b(colon|colorectal|rectal|bowel|polyps?)\b/i },
  { organ: 'prostate', pattern: /\b(prostate|psa|prostatic)\b/i },
];

const MODALITY_RULES: Array<{ modality: Modality; pattern: RegExp }> = [
  { modality: 'MRI', pattern: /\b(mri|m\.r\.i|magnetic resonance|flair|t1[- ]?weighted|t2[- ]?weighted|dwi|diffusion[- ]weighted|mr\s+angiography)\b/i },
  { modality: 'CT', pattern: /\b(ct|c\.t|computed tomography|cat\s+scan|helical\s+ct|hounsfield)\b/i },
  { modality: 'PET', pattern: /\b(pet|pet-?ct|fdg)\b/i },
  { modality: 'XRAY', pattern: /\b(x-?ray|radiograph|radiography|chest\s+x-?ray|plain\s+film|cxr)\b/i },
  { modality: 'MAMMOGRAM', pattern: /\b(mammogram|mammography|tomosynthesis)\b/i },
  { modality: 'ULTRASOUND', pattern: /\b(ultrasound|sonogram|sonography|echogram|usg)\b/i },
  { modality: 'DERMOSCOPY', pattern: /\b(dermoscopy|dermatoscopy)\b/i },
];

const SYMPTOMS: string[] = [
  'headache', 'seizure', 'convulsion', 'hemiparesis', 'weakness', 'numbness',
  'aphasia', 'speech difficulty', 'vision loss', 'blurred vision', 'dizziness',
  'nausea', 'vomiting', 'memory loss', 'confusion', 'syncope', 'ataxia',
  'cough', 'hemoptysis', 'dyspnea', 'shortness of breath', 'chest pain',
  'wheezing', 'hoarseness', 'weight loss', 'night sweats', 'fatigue',
  'abdominal pain', 'back pain', 'jaundice', 'steatorrhea', 'pale stool',
  'dark urine', 'loss of appetite', 'early satiety', 'indigestion', 'dyspepsia',
  'palpable mass', 'breast lump', 'nipple discharge', 'skin retraction',
  'hematuria', 'blood in urine', 'flank pain', 'frequent urination',
  'rectal bleeding', 'melena', 'change in bowel habits', 'constipation',
  'pigmented lesion', 'enlarging mole', 'irregular border', 'pruritus',
];

export const TARGET_NEOPLASM_FINDINGS: string[] = [
  'enhancing lesion', 'ring enhancement', 'spiculated', 'solid mass',
  'mass', 'lesion', 'nodule', 'tumor', 'tumour', 'neoplasm', 'malignancy',
  'metastasis', 'metastases', 'adenocarcinoma', 'carcinoma', 'glioma',
  'glioblastoma',
];

export const SECONDARY_FINDINGS: string[] = [
  'edema', 'oedema', 'midline shift', 'mass effect', 'necrosis',
  'lymphadenopathy', 'irregular margins',
];

export const BENIGN_INCIDENTAL_FINDINGS: string[] = [
  'calcification', 'pleural effusion', 'cystic',
  'hypodense', 'hyperdense', 'hyperintense', 'hypointense',
];

const FINDINGS: string[] = [
  ...TARGET_NEOPLASM_FINDINGS,
  ...SECONDARY_FINDINGS,
  ...BENIGN_INCIDENTAL_FINDINGS,
];

const CONDITION_HINTS: string[] = [
  'pancreatic ductal adenocarcinoma', 'pancreatic adenocarcinoma',
  'glioblastoma multiforme', 'glioblastoma', 'high-grade glioma', 'glioma',
  'meningioma', 'astrocytoma', 'metastatic disease',
  'primary lung cancer', 'adenocarcinoma', 'small cell', 'non-small cell',
  'neuroendocrine tumor', 'ipmn',
  'suspected neoplasm', 'suspicious for malignancy',
];

function collectMatchesWithNegation(
  text: string,
  terms: string[],
): { affirmed: string[]; negated: string[] } {
  const affirmed = new Set<string>();
  const negated = new Set<string>();

  // Cues that negate a subsequent finding in the same clause (supports long clauses & multi-term lists)
  // NOTE: "rule out" is an indication, NOT a negation; only "rules out" / "ruled out" are negations.
  const preNegationRe =
    /\b(?:neither|nor|no|not|without|denies|denied|denying|negative\s+for|rules\s+out|ruled\s+out|rule[d]?\s*[-]\s*out|free\s+of|free\s+from|clear\s+of|clear\s+for|unremarkable\s+for|absence\s+of|no\s+sign[s]?\s+of|no\s+evidence\s+of|without\s+evidence\s+of|with\s+no\s+evidence\s+of|without\s+any|free\s+of\s+any|no\s+focal|no\s+definite|no\s+abnormal|no\s+suspicious|no\s+discrete|no\s+obvious|no\s+gross|no\s+significant|no\s+visible|no\s+apparent|no\s+measurable|no\s+distinct|negative\s+(?:study|scan|imaging|mri|ct|cxr|radiograph|workup)?\s*(?:for|with\s+respect\s+to)|cleared\s+of|resolved|zero|devoid\s+of|fails?\s+to\s+(?:show|reveal|demonstrate)|shows?\s+no|reveals?\s+no|demonstrates?\s+no|unlikely|non-?suspicious|benign|vascular|physiological|physiologic)\b/i;

  // Phrases that express active suspicion (e.g., "cannot rule out", "unable to exclude")
  // These indicate a suspicious finding that MUST be treated as affirmed.
  const activeSuspicionRe =
    /\b(?:cannot|can\s+not|unable\s+to|hard\s+to|difficult\s+to|not)\s+(?:rule\s+out|exclude)\b/i;

  // Cues that negate an antecedent finding in the same clause (excludes temporal "not seen on prior" phrases)
  const postNegationRe =
    /(?:\b(?:is\s+ruled\s+out|was\s+ruled\s+out|not\s+seen(?!\s+(?:previously|on\s+prior|on\s+previous|on\s+earlier|before))|not\s+identified(?!\s+(?:previously|on\s+prior|on\s+previous|on\s+earlier|before))|not\s+detected(?!\s+(?:previously|on\s+prior|on\s+previous|on\s+earlier|before))|not\s+visualized(?!\s+(?:previously|on\s+prior|on\s+previous|on\s+earlier|before))|not\s+found|not\s+noted|not\s+observed|not\s+demonstrated|(?:is|was|are|were)?\s+not\s+present|is\s+absent|was\s+absent|are\s+absent|were\s+absent|is\s+negative|was\s+negative|are\s+negative|were\s+negative|within\s+normal\s+limits|wnl|unremarkable|is\s+excluded|was\s+excluded|are\s+excluded|were\s+excluded|is\s+disproved|was\s+disproved|\bnone\b|\bzero\b|(?:has|is|was|completely)?\s*resolved\b|as\s+expected\b|expected\s+signal\b)|[-:]\s*(?:none(?:\s+seen|\s+detected)?|zero|negative|absent|unremarkable|normal|wnl|not\s+(?:seen|detected|identified|found|noted|observed))\b)/i;

  // Clauses split by major sentence delimiters or contrasting conjunctions
  const clauseDelimRe =
    /[.;!?\n]|\b(?:but|however|although|though|yet|despite|nevertheless|nonetheless|whereas|while|except(?:\s+for)?|apart\s+from|aside\s+from|save\s+for|other\s+than)\b/i;

  // Sort terms by length descending so longer composite terms (e.g. 'enhancing lesion') are tested first
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);

  for (const term of sortedTerms) {
    const termRe = new RegExp(
      `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w{0,2}\\b`,
      'gi',
    );
    let match: RegExpExecArray | null;
    let foundAffirmed = false;
    let foundNegated = false;

    while ((match = termRe.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      // Extract clause preceding the term (look back up to 350 characters within clause)
      const windowStart = Math.max(0, matchStart - 350);
      const preSlice = text.slice(windowStart, matchStart);
      const preClauses = preSlice.split(clauseDelimRe);
      const immediatePre = preClauses[preClauses.length - 1];

      // Extract clause following the term (look forward up to 150 characters within clause)
      const windowEnd = Math.min(text.length, matchEnd + 150);
      const postSlice = text.slice(matchEnd, windowEnd);
      const postClauses = postSlice.split(clauseDelimRe);
      const immediatePost = postClauses[0];

      // Affirmative comma phrases (e.g., "Mass identified, not seen previously") must not be negated
      const isAffirmedAffirmative =
        /\b(?:identified|detected|demonstrated|seen|revealed)\s*,\s*$/i.test(immediatePre) ||
        /^\s*(?:identified|detected|demonstrated|seen|revealed)\s*,\s*not\s+(?:seen|identified|detected)\s+(?:previously|on\s+prior)/i.test(immediatePost);

      const isActiveSuspicion = activeSuspicionRe.test(immediatePre);
      const isRuleOutIndication = !isActiveSuspicion && /\b(?:rule\s+out|r\/o)\b/i.test(immediatePre);

      if (isRuleOutIndication) {
        // Clinical question/ordering indication: neither confirmed finding nor proven absence
        continue;
      }

      const isNegated =
        !isActiveSuspicion &&
        (preNegationRe.test(immediatePre) || postNegationRe.test(immediatePost)) &&
        !isAffirmedAffirmative;

      if (isNegated) {
        foundNegated = true;
      } else {
        foundAffirmed = true;
      }
    }

    if (foundAffirmed) {
      affirmed.add(term);
    } else if (foundNegated) {
      negated.add(term);
    }
  }

  return {
    affirmed: Array.from(affirmed),
    negated: Array.from(negated),
  };
}

function firstSentenceContaining(text: string, re: RegExp): string | undefined {
  const sentences = text.split(/(?<=[.;!?\n])\s+/);
  for (const s of sentences) {
    if (re.test(s)) return s.trim().slice(0, 220);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Rule-based extractor
// ---------------------------------------------------------------------------

function hasAffirmedNormalStudyCue(text: string): boolean {
  if (
    /\b(?:not\s+normal|not\s+unremarkable|not\s+within\s+normal\s+limits|outside\s+normal\s+limits|abnormal\s+findings?|grossly\s+abnormal|pathologic\s+enhancement)\b/i.test(
      text,
    )
  ) {
    return false;
  }

  const normalStudyRe =
    /\b(?:normal\s+study|normal\s+scan|healthy\s+control|control\s+scan|control\s+study|clear\s+study|clear\s+scan|unremarkable\s+study|routine\s+screening|negative\s+for\s+(?:malignancy|neoplasm|tumor|mass)|study\s+is\s+negative|negative\s+study|no\s+acute\s+(?:intracranial\s+)?abnormality|clear\s+lung\s+fields|clear\s+lungs|no\s+focal\s+mass|no\s+mass\s+identified|no\s+nodule\s+identified|no\s+suspicious\s+lesion|within\s+normal\s+limits|\bwnl\b|unremarkable|normal)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = normalStudyRe.exec(text)) !== null) {
    const startIdx = match.index;
    const windowStart = Math.max(0, startIdx - 80);
    const preSlice = text.slice(windowStart, startIdx);
    const preClauses = preSlice.split(
      /[.;!?\n]|\b(?:but|however|although|though|yet|despite|nevertheless|nonetheless|whereas|while|except(?:\s+for)?|apart\s+from|aside\s+from|save\s+for|other\s+than)\b/i,
    );
    const immediatePre = preClauses[preClauses.length - 1];

    const isNegated =
      /\b(?:not|neither|no|never|unlikely|hardly|outside|non-?|fails?\s+to\s+be)\s*$/i.test(
        immediatePre.trim(),
      );
    if (!isNegated) {
      return true;
    }
  }
  return false;
}

export function extractClinicalInfoWithRules(text: string): ClinicalInfo {
  if (!text || !text.trim()) {
    return {
      organsMentioned: [],
      modalitiesMentioned: [],
      symptoms: [],
      findings: [],
      negatedFindings: [],
      isNormalOrNegative: false,
      suspectedConditions: [],
      evidenceSnippets: [],
      extractionMethod: 'none',
    };
  }

  const info: ClinicalInfo = {
    organsMentioned: [],
    modalitiesMentioned: [],
    symptoms: [],
    findings: [],
    negatedFindings: [],
    isNormalOrNegative: false,
    suspectedConditions: [],
    evidenceSnippets: [],
    extractionMethod: 'rules',
  };

  const detectedOrgans: Array<{ organ: Organ; index: number; snippet?: string }> = [];
  for (const { organ, pattern } of ORGAN_RULES) {
    const match = pattern.exec(text);
    if (match) {
      const snippet = firstSentenceContaining(text, pattern);
      detectedOrgans.push({ organ, index: match.index, snippet });
    }
  }
  // Sort organs by chronological appearance in narrative to resolve multi-organ ambiguity
  detectedOrgans.sort((a, b) => a.index - b.index);
  for (const d of detectedOrgans) {
    info.organsMentioned.push(d.organ);
    if (d.snippet && !info.evidenceSnippets.includes(d.snippet)) {
      info.evidenceSnippets.push(d.snippet);
    }
  }
  for (const { modality, pattern } of MODALITY_RULES) {
    if (modality !== 'PET' && pattern.test(text)) info.modalitiesMentioned.push(modality);
    else if (modality === 'PET' && pattern.test(text) && !info.modalitiesMentioned.includes('PET')) {
      // PET is context only; recorded but routing treats it as unknown modality.
    }
  }

  const symptomsMatch = collectMatchesWithNegation(text, SYMPTOMS);
  info.symptoms = symptomsMatch.affirmed;

  const findingsMatch = collectMatchesWithNegation(text, FINDINGS);
  info.findings = findingsMatch.affirmed;
  info.negatedFindings = findingsMatch.negated;

  const conditionsMatch = collectMatchesWithNegation(text, CONDITION_HINTS);
  info.suspectedConditions = conditionsMatch.affirmed;

  const hasNormalCue = hasAffirmedNormalStudyCue(text);
  const hasAffirmedNeoplasm =
    info.findings.some((f) => TARGET_NEOPLASM_FINDINGS.includes(f.toLowerCase())) ||
    info.suspectedConditions.length > 0;

  const hasNegatedTarget = info.negatedFindings.some((f) =>
    TARGET_NEOPLASM_FINDINGS.includes(f.toLowerCase()),
  );

  info.isNormalOrNegative =
    !hasAffirmedNeoplasm && (hasNormalCue || hasNegatedTarget);

  const lat = text.match(/\b(left|right|bilateral)\b/i);
  if (lat) info.laterality = lat[1].toLowerCase() as ClinicalInfo['laterality'];

  const age =
    text.match(/\b(\d{1,3})\s?[- ]?\s?(?:years?|yrs?|y\.?o\.?|yo)\b/i) ??
    text.match(/\bage[:\s]+(\d{1,3})\b/i);
  if (age) {
    const n = Number(age[1]);
    if (n >= 0 && n <= 120) info.patientAgeYears = n;
  }

  if (/\b(male|man|gentleman)\b/i.test(text)) info.patientSex = 'male';
  else if (/\b(female|woman)\b/i.test(text)) info.patientSex = 'female';

  info.evidenceSnippets = info.evidenceSnippets.slice(0, 5);
  return info;
}

// ---------------------------------------------------------------------------
// Optional LLM extraction (OpenAI-compatible chat completions)
// ---------------------------------------------------------------------------

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export async function extractClinicalInfo(
  text: string,
): Promise<ClinicalInfo> {
  const rules = extractClinicalInfoWithRules(text);
  const apiKey = process.env.LLM_API_KEY?.trim();
  const baseUrl = process.env.LLM_BASE_URL?.trim()?.replace(/\/+$/, '');
  if (!apiKey || !baseUrl || !text.trim()) return rules;

  try {
    const model = process.env.MODEL_NAME?.trim() || 'gpt-4o-mini';
    const system = [
      'You are an information-extraction assistant for a RESEARCH prototype.',
      'From the clinical text, return STRICT JSON with keys:',
      '{"organs":["brain"|"lung"|"pancreas"...],"modalities":["MRI"|"CT"|"PET"...],',
      '"symptoms":[string...],"findings":[string...],"negatedFindings":[string...],',
      '"isNormalOrNegative":boolean,"laterality":"left"|"right"|"bilateral"|null,',
      '"patientAgeYears":number|null,"patientSex":"male"|"female"|null,"suspectedConditions":[string...]}',
      'CRITICAL: If a finding is absent, ruled out, or negated (e.g. "no mass", "no edema"), place it in "negatedFindings", NEVER in "findings".',
      'Set "isNormalOrNegative" to true if the study shows normal anatomy or no acute/neoplastic lesions.',
      'Only include values explicitly supported by the text. No commentary.',
      'Never invent diagnoses. This system is not approved for clinical diagnosis.',
    ].join(' ');
    const res = await fetchWithTimeout(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text.slice(0, 8000) },
          ],
        }),
      },
      15000,
    );
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = (await res.json()) as ChatCompletionResponse;
    const raw = data.choices?.[0]?.message?.content ?? '';
    const jsonText = raw.replace(/^```(?:json)?/m, '').replace(/```$/m, '').trim();
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    // Union-merge LLM output over rules (arrays deduped, casing normalized).
    const asOrgan = (v: unknown) =>
      typeof v === 'string' && ['brain', 'lung', 'pancreas'].includes(v)
        ? (v as Organ)
        : null;
    const asModality = (v: unknown) =>
      typeof v === 'string' && ['MRI', 'CT', 'PET'].includes(v.toUpperCase())
        ? ((v.toUpperCase()) as Modality)
        : null;

    const merged: ClinicalInfo = { ...rules, extractionMethod: 'llm+rules' };
    const llmOrgans = Array.isArray(parsed.organs)
      ? parsed.organs.map(asOrgan).filter(Boolean) as Organ[]
      : [];
    const llmModalities = Array.isArray(parsed.modalities)
      ? parsed.modalities.map(asModality).filter(Boolean) as Modality[]
      : [];
    merged.organsMentioned = Array.from(new Set([...rules.organsMentioned, ...llmOrgans]));
    merged.modalitiesMentioned = Array.from(new Set([...rules.modalitiesMentioned, ...llmModalities]));
    const strArr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 20) : [];
    merged.symptoms = Array.from(new Set([...rules.symptoms, ...strArr(parsed.symptoms)]));
    merged.findings = Array.from(new Set([...rules.findings, ...strArr(parsed.findings)]));
    merged.negatedFindings = Array.from(new Set([...rules.negatedFindings, ...strArr(parsed.negatedFindings)]));
    if (typeof parsed.isNormalOrNegative === 'boolean') {
      merged.isNormalOrNegative = parsed.isNormalOrNegative;
    }
    merged.suspectedConditions = Array.from(
      new Set([...rules.suspectedConditions, ...strArr(parsed.suspectedConditions)]),
    );
    if (parsed.laterality === 'left' || parsed.laterality === 'right' || parsed.laterality === 'bilateral') {
      merged.laterality = parsed.laterality;
    }
    if (typeof parsed.patientAgeYears === 'number' && parsed.patientAgeYears >= 0 && parsed.patientAgeYears <= 120) {
      merged.patientAgeYears = parsed.patientAgeYears;
    }
    if (parsed.patientSex === 'male' || parsed.patientSex === 'female') {
      merged.patientSex = parsed.patientSex;
    }
    return merged;
  } catch (err) {
    // Graceful degradation: rules output stands, failure noted in method label.
    console.warn('[clinicalInfo] LLM extraction failed, using rules:', errorMessage(err));
    return rules;
  }
}
