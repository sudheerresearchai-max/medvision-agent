/**
 * MedVision Agent — Preloaded Clinical Demonstration Cases.
 * 
 * Provides instant 1-click clinical evaluation datasets for presentations,
 * vivas, and interactive demonstrations across Neuro, Thoracic, and Abdominal oncology.
 */

import type { Organ } from './types';

export interface SampleCase {
  id: string;
  title: string;
  organ: Organ;
  modality: 'MRI' | 'CT';
  diagnosis: string;
  patientProfile: string;
  clinicalNotes: string;
  fileName: string;
  imageDataUrl: string;
  badge: string;
}

// Generate realistic synthetic medical scan SVG data URLs (grayscale raster compatible)
function createSyntheticBrainMri(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#050508"/>
    <!-- Cranial Vault Outline -->
    <ellipse cx="128" cy="128" rx="88" ry="102" fill="#181824" stroke="#484860" stroke-width="4"/>
    <ellipse cx="128" cy="128" rx="82" ry="96" fill="#0c0c14"/>
    <!-- Cerebral Hemispheres (Parenchyma) -->
    <path d="M128,34 Q105,45 80,75 Q55,115 58,155 Q62,200 128,222 Q194,200 198,155 Q201,115 176,75 Q151,45 128,34 Z" fill="#20202e"/>
    <!-- Ventricles -->
    <path d="M128,95 Q115,115 118,145 Q128,155 128,160 Q128,155 138,145 Q141,115 128,95 Z" fill="#07070c"/>
    <ellipse cx="110" cy="125" rx="6" ry="18" fill="#080810"/>
    <ellipse cx="146" cy="125" rx="6" ry="18" fill="#080810"/>
    <!-- Interhemispheric Fissure -->
    <line x1="128" y1="36" x2="128" y2="220" stroke="#12121c" stroke-width="2"/>
    <!-- Right Frontal/Temporal Lesion (Hyperintense Enhancing Mass) -->
    <ellipse cx="88" cy="115" rx="22" ry="26" fill="#8888a8" opacity="0.85" filter="drop-shadow(0px 0px 8px #9090b8)"/>
    <ellipse cx="88" cy="115" rx="14" ry="17" fill="#bcbccf" opacity="0.95"/>
    <ellipse cx="86" cy="113" rx="7" ry="8" fill="#dedee8"/>
    <!-- Perilesional Edema Ring -->
    <ellipse cx="88" cy="115" rx="28" ry="33" fill="none" stroke="#484868" stroke-width="3" opacity="0.6"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function createSyntheticLungCt(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#020204"/>
    <!-- Thoracic Cage -->
    <ellipse cx="128" cy="128" rx="105" ry="85" fill="#14141a" stroke="#606070" stroke-width="5"/>
    <!-- Left & Right Lung Fields (Low Attenuation Air Space) -->
    <path d="M75,65 Q115,70 115,120 Q115,185 75,190 Q40,185 45,125 Q50,75 75,65 Z" fill="#050508"/>
    <path d="M181,65 Q141,70 141,120 Q141,185 181,190 Q216,185 211,125 Q206,75 181,65 Z" fill="#050508"/>
    <!-- Mediastinum & Cardiac Silhouette -->
    <ellipse cx="132" cy="138" rx="28" ry="42" fill="#242432"/>
    <!-- Spine / Vertebral Body -->
    <circle cx="128" cy="202" r="14" fill="#686878" stroke="#8c8c9e" stroke-width="2"/>
    <circle cx="128" cy="202" r="6" fill="#121218"/>
    <!-- Left Upper Lobe Spiculated Solitary Pulmonary Nodule (Hyperdense Mass) -->
    <ellipse cx="178" cy="105" rx="16" ry="14" fill="#a4a4b8" opacity="0.95"/>
    <circle cx="176" cy="103" r="8" fill="#d0d0e0"/>
    <!-- Spiculations -->
    <line x1="178" y1="90" x2="178" y2="120" stroke="#8888a0" stroke-width="1.5"/>
    <line x1="162" y1="105" x2="194" y2="105" stroke="#8888a0" stroke-width="1.5"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function createSyntheticPancreasCt(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#030305"/>
    <!-- Abdominal Cavity Outline -->
    <ellipse cx="128" cy="128" rx="108" ry="92" fill="#181822" stroke="#505068" stroke-width="4"/>
    <!-- Liver (Right Upper Quadrant) -->
    <path d="M50,85 Q110,65 125,100 Q120,175 60,170 Q35,150 50,85 Z" fill="#2c2c3c"/>
    <!-- Spleen (Left Upper Quadrant) -->
    <path d="M205,95 Q220,135 195,160 Q180,140 185,105 Z" fill="#282836"/>
    <!-- Spine / Aorta -->
    <circle cx="128" cy="195" r="13" fill="#68687a" stroke="#8a8a9c" stroke-width="2"/>
    <circle cx="120" cy="172" r="7" fill="#1a1a24" stroke="#48485c" stroke-width="1.5"/>
    <!-- Pancreatic Parenchyma (C-Loop to Splenic Hilum) -->
    <path d="M95,130 Q128,115 168,125 Q175,135 165,142 Q130,135 98,148 Z" fill="#3a3a4e" stroke="#5a5a72" stroke-width="1"/>
    <!-- Pancreatic Head Hypodense Lesion (Adenocarcinoma Target) -->
    <ellipse cx="106" cy="136" rx="14" ry="12" fill="#7a7a92" opacity="0.9"/>
    <ellipse cx="106" cy="136" rx="8" ry="7" fill="#aaaaC0"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'case-demo-brain-01',
    title: 'Glioblastoma Multiforme (Right Frontal)',
    organ: 'brain',
    modality: 'MRI',
    diagnosis: 'High-Grade Glioma / Glioblastoma Suspect',
    patientProfile: '58-year-old male · Axial T1-CE MRI',
    clinicalNotes: `Patient is a 58-year-old male presenting with a 3-week history of progressive holocranial headache, morning nausea, and a recent new-onset focal motor seizure involving the left upper extremity.
Pre-operative brain MRI with gadolinium contrast demonstrates a prominent heterogeneous ring-enhancing mass centered within the right fronto-temporal parenchyma. Significant surrounding perilesional vasogenic edema with approximately 4 mm midline shift toward the left. Clinical findings suggestive of high-grade glial neoplasm.`,
    fileName: 'brain_mri_axial_t1ce_case01.png',
    imageDataUrl: createSyntheticBrainMri(),
    badge: 'Neuro-Oncology',
  },
  {
    id: 'case-demo-lung-02',
    title: 'Non-Small Cell Lung Carcinoma (LUL)',
    organ: 'lung',
    modality: 'CT',
    diagnosis: 'Spiculated Pulmonary Adenocarcinoma',
    patientProfile: '64-year-old female · High-Resolution Chest CT',
    clinicalNotes: `64-year-old female, 35 pack-year smoking history, referred for evaluation of non-resolving dry cough and 4 kg unintended weight loss over 2 months.
Non-contrast high-resolution chest CT scan reveals a 2.3 cm solitary spiculated pulmonary nodule in the anterior segment of the left upper lobe (LUL). Associated subtle pleural tagging noted with no gross mediastinal lymphadenopathy. Primary bronchial carcinoma / adenocarcinoma strongly suspected.`,
    fileName: 'lung_chest_ct_axial_case02.png',
    imageDataUrl: createSyntheticLungCt(),
    badge: 'Thoracic Oncology',
  },
  {
    id: 'case-demo-pancreas-03',
    title: 'Pancreatic Head Adenocarcinoma',
    organ: 'pancreas',
    modality: 'CT',
    diagnosis: 'Pancreatic Ductal Adenocarcinoma (PDAC)',
    patientProfile: '61-year-old male · Contrast-Enhanced Abdominal CT',
    clinicalNotes: `61-year-old male presenting with progressive painless obstructive jaundice, dark urine, pale stools, and epigastric discomfort radiating to the mid-back.
Triple-phase contrast-enhanced abdominal CT demonstrates a poorly-defined hypoattenuating mass measuring approximately 2.1 cm localized in the head of the pancreas. Associated mild dilatation of the common bile duct (CBD) and pancreatic duct (double-duct sign). Findings are characteristic of pancreatic ductal adenocarcinoma.`,
    fileName: 'pancreas_abd_ct_case03.png',
    imageDataUrl: createSyntheticPancreasCt(),
    badge: 'Abdominal Oncology',
  },
];
