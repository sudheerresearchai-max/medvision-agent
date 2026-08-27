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
  { organ: 'brain', pattern: /\b(brain|cerebr\w*|cranial|intracranial|glioma|meningioma|glioblastoma)\b/i },
  { organ: 'lung', pattern: /\b(lung|pulmonar\w*|bronch\w*|chest\s+(?:ct|mri|x-?ray)?|thoracic|nodule[s]?\b)/i },
  { organ: 'pancreas', pattern: /\bpancrea\w*\b/i },
];

const MODALITY_RULES: Array<{ modality: Modality; pattern: RegExp }> = [
  { modality: 'MRI', pattern: /\b(mri|m\.r\.i|magnetic resonance|flair|t1[- ]?weighted|t2[- ]?weighted|dwi|diffusion[- ]weighted|mr\s+angiography)\b/i },
  { modality: 'CT', pattern: /\b(ct|c\.t|computed tomography|cat\s+scan|helical\s+ct|hounsfield)\b/i },
  { modality: 'PET', pattern: /\b(pet|pet-?ct|fdg)\b/i },
];

const SYMPTOMS: string[] = [
  'headache', 'seizure', 'convulsion', 'hemiparesis', 'weakness', 'numbness',
  'aphasia', 'speech difficulty', 'vision loss', 'blurred vision', 'dizziness',
  'nausea', 'vomiting', 'memory loss', 'confusion',
  'cough', 'hemoptysis', 'dyspnea', 'shortness of breath', 'chest pain',
  'wheezing', 'hoarseness', 'weight loss', 'night sweats', 'fatigue',
  'abdominal pain', 'back pain', 'jaundice', 'steatorrhea', 'pale stool',
  'dark urine', 'loss of appetite', 'early satiety', 'indigestion',
];

const FINDINGS: string[] = [
  'mass', 'lesion', 'nodule', 'tumor', 'tumour', 'neoplasm', 'malignancy',
  'metastasis', 'metastases', 'edema', 'oedema', 'midline shift', 'mass effect',
  'enhancing lesion', 'ring enhancement', 'spiculated', 'irregular margins',
  'hypodense', 'hyperdense', 'hyperintense', 'hypointense', 'necrosis',
  'calcification', 'lymphadenopathy', 'pleural effusion', 'cystic', 'solid mass',
];

const CONDITION_HINTS: string[] = [
  'glioma', 'glioblastoma', 'meningioma', 'astrocytoma', 'metastatic disease',
  'primary lung cancer', 'adenocarcinoma', 'small cell', 'non-small cell',
  'pancreatic adenocarcinoma', 'neuroendocrine tumor', 'ipmn',
  'suspected neoplasm', 'suspicious for malignancy',
];

function collectMatches(text: string, terms: string[]): string[] {
  const hits = new Set<string>();
  for (const term of terms) {
    // word-boundary-ish containment, tolerant of plural/suffix variation
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w{0,2}\\b`, 'i');
    if (re.test(text)) hits.add(term);
  }
  // Array.from avoids TS2802: spread of Set requires es2015+ target in the emit path.
  return Array.from(hits);
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

export function extractClinicalInfoWithRules(text: string): ClinicalInfo {
  if (!text || !text.trim()) return { ...EMPTY_CLINICAL_INFO };

  const info: ClinicalInfo = { ...EMPTY_CLINICAL_INFO, extractionMethod: 'rules' };

  for (const { organ, pattern } of ORGAN_RULES) {
    if (pattern.test(text)) {
      info.organsMentioned.push(organ);
      const snippet = firstSentenceContaining(text, pattern);
      if (snippet) info.evidenceSnippets.push(snippet);
    }
  }
  for (const { modality, pattern } of MODALITY_RULES) {
    if (modality !== 'PET' && pattern.test(text)) info.modalitiesMentioned.push(modality);
    else if (modality === 'PET' && pattern.test(text) && !info.modalitiesMentioned.includes('PET')) {
      // PET is context only; recorded but routing treats it as unknown modality.
    }
  }

  info.symptoms = collectMatches(text, SYMPTOMS);
  info.findings = collectMatches(text, FINDINGS);
  info.suspectedConditions = collectMatches(text, CONDITION_HINTS);

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
      '"symptoms":[string...],"findings":[string...],"laterality":"left"|"right"|"bilateral"|null,',
      '"patientAgeYears":number|null,"patientSex":"male"|"female"|null,"suspectedConditions":[string...]}',
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
