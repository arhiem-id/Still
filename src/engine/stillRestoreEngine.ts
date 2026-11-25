/**
 * STILL. Offline Optical Restore & 2x Crisp Super-Upscale Engine
 *
 * 100% offline, zero-AI-API signal processing pipeline:
 * 1. Laplacian Focus & Resolution Diagnostics (detects soft focus / low-res plates)
 * 2. Edge-Directed 2x Super-Upscaler with Contrast-Adaptive Edge Reconstruction
 *    (inspired by AMD FidelityFX CAS to eliminate jagged pixelation & ringing when zoomed)
 */

export interface OpticalQualityReport {
  /** Normalized optical sharpness score 0..100 */
  sharpnessScore: number;
  sharpnessLabel: 'SOFT' | 'MODERATE' | 'CRISP';
  naturalWidth: number;
  naturalHeight: number;
  isLowRes: boolean;
  /** Recommended offline restore defaults for 1-tap Auto Restore */
  suggestedDeblur: number;
  suggestedDenoise: number;
  suggestedUpscale2x: boolean;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Offline Laplacian-variance focus & resolution analyzer (<4ms).
 * Evaluates mid-frame sharpness and source dimensions to guide 1-tap Auto Restore.
 */
export function analyzeOpticalQuality(
  img: HTMLImageElement
): OpticalQualityReport {
  const naturalWidth = Math.max(1, img.naturalWidth);
  const naturalHeight = Math.max(1, img.naturalHeight);
  const maxDim = Math.max(naturalWidth, naturalHeight);
  const isLowRes = maxDim < 1200;

  const sampleSize = 192;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let sharpnessScore = 55;

  if (ctx) {
    try {
      // Sample center 80% region where the primary subject usually sits
      const sx = Math.round(naturalWidth * 0.1);
      const sy = Math.round(naturalHeight * 0.1);
      const sw = Math.max(1, Math.round(naturalWidth * 0.8));
      const sh = Math.max(1, Math.round(naturalHeight * 0.8));
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize);

      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const luma = new Float32Array(sampleSize * sampleSize);
      for (let i = 0; i < luma.length; i++) {
        const p = i * 4;
        luma[i] =
          (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) /
          255;
      }

      // 3x3 Laplacian variance (high variance = crisp high-frequency optical edges)
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let y = 1; y < sampleSize - 1; y++) {
        const row = y * sampleSize;
        for (let x = 1; x < sampleSize - 1; x++) {
          const idx = row + x;
          const lap =
            luma[idx - sampleSize] +
            luma[idx + sampleSize] +
            luma[idx - 1] +
            luma[idx + 1] -
            4 * luma[idx];
          sum += lap;
          sumSq += lap * lap;
          count++;
        }
      }

      const mean = sum / Math.max(1, count);
      const variance = Math.max(0, sumSq / Math.max(1, count) - mean * mean);
      // Empirical photographic calibration: ~0.0005 = very soft, ~0.008+ = crisp
      const normalized = Math.log1p(variance * 900) / Math.log1p(9.5);
      sharpnessScore = Math.round(Math.max(5, Math.min(98, normalized * 100)));
    } catch {
      sharpnessScore = 55;
    }
  }

  const sharpnessLabel: OpticalQualityReport['sharpnessLabel'] =
    sharpnessScore < 42 ? 'SOFT' : sharpnessScore < 72 ? 'MODERATE' : 'CRISP';

  const suggestedDeblur =
    sharpnessLabel === 'SOFT'
      ? 68
      : sharpnessLabel === 'MODERATE'
        ? 42
        : 22;
  const suggestedDenoise = isLowRes
    ? 36
    : sharpnessLabel === 'SOFT'
      ? 24
      : 14;
  const suggestedUpscale2x = isLowRes || sharpnessLabel === 'SOFT';

  return {
    sharpnessScore,
    sharpnessLabel,
    naturalWidth,
    naturalHeight,
    isLowRes,
    suggestedDeblur,
    suggestedDenoise,
    suggestedUpscale2x,
  };
}

