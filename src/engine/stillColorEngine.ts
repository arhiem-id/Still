import {
  computeAdaptiveToneOffsets,
  PhotoHistogramStats,
} from './stillHistogramEngine';
import {
  buildGeometryTransformedCanvas,
  DEFAULT_GEOMETRY,
  FreeCropRect,
  GeometryTransform,
} from './stillGeometryEngine';
import { upscaleCanvasCrisp2x } from './stillRestoreEngine';
import { ParsedCubeLut } from './stillLutEngine';
import {
  isToneCurveNeutral,
  loadImageCached,
  NEUTRAL_SHADER_PARAMS,
  NEUTRAL_TONE_CURVE,
  renderWithShaderToCanvas,
  ShaderGradingParams,
} from './stillShaderEngine';
import { buildExifFrameDisplay, PhotoExifData } from './stillExifEngine';
import {
  DEFAULT_STILL_EFFECTS,
  hasActiveStillEffects,
  mergeStillEffects,
  StillEffectsConfig,
} from './stillEffectsEngine';

export type PhotoCategoryId =
  | 'editorial'
  | 'nature'
  | 'coastal'
  | 'portrait'
  | 'architecture'
  | 'street'
  | 'still-life'
  | 'food-coffee'
  | 'night'
  | 'monochrome'
  | 'self-portrait'
  | 'icons-25'
  | 'cinema'
  | 'darkroom'
  | 'golden-dream';

export type ToneMood = 'bright' | 'dark';

export type CropRatio =
  | 'original'
  | 'free'
  | '4:5'
  | '3:4'
  | '1:1'
  | '9:16'
  | '16:9';

export type MatteFrameStyle =
  | 'none'
  | 'paper'
  | 'ink'
  | 'white'
  | 'exif-light'
  | 'exif-dark'
  | 'instant'
  | 'film-35mm';

export type ExportFormat = 'jpeg' | 'png';

export type ExportQuality = 'standard' | 'high' | 'print';

export type ToneCurvePoints = [number, number, number, number, number];

export interface ColorAdjustments {
  exposure: number; // -50 to 50
  contrast: number; // -50 to 50
  highlights: number; // -50 to 50
  shadows: number; // -50 to 50
  warmth: number; // -50 to 50
  saturation: number; // -100 to 50
  fade: number; // 0 to 50
  deblur: number; // 0 to 100 (offline optical focus recovery / deconvolution)
  denoise: number; // 0 to 100 (edge-preserving bilateral noise reduction)
  clarity: number; // -50 to 100 (midtone micro-contrast)
  sharpen: number; // 0 to 100 (optical unsharp detail)
  chromaticAberration: number; // 0 to 100 (vintage radial lens fringe)
  bloom: number; // 0 to 100 (Pro-Mist optical highlight diffusion)
  halation: number; // 0 to 100 (CineStill crimson-orange highlight bleed)
  grain: number; // 0 to 100
  vignette: number; // 0 to 100
  skinProtect: number; // 0 to 100
  /** 5-point Master RGB Tone Curve Y values at [0, 0.25, 0.5, 0.75, 1.0] */
  toneCurve: ToneCurvePoints;
  /** Manual Split-Toning (blends smoothly on top of any preset) */
  manualShadowTintHex: string | null;
  manualShadowTintStrength: number; // 0 to 100
  manualHighlightTintHex: string | null;
  manualHighlightTintStrength: number; // 0 to 100
  /** Optical, Analog & Natural Atmosphere Effects */
  effects: StillEffectsConfig;
}

export type NumericAdjustmentKey =
  | 'exposure'
  | 'contrast'
  | 'highlights'
  | 'shadows'
  | 'warmth'
  | 'saturation'
  | 'fade'
  | 'deblur'
  | 'denoise'
  | 'clarity'
  | 'sharpen'
  | 'chromaticAberration'
  | 'bloom'
  | 'halation'
  | 'grain'
  | 'vignette'
  | 'skinProtect';

/**
 * Rich per-preset filmic, optical, 6-channel HSL, and 3-way split-toning recipe
 * executed directly by STILL.'s WebGL2 Optical & Film Shader Engine.
 */
export interface PresetOpticalGrade {
  exposure?: number; // -0.5..0.5
  contrast?: number; // -0.4..0.6
  highlights?: number; // -0.6..0.5
  shadows?: number; // -0.5..0.6
  fade?: number; // 0..0.24
  temperature?: number; // -0.5..0.5
  tint?: number; // -0.4..0.4 (negative = emerald/green, positive = magenta)
  saturation?: number; // -0.9..0.5
  vibrance?: number; // -0.5..0.6
  grayscale?: number; // 0..1
  sepia?: number; // 0..1
  bleachBypass?: number; // 0..1
  crossProcess?: number; // 0..1
  skinProtect?: number; // 0..1
  infraredShift?: number; // 0..1
  /** 6-band HSL shifts: [Red, Orange, Yellow, Green, Cyan, Blue] */
  hslHue?: [number, number, number, number, number, number];
  hslSat?: [number, number, number, number, number, number];
  hslLum?: [number, number, number, number, number, number];
  /** 3-way luminance-masked split toning */
  shadowTint?: [number, number, number];
  shadowTintStrength?: number;
  midtoneTint?: [number, number, number];
  midtoneTintStrength?: number;
  highlightTint?: [number, number, number];
  highlightTintStrength?: number;
  /** Optical lens, micro-detail & film physics */
  clarity?: number; // -0.4..0.6
  sharpen?: number; // 0..0.6
  chromaticAberration?: number; // 0..0.5
  bloom?: number; // 0..0.7
  halation?: number; // 0..0.8
  grain?: number; // 0..0.9
  vignette?: number; // 0..0.8
}

export interface StillPreset {
  id: string;
  code: string;
  name: string;
  categoryId: PhotoCategoryId;
  categoryLabel: string;
  isSignature?: boolean;
  description: string;
  grade: PresetOpticalGrade;
}

export interface CustomEditorialPreset {
  id: string;
  code: string;
  name: string;
  basePresetId: string | null;
  tone: ToneMood;
  intensity: number;
  adjustments: ColorAdjustments;
  createdAt: string;
}

export interface ExportRenderOptions {
  cropRatio: CropRatio;
  freeCrop?: FreeCropRect;
  geometry?: GeometryTransform;
  upscale2x?: boolean;
  frameStyle: MatteFrameStyle;
  frameStamp: boolean;
  stampText: string;
  presetCode?: string;
  exif?: PhotoExifData | null;
  frameCaption?: string;
  format: ExportFormat;
  quality: ExportQuality;
}

export const CROP_RATIOS: {
  id: CropRatio;
  label: string;
  ratioValue: number | null;
}[] = [
  { id: 'original', label: 'Orig', ratioValue: null },
  { id: 'free', label: 'Free', ratioValue: null },
  { id: '4:5', label: '4:5', ratioValue: 4 / 5 },
  { id: '3:4', label: '3:4', ratioValue: 3 / 4 },
  { id: '1:1', label: '1:1', ratioValue: 1 },
  { id: '9:16', label: '9:16', ratioValue: 9 / 16 },
  { id: '16:9', label: '16:9', ratioValue: 16 / 9 },
];

export const MATTE_FRAMES: {
  id: MatteFrameStyle;
  label: string;
  bgHex: string;
  textHex: string;
  group: 'matte' | 'editorial';
}[] = [
  { id: 'none', label: 'None', bgHex: 'transparent', textHex: '#77796D', group: 'matte' },
  { id: 'paper', label: 'Paper', bgHex: '#E9E3D8', textHex: '#5A5952', group: 'matte' },
  { id: 'ink', label: 'Ink', bgHex: '#191919', textHex: '#A7A196', group: 'matte' },
  { id: 'white', label: 'Gallery', bgHex: '#F7F5F0', textHex: '#6B6860', group: 'matte' },
  { id: 'exif-light', label: 'EXIF Light', bgHex: '#F7F5F0', textHex: '#191919', group: 'editorial' },
  { id: 'exif-dark', label: 'EXIF Dark', bgHex: '#151514', textHex: '#E9E3D8', group: 'editorial' },
  { id: 'instant', label: 'Instant', bgHex: '#F2EEE5', textHex: '#2B2926', group: 'editorial' },
  { id: 'film-35mm', label: '35mm Film', bgHex: '#111110', textHex: '#D89E54', group: 'editorial' },
];

export const DEFAULT_ADJUSTMENTS: ColorAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  warmth: 0,
  saturation: 0,
  fade: 0,
  deblur: 0,
  denoise: 0,
  clarity: 0,
  sharpen: 0,
  chromaticAberration: 0,
  bloom: 0,
  halation: 0,
  grain: 0,
  vignette: 0,
  skinProtect: 0,
  toneCurve: [...NEUTRAL_TONE_CURVE],
  manualShadowTintHex: null,
  manualShadowTintStrength: 0,
  manualHighlightTintHex: null,
  manualHighlightTintStrength: 0,
  effects: mergeStillEffects(DEFAULT_STILL_EFFECTS),
};

export function hasCurveOrSplitToneActive(adj: ColorAdjustments): boolean {
  return (
    !isToneCurveNeutral(adj.toneCurve) ||
    (Boolean(adj.manualShadowTintHex) && (adj.manualShadowTintStrength ?? 0) > 0) ||
    (Boolean(adj.manualHighlightTintHex) && (adj.manualHighlightTintStrength ?? 0) > 0)
  );
}

export function hasManualAdjustments(adj: ColorAdjustments): boolean {
  if (hasCurveOrSplitToneActive(adj)) return true;
  if (hasActiveStillEffects(adj.effects)) return true;
  const numericKeys: NumericAdjustmentKey[] = [
    'exposure',
    'contrast',
    'highlights',
    'shadows',
    'warmth',
    'saturation',
    'fade',
    'deblur',
    'denoise',
    'clarity',
    'sharpen',
    'chromaticAberration',
    'bloom',
    'halation',
    'grain',
    'vignette',
    'skinProtect',
  ];
  return numericKeys.some((k) => adj[k] !== 0);
}

function hexToRgbUnit(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [r / 255, g / 255, b / 255];
}

function blendSplitTone(
  presetRgb: [number, number, number] | undefined,
  presetStrength: number,
  manualHex: string | null | undefined,
  manualStrengthPct: number | undefined
): { rgb: [number, number, number]; strength: number } {
  const mRgb = hexToRgbUnit(manualHex);
  const mStr = mRgb ? clamp((manualStrengthPct ?? 0) / 100, 0, 1) * 0.56 : 0;
  const pRgb: [number, number, number] = presetRgb ?? [0.5, 0.5, 0.5];
  const pStr = clamp(presetStrength, 0, 0.68);

  if (mStr <= 0.002 || !mRgb) {
    return { rgb: pRgb, strength: pStr };
  }
  if (pStr <= 0.002) {
    return { rgb: mRgb, strength: clamp(mStr, 0, 0.68) };
  }
  const total = pStr + mStr;
  const wP = pStr / total;
  const wM = mStr / total;
  return {
    rgb: [
      pRgb[0] * wP + mRgb[0] * wM,
      pRgb[1] * wP + mRgb[1] * wM,
      pRgb[2] * wP + mRgb[2] * wM,
    ],
    strength: clamp(Math.max(pStr, mStr) + Math.min(pStr, mStr) * 0.45, 0, 0.68),
  };
}

export const PHOTO_CATEGORIES: {
  id: PhotoCategoryId;
  indexCode: string;
  label: string;
  shortLabel: string;
  tagline: string;
  examples: string;
}[] = [
  {
    id: 'editorial',
    indexCode: '01',
    label: 'Editorial',
    shortLabel: 'Editorial',
    tagline:
      'Independent fashion magazine spreads, offset press, and lith print.',
    examples: 'Magazine · Fashion · Lookbook',
  },
  {
    id: 'nature',
    indexCode: '02',
    label: 'Nature',
    shortLabel: 'Nature',
    tagline:
      'Waterfalls, mist, mossy basalt, and silver-toned forest foliage.',
    examples: 'Waterfalls · Forests · Mountains',
  },
  {
    id: 'coastal',
    indexCode: '03',
    label: 'Coastal',
    shortLabel: 'Coastal',
    tagline:
      'Sun-bleached horizons, salt air, mineral tides, and cyanotype.',
    examples: 'Ocean · Beaches · Horizon',
  },
  {
    id: 'portrait',
    indexCode: '04',
    label: 'Portrait',
    shortLabel: 'Portrait',
    tagline: 'Editorial skin fidelity, alabaster light, and platinum toning.',
    examples: 'People · Close-ups · Studio',
  },
  {
    id: 'architecture',
    indexCode: '05',
    label: 'Architecture',
    shortLabel: 'Arch',
    tagline:
      'Travertine stone, Swiss bleach-bypass, and geometric shadow.',
    examples: 'Interiors · Facades · Concrete',
  },
  {
    id: 'street',
    indexCode: '06',
    label: 'Street',
    shortLabel: 'Street',
    tagline:
      '35mm documentary clarity, urban fluorescent glow, and rain asphalt.',
    examples: 'City · Travel · Documentary',
  },
  {
    id: 'still-life',
    indexCode: '07',
    label: 'Still Life',
    shortLabel: 'Still Life',
    tagline: 'Ceramics, linen, porcelain, and Flemish chiaroscuro stillness.',
    examples: 'Objects · Ceramics · Flatlay',
  },
  {
    id: 'food-coffee',
    indexCode: '08',
    label: 'Food & Coffee',
    shortLabel: 'Coffee',
    tagline: 'Kyoto wood cafés, espresso umber, and creamy morning light.',
    examples: 'Espresso · Pastry · Dining',
  },
  {
    id: 'night',
    indexCode: '09',
    label: 'Night',
    shortLabel: 'Night',
    tagline:
      'Sodium dusk, cinema tungsten 800, and nocturnal indigo halation.',
    examples: 'City Lights · Dusk · Cafés',
  },
  {
    id: 'monochrome',
    indexCode: '10',
    label: 'Monochrome',
    shortLabel: 'Mono',
    tagline: 'Silver gelatin, selenium exhibition prints, and chalk matte B&W.',
    examples: 'Fine Art B&W · Darkroom',
  },
  {
    id: 'self-portrait',
    indexCode: '11',
    label: 'Self-Portrait',
    shortLabel: 'Selfie',
    tagline:
      'Flattering skin fidelity, delicate Pro-Mist glow, and natural mirror light for front-camera close-ups.',
    examples: 'Selfie · Front Cam · Mirror · Close-Up',
  },
  {
    id: 'icons-25',
    indexCode: '12',
    label: 'Icons 25',
    shortLabel: 'Icons 25',
    tagline:
      '25 timeless tributes to iconic rangefinders, medium-format cameras, analog film stocks, and classic color grades.',
    examples: 'Camera Sims · Analog Film · Iconic Looks',
  },
  {
    id: 'cinema',
    indexCode: '13',
    label: 'Cinema',
    shortLabel: 'Cinema',
    tagline:
      'Auteur film color science: Kodak 2383 theatrical print, Wong Kar-Wai emerald halation, A24 sunlight, and neo-noir.',
    examples: '35mm Cinema · Film Stills · Anamorphic',
  },
  {
    id: 'darkroom',
    indexCode: '14',
    label: 'Darkroom & Cult',
    shortLabel: 'Darkroom',
    tagline:
      'Tactile chemical emulsions: Classic Neg, CineStill 800T halation, silver bleach-bypass, expired rolls, and Aerochrome infrared.',
    examples: 'Cult Film · Infrared · Darkroom Lab',
  },
  {
    id: 'golden-dream',
    indexCode: '15',
    label: 'Golden & Dream',
    shortLabel: 'Golden',
    tagline:
      'Optical Pro-Mist 1/4 diffusion, sun-drenched Tuscan gold, velvet peach dusk, and luminous editorial haze.',
    examples: 'Golden Hour · Pro-Mist · Dreamy Light',
  },
];

function hexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = Number.parseInt(clean, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * 123 Distinct, High-Craft Built-In STILL. Presets (14 Categories × 7 + Icons 25 × 25).
 * Powered by STILL.'s 6-Channel HSL + 3-Way Luminance Split Toning + Filmic S-Curve
 * + Optical Pro-Mist Bloom & CineStill Halation WebGL Shader Engine.
 */
export const STILL_PRESETS: StillPreset[] = [
  // ================= 01 · EDITORIAL (MAGAZINE LOOK) =================
  {
    id: 'ed-01',
    code: 'ED-01',
    name: 'Paper Spread',
    categoryId: 'editorial',
    categoryLabel: 'Editorial',
    description:
      'Uncoated magazine stock with warm ivory whites, soft bloom & muted ink.',
    grade: {
      exposure: 0.08,
      contrast: 0.06,
      highlights: -0.18,
      shadows: 0.16,
      fade: 0.11,
      temperature: 0.14,
      saturation: -0.22,
      skinProtect: 0.55,
      hslHue: [0.05, 0.04, -0.08, -0.22, -0.1, -0.12],
      hslSat: [-0.08, -0.12, -0.28, -0.58, -0.45, -0.42],
      hslLum: [0.08, 0.1, 0.12, -0.1, 0.04, -0.05],
      shadowTint: hexRgb('#36322C'),
      shadowTintStrength: 0.24,
      highlightTint: hexRgb('#F3E8D4'),
      highlightTintStrength: 0.34,
      bloom: 0.28,
      grain: 0.18,
      vignette: 0.12,
    },
  },
  {
    id: 'ed-02',
    code: 'ED-02',
    name: 'Milan 1989',
    categoryId: 'editorial',
    categoryLabel: 'Editorial',
    description:
      'Italian fashion archive: golden cognac warmth paired with deep navy shadows.',
    grade: {
      exposure: -0.04,
      contrast: 0.24,
      highlights: -0.12,
      shadows: -0.08,
      fade: 0.04,
      temperature: 0.24,
      tint: 0.06,
      vibrance: 0.18,
      skinProtect: 0.45,
      hslHue: [-0.08, 0.06, -0.14, -0.35, -0.18, 0.12],
      hslSat: [0.22, 0.18, 0.12, -0.45, -0.32, 0.14],
      hslLum: [-0.08, 0.06, 0.05, -0.22, -0.1, -0.26],
      shadowTint: hexRgb('#18243A'),
      shadowTintStrength: 0.36,
      highlightTint: hexRgb('#F0C88C'),
      highlightTintStrength: 0.32,
      halation: 0.14,
      grain: 0.28,
      vignette: 0.24,
    },
  },
  {
    id: 'ed-03',
    code: 'ED-03',
    name: 'Alabaster Gloss',
    categoryId: 'editorial',
    categoryLabel: 'Editorial',
    description:
      'High-fashion glossy cover: crisp porcelain whites & sculpted crimson accents.',
    grade: {
      exposure: 0.12,
      contrast: 0.26,
      highlights: 0.14,
      shadows: 0.08,
      temperature: -0.14,
      tint: 0.04,
      saturation: -0.1,
      skinProtect: 0.6,
      hslHue: [-0.06, 0.02, -0.12, 0.12, 0.08, -0.08],
      hslSat: [0.34, -0.14, -0.35, -0.48, -0.22, 0.08],
      hslLum: [-0.06, 0.14, 0.18, -0.08, 0.12, -0.04],
      shadowTint: hexRgb('#1C222B'),
      shadowTintStrength: 0.22,
      highlightTint: hexRgb('#F6F8FC'),
      highlightTintStrength: 0.36,
      bloom: 0.16,
      grain: 0.1,
      vignette: 0.14,
    },
  },
  {
    id: 'ed-04',
    code: 'ED-04',
    name: 'Atelier Print',
    categoryId: 'editorial',
    categoryLabel: 'Editorial',
    description:
      'Parisian couture silver-retention look: metallic sculpted shadows & restraint.',
    grade: {
      exposure: -0.06,
      contrast: 0.18,
      highlights: -0.16,
      shadows: -0.1,
      fade: 0.06,
      temperature: 0.04,
      bleachBypass: 0.48,
      saturation: -0.26,
      hslHue: [0.0, -0.04, -0.15, -0.25, 0.0, -0.05],
      hslSat: [-0.15, -0.28, -0.4, -0.6, -0.5, -0.45],
      shadowTint: hexRgb('#2A2622'),
      shadowTintStrength: 0.3,
      midtoneTint: hexRgb('#C9BFB2'),
      midtoneTintStrength: 0.18,
      highlightTint: hexRgb('#E8E1D6'),
      highlightTintStrength: 0.24,
      grain: 0.24,
      vignette: 0.26,
    },
  },
  {
    id: 'ed-05',
    code: 'ED-05',
    name: 'Offset 1994',
    categoryId: 'editorial',
    categoryLabel: 'Editorial',
    description:
      'Four-color vintage magazine offset press with cyan-olive cross-process cast.',
    grade: {
      exposure: 0.04,
      contrast: 0.1,
      highlights: -0.22,
      shadows: 0.14,
      fade: 0.16,
      temperature: 0.08,
      tint: -0.16,
      crossProcess: 0.62,
      saturation: -0.2,
      hslHue: [0.1, 0.06, -0.12, -0.28, -0.15, -0.22],
      hslSat: [-0.12, -0.18, 0.14, -0.25, 0.15, -0.3],
      shadowTint: hexRgb('#22332F'),
      shadowTintStrength: 0.34,
      midtoneTint: hexRgb('#D8CFAD'),
      midtoneTintStrength: 0.22,
      highlightTint: hexRgb('#EDE2C4'),
      highlightTintStrength: 0.3,
      grain: 0.42,
      vignette: 0.18,
    },
  },
  {
    id: 'ed-06',
    code: 'ED-06',
    name: 'Runway Graphite',
    categoryId: 'editorial',
    categoryLabel: 'Editorial',
    description:
      'Stark cool slate fashion editorial with steel-indigo depth and icy whites.',
    grade: {
      exposure: -0.06,
      contrast: 0.32,
      highlights: 0.06,
      shadows: -0.16,
      fade: 0.04,
      temperature: -0.26,
      tint: -0.04,
      saturation: -0.44,
      hslHue: [-0.08, -0.1, -0.2, 0.22, 0.08, -0.06],
      hslSat: [-0.25, -0.45, -0.65, -0.7, -0.18, 0.18],
      hslLum: [0.0, -0.05, -0.08, -0.2, -0.05, -0.22],
      shadowTint: hexRgb('#152232'),
      shadowTintStrength: 0.42,
      highlightTint: hexRgb('#DCE6F0'),
      highlightTintStrength: 0.28,
      grain: 0.22,
      vignette: 0.28,
    },
  },
  {
    id: 'ed-07',
    code: 'ED-07',
    name: 'Lith Print',
    categoryId: 'editorial',
    categoryLabel: 'Editorial',
    isSignature: true,
    description:
      'Rare darkroom lith process: toasted peach-terracotta highlights & velvet umber.',
    grade: {
      exposure: 0.02,
      contrast: 0.28,
      highlights: -0.12,
      shadows: -0.06,
      fade: 0.12,
      temperature: 0.28,
      tint: 0.12,
      sepia: 0.56,
      saturation: -0.35,
      shadowTint: hexRgb('#2A1610'),
      shadowTintStrength: 0.48,
      midtoneTint: hexRgb('#BA7E5C'),
      midtoneTintStrength: 0.26,
      highlightTint: hexRgb('#F5CFA8'),
      highlightTintStrength: 0.46,
      bloom: 0.22,
      halation: 0.26,
      grain: 0.36,
      vignette: 0.32,
    },
  },

  // ================= 02 · NATURE =================
  {
    id: 'nt-01',
    code: 'NT-01',
    name: 'Cascade Air',
    categoryId: 'nature',
    categoryLabel: 'Nature',
    description:
      'Crisp waterfall mist: glacial aqua highlights & clean jade-emerald foliage.',
    grade: {
      exposure: 0.1,
      contrast: 0.14,
      highlights: -0.12,
      shadows: 0.18,
      fade: 0.04,
      temperature: -0.14,
      tint: -0.08,
      vibrance: 0.24,
      hslHue: [0.0, 0.04, 0.18, 0.24, 0.06, -0.12],
      hslSat: [-0.15, -0.18, -0.22, 0.22, 0.35, 0.15],
      hslLum: [0.0, 0.04, 0.08, -0.06, 0.16, 0.04],
      shadowTint: hexRgb('#153336'),
      shadowTintStrength: 0.3,
      highlightTint: hexRgb('#DCF2F0'),
      highlightTintStrength: 0.32,
      bloom: 0.18,
      grain: 0.14,
      vignette: 0.12,
    },
  },
  {
    id: 'nt-02',
    code: 'NT-02',
    name: 'Sunlit Canopy',
    categoryId: 'nature',
    categoryLabel: 'Nature',
    description:
      'Golden-hour woodland film: warm honey ochre leaves & glowing sunbeams.',
    grade: {
      exposure: 0.08,
      contrast: 0.12,
      highlights: -0.1,
      shadows: 0.14,
      fade: 0.06,
      temperature: 0.3,
      tint: 0.04,
      vibrance: 0.22,
      hslHue: [0.04, 0.08, -0.18, -0.42, -0.2, -0.16],
      hslSat: [0.15, 0.24, 0.34, -0.14, -0.3, -0.22],
      hslLum: [0.0, 0.12, 0.16, -0.05, 0.0, -0.08],
      shadowTint: hexRgb('#2B2818'),
      shadowTintStrength: 0.26,
      highlightTint: hexRgb('#F5D799'),
      highlightTintStrength: 0.38,
      bloom: 0.28,
      halation: 0.16,
      grain: 0.18,
      vignette: 0.14,
    },
  },
  {
    id: 'nt-03',
    code: 'NT-03',
    name: 'Nordic Lichen',
    categoryId: 'nature',
    categoryLabel: 'Nature',
    description:
      'Pale Scandinavian overcast fog: muted silver-sage moss & chalky mist.',
    grade: {
      exposure: 0.06,
      contrast: -0.04,
      highlights: -0.22,
      shadows: 0.24,
      fade: 0.16,
      temperature: -0.1,
      tint: -0.06,
      saturation: -0.34,
      hslHue: [0.0, -0.08, 0.1, 0.16, -0.08, -0.14],
      hslSat: [-0.35, -0.45, -0.55, -0.48, -0.42, -0.4],
      hslLum: [0.05, 0.08, 0.12, 0.14, 0.12, 0.06],
      shadowTint: hexRgb('#2E3833'),
      shadowTintStrength: 0.32,
      highlightTint: hexRgb('#E5EAE0'),
      highlightTintStrength: 0.34,
      bloom: 0.22,
      grain: 0.2,
      vignette: 0.12,
    },
  },
  {
    id: 'nt-04',
    code: 'NT-04',
    name: 'Deep Moss',
    categoryId: 'nature',
    categoryLabel: 'Nature',
    description:
      'Moody Pacific Northwest rainforest: rich wet pine & dark cedar shadows.',
    grade: {
      exposure: -0.14,
      contrast: 0.26,
      highlights: -0.24,
      shadows: -0.16,
      fade: 0.05,
      temperature: -0.04,
      tint: -0.12,
      saturation: -0.16,
      hslHue: [-0.05, -0.12, -0.22, 0.08, 0.12, -0.1],
      hslSat: [-0.2, -0.15, -0.32, 0.28, -0.25, -0.35],
      hslLum: [-0.15, -0.12, -0.22, -0.32, -0.18, -0.28],
      shadowTint: hexRgb('#122419'),
      shadowTintStrength: 0.44,
      midtoneTint: hexRgb('#4D614B'),
      midtoneTintStrength: 0.2,
      highlightTint: hexRgb('#C8D4C0'),
      highlightTintStrength: 0.2,
      grain: 0.26,
      vignette: 0.34,
    },
  },
  {
    id: 'nt-05',
    code: 'NT-05',
    name: 'Basalt Rain',
    categoryId: 'nature',
    categoryLabel: 'Nature',
    description:
      'Volcanic Icelandic storm: cold steel-blue water, silver rock & bleach edge.',
    grade: {
      exposure: -0.1,
      contrast: 0.28,
      highlights: -0.1,
      shadows: -0.12,
      fade: 0.06,
      temperature: -0.28,
      bleachBypass: 0.42,
      saturation: -0.34,
      hslHue: [0.0, -0.12, -0.2, 0.35, 0.14, -0.04],
      hslSat: [-0.3, -0.5, -0.65, -0.55, 0.18, 0.24],
      hslLum: [-0.1, -0.1, -0.14, -0.26, 0.04, -0.16],
      shadowTint: hexRgb('#162634'),
      shadowTintStrength: 0.44,
      highlightTint: hexRgb('#D0DEE8'),
      highlightTintStrength: 0.3,
      grain: 0.28,
      vignette: 0.32,
    },
  },
  {
    id: 'nt-06',
    code: 'NT-06',
    name: 'Cedar Dusk',
    categoryId: 'nature',
    categoryLabel: 'Nature',
    description:
      'Alpine twilight: russet autumn copper highlights over cool indigo valleys.',
    grade: {
      exposure: -0.08,
      contrast: 0.2,
      highlights: -0.16,
      shadows: -0.06,
      fade: 0.08,
      temperature: 0.16,
      tint: 0.08,
      crossProcess: 0.28,
      hslHue: [-0.06, -0.1, -0.32, -0.55, 0.05, 0.14],
      hslSat: [0.24, 0.26, 0.16, -0.38, -0.22, 0.16],
      hslLum: [-0.08, 0.02, -0.08, -0.24, -0.12, -0.22],
      shadowTint: hexRgb('#202238'),
      shadowTintStrength: 0.4,
      highlightTint: hexRgb('#E5AE7E'),
      highlightTintStrength: 0.36,
      halation: 0.2,
      grain: 0.26,
      vignette: 0.28,
    },
  },
  {
    id: 'nt-07',
    code: 'NT-07',
    name: 'Chlorophyll Silver',
    categoryId: 'nature',
    categoryLabel: 'Nature',
    isSignature: true,
    description:
      'Rare experimental Aerochrome-silver alchemy turning foliage surreal crimson-bronze.',
    grade: {
      exposure: 0.02,
      contrast: 0.24,
      highlights: -0.12,
      shadows: 0.06,
      fade: 0.08,
      temperature: 0.04,
      infraredShift: 0.78,
      bleachBypass: 0.24,
      hslHue: [0.04, -0.06, -0.18, 0.0, 0.1, -0.08],
      hslSat: [0.18, -0.12, 0.12, 0.15, 0.24, 0.18],
      shadowTint: hexRgb('#1D2832'),
      shadowTintStrength: 0.34,
      highlightTint: hexRgb('#EFE3D8'),
      highlightTintStrength: 0.28,
      bloom: 0.24,
      halation: 0.22,
      grain: 0.26,
      vignette: 0.22,
    },
  },

  // ================= 03 · COASTAL =================
  {
    id: 'cs-01',
    code: 'CS-01',
    name: 'Salt Paper',
    categoryId: 'coastal',
    categoryLabel: 'Coastal',
    description:
      'Sun-bleached limestone & airy linen haze with soft coastal Pro-Mist bloom.',
    grade: {
      exposure: 0.16,
      contrast: -0.04,
      highlights: -0.2,
      shadows: 0.28,
      fade: 0.15,
      temperature: 0.14,
      saturation: -0.24,
      hslHue: [0.04, 0.06, -0.1, 0.1, -0.08, -0.12],
      hslSat: [-0.2, -0.12, -0.24, -0.5, -0.22, -0.28],
      hslLum: [0.08, 0.14, 0.18, 0.08, 0.14, 0.1],
      shadowTint: hexRgb('#3D3B38'),
      shadowTintStrength: 0.2,
      highlightTint: hexRgb('#F6EDE0'),
      highlightTintStrength: 0.4,
      bloom: 0.36,
      grain: 0.14,
      vignette: 0.06,
    },
  },
  {
    id: 'cs-02',
    code: 'CS-02',
    name: 'Amalfi 160',
    categoryId: 'coastal',
    categoryLabel: 'Coastal',
    description:
      'Mediterranean Kodak Portra daylight: luminous sea-glass turquoise & warm terracotta.',
    grade: {
      exposure: 0.1,
      contrast: 0.12,
      highlights: -0.14,
      shadows: 0.16,
      fade: 0.05,
      temperature: 0.2,
      vibrance: 0.32,
      skinProtect: 0.55,
      hslHue: [-0.04, 0.05, -0.12, 0.26, -0.12, -0.22],
      hslSat: [0.22, 0.26, 0.18, -0.15, 0.42, 0.24],
      hslLum: [0.0, 0.08, 0.12, 0.02, 0.14, 0.06],
      shadowTint: hexRgb('#1C3840'),
      shadowTintStrength: 0.26,
      highlightTint: hexRgb('#F5DFBE'),
      highlightTintStrength: 0.32,
      bloom: 0.2,
      grain: 0.18,
      vignette: 0.1,
    },
  },
  {
    id: 'cs-03',
    code: 'CS-03',
    name: 'Limestone Haze',
    categoryId: 'coastal',
    categoryLabel: 'Coastal',
    description:
      'Chalky midday sun softened into quiet bone whites and pale fog-blue.',
    grade: {
      exposure: 0.12,
      contrast: -0.1,
      highlights: -0.28,
      shadows: 0.3,
      fade: 0.2,
      temperature: -0.06,
      saturation: -0.38,
      hslHue: [0.0, 0.02, -0.08, 0.12, 0.04, -0.08],
      hslSat: [-0.35, -0.32, -0.45, -0.6, -0.32, -0.34],
      hslLum: [0.06, 0.1, 0.14, 0.1, 0.16, 0.14],
      shadowTint: hexRgb('#39444B'),
      shadowTintStrength: 0.28,
      highlightTint: hexRgb('#EEECE6'),
      highlightTintStrength: 0.38,
      bloom: 0.3,
      grain: 0.16,
      vignette: 0.08,
    },
  },
  {
    id: 'cs-04',
    code: 'CS-04',
    name: 'Nordic Tide',
    categoryId: 'coastal',
    categoryLabel: 'Coastal',
    description:
      'Stormy North Atlantic coast: deep petrol-teal waves & steel overcast contrast.',
    grade: {
      exposure: -0.1,
      contrast: 0.24,
      highlights: -0.12,
      shadows: -0.12,
      fade: 0.06,
      temperature: -0.28,
      tint: -0.1,
      bleachBypass: 0.32,
      hslHue: [0.0, -0.08, -0.16, 0.34, -0.14, -0.16],
      hslSat: [-0.25, -0.34, -0.48, -0.38, 0.26, 0.18],
      hslLum: [-0.1, -0.1, -0.14, -0.2, -0.12, -0.24],
      shadowTint: hexRgb('#112D38'),
      shadowTintStrength: 0.44,
      highlightTint: hexRgb('#C4DCE4'),
      highlightTintStrength: 0.3,
      grain: 0.26,
      vignette: 0.28,
    },
  },
  {
    id: 'cs-05',
    code: 'CS-05',
    name: 'Dusk Cove',
    categoryId: 'coastal',
    categoryLabel: 'Coastal',
    description:
      'Sunset shoreline pairing warm apricot surf glow with violet-indigo tide.',
    grade: {
      exposure: -0.08,
      contrast: 0.2,
      highlights: -0.14,
      shadows: -0.06,
      fade: 0.08,
      temperature: 0.14,
      tint: 0.14,
      vibrance: 0.2,
      hslHue: [-0.08, -0.06, -0.18, 0.1, 0.12, 0.18],
      hslSat: [0.24, 0.28, 0.16, -0.36, -0.12, 0.22],
      shadowTint: hexRgb('#231F3D'),
      shadowTintStrength: 0.44,
      highlightTint: hexRgb('#F5B88E'),
      highlightTintStrength: 0.4,
      bloom: 0.24,
      halation: 0.28,
      grain: 0.24,
      vignette: 0.26,
    },
  },
  {
    id: 'cs-06',
    code: 'CS-06',
    name: 'Aegean Slate',
    categoryId: 'coastal',
    categoryLabel: 'Coastal',
    description:
      'Punchy Greek island contrast: deep cobalt-sapphire sea against stark whitewash.',
    grade: {
      exposure: 0.04,
      contrast: 0.3,
      highlights: 0.1,
      shadows: -0.1,
      temperature: -0.18,
      vibrance: 0.26,
      hslHue: [0.0, -0.04, -0.12, 0.18, 0.22, 0.04],
      hslSat: [0.1, -0.22, -0.4, -0.45, 0.34, 0.48],
      hslLum: [-0.05, 0.04, 0.08, -0.18, -0.12, -0.26],
      shadowTint: hexRgb('#122444'),
      shadowTintStrength: 0.36,
      highlightTint: hexRgb('#F5F4F0'),
      highlightTintStrength: 0.32,
      grain: 0.18,
      vignette: 0.18,
    },
  },
  {
    id: 'cs-07',
    code: 'CS-07',
    name: 'Cyanotype Drift',
    categoryId: 'coastal',
    categoryLabel: 'Coastal',
    isSignature: true,
    description:
      'Authentic 19th-century Prussian Blue sun-print on warm handmade cotton rag.',
    grade: {
      exposure: 0.04,
      contrast: 0.28,
      highlights: -0.06,
      shadows: 0.04,
      fade: 0.1,
      grayscale: 0.88,
      shadowTint: hexRgb('#0B3C64'),
      shadowTintStrength: 0.65,
      midtoneTint: hexRgb('#2A6B94'),
      midtoneTintStrength: 0.48,
      highlightTint: hexRgb('#F2EDE0'),
      highlightTintStrength: 0.42,
      bloom: 0.14,
      grain: 0.24,
      vignette: 0.2,
    },
  },

  // ================= 04 · PORTRAIT =================
  {
    id: 'pt-01',
    code: 'PT-01',
    name: 'Silk 160',
    categoryId: 'portrait',
    categoryLabel: 'Portrait',
    description:
      'Luminous medium-format skin tones with Pro-Mist diffusion & pastel highlights.',
    grade: {
      exposure: 0.1,
      contrast: 0.04,
      highlights: -0.2,
      shadows: 0.2,
      fade: 0.09,
      temperature: 0.14,
      tint: 0.06,
      saturation: -0.14,
      skinProtect: 0.78,
      hslHue: [0.04, 0.03, -0.1, -0.18, -0.1, -0.1],
      hslSat: [0.06, -0.06, -0.26, -0.48, -0.35, -0.32],
      hslLum: [0.06, 0.14, 0.12, -0.06, 0.04, -0.06],
      shadowTint: hexRgb('#352B27'),
      shadowTintStrength: 0.22,
      highlightTint: hexRgb('#F5E3D2'),
      highlightTintStrength: 0.34,
      bloom: 0.36,
      grain: 0.14,
      vignette: 0.1,
    },
  },
  {
    id: 'pt-02',
    code: 'PT-02',
    name: 'Ivory Daylight',
    categoryId: 'portrait',
    categoryLabel: 'Portrait',
    description:
      'Pure northern studio window light: clean neutral porcelain skin & crisp linen.',
    grade: {
      exposure: 0.12,
      contrast: 0.08,
      highlights: -0.1,
      shadows: 0.22,
      fade: 0.06,
      temperature: -0.08,
      tint: 0.02,
      saturation: -0.18,
      skinProtect: 0.72,
      hslHue: [0.0, 0.02, -0.16, 0.08, 0.04, -0.06],
      hslSat: [-0.08, -0.16, -0.45, -0.52, -0.32, -0.28],
      hslLum: [0.04, 0.14, 0.16, 0.0, 0.08, 0.02],
      shadowTint: hexRgb('#2A2E33'),
      shadowTintStrength: 0.18,
      highlightTint: hexRgb('#F7F6F2'),
      highlightTintStrength: 0.34,
      bloom: 0.18,
      grain: 0.1,
      vignette: 0.06,
    },
  },
  {
    id: 'pt-03',
    code: 'PT-03',
    name: 'Alabaster Flash',
    categoryId: 'portrait',
    categoryLabel: 'Portrait',
    description:
      'Direct editorial studio strobe: high-fashion pop, cool chalk backdrop & crisp edge.',
    grade: {
      exposure: 0.1,
      contrast: 0.3,
      highlights: 0.16,
      shadows: -0.06,
      fade: 0.03,
      temperature: -0.14,
      tint: 0.04,
      saturation: -0.18,
      skinProtect: 0.65,
      hslHue: [-0.05, 0.0, -0.14, 0.14, 0.06, -0.08],
      hslSat: [0.24, -0.12, -0.4, -0.55, -0.28, -0.2],
      hslLum: [-0.04, 0.16, 0.14, -0.14, 0.04, -0.14],
      shadowTint: hexRgb('#181B22'),
      shadowTintStrength: 0.28,
      highlightTint: hexRgb('#F8F5F0'),
      highlightTintStrength: 0.32,
      halation: 0.14,
      grain: 0.16,
      vignette: 0.24,
    },
  },
  {
    id: 'pt-04',
    code: 'PT-04',
    name: 'Atelier Shadow',
    categoryId: 'portrait',
    categoryLabel: 'Portrait',
    description:
      'Sculptural low-key fashion portrait: deep charcoal falloff & warm olive-taupe.',
    grade: {
      exposure: -0.12,
      contrast: 0.28,
      highlights: -0.14,
      shadows: -0.18,
      fade: 0.05,
      temperature: 0.04,
      bleachBypass: 0.28,
      saturation: -0.28,
      skinProtect: 0.68,
      hslHue: [0.0, 0.02, -0.18, -0.24, -0.08, -0.12],
      hslSat: [-0.1, -0.18, -0.44, -0.62, -0.54, -0.52],
      hslLum: [-0.06, 0.04, -0.08, -0.24, -0.14, -0.24],
      shadowTint: hexRgb('#1C1B18'),
      shadowTintStrength: 0.34,
      highlightTint: hexRgb('#E2D9C9'),
      highlightTintStrength: 0.24,
      grain: 0.24,
      vignette: 0.36,
    },
  },
  {
    id: 'pt-05',
    code: 'PT-05',
    name: 'Velvet Portrait',
    categoryId: 'portrait',
    categoryLabel: 'Portrait',
    description:
      'Intimate analog portrait: dusty rose-taupe shadows, dreamy bloom & creamy matte.',
    grade: {
      exposure: -0.06,
      contrast: 0.12,
      highlights: -0.22,
      shadows: 0.1,
      fade: 0.14,
      temperature: 0.18,
      tint: 0.16,
      saturation: -0.2,
      skinProtect: 0.6,
      hslHue: [-0.06, 0.0, -0.16, -0.26, -0.14, 0.08],
      hslSat: [0.1, -0.08, -0.32, -0.58, -0.44, -0.36],
      shadowTint: hexRgb('#362124'),
      shadowTintStrength: 0.42,
      highlightTint: hexRgb('#F0D4BC'),
      highlightTintStrength: 0.36,
      bloom: 0.32,
      halation: 0.18,
      grain: 0.28,
      vignette: 0.32,
    },
  },
  {
    id: 'pt-06',
    code: 'PT-06',
    name: 'Umber Skin',
    categoryId: 'portrait',
    categoryLabel: 'Portrait',
    description:
      'Sunkissed golden-hour bronze: rich terracotta skin & warm espresso falloff.',
    grade: {
      exposure: -0.02,
      contrast: 0.18,
      highlights: -0.1,
      shadows: -0.06,
      fade: 0.06,
      temperature: 0.34,
      tint: 0.06,
      vibrance: 0.24,
      skinProtect: 0.4,
      hslHue: [-0.06, -0.04, -0.22, -0.38, -0.18, -0.16],
      hslSat: [0.22, 0.28, 0.14, -0.44, -0.4, -0.34],
      hslLum: [-0.08, -0.04, 0.04, -0.18, -0.12, -0.22],
      shadowTint: hexRgb('#332012'),
      shadowTintStrength: 0.38,
      highlightTint: hexRgb('#F2C58E'),
      highlightTintStrength: 0.38,
      bloom: 0.2,
      grain: 0.22,
      vignette: 0.24,
    },
  },
  {
    id: 'pt-07',
    code: 'PT-07',
    name: 'Platinum Matte',
    categoryId: 'portrait',
    categoryLabel: 'Portrait',
    isSignature: true,
    description:
      'Rare platinum-palladium darkroom print: warm pearl-silver tonal delicacy.',
    grade: {
      exposure: 0.06,
      contrast: 0.16,
      highlights: -0.14,
      shadows: 0.16,
      fade: 0.14,
      grayscale: 0.84,
      sepia: 0.28,
      shadowTint: hexRgb('#2D2721'),
      shadowTintStrength: 0.36,
      midtoneTint: hexRgb('#B8AA96'),
      midtoneTintStrength: 0.26,
      highlightTint: hexRgb('#F5EBD8'),
      highlightTintStrength: 0.4,
      bloom: 0.24,
      grain: 0.22,
      vignette: 0.22,
    },
  },

  // ================= 05 · ARCHITECTURE =================
  {
    id: 'ar-01',
    code: 'AR-01',
    name: 'Travertine',
    categoryId: 'architecture',
    categoryLabel: 'Architecture',
    description:
      'Sun-washed Roman stone & warm sand travertine paired with calm slate sky.',
    grade: {
      exposure: 0.08,
      contrast: 0.16,
      highlights: -0.14,
      shadows: 0.12,
      fade: 0.06,
      temperature: 0.24,
      saturation: -0.16,
      hslHue: [0.02, 0.04, -0.14, -0.26, -0.1, -0.12],
      hslSat: [0.08, 0.18, 0.12, -0.52, -0.34, -0.28],
      hslLum: [0.0, 0.08, 0.1, -0.1, 0.02, -0.12],
      shadowTint: hexRgb('#302820'),
      shadowTintStrength: 0.28,
      highlightTint: hexRgb('#EFE0C6'),
      highlightTintStrength: 0.36,
      grain: 0.14,
      vignette: 0.12,
    },
  },
  {
    id: 'ar-02',
    code: 'AR-02',
    name: 'Gallery White',
    categoryId: 'architecture',
    categoryLabel: 'Architecture',
    description:
      'Minimalist museum plaster daylight: neutralized yellow casts & crisp purity.',
    grade: {
      exposure: 0.14,
      contrast: 0.12,
      highlights: 0.06,
      shadows: 0.22,
      fade: 0.06,
      temperature: -0.16,
      saturation: -0.34,
      hslHue: [0.0, 0.0, -0.1, 0.06, 0.0, -0.06],
      hslSat: [-0.24, -0.44, -0.62, -0.58, -0.38, -0.3],
      hslLum: [0.04, 0.12, 0.18, 0.04, 0.12, 0.08],
      shadowTint: hexRgb('#2B2E30'),
      shadowTintStrength: 0.18,
      highlightTint: hexRgb('#F8F9FA'),
      highlightTintStrength: 0.38,
      grain: 0.08,
      vignette: 0.06,
    },
  },
  {
    id: 'ar-03',
    code: 'AR-03',
    name: 'Pumice Daylight',
    categoryId: 'architecture',
    categoryLabel: 'Architecture',
    description:
      'Dry architectural monograph print: dusty beige stone & lifted chalk matte.',
    grade: {
      exposure: 0.06,
      contrast: 0.02,
      highlights: -0.22,
      shadows: 0.2,
      fade: 0.18,
      temperature: 0.1,
      saturation: -0.38,
      hslSat: [-0.3, -0.28, -0.32, -0.62, -0.54, -0.48],
      shadowTint: hexRgb('#3C3933'),
      shadowTintStrength: 0.32,
      midtoneTint: hexRgb('#CFC6B8'),
      midtoneTintStrength: 0.22,
      highlightTint: hexRgb('#EDE6DA'),
      highlightTintStrength: 0.32,
      bloom: 0.2,
      grain: 0.22,
      vignette: 0.12,
    },
  },
  {
    id: 'ar-04',
    code: 'AR-04',
    name: 'Brutalist Stone',
    categoryId: 'architecture',
    categoryLabel: 'Architecture',
    description:
      'Raw poured concrete monolith: assertive dark contrast & cold slate gray.',
    grade: {
      exposure: -0.1,
      contrast: 0.32,
      highlights: -0.06,
      shadows: -0.16,
      fade: 0.04,
      temperature: -0.18,
      saturation: -0.54,
      hslSat: [-0.4, -0.55, -0.7, -0.75, -0.45, -0.28],
      shadowTint: hexRgb('#1C2124'),
      shadowTintStrength: 0.38,
      highlightTint: hexRgb('#DCE0E2'),
      highlightTintStrength: 0.24,
      grain: 0.28,
      vignette: 0.26,
    },
  },
  {
    id: 'ar-05',
    code: 'AR-05',
    name: 'Shadow Vault',
    categoryId: 'architecture',
    categoryLabel: 'Architecture',
    description:
      'Dramatic afternoon architectural geometry carved into deep velvet ink.',
    grade: {
      exposure: -0.18,
      contrast: 0.42,
      highlights: 0.14,
      shadows: -0.28,
      fade: 0.02,
      temperature: 0.08,
      saturation: -0.36,
      hslSat: [-0.18, -0.24, -0.36, -0.64, -0.54, -0.48],
      shadowTint: hexRgb('#141312'),
      shadowTintStrength: 0.4,
      highlightTint: hexRgb('#EBE2D3'),
      highlightTintStrength: 0.3,
      grain: 0.22,
      vignette: 0.4,
    },
  },
  {
    id: 'ar-06',
    code: 'AR-06',
    name: 'Concrete 1600',
    categoryId: 'architecture',
    categoryLabel: 'Architecture',
    description:
      'Push-processed 1600 architectural film: steel-cyan shadows & heavy silver grain.',
    grade: {
      exposure: -0.06,
      contrast: 0.26,
      highlights: -0.1,
      shadows: -0.08,
      fade: 0.1,
      temperature: -0.24,
      tint: -0.08,
      saturation: -0.42,
      hslHue: [0.0, -0.08, -0.12, 0.24, 0.06, -0.06],
      hslSat: [-0.36, -0.48, -0.6, -0.56, 0.08, 0.14],
      shadowTint: hexRgb('#1A2934'),
      shadowTintStrength: 0.42,
      highlightTint: hexRgb('#D2DEE4'),
      highlightTintStrength: 0.28,
      grain: 0.64,
      vignette: 0.26,
    },
  },
  {
    id: 'ar-07',
    code: 'AR-07',
    name: 'Swiss Bleach',
    categoryId: 'architecture',
    categoryLabel: 'Architecture',
    isSignature: true,
    description:
      'Signature architectural monograph bleach-bypass: metallic silver & surgical blacks.',
    grade: {
      exposure: 0.04,
      contrast: 0.28,
      highlights: 0.1,
      shadows: -0.12,
      fade: 0.05,
      bleachBypass: 0.84,
      saturation: -0.46,
      shadowTint: hexRgb('#171A1E'),
      shadowTintStrength: 0.36,
      highlightTint: hexRgb('#F0EFEA'),
      highlightTintStrength: 0.34,
      grain: 0.22,
      vignette: 0.22,
    },
  },

  // ================= 06 · STREET =================
  {
    id: 'st-01',
    code: 'ST-01',
    name: 'Daylight 400',
    categoryId: 'street',
    categoryLabel: 'Street',
    description:
      'Classic Chrome 35mm documentary: punchy brick reds & disciplined cool teal-greens.',
    grade: {
      exposure: 0.04,
      contrast: 0.22,
      highlights: -0.1,
      shadows: 0.06,
      fade: 0.05,
      temperature: 0.04,
      vibrance: 0.16,
      hslHue: [-0.04, 0.02, -0.12, 0.22, 0.06, -0.14],
      hslSat: [0.32, 0.1, -0.18, -0.34, -0.16, -0.12],
      hslLum: [-0.08, 0.04, 0.04, -0.14, -0.04, -0.14],
      shadowTint: hexRgb('#1E2A30'),
      shadowTintStrength: 0.26,
      highlightTint: hexRgb('#F0EAE0'),
      highlightTintStrength: 0.22,
      grain: 0.26,
      vignette: 0.16,
    },
  },
  {
    id: 'st-02',
    code: 'ST-02',
    name: 'Sunbleached',
    categoryId: 'street',
    categoryLabel: 'Street',
    description:
      'Nostalgic 1990s faded summer film: dusty honey highlights & warm matte fade.',
    grade: {
      exposure: 0.12,
      contrast: -0.06,
      highlights: -0.22,
      shadows: 0.24,
      fade: 0.2,
      temperature: 0.26,
      tint: 0.08,
      crossProcess: 0.34,
      saturation: -0.18,
      hslHue: [0.06, 0.04, -0.16, -0.3, -0.16, -0.12],
      hslSat: [0.08, 0.14, 0.18, -0.4, -0.28, -0.32],
      shadowTint: hexRgb('#3D2E27'),
      shadowTintStrength: 0.34,
      highlightTint: hexRgb('#F4DFB4'),
      highlightTintStrength: 0.4,
      bloom: 0.28,
      grain: 0.28,
      vignette: 0.14,
    },
  },
  {
    id: 'st-03',
    code: 'ST-03',
    name: 'Chrome 200',
    categoryId: 'street',
    categoryLabel: 'Street',
    description:
      'High-impact Ektachrome slide film: deep saturated cobalt skies & fiery reds.',
    grade: {
      exposure: -0.02,
      contrast: 0.34,
      highlights: 0.08,
      shadows: -0.14,
      temperature: -0.04,
      vibrance: 0.42,
      saturation: 0.14,
      hslHue: [-0.06, -0.04, -0.1, 0.12, 0.1, 0.04],
      hslSat: [0.42, 0.22, 0.16, 0.1, 0.24, 0.42],
      hslLum: [-0.1, 0.0, 0.04, -0.12, -0.08, -0.24],
      shadowTint: hexRgb('#152232'),
      shadowTintStrength: 0.26,
      highlightTint: hexRgb('#F4EFE6'),
      highlightTintStrength: 0.18,
      grain: 0.2,
      vignette: 0.22,
    },
  },
  {
    id: 'st-04',
    code: 'ST-04',
    name: 'Asphalt 800',
    categoryId: 'street',
    categoryLabel: 'Street',
    description:
      'Gritty overcast street documentary: cool slate pavement & dense 800 silver grain.',
    grade: {
      exposure: -0.08,
      contrast: 0.26,
      highlights: -0.08,
      shadows: -0.1,
      fade: 0.08,
      temperature: -0.2,
      saturation: -0.34,
      hslSat: [-0.12, -0.32, -0.45, -0.58, -0.28, -0.12],
      shadowTint: hexRgb('#1E2730'),
      shadowTintStrength: 0.38,
      highlightTint: hexRgb('#CED6DC'),
      highlightTintStrength: 0.24,
      grain: 0.6,
      vignette: 0.3,
    },
  },
  {
    id: 'st-05',
    code: 'ST-05',
    name: 'Rain Transit',
    categoryId: 'street',
    categoryLabel: 'Street',
    description:
      'Wet commuter reflections: deep petrol-cyan shadows with warm amber highlights.',
    grade: {
      exposure: -0.12,
      contrast: 0.24,
      highlights: -0.12,
      shadows: -0.1,
      fade: 0.07,
      temperature: -0.18,
      tint: -0.08,
      hslHue: [-0.04, 0.04, -0.18, 0.28, -0.08, -0.14],
      hslSat: [0.18, 0.24, -0.1, -0.44, 0.34, 0.18],
      shadowTint: hexRgb('#0F2B34'),
      shadowTintStrength: 0.48,
      highlightTint: hexRgb('#E8C9A4'),
      highlightTintStrength: 0.28,
      bloom: 0.18,
      halation: 0.18,
      grain: 0.3,
      vignette: 0.3,
    },
  },
  {
    id: 'st-06',
    code: 'ST-06',
    name: 'Wet Graphite',
    categoryId: 'street',
    categoryLabel: 'Street',
    description:
      'Near-monochrome urban charcoal letting faint rust-red & amber street signs glow.',
    grade: {
      exposure: -0.08,
      contrast: 0.34,
      highlights: 0.06,
      shadows: -0.16,
      fade: 0.06,
      bleachBypass: 0.38,
      saturation: -0.52,
      hslSat: [0.65, 0.22, -0.75, -0.92, -0.88, -0.82],
      shadowTint: hexRgb('#1B1D21'),
      shadowTintStrength: 0.38,
      highlightTint: hexRgb('#DEDCD6'),
      highlightTintStrength: 0.24,
      grain: 0.38,
      vignette: 0.3,
    },
  },
  {
    id: 'st-07',
    code: 'ST-07',
    name: 'Tokyo Fluorescent',
    categoryId: 'street',
    categoryLabel: 'Street',
    isSignature: true,
    description:
      'Signature Hong Kong / Tokyo cinema jade-fluorescent cast with crisp red halation.',
    grade: {
      exposure: -0.04,
      contrast: 0.22,
      highlights: -0.1,
      shadows: 0.06,
      fade: 0.09,
      temperature: -0.14,
      tint: -0.34,
      crossProcess: 0.52,
      hslHue: [-0.08, 0.08, 0.22, 0.28, -0.14, -0.18],
      hslSat: [0.34, 0.14, 0.12, 0.24, 0.32, -0.18],
      shadowTint: hexRgb('#0F332B'),
      shadowTintStrength: 0.52,
      midtoneTint: hexRgb('#6EA896'),
      midtoneTintStrength: 0.24,
      highlightTint: hexRgb('#D8F0DC'),
      highlightTintStrength: 0.34,
      bloom: 0.24,
      halation: 0.36,
      grain: 0.36,
      vignette: 0.24,
    },
  },

  // ================= 07 · STILL LIFE =================
  {
    id: 'sl-01',
    code: 'SL-01',
    name: 'Raw Linen',
    categoryId: 'still-life',
    categoryLabel: 'Still Life',
    description:
      'Soft woven-linen tabletop light with airy neutral whites & calm Pro-Mist glow.',
    grade: {
      exposure: 0.12,
      contrast: 0.02,
      highlights: -0.18,
      shadows: 0.24,
      fade: 0.12,
      temperature: 0.08,
      saturation: -0.24,
      hslSat: [-0.18, -0.16, -0.24, -0.48, -0.44, -0.4],
      shadowTint: hexRgb('#373530'),
      shadowTintStrength: 0.22,
      highlightTint: hexRgb('#F3EDE2'),
      highlightTintStrength: 0.34,
      bloom: 0.28,
      grain: 0.12,
      vignette: 0.08,
    },
  },
  {
    id: 'sl-02',
    code: 'SL-02',
    name: 'Ceramist',
    categoryId: 'still-life',
    categoryLabel: 'Still Life',
    description:
      'Unglazed terracotta clay & warm stoneware with deeply muted cool backgrounds.',
    grade: {
      exposure: 0.04,
      contrast: 0.16,
      highlights: -0.12,
      shadows: 0.08,
      fade: 0.06,
      temperature: 0.24,
      hslHue: [-0.06, -0.04, -0.18, -0.28, -0.12, -0.14],
      hslSat: [0.3, 0.32, 0.14, -0.58, -0.56, -0.52],
      hslLum: [-0.08, -0.02, 0.04, -0.16, -0.1, -0.16],
      shadowTint: hexRgb('#2E221A'),
      shadowTintStrength: 0.32,
      highlightTint: hexRgb('#EDD4B8'),
      highlightTintStrength: 0.32,
      grain: 0.18,
      vignette: 0.16,
    },
  },
  {
    id: 'sl-03',
    code: 'SL-03',
    name: 'Bone Porcelain',
    categoryId: 'still-life',
    categoryLabel: 'Still Life',
    description:
      'Delicate cool porcelain whites and translucent silver-lavender shadow whispers.',
    grade: {
      exposure: 0.14,
      contrast: 0.06,
      highlights: -0.08,
      shadows: 0.24,
      fade: 0.14,
      temperature: -0.18,
      tint: 0.1,
      saturation: -0.34,
      hslSat: [-0.26, -0.38, -0.56, -0.58, -0.26, -0.16],
      shadowTint: hexRgb('#32303D'),
      shadowTintStrength: 0.34,
      highlightTint: hexRgb('#F5F4F8'),
      highlightTintStrength: 0.38,
      bloom: 0.26,
      grain: 0.12,
      vignette: 0.1,
    },
  },
  {
    id: 'sl-04',
    code: 'SL-04',
    name: 'Cabinet Dark',
    categoryId: 'still-life',
    categoryLabel: 'Still Life',
    description:
      'Museum vitrine stillness anchored in deep velvet obsidian shadows.',
    grade: {
      exposure: -0.2,
      contrast: 0.34,
      highlights: -0.06,
      shadows: -0.26,
      fade: 0.03,
      temperature: 0.04,
      saturation: -0.26,
      hslSat: [0.06, -0.08, -0.24, -0.52, -0.48, -0.42],
      shadowTint: hexRgb('#121211'),
      shadowTintStrength: 0.42,
      highlightTint: hexRgb('#E5DEC9'),
      highlightTintStrength: 0.26,
      grain: 0.2,
      vignette: 0.48,
    },
  },
  {
    id: 'sl-05',
    code: 'SL-05',
    name: 'Archive 1978',
    categoryId: 'still-life',
    categoryLabel: 'Still Life',
    description:
      'Aged art-book monograph print with warm yellowed rag paper & cross-process patina.',
    grade: {
      exposure: 0.02,
      contrast: 0.08,
      highlights: -0.24,
      shadows: 0.16,
      fade: 0.19,
      temperature: 0.28,
      sepia: 0.38,
      crossProcess: 0.32,
      saturation: -0.24,
      shadowTint: hexRgb('#382F22'),
      shadowTintStrength: 0.38,
      highlightTint: hexRgb('#F0DCAA'),
      highlightTintStrength: 0.42,
      grain: 0.34,
      vignette: 0.22,
    },
  },
  {
    id: 'sl-06',
    code: 'SL-06',
    name: 'Oxidized Bronze',
    categoryId: 'still-life',
    categoryLabel: 'Still Life',
    description:
      'Antique sculpture patina: deep verdigris olive-teal shadows & burnished brass.',
    grade: {
      exposure: -0.08,
      contrast: 0.24,
      highlights: -0.1,
      shadows: -0.1,
      fade: 0.06,
      temperature: 0.08,
      tint: -0.14,
      bleachBypass: 0.26,
      hslHue: [-0.04, -0.08, -0.18, 0.26, -0.14, -0.18],
      hslSat: [-0.1, 0.16, 0.22, -0.22, 0.18, -0.4],
      shadowTint: hexRgb('#18332B'),
      shadowTintStrength: 0.48,
      midtoneTint: hexRgb('#8E8A63'),
      midtoneTintStrength: 0.22,
      highlightTint: hexRgb('#E8C988'),
      highlightTintStrength: 0.38,
      grain: 0.24,
      vignette: 0.28,
    },
  },
  {
    id: 'sl-07',
    code: 'SL-07',
    name: 'Flemish Light',
    categoryId: 'still-life',
    categoryLabel: 'Still Life',
    isSignature: true,
    description:
      'Old-master chiaroscuro: painterly golden-ochre bloom & rich burnt-umber depth.',
    grade: {
      exposure: -0.14,
      contrast: 0.32,
      highlights: -0.06,
      shadows: -0.22,
      fade: 0.04,
      temperature: 0.32,
      tint: 0.06,
      vibrance: 0.18,
      hslHue: [-0.06, -0.04, -0.22, -0.34, -0.16, -0.08],
      hslSat: [0.28, 0.26, 0.14, -0.45, -0.42, -0.18],
      shadowTint: hexRgb('#26170C'),
      shadowTintStrength: 0.52,
      midtoneTint: hexRgb('#A87B46'),
      midtoneTintStrength: 0.28,
      highlightTint: hexRgb('#F5CE86'),
      highlightTintStrength: 0.44,
      bloom: 0.32,
      halation: 0.22,
      grain: 0.24,
      vignette: 0.44,
    },
  },

  // ================= 08 · FOOD & COFFEE =================
  {
    id: 'fc-01',
    code: 'FC-01',
    name: 'Morning Pastry',
    categoryId: 'food-coffee',
    categoryLabel: 'Food & Coffee',
    description:
      'Sunlit bakery table: buttery golden croissants, creamy highlights & soft bloom.',
    grade: {
      exposure: 0.14,
      contrast: 0.08,
      highlights: -0.16,
      shadows: 0.22,
      fade: 0.08,
      temperature: 0.24,
      vibrance: 0.22,
      hslHue: [0.02, 0.04, -0.14, -0.14, -0.1, -0.1],
      hslSat: [0.16, 0.28, 0.24, -0.28, -0.36, -0.34],
      hslLum: [0.04, 0.1, 0.12, 0.0, 0.04, 0.0],
      shadowTint: hexRgb('#362B20'),
      shadowTintStrength: 0.22,
      highlightTint: hexRgb('#F7E5C4'),
      highlightTintStrength: 0.38,
      bloom: 0.3,
      grain: 0.12,
      vignette: 0.08,
    },
  },
  {
    id: 'fc-02',
    code: 'FC-02',
    name: 'Matcha Table',
    categoryId: 'food-coffee',
    categoryLabel: 'Food & Coffee',
    description:
      'Crisp Japanese daylight keeping botanical matcha greens lush against pure ceramics.',
    grade: {
      exposure: 0.1,
      contrast: 0.14,
      highlights: -0.08,
      shadows: 0.18,
      fade: 0.04,
      temperature: -0.06,
      tint: -0.08,
      vibrance: 0.22,
      hslHue: [0.0, 0.04, 0.16, 0.06, -0.06, -0.08],
      hslSat: [-0.08, -0.14, 0.12, 0.44, -0.22, -0.28],
      hslLum: [0.0, 0.06, 0.08, 0.06, 0.06, 0.02],
      shadowTint: hexRgb('#1F2E22'),
      shadowTintStrength: 0.24,
      highlightTint: hexRgb('#F3F5EF'),
      highlightTintStrength: 0.3,
      bloom: 0.14,
      grain: 0.1,
      vignette: 0.08,
    },
  },
  {
    id: 'fc-03',
    code: 'FC-03',
    name: 'Kyoto Hinoki',
    categoryId: 'food-coffee',
    categoryLabel: 'Food & Coffee',
    description:
      'Serene Japanese cypress counter: pale warm wood tones & ultra-clean matte calm.',
    grade: {
      exposure: 0.08,
      contrast: 0.02,
      highlights: -0.2,
      shadows: 0.22,
      fade: 0.15,
      temperature: 0.14,
      saturation: -0.24,
      hslHue: [0.04, 0.06, -0.12, -0.2, -0.12, -0.14],
      hslSat: [-0.14, 0.04, -0.18, -0.44, -0.48, -0.44],
      shadowTint: hexRgb('#36322B'),
      shadowTintStrength: 0.26,
      midtoneTint: hexRgb('#DFCEB8'),
      midtoneTintStrength: 0.2,
      highlightTint: hexRgb('#F2EADF'),
      highlightTintStrength: 0.32,
      bloom: 0.22,
      grain: 0.14,
      vignette: 0.1,
    },
  },
  {
    id: 'fc-04',
    code: 'FC-04',
    name: 'Espresso Roast',
    categoryId: 'food-coffee',
    categoryLabel: 'Food & Coffee',
    description:
      'Dark specialty coffee bar: deep walnut contrast & rich copper-crema highlights.',
    grade: {
      exposure: -0.14,
      contrast: 0.3,
      highlights: -0.1,
      shadows: -0.2,
      fade: 0.05,
      temperature: 0.18,
      hslHue: [-0.04, -0.06, -0.2, -0.32, -0.12, -0.12],
      hslSat: [0.16, 0.24, 0.06, -0.54, -0.56, -0.48],
      hslLum: [-0.1, -0.06, -0.06, -0.22, -0.16, -0.22],
      shadowTint: hexRgb('#221710'),
      shadowTintStrength: 0.44,
      highlightTint: hexRgb('#E3C39D'),
      highlightTintStrength: 0.3,
      grain: 0.24,
      vignette: 0.36,
    },
  },
  {
    id: 'fc-05',
    code: 'FC-05',
    name: 'Bistro Candle',
    categoryId: 'food-coffee',
    categoryLabel: 'Food & Coffee',
    description:
      'Evening wine-bar intimacy: glowing candle amber halation & burgundy-mahogany depth.',
    grade: {
      exposure: -0.1,
      contrast: 0.22,
      highlights: -0.12,
      shadows: -0.12,
      fade: 0.07,
      temperature: 0.38,
      tint: 0.12,
      vibrance: 0.18,
      hslHue: [-0.08, -0.04, -0.2, -0.34, -0.1, 0.12],
      hslSat: [0.3, 0.32, 0.18, -0.48, -0.46, -0.26],
      shadowTint: hexRgb('#301414'),
      shadowTintStrength: 0.48,
      highlightTint: hexRgb('#F7C57E'),
      highlightTintStrength: 0.44,
      bloom: 0.3,
      halation: 0.34,
      grain: 0.26,
      vignette: 0.36,
    },
  },
  {
    id: 'fc-06',
    code: 'FC-06',
    name: 'Burnt Umber',
    categoryId: 'food-coffee',
    categoryLabel: 'Food & Coffee',
    description:
      'Moody roasted cocoa & ceramic palette with cool desaturated slate surroundings.',
    grade: {
      exposure: -0.1,
      contrast: 0.24,
      highlights: -0.18,
      shadows: -0.1,
      fade: 0.08,
      temperature: 0.06,
      bleachBypass: 0.3,
      saturation: -0.3,
      hslHue: [-0.04, -0.08, -0.2, 0.1, 0.0, -0.08],
      hslSat: [0.14, 0.2, -0.18, -0.64, -0.62, -0.44],
      shadowTint: hexRgb('#26211E'),
      shadowTintStrength: 0.38,
      highlightTint: hexRgb('#D8C8B4'),
      highlightTintStrength: 0.26,
      grain: 0.26,
      vignette: 0.3,
    },
  },
  {
    id: 'fc-07',
    code: 'FC-07',
    name: 'Cardamom Cream',
    categoryId: 'food-coffee',
    categoryLabel: 'Food & Coffee',
    isSignature: true,
    description:
      'Signature Nordic café magazine look: spiced ivory highlights & velvety olive-clay.',
    grade: {
      exposure: 0.04,
      contrast: 0.12,
      highlights: -0.18,
      shadows: 0.12,
      fade: 0.13,
      temperature: 0.2,
      tint: -0.06,
      saturation: -0.22,
      hslHue: [0.02, 0.02, -0.14, -0.22, -0.12, -0.14],
      hslSat: [0.1, 0.14, 0.06, -0.32, -0.5, -0.46],
      shadowTint: hexRgb('#2B3022'),
      shadowTintStrength: 0.42,
      midtoneTint: hexRgb('#C8B89A'),
      midtoneTintStrength: 0.26,
      highlightTint: hexRgb('#F5E6CA'),
      highlightTintStrength: 0.42,
      bloom: 0.26,
      grain: 0.2,
      vignette: 0.18,
    },
  },

  // ================= 09 · NIGHT =================
  {
    id: 'ng-01',
    code: 'NG-01',
    name: 'Blue Hour',
    categoryId: 'night',
    categoryLabel: 'Night',
    description:
      'Deep twilight sapphire sky balanced cleanly against warm golden café windows.',
    grade: {
      exposure: 0.02,
      contrast: 0.22,
      highlights: -0.12,
      shadows: 0.12,
      fade: 0.04,
      temperature: -0.22,
      vibrance: 0.28,
      hslHue: [-0.04, 0.04, -0.12, 0.2, 0.1, 0.02],
      hslSat: [0.22, 0.34, 0.2, -0.34, 0.22, 0.52],
      hslLum: [0.0, 0.08, 0.1, -0.16, 0.0, -0.12],
      shadowTint: hexRgb('#102348'),
      shadowTintStrength: 0.46,
      highlightTint: hexRgb('#F2D4A6'),
      highlightTintStrength: 0.3,
      bloom: 0.22,
      grain: 0.22,
      vignette: 0.22,
    },
  },
  {
    id: 'ng-02',
    code: 'NG-02',
    name: 'Neon Soft',
    categoryId: 'night',
    categoryLabel: 'Night',
    description:
      'Dreamy urban neon: open lavender shadows, vibrant cyan/magenta & Pro-Mist bloom.',
    grade: {
      exposure: 0.06,
      contrast: 0.12,
      highlights: -0.16,
      shadows: 0.26,
      fade: 0.12,
      temperature: -0.12,
      tint: 0.18,
      vibrance: 0.36,
      hslHue: [-0.08, -0.06, -0.1, 0.24, -0.08, 0.12],
      hslSat: [0.36, 0.2, 0.08, -0.18, 0.44, 0.34],
      shadowTint: hexRgb('#261C3D'),
      shadowTintStrength: 0.44,
      highlightTint: hexRgb('#F2D4EC'),
      highlightTintStrength: 0.28,
      bloom: 0.48,
      halation: 0.24,
      grain: 0.24,
      vignette: 0.2,
    },
  },
  {
    id: 'ng-03',
    code: 'NG-03',
    name: 'Vapor Mist',
    categoryId: 'night',
    categoryLabel: 'Night',
    description:
      'Hazy midnight fog diffusing streetlamps into atmospheric silver-violet glow.',
    grade: {
      exposure: 0.04,
      contrast: -0.04,
      highlights: -0.22,
      shadows: 0.28,
      fade: 0.18,
      temperature: -0.16,
      tint: 0.12,
      saturation: -0.26,
      shadowTint: hexRgb('#2B2A3C'),
      shadowTintStrength: 0.4,
      highlightTint: hexRgb('#E4E2F0'),
      highlightTintStrength: 0.36,
      bloom: 0.58,
      grain: 0.28,
      vignette: 0.18,
    },
  },
  {
    id: 'ng-04',
    code: 'NG-04',
    name: 'Tungsten 800',
    categoryId: 'night',
    categoryLabel: 'Night',
    description:
      'Authentic CineStill 800T cinema stock: petrol-cyan shadows & crimson red halation.',
    grade: {
      exposure: -0.06,
      contrast: 0.24,
      highlights: -0.1,
      shadows: 0.04,
      fade: 0.06,
      temperature: -0.26,
      tint: -0.08,
      vibrance: 0.22,
      hslHue: [-0.06, 0.02, -0.14, 0.32, -0.1, -0.14],
      hslSat: [0.36, 0.28, 0.12, -0.26, 0.38, 0.26],
      shadowTint: hexRgb('#0B2C38'),
      shadowTintStrength: 0.54,
      highlightTint: hexRgb('#F5CFA0'),
      highlightTintStrength: 0.32,
      bloom: 0.24,
      halation: 0.68,
      grain: 0.38,
      vignette: 0.28,
    },
  },
  {
    id: 'ng-05',
    code: 'NG-05',
    name: 'Midnight Ink',
    categoryId: 'night',
    categoryLabel: 'Night',
    description:
      'Stark neo-noir nocturnal stillness with crushed obsidian blacks & silver gleam.',
    grade: {
      exposure: -0.16,
      contrast: 0.38,
      highlights: 0.12,
      shadows: -0.28,
      fade: 0.02,
      temperature: -0.18,
      bleachBypass: 0.44,
      saturation: -0.4,
      shadowTint: hexRgb('#10141C'),
      shadowTintStrength: 0.44,
      highlightTint: hexRgb('#DCE4EE'),
      highlightTintStrength: 0.26,
      grain: 0.3,
      vignette: 0.42,
    },
  },
  {
    id: 'ng-06',
    code: 'NG-06',
    name: 'Velvet Mercury',
    categoryId: 'night',
    categoryLabel: 'Night',
    description:
      'Cool emerald mercury-vapor streetlamp atmosphere with moody slate-teal shadows.',
    grade: {
      exposure: -0.06,
      contrast: 0.2,
      highlights: -0.14,
      shadows: 0.04,
      fade: 0.08,
      temperature: -0.2,
      tint: -0.28,
      crossProcess: 0.36,
      hslHue: [0.0, 0.08, 0.18, 0.24, -0.12, -0.18],
      hslSat: [-0.14, -0.1, 0.08, 0.28, 0.36, -0.12],
      shadowTint: hexRgb('#102E2C'),
      shadowTintStrength: 0.5,
      highlightTint: hexRgb('#CBE8DF'),
      highlightTintStrength: 0.34,
      bloom: 0.32,
      grain: 0.32,
      vignette: 0.28,
    },
  },
  {
    id: 'ng-07',
    code: 'NG-07',
    name: 'Sodium Dusk',
    categoryId: 'night',
    categoryLabel: 'Night',
    isSignature: true,
    description:
      'Signature amber sodium-lamp halation counterbalanced by deep plum-indigo night.',
    grade: {
      exposure: -0.08,
      contrast: 0.26,
      highlights: -0.08,
      shadows: -0.06,
      fade: 0.07,
      temperature: 0.26,
      tint: 0.14,
      hslHue: [-0.06, -0.04, -0.18, -0.2, 0.1, 0.18],
      hslSat: [0.3, 0.4, 0.28, -0.44, -0.18, 0.26],
      shadowTint: hexRgb('#241438'),
      shadowTintStrength: 0.56,
      midtoneTint: hexRgb('#9E5B3E'),
      midtoneTintStrength: 0.22,
      highlightTint: hexRgb('#F9C46C'),
      highlightTintStrength: 0.48,
      bloom: 0.28,
      halation: 0.54,
      grain: 0.34,
      vignette: 0.32,
    },
  },

  // ================= 10 · MONOCHROME =================
  {
    id: 'mo-01',
    code: 'MO-01',
    name: 'Chalk Matte',
    categoryId: 'monochrome',
    categoryLabel: 'Monochrome',
    description:
      'High-key fine-art paper B&W: lifted dusty charcoal toe & gentle dreamy glow.',
    grade: {
      exposure: 0.14,
      contrast: -0.1,
      highlights: -0.16,
      shadows: 0.3,
      fade: 0.21,
      grayscale: 1.0,
      shadowTint: hexRgb('#3A3834'),
      shadowTintStrength: 0.26,
      highlightTint: hexRgb('#F3EFE6'),
      highlightTintStrength: 0.26,
      bloom: 0.24,
      grain: 0.16,
      vignette: 0.08,
    },
  },
  {
    id: 'mo-02',
    code: 'MO-02',
    name: 'Silver Daylight',
    categoryId: 'monochrome',
    categoryLabel: 'Monochrome',
    description:
      'Luminous Leica-style archival monochrome with open midtones & pure crisp whites.',
    grade: {
      exposure: 0.1,
      contrast: 0.16,
      highlights: 0.06,
      shadows: 0.2,
      fade: 0.04,
      grayscale: 1.0,
      highlightTint: hexRgb('#F8F8F8'),
      highlightTintStrength: 0.18,
      grain: 0.14,
      vignette: 0.1,
    },
  },
  {
    id: 'mo-03',
    code: 'MO-03',
    name: 'Platinum Paper',
    categoryId: 'monochrome',
    categoryLabel: 'Monochrome',
    description:
      'Warm cotton-rag fiber print: champagne-cream highlights & soft umber shadows.',
    grade: {
      exposure: 0.06,
      contrast: 0.12,
      highlights: -0.12,
      shadows: 0.14,
      fade: 0.12,
      grayscale: 1.0,
      sepia: 0.34,
      shadowTint: hexRgb('#362A1E'),
      shadowTintStrength: 0.38,
      highlightTint: hexRgb('#F5E6C8'),
      highlightTintStrength: 0.42,
      bloom: 0.18,
      grain: 0.18,
      vignette: 0.16,
    },
  },
  {
    id: 'mo-04',
    code: 'MO-04',
    name: 'Silver Gelatin',
    categoryId: 'monochrome',
    categoryLabel: 'Monochrome',
    description:
      'Classic darkroom fiber exhibition print: deep ink blacks & brilliant highlights.',
    grade: {
      exposure: -0.04,
      contrast: 0.42,
      highlights: 0.18,
      shadows: -0.24,
      fade: 0.02,
      grayscale: 1.0,
      grain: 0.24,
      vignette: 0.24,
    },
  },
  {
    id: 'mo-05',
    code: 'MO-05',
    name: 'Tri-X Noir',
    categoryId: 'monochrome',
    categoryLabel: 'Monochrome',
    description:
      'Gritty push-processed 35mm Tri-X street look with assertive grain & edge punch.',
    grade: {
      exposure: -0.08,
      contrast: 0.38,
      highlights: 0.12,
      shadows: -0.16,
      fade: 0.07,
      grayscale: 1.0,
      bleachBypass: 0.24,
      grain: 0.78,
      vignette: 0.34,
    },
  },
  {
    id: 'mo-06',
    code: 'MO-06',
    name: 'Carbon Ink',
    categoryId: 'monochrome',
    categoryLabel: 'Monochrome',
    description:
      'Brooding low-key carbon-pigment density with sculptural highlight compression.',
    grade: {
      exposure: -0.22,
      contrast: 0.36,
      highlights: -0.1,
      shadows: -0.34,
      fade: 0.04,
      grayscale: 1.0,
      shadowTint: hexRgb('#111214'),
      shadowTintStrength: 0.42,
      grain: 0.28,
      vignette: 0.48,
    },
  },
  {
    id: 'mo-07',
    code: 'MO-07',
    name: 'Selenium Print',
    categoryId: 'monochrome',
    categoryLabel: 'Monochrome',
    isSignature: true,
    description:
      'Exhibition selenium-toned darkroom print: metallic aubergine-slate shadow sheen.',
    grade: {
      exposure: -0.02,
      contrast: 0.3,
      highlights: 0.06,
      shadows: -0.1,
      fade: 0.06,
      grayscale: 1.0,
      bleachBypass: 0.3,
      shadowTint: hexRgb('#252034'),
      shadowTintStrength: 0.56,
      midtoneTint: hexRgb('#7D7A8C'),
      midtoneTintStrength: 0.24,
      highlightTint: hexRgb('#EEF0F4'),
      highlightTintStrength: 0.32,
      bloom: 0.12,
      grain: 0.24,
      vignette: 0.24,
    },
  },

  // ================= 11 · SELF-PORTRAIT (SELFIE & FRONT-CAM) =================
  {
    id: 'sp-01',
    code: 'SP-01',
    name: 'Soft Dew',
    categoryId: 'self-portrait',
    categoryLabel: 'Self-Portrait',
    description:
      'Luminous bare-skin hydration with gentle Pro-Mist highlight bloom and calm neutral whites.',
    grade: {
      exposure: 0.1,
      contrast: -0.04,
      highlights: -0.22,
      shadows: 0.18,
      fade: 0.05,
      temperature: 0.06,
      tint: 0.04,
      saturation: -0.08,
      vibrance: 0.12,
      skinProtect: 0.88,
      hslHue: [0.02, 0.01, -0.04, -0.05, 0, 0],
      hslSat: [0.08, -0.06, -0.14, -0.18, -0.12, -0.1],
      hslLum: [0.04, 0.1, 0.04, 0, 0.02, 0],
      highlightTint: hexRgb('#FFF6EE'),
      highlightTintStrength: 0.26,
      shadowTint: hexRgb('#362E2B'),
      shadowTintStrength: 0.18,
      clarity: -0.14,
      bloom: 0.32,
      grain: 0.08,
      vignette: 0.06,
    },
  },
  {
    id: 'sp-02',
    code: 'SP-02',
    name: 'Rose Quartz',
    categoryId: 'self-portrait',
    categoryLabel: 'Self-Portrait',
    description:
      'Delicate rosy-peach cheek warmth crafted for sunlit bedroom windows and golden indoor bounce.',
    grade: {
      exposure: 0.08,
      contrast: 0.02,
      highlights: -0.18,
      shadows: 0.14,
      fade: 0.07,
      temperature: 0.11,
      tint: 0.12,
      saturation: -0.06,
      vibrance: 0.16,
      skinProtect: 0.86,
      hslHue: [-0.03, -0.02, -0.06, -0.08, 0.02, -0.04],
      hslSat: [0.16, -0.04, -0.18, -0.22, -0.14, -0.14],
      hslLum: [0.05, 0.09, 0.02, -0.02, 0, 0],
      highlightTint: hexRgb('#FCE8E2'),
      highlightTintStrength: 0.34,
      midtoneTint: hexRgb('#E8C9C2'),
      midtoneTintStrength: 0.16,
      shadowTint: hexRgb('#3A2A2D'),
      shadowTintStrength: 0.24,
      clarity: -0.1,
      bloom: 0.26,
      grain: 0.12,
      vignette: 0.1,
    },
  },
  {
    id: 'sp-03',
    code: 'SP-03',
    name: 'Mirror Flash',
    categoryId: 'self-portrait',
    categoryLabel: 'Self-Portrait',
    description:
      'Editorial pocket-camera direct flash: crisp skin separation, specular pop, and cool room shadows.',
    grade: {
      exposure: 0.06,
      contrast: 0.24,
      highlights: 0.12,
      shadows: -0.14,
      fade: 0.04,
      temperature: -0.04,
      tint: 0.02,
      saturation: -0.1,
      vibrance: 0.1,
      skinProtect: 0.82,
      hslHue: [0.02, 0.01, -0.05, 0.04, 0.03, -0.02],
      hslSat: [0.06, -0.12, -0.2, -0.18, -0.08, -0.1],
      hslLum: [0.02, 0.08, 0.04, -0.06, 0, -0.04],
      highlightTint: hexRgb('#F7F5F2'),
      highlightTintStrength: 0.24,
      shadowTint: hexRgb('#22272F'),
      shadowTintStrength: 0.36,
      clarity: 0.14,
      sharpen: 0.16,
      bloom: 0.2,
      grain: 0.24,
      vignette: 0.3,
    },
  },
  {
    id: 'sp-04',
    code: 'SP-04',
    name: 'Glass Skin',
    categoryId: 'self-portrait',
    categoryLabel: 'Self-Portrait',
    description:
      'Clean Seoul beauty-editorial finish: translucent cool-porcelain highlights that calm indoor yellow cast.',
    grade: {
      exposure: 0.12,
      contrast: 0.04,
      highlights: -0.14,
      shadows: 0.22,
      fade: 0.03,
      temperature: -0.12,
      tint: 0.05,
      saturation: -0.14,
      vibrance: 0.14,
      skinProtect: 0.9,
      hslHue: [-0.02, 0.02, 0.04, 0.06, 0.02, 0],
      hslSat: [0.04, -0.14, -0.28, -0.2, -0.06, -0.08],
      hslLum: [0.06, 0.14, 0.08, 0.02, 0.04, 0.02],
      highlightTint: hexRgb('#F2F6FA'),
      highlightTintStrength: 0.3,
      shadowTint: hexRgb('#2D333C'),
      shadowTintStrength: 0.2,
      clarity: -0.08,
      sharpen: 0.12,
      bloom: 0.22,
      grain: 0.05,
      vignette: 0.04,
    },
  },
  {
    id: 'sp-05',
    code: 'SP-05',
    name: 'Sun Kissed',
    categoryId: 'self-portrait',
    categoryLabel: 'Self-Portrait',
    description:
      'Late-afternoon golden glow with protected natural complexion so warm light never turns skin orange.',
    grade: {
      exposure: 0.05,
      contrast: 0.1,
      highlights: -0.24,
      shadows: 0.1,
      fade: 0.06,
      temperature: 0.22,
      tint: 0.04,
      saturation: -0.04,
      vibrance: 0.18,
      skinProtect: 0.92,
      hslHue: [0.03, -0.02, -0.08, -0.12, -0.06, -0.06],
      hslSat: [0.1, -0.08, 0.08, -0.16, -0.18, -0.16],
      hslLum: [0.02, 0.06, 0.06, -0.04, -0.02, -0.06],
      highlightTint: hexRgb('#F9E4C4'),
      highlightTintStrength: 0.42,
      midtoneTint: hexRgb('#DFC19E'),
      midtoneTintStrength: 0.18,
      shadowTint: hexRgb('#352820'),
      shadowTintStrength: 0.28,
      clarity: -0.04,
      bloom: 0.24,
      halation: 0.14,
      grain: 0.14,
      vignette: 0.14,
    },
  },
  {
    id: 'sp-06',
    code: 'SP-06',
    name: 'Velvet Matte',
    categoryId: 'self-portrait',
    categoryLabel: 'Self-Portrait',
    description:
      'Soft-focus matte highlight roll-off that tames oily shine and leaves velvety studio-taupe shadows.',
    grade: {
      exposure: 0.02,
      contrast: -0.02,
      highlights: -0.34,
      shadows: 0.12,
      fade: 0.14,
      temperature: 0.05,
      tint: 0.02,
      saturation: -0.22,
      vibrance: 0.06,
      skinProtect: 0.88,
      hslHue: [0.02, 0.01, -0.06, -0.08, 0, -0.04],
      hslSat: [-0.04, -0.12, -0.26, -0.3, -0.24, -0.22],
      hslLum: [0.02, 0.06, 0, -0.04, -0.02, -0.02],
      highlightTint: hexRgb('#EDE5DA'),
      highlightTintStrength: 0.3,
      shadowTint: hexRgb('#38312B'),
      shadowTintStrength: 0.34,
      clarity: -0.18,
      bloom: 0.18,
      grain: 0.18,
      vignette: 0.18,
    },
  },
  {
    id: 'sp-07',
    code: 'SP-07',
    name: '2000s Digicam',
    categoryId: 'self-portrait',
    categoryLabel: 'Self-Portrait',
    isSignature: true,
    description:
      'Nostalgic early-2000s CCD pocket digicam charm: soft optical glow, cyan-jade shadow cast & gentle lens fringe.',
    grade: {
      exposure: 0.06,
      contrast: 0.14,
      highlights: 0.08,
      shadows: 0.06,
      fade: 0.09,
      temperature: -0.06,
      tint: -0.08,
      saturation: 0.06,
      vibrance: 0.16,
      crossProcess: 0.22,
      skinProtect: 0.78,
      hslHue: [0.04, 0.02, 0.06, 0.08, -0.04, -0.06],
      hslSat: [0.12, -0.06, 0.08, 0.06, 0.14, 0.1],
      hslLum: [0.02, 0.08, 0.05, 0, 0.04, -0.04],
      highlightTint: hexRgb('#F8F2DF'),
      highlightTintStrength: 0.32,
      shadowTint: hexRgb('#24383B'),
      shadowTintStrength: 0.38,
      clarity: -0.12,
      chromaticAberration: 0.24,
      bloom: 0.42,
      grain: 0.32,
      vignette: 0.22,
    },
  },

  // ================= 12 · ICONS 25 (CAMERAS, ANALOG FILMS & ICONIC LOOKS) =================
  // --- 8 Iconic Digital Camera Color Sciences ---
  {
    id: 'ic-01',
    code: 'IC-01',
    name: 'Classic Chrome',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Muted documentary slide simulation: desaturated teal skies, restrained reds, and crisp hard shadow transitions.',
    grade: {
      exposure: -0.02,
      contrast: 0.2,
      highlights: -0.16,
      shadows: -0.12,
      fade: 0.05,
      temperature: 0.04,
      tint: -0.03,
      saturation: -0.2,
      vibrance: -0.04,
      skinProtect: 0.65,
      hslHue: [0.04, 0.02, -0.05, -0.12, -0.12, -0.14],
      hslSat: [-0.22, -0.12, -0.24, -0.34, -0.22, -0.28],
      hslLum: [-0.06, 0.02, -0.04, -0.12, -0.08, -0.12],
      highlightTint: hexRgb('#ECE6DA'),
      highlightTintStrength: 0.24,
      shadowTint: hexRgb('#232C30'),
      shadowTintStrength: 0.32,
      clarity: 0.18,
      sharpen: 0.14,
      grain: 0.18,
      vignette: 0.14,
    },
  },
  {
    id: 'ic-02',
    code: 'IC-02',
    name: 'Classic Neg',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Expressive Japanese street negative simulation: deep emerald greens, crimson-rust reds, and warm highlight roll-off.',
    grade: {
      exposure: -0.03,
      contrast: 0.26,
      highlights: -0.14,
      shadows: -0.16,
      fade: 0.06,
      temperature: 0.06,
      tint: -0.07,
      saturation: -0.06,
      vibrance: 0.1,
      crossProcess: 0.18,
      skinProtect: 0.6,
      hslHue: [-0.04, 0.04, -0.1, 0.14, -0.1, -0.08],
      hslSat: [0.22, -0.12, -0.16, -0.14, 0.12, -0.18],
      hslLum: [-0.1, 0.04, -0.02, -0.16, -0.06, -0.14],
      highlightTint: hexRgb('#F3E4CE'),
      highlightTintStrength: 0.32,
      shadowTint: hexRgb('#1C2D2B'),
      shadowTintStrength: 0.42,
      clarity: 0.16,
      grain: 0.26,
      vignette: 0.18,
    },
  },
  {
    id: 'ic-03',
    code: 'IC-03',
    name: 'Velvia Vivid',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'High-impact 50-ISO reversal slide vibrancy: luminous forest emerald, rich cobalt skies, and dramatic sunset magenta.',
    grade: {
      exposure: -0.04,
      contrast: 0.32,
      highlights: -0.08,
      shadows: -0.22,
      fade: 0,
      temperature: 0.04,
      tint: 0.08,
      saturation: 0.28,
      vibrance: 0.36,
      hslHue: [-0.04, -0.02, -0.04, 0.06, -0.04, 0.04],
      hslSat: [0.3, 0.18, 0.24, 0.34, 0.26, 0.34],
      hslLum: [-0.08, -0.02, 0.02, -0.08, -0.06, -0.16],
      highlightTint: hexRgb('#FBECE2'),
      highlightTintStrength: 0.18,
      shadowTint: hexRgb('#1D1E32'),
      shadowTintStrength: 0.3,
      clarity: 0.24,
      sharpen: 0.2,
      grain: 0.1,
      vignette: 0.16,
    },
  },
  {
    id: 'ic-04',
    code: 'IC-04',
    name: 'Leica M Natural',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Rangefinder optical micro-contrast: three-dimensional midtone pop, sculptural deep shadows, and honest European color.',
    grade: {
      exposure: -0.04,
      contrast: 0.24,
      highlights: -0.12,
      shadows: -0.18,
      fade: 0.02,
      temperature: -0.02,
      tint: 0,
      saturation: -0.08,
      vibrance: 0.14,
      skinProtect: 0.72,
      hslHue: [0.02, 0, -0.03, -0.04, 0, -0.03],
      hslSat: [0.06, -0.06, -0.12, -0.16, -0.06, -0.08],
      hslLum: [-0.06, 0.02, 0, -0.08, -0.04, -0.1],
      highlightTint: hexRgb('#F3F0EA'),
      highlightTintStrength: 0.16,
      shadowTint: hexRgb('#1C2026'),
      shadowTintStrength: 0.32,
      clarity: 0.32,
      sharpen: 0.24,
      grain: 0.1,
      vignette: 0.24,
    },
  },
  {
    id: 'ic-05',
    code: 'IC-05',
    name: 'Leica Brass',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Fixed-lens 28mm cinema rendering: toasted brass highlights, deep olive foliage, and velvet obsidian blacks.',
    grade: {
      exposure: -0.06,
      contrast: 0.28,
      highlights: -0.18,
      shadows: -0.22,
      fade: 0.04,
      temperature: 0.12,
      tint: -0.04,
      saturation: -0.16,
      vibrance: 0.08,
      skinProtect: 0.7,
      hslHue: [0.03, -0.02, -0.1, -0.16, -0.08, -0.1],
      hslSat: [0.08, 0.04, -0.14, -0.28, -0.22, -0.24],
      hslLum: [-0.08, 0.02, -0.04, -0.14, -0.1, -0.14],
      highlightTint: hexRgb('#EBCCA0'),
      highlightTintStrength: 0.38,
      shadowTint: hexRgb('#1F2520'),
      shadowTintStrength: 0.38,
      clarity: 0.26,
      sharpen: 0.18,
      grain: 0.16,
      vignette: 0.3,
    },
  },
  {
    id: 'ic-06',
    code: 'IC-06',
    name: 'Medium Natural',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Swedish medium-format natural color science: silky 16-bit highlight roll-off, pure azure skies, and true-to-life skin.',
    grade: {
      exposure: 0.06,
      contrast: 0.1,
      highlights: -0.26,
      shadows: 0.16,
      fade: 0.02,
      temperature: 0.03,
      tint: 0.02,
      saturation: -0.04,
      vibrance: 0.16,
      skinProtect: 0.9,
      hslHue: [0.01, 0, -0.02, -0.02, 0.02, -0.02],
      hslSat: [0.04, -0.04, -0.08, -0.06, 0.06, 0.04],
      hslLum: [0.02, 0.06, 0.04, 0, 0.02, -0.04],
      highlightTint: hexRgb('#F6F2EA'),
      highlightTintStrength: 0.2,
      shadowTint: hexRgb('#26282C'),
      shadowTintStrength: 0.18,
      clarity: 0.16,
      sharpen: 0.22,
      grain: 0.04,
      vignette: 0.08,
    },
  },
  {
    id: 'ic-07',
    code: 'IC-07',
    name: 'GR Positive',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Compact 28mm Tokyo street Positive Film: punchy asphalt contrast, deep sapphire blues, and unmistakable edge grit.',
    grade: {
      exposure: -0.05,
      contrast: 0.34,
      highlights: 0.04,
      shadows: -0.24,
      fade: 0.02,
      temperature: -0.04,
      tint: -0.04,
      saturation: 0.06,
      vibrance: 0.14,
      bleachBypass: 0.14,
      hslHue: [0.02, -0.02, -0.04, 0.06, -0.08, -0.04],
      hslSat: [0.18, 0.04, -0.1, -0.12, 0.08, 0.14],
      hslLum: [-0.08, 0, -0.02, -0.14, -0.08, -0.16],
      highlightTint: hexRgb('#ECE9E2'),
      highlightTintStrength: 0.2,
      shadowTint: hexRgb('#19242C'),
      shadowTintStrength: 0.42,
      clarity: 0.3,
      sharpen: 0.24,
      grain: 0.28,
      vignette: 0.32,
    },
  },
  {
    id: 'ic-08',
    code: 'IC-08',
    name: 'GR Hi-Contrast B&W',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Iconic street snapshot high-contrast monochrome: bold ink-black shadows, electric white highlights, and gritty grain.',
    grade: {
      exposure: -0.06,
      contrast: 0.52,
      highlights: 0.2,
      shadows: -0.34,
      fade: 0.02,
      grayscale: 1.0,
      bleachBypass: 0.26,
      clarity: 0.38,
      sharpen: 0.26,
      grain: 0.64,
      vignette: 0.38,
    },
  },

  // --- 10 Legendary Analog Film Stocks ---
  {
    id: 'ic-09',
    code: 'IC-09',
    name: 'Portra 400',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Beloved daylight portrait negative: luminous golden-peach skin, airy creamy highlights, and fine organic grain.',
    grade: {
      exposure: 0.1,
      contrast: 0.04,
      highlights: -0.22,
      shadows: 0.18,
      fade: 0.08,
      temperature: 0.12,
      tint: 0.04,
      saturation: -0.08,
      vibrance: 0.14,
      skinProtect: 0.9,
      hslHue: [0.02, 0.01, -0.06, -0.08, -0.06, -0.08],
      hslSat: [0.08, -0.04, -0.14, -0.2, -0.16, -0.18],
      hslLum: [0.04, 0.1, 0.06, -0.02, 0.02, -0.04],
      highlightTint: hexRgb('#F7EBD8'),
      highlightTintStrength: 0.34,
      shadowTint: hexRgb('#312D28'),
      shadowTintStrength: 0.22,
      bloom: 0.14,
      grain: 0.22,
      vignette: 0.08,
    },
  },
  {
    id: 'ic-10',
    code: 'IC-10',
    name: 'Portra 800',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'High-speed warm negative stock: richer sunset amber, glowing halation on bright edges, and expressive 800-ISO grain.',
    grade: {
      exposure: 0.04,
      contrast: 0.14,
      highlights: -0.18,
      shadows: 0.1,
      fade: 0.06,
      temperature: 0.16,
      tint: 0.06,
      saturation: 0.08,
      vibrance: 0.22,
      skinProtect: 0.84,
      hslHue: [0.01, -0.02, -0.08, -0.06, -0.08, -0.06],
      hslSat: [0.16, 0.08, 0.04, -0.12, 0.04, -0.06],
      hslLum: [0.02, 0.06, 0.04, -0.06, -0.02, -0.08],
      highlightTint: hexRgb('#F8DFBA'),
      highlightTintStrength: 0.36,
      shadowTint: hexRgb('#2A2630'),
      shadowTintStrength: 0.28,
      bloom: 0.18,
      halation: 0.16,
      grain: 0.42,
      vignette: 0.16,
    },
  },
  {
    id: 'ic-11',
    code: 'IC-11',
    name: 'Gold 200',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Sun-drenched nostalgic consumer 35mm: honey-gold highlights, cheerful warm yellows, and retro summer-holiday fade.',
    grade: {
      exposure: 0.06,
      contrast: 0.12,
      highlights: -0.16,
      shadows: 0.08,
      fade: 0.1,
      temperature: 0.24,
      tint: -0.02,
      saturation: 0.06,
      vibrance: 0.16,
      skinProtect: 0.72,
      hslHue: [0.04, -0.03, -0.08, -0.14, -0.1, -0.1],
      hslSat: [0.14, 0.12, 0.22, -0.16, -0.14, -0.18],
      hslLum: [0.02, 0.06, 0.08, -0.06, 0, -0.08],
      highlightTint: hexRgb('#F9E3B2'),
      highlightTintStrength: 0.46,
      midtoneTint: hexRgb('#E8CE9C'),
      midtoneTintStrength: 0.2,
      shadowTint: hexRgb('#352B20'),
      shadowTintStrength: 0.3,
      bloom: 0.16,
      grain: 0.34,
      vignette: 0.16,
    },
  },
  {
    id: 'ic-12',
    code: 'IC-12',
    name: 'Ektar 100',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Ultra-fine grain landscape negative: vivid crimson reds, deep Mediterranean cobalt skies, and crisp high-acutance punch.',
    grade: {
      exposure: 0,
      contrast: 0.26,
      highlights: -0.12,
      shadows: -0.14,
      fade: 0.02,
      temperature: 0.05,
      tint: 0.05,
      saturation: 0.22,
      vibrance: 0.28,
      skinProtect: 0.62,
      hslHue: [-0.04, -0.02, -0.04, 0.04, -0.04, 0.02],
      hslSat: [0.34, 0.16, 0.18, 0.14, 0.24, 0.3],
      hslLum: [-0.08, 0.02, 0.02, -0.08, -0.06, -0.14],
      highlightTint: hexRgb('#F7EBE0'),
      highlightTintStrength: 0.2,
      shadowTint: hexRgb('#1C2634'),
      shadowTintStrength: 0.3,
      clarity: 0.24,
      sharpen: 0.22,
      grain: 0.08,
      vignette: 0.14,
    },
  },
  {
    id: 'ic-13',
    code: 'IC-13',
    name: '800T Halation',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    isSignature: true,
    description:
      'Tungsten-balanced motion picture stock with signature crimson-orange highlight halation and cool cyan-teal shadows.',
    grade: {
      exposure: -0.06,
      contrast: 0.24,
      highlights: -0.06,
      shadows: -0.14,
      fade: 0.06,
      temperature: -0.22,
      tint: -0.06,
      saturation: 0.04,
      vibrance: 0.2,
      crossProcess: 0.24,
      hslHue: [-0.06, -0.04, -0.08, 0.14, -0.08, -0.06],
      hslSat: [0.28, 0.14, -0.08, -0.16, 0.24, 0.22],
      hslLum: [0.02, 0.04, 0, -0.12, -0.04, -0.12],
      highlightTint: hexRgb('#F5C898'),
      highlightTintStrength: 0.34,
      shadowTint: hexRgb('#13303B'),
      shadowTintStrength: 0.54,
      bloom: 0.28,
      halation: 0.72,
      grain: 0.44,
      vignette: 0.28,
    },
  },
  {
    id: 'ic-14',
    code: 'IC-14',
    name: '400D Daylight',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Versatile daylight cinema film stock: warm amber-cream sunshine, subtle red-edge halation, and airy shadow detail.',
    grade: {
      exposure: 0.06,
      contrast: 0.14,
      highlights: -0.18,
      shadows: 0.12,
      fade: 0.07,
      temperature: 0.14,
      tint: 0.02,
      saturation: 0.04,
      vibrance: 0.16,
      skinProtect: 0.78,
      hslHue: [-0.02, -0.02, -0.06, 0.04, -0.08, -0.06],
      hslSat: [0.18, 0.06, 0.04, -0.1, 0.06, -0.08],
      hslLum: [0.02, 0.06, 0.04, -0.04, 0, -0.06],
      highlightTint: hexRgb('#F8DFC2'),
      highlightTintStrength: 0.36,
      shadowTint: hexRgb('#243034'),
      shadowTintStrength: 0.3,
      bloom: 0.22,
      halation: 0.42,
      grain: 0.28,
      vignette: 0.14,
    },
  },
  {
    id: 'ic-15',
    code: 'IC-15',
    name: 'Pro 400H Mint',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Cult-classic pastel wedding & editorial film: airy luminous whites, soft mint-sage greens, and cool seafoam shadows.',
    grade: {
      exposure: 0.14,
      contrast: -0.06,
      highlights: -0.22,
      shadows: 0.24,
      fade: 0.1,
      temperature: -0.08,
      tint: -0.12,
      saturation: -0.14,
      vibrance: 0.08,
      skinProtect: 0.86,
      hslHue: [0.02, 0.02, 0.06, 0.12, -0.06, -0.1],
      hslSat: [-0.06, -0.12, -0.22, -0.1, 0.08, -0.14],
      hslLum: [0.06, 0.12, 0.08, 0.08, 0.08, 0.04],
      highlightTint: hexRgb('#EDF4EF'),
      highlightTintStrength: 0.36,
      shadowTint: hexRgb('#2B3B38'),
      shadowTintStrength: 0.28,
      bloom: 0.18,
      grain: 0.18,
      vignette: 0.06,
    },
  },
  {
    id: 'ic-16',
    code: 'IC-16',
    name: 'Superia 400',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Classic drugstore 35mm everyday stock: unmistakable jade-green shadow tint, punchy magenta-reds, and lively grain.',
    grade: {
      exposure: 0.02,
      contrast: 0.18,
      highlights: -0.1,
      shadows: -0.06,
      fade: 0.08,
      temperature: -0.06,
      tint: -0.14,
      saturation: 0.02,
      vibrance: 0.14,
      crossProcess: 0.2,
      skinProtect: 0.65,
      hslHue: [-0.04, 0.02, 0.04, 0.16, -0.08, -0.06],
      hslSat: [0.16, -0.06, -0.04, 0.12, 0.1, -0.06],
      hslLum: [-0.04, 0.04, 0.02, -0.06, 0, -0.08],
      highlightTint: hexRgb('#F3EDE0'),
      highlightTintStrength: 0.24,
      shadowTint: hexRgb('#1C342B'),
      shadowTintStrength: 0.44,
      grain: 0.38,
      vignette: 0.18,
    },
  },
  {
    id: 'ic-17',
    code: 'IC-17',
    name: 'HP5+ Silver',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Timeless British 400-ISO documentary monochrome: wide forgiving midtone latitude, soft lifted blacks, and classic silver grain.',
    grade: {
      exposure: 0.04,
      contrast: 0.14,
      highlights: -0.16,
      shadows: 0.16,
      fade: 0.12,
      grayscale: 1.0,
      highlightTint: hexRgb('#F0EDE7'),
      highlightTintStrength: 0.18,
      shadowTint: hexRgb('#2C2C2B'),
      shadowTintStrength: 0.26,
      clarity: 0.12,
      grain: 0.48,
      vignette: 0.14,
    },
  },
  {
    id: 'ic-18',
    code: 'IC-18',
    name: 'Tri-X Press',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Legendary photojournalist 400-ISO black & white: crisp acutance, deep ink-black shadows, and tactile darkroom grit.',
    grade: {
      exposure: -0.04,
      contrast: 0.4,
      highlights: 0.12,
      shadows: -0.22,
      fade: 0.04,
      grayscale: 1.0,
      bleachBypass: 0.2,
      clarity: 0.3,
      sharpen: 0.22,
      grain: 0.72,
      vignette: 0.28,
    },
  },

  // --- 7 Popular App & Cinema Looks ---
  {
    id: 'ic-19',
    code: 'IC-19',
    name: 'A6 Minimal',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Ultra-clean analog minimalism: creamy off-white highlights, subtle warm skin lift, and restrained studio contrast.',
    grade: {
      exposure: 0.08,
      contrast: 0.08,
      highlights: -0.2,
      shadows: 0.12,
      fade: 0.12,
      temperature: 0.06,
      tint: 0.01,
      saturation: -0.22,
      vibrance: 0.04,
      skinProtect: 0.82,
      hslHue: [0.02, 0.01, -0.04, -0.08, -0.04, -0.04],
      hslSat: [-0.08, -0.1, -0.24, -0.28, -0.22, -0.2],
      hslLum: [0.04, 0.08, 0.04, -0.02, 0, -0.02],
      highlightTint: hexRgb('#F3EDE2'),
      highlightTintStrength: 0.32,
      shadowTint: hexRgb('#322F2C'),
      shadowTintStrength: 0.26,
      grain: 0.14,
      vignette: 0.08,
    },
  },
  {
    id: 'ic-20',
    code: 'IC-20',
    name: 'M5 Vintage Fade',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Nostalgic muted mood filter: dusty espresso shadows, low-chroma earth tones, and soft 1970s print fade.',
    grade: {
      exposure: -0.04,
      contrast: 0.04,
      highlights: -0.24,
      shadows: 0.06,
      fade: 0.2,
      temperature: 0.14,
      tint: 0.02,
      saturation: -0.32,
      vibrance: -0.08,
      sepia: 0.16,
      skinProtect: 0.7,
      hslHue: [0.04, -0.02, -0.1, -0.18, -0.1, -0.12],
      hslSat: [-0.14, -0.12, -0.26, -0.4, -0.34, -0.36],
      hslLum: [-0.04, 0.02, -0.02, -0.12, -0.08, -0.1],
      highlightTint: hexRgb('#E7D9C2'),
      highlightTintStrength: 0.4,
      shadowTint: hexRgb('#3A2E25'),
      shadowTintStrength: 0.44,
      grain: 0.26,
      vignette: 0.26,
    },
  },
  {
    id: 'ic-21',
    code: 'IC-21',
    name: 'HB2 Cool Slate',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Modern Scandinavian editorial cool tone: crisp mineral slate shadows, clean icy whites, and urban calm.',
    grade: {
      exposure: 0.02,
      contrast: 0.2,
      highlights: -0.12,
      shadows: -0.08,
      fade: 0.06,
      temperature: -0.18,
      tint: -0.04,
      saturation: -0.22,
      vibrance: 0.04,
      skinProtect: 0.78,
      hslHue: [0.02, 0.02, -0.04, 0.06, -0.06, -0.04],
      hslSat: [-0.1, -0.14, -0.3, -0.32, 0.04, -0.06],
      hslLum: [0, 0.04, 0, -0.08, 0, -0.08],
      highlightTint: hexRgb('#EBF1F6'),
      highlightTintStrength: 0.34,
      shadowTint: hexRgb('#1F2B36'),
      shadowTintStrength: 0.44,
      clarity: 0.18,
      grain: 0.14,
      vignette: 0.16,
    },
  },
  {
    id: 'ic-22',
    code: 'IC-22',
    name: 'CPM35 Pocket',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Beloved 35mm compact point-and-shoot look: warm golden highlight glow, soft optical bloom, and casual nostalgic grain.',
    grade: {
      exposure: 0.06,
      contrast: 0.14,
      highlights: -0.14,
      shadows: 0.08,
      fade: 0.1,
      temperature: 0.16,
      tint: -0.05,
      saturation: -0.04,
      vibrance: 0.14,
      crossProcess: 0.14,
      skinProtect: 0.76,
      hslHue: [0.03, -0.02, -0.06, 0.06, -0.08, -0.08],
      hslSat: [0.12, 0.04, 0.06, -0.1, -0.06, -0.14],
      hslLum: [0.02, 0.06, 0.04, -0.04, 0, -0.06],
      highlightTint: hexRgb('#F9E7C4'),
      highlightTintStrength: 0.38,
      shadowTint: hexRgb('#25312D'),
      shadowTintStrength: 0.34,
      chromaticAberration: 0.18,
      bloom: 0.34,
      halation: 0.18,
      grain: 0.36,
      vignette: 0.24,
    },
  },
  {
    id: 'ic-23',
    code: 'IC-23',
    name: 'FXN-R Classic',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Atmospheric retro negative film cam: muted botanical jade-teal shadows, creamy matte highlights, and quiet nostalgic romance.',
    grade: {
      exposure: 0.02,
      contrast: 0.12,
      highlights: -0.2,
      shadows: 0.06,
      fade: 0.13,
      temperature: -0.04,
      tint: -0.1,
      saturation: -0.16,
      vibrance: 0.06,
      skinProtect: 0.76,
      hslHue: [0.02, 0.02, -0.04, 0.14, -0.08, -0.1],
      hslSat: [0.06, -0.08, -0.18, -0.06, 0.06, -0.18],
      hslLum: [-0.02, 0.06, 0.02, -0.08, 0.02, -0.08],
      highlightTint: hexRgb('#EFE8D8'),
      highlightTintStrength: 0.32,
      shadowTint: hexRgb('#1E3330'),
      shadowTintStrength: 0.44,
      bloom: 0.24,
      grain: 0.32,
      vignette: 0.2,
    },
  },
  {
    id: 'ic-24',
    code: 'IC-24',
    name: 'Teal & Amber',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    description:
      'Modern theatrical widescreen color grade: deep petrol-teal shadows juxtaposed against glowing amber highlights.',
    grade: {
      exposure: -0.04,
      contrast: 0.28,
      highlights: -0.14,
      shadows: -0.14,
      fade: 0.04,
      temperature: 0.04,
      tint: -0.04,
      saturation: 0.02,
      vibrance: 0.22,
      skinProtect: 0.74,
      hslHue: [0.05, -0.03, -0.12, -0.16, -0.1, -0.14],
      hslSat: [0.16, 0.22, 0.06, -0.28, 0.3, 0.18],
      hslLum: [-0.04, 0.04, 0.02, -0.14, -0.04, -0.14],
      highlightTint: hexRgb('#F7C88B'),
      highlightTintStrength: 0.46,
      shadowTint: hexRgb('#12333D'),
      shadowTintStrength: 0.56,
      clarity: 0.2,
      bloom: 0.16,
      grain: 0.2,
      vignette: 0.28,
    },
  },
  {
    id: 'ic-25',
    code: 'IC-25',
    name: 'SX-70 Instant',
    categoryId: 'icons-25',
    categoryLabel: 'Icons 25',
    isSignature: true,
    description:
      'Classic integral instant-film chemistry: dreamy creamy fade, vintage amber-magenta midtones, and hazy cyan shadows.',
    grade: {
      exposure: 0.08,
      contrast: -0.02,
      highlights: -0.26,
      shadows: 0.14,
      fade: 0.22,
      temperature: 0.14,
      tint: 0.04,
      saturation: -0.2,
      vibrance: 0.06,
      crossProcess: 0.32,
      sepia: 0.12,
      skinProtect: 0.68,
      hslHue: [0.04, -0.03, -0.08, 0.08, -0.1, -0.12],
      hslSat: [0.06, 0.04, -0.12, -0.26, -0.08, -0.24],
      hslLum: [0.04, 0.08, 0.06, -0.04, 0.04, -0.04],
      highlightTint: hexRgb('#F7EAD0'),
      highlightTintStrength: 0.46,
      midtoneTint: hexRgb('#E0CBB4'),
      midtoneTintStrength: 0.22,
      shadowTint: hexRgb('#2A3C3F'),
      shadowTintStrength: 0.46,
      chromaticAberration: 0.22,
      bloom: 0.34,
      grain: 0.38,
      vignette: 0.3,
    },
  },

  // ================= 13 · CINEMA (AUTEUR FILM COLOR SCIENCE) =================
  {
    id: 'cn-01',
    code: 'CN-01',
    name: '2383 Print',
    categoryId: 'cinema',
    categoryLabel: 'Cinema',
    isSignature: true,
    description:
      'Theatrical Kodak 2383 print stock emulation: velvety teal-slate shadows, luminous golden skin highlights, and crisp cinema contrast.',
    grade: {
      exposure: 0.02,
      contrast: 0.22,
      highlights: -0.18,
      shadows: -0.06,
      fade: 0.05,
      temperature: 0.08,
      tint: -0.03,
      saturation: 0.04,
      vibrance: 0.16,
      skinProtect: 0.78,
      hslHue: [0.05, -0.03, -0.1, -0.12, -0.1, -0.12],
      hslSat: [0.14, 0.14, -0.04, -0.22, 0.18, 0.08],
      hslLum: [-0.04, 0.04, 0.02, -0.1, -0.04, -0.12],
      highlightTint: hexRgb('#F8D7A8'),
      highlightTintStrength: 0.38,
      midtoneTint: hexRgb('#DFC8B0'),
      midtoneTintStrength: 0.12,
      shadowTint: hexRgb('#102C35'),
      shadowTintStrength: 0.54,
      clarity: 0.14,
      bloom: 0.16,
      halation: 0.14,
      grain: 0.22,
      vignette: 0.24,
    },
  },
  {
    id: 'cn-02',
    code: 'CN-02',
    name: 'Chungking 94',
    categoryId: 'cinema',
    categoryLabel: 'Cinema',
    isSignature: true,
    description:
      '1990s Hong Kong auteur cinema: poetic emerald-jade fluorescent shadows, warm sodium amber highlights, and glowing Pro-Mist halation.',
    grade: {
      exposure: -0.04,
      contrast: 0.18,
      highlights: -0.22,
      shadows: 0.04,
      fade: 0.08,
      temperature: 0.12,
      tint: -0.16,
      saturation: 0.08,
      vibrance: 0.2,
      skinProtect: 0.64,
      hslHue: [0.08, -0.06, -0.14, 0.08, -0.14, -0.18],
      hslSat: [0.22, 0.24, 0.12, 0.14, 0.12, -0.18],
      hslLum: [-0.06, 0.04, 0.04, -0.08, -0.06, -0.14],
      highlightTint: hexRgb('#F7C77A'),
      highlightTintStrength: 0.44,
      midtoneTint: hexRgb('#84A898'),
      midtoneTintStrength: 0.18,
      shadowTint: hexRgb('#133D32'),
      shadowTintStrength: 0.6,
      chromaticAberration: 0.16,
      bloom: 0.42,
      halation: 0.48,
      grain: 0.34,
      vignette: 0.32,
    },
  },
  {
    id: 'cn-03',
    code: 'CN-03',
    name: 'Grand Pastel',
    categoryId: 'cinema',
    categoryLabel: 'Cinema',
    isSignature: true,
    description:
      'Symmetrical storybook pastel cinema: sunlit mustard ochre, creamy rose-peach midtones, and pale robin-egg skies.',
    grade: {
      exposure: 0.1,
      contrast: 0.06,
      highlights: -0.24,
      shadows: 0.18,
      fade: 0.1,
      temperature: 0.16,
      tint: 0.06,
      saturation: 0.06,
      vibrance: 0.2,
      skinProtect: 0.76,
      hslHue: [0.06, 0.04, -0.06, -0.08, -0.14, -0.16],
      hslSat: [0.16, 0.18, 0.22, -0.16, 0.12, -0.12],
      hslLum: [0.06, 0.08, 0.08, 0.02, 0.08, 0.06],
      highlightTint: hexRgb('#FBE4C0'),
      highlightTintStrength: 0.4,
      midtoneTint: hexRgb('#F2D6B8'),
      midtoneTintStrength: 0.22,
      shadowTint: hexRgb('#3A464C'),
      shadowTintStrength: 0.28,
      clarity: 0.12,
      bloom: 0.18,
      grain: 0.18,
      vignette: 0.14,
    },
  },
  {
    id: 'cn-04',
    code: 'CN-04',
    name: 'Midsommar Sun',
    categoryId: 'cinema',
    categoryLabel: 'Cinema',
    isSignature: true,
    description:
      'Modern sunlit folk-cinema: luminous Nordic daylight, airy pastel greens, soft ivory shadows, and radiant optical Pro-Mist glow.',
    grade: {
      exposure: 0.14,
      contrast: -0.04,
      highlights: -0.16,
      shadows: 0.26,
      fade: 0.12,
      temperature: 0.08,
      tint: -0.02,
      saturation: -0.06,
      vibrance: 0.18,
      skinProtect: 0.82,
      hslHue: [0.02, 0.02, -0.04, -0.06, -0.08, -0.08],
      hslSat: [0.04, 0.08, 0.08, -0.12, 0.1, -0.06],
      hslLum: [0.06, 0.08, 0.1, 0.08, 0.1, 0.08],
      highlightTint: hexRgb('#FFF8E6'),
      highlightTintStrength: 0.36,
      midtoneTint: hexRgb('#EFEAD8'),
      midtoneTintStrength: 0.14,
      shadowTint: hexRgb('#445458'),
      shadowTintStrength: 0.22,
      clarity: -0.06,
      bloom: 0.46,
      halation: 0.16,
      grain: 0.14,
      vignette: 0.08,
    },
  },
  {
    id: 'cn-05',
    code: 'CN-05',
    name: 'Arrakis Ochre',
    categoryId: 'cinema',
    categoryLabel: 'Cinema',
    description:
      'Sculptural desert sci-fi cinema: monochromatic warm ochre sunstone, deep burnt-umber shadows, and crisp large-format texture.',
    grade: {
      exposure: -0.02,
      contrast: 0.2,
      highlights: -0.26,
      shadows: -0.08,
      fade: 0.06,
      temperature: 0.28,
      tint: 0.02,
      saturation: -0.26,
      vibrance: -0.06,
      sepia: 0.24,
      skinProtect: 0.65,
      hslHue: [0.06, -0.04, -0.12, -0.24, -0.18, -0.14],
      hslSat: [-0.08, 0.16, 0.14, -0.52, -0.44, -0.48],
      hslLum: [-0.04, 0.04, 0.06, -0.14, -0.08, -0.16],
      highlightTint: hexRgb('#F6DFB7'),
      highlightTintStrength: 0.48,
      midtoneTint: hexRgb('#C89E72'),
      midtoneTintStrength: 0.22,
      shadowTint: hexRgb('#281B12'),
      shadowTintStrength: 0.52,
      clarity: 0.24,
      sharpen: 0.14,
      bloom: 0.18,
      grain: 0.26,
      vignette: 0.3,
    },
  },
  {
    id: 'cn-06',
    code: 'CN-06',
    name: 'Neo-Noir 2049',
    categoryId: 'cinema',
    categoryLabel: 'Cinema',
    description:
      'High-drama cyberpunk cinema: oxidized copper-amber highlights cutting through abyssal slate-teal shadows with glowing halation.',
    grade: {
      exposure: -0.08,
      contrast: 0.28,
      highlights: -0.2,
      shadows: -0.14,
      fade: 0.04,
      temperature: -0.04,
      tint: -0.06,
      saturation: -0.08,
      vibrance: 0.18,
      skinProtect: 0.62,
      hslHue: [0.08, -0.06, -0.16, -0.18, -0.12, -0.14],
      hslSat: [0.2, 0.28, 0.12, -0.36, 0.26, 0.14],
      hslLum: [-0.06, 0.04, 0.02, -0.16, -0.06, -0.18],
      highlightTint: hexRgb('#F3A85A'),
      highlightTintStrength: 0.48,
      shadowTint: hexRgb('#0F2B38'),
      shadowTintStrength: 0.64,
      clarity: 0.18,
      bloom: 0.3,
      halation: 0.42,
      grain: 0.3,
      vignette: 0.38,
    },
  },
  {
    id: 'cn-07',
    code: 'CN-07',
    name: '35mm Anamorphic',
    categoryId: 'cinema',
    categoryLabel: 'Cinema',
    description:
      'Indie 500T motion-picture negative: cool graphite shadows, natural tungsten skin highlights, optical edge fringe, and organic grain.',
    grade: {
      exposure: 0.0,
      contrast: 0.16,
      highlights: -0.22,
      shadows: 0.06,
      fade: 0.09,
      temperature: -0.04,
      tint: 0.0,
      saturation: -0.12,
      vibrance: 0.1,
      skinProtect: 0.78,
      hslHue: [0.03, -0.02, -0.08, -0.1, -0.06, -0.08],
      hslSat: [0.08, 0.08, -0.1, -0.24, 0.06, -0.1],
      hslLum: [-0.02, 0.04, 0.0, -0.08, -0.02, -0.1],
      highlightTint: hexRgb('#F5DFC4'),
      highlightTintStrength: 0.32,
      shadowTint: hexRgb('#1A232D'),
      shadowTintStrength: 0.46,
      clarity: 0.1,
      chromaticAberration: 0.24,
      bloom: 0.22,
      halation: 0.24,
      grain: 0.36,
      vignette: 0.36,
    },
  },

  // ================= 14 · DARKROOM & CULT (CHEMICAL & ANALOG LAB) =================
  {
    id: 'dk-01',
    code: 'DK-01',
    name: 'Classic Neg',
    categoryId: 'darkroom',
    categoryLabel: 'Darkroom & Cult',
    isSignature: true,
    description:
      'Cult Japanese color negative chemistry: deep brick-terracotta reds, muted sage foliage, cool slate shadows, and creamy rolled highlights.',
    grade: {
      exposure: 0.02,
      contrast: 0.22,
      highlights: -0.24,
      shadows: -0.04,
      fade: 0.07,
      temperature: 0.04,
      tint: -0.03,
      saturation: -0.08,
      vibrance: 0.14,
      skinProtect: 0.74,
      hslHue: [-0.06, -0.05, -0.12, -0.1, -0.12, -0.1],
      hslSat: [0.2, 0.08, -0.1, -0.26, 0.08, -0.14],
      hslLum: [-0.1, 0.02, 0.04, -0.12, -0.04, -0.12],
      highlightTint: hexRgb('#F6ECD8'),
      highlightTintStrength: 0.36,
      midtoneTint: hexRgb('#D8CEC2'),
      midtoneTintStrength: 0.12,
      shadowTint: hexRgb('#1D3138'),
      shadowTintStrength: 0.48,
      clarity: 0.16,
      bloom: 0.14,
      grain: 0.3,
      vignette: 0.22,
    },
  },
  {
    id: 'dk-02',
    code: 'DK-02',
    name: 'CineStill 800T',
    categoryId: 'darkroom',
    categoryLabel: 'Darkroom & Cult',
    isSignature: true,
    description:
      'Remjet-removed tungsten motion-picture stock: electric ice-cyan shadows with unmistakable crimson-orange highlight halation.',
    grade: {
      exposure: -0.02,
      contrast: 0.18,
      highlights: -0.18,
      shadows: 0.08,
      fade: 0.06,
      temperature: -0.22,
      tint: -0.05,
      saturation: 0.06,
      vibrance: 0.18,
      skinProtect: 0.68,
      hslHue: [-0.04, -0.06, -0.12, -0.08, -0.1, -0.08],
      hslSat: [0.26, 0.16, 0.04, -0.18, 0.24, 0.16],
      hslLum: [0.0, 0.04, 0.02, -0.08, 0.02, -0.08],
      highlightTint: hexRgb('#F5D8BE'),
      highlightTintStrength: 0.3,
      shadowTint: hexRgb('#142F42'),
      shadowTintStrength: 0.56,
      chromaticAberration: 0.14,
      bloom: 0.28,
      halation: 0.74,
      grain: 0.4,
      vignette: 0.28,
    },
  },
  {
    id: 'dk-03',
    code: 'DK-03',
    name: 'Bleach Bypass',
    categoryId: 'darkroom',
    categoryLabel: 'Darkroom & Cult',
    isSignature: true,
    description:
      'Silver-retained ENR darkroom print: metallic steel desaturation, sculpted editorial contrast, and gleaming platinum highlights.',
    grade: {
      exposure: -0.02,
      contrast: 0.34,
      highlights: -0.14,
      shadows: -0.16,
      fade: 0.04,
      temperature: -0.06,
      tint: -0.02,
      saturation: -0.34,
      vibrance: -0.12,
      bleachBypass: 0.72,
      skinProtect: 0.58,
      hslHue: [0.02, -0.02, -0.06, -0.12, -0.06, -0.06],
      hslSat: [-0.14, -0.18, -0.3, -0.44, -0.28, -0.26],
      hslLum: [-0.06, 0.02, 0.02, -0.12, -0.04, -0.14],
      highlightTint: hexRgb('#ECEAE4'),
      highlightTintStrength: 0.3,
      shadowTint: hexRgb('#1C2229'),
      shadowTintStrength: 0.48,
      clarity: 0.28,
      sharpen: 0.2,
      grain: 0.32,
      vignette: 0.3,
    },
  },
  {
    id: 'dk-04',
    code: 'DK-04',
    name: 'Aerochrome Rose',
    categoryId: 'darkroom',
    categoryLabel: 'Darkroom & Cult',
    isSignature: true,
    description:
      'Legendary Kodak Aerochrome color-infrared emulsion: transforms green foliage into velvety crimson-rose against deep cobalt skies.',
    grade: {
      exposure: 0.04,
      contrast: 0.18,
      highlights: -0.2,
      shadows: 0.04,
      fade: 0.08,
      temperature: 0.04,
      tint: 0.08,
      saturation: 0.1,
      vibrance: 0.16,
      infraredShift: 0.88,
      skinProtect: 0.55,
      hslHue: [-0.04, -0.06, -0.08, 0.0, -0.06, 0.04],
      hslSat: [0.22, 0.1, 0.04, 0.12, 0.1, 0.18],
      hslLum: [0.02, 0.04, 0.04, 0.02, -0.06, -0.14],
      highlightTint: hexRgb('#F9E0DA'),
      highlightTintStrength: 0.3,
      shadowTint: hexRgb('#15284A'),
      shadowTintStrength: 0.44,
      bloom: 0.24,
      halation: 0.22,
      grain: 0.32,
      vignette: 0.26,
    },
  },
  {
    id: 'dk-05',
    code: 'DK-05',
    name: 'SX-70 Milk',
    categoryId: 'darkroom',
    categoryLabel: 'Darkroom & Cult',
    description:
      'Sun-warmed instant film emulsion: milky matte fade, nostalgic sage-green shadow cast, creamy highlights, and vintage optical fringe.',
    grade: {
      exposure: 0.08,
      contrast: -0.04,
      highlights: -0.28,
      shadows: 0.18,
      fade: 0.22,
      temperature: 0.14,
      tint: -0.04,
      saturation: -0.18,
      vibrance: 0.08,
      crossProcess: 0.36,
      sepia: 0.1,
      skinProtect: 0.7,
      hslHue: [0.04, -0.02, -0.08, 0.06, -0.12, -0.14],
      hslSat: [0.06, 0.06, -0.08, -0.22, -0.06, -0.22],
      hslLum: [0.04, 0.08, 0.06, -0.02, 0.04, -0.04],
      highlightTint: hexRgb('#F8ECD6'),
      highlightTintStrength: 0.46,
      midtoneTint: hexRgb('#DDD1BE'),
      midtoneTintStrength: 0.2,
      shadowTint: hexRgb('#2A3E36'),
      shadowTintStrength: 0.48,
      chromaticAberration: 0.26,
      bloom: 0.34,
      grain: 0.38,
      vignette: 0.32,
    },
  },
  {
    id: 'dk-06',
    code: 'DK-06',
    name: 'Expired 98',
    categoryId: 'darkroom',
    categoryLabel: 'Darkroom & Cult',
    description:
      'Two-decade attic film roll: delicate magenta-rose base fog in the shadows, faded amber highlights, and tactile analog grain.',
    grade: {
      exposure: 0.04,
      contrast: -0.06,
      highlights: -0.26,
      shadows: 0.14,
      fade: 0.18,
      temperature: 0.1,
      tint: 0.14,
      saturation: -0.22,
      vibrance: 0.04,
      sepia: 0.12,
      skinProtect: 0.66,
      hslHue: [0.06, -0.04, -0.1, -0.08, -0.12, -0.1],
      hslSat: [0.1, 0.04, -0.16, -0.34, -0.2, -0.24],
      hslLum: [0.04, 0.06, 0.04, -0.06, 0.02, -0.06],
      highlightTint: hexRgb('#F3D8AC'),
      highlightTintStrength: 0.42,
      midtoneTint: hexRgb('#DFC5C8'),
      midtoneTintStrength: 0.18,
      shadowTint: hexRgb('#3D2434'),
      shadowTintStrength: 0.5,
      chromaticAberration: 0.18,
      bloom: 0.26,
      grain: 0.46,
      vignette: 0.34,
    },
  },
  {
    id: 'dk-07',
    code: 'DK-07',
    name: 'E6 Cross-Lab',
    categoryId: 'darkroom',
    categoryLabel: 'Darkroom & Cult',
    description:
      'Slide reversal film developed in C-41 chemistry: electric turquoise shadows, golden-lime highlights, and punchy fashion-editorial contrast.',
    grade: {
      exposure: 0.02,
      contrast: 0.24,
      highlights: -0.16,
      shadows: -0.06,
      fade: 0.06,
      temperature: 0.04,
      tint: -0.08,
      saturation: 0.12,
      vibrance: 0.24,
      crossProcess: 0.68,
      skinProtect: 0.64,
      hslHue: [0.04, -0.04, -0.06, 0.1, -0.14, -0.14],
      hslSat: [0.18, 0.14, 0.16, 0.08, 0.26, 0.14],
      hslLum: [-0.04, 0.04, 0.06, -0.06, 0.02, -0.12],
      highlightTint: hexRgb('#F5E5A6'),
      highlightTintStrength: 0.44,
      shadowTint: hexRgb('#123B42'),
      shadowTintStrength: 0.56,
      clarity: 0.18,
      bloom: 0.16,
      grain: 0.28,
      vignette: 0.24,
    },
  },

  // ================= 15 · GOLDEN & DREAM (OPTICAL GLOW & SUNLIGHT) =================
  {
    id: 'gd-01',
    code: 'GD-01',
    name: 'Pro-Mist 1/4',
    categoryId: 'golden-dream',
    categoryLabel: 'Golden & Dream',
    isSignature: true,
    description:
      'Authentic optical Black Pro-Mist 1/4 lens diffusion: radiant pearl highlight bloom, silky skin tones, and effortlessly luminous daylight.',
    grade: {
      exposure: 0.08,
      contrast: -0.02,
      highlights: -0.14,
      shadows: 0.16,
      fade: 0.08,
      temperature: 0.1,
      tint: 0.02,
      saturation: -0.04,
      vibrance: 0.14,
      skinProtect: 0.85,
      hslHue: [0.02, 0.02, -0.04, -0.06, -0.06, -0.06],
      hslSat: [0.06, 0.08, 0.04, -0.14, 0.04, -0.08],
      hslLum: [0.04, 0.06, 0.06, 0.02, 0.04, 0.02],
      highlightTint: hexRgb('#FFF2DC'),
      highlightTintStrength: 0.36,
      midtoneTint: hexRgb('#F2E5D4'),
      midtoneTintStrength: 0.12,
      shadowTint: hexRgb('#383430'),
      shadowTintStrength: 0.2,
      clarity: -0.14,
      bloom: 0.56,
      halation: 0.18,
      grain: 0.16,
      vignette: 0.14,
    },
  },
  {
    id: 'gd-02',
    code: 'GD-02',
    name: 'Tuscany Gold',
    categoryId: 'golden-dream',
    categoryLabel: 'Golden & Dream',
    isSignature: true,
    description:
      'Sun-drenched Mediterranean late afternoon: liquid honey highlights, muted dusty-blue skies, and glowing editorial skin fidelity.',
    grade: {
      exposure: 0.06,
      contrast: 0.1,
      highlights: -0.22,
      shadows: 0.12,
      fade: 0.07,
      temperature: 0.24,
      tint: 0.03,
      saturation: 0.04,
      vibrance: 0.18,
      skinProtect: 0.82,
      hslHue: [0.04, -0.02, -0.1, -0.14, -0.1, -0.1],
      hslSat: [0.1, 0.16, 0.18, -0.22, -0.08, -0.2],
      hslLum: [0.02, 0.06, 0.06, -0.06, 0.02, -0.06],
      highlightTint: hexRgb('#FAD69A'),
      highlightTintStrength: 0.46,
      midtoneTint: hexRgb('#E8C9A4'),
      midtoneTintStrength: 0.18,
      shadowTint: hexRgb('#362A22'),
      shadowTintStrength: 0.3,
      clarity: 0.04,
      bloom: 0.36,
      halation: 0.2,
      grain: 0.2,
      vignette: 0.2,
    },
  },
  {
    id: 'gd-03',
    code: 'GD-03',
    name: 'Velvet Peach',
    categoryId: 'golden-dream',
    categoryLabel: 'Golden & Dream',
    isSignature: true,
    description:
      'Romantic twilight poetry: warm apricot-peach highlights melting into velvety lavender-plum shadows with creamy optical diffusion.',
    grade: {
      exposure: 0.05,
      contrast: 0.04,
      highlights: -0.22,
      shadows: 0.16,
      fade: 0.12,
      temperature: 0.14,
      tint: 0.12,
      saturation: -0.06,
      vibrance: 0.14,
      skinProtect: 0.8,
      hslHue: [0.04, 0.04, -0.08, -0.14, -0.08, 0.06],
      hslSat: [0.12, 0.14, 0.04, -0.26, -0.1, -0.12],
      hslLum: [0.04, 0.08, 0.06, -0.04, 0.02, -0.06],
      highlightTint: hexRgb('#FBCDB8'),
      highlightTintStrength: 0.46,
      midtoneTint: hexRgb('#E8C8C4'),
      midtoneTintStrength: 0.16,
      shadowTint: hexRgb('#35283C'),
      shadowTintStrength: 0.44,
      clarity: -0.08,
      bloom: 0.42,
      halation: 0.18,
      grain: 0.22,
      vignette: 0.2,
    },
  },
  {
    id: 'gd-04',
    code: 'GD-04',
    name: 'Morning Opal',
    categoryId: 'golden-dream',
    categoryLabel: 'Golden & Dream',
    description:
      'Translucent misty sunrise: lifted airy shadows, champagne-pearl highlights, cool silver-blue mist, and ethereal soft-focus clarity.',
    grade: {
      exposure: 0.12,
      contrast: -0.08,
      highlights: -0.18,
      shadows: 0.24,
      fade: 0.14,
      temperature: 0.04,
      tint: 0.01,
      saturation: -0.14,
      vibrance: 0.12,
      skinProtect: 0.82,
      hslHue: [0.02, 0.02, -0.04, -0.08, -0.08, -0.06],
      hslSat: [0.02, 0.06, -0.04, -0.22, 0.06, -0.08],
      hslLum: [0.06, 0.08, 0.08, 0.04, 0.08, 0.06],
      highlightTint: hexRgb('#FBF4E4'),
      highlightTintStrength: 0.4,
      shadowTint: hexRgb('#2D3C47'),
      shadowTintStrength: 0.34,
      clarity: -0.08,
      bloom: 0.44,
      grain: 0.16,
      vignette: 0.12,
    },
  },
  {
    id: 'gd-05',
    code: 'GD-05',
    name: 'Candlelit Amber',
    categoryId: 'golden-dream',
    categoryLabel: 'Golden & Dream',
    description:
      'Intimate low-sun & candlelit mood: molten amber highlights, deep espresso-umber shadows, and warm crimson-gold halation glow.',
    grade: {
      exposure: -0.08,
      contrast: 0.18,
      highlights: -0.2,
      shadows: -0.06,
      fade: 0.06,
      temperature: 0.28,
      tint: 0.04,
      saturation: -0.04,
      vibrance: 0.12,
      skinProtect: 0.76,
      hslHue: [0.06, -0.04, -0.12, -0.18, -0.12, -0.12],
      hslSat: [0.14, 0.22, 0.16, -0.34, -0.22, -0.28],
      hslLum: [-0.04, 0.04, 0.04, -0.14, -0.08, -0.18],
      highlightTint: hexRgb('#F7BE72'),
      highlightTintStrength: 0.48,
      midtoneTint: hexRgb('#C99A6E'),
      midtoneTintStrength: 0.18,
      shadowTint: hexRgb('#24160E'),
      shadowTintStrength: 0.5,
      bloom: 0.32,
      halation: 0.34,
      grain: 0.28,
      vignette: 0.34,
    },
  },
  {
    id: 'gd-06',
    code: 'GD-06',
    name: 'Sun-Bleached 160',
    categoryId: 'golden-dream',
    categoryLabel: 'Golden & Dream',
    description:
      'Kinfolk & Cereal sun-washed editorial film: chalky airy matte fade, muted warm neutrals, sunlit linen highlights, and understated grain.',
    grade: {
      exposure: 0.1,
      contrast: -0.06,
      highlights: -0.26,
      shadows: 0.2,
      fade: 0.2,
      temperature: 0.14,
      tint: 0.02,
      saturation: -0.24,
      vibrance: 0.02,
      sepia: 0.08,
      skinProtect: 0.8,
      hslHue: [0.02, 0.0, -0.06, -0.12, -0.08, -0.08],
      hslSat: [-0.06, -0.02, -0.12, -0.32, -0.18, -0.24],
      hslLum: [0.06, 0.08, 0.08, 0.02, 0.06, 0.04],
      highlightTint: hexRgb('#FAF0DD'),
      highlightTintStrength: 0.42,
      shadowTint: hexRgb('#3F3933'),
      shadowTintStrength: 0.3,
      clarity: -0.04,
      bloom: 0.28,
      grain: 0.22,
      vignette: 0.14,
    },
  },
  {
    id: 'gd-07',
    code: 'GD-07',
    name: 'Gilded Dusk',
    categoryId: 'golden-dream',
    categoryLabel: 'Golden & Dream',
    description:
      'Luminous champagne-gold rim light floating over velvety midnight-indigo shadows — dramatic, timeless blue-meets-gold twilight.',
    grade: {
      exposure: -0.04,
      contrast: 0.16,
      highlights: -0.18,
      shadows: 0.02,
      fade: 0.06,
      temperature: 0.12,
      tint: 0.02,
      saturation: 0.02,
      vibrance: 0.18,
      skinProtect: 0.78,
      hslHue: [0.04, -0.02, -0.1, -0.14, -0.08, 0.02],
      hslSat: [0.12, 0.18, 0.14, -0.26, 0.06, 0.1],
      hslLum: [-0.02, 0.04, 0.04, -0.12, -0.04, -0.12],
      highlightTint: hexRgb('#F5CC8C'),
      highlightTintStrength: 0.46,
      shadowTint: hexRgb('#1A233A'),
      shadowTintStrength: 0.56,
      bloom: 0.34,
      halation: 0.24,
      grain: 0.24,
      vignette: 0.28,
    },
  },
];

export function getPresetsByCategory(categoryId: PhotoCategoryId): StillPreset[] {
  return STILL_PRESETS.filter((preset) => preset.categoryId === categoryId);
}

/**
 * Returns all curated presets for a category.
 * Bright / Dark is a live tone modifier applied via the Histogram + Shader Engine.
 */
export function getSuggestedPresets(categoryId: PhotoCategoryId): StillPreset[] {
  return STILL_PRESETS.filter((preset) => preset.categoryId === categoryId);
}

export function getPresetById(id: string | null): StillPreset | null {
  if (!id) return null;
  return STILL_PRESETS.find((preset) => preset.id === id) ?? null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scaleTuple6(
  arr: [number, number, number, number, number, number] | undefined,
  k: number
): [number, number, number, number, number, number] {
  if (!arr) return [0, 0, 0, 0, 0, 0];
  return [
    arr[0] * k,
    arr[1] * k,
    arr[2] * k,
    arr[3] * k,
    arr[4] * k,
    arr[5] * k,
  ];
}

/**
 * Combines:
 * 1. Active STILL. Preset (scaled by intensity 0..100)
 * 2. Manual Studio Adjustments (including Highlights, Shadows, Bloom, Halation, Skin Guard)
 * 3. Smart Histogram Adaptive Bright/Dark Tone Offsets
 * 4. Optional Series Auto-Exposure Match delta
 * 5. Optional Imported 3D .CUBE LUT
 * into a unified ShaderGradingParams object for the WebGL2 Shader Engine.
 */
export function computeShaderParams(
  preset: StillPreset | null,
  intensity: number,
  manualInput: Partial<ColorAdjustments>,
  toneMood?: ToneMood,
  histogramStats?: PhotoHistogramStats | null,
  autoBalance = true,
  lut: ParsedCubeLut | null = null,
  lutStrength = 0,
  seriesExposureDelta = 0
): ShaderGradingParams {
  const k = clamp(intensity / 100, 0, 1);
  const manual: ColorAdjustments = { ...DEFAULT_ADJUSTMENTS, ...manualInput };
  const g = preset?.grade;

  const adaptive = toneMood
    ? computeAdaptiveToneOffsets(histogramStats ?? null, toneMood, autoBalance)
    : {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        fade: 0,
        skinProtectBoost: 0,
      };

  const exposure = clamp(
    (g?.exposure ?? 0) * k +
      (manual.exposure + seriesExposureDelta) / 48 +
      adaptive.exposure,
    -1.2,
    1.2
  );

  const contrast = clamp(
    (g?.contrast ?? 0) * k + manual.contrast / 75 + adaptive.contrast,
    -0.65,
    0.75
  );

  const highlights = clamp(
    (g?.highlights ?? 0) * k + manual.highlights / 65 + adaptive.highlights,
    -0.85,
    0.65
  );

  const shadows = clamp(
    (g?.shadows ?? 0) * k + manual.shadows / 65 + adaptive.shadows,
    -0.65,
    0.85
  );

  const fade = clamp(
    (g?.fade ?? 0) * k + manual.fade / 180 + adaptive.fade,
    0,
    0.26
  );

  const temperature = clamp(
    (g?.temperature ?? 0) * k + manual.warmth / 90,
    -0.65,
    0.65
  );

  const tint = clamp((g?.tint ?? 0) * k, -0.5, 0.5);

  const saturation = clamp(
    (g?.saturation ?? 0) * k + manual.saturation / 100,
    -1.0,
    0.8
  );

  const vibrance = clamp((g?.vibrance ?? 0) * k, -0.6, 0.7);
  const grayscale = clamp((g?.grayscale ?? 0) * k, 0, 1);
  const sepia = clamp((g?.sepia ?? 0) * k, 0, 1);
  const bleachBypass = clamp((g?.bleachBypass ?? 0) * k, 0, 1);
  const crossProcess = clamp((g?.crossProcess ?? 0) * k, 0, 1);
  const infraredShift = clamp((g?.infraredShift ?? 0) * k, 0, 1);

  const skinProtect = clamp(
    Math.max(
      (g?.skinProtect ?? 0) * k + adaptive.skinProtectBoost,
      manual.skinProtect / 100
    ),
    0,
    1
  );

  const deblur = clamp((manual.deblur ?? 0) / 100, 0, 1);
  const denoise = clamp((manual.denoise ?? 0) / 100, 0, 1);
  const clarity = clamp(
    (g?.clarity ?? 0) * k + manual.clarity / 100,
    -0.6,
    1.0
  );
  const sharpen = clamp(
    (g?.sharpen ?? 0) * k + manual.sharpen / 100,
    0,
    1.0
  );
  const chromaticAberration = clamp(
    (g?.chromaticAberration ?? 0) * k + manual.chromaticAberration / 100,
    0,
    1.0
  );
  const bloom = clamp((g?.bloom ?? 0) * k + manual.bloom / 100, 0, 1);
  const halation = clamp((g?.halation ?? 0) * k + manual.halation / 100, 0, 1);
  const grain = clamp((g?.grain ?? 0) * k + manual.grain / 100, 0, 1);
  const vignette = clamp((g?.vignette ?? 0) * k + manual.vignette / 100, 0, 1);

  const activeToneCurve: ToneCurvePoints =
    Array.isArray(manual.toneCurve) && manual.toneCurve.length === 5
      ? [
          clamp(manual.toneCurve[0], 0, 1),
          clamp(manual.toneCurve[1], 0, 1),
          clamp(manual.toneCurve[2], 0, 1),
          clamp(manual.toneCurve[3], 0, 1),
          clamp(manual.toneCurve[4], 0, 1),
        ]
      : [...NEUTRAL_TONE_CURVE];

  const mergedShadowTint = blendSplitTone(
    g?.shadowTint,
    (g?.shadowTintStrength ?? 0) * k,
    manual.manualShadowTintHex,
    manual.manualShadowTintStrength
  );
  const mergedHighlightTint = blendSplitTone(
    g?.highlightTint,
    (g?.highlightTintStrength ?? 0) * k,
    manual.manualHighlightTintHex,
    manual.manualHighlightTintStrength
  );

  return {
    ...NEUTRAL_SHADER_PARAMS,
    exposure,
    contrast,
    highlights,
    shadows,
    fade,
    toneCurve: activeToneCurve,
    temperature,
    tint,
    saturation,
    vibrance,
    grayscale,
    sepia,
    bleachBypass,
    crossProcess,
    skinProtect,
    infraredShift,
    hslHue: scaleTuple6(g?.hslHue, k),
    hslSat: scaleTuple6(g?.hslSat, k),
    hslLum: scaleTuple6(g?.hslLum, k),
    shadowTint: mergedShadowTint.rgb,
    shadowTintStrength: mergedShadowTint.strength,
    midtoneTint: g?.midtoneTint ?? [0.5, 0.5, 0.5],
    midtoneTintStrength: clamp((g?.midtoneTintStrength ?? 0) * k, 0, 0.55),
    highlightTint: mergedHighlightTint.rgb,
    highlightTintStrength: mergedHighlightTint.strength,
    deblur,
    denoise,
    clarity,
    sharpen,
    chromaticAberration,
    bloom,
    halation,
    grain,
    vignette,
    lut,
    lutStrength: lut ? clamp(lutStrength / 100, 0, 1) : 0,
    effects: hasActiveStillEffects(manual.effects)
      ? mergeStillEffects(manual.effects)
      : null,
  };
}

/**
 * Full-resolution WebGL2 Editorial Darkroom Exporter:
 * - Geometry Transform (Straighten with inscribed auto-zoom, Rotate 90°, Flip H/V) + Centered Crop
 * - Exact WebGL2 Shader pass (Clarity, Sharpen, Chromatic Aberration, 6-Channel HSL,
 *   3-Way Split Toning, Pro-Mist Bloom, CineStill Halation, Bleach Bypass, 3D LUT, Grain, Vignette)
 * - Editorial gallery matte border (Paper / Ink / Gallery White) + Margin Stamp
 * - JPEG / PNG format & Standard / High / Print Max resolution
 */
export async function renderEditedPhotoToDataUrl(
  imageSrc: string,
  shaderParams: ShaderGradingParams,
  options?: Partial<ExportRenderOptions>,
  maxDimensionOverride?: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  const cropRatio: CropRatio = options?.cropRatio ?? 'original';
  const freeCrop: FreeCropRect | undefined = options?.freeCrop;
  const geometry: GeometryTransform = options?.geometry ?? DEFAULT_GEOMETRY;
  const upscale2x = Boolean(options?.upscale2x) && !maxDimensionOverride;
  const frameStyle: MatteFrameStyle = options?.frameStyle ?? 'none';
  const frameStamp = Boolean(options?.frameStamp && frameStyle !== 'none');
  const stampText = options?.stampText ?? 'STILL.';
  const format: ExportFormat = options?.format ?? 'jpeg';
  const qualityTier: ExportQuality = options?.quality ?? 'high';

  const maxDim =
    maxDimensionOverride ??
    (qualityTier === 'standard' ? 1440 : qualityTier === 'high' ? 2048 : 3200);
  const jpegQuality =
    qualityTier === 'standard' ? 0.86 : qualityTier === 'high' ? 0.93 : 0.96;

  const img = await loadImageCached(imageSrc);

  // 1. Apply Rotate 90°, Flip, Straighten (with inscribed auto-zoom), and Centered or Freeform Crop
  const transformed = buildGeometryTransformedCanvas(
    img,
    cropRatio,
    geometry,
    maxDim,
    freeCrop
  );

  // 1B. Optional Offline 2x Edge-Directed Crisp Super-Upscaler (anti-pixelation CAS reconstruction)
  const workingPlate = upscale2x
    ? upscaleCanvasCrisp2x(
        transformed.canvas,
        Math.min(3840, Math.max(maxDim, Math.max(transformed.width, transformed.height) * 2)),
        0.74
      )
    : transformed;

  const photoW = workingPlate.width;
  const photoH = workingPlate.height;

  // 2. Render exact WebGL2 optical restore & film shader pass
  const gradedCanvas = document.createElement('canvas');
  renderWithShaderToCanvas(
    workingPlate.canvas,
    `${imageSrc}::geom:${cropRatio}:${geometry.rotate90}:${geometry.straighten}:${geometry.flipH}:${geometry.flipV}:u2x:${upscale2x}:${photoW}x${photoH}:${Date.now()}`,
    gradedCanvas,
    photoW,
    photoH,
    shaderParams
  );

  // 4. Optional Editorial Matte, EXIF Exhibition, Instant SX-70, or 35mm Film Frame
  const frameMeta = MATTE_FRAMES.find((f) => f.id === frameStyle);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  if (frameStyle === 'none' || !frameMeta) {
    return {
      dataUrl: gradedCanvas.toDataURL(mime, jpegQuality),
      width: photoW,
      height: photoH,
    };
  }

  const presetCode = options?.presetCode ?? 'RAW';
  const exifDisplay = buildExifFrameDisplay(
    options?.exif,
    presetCode,
    options?.frameCaption
  );
  const minSide = Math.min(photoW, photoH);

  // ---- A. EXIF EXHIBITION FOOTER (Leica / Hasselblad Museum Print) ----
  if (frameStyle === 'exif-light' || frameStyle === 'exif-dark') {
    const isDark = frameStyle === 'exif-dark';
    const sidePad = Math.max(24, Math.round(minSide * 0.05));
    const topPad = sidePad;
    const footerH = Math.max(88, Math.round(minSide * 0.145));
    const outW = photoW + sidePad * 2;
    const outH = photoH + topPad + footerH;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = outW;
    finalCanvas.height = outH;
    const fCtx = finalCanvas.getContext('2d');
    if (!fCtx) throw new Error('Final canvas 2D context unavailable');

    fCtx.fillStyle = isDark ? '#151514' : '#F7F5F0';
    fCtx.fillRect(0, 0, outW, outH);
    fCtx.drawImage(gradedCanvas, sidePad, topPad);

    // Hairline border around photograph
    fCtx.strokeStyle = isDark
      ? 'rgba(233, 227, 216, 0.12)'
      : 'rgba(25, 25, 25, 0.10)';
    fCtx.lineWidth = Math.max(1, Math.round(minSide * 0.0012));
    fCtx.strokeRect(sidePad, topPad, photoW, photoH);

    const footerTop = topPad + photoH;
    const midY = footerTop + footerH * 0.52;
    const primaryColor = isDark ? '#E9E3D8' : '#191919';
    const mutedColor = isDark ? '#9E998E' : '#6A675F';
    const accentColor = '#A58C73';

    // Subtle hairline rule above EXIF plate
    fCtx.strokeStyle = isDark
      ? 'rgba(233, 227, 216, 0.14)'
      : 'rgba(25, 25, 25, 0.12)';
    fCtx.beginPath();
    fCtx.moveTo(sidePad, footerTop + Math.round(footerH * 0.16));
    fCtx.lineTo(outW - sidePad, footerTop + Math.round(footerH * 0.16));
    fCtx.stroke();

    const titleSize = Math.max(15, Math.round(footerH * 0.25));
    const subSize = Math.max(10, Math.round(footerH * 0.145));

    // Left: Camera / Model / Custom Title + Date
    fCtx.textAlign = 'left';
    fCtx.textBaseline = 'alphabetic';
    fCtx.fillStyle = primaryColor;
    fCtx.font = `600 ${titleSize}px "Inter", sans-serif`;
    fCtx.fillText(exifDisplay.cameraTitle, sidePad, midY + titleSize * 0.12);

    fCtx.fillStyle = mutedColor;
    fCtx.font = `400 ${subSize}px "JetBrains Mono", monospace`;
    fCtx.fillText(
      `${exifDisplay.dateLabel} · STILL.`,
      sidePad,
      midY + titleSize * 0.12 + subSize * 1.45
    );

    // Right: Technical EXIF Specs + Preset Code Badge
    fCtx.textAlign = 'right';
    fCtx.fillStyle = primaryColor;
    fCtx.font = `500 ${subSize}px "JetBrains Mono", monospace`;
    fCtx.fillText(
      exifDisplay.specsLine.toUpperCase(),
      outW - sidePad,
      midY + titleSize * 0.04
    );

    fCtx.fillStyle = accentColor;
    fCtx.font = `500 ${Math.max(9, Math.round(subSize * 0.92))}px "JetBrains Mono", monospace`;
    fCtx.fillText(
      `GRADE · ${presetCode.toUpperCase()}`,
      outW - sidePad,
      midY + titleSize * 0.04 + subSize * 1.45
    );

    return {
      dataUrl: finalCanvas.toDataURL(mime, jpegQuality),
      width: outW,
      height: outH,
    };
  }

  // ---- B. INSTANT SX-70 POLAROID ARCHIVAL CARD ----
  if (frameStyle === 'instant') {
    const sidePad = Math.max(26, Math.round(minSide * 0.068));
    const topPad = sidePad;
    const chinH = Math.max(118, Math.round(minSide * 0.24));
    const outW = photoW + sidePad * 2;
    const outH = photoH + topPad + chinH;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = outW;
    finalCanvas.height = outH;
    const fCtx = finalCanvas.getContext('2d');
    if (!fCtx) throw new Error('Final canvas 2D context unavailable');

    // Warm archival SX-70 stock
    fCtx.fillStyle = '#F2EEE5';
    fCtx.fillRect(0, 0, outW, outH);

    // Subtle recessed photo well border
    fCtx.fillStyle = '#E5DFD2';
    const wellPad = Math.max(2, Math.round(minSide * 0.004));
    fCtx.fillRect(
      sidePad - wellPad,
      topPad - wellPad,
      photoW + wellPad * 2,
      photoH + wellPad * 2
    );

    fCtx.drawImage(gradedCanvas, sidePad, topPad);

    // Inner crisp edge
    fCtx.strokeStyle = 'rgba(25, 25, 25, 0.14)';
    fCtx.lineWidth = Math.max(1, Math.round(minSide * 0.0014));
    fCtx.strokeRect(sidePad, topPad, photoW, photoH);

    const chinCenterY = topPad + photoH + chinH * 0.48;
    const captionText =
      (options?.frameCaption ?? '').trim() ||
      (exifDisplay.isDetectedExif ? exifDisplay.cameraTitle : 'STILL. Instant Plate');
    const serifSize = Math.max(18, Math.round(chinH * 0.2));
    const metaSize = Math.max(10, Math.round(chinH * 0.088));

    fCtx.textAlign = 'center';
    fCtx.textBaseline = 'middle';
    fCtx.fillStyle = '#252320';
    fCtx.font = `italic 400 ${serifSize}px "EB Garamond", Georgia, serif`;
    fCtx.fillText(captionText, outW / 2, chinCenterY - metaSize * 0.55);

    fCtx.fillStyle = '#7A756A';
    fCtx.font = `400 ${metaSize}px "JetBrains Mono", monospace`;
    fCtx.fillText(
      `${exifDisplay.dateLabel}  ·  ${presetCode.toUpperCase()}`,
      outW / 2,
      chinCenterY + serifSize * 0.72
    );

    return {
      dataUrl: finalCanvas.toDataURL(mime, jpegQuality),
      width: outW,
      height: outH,
    };
  }

  // ---- C. 35MM ANALOG FILM STRIP WITH SPROCKETS & EDGE MARKINGS ----
  if (frameStyle === 'film-35mm') {
    const railH = Math.max(58, Math.round(minSide * 0.11));
    const sidePad = Math.max(20, Math.round(minSide * 0.036));
    const outW = photoW + sidePad * 2;
    const outH = photoH + railH * 2;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = outW;
    finalCanvas.height = outH;
    const fCtx = finalCanvas.getContext('2d');
    if (!fCtx) throw new Error('Final canvas 2D context unavailable');

    // Deep acetate film base
    fCtx.fillStyle = '#111110';
    fCtx.fillRect(0, 0, outW, outH);

    // Subtle film gate hairline
    fCtx.strokeStyle = 'rgba(233, 227, 216, 0.12)';
    fCtx.lineWidth = Math.max(1, Math.round(minSide * 0.0014));
    fCtx.strokeRect(sidePad - 1, railH - 1, photoW + 2, photoH + 2);
    fCtx.drawImage(gradedCanvas, sidePad, railH);

    // Draw authentic 35mm sprocket perforations along top & bottom rails
    const perfW = Math.max(14, Math.round(railH * 0.34));
    const perfH = Math.max(20, Math.round(railH * 0.44));
    const perfStep = Math.round(perfW * 1.95);
    const perfRadius = Math.max(2, Math.round(perfW * 0.18));
    const topPerfY = Math.round(railH * 0.18);
    const botPerfY = outH - topPerfY - perfH;

    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      fCtx.beginPath();
      fCtx.moveTo(x + r, y);
      fCtx.lineTo(x + w - r, y);
      fCtx.quadraticCurveTo(x + w, y, x + w, y + r);
      fCtx.lineTo(x + w, y + h - r);
      fCtx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      fCtx.lineTo(x + r, y + h);
      fCtx.quadraticCurveTo(x, y + h, x, y + h - r);
      fCtx.lineTo(x, y + r);
      fCtx.quadraticCurveTo(x, y, x + r, y);
      fCtx.closePath();
      fCtx.fill();
    };

    fCtx.fillStyle = '#E9E3D8';
    const startX = Math.round((outW % perfStep) / 2) + Math.round(perfStep * 0.2);
    for (let x = startX; x + perfW < outW - 8; x += perfStep) {
      drawRoundedRect(x, topPerfY, perfW, perfH, perfRadius);
      drawRoundedRect(x, botPerfY, perfW, perfH, perfRadius);
    }

    // Warm amber analog edge markings
    const edgeFontSize = Math.max(10, Math.round(railH * 0.21));
    fCtx.fillStyle = '#D89E54';
    fCtx.font = `500 ${edgeFontSize}px "JetBrains Mono", monospace`;
    fCtx.textBaseline = 'middle';

    // Top inner edge markings
    const topTextY = railH - Math.round(railH * 0.17);
    fCtx.textAlign = 'left';
    fCtx.fillText(`▸ ${exifDisplay.filmEdgeCode}`, sidePad, topTextY);
    fCtx.textAlign = 'center';
    fCtx.fillText('24A', outW / 2, topTextY);
    fCtx.textAlign = 'right';
    fCtx.fillText(exifDisplay.dateLabel, outW - sidePad, topTextY);

    // Bottom inner edge markings
    const botTextY = railH + photoH + Math.round(railH * 0.18);
    fCtx.textAlign = 'left';
    fCtx.fillText(exifDisplay.cameraTitle, sidePad, botTextY);
    fCtx.textAlign = 'right';
    fCtx.fillText(exifDisplay.specsLine.toUpperCase(), outW - sidePad, botTextY);

    return {
      dataUrl: finalCanvas.toDataURL(mime, jpegQuality),
      width: outW,
      height: outH,
    };
  }

  // ---- D. CLASSIC EDITORIAL GALLERY MATTE (Paper / Ink / Gallery White) ----
  const basePad = Math.max(24, Math.round(minSide * 0.065));
  const bottomPad = frameStamp
    ? Math.round(basePad * 1.95)
    : Math.round(basePad * 1.2);
  const outW = photoW + basePad * 2;
  const outH = photoH + basePad + bottomPad;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = outW;
  finalCanvas.height = outH;
  const fCtx = finalCanvas.getContext('2d');
  if (!fCtx) throw new Error('Final canvas 2D context unavailable');

  fCtx.fillStyle = frameMeta.bgHex;
  fCtx.fillRect(0, 0, outW, outH);
  fCtx.drawImage(gradedCanvas, basePad, basePad);

  if (frameStamp) {
    const fontSize = Math.max(11, Math.round(basePad * 0.28));
    fCtx.fillStyle = frameMeta.textHex;
    fCtx.font = `400 ${fontSize}px "JetBrains Mono", monospace`;
    fCtx.textAlign = 'center';
    fCtx.textBaseline = 'middle';
    const stampY = basePad + photoH + bottomPad / 2;
    fCtx.fillText(stampText.toUpperCase(), outW / 2, stampY);
  }

  return {
    dataUrl: finalCanvas.toDataURL(mime, jpegQuality),
    width: outW,
    height: outH,
  };
}
