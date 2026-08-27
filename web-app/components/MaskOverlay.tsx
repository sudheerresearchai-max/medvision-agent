'use client';

import * as React from 'react';
import { Layers, Sliders, Contrast, Eye, SplitSquareHorizontal, Sparkles } from 'lucide-react';
import type { InferenceResult, Measurement } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MaskOverlayProps {
  originalSrc: string | null;
  inference: InferenceResult | null;
  measurements: Measurement[];
}

function toDataUrl(base64: string): string {
  return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
}

type WindowPreset = 'default' | 'brain' | 'lung' | 'high_contrast';
type ColorPalette = 'crimson' | 'emerald' | 'cyan' | 'amber';
type ViewMode = 'blend' | 'split' | 'mask_only';

const PALETTE_FILTERS: Record<ColorPalette, { name: string; filter: string; color: string }> = {
  crimson: { name: 'Crimson (Standard)', filter: 'none', color: '#ef4444' },
  emerald: { name: 'Emerald', filter: 'hue-rotate(240deg) saturate(1.8)', color: '#10b981' },
  cyan: { name: 'Electric Cyan', filter: 'hue-rotate(180deg) saturate(2.5)', color: '#06b6d4' },
  amber: { name: 'Thermal Amber', filter: 'hue-rotate(320deg) saturate(3)', color: '#f59e0b' },
};

const WINDOW_PRESETS: Record<WindowPreset, { label: string; filter: string }> = {
  default: { label: 'Standard', filter: 'none' },
  brain: { label: 'Brain Window (Enhanced Parenchyma)', filter: 'contrast(1.35) brightness(1.08)' },
  lung: { label: 'Lung Window (Subtle Parenchyma)', filter: 'contrast(1.7) brightness(1.2) grayscale(100%)' },
  high_contrast: { label: 'High Contrast (Edge Detection)', filter: 'contrast(2.1) brightness(0.9)' },
};

export function MaskOverlay({ originalSrc, inference, measurements }: MaskOverlayProps) {
  const [opacity, setOpacity] = React.useState(75);
  const [showMask, setShowMask] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<ViewMode>('blend');
  const [splitPos, setSplitPos] = React.useState(50); // percentage
  const [windowPreset, setWindowPreset] = React.useState<WindowPreset>('default');
  const [palette, setPalette] = React.useState<ColorPalette>('crimson');

  if (!inference) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">PACS Segmentation Visualizer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No segmentation mask available for this case.
          </div>
        </CardContent>
      </Card>
    );
  }

  const maskUrl = toDataUrl(inference.maskBase64);

  return (
    <Card className="overflow-hidden border-border/80">
      <CardHeader className="pb-3 border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base font-bold">PACS Diagnostic Lesion Visualizer</CardTitle>
              <CardDescription className="text-xs">
                Multi-Planar Neural Segmentation Overlay · Interactive Radiographic Controls
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {inference.modelFile}
            </Badge>
            <Badge className="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/30 text-xs">
              IoU Conf: {(inference.confidence * 100).toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Visualizer Canvas Container */}
        <div className="relative overflow-hidden rounded-lg border bg-black/95 shadow-inner">
          <div
            className="relative flex min-h-[380px] max-h-[560px] w-full items-center justify-center overflow-hidden"
            style={{ filter: WINDOW_PRESETS[windowPreset].filter }}
          >
            {originalSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={originalSrc}
                alt="Medical scan"
                className={cn(
                  'block max-h-[560px] w-full object-contain transition-all duration-150',
                  viewMode === 'mask_only' && 'opacity-10',
                )}
              />
            ) : (
              <div className="flex h-72 items-center justify-center text-xs text-muted-foreground">
                Original scan preview
              </div>
            )}

            {/* Mask Layer */}
            {showMask && (
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={
                  viewMode === 'split'
                    ? { clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` }
                    : undefined
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={maskUrl}
                  alt="Lesion Segmentation Mask"
                  className="h-full w-full object-contain transition-all duration-150"
                  style={{
                    opacity: opacity / 100,
                    filter: PALETTE_FILTERS[palette].filter,
                  }}
                />
              </div>
            )}

            {/* Split Screen Draggable Divider */}
            {viewMode === 'split' && (
              <div
                className="absolute inset-y-0 z-20 flex w-0.5 items-center justify-center bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                style={{ left: `${splitPos}%` }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary bg-background shadow-md">
                  <SplitSquareHorizontal className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Split Mode Slider Overlay Control */}
          {viewMode === 'split' && (
            <div className="absolute bottom-3 inset-x-8 z-30 rounded-md bg-background/80 px-4 py-2 backdrop-blur shadow-sm border">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
                <span>AI Mask Overlay ({splitPos}%)</span>
                <span>Original Scan ({100 - splitPos}%)</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={splitPos}
                onChange={(e) => setSplitPos(Number(e.target.value))}
                className="accent-primary h-1.5 w-full cursor-ew-resize"
              />
            </div>
          )}
        </div>

        {/* Toolbar & Radiographic Controls */}
        <div className="grid gap-3 rounded-lg border bg-secondary/20 p-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {/* View Mode */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-primary" /> View Mode
            </Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={viewMode === 'blend' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setViewMode('blend')}
              >
                Overlay
              </Button>
              <Button
                type="button"
                variant={viewMode === 'split' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setViewMode('split')}
              >
                Split
              </Button>
              <Button
                type="button"
                variant={viewMode === 'mask_only' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setViewMode('mask_only')}
              >
                Mask
              </Button>
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-primary" /> Mask Alpha
              </Label>
              <span className="font-mono text-muted-foreground">{opacity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="accent-primary h-2 w-full cursor-pointer mt-1"
            />
          </div>

          {/* Window / Level Contrast Presets */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Contrast className="h-3.5 w-3.5 text-primary" /> Window / Level
            </Label>
            <select
              value={windowPreset}
              onChange={(e) => setWindowPreset(e.target.value as WindowPreset)}
              className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              {Object.entries(WINDOW_PRESETS).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Palette Picker */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Color Palette
            </Label>
            <div className="flex gap-1.5">
              {Object.entries(PALETTE_FILTERS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPalette(key as ColorPalette)}
                  title={p.name}
                  className={cn(
                    'h-7 flex-1 rounded border transition-all flex items-center justify-center',
                    palette === key ? 'ring-2 ring-primary ring-offset-1 font-bold' : 'opacity-70 hover:opacity-100',
                  )}
                  style={{ backgroundColor: `${p.color}25`, borderColor: p.color }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quantitative Measurements Grid */}
        {measurements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quantitative Morphometric Biomarkers &amp; RECIST 1.1 Criteria
            </h4>
            <dl className="grid grid-cols-2 gap-2 rounded-lg border bg-secondary/30 p-3.5 sm:grid-cols-3 lg:grid-cols-4">
              {measurements.map((m) => (
                <div key={m.label} title={m.note} className="rounded border bg-card/60 p-2.5 shadow-2xs">
                  <dt className="truncate text-[11px] text-muted-foreground font-medium">{m.label}</dt>
                  <dd className="mt-1 flex items-baseline gap-1 text-sm font-bold tabular-nums">
                    <span>{m.value.toLocaleString()}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{m.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
