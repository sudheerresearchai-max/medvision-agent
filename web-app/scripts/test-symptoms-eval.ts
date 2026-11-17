import { runAnalysis } from '../lib/agent';

async function main() {
  console.log('Testing Symptoms-Only Clinical Analysis...');
  const resSymptomsOnly = await runAnalysis({
    clinicalText: '58-year-old male with 3-week progressive morning headache, new-onset focal motor seizure, and left arm weakness.',
    manualOrgan: 'brain',
  });

  console.log('Case ID:', resSymptomsOnly.caseId);
  console.log('Inference:', resSymptomsOnly.inference);
  console.log('Symptom Analysis:', Boolean(resSymptomsOnly.symptomAnalysis));
  if (resSymptomsOnly.symptomAnalysis) {
    console.log('  Primary Complaint:', resSymptomsOnly.symptomAnalysis.primaryComplaint);
    console.log('  Acuity Level:', resSymptomsOnly.symptomAnalysis.acuityLevel);
    console.log('  Differentials:', resSymptomsOnly.symptomAnalysis.differentials.map(d => `${d.condition} (${d.probability})`));
    console.log('  Recommended Imaging:', resSymptomsOnly.symptomAnalysis.recommendedImaging.map(i => `${i.modality} (${i.urgency})`));
  }

  console.log('\nTesting Routine / Mild Symptoms...');
  const resRoutine = await runAnalysis({
    clinicalText: '42yo female with mild tension headache responsive to acetaminophen. Normal neuro exam.',
    manualOrgan: 'brain',
  });
  console.log('Routine Acuity:', resRoutine.symptomAnalysis?.acuityLevel);
  console.log('Routine Differentials:', resRoutine.symptomAnalysis?.differentials.map(d => `${d.condition} (${d.probability})`));

  console.log('\nAll tests completed successfully!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
