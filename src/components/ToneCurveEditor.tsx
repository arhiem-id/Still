import React, { useMemo, useRef, useState } from 'react';
import { ToneCurvePoints } from '../engine/stillColorEngine';
import { NEUTRAL_TONE_CURVE } from '../engine/stillShaderEngine';

interface ToneCurveEditorProps {
  toneCurve: ToneCurvePoints;
  histogramBins?: number[] | null;
  shadowTintHex: string | null;
  shadowTintStrength: number;
  highlightTintHex: string | null;
  highlightTintStrength: number;
  onDragStart: () => void;
  onDragEnd: () => void;
  onCurveChange: (nextCurve: ToneCurvePoints) => void;
  onCurvePresetCommit: (nextCurve: ToneCurvePoints) => void;
  onShadowTintChange: (hex: string | null, strength: number, commit?: boolean) => void;
  onHighlightTintChange: (hex: string | null, strength: number, commit?: boolean) => void;
}

const CURVE_NODE_LABELS = ['BLK', 'SHD', 'MID', 'HGH', 'WHT'] as const;

const EDITORIAL_CURVE_PRESETS: {
  id: string;
  label: string;
  points: ToneCurvePoints;
}[] = [
  { id: 'linear', label: 'Linear', points: [0, 0.25, 0.5, 0.75, 1] },
  { id: 'matte', label: 'Matte', points: [0.09, 0.26, 0.5, 0.76, 0.96] },
  { id: 'filmic-s', label: 'Filmic S', points: [0.02, 0.19, 0.5, 0.81, 0.98] },
  { id: 'airy', label: 'Airy Key', points: [0.07, 0.33, 0.58, 0.82, 0.99] },
  { id: 'deep-ink', label: 'Deep Ink', points: [0.0, 0.16, 0.42, 0.72, 0.95] },
];

const SHADOW_SWATCHES: { id: string; label: string; hex: string | null }[] = [
  { id: 'none', label: 'Off', hex: null },
  { id: 'petrol', label: 'Petrol', hex: '#143840' },
  { id: 'indigo', label: 'Indigo', hex: '#1C2645' },
  { id: 'moss', label: 'Moss', hex: '#223326' },
  { id: 'umber', label: 'Umber', hex: '#3B281E' },
  { id: 'slate', label: 'Slate', hex: '#2E3945' },
  { id: 'plum', label: 'Plum', hex: '#382233' },
];

