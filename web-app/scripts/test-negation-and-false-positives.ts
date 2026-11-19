/**
 * Comprehensive verification suite for MedVision False-Positive Elimination:
 * 1. Medical Negation & Clinical NLP verification (NegEx engine)
 * 2. Scan Image & Mock Inference True-Positive vs True-Negative verification
 * 3. End-to-end Agent Pipeline Execution (Positive Tumor vs Normal Control)
 * 4. Multi-Agent Reasoning Consensus & RECIST 1.1 metric verification
 */

import { extractClinicalInfoWithRules } from '../lib/clinicalInfo';
import { generateMockPrediction } from '../lib/mockInference';
import { runAnalysis } from '../lib/agent';
import { SAMPLE_CASES } from '../lib/sampleCases';
import { normalizeBoundingBox, getImageDimensions, isGeminiVisionConfigured } from '../lib/geminiVision';
import { analyzeClinicalSymptoms } from '../lib/symptomAnalyzer';
import { fetchMedicalKnowledge } from '../lib/medicalKnowledge';
import { extractJsonFromText } from '../lib/utils';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`${GREEN}  ✓ PASS:${RESET} ${testName}`);
    passed++;
  } else {
    console.error(`${RED}  ✗ FAIL:${RESET} ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runAllTests() {
  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`${BOLD}MedVision Agent — Deep Verification: Zero False-Positive Suite${RESET}`);
  console.log(`${BOLD}================================================================${RESET}\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 1: Clinical NLP & Negation Detection
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`${CYAN}${BOLD}[Suite 1] Clinical NLP Negation & Normal Study Detection${RESET}`);

  const normalClinicalText = `
    Patient is a 42-year-old female presenting for routine wellness checkup.
    Patient denies headache, seizures, focal weakness, numbness, or vomiting.
    Axial T1-CE brain MRI demonstrates symmetric cerebral hemispheres with normal parenchyma.
    No mass effect, no midline shift, no intracranial lesion, no edema, and no abnormal enhancement identified.
    Ventricles are within normal limits. The scan is unremarkable and negative for malignancy.
  `;

  const normalInfo = extractClinicalInfoWithRules(normalClinicalText);

  assert(normalInfo.organsMentioned.includes('brain'), 'Normal case: Identifies organ (brain)');
  assert(normalInfo.modalitiesMentioned.includes('MRI'), 'Normal case: Identifies modality (MRI)');
  assert(normalInfo.findings.length === 0, `Normal case: ZERO affirmed findings (got: [${normalInfo.findings.join(', ')}])`);
  assert(normalInfo.negatedFindings.includes('mass'), 'Normal case: "no mass" detected in negatedFindings');
  assert(normalInfo.negatedFindings.includes('lesion'), 'Normal case: "no intracranial lesion" detected in negatedFindings');
  assert(normalInfo.negatedFindings.includes('edema'), 'Normal case: "no edema" detected in negatedFindings');
  assert(normalInfo.symptoms.length === 0, `Normal case: Denied symptoms excluded from symptoms list (got: [${normalInfo.symptoms.join(', ')}])`);
  assert(normalInfo.isNormalOrNegative === true, 'Normal case: isNormalOrNegative correctly flagged as TRUE');

  const positiveClinicalText = `
    58-year-old male with new-onset seizures and morning nausea.
    MRI brain reveals a 3.5 cm ring-enhancing mass in right temporal lobe with severe perilesional edema and 5 mm midline shift.
    High-grade glioma suspected.
  `;

  const positiveInfo = extractClinicalInfoWithRules(positiveClinicalText);
  assert(positiveInfo.findings.includes('mass'), 'Positive case: "mass" detected in affirmative findings');
  assert(positiveInfo.findings.includes('edema'), 'Positive case: "edema" detected in affirmative findings');
  assert(positiveInfo.findings.includes('midline shift'), 'Positive case: "midline shift" detected in affirmative findings');
  assert(positiveInfo.suspectedConditions.includes('glioma'), 'Positive case: "glioma" identified in suspected conditions');
  assert(positiveInfo.isNormalOrNegative === false, 'Positive case: isNormalOrNegative correctly flagged as FALSE');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 2: Mock Inference Lesion vs Clean Scan Discrimination
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 2] Mock Inference True Positive vs True Negative${RESET}`);

  const brainTumorCase = SAMPLE_CASES.find((c) => c.id === 'case-demo-brain-01')!;
  const brainNormalCase = SAMPLE_CASES.find((c) => c.id === 'case-demo-brain-normal-04')!;
  const lungTumorCase = SAMPLE_CASES.find((c) => c.id === 'case-demo-lung-02')!;
  const lungNormalCase = SAMPLE_CASES.find((c) => c.id === 'case-demo-lung-normal-05')!;
  const pancreasTumorCase = SAMPLE_CASES.find((c) => c.id === 'case-demo-pancreas-03')!;
  const pancreasNormalCase = SAMPLE_CASES.find((c) => c.id === 'case-demo-pancreas-normal-06')!;

  function dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1];
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  // 2A: Brain Tumor vs Brain Normal
  const brainTumorBytes = dataUrlToBytes(brainTumorCase.imageDataUrl);
  const brainTumorPred = generateMockPrediction('brain', brainTumorBytes, {
    fileName: brainTumorCase.fileName,
    clinical: extractClinicalInfoWithRules(brainTumorCase.clinicalNotes),
  });
  assert(brainTumorPred.metrics.areaPx > 500, `Brain tumor case: Segments lesion (area=${brainTumorPred.metrics.areaPx} px)`);
  assert(brainTumorPred.confidence > 0.5, `Brain tumor case: High confidence (conf=${brainTumorPred.confidence})`);

  const brainNormalBytes = dataUrlToBytes(brainNormalCase.imageDataUrl);
  const brainNormalPred = generateMockPrediction('brain', brainNormalBytes, {
    fileName: brainNormalCase.fileName,
    clinical: extractClinicalInfoWithRules(brainNormalCase.clinicalNotes),
  });
  assert(brainNormalPred.metrics.areaPx === 0, `Brain normal control: ZERO false positive lesion pixels (area=${brainNormalPred.metrics.areaPx})`);
  assert(brainNormalPred.metrics.bbox === null, 'Brain normal control: Bounding box is null');
  assert(brainNormalPred.confidence === 0.0, `Brain normal control: Confidence is 0.0 (conf=${brainNormalPred.confidence})`);

  // 2B: Lung Tumor vs Lung Normal
  const lungTumorBytes = dataUrlToBytes(lungTumorCase.imageDataUrl);
  const lungTumorPred = generateMockPrediction('lung', lungTumorBytes, {
    fileName: lungTumorCase.fileName,
    clinical: extractClinicalInfoWithRules(lungTumorCase.clinicalNotes),
  });
  assert(lungTumorPred.metrics.areaPx > 300, `Lung tumor case: Segments nodule (area=${lungTumorPred.metrics.areaPx} px)`);

  const lungNormalBytes = dataUrlToBytes(lungNormalCase.imageDataUrl);
  const lungNormalPred = generateMockPrediction('lung', lungNormalBytes, {
    fileName: lungNormalCase.fileName,
    clinical: extractClinicalInfoWithRules(lungNormalCase.clinicalNotes),
  });
  assert(lungNormalPred.metrics.areaPx === 0, `Lung normal control: ZERO false positive lesion pixels (area=${lungNormalPred.metrics.areaPx})`);

  // 2C: Pancreas Tumor vs Pancreas Normal
  const pancTumorBytes = dataUrlToBytes(pancreasTumorCase.imageDataUrl);
  const pancTumorPred = generateMockPrediction('pancreas', pancTumorBytes, {
    fileName: pancreasTumorCase.fileName,
    clinical: extractClinicalInfoWithRules(pancreasTumorCase.clinicalNotes),
  });
  assert(pancTumorPred.metrics.areaPx > 200, `Pancreas tumor case: Segments lesion (area=${pancTumorPred.metrics.areaPx} px)`);

  const pancNormalBytes = dataUrlToBytes(pancreasNormalCase.imageDataUrl);
  const pancNormalPred = generateMockPrediction('pancreas', pancNormalBytes, {
    fileName: pancreasNormalCase.fileName,
    clinical: extractClinicalInfoWithRules(pancreasNormalCase.clinicalNotes),
  });
  assert(pancNormalPred.metrics.areaPx === 0, `Pancreas normal control: ZERO false positive lesion pixels (area=${pancNormalPred.metrics.areaPx})`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 3: Full Agent Orchestration Pipeline & Structured Report
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 3] End-to-End Agent Pipeline (runAnalysis)${RESET}`);

  // Test 3A: End-to-end Normal Control Case
  const normalAnalysis = await runAnalysis({
    image: {
      fileName: brainNormalCase.fileName,
      contentType: 'image/png',
      sizeBytes: brainNormalBytes.length,
      bytes: brainNormalBytes,
    },
    clinicalText: brainNormalCase.clinicalNotes,
    manualOrgan: brainNormalCase.organ,
  });

  assert(normalAnalysis.inference?.metrics.areaPx === 0, 'E2E Normal Case: Output area is exactly 0 px');
  assert(normalAnalysis.measurements.length === 0, 'E2E Normal Case: Zero target measurements generated');
  assert(
    normalAnalysis.report.markdown.includes('NEGATIVE'),
    'E2E Normal Case: Report markdown contains explicit "NEGATIVE" impression',
  );
  assert(
    !normalAnalysis.report.markdown.includes('identified a region of interest consistent with potential lesion tissue'),
    'E2E Normal Case: False positive lesion statement ELIMINATED from report',
  );
  assert(
    normalAnalysis.report.markdown.includes('NO suspicious focal lesion or tumor tissue'),
    'E2E Normal Case: Report explicitly confirms absence of suspicious tissue',
  );

  // Test 3B: End-to-end Positive Tumor Case
  const tumorAnalysis = await runAnalysis({
    image: {
      fileName: brainTumorCase.fileName,
      contentType: 'image/png',
      sizeBytes: brainTumorBytes.length,
      bytes: brainTumorBytes,
    },
    clinicalText: brainTumorCase.clinicalNotes,
    manualOrgan: brainTumorCase.organ,
  });

  assert((tumorAnalysis.inference?.metrics.areaPx ?? 0) > 0, 'E2E Tumor Case: Output area is greater than 0 px');
  assert(tumorAnalysis.measurements.length >= 4, `E2E Tumor Case: Computes RECIST 1.1 quantitative biomarkers (got: ${tumorAnalysis.measurements.length})`);
  assert(
    tumorAnalysis.report.markdown.includes('consistent with potential lesion tissue'),
    'E2E Tumor Case: Report accurately documents detected lesion tissue',
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 4: Multi-Agent Collaborative Reasoning Graph Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 4] Multi-Agent Collaborative Reasoning Graph${RESET}`);

  const normalTrace = normalAnalysis.multiAgentTrace!;
  assert(normalTrace !== undefined, 'MultiAgentTrace: Session trace is present');
  assert(normalTrace.consensusScore > 0.98, `MultiAgentTrace: High consensus on negative study (${normalTrace.consensusScore})`);

  const visionThought = normalTrace.thoughts.find((t) => t.role === 'radiologist_vision_agent')!;
  assert(
    visionThought.thought.includes('Zero False Positive confirmed') || visionThought.outputSummary.includes('0 lesion pixels'),
    'MultiAgentTrace: Radiologist Vision Agent explicitly validates zero false positive',
  );

  const scribeThought = normalTrace.thoughts.find((t) => t.role === 'synthesis_scribe_agent')!;
  assert(
    scribeThought.thought.includes('zero focal lesion detected') || scribeThought.actionTaken.includes('negative evaluation report'),
    'MultiAgentTrace: Chief Scribe Agent documents negative study without false alarms',
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 5: Edge Cases, Noise Suppression & Boundary Conditions
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 5] Edge Cases, Noise Suppression & Boundary Conditions${RESET}`);

  // Edge Case 5A: Empty and whitespace clinical text
  const emptyInfo = extractClinicalInfoWithRules('');
  assert(emptyInfo.findings.length === 0, 'Empty input: Zero findings extracted');
  assert(emptyInfo.symptoms.length === 0, 'Empty input: Zero symptoms extracted');
  assert(emptyInfo.organsMentioned.length === 0, 'Empty input: Zero organs mentioned');

  const whitespaceInfo = extractClinicalInfoWithRules('   \n\t  ');
  assert(whitespaceInfo.findings.length === 0, 'Whitespace input: Zero findings extracted');

  // Edge Case 5B: Mixed sentence with contrasting conjunction
  // "No mass, but patient has cough."
  const mixedConjunctionText = 'Brain MRI reveals no mass or edema, but patient continues to have cough.';
  const mixedInfo = extractClinicalInfoWithRules(mixedConjunctionText);
  assert(mixedInfo.findings.length === 0, 'Contrasting clause: "no mass" correctly negated despite trailing positive clause');
  assert(mixedInfo.symptoms.includes('cough'), 'Contrasting clause: "cough" correctly retained in affirmative symptoms');

  // Edge Case 5C: Sub-resolution noise filtering (<25 px) in postprocessing
  const { postprocessMask } = await import('../lib/agent');
  const dummyTrace = {
    steps: [],
    start: () => {},
    finish: () => {},
  } as any;

  const noisyInference = {
    organ: 'brain' as const,
    modelFile: 'brain_unet.onnx',
    engine: 'mock' as const,
    width: 256,
    height: 256,
    maskBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    confidence: 0.51,
    metrics: {
      areaPx: 12, // Sub-resolution noise speckle
      areaFraction: 0.00018,
      bbox: { x: 10, y: 10, w: 3, h: 4 },
      centroid: { x: 11, y: 12 },
      equivalentDiameterPx: 3.9,
    },
    warnings: [],
    processingMs: 15,
  };

  const filteredInference = postprocessMask(noisyInference, dummyTrace);
  assert(filteredInference.metrics.areaPx === 0, 'Noise filter: 12 px noise speckle suppressed to 0 px (false positive prevented)');
  assert(filteredInference.confidence === 0.0, 'Noise filter: Confidence reset to 0.0 for suppressed noise');
  assert(
    filteredInference.warnings.some((w: string) => w.includes('Sub-resolution cluster')),
    'Noise filter: Explanatory warning attached explaining noise rejection',
  );

  // Edge Case 5D: Completely uniform / blank raster scan
  const blankScanBytes = new Uint8Array(256 * 256).fill(0); // All black image
  const blankPred = generateMockPrediction('brain', blankScanBytes);
  assert(blankPred.metrics.areaPx === 0, 'Blank image: Zero false positive lesion pixels (area=0)');
  assert(blankPred.confidence === 0.0, 'Blank image: Confidence is 0.0');

  // Edge Case 5E: Filename indicates normal scan
  const normalFilenameBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50, 100, 150, 200, 250]);
  const normalFilenamePred = generateMockPrediction('brain', normalFilenameBytes, {
    fileName: 'patient_routine_screening_normal_control.png',
  });
  assert(normalFilenamePred.metrics.areaPx === 0, 'Filename keyword "normal": Correctly recognized as negative control (area=0)');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 6: Advanced Negation, Benign Non-Target Findings & Temporal Edge Cases
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 6] Advanced Negation, Non-Target Findings & Temporal Edge Cases${RESET}`);

  // 6A: Neither / nor conjunctions
  const neitherNorInfo = extractClinicalInfoWithRules('Axial T1 MRI of brain. Neither mass nor lesion was identified in the parenchyma.');
  assert(neitherNorInfo.findings.length === 0, 'Neither/nor: Zero affirmed findings');
  assert(neitherNorInfo.negatedFindings.includes('mass') && neitherNorInfo.negatedFindings.includes('lesion'), 'Neither/nor: Both mass and lesion negated');
  assert(neitherNorInfo.isNormalOrNegative === true, 'Neither/nor: Flagged as normal/negative study');

  // 6B: "is not present" / "not present"
  const notPresentInfo = extractClinicalInfoWithRules('Brain MRI: Mass is not present. Ventricles are normal.');
  assert(notPresentInfo.findings.length === 0, 'Not present: Zero affirmed findings');
  assert(notPresentInfo.negatedFindings.includes('mass'), 'Not present: "mass" correctly negated');
  assert(notPresentInfo.isNormalOrNegative === true, 'Not present: Flagged as normal/negative study');

  // 6C: Structured label negative ("Tumor: None")
  const structuredLabelInfo = extractClinicalInfoWithRules('CT Chest: Lungs clear. Tumor: None. Nodule: None.');
  assert(structuredLabelInfo.findings.length === 0, 'Structured None: Zero affirmed findings');
  assert(structuredLabelInfo.negatedFindings.includes('tumor'), 'Structured None: "tumor" correctly negated');
  assert(structuredLabelInfo.negatedFindings.includes('nodule'), 'Structured None: "nodule" correctly negated');
  assert(structuredLabelInfo.isNormalOrNegative === true, 'Structured None: Flagged as normal/negative study');

  // 6D: Resolution of previous finding ("Prior mass has resolved")
  const resolvedInfo = extractClinicalInfoWithRules('Follow-up brain MRI: Prior mass has resolved. No residual or recurrent lesion.');
  assert(resolvedInfo.findings.length === 0, 'Resolved mass: Zero affirmed findings');
  assert(resolvedInfo.negatedFindings.includes('mass'), 'Resolved mass: "mass" correctly marked as negated/resolved');
  assert(resolvedInfo.isNormalOrNegative === true, 'Resolved mass: Flagged as normal/negative study');

  // 6E: Incidental benign vascular calcification (non-neoplastic finding)
  const calcInfo = extractClinicalInfoWithRules('Chest CT shows clear lungs, normal mediastinum. Mild vascular calcification.');
  assert(calcInfo.isNormalOrNegative === true, 'Benign calcification: Non-target calcification does NOT trigger false positive');
  const calcPred = generateMockPrediction('lung', new Uint8Array([5, 10, 15, 20, 25]), {
    clinical: calcInfo,
    fileName: 'chest_ct_scan.png',
  });
  assert(calcPred.metrics.areaPx === 0, 'Benign calcification: Mock inference returns 0 px (no tumor segmented)');

  // 6F: Normal physiological intensity descriptions
  const physioInfo = extractClinicalInfoWithRules('Normal brain MRI. Ventricular CSF is hypointense on T1 and hyperintense on T2 as expected. No mass.');
  assert(physioInfo.isNormalOrNegative === true, 'Physiological MRI signal: Normal CSF descriptors do NOT trigger false positive');
  const physioPred = generateMockPrediction('brain', new Uint8Array([12, 24, 36, 48]), {
    clinical: physioInfo,
    fileName: 'brain_mri_study.png',
  });
  assert(physioPred.metrics.areaPx === 0, 'Physiological MRI signal: Mock inference returns 0 px (no tumor segmented)');

  // 6G: Pleural effusion without nodule
  const pleuralInfo = extractClinicalInfoWithRules('Chest CT demonstrates bilateral pleural effusion secondary to CHF. Negative for pulmonary nodule, tumor, or mass.');
  assert(pleuralInfo.isNormalOrNegative === true, 'Pleural effusion: Negative for neoplasm recognized despite non-target effusion');

  // 6H: Temporal non-negation: "Mass identified, not seen previously"
  const temporalInfo = extractClinicalInfoWithRules('Mass identified, not seen previously.');
  assert(temporalInfo.findings.includes('mass'), 'Temporal check: "not seen previously" does NOT wrongly negate newly identified mass');
  assert(temporalInfo.isNormalOrNegative === false, 'Temporal check: Case with newly identified mass is NOT marked normal');

  // 6I: Noise filtering blanks the maskBase64 payload
  assert(
    filteredInference.maskBase64.length > 50,
    'Noise filter: Produces valid clean base64 PNG data',
  );

  // 6J: Arbitrary unannotated scan baseline
  const arbitraryScanBytes = new Uint8Array([50, 60, 70, 80, 90, 100, 110, 120]);
  const arbitraryPred = generateMockPrediction('brain', arbitraryScanBytes, {
    fileName: 'patient_routine_slice14.png',
  });
  assert(arbitraryPred.metrics.areaPx === 0, 'Arbitrary unannotated scan: Conservative zero-false-positive baseline verified (area=0)');
  assert(arbitraryPred.confidence === 0.0, 'Arbitrary unannotated scan: Confidence is strictly 0.0');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 7: Adversarial Gating & False-Negative Prevention
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 7] Adversarial Gating & False-Negative Prevention${RESET}`);

  // 7A: Rule out indication must NOT be marked normal/negative
  const ruleOutInfo = extractClinicalInfoWithRules('Indication: Rule out lung mass. Non-contrast chest CT.');
  assert(ruleOutInfo.isNormalOrNegative === false, 'Adversarial: "Rule out lung mass" is an indication, NOT a normal study');
  assert(ruleOutInfo.findings.length === 0, 'Adversarial: "Rule out lung mass" produces 0 confirmed findings');

  // 7B: Symptoms only must NOT be marked normal/negative
  const symptomsOnlyInfo = extractClinicalInfoWithRules('55yo male presenting with progressive headache and ataxia. CT scan ordered.');
  assert(symptomsOnlyInfo.isNormalOrNegative === false, 'Adversarial: Symptoms-only clinical text is NOT a confirmed normal study');

  // 7C: Cannot rule out / unable to exclude must be treated as suspicion (affirmed)
  const cannotRuleOutInfo = extractClinicalInfoWithRules('Suspicious density in right upper lobe; cannot rule out malignancy.');
  assert(cannotRuleOutInfo.isNormalOrNegative === false, 'Adversarial: "Cannot rule out malignancy" is NOT a negative study');
  assert(cannotRuleOutInfo.findings.includes('malignancy'), 'Adversarial: "Cannot rule out malignancy" retains malignancy in findings');

  // 7D: Enhancing mass with no mass effect must retain mass in affirmed
  const noMassEffectInfo = extractClinicalInfoWithRules('A 2.5 cm enhancing mass in right frontal lobe with no mass effect or midline shift.');
  assert(noMassEffectInfo.findings.includes('mass'), 'Adversarial: Enhancing mass retained in findings despite "no mass effect"');
  assert(noMassEffectInfo.negatedFindings.includes('mass effect'), 'Adversarial: "mass effect" correctly negated');
  assert(noMassEffectInfo.isNormalOrNegative === false, 'Adversarial: Study with enhancing mass is NOT marked normal');

  // 7E: Filename non-control guards
  const abnormalPred = generateMockPrediction('brain', brainTumorBytes, {
    fileName: 'abnormal_brain_scan.png',
  });
  assert(abnormalPred.metrics.areaPx > 0, 'Adversarial: "abnormal_brain_scan.png" is NOT gated as normal control');

  const ruleOutFnPred = generateMockPrediction('lung', dataUrlToBytes(lungTumorCase.imageDataUrl), {
    fileName: 'rule_out_pulmonary_nodule.png',
  });
  assert(ruleOutFnPred.metrics.areaPx > 0, 'Adversarial: "rule_out_pulmonary_nodule.png" is NOT gated as normal control');

  const clearCellPred = generateMockPrediction('brain', brainTumorBytes, {
    fileName: 'clear_cell_meningioma.png',
  });
  assert(clearCellPred.metrics.areaPx > 0, 'Adversarial: "clear_cell_meningioma.png" is NOT gated as normal control');

  // 7F: End-to-end tumor scan with symptom-only clinical text must NOT be suppressed
  const tumorWithSymptomsOnly = await runAnalysis({
    image: {
      fileName: 'head_ct_scan.png',
      contentType: 'image/svg+xml',
      sizeBytes: brainTumorBytes.length,
      bytes: brainTumorBytes,
    },
    clinicalText: '45yo male presenting with new-onset seizures and severe progressive headache. CT brain ordered.',
    manualOrgan: 'brain',
  });
  assert(tumorWithSymptomsOnly.clinical.isNormalOrNegative === false, 'Adversarial E2E: Real tumor on symptom-only order is NOT marked normal');
  assert(tumorWithSymptomsOnly.inference!.metrics.areaPx > 500, 'Adversarial E2E: Real tumor on symptom-only order is NOT suppressed');
  assert(tumorWithSymptomsOnly.inference!.confidence > 0.5, 'Adversarial E2E: Real tumor on symptom-only order maintains confidence');

  // 7G: Negated "normal" phrases must NOT be treated as a normal study
  const notNormalInfo = extractClinicalInfoWithRules('Brain scan is not normal. Follow-up consultation advised.');
  assert(notNormalInfo.isNormalOrNegative === false, 'Adversarial: "Brain scan is not normal" is NOT marked normal/negative');

  // 7H: "Outside normal limits" must NOT be treated as a normal study
  const outsideLimitsInfo = extractClinicalInfoWithRules('Appearance is outside normal limits.');
  assert(outsideLimitsInfo.isNormalOrNegative === false, 'Adversarial: "Outside normal limits" is NOT marked normal/negative');

  // 7I: "Not unremarkable" must NOT be treated as a normal study
  const notUnremarkableInfo = extractClinicalInfoWithRules('Axial T2 imaging is not unremarkable.');
  assert(notUnremarkableInfo.isNormalOrNegative === false, 'Adversarial: "Not unremarkable" is NOT marked normal/negative');

  // 7J: Symptoms-only analysis (no scan attached) runs cleanly through the agent pipeline
  const symptomsOnlyAnalysis = await runAnalysis({
    clinicalText: '54-year-old female presenting with severe progressive morning headaches, left hemiparesis, blurred vision, and morning nausea.',
    manualOrgan: 'brain',
  });
  assert(symptomsOnlyAnalysis.clinical.symptoms.length >= 3, 'Symptoms-only E2E: Extracts multiple clinical symptoms');
  assert(Boolean(symptomsOnlyAnalysis.symptomAnalysis), 'Symptoms-only E2E: Synthesizes rich symptom analysis');
  assert(symptomsOnlyAnalysis.symptomAnalysis!.differentials.length > 0, 'Symptoms-only E2E: Evaluates differential diagnoses');
  assert(symptomsOnlyAnalysis.inference === null, 'Symptoms-only E2E: Image inference is safely null without throwing error');
  assert(symptomsOnlyAnalysis.report.sections.length >= 5, 'Symptoms-only E2E: Generates full structured consultation report');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 8: Edge Cases & Resilient Engine Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 8] Edge Cases & Resilient Engine Verification${RESET}`);

  // 8A: Contrasting Conjunctions (yet, though, despite, other than, aside from)
  const yetCase = extractClinicalInfoWithRules('No intracranial mass, yet headache reported.');
  assert(yetCase.symptoms.includes('headache'), 'Contrasting: "yet" preserves affirmed headache despite preceding "no mass"');
  assert(yetCase.negatedFindings.includes('mass'), 'Contrasting: "no mass" correctly negated before "yet"');

  const thoughCase = extractClinicalInfoWithRules('No tumor identified, though persistent cough present.');
  assert(thoughCase.symptoms.includes('cough'), 'Contrasting: "though" preserves affirmed cough');
  assert(thoughCase.negatedFindings.includes('tumor'), 'Contrasting: "no tumor" correctly negated before "though"');

  const despiteCase = extractClinicalInfoWithRules('No lesion detected, despite severe seizure episodes.');
  assert(despiteCase.symptoms.includes('seizure'), 'Contrasting: "despite" preserves affirmed seizure');
  assert(despiteCase.negatedFindings.includes('lesion'), 'Contrasting: "no lesion" correctly negated before "despite"');

  const otherThanCase = extractClinicalInfoWithRules('Unremarkable cranial examination, other than solitary nodule.');
  assert(otherThanCase.findings.includes('nodule'), 'Contrasting: "other than" retains affirmed nodule');

  const asideFromCase = extractClinicalInfoWithRules('Negative chest CT, aside from breast lump.');
  assert(asideFromCase.symptoms.includes('breast lump'), 'Contrasting: "aside from" retains affirmed breast lump');

  // 8B: Advanced Negations (denying, visible/significant, colon/dash delimiters)
  const denyingCase = extractClinicalInfoWithRules('Patient is denying headache and denying chest pain.');
  assert(!denyingCase.symptoms.includes('headache'), 'Negation: "denying headache" excluded from symptoms');
  assert(!denyingCase.symptoms.includes('chest pain'), 'Negation: "denying chest pain" excluded from symptoms');

  const visibleMassCase = extractClinicalInfoWithRules('No visible mass and no significant edema on MRI brain.');
  assert(visibleMassCase.negatedFindings.includes('mass'), 'Negation: "no visible mass" correctly negated');
  assert(visibleMassCase.negatedFindings.includes('edema'), 'Negation: "no significant edema" correctly negated');

  const colonDelimCase = extractClinicalInfoWithRules('Findings:\nMass: Not detected\nEdema: None seen\nMidline shift: Absent');
  assert(colonDelimCase.negatedFindings.includes('mass'), 'Negation: "Mass: Not detected" correctly negated');
  assert(colonDelimCase.negatedFindings.includes('edema'), 'Negation: "Edema: None seen" correctly negated');
  assert(colonDelimCase.negatedFindings.includes('midline shift'), 'Negation: "Midline shift: Absent" correctly negated');
  assert(colonDelimCase.isNormalOrNegative === true, 'Negation: colon-delimited negative study flagged normal');

  const hyphenRuleOutCase = extractClinicalInfoWithRules('Rule-out brain mass.');
  assert(hyphenRuleOutCase.findings.length === 0, 'Negation: "Rule-out brain mass" (hyphenated) produces 0 confirmed findings');
  assert(hyphenRuleOutCase.isNormalOrNegative === false, 'Adversarial: "Rule-out brain mass" is an indication, NOT a normal study');

  // 8C: Multi-organ Ambiguity Resolution
  const multiOrganCase1 = extractClinicalInfoWithRules(
    'Chest CT ordered: pulmonary nodule noted in patient with prior remote history of skin mole.',
  );
  assert(multiOrganCase1.organsMentioned[0] === 'lung', 'Multi-organ: chronological priority places primary target "lung" first');
  assert(multiOrganCase1.organsMentioned.includes('skin'), 'Multi-organ: secondary mention of "skin" is retained');

  const multiOrganCase2 = extractClinicalInfoWithRules(
    'Brain MRI for headache in patient with remote history of lung infection.',
  );
  assert(multiOrganCase2.organsMentioned[0] === 'brain', 'Multi-organ: chronological priority places primary target "brain" first');

  // 8D: Gemini Vision Bounding Box Normalization (0..1, 0..100, 0..1000, inverted coords, object schemas)
  const norm1000 = normalizeBoundingBox([250, 450, 450, 650], 256, 256);
  assert(norm1000[0] === 115 && norm1000[1] === 64 && norm1000[2] === 166 && norm1000[3] === 115, 'BBox: 0..1000 scale normalizes to [115, 64, 166, 115]');

  const norm100 = normalizeBoundingBox([25, 45, 45, 65], 256, 256);
  assert(norm100[0] === 115 && norm100[1] === 64 && norm100[2] === 166 && norm100[3] === 115, 'BBox: 0..100 percentage scale normalizes to [115, 64, 166, 115]');

  const norm1 = normalizeBoundingBox([0.25, 0.45, 0.45, 0.65], 256, 256);
  assert(norm1[0] === 115 && norm1[1] === 64 && norm1[2] === 166 && norm1[3] === 115, 'BBox: 0..1 float scale normalizes to [115, 64, 166, 115]');

  const normInverted = normalizeBoundingBox([450, 650, 250, 450], 256, 256);
  assert(normInverted[0] === 115 && normInverted[1] === 64 && normInverted[2] === 166 && normInverted[3] === 115, 'BBox: inverted coordinates correctly sorted (minX <= maxX, minY <= maxY)');

  const normObject = normalizeBoundingBox({ ymin: 250, xmin: 450, ymax: 450, xmax: 650 }, 256, 256);
  assert(normObject[0] === 115 && normObject[1] === 64 && normObject[2] === 166 && normObject[3] === 115, 'BBox: object schema {ymin, xmin, ymax, xmax} parsed correctly');

  // 8E: Empty / 0-byte Buffer Handling in Mock Inference
  const emptyBytesPred = generateMockPrediction('brain', new Uint8Array(0));
  assert(emptyBytesPred.metrics.areaPx === 0, 'Mock Inference: 0-byte image buffer produces 0 px lesion (no divide-by-zero or NaN)');
  assert(emptyBytesPred.confidence === 0.0, 'Mock Inference: 0-byte image buffer confidence is 0.0');

  // 8F: Symptom Fallback with Explicit organHint Priority
  const lungSymptomResult = await analyzeClinicalSymptoms({
    text: 'Patient reports progressive fatigue, weakness, and mild dyspnea.',
    organHint: 'lung',
  });
  assert(
    lungSymptomResult !== null &&
      lungSymptomResult.differentials[0].organSystem.includes('Pulmonary'),
    'Symptom Analyzer: explicit organHint="lung" routes to Pulmonary oncology even with constitutional weakness',
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 9: Deep Codebase Flaw Fixes & Multi-Organ Engine Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 9] Deep Codebase Flaw Fixes & Multi-Organ Engine Verification${RESET}`);

  // 9A: extractJsonFromText Markdown Fence & Commentary Resilience
  const rawFencedJson = '```json\n{\n  "has_tumor": true,\n  "diagnosis": "Glioma"\n}\n```';
  const parsedFenced = extractJsonFromText<{ has_tumor: boolean; diagnosis: string }>(rawFencedJson);
  assert(parsedFenced?.has_tumor === true, 'JSON Extractor: successfully strips markdown code fences');
  assert(parsedFenced?.diagnosis === 'Glioma', 'JSON Extractor: accurately parses JSON payload within code fences');

  const rawConversationalJson = 'Here is the requested clinical evaluation:\n```json\n{"status": "ok"}\n```\nHope this helps!';
  const parsedConv = extractJsonFromText<{ status: string }>(rawConversationalJson);
  assert(parsedConv?.status === 'ok', 'JSON Extractor: successfully extracts JSON enclosed in conversational text');

  const invalidJsonText = 'This is not valid json at all.';
  const parsedInvalid = extractJsonFromText(invalidJsonText);
  assert(parsedInvalid === null, 'JSON Extractor: safely returns null for invalid non-JSON strings without throwing');

  // 9B: Extended normalizeBoundingBox schemas and high-res scaling
  const normMinMaxObj = normalizeBoundingBox({ minX: 450, minY: 250, maxX: 650, maxY: 450 }, 256, 256);
  assert(normMinMaxObj[0] === 115 && normMinMaxObj[1] === 64 && normMinMaxObj[2] === 166 && normMinMaxObj[3] === 115, 'BBox: object schema {minX, minY, maxX, maxY} parsed correctly');

  const normX1Y1Obj = normalizeBoundingBox({ x1: 450, y1: 250, x2: 650, y2: 450 }, 256, 256);
  assert(normX1Y1Obj[0] === 115 && normX1Y1Obj[1] === 64 && normX1Y1Obj[2] === 166 && normX1Y1Obj[3] === 115, 'BBox: object schema {x1, y1, x2, y2} parsed correctly');

  const normHighRes = normalizeBoundingBox([1250, 2250, 2250, 3250], 256, 256);
  assert(normHighRes[0] >= 0 && normHighRes[2] <= 256 && normHighRes[0] < normHighRes[2], 'BBox: high-res pixel coordinates (>1000) scale safely within image bounds');

  // 9C: Comprehensive Multi-Organ Medical Knowledge Routing
  const breastKnowledge = await fetchMedicalKnowledge({ diagnosis: 'Breast Lump', organ: 'breast', hasTumor: true });
  assert(breastKnowledge.condition.includes('Ductal Carcinoma'), 'Knowledge Engine: breast organ routes to Invasive Ductal Carcinoma (not GBM)');

  const kidneyKnowledge = await fetchMedicalKnowledge({ diagnosis: 'Renal Mass', organ: 'kidney', hasTumor: true });
  assert(kidneyKnowledge.condition.includes('Renal Cell Carcinoma'), 'Knowledge Engine: kidney organ routes to Renal Cell Carcinoma (not GBM)');

  const skinKnowledge = await fetchMedicalKnowledge({ diagnosis: 'Irregular Mole', organ: 'skin', hasTumor: true });
  assert(skinKnowledge.condition.includes('Melanoma'), 'Knowledge Engine: skin organ routes to Cutaneous Malignant Melanoma (not GBM)');

  const liverKnowledge = await fetchMedicalKnowledge({ diagnosis: 'Hepatic Mass', organ: 'liver', hasTumor: true });
  assert(liverKnowledge.condition.includes('Hepatocellular Carcinoma'), 'Knowledge Engine: liver organ routes to Hepatocellular Carcinoma (not GBM)');

  const colonKnowledge = await fetchMedicalKnowledge({ diagnosis: 'Colon Polyp', organ: 'colon', hasTumor: true });
  assert(colonKnowledge.condition.includes('Colorectal Adenocarcinoma'), 'Knowledge Engine: colon organ routes to Colorectal Adenocarcinoma (not GBM)');

  const prostateKnowledge = await fetchMedicalKnowledge({ diagnosis: 'Prostate Nodule', organ: 'prostate', hasTumor: true });
  assert(prostateKnowledge.condition.includes('Prostate Adenocarcinoma'), 'Knowledge Engine: prostate organ routes to Prostate Adenocarcinoma (not GBM)');

  // 9D: Multi-Organ Symptom Analyzer Fallbacks
  const liverSymptomResult = await analyzeClinicalSymptoms({
    text: 'Patient presents with worsening jaundice, ascites, and right upper quadrant discomfort.',
    organHint: 'liver',
  });
  assert(
    liverSymptomResult !== null &&
      liverSymptomResult.differentials[0].condition.includes('Hepatocellular Carcinoma'),
    'Symptom Analyzer: explicit organHint="liver" generates Hepatocellular Carcinoma differential',
  );

  const colonSymptomResult = await analyzeClinicalSymptoms({
    text: '58yo with 3 months of progressive hematochezia, weight loss, and change in bowel habits.',
    organHint: 'colon',
  });
  assert(
    colonSymptomResult !== null &&
      colonSymptomResult.differentials[0].condition.includes('Colorectal Adenocarcinoma'),
    'Symptom Analyzer: explicit organHint="colon" generates Colorectal Adenocarcinoma differential',
  );

  const prostateSymptomResult = await analyzeClinicalSymptoms({
    text: 'Elderly male with nocturia, weak urinary stream, and elevated serum PSA.',
    organHint: 'prostate',
  });
  assert(
    prostateSymptomResult !== null &&
      prostateSymptomResult.differentials[0].condition.includes('Prostate'),
    'Symptom Analyzer: explicit organHint="prostate" generates Prostate differential',
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 10: Gemini Vision End-to-End & Aspect Ratio Localization
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 10] Gemini Vision Localization, Aspect Ratio & Dimension Fidelity${RESET}`);

  // 1. Synthetic PNG byte header dimension parser (641x473)
  const pngHeader = new Uint8Array(24);
  pngHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // width: 641 (0x00000281) at byte 16
  pngHeader[16] = 0x00; pngHeader[17] = 0x00; pngHeader[18] = 0x02; pngHeader[19] = 0x81;
  // height: 473 (0x000001D9) at byte 20
  pngHeader[20] = 0x00; pngHeader[21] = 0x00; pngHeader[22] = 0x01; pngHeader[23] = 0xd9;

  const dims = getImageDimensions(pngHeader);
  assert(dims.width === 641 && dims.height === 473, 'Dimension Parser: Accurately extracts non-square PNG dimensions (641x473)');

  // 2. Synthetic JPEG byte header dimension parser (512x384)
  const jpegHeader = new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x11, // length 17
    0x08,       // precision 8
    0x01, 0x80, // height 384
    0x02, 0x00, // width 512
    0x03,       // components
  ]);
  const jpegDims = getImageDimensions(jpegHeader);
  assert(jpegDims.width === 512 && jpegDims.height === 384, 'Dimension Parser: Accurately extracts JPEG dimensions (512x384)');

  // 3. Fallback dimension parser for empty/corrupted buffer
  const fallbackDims = getImageDimensions(new Uint8Array(8));
  assert(fallbackDims.width === 256 && fallbackDims.height === 256, 'Dimension Parser: Gracefully defaults to standard 256x256 on partial/empty buffer');

  // 4. Normalized Bounding Box with non-square aspect ratio (641x473)
  // Gemini returns [444, 258, 640, 476] (ymin, xmin, ymax, xmax on 0..1000 scale)
  const [nbXmin, nbYmin, nbXmax, nbYmax] = normalizeBoundingBox([444, 258, 640, 476], 641, 473);
  const expectedXmin = Math.round((258 / 1000) * 641); // 165
  const expectedXmax = Math.round((476 / 1000) * 641); // 305
  const expectedYmin = Math.round((444 / 1000) * 473); // 210
  const expectedYmax = Math.round((640 / 1000) * 473); // 303

  assert(
    Math.abs(nbXmin - expectedXmin) <= 1 && Math.abs(nbXmax - expectedXmax) <= 1,
    `BBox Normalizer: Correctly scales horizontal tumor bounds onto 641px width (${nbXmin}..${nbXmax})`,
  );
  assert(
    Math.abs(nbYmin - expectedYmin) <= 1 && Math.abs(nbYmax - expectedYmax) <= 1,
    `BBox Normalizer: Correctly scales vertical tumor bounds onto 473px height (${nbYmin}..${nbYmax})`,
  );

  // 5. Center of lesion is isolated to the anatomical hemisphere, never forced to center ventricles
  const lesionCenterX = (nbXmin + nbXmax) / 2;
  const lesionFractionX = lesionCenterX / 641;
  assert(
    lesionFractionX < 0.45 && lesionFractionX > 0.30,
    `BBox Normalizer: Lesion center correctly positioned at hemisphere (${(lesionFractionX * 100).toFixed(1)}% of scan width), preventing central ventricle misplacement`,
  );

  // 6. Gemini Vision Configuration status check
  const isConfigured = isGeminiVisionConfigured();
  assert(
    typeof isConfigured === 'boolean',
    `Gemini Vision Config: isGeminiVisionConfigured() correctly evaluates without throwing (active=${isConfigured})`,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`${BOLD}Results: ${passed} passed, ${failed} failed${RESET}`);
  console.log(`${BOLD}================================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
