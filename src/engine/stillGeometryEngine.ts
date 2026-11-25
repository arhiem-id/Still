import { CROP_RATIOS, CropRatio } from './stillColorEngine';

export interface GeometryTransform {
  /** Fine horizon straighten angle in degrees (-15 to +15) */
  straighten: number;
  /** Coarse 90-degree clockwise rotation steps */
  rotate90: 0 | 90 | 180 | 270;
  /** Horizontal mirror flip */
  flipH: boolean;
  /** Vertical flip */
  flipV: boolean;
}

export const DEFAULT_GEOMETRY: GeometryTransform = {
  straighten: 0,
  rotate90: 0,
  flipH: false,
  flipV: false,
};

export interface FreeCropRect {
  /** Normalized left edge (0..1) */
  x: number;
  /** Normalized top edge (0..1) */
  y: number;
  /** Normalized width (0.14..1) */
  w: number;
  /** Normalized height (0.14..1) */
  h: number;
}

export const DEFAULT_FREE_CROP: FreeCropRect = {
  x: 0.08,
  y: 0.08,
  w: 0.84,
  h: 0.84,
};

export function isFreeCropFull(rect?: FreeCropRect | null): boolean {
  if (!rect) return true;
  return (
    rect.x <= 0.002 &&
    rect.y <= 0.002 &&
    rect.w >= 0.996 &&
    rect.h >= 0.996
  );
}

export function isGeometryNeutral(g: GeometryTransform): boolean {
  return (
    Math.abs(g.straighten) < 0.05 &&
    g.rotate90 === 0 &&
    !g.flipH &&
    !g.flipV
  );
}

/**
 * Exact inscribed-rectangle auto-zoom factor so rotating a rectangle
 * of aspect ratio `aspect` (w / h) by `angleDeg` fills the entire frame
 * with zero black triangular corners.
 */
export function computeInscribedScale(
  angleDeg: number,
  aspect = 1
): number {
  const rad = (Math.abs(angleDeg) * Math.PI) / 180;
  if (rad < 0.0001) return 1;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const safeAspect = Math.max(0.25, Math.min(4, aspect));
  const scaleX = c + s / safeAspect;
  const scaleY = c + s * safeAspect;
  return Math.max(scaleX, scaleY);
}

/**
 * Offline Sobel gradient-orientation horizon & architectural vertical detector (<3ms).
 * Samples dominant edges on a 128x128 grayscale buffer and votes on small tilt angles
 * (-12°..+12°) relative to true horizontal (0°) or vertical (90°).
 * Returns the corrective angle in degrees to straighten the photograph.
 */
export function detectAutoHorizonAngle(img: HTMLImageElement): number {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || img.naturalWidth === 0 || img.naturalHeight === 0) return 0;

  try {
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const gray = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
      const p = i * 4;
      gray[i] =
        (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
    }

    // Half-degree resolution histogram from -12° to +12° (49 bins)
    const minDeg = -12;
    const maxDeg = 12;
    const step = 0.5;
    const numBins = Math.round((maxDeg - minDeg) / step) + 1;
    const votes = new Float32Array(numBins);
    let totalWeight = 0;

    for (let y = 2; y < size - 2; y++) {
      for (let x = 2; x < size - 2; x++) {
        const idx = y * size + x;
        const gx =
          -gray[idx - size - 1] +
          gray[idx - size + 1] -
          2 * gray[idx - 1] +
          2 * gray[idx + 1] -
          gray[idx + size - 1] +
          gray[idx + size + 1];
        const gy =
          -gray[idx - size - 1] -
          2 * gray[idx - size] -
          gray[idx - size + 1] +
          gray[idx + size - 1] +
          2 * gray[idx + size] +
          gray[idx + size + 1];

        const mag = Math.hypot(gx, gy);
        if (mag < 0.14) continue;

        // Edge tangent angle in degrees (-90..+90)
        // Horizontal edge has gx ~ 0, gy != 0 -> tangent ~ 0°
        // Vertical edge has gy ~ 0, gx != 0 -> tangent ~ ±90°
        let edgeAngle = (Math.atan2(gy, gx) * 180) / Math.PI - 90;
        while (edgeAngle <= -90) edgeAngle += 180;
        while (edgeAngle > 90) edgeAngle -= 180;

        // Map near-horizontal (-12..+12) or near-vertical (78..90 / -90..-78) into -12..+12 tilt
        let tilt: number | null = null;
        if (Math.abs(edgeAngle) <= maxDeg) {
          tilt = edgeAngle;
        } else if (edgeAngle > 90 - maxDeg) {
          tilt = edgeAngle - 90;
        } else if (edgeAngle < -90 + maxDeg) {
          tilt = edgeAngle + 90;
        }

        if (tilt !== null) {
          const bin = Math.round((tilt - minDeg) / step);
          if (bin >= 0 && bin < numBins) {
            const w = mag * mag;
            votes[bin] += w;
            totalWeight += w;
          }
        }
      }
    }

    if (totalWeight < 0.5) return 0;

    // Smooth 3-tap kernel over bins to pick dominant structural angle cleanly
    let bestBin = Math.floor(numBins / 2);
    let bestScore = -1;
    for (let i = 1; i < numBins - 1; i++) {
      const score = votes[i - 1] * 0.25 + votes[i] * 0.5 + votes[i + 1] * 0.25;
      if (score > bestScore) {
        bestScore = score;
        bestBin = i;
      }
    }

    const detectedTilt = minDeg + bestBin * step;
    // Corrective angle negates the measured tilt; clamp to ±12° & ignore tiny noise <0.4°
    const corrective = -detectedTilt;
    if (Math.abs(corrective) < 0.4) return 0;
    return Math.round(Math.max(-12, Math.min(12, corrective)) * 10) / 10;
  } catch {
    return 0;
  }
}

