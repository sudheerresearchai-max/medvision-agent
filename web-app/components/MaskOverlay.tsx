'use client';

import * as React from 'react';
import {
  Layers,
  Sliders,
  Contrast,
  Eye,
  EyeOff,
  SplitSquareHorizontal,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  SunMedium,
  Check,
} from 'lucide-react';
import type { InferenceResult, Measurement } from '@/lib/types';
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

const PALETTE_FILTERS: Record<ColorPalette, { name: string; filter: string; color: string; label: string }> = {
  crimson: { name: 'Crimson Coral', filter: 'none', color: '#ff453a', label: 'Coral' },
  cyan: { name: 'Electric Cyan', filter: 'hue-rotate(180deg) saturate(2.5)', color: '#0a84ff', label: 'Cyan' },
  amber: { name: 'Thermal Amber', filter: 'hue-rotate(320deg) saturate(3)', color: '#ff9f0a', label: 'Amber' },
  emerald: { name: 'Emerald Green', filter: 'hue-rotate(240deg) saturate(1.8)', color: '#30d158', label: 'Emerald' },
};

const WINDOW_PRESETS: Record<WindowPreset, { label: string; filter: string }> = {
  default: { label: 'Standard DICOM', filter: 'none' },
  brain: { label: 'Brain Window (Soft Tissue)', filter: 'contrast(1.35) brightness(1.08)' },
  lung: { label: 'Lung Window (Parenchymal)', filter: 'contrast(1.7) brightness(1.2) grayscale(100%)' },
  high_contrast: { label: 'High Contrast (Cortical Bone)', filter: 'contrast(2.1) brightness(0.9)' },
};

