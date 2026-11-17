import assert from 'node:assert';
import { runAnalysis } from '../lib/agent';
import { extractClinicalInfoWithRules } from '../lib/clinicalInfo';
import { detectIsLesionPresent, generateMockPrediction } from '../lib/mockInference';
import { SAMPLE_CASES } from '../lib/sampleCases';

async function runTests() {
  console.log('=== MedVision Agent: Zero False-Positive Regression Suite ===\n');

  // Test 1: All 3 normal control cases produce strictly 0 px, 0.0 confidence, 0 measurements
  console.log('Test 1: Verification of preloaded normal control cases...');
  const normalCases = SAMPLE_CASES.filter((c) => c.isControl);
  assert.strictEqual(normalCases.length, 3, 'Expected 3 control cases');

  for (const c of normalCases) {
    const base64Data = c.imageDataUrl.split(',')[1];
    const imageBytes = Buffer.from(base64Data, 'base64');

    const res = await runAnalysis({
      image: {
        fileName: c.fileName,
        contentType: 'image/svg+xml',
        sizeBytes: imageBytes.length,
        bytes: new Uint8Array(imageBytes),
      },
      clinicalText: c.clinicalNotes,
      manualOrgan: c.organ,
    });

    assert.strictEqual(res.clinical.isNormalOrNegative, true, `${c.id} should be marked isNormalOrNegative`);
    assert.strictEqual(res.clinical.findings.length, 0, `${c.id} should have 0 affirmed findings`);
    assert.strictEqual(res.inference?.metrics.areaPx, 0, `${c.id} must have 0 lesion pixels`);
    assert.strictEqual(res.inference?.confidence, 0.0, `${c.id} must have 0.0 confidence`);
    assert.strictEqual(res.measurements.length, 0, `${c.id} must have 0 measurements`);
    assert.ok(
      res.report.sections.some((s) => s.heading === 'Findings (Model Output)' && s.body.includes('NO suspicious focal lesion')),
      `${c.id} report must explicitly declare negative findings`,
    );
    assert.ok(
      res.multiAgentTrace?.finalConsensusSummary.includes('Scan confirmed negative with zero false positive alarms'),
      `${c.id} multi-agent trace must confirm zero false positive consensus`,
    );
    console.log(`  ✓ ${c.title} PASSED`);
  }

  // Test 2: Normal control image with generic/neutral filename (e.g. 'scan.png')
  console.log('\nTest 2: Normal control image with generic filename (no keyword hints)...');
  const brainNormal = normalCases.find((c) => c.organ === 'brain')!;
  const brainNormalBytes = Buffer.from(brainNormal.imageDataUrl.split(',')[1], 'base64');

  const resNeutralFn = await runAnalysis({
    image: {
      fileName: 'patient_scan_001.png', // Neutral filename without 'normal' or 'control'
      contentType: 'image/svg+xml',
      sizeBytes: brainNormalBytes.length,
      bytes: new Uint8Array(brainNormalBytes),
    },
    clinicalText: brainNormal.clinicalNotes,
    manualOrgan: 'brain',
  });

  assert.strictEqual(resNeutralFn.inference?.metrics.areaPx, 0, 'Must have 0 px on neutral filename');
  assert.strictEqual(resNeutralFn.inference?.confidence, 0.0, 'Must have 0.0 confidence on neutral filename');
  console.log('  ✓ Neutral filename with normal notes PASSED');

  // Test 3: Clean scan with empty clinical text (conservative default: no false positives)
  console.log('\nTest 3: Clean scan with empty clinical text...');
  const resEmptyNotes = await runAnalysis({
    image: {
      fileName: 'routine_cranial_slice.png',
      contentType: 'image/svg+xml',
      sizeBytes: brainNormalBytes.length,
      bytes: new Uint8Array(brainNormalBytes),
    },
    clinicalText: '',
    manualOrgan: 'brain',
  });

  assert.strictEqual(resEmptyNotes.inference?.metrics.areaPx, 0, 'Clean scan without positive indicators must be negative');
  assert.strictEqual(resEmptyNotes.inference?.confidence, 0.0, 'Confidence must be 0.0');
  console.log('  ✓ Clean scan with empty clinical text PASSED');

  // Test 4: Uniform raster scan (e.g. all-black or low variance image)
  console.log('\nTest 4: Low-variance / uniform raster image rejection...');
  const uniformBytes = new Uint8Array(256 * 256).fill(128); // uniform gray
  const uniformDetection = detectIsLesionPresent('lung', uniformBytes, { fileName: 'blank_scan.png' });
  assert.strictEqual(uniformDetection.hasLesion, false, 'Uniform raster must not detect lesion');
  console.log('  ✓ Uniform raster rejection PASSED');

  // Test 5: All 3 positive tumor cases are correctly segmented and measured
  console.log('\nTest 5: Affirmative tumor cases retention (Zero False Negatives)...');
  const tumorCases = SAMPLE_CASES.filter((c) => !c.isControl);
  for (const c of tumorCases) {
    const base64Data = c.imageDataUrl.split(',')[1];
    const imageBytes = Buffer.from(base64Data, 'base64');

    const res = await runAnalysis({
      image: {
        fileName: c.fileName,
        contentType: 'image/svg+xml',
        sizeBytes: imageBytes.length,
        bytes: new Uint8Array(imageBytes),
      },
      clinicalText: c.clinicalNotes,
      manualOrgan: c.organ,
    });

    assert.strictEqual(res.clinical.isNormalOrNegative, false, `${c.id} should NOT be isNormalOrNegative`);
    assert.ok(res.clinical.findings.length > 0, `${c.id} should have affirmative findings`);
    assert.ok((res.inference?.metrics.areaPx ?? 0) > 100, `${c.id} must detect lesion area > 100 px`);
    assert.ok((res.inference?.confidence ?? 0) > 0.70, `${c.id} confidence must be > 0.70`);
    assert.ok(res.measurements.length >= 5, `${c.id} must compute quantitative biomarkers`);
    console.log(`  ✓ ${c.title} PASSED (${res.inference?.metrics.areaPx} px, conf ${res.inference?.confidence})`);
  }

  // Test 6: Clinical Negation Robustness
  console.log('\nTest 6: Complex Clinical Negation Patterns...');
  const clinicalScenarios = [
    { text: 'Brain MRI: No acute intracranial abnormality. Clear study.', expectNormal: true },
    { text: 'CT Chest: Negative for pulmonary nodule or consolidation.', expectNormal: true },
    { text: 'Abdominal CT: Unremarkable pancreas. No focal mass, necrosis, or duct dilatation.', expectNormal: true },
    { text: 'Screening exam: Denies headache or seizures. Scan is normal.', expectNormal: true },
    { text: 'Evaluation for cough: Chest is clear without evidence of mass or malignancy.', expectNormal: true },
    { text: 'Follow-up: Prior nodule has completely resolved. No recurrent lesion.', expectNormal: true },
    { text: 'Indication: Rule out intracranial tumor. Findings: Symmetric parenchyma, no mass.', expectNormal: true },
  ];

  for (const sc of clinicalScenarios) {
    const info = extractClinicalInfoWithRules(sc.text);
    assert.strictEqual(info.isNormalOrNegative, sc.expectNormal, `Scenario "${sc.text}" expected isNormalOrNegative=${sc.expectNormal}`);
    assert.strictEqual(info.findings.length, 0, `Scenario "${sc.text}" should have 0 affirmed findings`);
  }
  console.log(`  ✓ All ${clinicalScenarios.length} clinical negation scenarios PASSED`);

  console.log('\n=== ALL REGRESSION TESTS PASSED (100% Zero False Positive Verified) ===\n');
}

runTests().catch((err) => {
  console.error('\n>>> REGRESSION TEST FAILED <<<', err);
  process.exit(1);
});