/**
 * Produces a cleanly rotated, flipped, straightened (with zero black corners),
 * and aspect-ratio or freeform-cropped canvas ready to feed directly into STILL.'s WebGL shader.
 */
export function buildGeometryTransformedCanvas(
  img: HTMLImageElement,
  cropRatio: CropRatio,
  geometry: GeometryTransform,
  maxDimension: number,
  freeCrop?: FreeCropRect | null
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const swapped = geometry.rotate90 === 90 || geometry.rotate90 === 270;
  const orientedW = swapped ? img.naturalHeight : img.naturalWidth;
  const orientedH = swapped ? img.naturalWidth : img.naturalHeight;

  // Freeform crop: first render the exact full geometry-transformed plate, then extract the normalized FreeCropRect
  if (cropRatio === 'free' && freeCrop && !isFreeCropFull(freeCrop)) {
    const safeX = Math.max(0, Math.min(0.86, freeCrop.x));
    const safeY = Math.max(0, Math.min(0.86, freeCrop.y));
    const safeW = Math.max(0.14, Math.min(1 - safeX, freeCrop.w));
    const safeH = Math.max(0.14, Math.min(1 - safeY, freeCrop.h));

    // Scale base plate so the cropped region still maintains sharp resolution up to maxDimension
    const requiredBaseMax = Math.min(
      Math.max(orientedW, orientedH),
      Math.min(4096, Math.round(maxDimension / Math.max(safeW, safeH)))
    );
    const fullPlate = buildGeometryTransformedCanvas(
      img,
      'original',
      geometry,
      Math.max(maxDimension, requiredBaseMax)
    );

    const sx = Math.round(safeX * fullPlate.width);
    const sy = Math.round(safeY * fullPlate.height);
    const sw = Math.max(1, Math.round(safeW * fullPlate.width));
    const sh = Math.max(1, Math.round(safeH * fullPlate.height));

    const outScale = Math.min(1, maxDimension / Math.max(sw, sh, 1));
    const outW = Math.max(1, Math.round(sw * outScale));
    const outH = Math.max(1, Math.round(sh * outScale));

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = outW;
    croppedCanvas.height = outH;
    const cCtx = croppedCanvas.getContext('2d');
    if (cCtx) {
      cCtx.drawImage(fullPlate.canvas, sx, sy, sw, sh, 0, 0, outW, outH);
    }
    return { canvas: croppedCanvas, width: outW, height: outH };
  }

  // Determine target aspect ratio after optional preset crop
  const ratioMeta = CROP_RATIOS.find((r) => r.id === cropRatio);
  let outBaseW = orientedW;
  let outBaseH = orientedH;

  if (ratioMeta?.ratioValue) {
    const targetRatio = ratioMeta.ratioValue;
    const srcRatio = orientedW / Math.max(1, orientedH);
    if (srcRatio > targetRatio) {
      outBaseW = Math.round(orientedH * targetRatio);
    } else if (srcRatio < targetRatio) {
      outBaseH = Math.round(orientedW / targetRatio);
    }
  }

  const downscale = Math.min(
    1,
    maxDimension / Math.max(outBaseW, outBaseH, 1)
  );
  const outW = Math.max(1, Math.round(outBaseW * downscale));
  const outH = Math.max(1, Math.round(outBaseH * downscale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, width: outW, height: outH };

  // Compute cover scale (from oriented image to outW x outH) * inscribed auto-zoom for straighten
  const coverScale = Math.max(
    outW / Math.max(1, orientedW),
    outH / Math.max(1, orientedH)
  );
  const inscribedZoom = computeInscribedScale(
    geometry.straighten,
    outW / Math.max(1, outH)
  );
  const finalScale = coverScale * inscribedZoom;

  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.scale(geometry.flipH ? -1 : 1, geometry.flipV ? -1 : 1);
  ctx.rotate(((geometry.rotate90 + geometry.straighten) * Math.PI) / 180);
  ctx.scale(finalScale, finalScale);
  ctx.drawImage(
    img,
    -img.naturalWidth / 2,
    -img.naturalHeight / 2,
    img.naturalWidth,
    img.naturalHeight
  );
  ctx.restore();

  return { canvas, width: outW, height: outH };
}