export function MaskOverlay({ originalSrc, inference, measurements }: MaskOverlayProps) {
  const [opacity, setOpacity] = React.useState(75);
  const [showMask, setShowMask] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<ViewMode>('blend');
  const [splitPos, setSplitPos] = React.useState(50); // percentage
  const [windowPreset, setWindowPreset] = React.useState<WindowPreset>('default');
  const [palette, setPalette] = React.useState<ColorPalette>('crimson');
  const [zoom, setZoom] = React.useState<number>(1);
  const [invert, setInvert] = React.useState<boolean>(false);

  // Keyboard shortcuts for PACS navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, select, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setShowMask((prev) => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        setViewMode('split');
      } else if (e.key === 'o' || e.key === 'O') {
        setViewMode('blend');
      } else if (e.key === 'i' || e.key === 'I') {
        setInvert((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!inference) {
    return (
      <div className="workstation-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-xs font-mono text-muted-foreground">No radiological scan available for this case.</p>
      </div>
    );
  }

  const maskUrl = toDataUrl(inference.maskBase64);
  const isLesion = inference.metrics.areaPx > 0;

  const handleCycleZoom = () => {
    setZoom((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2.0 : 1.0));
  };

  return (
    <div className="workstation-card rounded-2xl overflow-hidden border border-border shadow-2xl">
      {/* Studio Header */}
      <div className="px-5 py-3.5 border-b border-border/80 bg-secondary/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              PACS Diagnostic Lesion Visualizer
            </h3>
            <p className="text-[11px] font-mono text-muted-foreground">
              Multi-Planar Neural Segmentation Overlay · Interactive Radiographic Controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="clinical-pill px-3 py-1 text-[11px] text-muted-foreground">
            {inference.modelFile}
          </span>
          {isLesion ? (
            <span className="clinical-pill px-3 py-1 text-[11px] text-rose-400 bg-rose-500/10 border-rose-500/25 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Lesion: {(inference.confidence * 100).toFixed(1)}% ({inference.metrics.areaPx} px)
            </span>
          ) : (
            <span className="clinical-pill px-3 py-1 text-[11px] text-emerald-400 bg-emerald-500/10 border-emerald-500/25 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Clear Scan · No Lesion (0 px)
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Visualizer Canvas Container */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-black/95 shadow-inner">
          {/* Radiographic Floating HUD */}
          <div className="absolute top-3 left-3 z-30 pointer-events-none flex flex-col gap-1 text-[10px] font-mono text-white/70 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 select-none">
            <div className="flex items-center gap-1.5 text-white/90 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>STUDIO PACS</span>
              <span className="text-white/40">|</span>
              <span>{inference.organ.toUpperCase()}</span>
            </div>
            <span>MATRIX: {inference.width}×{inference.height} · RECIST 1.1</span>
            {zoom > 1 && <span className="text-primary font-bold">ZOOM: {zoom}×</span>}
            {invert && <span className="text-amber-400 font-bold">INVERTED</span>}
          </div>

          {/* Quick Floating PACS Utility Toolbar (Top-Right) */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={handleCycleZoom}
              className={cn(
                'p-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1',
                zoom > 1 ? 'bg-primary text-primary-foreground font-bold' : 'text-white/80 hover:bg-white/10',
              )}
              title="Toggle Zoom (1x, 1.5x, 2x)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[10px]">{zoom}×</span>
            </button>
            <button
              type="button"
              onClick={() => setInvert((prev) => !prev)}
              className={cn(
                'p-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1',
                invert ? 'bg-primary text-primary-foreground font-bold' : 'text-white/80 hover:bg-white/10',
              )}
              title="Invert Colors (Bone vs Soft Tissue)"
            >
              <SunMedium className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowMask((prev) => !prev)}
              className={cn(
                'p-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1',
                showMask ? 'bg-primary/20 text-primary border border-primary/40' : 'text-white/80 hover:bg-white/10',
              )}
              title="Toggle Mask Visibility (Space)"
            >
              {showMask ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div
            className="relative flex min-h-[380px] max-h-[580px] w-full items-center justify-center overflow-hidden transition-transform duration-200"
            style={{
              filter: (() => {
                const rawFilter = WINDOW_PRESETS[windowPreset].filter;
                const baseFilter = rawFilter === 'none' ? '' : rawFilter;
                const invertFilter = invert ? 'invert(100%)' : '';
                return [baseFilter, invertFilter].filter(Boolean).join(' ') || 'none';
              })(),
              transform: `scale(${zoom})`,
            }}
          >
            {originalSrc ? (
              <div className="relative inline-flex items-center justify-center max-w-full max-h-[580px]">
                {/* Image and Mask tightly bound wrapper - ZERO PADDING MISALIGNMENT */}
                <div className="relative inline-block overflow-hidden max-w-full max-h-[580px] rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalSrc}
                    alt="Medical scan"
                    className={cn(
                      'block max-h-[580px] max-w-full w-auto h-auto object-contain mx-auto select-none pointer-events-none',
                      viewMode === 'mask_only' && 'opacity-10',
                    )}
                  />

                  {/* Mask Layer - Exactly hugs the rendered image */}
                  {showMask && isLesion && (
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
                        className="w-full h-full object-fill select-none pointer-events-none"
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
                      className="absolute inset-y-0 z-20 flex w-0.5 items-center justify-center bg-primary shadow-[0_0_12px_rgba(10,132,255,0.9)]"
                      style={{ left: `${splitPos}%` }}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary bg-background shadow-md">
                        <SplitSquareHorizontal className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-xs font-mono text-muted-foreground">
                Original scan preview
              </div>
            )}
          </div>

          {/* Split Mode Slider Overlay Control */}
          {viewMode === 'split' && (
            <div className="absolute bottom-3 inset-x-8 z-30 rounded-xl bg-black/75 px-4 py-2 backdrop-blur-md border border-white/10 shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1">
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

        {/* Apple Segmented Controls & Tooling Grid */}
        <div className="grid gap-3.5 rounded-2xl border border-white/[0.08] bg-black/30 p-3.5 sm:grid-cols-2 lg:grid-cols-4 text-xs font-mono">
          {/* View Mode Segmented Control */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-primary" /> View Mode
            </Label>
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setViewMode('blend')}
                className={cn(
                  'h-7 rounded-lg text-xs transition-all duration-150',
                  viewMode === 'blend' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Overlay
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={cn(
                  'h-7 rounded-lg text-xs transition-all duration-150',
                  viewMode === 'split' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mask_only')}
                className={cn(
                  'h-7 rounded-lg text-xs transition-all duration-150',
                  viewMode === 'mask_only' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Mask
              </button>
            </div>
          </div>

          {/* Opacity Slider & Toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-primary" /> Mask Alpha
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowMask(!showMask)}
                  className="text-[10px] text-primary hover:underline cursor-pointer select-none"
                >
                  {showMask ? 'Hide' : 'Show'}
                </button>
                <span className="text-muted-foreground text-[10px]">{showMask ? `${opacity}%` : 'Off'}</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!showMask}
              value={showMask ? opacity : 0}
              onChange={(e) => {
                if (!showMask) setShowMask(true);
                setOpacity(Number(e.target.value));
              }}
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
              className="h-8 w-full rounded-xl border border-white/[0.08] bg-black/40 px-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
            >
              {Object.entries(WINDOW_PRESETS).map(([key, p]) => (
                <option key={key} value={key} className="bg-card text-foreground">{p.label}</option>
              ))}
            </select>
          </div>

          {/* Color Palette Picker */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Palette
            </Label>
            <div className="flex gap-1.5">
              {Object.entries(PALETTE_FILTERS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPalette(key as ColorPalette)}
                  title={p.name}
                  className={cn(
                    'h-8 flex-1 rounded-xl border transition-all duration-150 flex items-center justify-center gap-1',
                    palette === key ? 'ring-2 ring-primary ring-offset-1 font-bold' : 'opacity-70 hover:opacity-100',
                  )}
                  style={{ backgroundColor: `${p.color}20`, borderColor: p.color }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-[10px] hidden sm:inline" style={{ color: p.color }}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quantitative Morphometric Biomarkers Strip (RECIST 1.1) */}
        {measurements.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                RECIST 1.1 Quantitative Biomarkers &amp; Morphometry
              </h4>
              <span className="text-[10px] text-muted-foreground font-mono">Calibrated Metric Spacing</span>
            </div>
            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 font-mono text-xs">
              {measurements.map((m) => (
                <div key={m.label} title={m.note} className="workstation-card rounded-xl p-3 shadow-xs bg-card/80">
                  <dt className="truncate text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</dt>
                  <dd className="mt-1 flex items-baseline gap-1 text-sm font-bold text-foreground tabular-nums">
                    <span>{m.value.toLocaleString()}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">{m.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
