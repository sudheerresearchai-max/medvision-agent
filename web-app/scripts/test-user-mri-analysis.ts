import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import { runAnalysis } from '../lib/agent';

dotenv.config({ path: '.env.local' });

async function run() {
  const imgPath = 'C:/Users/sudhe/.gemini/antigravity/brain/4fd7af63-fb9a-4ce9-ac69-a53a154091ba/.user_uploaded/media_1794902371440_43bd7f8c.png';
  const fileBytes = fs.readFileSync(imgPath);

  console.log('Running complete runAnalysis on user uploaded MRI scan...');
  const result = await runAnalysis({
    image: {
      fileName: 'axial_t1ce_scan.png',
      bytes: new Uint8Array(fileBytes),
      contentType: 'image/png',
      sizeBytes: fileBytes.length,
    },
    manualOrgan: 'brain',
  });

  console.log('\n=== ANALYSIS RESULT ===');
  console.log('Routing:', result.routing.modelKey, 'Modality:', result.routing.modality);
  console.log('Model:', result.inference?.modelFile, 'Engine:', result.inference?.engine);
  console.log('Confidence:', result.inference?.confidence);
  console.log('Area Px:', result.inference?.metrics.areaPx);
  console.log('RECIST Measurements count:', result.measurements.length);
  console.log('Warnings:', result.inference?.warnings);
  console.log('\nReport Preview:\n', result.report.markdown.slice(0, 500));
}

run();
