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
  assert(tumorWithSymptomsOnly.clinical.isNormalOrNegative === false, 'Adversarial E2E: Clinical text with symptoms only is not marked normal');
  assert(tumorWithSymptomsOnly.inference!.metrics.areaPx > 500, 'Adversarial E2E: Real tumor on symptom-only order is NOT suppressed');
  assert(tumorWithSymptomsOnly.inference!.confidence > 0.5, 'Adversarial E2E: Real tumor on symptom-only order maintains confidence');

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
