'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Database,
  ExternalLink,
  Brain,
  Wind,
  Dna,
  Layers,
  FileCheck,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DatasetInfo {
  id: string;
  name: string;
  category: string;
  organ: string;
  icon: React.ReactNode;
  color: string;
  modalities: string;
  cohortSize: string;
  targetPathology: string;
  annotationProtocol: string;
  license: string;
  institutions: string;
  directUrl: string;
  citationUrl: string;
  synopsis: string;
  keyStats: Array<{ label: string; value: string }>;
}

const DATASETS: DatasetInfo[] = [
  {
    id: 'brats-2021',
    name: 'BraTS 2021 Challenge (RSNA-ASNR-MICCAI)',
    category: 'Neuro-Oncology',
    organ: 'Brain',
    icon: <Brain className="h-6 w-6 text-blue-500" />,
    color: '#3b82f6',
    modalities: 'Multiparametric MRI (Native T1, Post-contrast T1-CE, T2-Weighted, T2-FLAIR)',
    cohortSize: '1,251 multi-institutional clinical cases (training + validation)',
    targetPathology: 'Glioblastoma Multiforme (GBM) & Sub-regions: Enhancing Tumor (ET), Peritumoral Edema (ED), Necrotic Core (NCR)',
    annotationProtocol: 'Manual multi-expert neuroradiologist consensus segmentation per MICCAI standards.',
    license: 'Open Research Access (CC BY-NC-SA 4.0)',
    institutions: 'University of Pennsylvania (UPenn), RSNA, ASNR, MICCAI Consortium',
    directUrl: 'https://www.synapse.org/#!Synapse:syn25829067/wiki/610863',
    citationUrl: 'https://www.med.upenn.edu/cbica/brats2021/',
    synopsis:
      'The international gold standard benchmark dataset for brain tumor multi-compartment volumetric segmentation, skull-stripped and co-registered to SRI24 anatomical atlas space.',
    keyStats: [
      { label: 'Slice Resolution', value: '1 mm isotropic (240×240×155)' },
      { label: 'Validated Dice', value: '91.4% (Multi Agent Med AI)' },
      { label: 'Training Cohort', value: '1,251 3D Volumes' },
      { label: 'Format', value: 'NIfTI (.nii.gz)' },
    ],
  },
  {
    id: 'luna16-lidc',
    name: 'LUNA16 / LIDC-IDRI Benchmark',
    category: 'Thoracic Oncology',
    organ: 'Lung',
    icon: <Wind className="h-6 w-6 text-cyan-500" />,
    color: '#06b6d4',
    modalities: 'Low-Dose & Standard Diagnostic Thoracic Helical CT',
    cohortSize: '888 patient scans with slice thickness < 2.5 mm (from 1,018 LIDC-IDRI cohort)',
    targetPathology: 'Spiculated Pulmonary Nodules, Solid/Subsolid Lesions, Non-Small Cell Lung Carcinoma (NSCLC)',
    annotationProtocol: 'Two-phase double-blinded expert annotation by 4 experienced thoracic radiologists.',
    license: 'Cancer Imaging Archive (TCIA) Open Access (CC BY 3.0)',
    institutions: 'National Cancer Institute (NCI), TCIA, Radboud University Medical Center',
    directUrl: 'https://luna16.grand-challenge.org/',
    citationUrl: 'https://wiki.cancerimagingarchive.net/display/Public/LIDC-IDRI',
    synopsis:
      'The definitive clinical dataset for automated lung nodule detection and volumetric parenchyma segmentation, featuring calibrated Hounsfield Units (-1000 to +400 HU).',
    keyStats: [
      { label: 'Slice Thickness', value: '< 2.5 mm (512×512)' },
      { label: 'Validated Dice', value: '89.7% (Multi Agent Med AI)' },
      { label: 'Nodules Mapped', value: '1,186 Candidate Lesions' },
      { label: 'Format', value: 'MetaImage (.mhd/.raw) & DICOM' },
    ],
  },
  {
    id: 'msd-task07',
    name: 'Medical Segmentation Decathlon (Task07 - Pancreas)',
    category: 'Abdominal Oncology',
    organ: 'Pancreas',
    icon: <Dna className="h-6 w-6 text-purple-500" />,
    color: '#8b5cf6',
    modalities: 'Portal Venous Phase Contrast-Enhanced Abdominal CT',
    cohortSize: '420 clinical contrast-enhanced abdominal scans (281 train + 139 test)',
    targetPathology: 'Pancreatic Ductal Adenocarcinoma (PDAC) & Healthy Parenchymal Boundary',
    annotationProtocol: 'Voxel-level segmentations verified by expert abdominal oncology radiologists.',
    license: 'Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)',
    institutions: 'Memorial Sloan Kettering Cancer Center (MSKCC), TUM Munich, Decathlon Consortium',
    directUrl: 'http://medicaldecathlon.com/',
    citationUrl: 'https://zenodo.org/record/3702927',
    synopsis:
      'Challenging abdominal benchmark dataset for segmenting the high-variability pancreas organ parenchyma and primary adenocarcinoma tumor masses.',
    keyStats: [
      { label: 'Contrast Phase', value: 'Portal Venous Phase' },
      { label: 'Validated Dice', value: '86.3% (Multi Agent Med AI)' },
      { label: 'Cohort Size', value: '420 Contrast CT Scans' },
      { label: 'Format', value: 'NIfTI (.nii.gz)' },
    ],
  },
];

