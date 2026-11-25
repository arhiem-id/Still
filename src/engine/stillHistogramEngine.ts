import type { ToneMood } from './stillColorEngine';

export interface PhotoHistogramStats {
  /** 48 normalized luminance bins (0..1) for minimalist sparkline display */
  bins: number[];
  /** Weighted average luminance (0..1) */
  meanLum: number;
  /** 5th percentile luminance (shadow floor) */
  p05: number;
  /** 50th percentile luminance (median midtone) */
  p50: number;
  /** 95th percentile luminance (highlight ceiling) */
  p95: number;
  /** Fraction of pixels above 0.96 luminance */
  clippedHighlights: number;
  /** Fraction of pixels below 0.04 luminance */
  crushedShadows: number;
  /** Estimated fraction of warm skin-tone pixels (0..1) */
  skinPresence: number;
}

export interface AdaptiveToneOffsets {
  exposure: number; // -0.5..0.5 EV stops
  contrast: number; // -0.35..0.35
  highlights: number; // -0.6..0.4 (negative recovers highlights)
  shadows: number; // -0.4..0.6 (positive lifts shadows)
  fade: number; // 0..0.15
  skinProtectBoost: number; // 0..0.4
}

/**
 * Analyzes an HTMLImageElement on a tiny 96x96 offscreen buffer (<2ms)
 * to compute its luminance histogram, dynamic range percentiles, and skin presence.
 */
export function analyzeImageHistogram(
  img: HTMLImageElement
): PhotoHistogramStats {
  const sampleSize = 96;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const fallback: PhotoHistogramStats = {
    bins: new Array(48).fill(0.25),
    meanLum: 0.48,
    p05: 0.08,
    p50: 0.48,
    p95: 0.88,
    clippedHighlights: 0.01,
    crushedShadows: 0.02,
    skinPresence: 0.1,
  };

  if (!ctx || img.naturalWidth === 0 || img.naturalHeight === 0) {
    return fallback;
  }

  try {
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const total = sampleSize * sampleSize;
    const raw256 = new Uint32Array(256);

    let lumSum = 0;
    let clipped = 0;
    let crushed = 0;
    let skinCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const bucket = Math.min(255, Math.max(0, Math.round(lum * 255)));
      raw256[bucket]++;
      lumSum += lum;

      if (lum > 0.96) clipped++;
      if (lum < 0.04) crushed++;

      // Warm human skin heuristic (YCbCr / RGB ratio approximation)
      if (
        r > 0.34 &&
        g > 0.2 &&
        b > 0.14 &&
        r > g &&
        g > b &&
        r - g > 0.04 &&
        r - b > 0.1 &&
        r - b < 0.48
      ) {
        skinCount++;
      }
    }

    // Compute percentiles p05, p50, p95
    let acc = 0;
    let p05 = 0.05;
    let p50 = 0.5;
    let p95 = 0.95;
    let found05 = false;
    let found50 = false;
    let found95 = false;

    for (let i = 0; i < 256; i++) {
      acc += raw256[i];
      const frac = acc / total;
      if (!found05 && frac >= 0.05) {
        p05 = i / 255;
        found05 = true;
      }
      if (!found50 && frac >= 0.5) {
        p50 = i / 255;
        found50 = true;
      }
      if (!found95 && frac >= 0.95) {
        p95 = i / 255;
        found95 = true;
      }
    }

    // Downsample 256 bins into 48 smooth editorial display bins
    const binCount = 48;
    const grouped = new Array<number>(binCount).fill(0);
    for (let i = 0; i < 256; i++) {
      const idx = Math.min(binCount - 1, Math.floor((i / 256) * binCount));
      grouped[idx] += raw256[i];
    }
    const maxBin = Math.max(1, ...grouped);
    const bins = grouped.map((v) => Math.pow(v / maxBin, 0.72));

    return {
      bins,
      meanLum: lumSum / total,
      p05,
      p50,
      p95,
      clippedHighlights: clipped / total,
      crushedShadows: crushed / total,
      skinPresence: skinCount / total,
    };
  } catch {
    return fallback;
  }
}

