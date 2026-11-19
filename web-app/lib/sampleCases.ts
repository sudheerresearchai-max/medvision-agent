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
  isControl?: boolean;
}

// Generate realistic synthetic medical scan SVG data URLs (grayscale raster compatible)
function createSyntheticBrainMri(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <radialGradient id="gbmScalp" cx="50%" cy="50%" r="50%">
        <stop offset="85%" stop-color="#14141c"/>
        <stop offset="96%" stop-color="#555566"/>
        <stop offset="100%" stop-color="#08080c"/>
      </radialGradient>
      <radialGradient id="gbmParenchyma" cx="50%" cy="48%" r="48%">
        <stop offset="0%" stop-color="#3e3e4c"/>
        <stop offset="68%" stop-color="#30303c"/>
        <stop offset="92%" stop-color="#20202a"/>
        <stop offset="100%" stop-color="#121218"/>
      </radialGradient>
      <radialGradient id="gbmEdema" cx="88" cy="115" r="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#262634" stop-opacity="0.95"/>
        <stop offset="60%" stop-color="#2c2c3a" stop-opacity="0.75"/>
        <stop offset="85%" stop-color="#242430" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#20202a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gbmRing" cx="87" cy="114" r="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#14141e"/>
        <stop offset="38%" stop-color="#181822"/>
        <stop offset="58%" stop-color="#78788e"/>
        <stop offset="80%" stop-color="#d6d6e8"/>
        <stop offset="92%" stop-color="#eaeaf8"/>
        <stop offset="100%" stop-color="#58586c"/>
      </radialGradient>
    </defs>

    <rect width="256" height="256" fill="#040406"/>

    <!-- Cranial Calvarium (Skull Diploe & Scalp Fat) -->
    <ellipse cx="128" cy="128" rx="90" ry="104" fill="url(#gbmScalp)"/>
    <ellipse cx="128" cy="128" rx="84" ry="98" fill="#08080e" stroke="#282836" stroke-width="2.5"/>

    <!-- Cerebral Parenchyma (Deep White Matter & Gray Matter) -->
    <path d="M128,34 Q106,42 82,72 Q56,112 58,154 Q61,198 128,222 Q195,198 198,154 Q200,112 174,72 Q150,42 128,34 Z" fill="url(#gbmParenchyma)"/>

    <!-- Anatomical Sulci & Fissures -->
    <path d="M128,36 L128,92 M128,162 L128,220" stroke="#12121a" stroke-width="2" stroke-linecap="round"/>
    <path d="M72,82 Q90,95 108,90 M184,82 Q166,95 148,90" stroke="#181822" stroke-width="1.8" fill="none" opacity="0.6"/>
    <path d="M64,136 Q84,142 98,136 M192,136 Q172,142 158,136" stroke="#181822" stroke-width="1.8" fill="none" opacity="0.6"/>
    <path d="M78,178 Q96,170 114,180 M178,178 Q160,170 142,180" stroke="#181822" stroke-width="1.8" fill="none" opacity="0.6"/>

    <!-- Perilesional Edema Zone (Hypointense perilesional swelling) -->
    <ellipse cx="88" cy="115" rx="34" ry="38" fill="url(#gbmEdema)"/>

    <!-- Lateral Ventricles with Mass Effect (Effaced Right Frontal Horn) -->
    <path d="M122,100 Q116,118 118,142 Q124,148 126,140 Q124,118 124,100 Z" fill="#08080e" stroke="#14141c" stroke-width="1"/>
    <path d="M134,98 Q142,118 140,146 Q132,154 130,142 Q132,118 132,98 Z" fill="#06060c" stroke="#14141c" stroke-width="1"/>
    <ellipse cx="114" cy="162" rx="4" ry="12" fill="#08080e"/>
    <ellipse cx="142" cy="164" rx="5" ry="14" fill="#06060c"/>

    <!-- Right Frontal/Temporal Lesion (Hyperintense Enhancing Mass) - Glioblastoma Multiforme -->
    <ellipse cx="88" cy="115" rx="23" ry="27" fill="url(#gbmRing)" stroke="#b8b8cc" stroke-width="1.5" opacity="0.95"/>
    <!-- Central Liquefactive Necrotic Core -->
    <ellipse cx="87" cy="114" rx="11" ry="13" fill="#14141e" stroke="#484858" stroke-width="1"/>
    <!-- Hyperintense Mural Enhancing Nodule -->
    <ellipse cx="98" cy="110" rx="4" ry="5" fill="#f0f0fa" opacity="0.9"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function createSyntheticBrainMriNormal(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <radialGradient id="normScalp" cx="50%" cy="50%" r="50%">
        <stop offset="85%" stop-color="#14141c"/>
        <stop offset="96%" stop-color="#555566"/>
        <stop offset="100%" stop-color="#08080c"/>
      </radialGradient>
      <radialGradient id="normParenchyma" cx="50%" cy="48%" r="48%">
        <stop offset="0%" stop-color="#3e3e4c"/>
        <stop offset="68%" stop-color="#30303c"/>
        <stop offset="92%" stop-color="#20202a"/>
        <stop offset="100%" stop-color="#121218"/>
      </radialGradient>
    </defs>

    <rect width="256" height="256" fill="#040406"/>

    <!-- Cranial Calvarium -->
    <ellipse cx="128" cy="128" rx="90" ry="104" fill="url(#normScalp)"/>
    <ellipse cx="128" cy="128" rx="84" ry="98" fill="#08080e" stroke="#282836" stroke-width="2.5"/>

    <!-- Symmetric Normal Parenchyma -->
    <path d="M128,34 Q106,42 82,72 Q56,112 58,154 Q61,198 128,222 Q195,198 198,154 Q200,112 174,72 Q150,42 128,34 Z" fill="url(#normParenchyma)"/>

    <!-- Straight Midline Interhemispheric Fissure -->
    <line x1="128" y1="36" x2="128" y2="220" stroke="#12121a" stroke-width="2"/>

    <!-- Symmetric Sulcal Convolutions -->
    <path d="M72,82 Q90,95 108,90 M184,82 Q166,95 148,90" stroke="#181822" stroke-width="1.8" fill="none" opacity="0.6"/>
    <path d="M64,136 Q84,142 98,136 M192,136 Q172,142 158,136" stroke="#181822" stroke-width="1.8" fill="none" opacity="0.6"/>
    <path d="M78,178 Q96,170 114,180 M178,178 Q160,170 142,180" stroke="#181822" stroke-width="1.8" fill="none" opacity="0.6"/>

    <!-- Symmetric Normal Ventricular System (Sharp Frontal Horns & Third Ventricle) -->
    <path d="M128,95 Q115,115 118,145 Q128,155 128,160 Q128,155 138,145 Q141,115 128,95 Z" fill="#07070c"/>
    <ellipse cx="110" cy="125" rx="6" ry="18" fill="#080810"/>
    <ellipse cx="146" cy="125" rx="6" ry="18" fill="#080810"/>
    <ellipse cx="114" cy="162" rx="4" ry="12" fill="#08080e"/>
    <ellipse cx="142" cy="164" rx="4" ry="12" fill="#08080e"/>
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

function createSyntheticLungCtNormal(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#020204"/>
    <!-- Thoracic Cage -->
    <ellipse cx="128" cy="128" rx="105" ry="85" fill="#14141a" stroke="#606070" stroke-width="5"/>
    <!-- Clear Bilateral Lung Fields (Normal Aeration, NO NODULES) -->
    <path d="M75,65 Q115,70 115,120 Q115,185 75,190 Q40,185 45,125 Q50,75 75,65 Z" fill="#050508"/>
    <path d="M181,65 Q141,70 141,120 Q141,185 181,190 Q216,185 211,125 Q206,75 181,65 Z" fill="#050508"/>
    <!-- Normal Pulmonary Vasculature branching (no consolidation) -->
    <path d="M85,120 Q95,125 105,122" stroke="#161622" stroke-width="1.5" fill="none"/>
    <path d="M171,120 Q161,125 151,122" stroke="#161622" stroke-width="1.5" fill="none"/>
    <!-- Mediastinum & Cardiac Silhouette -->
    <ellipse cx="132" cy="138" rx="28" ry="42" fill="#242432"/>
    <!-- Spine / Vertebral Body -->
    <circle cx="128" cy="202" r="14" fill="#686878" stroke="#8c8c9e" stroke-width="2"/>
    <circle cx="128" cy="202" r="6" fill="#121218"/>
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

function createSyntheticPancreasCtNormal(): string {
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
    <!-- Homogeneous Normal Pancreatic Parenchyma (NO MASS, NO DUCT DILATATION) -->
    <path d="M95,130 Q128,115 168,125 Q175,135 165,142 Q130,135 98,148 Z" fill="#3a3a4e" stroke="#5a5a72" stroke-width="1"/>
    <!-- Normal subtle parenchyma shading -->
    <path d="M102,132 Q128,120 160,128" stroke="#484860" stroke-width="1" fill="none" opacity="0.6"/>
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
    badge: 'Neuro-Oncology (Tumor)',
    isControl: false,
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
    badge: 'Thoracic Oncology (Tumor)',
    isControl: false,
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
    badge: 'Abdominal Oncology (Tumor)',
    isControl: false,
  },
  {
    id: 'case-demo-brain-normal-04',
    title: 'Normal Cranial MRI (Axial T1-CE)',
    organ: 'brain',
    modality: 'MRI',
    diagnosis: 'Unremarkable Brain MRI — Negative for Mass',
    patientProfile: '42-year-old female · Routine screening / Tension headache',
    clinicalNotes: `42-year-old female presenting with intermittent tension headaches. Patient denies focal weakness, numbness, or seizures.
Axial T1-weighted contrast-enhanced brain MRI demonstrates symmetric cerebral hemispheres with preserved gray-white matter differentiation. Normal ventricular system and basilar cisterns. No evidence of mass effect, midline shift, edema, or abnormal enhancing lesion. The study is negative for intracranial neoplasm. Unremarkable brain MRI.`,
    fileName: 'brain_mri_normal_control_case04.png',
    imageDataUrl: createSyntheticBrainMriNormal(),
    badge: 'Normal Control (Negative)',
    isControl: true,
  },
  {
    id: 'case-demo-lung-normal-05',
    title: 'Normal Chest CT (Axial High-Resolution)',
    organ: 'lung',
    modality: 'CT',
    diagnosis: 'Clear Lung Fields — No Pulmonary Nodule',
    patientProfile: '51-year-old male · Routine pre-operative screening',
    clinicalNotes: `51-year-old male undergoing routine pre-operative thoracic clearance. Non-smoker, denies cough, hemoptysis, or shortness of breath.
Axial high-resolution chest CT shows clear bilateral lung fields with normal vascular arborization. No focal consolidation, ground-glass opacity, or pulmonary nodule identified. Tracheobronchial tree is patent. Mediastinal contours are within normal limits. Negative for thoracic neoplasm. Unremarkable chest CT.`,
    fileName: 'lung_chest_ct_normal_control_case05.png',
    imageDataUrl: createSyntheticLungCtNormal(),
    badge: 'Normal Control (Negative)',
    isControl: true,
  },
  {
    id: 'case-demo-pancreas-normal-06',
    title: 'Normal Abdominal CT (Pancreatic Phase)',
    organ: 'pancreas',
    modality: 'CT',
    diagnosis: 'Normal Pancreas — Negative for Focal Mass',
    patientProfile: '48-year-old male · Evaluation for mild dyspepsia',
    clinicalNotes: `48-year-old male evaluated for mild intermittent dyspepsia. No jaundice, no significant weight loss, normal liver function tests.
Contrast-enhanced axial abdominal CT demonstrates normal pancreatic parenchymal morphology and homogeneous attenuation throughout head, uncinate process, body, and tail. No focal pancreatic mass, necrosis, or cystic lesion. Main pancreatic duct is non-dilated. Common bile duct is of normal caliber. Unremarkable pancreas.`,
    fileName: 'pancreas_abd_ct_normal_control_case06.png',
    imageDataUrl: createSyntheticPancreasCtNormal(),
    badge: 'Normal Control (Negative)',
    isControl: true,
  },
];
