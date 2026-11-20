/**
 * Comprehensive verification suite for MedVision False-Positive Elimination:
 * 1. Medical Negation & Clinical NLP verification (NegEx engine)
 * 2. Scan Image & Mock Inference True-Positive vs True-Negative verification
 * 3. End-to-end Agent Pipeline Execution (Positive Tumor vs Normal Control)
 * 4. Multi-Agent Reasoning Consensus & RECIST 1.1 metric verification
 */

import { extractClinicalInfoWithRules } from '../lib/clinicalInfo';
import { generateMockPrediction, encodeRgbaPng } from '../lib/mockInference';
import { runAnalysis, calculateTumorVerdict, applyConcordanceGating } from '../lib/agent';
import { SAMPLE_CASES } from '../lib/sampleCases';
import { inflateSync } from 'node:zlib';
import type { InferenceResult } from '../lib/types';

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

  // Hyphenated rule-out: neither affirmed finding nor proven normal
  const hypRuleOutInfo = extractClinicalInfoWithRules('Ordering indication: rule-out pancreatic mass');
  assert(hypRuleOutInfo.findings.length === 0, 'Hyphenated rule-out: "rule-out pancreatic mass" yields 0 affirmed findings');
  assert(hypRuleOutInfo.suspectedConditions.length === 0, 'Hyphenated rule-out: 0 suspected conditions');

  // Family history antecedent: familial risk excluded from patient findings and suspectedConditions
  const famHistInfo = extractClinicalInfoWithRules('Patient reports family history of glioma. Routine brain MRI is normal.');
  assert(famHistInfo.findings.length === 0, 'Family history: "family history of glioma" excluded from affirmed findings');
  assert(famHistInfo.suspectedConditions.length === 0, 'Family history: "family history of glioma" excluded from suspectedConditions');
  assert(famHistInfo.isNormalOrNegative === true, 'Family history: Scan noted normal correctly marked isNormalOrNegative = true');

  // Familial relation antecedents: Mother had adenocarcinoma, Father had glioblastoma, Mother had mass
  const motherAdenoInfo = extractClinicalInfoWithRules('Mother had pancreatic adenocarcinoma. Screening scan unremarkable.');
  assert(motherAdenoInfo.findings.length === 0, 'Familial antecedent: "Mother had pancreatic adenocarcinoma" yields 0 affirmed findings');
  assert(motherAdenoInfo.suspectedConditions.length === 0, 'Familial antecedent: "Mother had pancreatic adenocarcinoma" yields 0 suspected conditions');
  assert(motherAdenoInfo.isNormalOrNegative === true, 'Familial antecedent: "Mother had adenocarcinoma... scan unremarkable" isNormalOrNegative = true');

  const fatherGbmInfo = extractClinicalInfoWithRules('Father had glioblastoma. Routine MRI unremarkable.');
  assert(fatherGbmInfo.findings.length === 0, 'Familial antecedent: "Father had glioblastoma" yields 0 affirmed findings');
  assert(fatherGbmInfo.suspectedConditions.length === 0, 'Familial antecedent: "Father had glioblastoma" yields 0 suspected conditions');
  assert(fatherGbmInfo.isNormalOrNegative === true, 'Familial antecedent: "Father had glioblastoma... MRI unremarkable" isNormalOrNegative = true');

  const motherMassInfo = extractClinicalInfoWithRules('Mother had pancreatic mass.');
  assert(motherMassInfo.findings.length === 0, 'Familial antecedent: "Mother had pancreatic mass" yields 0 affirmed findings');
  assert(motherMassInfo.suspectedConditions.length === 0, 'Familial antecedent: "Mother had pancreatic mass" yields 0 suspected conditions');

  const sisterDiagInfo = extractClinicalInfoWithRules('Sister was diagnosed with brain tumor. Normal brain scan.');
  assert(sisterDiagInfo.findings.length === 0, 'Familial antecedent: "Sister was diagnosed with brain tumor" yields 0 affirmed findings');
  assert(sisterDiagInfo.isNormalOrNegative === true, 'Familial antecedent: Sister diagnosed with brain tumor on normal scan isNormalOrNegative = true');

  const auntGbmInfo = extractClinicalInfoWithRules('Maternal aunt had glioblastoma. Routine MRI unremarkable.');
  assert(auntGbmInfo.findings.length === 0, 'Familial antecedent: "Maternal aunt had glioblastoma" yields 0 affirmed findings');
  assert(auntGbmInfo.isNormalOrNegative === true, 'Familial antecedent: Maternal aunt had glioblastoma on unremarkable scan isNormalOrNegative = true');

  const uncleMassInfo = extractClinicalInfoWithRules('Paternal uncle had pancreatic mass. Screening scan unremarkable.');
  assert(uncleMassInfo.findings.length === 0, 'Familial antecedent: "Paternal uncle had pancreatic mass" yields 0 affirmed findings');
  assert(uncleMassInfo.isNormalOrNegative === true, 'Familial antecedent: Paternal uncle had mass on unremarkable scan isNormalOrNegative = true');

  // Period-delimited rule-out abbreviations: "r.o." must not be fragmented into affirmed findings
  const roBrainInfo = extractClinicalInfoWithRules('Indication: r.o. brain tumor');
  assert(roBrainInfo.findings.length === 0, 'Period rule-out: "Indication: r.o. brain tumor" yields 0 affirmed findings');
  assert(roBrainInfo.suspectedConditions.length === 0, 'Period rule-out: "Indication: r.o. brain tumor" yields 0 suspected conditions');

  const roNormalInfo = extractClinicalInfoWithRules('Indication: r.o. brain tumor. Routine brain MRI is normal.');
  assert(roNormalInfo.findings.length === 0, 'Period rule-out: "r.o. brain tumor" on normal MRI yields 0 affirmed findings');
  assert(roNormalInfo.isNormalOrNegative === true, 'Period rule-out: "r.o. brain tumor" on normal MRI isNormalOrNegative = true');

  const roLungInfo = extractClinicalInfoWithRules('Indication: R.O. lung mass');
  assert(roLungInfo.findings.length === 0, 'Period rule-out: "Indication: R.O. lung mass" yields 0 affirmed findings');
  assert(roLungInfo.suspectedConditions.length === 0, 'Period rule-out: "Indication: R.O. lung mass" yields 0 suspected conditions');

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

  // 7G: Ordering indication (hyphenated rule-out) on normal scan yields area 0 px, danger level 0
  const e2eHyphenatedRuleOut = await runAnalysis({
    image: {
      fileName: 'pancreas_normal_control.png',
      contentType: 'image/png',
      sizeBytes: pancNormalBytes.length,
      bytes: pancNormalBytes,
    },
    clinicalText: 'Ordering indication: rule-out pancreatic mass',
    manualOrgan: 'pancreas',
  });
  const ruleOutVerdict = calculateTumorVerdict(e2eHyphenatedRuleOut);
  assert(e2eHyphenatedRuleOut.inference!.metrics.areaPx === 0, 'Adversarial: "Ordering indication: rule-out pancreatic mass" on normal scan yields area 0 px');
  assert(ruleOutVerdict.dangerLevel === 0, 'Adversarial: "Ordering indication: rule-out pancreatic mass" on normal scan yields danger level 0');

  // 7H: Family history antecedent on normal scan yields area 0 px, danger level 0
  const e2eFamilyHistory = await runAnalysis({
    image: {
      fileName: 'brain_mri_normal_scan.png',
      contentType: 'image/png',
      sizeBytes: brainNormalBytes.length,
      bytes: brainNormalBytes,
    },
    clinicalText: 'Patient reports family history of glioma. Routine brain MRI is normal.',
    manualOrgan: 'brain',
  });
  const familyHistoryVerdict = calculateTumorVerdict(e2eFamilyHistory);
  assert(e2eFamilyHistory.inference!.metrics.areaPx === 0, 'Adversarial: "Patient reports family history of glioma. Routine brain MRI is normal." yields area 0 px');
  assert(familyHistoryVerdict.dangerLevel === 0, 'Adversarial: "Patient reports family history of glioma. Routine brain MRI is normal." yields danger level 0');

  // 7I: Mother had pancreatic adenocarcinoma on normal scan yields area 0 px, danger level 0
  const e2eMotherAdeno = await runAnalysis({
    image: {
      fileName: 'pancreas_scan.png',
      contentType: 'image/png',
      sizeBytes: pancNormalBytes.length,
      bytes: pancNormalBytes,
    },
    clinicalText: 'Mother had pancreatic adenocarcinoma. Screening scan unremarkable.',
    manualOrgan: 'pancreas',
  });
  const motherAdenoVerdict = calculateTumorVerdict(e2eMotherAdeno);
  assert(e2eMotherAdeno.inference!.metrics.areaPx === 0, 'Adversarial E2E: "Mother had pancreatic adenocarcinoma. Screening scan unremarkable." yields area 0 px');
  assert(motherAdenoVerdict.dangerLevel === 0, 'Adversarial E2E: "Mother had pancreatic adenocarcinoma. Screening scan unremarkable." yields danger level 0');

  // 7J: Father had glioblastoma on normal scan yields area 0 px, danger level 0
  const e2eFatherGbm = await runAnalysis({
    image: {
      fileName: 'brain_scan.png',
      contentType: 'image/png',
      sizeBytes: brainNormalBytes.length,
      bytes: brainNormalBytes,
    },
    clinicalText: 'Father had glioblastoma. Routine MRI unremarkable.',
    manualOrgan: 'brain',
  });
  const fatherGbmVerdict = calculateTumorVerdict(e2eFatherGbm);
  assert(e2eFatherGbm.inference!.metrics.areaPx === 0, 'Adversarial E2E: "Father had glioblastoma. Routine MRI unremarkable." yields area 0 px');
  assert(fatherGbmVerdict.dangerLevel === 0, 'Adversarial E2E: "Father had glioblastoma. Routine MRI unremarkable." yields danger level 0');

  // 7K: Mother had pancreatic mass (bare familial finding without scan unremarkable) on normal scan yields area 0 px, danger level 0
  const e2eMotherMass = await runAnalysis({
    image: {
      fileName: 'pancreas_scan.png',
      contentType: 'image/png',
      sizeBytes: pancNormalBytes.length,
      bytes: pancNormalBytes,
    },
    clinicalText: 'Mother had pancreatic mass.',
    manualOrgan: 'pancreas',
  });
  const motherMassVerdict = calculateTumorVerdict(e2eMotherMass);
  assert(e2eMotherMass.inference!.metrics.areaPx === 0, 'Adversarial E2E: "Mother had pancreatic mass." on normal scan yields area 0 px');
  assert(motherMassVerdict.dangerLevel === 0, 'Adversarial E2E: "Mother had pancreatic mass." on normal scan yields danger level 0');

  // 7L: Period-delimited rule-out abbreviation (r.o.) on normal scan yields area 0 px, danger level 0
  const e2eRoBrain = await runAnalysis({
    image: {
      fileName: 'brain_scan.png',
      contentType: 'image/png',
      sizeBytes: brainNormalBytes.length,
      bytes: brainNormalBytes,
    },
    clinicalText: 'Indication: r.o. brain tumor',
    manualOrgan: 'brain',
  });
  const roBrainVerdict = calculateTumorVerdict(e2eRoBrain);
  assert(e2eRoBrain.inference!.metrics.areaPx === 0, 'Adversarial E2E: "Indication: r.o. brain tumor" on normal scan yields area 0 px');
  assert(roBrainVerdict.dangerLevel === 0, 'Adversarial E2E: "Indication: r.o. brain tumor" on normal scan yields danger level 0');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 8: Tri-Modal End-to-End Normal Controls
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 8] Tri-Modal End-to-End Normal Controls${RESET}`);

  // 8A: Brain MRI Normal Control
  const e2eBrainNormal = await runAnalysis({
    image: {
      fileName: brainNormalCase.fileName,
      contentType: 'image/svg+xml',
      sizeBytes: brainNormalBytes.length,
      bytes: brainNormalBytes,
    },
    clinicalText: brainNormalCase.clinicalNotes,
    manualOrgan: brainNormalCase.organ,
  });
  const brainNormalVerdict = calculateTumorVerdict(e2eBrainNormal);
  assert(e2eBrainNormal.inference!.metrics.areaPx === 0, 'Suite 8 (Brain Normal): Area is strictly 0 px');
  assert(e2eBrainNormal.inference!.metrics.bbox === null, 'Suite 8 (Brain Normal): Bbox is null');
  assert(e2eBrainNormal.inference!.confidence === 0.0, 'Suite 8 (Brain Normal): Confidence is strictly 0.0');
  assert(e2eBrainNormal.measurements.length === 0, 'Suite 8 (Brain Normal): Zero RECIST measurements');
  assert(brainNormalVerdict.dangerLevel === 0, 'Suite 8 (Brain Normal): Danger level is 0');
  assert(brainNormalVerdict.dangerTitle === 'Clear / No Lesion (0/5)', 'Suite 8 (Brain Normal): Danger title is Clear / No Lesion (0/5)');
  assert(e2eBrainNormal.report.markdown.includes('NEGATIVE'), 'Suite 8 (Brain Normal): Report contains NEGATIVE');
  assert(!e2eBrainNormal.report.markdown.includes('identified a region of interest consistent with potential lesion tissue'), 'Suite 8 (Brain Normal): No positive lesion claim in report');
  assert(e2eBrainNormal.clinical.isNormalOrNegative === true, 'Suite 8 (Brain Normal): Clinical isNormalOrNegative is true');
  assert(e2eBrainNormal.clinical.findings.length === 0, 'Suite 8 (Brain Normal): Zero affirmed clinical findings');
  assert((e2eBrainNormal.multiAgentTrace?.consensusScore ?? 0) >= 0.98, 'Suite 8 (Brain Normal): Multi-agent consensus >= 0.98');
  assert(Boolean(e2eBrainNormal.multiAgentTrace?.finalConsensusSummary.toLowerCase().includes('zero false positive')), 'Suite 8 (Brain Normal): Final consensus confirms zero false positive');

  // 8B: Lung CT Normal Control
  const e2eLungNormal = await runAnalysis({
    image: {
      fileName: lungNormalCase.fileName,
      contentType: 'image/svg+xml',
      sizeBytes: lungNormalBytes.length,
      bytes: lungNormalBytes,
    },
    clinicalText: lungNormalCase.clinicalNotes,
    manualOrgan: lungNormalCase.organ,
  });
  const lungNormalVerdict = calculateTumorVerdict(e2eLungNormal);
  assert(e2eLungNormal.inference!.metrics.areaPx === 0, 'Suite 8 (Lung Normal): Area is strictly 0 px');
  assert(e2eLungNormal.inference!.metrics.bbox === null, 'Suite 8 (Lung Normal): Bbox is null');
  assert(e2eLungNormal.inference!.confidence === 0.0, 'Suite 8 (Lung Normal): Confidence is strictly 0.0');
  assert(e2eLungNormal.measurements.length === 0, 'Suite 8 (Lung Normal): Zero RECIST measurements');
  assert(lungNormalVerdict.dangerLevel === 0, 'Suite 8 (Lung Normal): Danger level is 0');
  assert(lungNormalVerdict.dangerTitle === 'Clear / No Lesion (0/5)', 'Suite 8 (Lung Normal): Danger title is Clear / No Lesion (0/5)');
  assert(e2eLungNormal.report.markdown.includes('NEGATIVE'), 'Suite 8 (Lung Normal): Report contains NEGATIVE');
  assert(!e2eLungNormal.report.markdown.includes('identified a region of interest consistent with potential lesion tissue'), 'Suite 8 (Lung Normal): No positive lesion claim in report');
  assert(e2eLungNormal.clinical.isNormalOrNegative === true, 'Suite 8 (Lung Normal): Clinical isNormalOrNegative is true');
  assert(e2eLungNormal.clinical.findings.length === 0, 'Suite 8 (Lung Normal): Zero affirmed clinical findings');

  // 8C: Pancreas CT Normal Control
  const e2ePancreasNormal = await runAnalysis({
    image: {
      fileName: pancreasNormalCase.fileName,
      contentType: 'image/svg+xml',
      sizeBytes: pancNormalBytes.length,
      bytes: pancNormalBytes,
    },
    clinicalText: pancreasNormalCase.clinicalNotes,
    manualOrgan: pancreasNormalCase.organ,
  });
  const pancNormalVerdict = calculateTumorVerdict(e2ePancreasNormal);
  assert(e2ePancreasNormal.inference!.metrics.areaPx === 0, 'Suite 8 (Pancreas Normal): Area is strictly 0 px');
  assert(e2ePancreasNormal.inference!.metrics.bbox === null, 'Suite 8 (Pancreas Normal): Bbox is null');
  assert(e2ePancreasNormal.inference!.confidence === 0.0, 'Suite 8 (Pancreas Normal): Confidence is strictly 0.0');
  assert(e2ePancreasNormal.measurements.length === 0, 'Suite 8 (Pancreas Normal): Zero RECIST measurements');
  assert(pancNormalVerdict.dangerLevel === 0, 'Suite 8 (Pancreas Normal): Danger level is 0');
  assert(pancNormalVerdict.dangerTitle === 'Clear / No Lesion (0/5)', 'Suite 8 (Pancreas Normal): Danger title is Clear / No Lesion (0/5)');
  assert(e2ePancreasNormal.report.markdown.includes('NEGATIVE'), 'Suite 8 (Pancreas Normal): Report contains NEGATIVE');
  assert(!e2ePancreasNormal.report.markdown.includes('identified a region of interest consistent with potential lesion tissue'), 'Suite 8 (Pancreas Normal): No positive lesion claim in report');
  assert(e2ePancreasNormal.clinical.isNormalOrNegative === true, 'Suite 8 (Pancreas Normal): Clinical isNormalOrNegative is true');
  assert(e2ePancreasNormal.clinical.findings.length === 0, 'Suite 8 (Pancreas Normal): Zero affirmed clinical findings');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 9: Tri-Modal End-to-End True Positives (Sensitivity Preservation)
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 9] Tri-Modal End-to-End True Positives (Sensitivity Preservation)${RESET}`);

  // 9A: Brain Tumor (GBM)
  const e2eBrainTumor = await runAnalysis({
    image: {
      fileName: brainTumorCase.fileName,
      contentType: 'image/svg+xml',
      sizeBytes: brainTumorBytes.length,
      bytes: brainTumorBytes,
    },
    clinicalText: brainTumorCase.clinicalNotes,
    manualOrgan: brainTumorCase.organ,
  });
  const brainTumorVerdict = calculateTumorVerdict(e2eBrainTumor);
  assert(e2eBrainTumor.clinical.isNormalOrNegative === false, 'Suite 9 (Brain Tumor): isNormalOrNegative is false');
  assert(e2eBrainTumor.clinical.findings.length > 0, 'Suite 9 (Brain Tumor): Affirmed findings present');
  assert(e2eBrainTumor.inference!.metrics.areaPx > 100, `Suite 9 (Brain Tumor): Retains lesion area (${e2eBrainTumor.inference!.metrics.areaPx} px)`);
  assert(e2eBrainTumor.inference!.confidence >= 0.70, `Suite 9 (Brain Tumor): Confidence >= 0.70 (${e2eBrainTumor.inference!.confidence})`);
  assert(e2eBrainTumor.measurements.length >= 4, `Suite 9 (Brain Tumor): RECIST measurements >= 4 (got ${e2eBrainTumor.measurements.length})`);
  assert(brainTumorVerdict.dangerLevel === 5, 'Suite 9 (Brain Tumor): GBM evaluates to Danger Level 5 (Critical)');
  assert(brainTumorVerdict.dangerTitle === 'Critical (Level 5/5)', 'Suite 9 (Brain Tumor): Danger title is Critical (Level 5/5)');
  assert(e2eBrainTumor.report.markdown.includes('consistent with potential lesion tissue'), 'Suite 9 (Brain Tumor): Report documents lesion tissue');

  // 9B: Lung Tumor (Spiculated Adenocarcinoma)
  const e2eLungTumor = await runAnalysis({
    image: {
      fileName: lungTumorCase.fileName,
      contentType: 'image/svg+xml',
      sizeBytes: lungTumorBytes.length,
      bytes: lungTumorBytes,
    },
    clinicalText: lungTumorCase.clinicalNotes,
    manualOrgan: lungTumorCase.organ,
  });
  const lungTumorVerdict = calculateTumorVerdict(e2eLungTumor);
  assert(e2eLungTumor.clinical.isNormalOrNegative === false, 'Suite 9 (Lung Tumor): isNormalOrNegative is false');
  assert(e2eLungTumor.clinical.findings.length > 0, 'Suite 9 (Lung Tumor): Affirmed findings present');
  assert(e2eLungTumor.inference!.metrics.areaPx > 100, `Suite 9 (Lung Tumor): Retains lesion area (${e2eLungTumor.inference!.metrics.areaPx} px)`);
  assert(e2eLungTumor.inference!.confidence >= 0.70, `Suite 9 (Lung Tumor): Confidence >= 0.70 (${e2eLungTumor.inference!.confidence})`);
  assert(e2eLungTumor.measurements.length >= 4, `Suite 9 (Lung Tumor): RECIST measurements >= 4 (got ${e2eLungTumor.measurements.length})`);
  assert(lungTumorVerdict.dangerLevel >= 3, 'Suite 9 (Lung Tumor): Danger Level >= 3');
  assert(e2eLungTumor.report.markdown.includes('consistent with potential lesion tissue'), 'Suite 9 (Lung Tumor): Report documents lesion tissue');

  // 9C: Pancreas Tumor (Head Adenocarcinoma)
  const e2ePancreasTumor = await runAnalysis({
    image: {
      fileName: pancreasTumorCase.fileName,
      contentType: 'image/svg+xml',
      sizeBytes: pancTumorBytes.length,
      bytes: pancTumorBytes,
    },
    clinicalText: pancreasTumorCase.clinicalNotes,
    manualOrgan: pancreasTumorCase.organ,
  });
  const pancTumorVerdict = calculateTumorVerdict(e2ePancreasTumor);
  assert(e2ePancreasTumor.clinical.isNormalOrNegative === false, 'Suite 9 (Pancreas Tumor): isNormalOrNegative is false');
  assert(e2ePancreasTumor.clinical.findings.length > 0, 'Suite 9 (Pancreas Tumor): Affirmed findings present');
  assert(e2ePancreasTumor.inference!.metrics.areaPx > 100, `Suite 9 (Pancreas Tumor): Retains lesion area (${e2ePancreasTumor.inference!.metrics.areaPx} px)`);
  assert(e2ePancreasTumor.inference!.confidence >= 0.70, `Suite 9 (Pancreas Tumor): Confidence >= 0.70 (${e2ePancreasTumor.inference!.confidence})`);
  assert(e2ePancreasTumor.measurements.length >= 4, `Suite 9 (Pancreas Tumor): RECIST measurements >= 4 (got ${e2ePancreasTumor.measurements.length})`);
  assert(pancTumorVerdict.dangerLevel >= 3, 'Suite 9 (Pancreas Tumor): Danger Level >= 3');
  assert(e2ePancreasTumor.report.markdown.includes('consistent with potential lesion tissue'), 'Suite 9 (Pancreas Tumor): Report documents lesion tissue');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 10: Clinical Negation Suppression of Uncorroborated Detections
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 10] Clinical Negation Suppression of Uncorroborated Detections${RESET}`);

  const normalBrainClinical = extractClinicalInfoWithRules(brainNormalCase.clinicalNotes);
  const normalLungClinical = extractClinicalInfoWithRules(lungNormalCase.clinicalNotes);

  // 10A: Uncorroborated Brain candidate detection (35 px, conf 0.45)
  const candidateBrainInference: InferenceResult = {
    organ: 'brain',
    modelFile: 'brain_unet.onnx',
    width: 256,
    height: 256,
    maskBase64: encodeRgbaPng(256, 256, new Uint8Array(256 * 256 * 4)),
    confidence: 0.45,
    metrics: {
      areaPx: 35,
      areaFraction: 35 / (256 * 256),
      bbox: { x: 100, y: 100, w: 10, h: 10 },
      centroid: { x: 105, y: 105 },
      equivalentDiameterPx: 6.7,
    },
    warnings: [],
    processingMs: 12,
    engine: 'mock',
  };
  const gatedBrain = applyConcordanceGating(normalBrainClinical, candidateBrainInference);
  assert(gatedBrain.metrics.areaPx === 0, 'Suite 10: Uncorroborated Brain candidate suppressed to 0 px');
  assert(gatedBrain.confidence === 0.0, 'Suite 10: Uncorroborated Brain candidate confidence reset to 0.0');
  assert(gatedBrain.metrics.bbox === null, 'Suite 10: Uncorroborated Brain candidate bbox reset to null');
  assert(gatedBrain.warnings.some((w) => w.includes('Negative clinical study gating')), 'Suite 10: Negative clinical study gating warning attached');
  const dummyBrainResult = {
    inference: gatedBrain,
    routing: { modelKey: 'brain' },
    clinical: normalBrainClinical,
  } as any;
  assert(calculateTumorVerdict(dummyBrainResult).dangerLevel === 0, 'Suite 10: Suppressed candidate evaluates to Danger Level 0');
  assert(calculateTumorVerdict(dummyBrainResult).dangerTitle === 'Clear / No Lesion (0/5)', 'Suite 10: Danger title is Clear / No Lesion (0/5)');

  // 10B: Uncorroborated Lung candidate detection (40 px, conf 0.50)
  const candidateLungInference: InferenceResult = {
    organ: 'lung',
    modelFile: 'lung_unet.onnx',
    width: 256,
    height: 256,
    maskBase64: encodeRgbaPng(256, 256, new Uint8Array(256 * 256 * 4)),
    confidence: 0.50,
    metrics: {
      areaPx: 40,
      areaFraction: 40 / (256 * 256),
      bbox: { x: 80, y: 80, w: 12, h: 12 },
      centroid: { x: 86, y: 86 },
      equivalentDiameterPx: 7.1,
    },
    warnings: [],
    processingMs: 10,
    engine: 'mock',
  };
  const gatedLung = applyConcordanceGating(normalLungClinical, candidateLungInference);
  assert(gatedLung.metrics.areaPx === 0, 'Suite 10: Uncorroborated Lung candidate suppressed to 0 px');
  assert(gatedLung.confidence === 0.0, 'Suite 10: Uncorroborated Lung candidate confidence reset to 0.0');
  const dummyLungResult = {
    inference: gatedLung,
    routing: { modelKey: 'lung' },
    clinical: normalLungClinical,
  } as any;
  assert(calculateTumorVerdict(dummyLungResult).dangerLevel === 0, 'Suite 10: Suppressed lung candidate evaluates to Danger Level 0');

  // 10C: Discordance Protection Guard: Unequivocal high-confidence visual lesion (120 px, conf 0.85)
  const highConfVisualInference: InferenceResult = {
    organ: 'brain',
    modelFile: 'brain_unet.onnx',
    width: 256,
    height: 256,
    maskBase64: encodeRgbaPng(256, 256, new Uint8Array(256 * 256 * 4)),
    confidence: 0.85,
    metrics: {
      areaPx: 120,
      areaFraction: 120 / (256 * 256),
      bbox: { x: 50, y: 50, w: 25, h: 25 },
      centroid: { x: 62, y: 62 },
      equivalentDiameterPx: 12.3,
    },
    warnings: [],
    processingMs: 15,
    engine: 'mock',
  };
  const gatedHighConf = applyConcordanceGating(normalBrainClinical, highConfVisualInference);
  assert(gatedHighConf.metrics.areaPx === 120, 'Suite 10: Unequivocal high-confidence lesion is NOT suppressed');
  assert(gatedHighConf.confidence === 0.85, 'Suite 10: Unequivocal high-confidence lesion maintains confidence');
  assert(gatedHighConf.warnings.some((w) => w.includes('CRITICAL CLINICAL-RADIOLOGICAL DISCORDANCE')), 'Suite 10: Critical discordance warning attached for review');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 11: Unremarkable Parenchyma with Non-Tumor Benign Findings
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 11] Unremarkable Parenchyma with Non-Tumor Benign Findings${RESET}`);

  // 11A: Brain MRI — Age-Related Chronic Microvascular Ischemic Changes
  const ischemicBrainText = `Axial T2/FLAIR MRI of the brain. Mild patchy periventricular white matter hyperintensities consistent with chronic microvascular ischemic disease. No acute territorial infarction, intracranial hemorrhage, mass effect, midline shift, or enhancing neoplasm. Ventricles and sulci age-appropriate.`;
  const e2eIschemicBrain = await runAnalysis({
    image: {
      fileName: 'brain_mri_flair_patient_ischemic.png',
      contentType: 'image/svg+xml',
      sizeBytes: brainNormalBytes.length,
      bytes: brainNormalBytes,
    },
    clinicalText: ischemicBrainText,
    manualOrgan: 'brain',
  });
  const ischemicVerdict = calculateTumorVerdict(e2eIschemicBrain);
  assert(e2eIschemicBrain.clinical.isNormalOrNegative === true, 'Suite 11 (Brain Ischemic): isNormalOrNegative is true');
  assert(e2eIschemicBrain.clinical.findings.length === 0, 'Suite 11 (Brain Ischemic): Zero affirmed neoplasm findings');
  assert(e2eIschemicBrain.inference!.metrics.areaPx === 0, 'Suite 11 (Brain Ischemic): Output area is 0 px');
  assert(e2eIschemicBrain.inference!.confidence === 0.0, 'Suite 11 (Brain Ischemic): Confidence is 0.0');
  assert(ischemicVerdict.dangerLevel === 0, 'Suite 11 (Brain Ischemic): Danger Level is 0');
  assert(ischemicVerdict.dangerTitle === 'Clear / No Lesion (0/5)', 'Suite 11 (Brain Ischemic): Danger title is Clear / No Lesion (0/5)');

  // 11B: Lung CT — Dependent Atelectasis / Clear Parenchyma
  const atelectasisLungText = `High-resolution chest CT. Mild bibasilar dependent subsegmental atelectasis clearing anteriorly. No solitary pulmonary nodule, consolidation, or pleural mass. Normal hilar and mediastinal lymph nodes. Unremarkable examination.`;
  const e2eAtelectasisLung = await runAnalysis({
    image: {
      fileName: 'lung_chest_ct_atelectasis.png',
      contentType: 'image/svg+xml',
      sizeBytes: lungNormalBytes.length,
      bytes: lungNormalBytes,
    },
    clinicalText: atelectasisLungText,
    manualOrgan: 'lung',
  });
  const atelectasisVerdict = calculateTumorVerdict(e2eAtelectasisLung);
  assert(e2eAtelectasisLung.clinical.isNormalOrNegative === true, 'Suite 11 (Lung Atelectasis): isNormalOrNegative is true');
  assert(e2eAtelectasisLung.clinical.findings.length === 0, 'Suite 11 (Lung Atelectasis): Zero affirmed neoplasm findings');
  assert(e2eAtelectasisLung.inference!.metrics.areaPx === 0, 'Suite 11 (Lung Atelectasis): Output area is 0 px');
  assert(e2eAtelectasisLung.inference!.confidence === 0.0, 'Suite 11 (Lung Atelectasis): Confidence is 0.0');
  assert(atelectasisVerdict.dangerLevel === 0, 'Suite 11 (Lung Atelectasis): Danger Level is 0');

  // 11C: Pancreas CT — Parenchymal Fatty Infiltration & Senile Atrophy
  const fattyAtrophyPancreasText = `Contrast-enhanced abdominal CT. Diffuse fatty replacement and mild parenchymal atrophy of the pancreas consistent with age. No focal hypodense mass, cyst, or necrosis in the pancreatic head, body, or tail. Main pancreatic duct is non-dilated (1.5 mm). Common bile duct normal caliber. Unremarkable pancreas.`;
  const e2eFattyPancreas = await runAnalysis({
    image: {
      fileName: 'pancreas_ct_fatty_atrophy.png',
      contentType: 'image/svg+xml',
      sizeBytes: pancNormalBytes.length,
      bytes: pancNormalBytes,
    },
    clinicalText: fattyAtrophyPancreasText,
    manualOrgan: 'pancreas',
  });
  const fattyPancreasVerdict = calculateTumorVerdict(e2eFattyPancreas);
  assert(e2eFattyPancreas.clinical.isNormalOrNegative === true, 'Suite 11 (Pancreas Fatty Atrophy): isNormalOrNegative is true');
  assert(e2eFattyPancreas.clinical.findings.length === 0, 'Suite 11 (Pancreas Fatty Atrophy): Zero affirmed neoplasm findings');
  assert(e2eFattyPancreas.inference!.metrics.areaPx === 0, 'Suite 11 (Pancreas Fatty Atrophy): Output area is 0 px');
  assert(e2eFattyPancreas.inference!.confidence === 0.0, 'Suite 11 (Pancreas Fatty Atrophy): Confidence is 0.0');
  assert(fattyPancreasVerdict.dangerLevel === 0, 'Suite 11 (Pancreas Fatty Atrophy): Danger Level is 0');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 12: Pixel-Level Zero Mask Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}[Suite 12] Pixel-Level Zero Mask Verification${RESET}`);

  function decodePngRgba(base64Png: string): Uint8Array {
    const buf = Buffer.from(base64Png, 'base64');
    let offset = 8;
    const idatParts: Buffer[] = [];
    let width = 256;
    let height = 256;
    while (offset + 8 <= buf.length) {
      const len = buf.readUInt32BE(offset);
      const type = buf.toString('ascii', offset + 4, offset + 8);
      if (type === 'IHDR') {
        width = buf.readUInt32BE(offset + 8);
        height = buf.readUInt32BE(offset + 12);
      } else if (type === 'IDAT') {
        idatParts.push(buf.subarray(offset + 8, offset + 8 + len));
      }
      offset += 12 + len;
    }
    const decompressed = inflateSync(Buffer.concat(idatParts));
    const stride = width * 4;
    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const row = decompressed.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
      rgba.set(row, y * stride);
    }
    return rgba;
  }

  const brainRgba = decodePngRgba(e2eBrainNormal.inference!.maskBase64);
  assert(brainRgba.length === 256 * 256 * 4, 'Suite 12: Brain normal mask has 262,144 RGBA bytes (256x256)');
  assert(brainRgba.every((b) => b === 0), 'Suite 12: Brain normal control mask contains strictly 0 for ALL RGBA bytes');

  const lungRgba = decodePngRgba(e2eLungNormal.inference!.maskBase64);
  assert(lungRgba.length === 256 * 256 * 4, 'Suite 12: Lung normal mask has 262,144 RGBA bytes (256x256)');
  assert(lungRgba.every((b) => b === 0), 'Suite 12: Lung normal control mask contains strictly 0 for ALL RGBA bytes');

  const pancreasRgba = decodePngRgba(e2ePancreasNormal.inference!.maskBase64);
  assert(pancreasRgba.length === 256 * 256 * 4, 'Suite 12: Pancreas normal mask has 262,144 RGBA bytes (256x256)');
  assert(pancreasRgba.every((b) => b === 0), 'Suite 12: Pancreas normal control mask contains strictly 0 for ALL RGBA bytes');

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