/**
 * Computes smart dynamic-range-aware tone offsets for Bright / Dark mood.
 * When autoBalance is enabled, highlights are gently protected on already-bright photos
 * and deep shadows are protected from crushing on already-dark photos.
 */
export function computeAdaptiveToneOffsets(
  stats: PhotoHistogramStats | null,
  toneMood: ToneMood,
  autoBalance: boolean
): AdaptiveToneOffsets {
  if (!stats || !autoBalance) {
    if (toneMood === 'bright') {
      return {
        exposure: 0.22,
        contrast: -0.05,
        highlights: -0.1,
        shadows: 0.24,
        fade: 0.015,
        skinProtectBoost: 0,
      };
    }
    return {
      exposure: -0.26,
      contrast: 0.14,
      highlights: -0.2,
      shadows: -0.16,
      fade: 0.025,
      skinProtectBoost: 0,
    };
  }

  const skinProtectBoost =
    stats.skinPresence > 0.12 ? Math.min(0.35, stats.skinPresence * 0.9) : 0;

  if (toneMood === 'bright') {
    // Headroom available before highlights clip
    const highlightHeadroom = Math.max(0, 0.94 - stats.p95);
    const baseExposure =
      stats.meanLum < 0.36
        ? 0.34
        : stats.meanLum > 0.64
          ? 0.1
          : 0.22;

    // Limit exposure push if highlights are already near ceiling
    const safeExposure = Math.min(baseExposure, 0.12 + highlightHeadroom * 1.15);
    const highlightRecovery =
      stats.p95 > 0.82 || stats.clippedHighlights > 0.03
        ? -Math.min(0.45, (stats.p95 - 0.74) * 1.6 + stats.clippedHighlights * 1.8)
        : -0.08;
    const shadowLift =
      stats.p05 < 0.12
        ? Math.min(0.42, 0.24 + (0.14 - stats.p05) * 1.2)
        : 0.2;

    return {
      exposure: safeExposure,
      contrast: -0.05,
      highlights: highlightRecovery,
      shadows: shadowLift,
      fade: 0.012,
      skinProtectBoost,
    };
  }

  // Dark / Moody mode: deepen midtones & highlights while preventing total black crush
  const shadowFloorRoom = Math.max(0, stats.p05 - 0.03);
  const baseDarkExposure =
    stats.meanLum > 0.58
      ? -0.36
      : stats.meanLum < 0.28
        ? -0.14
        : -0.26;
  const shadowGuard =
    stats.crushedShadows > 0.06 || stats.p05 < 0.06
      ? Math.min(0.22, 0.08 + stats.crushedShadows * 0.9)
      : -Math.min(0.18, 0.06 + shadowFloorRoom * 0.8);

  return {
    exposure: baseDarkExposure,
    contrast: stats.p95 - stats.p05 < 0.55 ? 0.2 : 0.12,
    highlights: -0.26,
    shadows: shadowGuard,
    fade: stats.crushedShadows > 0.08 ? 0.04 : 0.02,
    skinProtectBoost,
  };
}

/**
 * Computes exposure compensation (-35..+35 slider units) so a target photo
 * in an Editorial Series matches the tonal density of the Hero photograph.
 */
export function computeSeriesExposureMatch(
  heroStats: PhotoHistogramStats | null,
  targetStats: PhotoHistogramStats | null
): number {
  if (!heroStats || !targetStats) return 0;
  const delta = heroStats.meanLum - targetStats.meanLum;
  // Convert luminance delta (~ -0.5..+0.5) into gentle exposure slider units
  const sliderUnits = Math.round(delta * 58);
  return Math.max(-32, Math.min(32, sliderUnits));
}