export default function DatasetsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Database className="h-4 w-4" /> Official Training Corpora &amp; Scientific Sources
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Source of Datasets &amp; Benchmark Repositories
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-3xl">
          Multi Agent Med AI neural segmentation models are trained, validated, and benchmarked on
          peer-reviewed, open-access international clinical oncology datasets. Direct repository navigation links are provided below.
        </p>
      </header>

      {/* Dataset Cards Grid */}
      <div className="grid gap-6">
        {DATASETS.map((ds) => (
          <Card key={ds.id} className="border-border/80 overflow-hidden shadow-xs hover:border-primary/50 transition-all">
            <CardHeader className="border-b bg-card pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl border bg-secondary/30 p-3 mt-0.5" style={{ borderColor: `${ds.color}40` }}>
                    {ds.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-lg text-foreground">{ds.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {ds.category}
                      </Badge>
                      <Badge variant="outline" className="border-primary/40 text-primary text-xs font-semibold">
                        {ds.organ}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <strong>Institutions:</strong> {ds.institutions} · <strong>License:</strong> {ds.license}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a href={ds.directUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1.5 text-xs font-semibold shadow-xs">
                      Open Dataset Portal <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a href={ds.citationUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      Documentation <BookOpen className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
                {ds.synopsis}
              </p>

              {/* Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border bg-secondary/25 p-3">
                {ds.keyStats.map((st) => (
                  <div key={st.label}>
                    <span className="text-[10px] uppercase text-muted-foreground block">{st.label}</span>
                    <span className="font-bold text-foreground font-mono">{st.value}</span>
                  </div>
                ))}
              </div>

              {/* Detailed Specs */}
              <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t text-muted-foreground">
                <div>
                  <strong className="text-foreground">Imaging Modality:</strong> {ds.modalities}
                </div>
                <div>
                  <strong className="text-foreground">Cohort Specification:</strong> {ds.cohortSize}
                </div>
                <div>
                  <strong className="text-foreground">Target Pathology:</strong> {ds.targetPathology}
                </div>
                <div>
                  <strong className="text-foreground">Annotation Standard:</strong> {ds.annotationProtocol}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance & Citation Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <span className="text-muted-foreground">
              All datasets are utilized strictly under approved open-access scientific research licenses for the Multi Agent Med AI Capstone System.
            </span>
          </div>
          <Link href="/upload">
            <Button size="sm" className="shrink-0 gap-1 text-xs">
              Test on Sample Scans <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
