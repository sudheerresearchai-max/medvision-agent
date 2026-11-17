import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import { callGeminiVision } from '../lib/geminiVision';
import { SAMPLE_CASES } from '../lib/sampleCases';

dotenv.config({ path: '.env.local' });

async function run() {
  const normalCase = SAMPLE_CASES.find(c => c.isControl && c.organ === 'brain');
  if (normalCase) {
    const b64 = normalCase.imageDataUrl.replace(/^data:image\/[^;]+;base64,/, '');
    const normalBytes = Buffer.from(b64, 'base64');

    console.log('Testing callGeminiVision on NORMAL control brain scan...');
    const normalRes = await callGeminiVision({
      organ: 'brain',
      fileName: 'normal_control_scan.png',
      fileBytes: normalBytes,
    });

    console.log('Normal Control Result:', {
      modelFile: normalRes?.modelFile,
      confidence: normalRes?.confidence,
      areaPx: normalRes?.metrics.areaPx,
      warnings: normalRes?.warnings,
    });
  }
}

run();