/**
 * Offline 2x Edge-Directed Crisp Super-Upscaler.
 *
 * Step 1: High-quality bicubic/Lanczos-grade 2x canvas resampling (clamped to maxOutputEdge).
 * Step 2: Contrast-Adaptive Edge Reconstruction (FidelityFX CAS-inspired 5-tap cross filter)
 *         that tightens soft edges along true contours while clamping strictly within the
 *         local min/max envelope so edges stay smooth, sharp, and artifact-free when zoomed.
 */
export function upscaleCanvasCrisp2x(
  source: HTMLImageElement | HTMLCanvasElement,
  maxOutputEdge: number,
  casStrength = 0.72
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const srcW =
    source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcH =
    source instanceof HTMLImageElement ? source.naturalHeight : source.height;

  const targetScale = Math.min(2, maxOutputEdge / Math.max(srcW, srcH, 1));
  const outW = Math.max(1, Math.round(srcW * Math.max(1, targetScale)));
  const outH = Math.max(1, Math.round(srcH * Math.max(1, targetScale)));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { canvas, width: outW, height: outH };

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, outW, outH);

  // Skip CAS pass if strength is zero or canvas is tiny
  if (casStrength <= 0.01 || outW < 8 || outH < 8) {
    return { canvas, width: outW, height: outH };
  }

  try {
    const imgData = ctx.getImageData(0, 0, outW, outH);
    const src = imgData.data;
    const dst = new Uint8ClampedArray(src.length);
    // Copy border pixels untouched
    dst.set(src);

    // Peak negative lobe weight (-0.125 .. -0.20 range keeps CAS crisp with zero ringing)
    const peak = -0.125 - 0.075 * Math.max(0, Math.min(1, casStrength));
    const stride = outW * 4;

    for (let y = 1; y < outH - 1; y++) {
      const rowOffset = y * stride;
      for (let x = 1; x < outW - 1; x++) {
        const i = rowOffset + x * 4;
        const iN = i - stride;
        const iS = i + stride;
        const iW = i - 4;
        const iE = i + 4;

        // Compute luma on 5-tap cross to find adaptive contrast weight
        const cG = src[i + 1];
        const nG = src[iN + 1];
        const sG = src[iS + 1];
        const wG = src[iW + 1];
        const eG = src[iE + 1];

        let minG = cG;
        if (nG < minG) minG = nG;
        if (sG < minG) minG = sG;
        if (wG < minG) minG = wG;
        if (eG < minG) minG = eG;

        let maxG = cG;
        if (nG > maxG) maxG = nG;
        if (sG > maxG) maxG = sG;
        if (wG > maxG) maxG = wG;
        if (eG > maxG) maxG = eG;

        // Avoid sharpening flat noise regions (contrast < 3 levels)
        const contrast = maxG - minG;
        if (contrast < 4) continue;

        const invMax = 1 / Math.max(1, maxG);
        const amp = Math.sqrt(
          Math.max(0, Math.min(minG, 255 - maxG) * invMax)
        );
        const w = amp * peak;
        const invWeight = 1 / (1 + 4 * w);

        // Apply identical adaptive edge kernel across R, G, B with strict anti-halo clamp
        for (let ch = 0; ch < 3; ch++) {
          const c = src[i + ch];
          const n = src[iN + ch];
          const s = src[iS + ch];
          const l = src[iW + ch];
          const r = src[iE + ch];

          const filtered = (c + (n + s + l + r) * w) * invWeight;
          const lo = Math.min(c, n, s, l, r);
          const hi = Math.max(c, n, s, l, r);
          // Allow tiny crisp overshoot (4 levels) for optical snap without halos
          dst[i + ch] = clampByte(
            Math.max(lo - 4, Math.min(hi + 4, Math.round(filtered)))
          );
        }
        dst[i + 3] = src[i + 3];
      }
    }

    imgData.data.set(dst);
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Graceful fallback to high-quality resampled canvas
  }

  return { canvas, width: outW, height: outH };
}
