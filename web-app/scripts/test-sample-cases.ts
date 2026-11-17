import { SAMPLE_CASES } from '../lib/sampleCases';
import { runAnalysis } from '../lib/agent';

async function main() {
  console.log('Running analysis on all 6 sample cases...\n');
  for (const c of SAMPLE_CASES) {
    const base64Data = c.imageDataUrl.split(',')[1];
    const imageBytes = Buffer.from(base64Data, 'base64');
    
    try {
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

      console.log(`[${c.id}] isControl=${c.isControl}`);
      console.log(`  Organ: ${res.routing.modelKey}, Modality: ${res.routing.modality}`);
      console.log(`  Clinical isNormalOrNegative: ${res.clinical.isNormalOrNegative}`);
      console.log(`  Clinical findings: [${res.clinical.findings.join(', ')}]`);
      console.log(`  Clinical negated: [${res.clinical.negatedFindings.join(', ')}]`);
      console.log(`  Inference AreaPx: ${res.inference?.metrics.areaPx}, Conf: ${res.inference?.confidence}`);
      console.log(`  Measurements: ${res.measurements.length}`);
      if (c.isControl && res.inference && res.inference.metrics.areaPx > 0) {
        console.error(`  >>> FALSE POSITIVE DETECTED ON NORMAL CONTROL! <<<`);
      } else if (!c.isControl && res.inference && res.inference.metrics.areaPx === 0) {
        console.error(`  >>> FALSE NEGATIVE DETECTED ON TUMOR CASE! <<<`);
      } else {
        console.log(`  >>> CORRECT CLASSIFICATION <<<`);
      }
      console.log('');
    } catch (err) {
      console.error(`[${c.id}] Error:`, err);
    }
  }
}

main();
