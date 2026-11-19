import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import { runAnalysis } from '../lib/agent';

dotenv.config({ path: '.env.local' });

async function testScan(filePath: string, label: string, clinicalNotes?: string) {
  console.log(`\n================================================================`);
  console.log(`TESTING ${label.toUpperCase()}: ${filePath}`);
  console.log(`================================================================`);
  
  const fileBytes = fs.readFileSync(filePath);
  const ext = filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
  const fileName = filePath.split(/[/\\]/).pop() || 'scan.jpg';

  const t0 = Date.now();
  const result = await runAnalysis({
    image: {
      fileName,
      bytes: new Uint8Array(fileBytes),
      contentType: ext,
      sizeBytes: fileBytes.length,
    },
    clinicalText: clinicalNotes,
    manualOrgan: 'brain',
  });
  const elapsed = Date.now() - t0;

  console.log(`Execution Time: ${elapsed} ms`);
  console.log(`Case ID: ${result.caseId}`);
  console.log(`Routing: Organ=${result.routing.modelKey}, Modality=${result.routing.modality}, Reason=${result.routing.reason}`);
  console.log(`Inference Engine: ${result.inference?.engine}, Model: ${result.inference?.modelFile}`);
  console.log(`Confidence: ${result.inference?.confidence}`);
  console.log(`Resolution: ${result.inference?.width}x${result.inference?.height} px`);
  console.log(`Lesion Area: ${result.inference?.metrics.areaPx} px (${((result.inference?.metrics.areaFraction ?? 0) * 100).toFixed(2)}%)`);
  console.log(`Bounding Box:`, result.inference?.metrics.bbox);
  console.log(`Centroid:`, result.inference?.metrics.centroid);
  console.log(`Equivalent Diameter: ${result.inference?.metrics.equivalentDiameterPx} px`);
  console.log(`RECIST 1.1 Measurements (${result.measurements.length} computed):`);
  for (const m of result.measurements) {
    console.log(`  - ${m.label}: ${m.value} ${m.unit} (${m.note})`);
  }
  console.log(`Warnings & Impression:`);
  for (const w of result.inference?.warnings ?? []) {
    console.log(`  * ${w}`);
  }
  console.log(`\nMulti-Agent Consensus: Score=${result.multiAgentTrace?.consensusScore}, Acuity Level=${result.multiAgentTrace?.acuityRating}/5`);
  return result;
}

async function main() {
  const p1 = 'C:/Users/sudhe/.gemini/antigravity/brain/4fd7af63-fb9a-4ce9-ac69-a53a154091ba/.user_uploaded/media_1795092566142_b42326c0.jpg';
  const p2 = 'C:/Users/sudhe/.gemini/antigravity/brain/4fd7af63-fb9a-4ce9-ac69-a53a154091ba/.user_uploaded/media_1795092566205_842206b7.jpg';

  const res1 = await testScan(p1, 'Scan 1: Healthy Control Brain MRI (T2 Axial)', 'Routine health checkup. Patient is asymptomatic. No neurological deficits.');
  const res2 = await testScan(p2, 'Scan 2: Pathological Glioblastoma Brain MRI (T1CE Axial)', 'Patient presents with progressive left-sided weakness, headaches, and papilledema.');

  // Save results to scratch json for report enrichment
  fs.writeFileSync('C:/Users/sudhe/.gemini/antigravity/brain/4fd7af63-fb9a-4ce9-ac69-a53a154091ba/scratch/scan_test_results.json', JSON.stringify({
    scan1_normal: {
      fileName: 'media_1795092566142_b42326c0.jpg',
      resolution: `${res1.inference?.width}x${res1.inference?.height}`,
      areaPx: res1.inference?.metrics.areaPx,
      confidence: res1.inference?.confidence,
      engine: res1.inference?.engine,
      model: res1.inference?.modelFile,
      warnings: res1.inference?.warnings,
      measurementsCount: res1.measurements.length,
      acuity: res1.multiAgentTrace?.acuityRating,
    },
    scan2_tumor: {
      fileName: 'media_1795092566205_842206b7.jpg',
      resolution: `${res2.inference?.width}x${res2.inference?.height}`,
      areaPx: res2.inference?.metrics.areaPx,
      areaFraction: res2.inference?.metrics.areaFraction,
      bbox: res2.inference?.metrics.bbox,
      centroid: res2.inference?.metrics.centroid,
      eqDiameter: res2.inference?.metrics.equivalentDiameterPx,
      confidence: res2.inference?.confidence,
      engine: res2.inference?.engine,
      model: res2.inference?.modelFile,
      measurements: res2.measurements,
      warnings: res2.inference?.warnings,
      acuity: res2.multiAgentTrace?.acuityRating,
      maskBase64: res2.inference?.maskBase64 ? res2.inference.maskBase64.slice(0, 100) + '...' : null,
    }
  }, null, 2));

  console.log('\nSaved structured test telemetry to scratch/scan_test_results.json');
}

main().catch(console.error);