const HIGHLIGHT_SWATCHES: { id: string; label: string; hex: string | null }[] = [
  { id: 'none', label: 'Off', hex: null },
  { id: 'ivory', label: 'Ivory', hex: '#F4E8D4' },
  { id: 'honey', label: 'Honey', hex: '#EFC98E' },
  { id: 'peach', label: 'Peach', hex: '#F0C7B5' },
  { id: 'ice', label: 'Ice', hex: '#C8DCEB' },
  { id: 'sage', label: 'Sage', hex: '#D0DFC8' },
  { id: 'silver', label: 'Silver', hex: '#D9DCE0' },
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function evalMonotonicCurve(x: number, pts: ToneCurvePoints): number {
  const [y0, y1, y2, y3, y4] = pts;
  const d0 = (y1 - y0) * 4;
  const d1 = (y2 - y1) * 4;
  const d2 = (y3 - y2) * 4;
  const d3 = (y4 - y3) * 4;
  const m0 = d0;
  const m1 = d0 * d1 <= 0 ? 0 : 0.5 * (d0 + d1);
  const m2 = d1 * d2 <= 0 ? 0 : 0.5 * (d1 + d2);
  const m3 = d2 * d3 <= 0 ? 0 : 0.5 * (d2 + d3);
  const m4 = d3;

  const xc = clamp01(x);
  let p0: number;
  let p1: number;
  let t0: number;
  let t1: number;
  let t: number;
  if (xc < 0.25) {
    p0 = y0; p1 = y1; t0 = m0; t1 = m1; t = xc * 4;
  } else if (xc < 0.5) {
    p0 = y1; p1 = y2; t0 = m1; t1 = m2; t = (xc - 0.25) * 4;
  } else if (xc < 0.75) {
    p0 = y2; p1 = y3; t0 = m2; t1 = m3; t = (xc - 0.5) * 4;
  } else {
    p0 = y3; p1 = y4; t0 = m3; t1 = m4; t = (xc - 0.75) * 4;
  }
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return clamp01(h00 * p0 + h10 * 0.25 * t0 + h01 * p1 + h11 * 0.25 * t1);
}

export const ToneCurveEditor: React.FC<ToneCurveEditorProps> = ({
  toneCurve,
  histogramBins,
  shadowTintHex,
  shadowTintStrength,
  highlightTintHex,
  highlightTintStrength,
  onDragStart,
  onDragEnd,
  onCurveChange,
  onCurvePresetCommit,
  onShadowTintChange,
  onHighlightTintChange,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeKnot, setActiveKnot] = useState<number | null>(null);
  const [toneSplitView, setToneSplitView] = useState<'curve' | 'split'>('curve');

  const safeCurve: ToneCurvePoints =
    toneCurve && toneCurve.length === 5 ? toneCurve : [...NEUTRAL_TONE_CURVE];

  const SVG_W = 300;
  const SVG_H = 104;
  const PAD_X = 10;
  const PAD_Y = 8;
  const INNER_W = SVG_W - PAD_X * 2;
  const INNER_H = SVG_H - PAD_Y * 2;

  const curvePath = useMemo(() => {
    const steps = 48;
    const parts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const xNorm = i / steps;
      const yNorm = evalMonotonicCurve(xNorm, safeCurve);
      const px = PAD_X + xNorm * INNER_W;
      const py = PAD_Y + (1 - yNorm) * INNER_H;
      parts.push(`${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return parts.join(' ');
  }, [INNER_H, INNER_W, safeCurve]);

  const histogramPath = useMemo(() => {
    if (!histogramBins || histogramBins.length === 0) return '';
    const maxVal = Math.max(0.001, ...histogramBins);
    const n = histogramBins.length;
    const pts: string[] = [`M${PAD_X},${PAD_Y + INNER_H}`];
    for (let i = 0; i < n; i++) {
      const x = PAD_X + (i / Math.max(1, n - 1)) * INNER_W;
      const h = (histogramBins[i] / maxVal) * (INNER_H * 0.72);
      pts.push(`L${x.toFixed(1)},${(PAD_Y + INNER_H - h).toFixed(1)}`);
    }
    pts.push(`L${PAD_X + INNER_W},${PAD_Y + INNER_H} Z`);
    return pts.join(' ');
  }, [INNER_H, INNER_W, histogramBins]);

  const updateKnotFromClientY = (knotIdx: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relY = (clientY - rect.top) / Math.max(1, rect.height);
    // Map normalized SVG coordinate back to inner plot [0..1]
    const padRatioY = PAD_Y / SVG_H;
    const innerRatioY = INNER_H / SVG_H;
    const yNorm = clamp01(1 - (relY - padRatioY) / innerRatioY);

    const next: ToneCurvePoints = [...safeCurve];
    next[knotIdx] = Math.round(yNorm * 100) / 100;
    onCurveChange(next);
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = clamp01((e.clientX - rect.left) / Math.max(1, rect.width));
    // Snap to closest of the 5 curve knots (0, 0.25, 0.5, 0.75, 1.0)
    const knotIdx = Math.max(0, Math.min(4, Math.round(relX * 4)));
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveKnot(knotIdx);
    onDragStart();
    updateKnotFromClientY(knotIdx, e.clientY);
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activeKnot === null) return;
    updateKnotFromClientY(activeKnot, e.clientY);
  };

  const handleSvgPointerUp = () => {
    if (activeKnot === null) return;
    setActiveKnot(null);
    onDragEnd();
  };

  const activeShadowSwatch = SHADOW_SWATCHES.find((s) => s.hex === shadowTintHex);
  const activeHighlightSwatch = HIGHLIGHT_SWATCHES.find(
    (s) => s.hex === highlightTintHex
  );

  return (
    <div className="space-y-2">
      {/* Compact Mode Toggle: 5-Point Tone Curve | Split-Toning */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex border border-hairline-light dark:border-hairline-dark">
          <button
            type="button"
            onClick={() => setToneSplitView('curve')}
            className={`px-2.5 py-1 font-mono text-[9px] tracking-[0.09em] transition-colors cursor-pointer ${
              toneSplitView === 'curve'
                ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink'
                : 'text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
            }`}
          >
            TONE CURVE
          </button>
          <button
            type="button"
            onClick={() => setToneSplitView('split')}
            className={`px-2.5 py-1 font-mono text-[9px] tracking-[0.09em] border-l border-hairline-light dark:border-hairline-dark transition-colors cursor-pointer ${
              toneSplitView === 'split'
                ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink'
                : 'text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
            }`}
          >
            SPLIT-TONE
            {(shadowTintStrength > 0 && shadowTintHex) ||
            (highlightTintStrength > 0 && highlightTintHex)
              ? ' •'
              : ''}
          </button>
        </div>

        <span className="font-mono text-[8.5px] tracking-[0.08em] text-muted-ink dark:text-muted-paper tabular-nums">
          {toneSplitView === 'curve'
            ? activeKnot !== null
              ? `${CURVE_NODE_LABELS[activeKnot]} ${Math.round(
                  safeCurve[activeKnot] * 100
                )}%`
              : 'DRAG ANY NODE'
            : `SH ${shadowTintHex ? shadowTintStrength : 0}% · HI ${
                highlightTintHex ? highlightTintStrength : 0
              }%`}
        </span>
      </div>

      {toneSplitView === 'curve' ? (
        <>
          {/* Interactive 5-Point Architectural Tone Curve Canvas */}
          <div className="border border-hairline-light dark:border-hairline-dark bg-paper-low/60 dark:bg-ink-low/70">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full h-[104px] block touch-none select-none cursor-ns-resize"
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerCancel={handleSvgPointerUp}
            >
              {/* Faint real photo luminance histogram behind grid */}
              {histogramPath && (
                <path
                  d={histogramPath}
                  fill="currentColor"
                  className="text-still-ink/10 dark:text-still-paper/12"
                />
              )}

              {/* 4x4 Hairline Reference Grid */}
              {[0.25, 0.5, 0.75].map((f) => (
                <g key={f} className="text-still-ink/12 dark:text-still-paper/12">
                  <line
                    x1={PAD_X + f * INNER_W}
                    y1={PAD_Y}
                    x2={PAD_X + f * INNER_W}
                    y2={PAD_Y + INNER_H}
                    stroke="currentColor"
                    strokeWidth="0.75"
                  />
                  <line
                    x1={PAD_X}
                    y1={PAD_Y + f * INNER_H}
                    x2={PAD_X + INNER_W}
                    y2={PAD_Y + f * INNER_H}
                    stroke="currentColor"
                    strokeWidth="0.75"
                  />
                </g>
              ))}

              {/* Diagonal Neutral Reference Line */}
              <line
                x1={PAD_X}
                y1={PAD_Y + INNER_H}
                x2={PAD_X + INNER_W}
                y2={PAD_Y}
                stroke="currentColor"
                strokeDasharray="3 3"
                strokeWidth="0.8"
                className="text-still-ink/25 dark:text-still-paper/25"
              />

              {/* Live Fritsch-Carlson Smooth Cubic Curve */}
              <path
                d={curvePath}
                fill="none"
                stroke="#A58C73"
                strokeWidth="2"
              />

              {/* 5 Draggable Editorial Square Control Handles */}
              {safeCurve.map((yVal, idx) => {
                const cx = PAD_X + (idx / 4) * INNER_W;
                const cy = PAD_Y + (1 - yVal) * INNER_H;
                const isActive = activeKnot === idx;
                return (
                  <g key={CURVE_NODE_LABELS[idx]}>
                    <rect
                      x={cx - (isActive ? 5 : 4)}
                      y={cy - (isActive ? 5 : 4)}
                      width={isActive ? 10 : 8}
                      height={isActive ? 10 : 8}
                      fill={isActive ? '#A58C73' : '#191919'}
                      stroke="#E9E3D8"
                      strokeWidth="1.4"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Zone Legend Strip */}
            <div className="grid grid-cols-5 border-t border-hairline-light dark:border-hairline-dark px-2 py-0.5 font-mono text-[8px] tracking-[0.1em] text-muted-ink dark:text-muted-paper">
              {CURVE_NODE_LABELS.map((label, idx) => (
                <span
                  key={label}
                  className={`text-center tabular-nums ${
                    activeKnot === idx ? 'text-still-taupe font-medium' : ''
                  }`}
                >
                  {label} {Math.round(safeCurve[idx] * 100)}
                </span>
              ))}
            </div>
          </div>

          {/* 1-Tap Editorial Curve Presets */}
          <div className="grid grid-cols-5 gap-1">
            {EDITORIAL_CURVE_PRESETS.map((preset) => {
              const isMatch = preset.points.every(
                (v, i) => Math.abs(v - safeCurve[i]) < 0.015
              );
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onCurvePresetCommit([...preset.points])}
                  className={`py-1 px-1 text-[9.5px] font-medium border truncate transition-colors cursor-pointer ${
                    isMatch
                      ? 'bg-still-ink dark:bg-still-paper text-still-paper dark:text-still-ink border-still-ink dark:border-still-paper'
                      : 'border-hairline-light dark:border-hairline-dark text-muted-ink dark:text-muted-paper hover:text-still-ink dark:hover:text-still-paper'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* MANUAL SPLIT-TONING (SHADOWS & HIGHLIGHTS TINT + STRENGTH) */
        <div className="space-y-2.5 pt-0.5">
          {/* SHADOWS TINT */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] tracking-[0.11em] text-muted-ink dark:text-muted-paper">
                SHADOWS TINT ·{' '}
                <span className="text-still-ink dark:text-still-paper">
                  {(activeShadowSwatch?.label ?? 'Off').toUpperCase()}
                </span>
              </span>
              <span className="font-mono text-[9.5px] tabular-nums text-still-taupe">
                {shadowTintHex ? `${shadowTintStrength}%` : '0%'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                {SHADOW_SWATCHES.map((sw) => {
                  const selected = shadowTintHex === sw.hex;
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      title={`Shadows: ${sw.label}`}
                      aria-label={`Shadows tint ${sw.label}`}
                      onClick={() => {
                        const nextStrength =
                          sw.hex === null
                            ? 0
                            : shadowTintStrength > 0
                              ? shadowTintStrength
                              : 45;
                        onShadowTintChange(sw.hex, nextStrength, true);
                      }}
                      className={`w-6 h-6 border transition-all cursor-pointer flex items-center justify-center ${
                        selected
                          ? 'border-still-taupe scale-105 ring-1 ring-still-taupe'
                          : 'border-hairline-light dark:border-hairline-dark hover:border-still-taupe'
                      }`}
                      style={
                        sw.hex ? { backgroundColor: sw.hex } : undefined
                      }
                    >
                      {sw.hex === null && (
                        <span className="font-mono text-[8px] text-muted-ink dark:text-muted-paper">
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <input
                type="range"
                min={0}
                max={100}
                disabled={!shadowTintHex}
                value={shadowTintHex ? shadowTintStrength : 0}
                aria-label="Shadow tint strength"
                onPointerDown={onDragStart}
                onPointerUp={onDragEnd}
                onChange={(e) =>
                  onShadowTintChange(shadowTintHex, Number(e.target.value), false)
                }
                className="flex-1 min-w-0 accent-[#A58C73] cursor-pointer disabled:opacity-30"
              />
            </div>
          </div>

          {/* HIGHLIGHTS TINT */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] tracking-[0.11em] text-muted-ink dark:text-muted-paper">
                HIGHLIGHTS TINT ·{' '}
                <span className="text-still-ink dark:text-still-paper">
                  {(activeHighlightSwatch?.label ?? 'Off').toUpperCase()}
                </span>
              </span>
              <span className="font-mono text-[9.5px] tabular-nums text-still-taupe">
                {highlightTintHex ? `${highlightTintStrength}%` : '0%'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                {HIGHLIGHT_SWATCHES.map((sw) => {
                  const selected = highlightTintHex === sw.hex;
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      title={`Highlights: ${sw.label}`}
                      aria-label={`Highlights tint ${sw.label}`}
                      onClick={() => {
                        const nextStrength =
                          sw.hex === null
                            ? 0
                            : highlightTintStrength > 0
                              ? highlightTintStrength
                              : 45;
                        onHighlightTintChange(sw.hex, nextStrength, true);
                      }}
                      className={`w-6 h-6 border transition-all cursor-pointer flex items-center justify-center ${
                        selected
                          ? 'border-still-taupe scale-105 ring-1 ring-still-taupe'
                          : 'border-hairline-light dark:border-hairline-dark hover:border-still-taupe'
                      }`}
                      style={
                        sw.hex ? { backgroundColor: sw.hex } : undefined
                      }
                    >
                      {sw.hex === null && (
                        <span className="font-mono text-[8px] text-muted-ink dark:text-muted-paper">
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <input
                type="range"
                min={0}
                max={100}
                disabled={!highlightTintHex}
                value={highlightTintHex ? highlightTintStrength : 0}
                aria-label="Highlight tint strength"
                onPointerDown={onDragStart}
                onPointerUp={onDragEnd}
                onChange={(e) =>
                  onHighlightTintChange(
                    highlightTintHex,
                    Number(e.target.value),
                    false
                  )
                }
                className="flex-1 min-w-0 accent-[#A58C73] cursor-pointer disabled:opacity-30"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
