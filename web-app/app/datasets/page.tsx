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
    id: 'lgg-mri',
    name: 'Brain MRI Segmentation (TCGA-LGG)',
    category: 'Neuro-Oncology',
    organ: 'Brain',
    icon: <Brain className="h-6 w-6 text-blue-500" />,
    color: '#3b82f6',
    modalities: 'Pre/Post-contrast FLAIR MRI',
    cohortSize: '110 patient studies (3,929 slice pairs)',
    targetPathology: 'Lower-Grade Glioma (LGG) tumor regions',
    annotationProtocol: 'Consensus manual segmentations',
    license: 'CC BY-NC-SA 4.0',
    institutions: 'The Cancer Genome Atlas (TCGA) / Kaggle',
    directUrl: 'https://www.kaggle.com/datasets/mateuszbuda/lgg-mri-segmentation',
    citationUrl: 'https://www.kaggle.com/datasets/mateuszbuda/lgg-mri-segmentation',
    synopsis:
      'Paired 2D FLAIR MRI slices and binary segmentation masks from patients with lower-grade gliomas.',
    keyStats: [
      { label: 'Format', value: 'TIFF (256×256)' },
      { label: 'Cohort', value: '110 Patients' },
      { label: 'Slices', value: '3,929 pairs' },
      { label: 'Modality', value: 'FLAIR MRI' },
    ],
  },
  {
    id: 'chest-xray-masks',
    name: 'Chest X-Ray Masks & CT Lungs',
    category: 'Thoracic Oncology',
    organ: 'Lung',
    icon: <Wind className="h-6 w-6 text-cyan-500" />,
    color: '#06b6d4',
    modalities: 'Chest X-Ray Radiographs & Thoracic CT',
    cohortSize: '800+ radiographs and CT slice pairs',
    targetPathology: 'Pulmonary parenchyma and lung field boundaries',
    annotationProtocol: 'Manual radiologist annotations',
    license: 'Open Access Research',
    institutions: 'Montgomery County / Shenzhen Hospital / Kaggle',
    directUrl: 'https://www.kaggle.com/datasets/nikhilpandey360/chest-xray-masks-and-labels',
    citationUrl: 'https://www.kaggle.com/datasets/kmader/finding-lungs-in-ct-data',
    synopsis:
      'Standard benchmark collection of chest radiographs and thoracic CT slices paired with ground-truth lung masks.',
    keyStats: [
      { label: 'Format', value: 'PNG / TIFF' },
      { label: 'Modality', value: 'CXR & Chest CT' },
      { label: 'Target', value: 'Lung Fields' },
      { label: 'Type', value: 'Binary Masks' },
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
    cohortSize: '420 clinical contrast-enhanced CT scans',
    targetPathology: 'Pancreatic Ductal Adenocarcinoma & organ boundary',
    annotationProtocol: 'Voxel-level expert segmentations',
    license: 'CC BY-SA 4.0',
    institutions: 'Memorial Sloan Kettering Cancer Center (MSKCC) / MSD Consortium',
    directUrl: 'http://medicaldecathlon.com/',
    citationUrl: 'https://zenodo.org/record/3702927',
    synopsis:
      'Abdominal CT dataset for segmenting pancreatic parenchyma and primary adenocarcinoma tumor masses.',
    keyStats: [
      { label: 'Format', value: 'NIfTI (.nii.gz)' },
      { label: 'Volumes', value: '420 CT Scans' },
      { label: 'Contrast', value: 'Portal Venous' },
      { label: 'Target', value: 'Parenchyma + Tumor' },
    ],
  },
];

export default function DatasetsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          Reference Datasets
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
          Public datasets used for training and testing the 2D U-Net segmentation models. Links to the primary repositories and documentation are provided below.
        </p>
      </header>

      {/* Dataset Cards Grid */}
      <div className="grid gap-5">
        {DATASETS.map((ds) => (
          <Card key={ds.id} className="border bg-card">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border bg-muted p-2.5 mt-0.5">
                    {ds.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-base text-foreground">{ds.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {ds.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ds.organ}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span>Institutions:</span> {ds.institutions} · <span>License:</span> {ds.license}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a href={ds.directUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      Dataset Repository <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              <p className="text-muted-foreground leading-relaxed text-xs">
                {ds.synopsis}
              </p>

              {/* Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border bg-muted/40 p-3">
                {ds.keyStats.map((st) => (
                  <div key={st.label}>
                    <span className="text-[10px] uppercase text-muted-foreground block">{st.label}</span>
                    <span className="font-medium text-foreground font-mono">{st.value}</span>
                  </div>
                ))}
              </div>

              {/* Detailed Specs */}
              <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t text-muted-foreground">
                <div>
                  <strong className="text-foreground">Modality:</strong> {ds.modalities}
                </div>
                <div>
                  <strong className="text-foreground">Cohort:</strong> {ds.cohortSize}
                </div>
                <div>
                  <strong className="text-foreground">Target:</strong> {ds.targetPathology}
                </div>
                <div>
                  <strong className="text-foreground">Annotation:</strong> {ds.annotationProtocol}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Notice */}
      <Card className="border bg-muted/30">
        <CardContent className="p-4 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              All datasets are utilized under their respective open research licenses for non-commercial experimental evaluation.
            </span>
          </div>
          <Link href="/upload">
            <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs">
              Upload Scan <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
