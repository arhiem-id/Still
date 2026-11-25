/**
 * STILL. Optical & Natural Atmosphere Effects Engine
 * 100% offline, deterministic (seeded), resolution-independent 2D compositor
 * rendered identically across live preview, fullscreen swipe, diptychs, batch, and 3.2K export.
 */

export type LightLeakStyle =
  | 'side-amber'
  | 'corner-crimson'
  | 'double-burn'
  | 'sun-streak'
  | 'prism-spectrum';

export type FilmDustStyle = 'subtle-scan' | 'dust-hairs' | 'vintage-scratches';

export type DateStampStyle = 'amber-led' | 'crimson-90s' | 'minimal-ivory';
export type DateStampPosition = 'bottom-right' | 'bottom-left' | 'top-right';

export type AnamorphicTone = 'cinema-blue' | 'amber-gold' | 'prism-white';

export type LensBlurStyle = 'radial-prime' | 'tilt-horizontal' | 'tilt-vertical';

export type SunRaysDirection = 'top-left' | 'top-right' | 'top-center';
export type SunRaysTone = 'golden' | 'ivory';

export type ShadowPlayPattern =
  | 'botanical-leaf'
  | 'venetian-blinds'
  | 'window-pane'
  | 'palm-frond';
export type ShadowPlayDirection = 'left' | 'right';

export type MistStyle = 'ground-fog' | 'morning-haze' | 'drifting-alpine';
export type MistTone = 'cool-silver' | 'warm-cream';

export type SunHaloPosition = 'top-left' | 'top-right' | 'edge-left' | 'edge-right';

export type AtmosphereParticleMode = 'sun-motes' | 'soft-rain' | 'glass-dew';

export type LightGlintAngle = 'cross-45' | 'cross-0' | 'star-6';

export interface StillEffectsConfig {
  // ---- OPTICAL & ANALOG (5) ----
  lightLeak: {
    intensity: number; // 0..100
    style: LightLeakStyle;
    seed: number;
  };
  filmDust: {
    intensity: number; // 0..100
    style: FilmDustStyle;
    seed: number;
  };
  dateStamp: {
    enabled: boolean;
    style: DateStampStyle;
    position: DateStampPosition;
    customText: string;
    /** Auto-populated from EXIF capture date when available */
    autoExifText?: string;
  };
  anamorphic: {
    intensity: number; // 0..100
    tone: AnamorphicTone;
  };
  lensBlur: {
    intensity: number; // 0..100
    style: LensBlurStyle;
  };

  // ---- NATURAL ATMOSPHERE & LIGHT PLAY (6) ----
  sunRays: {
    intensity: number; // 0..100
    direction: SunRaysDirection;
    tone: SunRaysTone;
  };
  shadowPlay: {
    intensity: number; // 0..100
    pattern: ShadowPlayPattern;
    direction: ShadowPlayDirection;
  };
  mist: {
    intensity: number; // 0..100
    style: MistStyle;
    tone: MistTone;
  };
  sunHalo: {
    intensity: number; // 0..100
    position: SunHaloPosition;
  };
  atmosphereParticles: {
    intensity: number; // 0..100
    mode: AtmosphereParticleMode;
    seed: number;
  };
  lightGlint: {
    intensity: number; // 0..100
    angle: LightGlintAngle;
  };
}

export const DEFAULT_STILL_EFFECTS: StillEffectsConfig = {
  lightLeak: { intensity: 0, style: 'side-amber', seed: 1 },
  filmDust: { intensity: 0, style: 'subtle-scan', seed: 1 },
  dateStamp: {
    enabled: false,
    style: 'amber-led',
    position: 'bottom-right',
    customText: '',
  },
  anamorphic: { intensity: 0, tone: 'cinema-blue' },
  lensBlur: { intensity: 0, style: 'radial-prime' },
  sunRays: { intensity: 0, direction: 'top-left', tone: 'golden' },
  shadowPlay: { intensity: 0, pattern: 'botanical-leaf', direction: 'left' },
  mist: { intensity: 0, style: 'ground-fog', tone: 'cool-silver' },
  sunHalo: { intensity: 0, position: 'top-right' },
  atmosphereParticles: { intensity: 0, mode: 'sun-motes', seed: 1 },
  lightGlint: { intensity: 0, angle: 'cross-45' },
};

export function mergeStillEffects(
  partial?: Partial<StillEffectsConfig> | null
): StillEffectsConfig {
  if (!partial) {
    return {
      lightLeak: { ...DEFAULT_STILL_EFFECTS.lightLeak },
      filmDust: { ...DEFAULT_STILL_EFFECTS.filmDust },
      dateStamp: { ...DEFAULT_STILL_EFFECTS.dateStamp },
      anamorphic: { ...DEFAULT_STILL_EFFECTS.anamorphic },
      lensBlur: { ...DEFAULT_STILL_EFFECTS.lensBlur },
      sunRays: { ...DEFAULT_STILL_EFFECTS.sunRays },
      shadowPlay: { ...DEFAULT_STILL_EFFECTS.shadowPlay },
      mist: { ...DEFAULT_STILL_EFFECTS.mist },
      sunHalo: { ...DEFAULT_STILL_EFFECTS.sunHalo },
      atmosphereParticles: { ...DEFAULT_STILL_EFFECTS.atmosphereParticles },
      lightGlint: { ...DEFAULT_STILL_EFFECTS.lightGlint },
    };
  }
  return {
    lightLeak: { ...DEFAULT_STILL_EFFECTS.lightLeak, ...(partial.lightLeak ?? {}) },
    filmDust: { ...DEFAULT_STILL_EFFECTS.filmDust, ...(partial.filmDust ?? {}) },
    dateStamp: { ...DEFAULT_STILL_EFFECTS.dateStamp, ...(partial.dateStamp ?? {}) },
    anamorphic: { ...DEFAULT_STILL_EFFECTS.anamorphic, ...(partial.anamorphic ?? {}) },
    lensBlur: { ...DEFAULT_STILL_EFFECTS.lensBlur, ...(partial.lensBlur ?? {}) },
    sunRays: { ...DEFAULT_STILL_EFFECTS.sunRays, ...(partial.sunRays ?? {}) },
    shadowPlay: { ...DEFAULT_STILL_EFFECTS.shadowPlay, ...(partial.shadowPlay ?? {}) },
    mist: { ...DEFAULT_STILL_EFFECTS.mist, ...(partial.mist ?? {}) },
    sunHalo: { ...DEFAULT_STILL_EFFECTS.sunHalo, ...(partial.sunHalo ?? {}) },
    atmosphereParticles: {
      ...DEFAULT_STILL_EFFECTS.atmosphereParticles,
      ...(partial.atmosphereParticles ?? {}),
    },
    lightGlint: { ...DEFAULT_STILL_EFFECTS.lightGlint, ...(partial.lightGlint ?? {}) },
  };
}

export function hasActiveStillEffects(effects?: StillEffectsConfig | null): boolean {
  if (!effects) return false;
  return (
    effects.lightLeak.intensity > 0 ||
    effects.filmDust.intensity > 0 ||
    effects.dateStamp.enabled ||
    effects.anamorphic.intensity > 0 ||
    effects.lensBlur.intensity > 0 ||
    effects.sunRays.intensity > 0 ||
    effects.shadowPlay.intensity > 0 ||
    effects.mist.intensity > 0 ||
    effects.sunHalo.intensity > 0 ||
    effects.atmosphereParticles.intensity > 0 ||
    effects.lightGlint.intensity > 0
  );
}

export function countActiveStillEffects(effects?: StillEffectsConfig | null): number {
  if (!effects) return 0;
  let count = 0;
  if (effects.lightLeak.intensity > 0) count++;
  if (effects.filmDust.intensity > 0) count++;
  if (effects.dateStamp.enabled) count++;
  if (effects.anamorphic.intensity > 0) count++;
  if (effects.lensBlur.intensity > 0) count++;
  if (effects.sunRays.intensity > 0) count++;
  if (effects.shadowPlay.intensity > 0) count++;
  if (effects.mist.intensity > 0) count++;
  if (effects.sunHalo.intensity > 0) count++;
  if (effects.atmosphereParticles.intensity > 0) count++;
  if (effects.lightGlint.intensity > 0) count++;
  return count;
}

/**
 * Formats an EXIF date string (e.g. "2025:11:25 14:30:00" or "NOV 25, 2025")
 * into authentic 90s camera LED date stamp format: "'25 11 25".
 */
export function format90sDateStamp(rawDate?: string | null): string {
  if (rawDate) {
    const isoMatch = rawDate.match(/(\d{4})[-:/](\d{1,2})[-:/](\d{1,2})/);
    if (isoMatch) {
      const yy = isoMatch[1].slice(-2);
      const mm = isoMatch[2].padStart(2, '0');
      const dd = isoMatch[3].padStart(2, '0');
      return `'${yy} ${mm} ${dd}`;
    }
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      const yy = String(parsed.getFullYear()).slice(-2);
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `'${yy} ${mm} ${dd}`;
    }
  }
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `'${yy} ${mm} ${dd}`;
}

/** Fast deterministic Mulberry32 PRNG */
function createRng(seed: number): () => number {
  let a = (Math.floor(seed * 2654435761) >>> 0) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SpecularPeak {
  nx: number; // 0..1
  ny: number; // 0..1
  strength: number; // 0..1
  r: number;
  g: number;
  b: number;
}

/**
 * Downsamples the current graded canvas to a tiny grid (~64px) to locate genuine
 * high-luminance light sources (streetlights, sun reflections, water sparkles, candles)
 * for physically grounded Anamorphic Streaks & 4-Point Star Glints.
 */
function detectSpecularPeaks(
  canvas: HTMLCanvasElement,
  threshold: number,
  maxPeaks: number
): SpecularPeak[] {
  const gw = 64;
  const gh = Math.max(24, Math.round((canvas.height / Math.max(1, canvas.width)) * gw));
  const probe = document.createElement('canvas');
  probe.width = gw;
  probe.height = gh;
  const pCtx = probe.getContext('2d', { willReadFrequently: true });
  if (!pCtx) return [];

  pCtx.drawImage(canvas, 0, 0, gw, gh);
  const imgData = pCtx.getImageData(0, 0, gw, gh).data;

  const lums = new Float32Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) {
    const o = i * 4;
    lums[i] =
      (0.2126 * imgData[o] + 0.7152 * imgData[o + 1] + 0.0722 * imgData[o + 2]) / 255;
  }

  const candidates: SpecularPeak[] = [];
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const idx = y * gw + x;
      const v = lums[idx];
      if (v < threshold) continue;
      // Local maximum check (3x3 neighborhood)
      if (
        v >= lums[idx - 1] &&
        v >= lums[idx + 1] &&
        v >= lums[idx - gw] &&
        v >= lums[idx + gw] &&
        v >= lums[idx - gw - 1] &&
        v >= lums[idx - gw + 1] &&
        v >= lums[idx + gw - 1] &&
        v >= lums[idx + gw + 1]
      ) {
        const o = idx * 4;
        candidates.push({
          nx: (x + 0.5) / gw,
          ny: (y + 0.5) / gh,
          strength: Math.min(1, (v - threshold) / Math.max(0.05, 1 - threshold)),
          r: imgData[o],
          g: imgData[o + 1],
          b: imgData[o + 2],
        });
      }
    }
  }

  candidates.sort((a, b) => b.strength - a.strength);

  // Spatial suppression so peaks don't clump right on top of each other
  const selected: SpecularPeak[] = [];
  const minDistSq = 0.075 * 0.075;
  for (const c of candidates) {
    if (selected.length >= maxPeaks) break;
    const tooClose = selected.some((s) => {
      const dx = s.nx - c.nx;
      const dy = s.ny - c.ny;
      return dx * dx + dy * dy < minDistSq;
    });
    if (!tooClose) selected.push(c);
  }
  return selected;
}

/** 1. Vintage Lens Falloff / Tilt-Shift Soft Focus */
function drawLensBlur(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  style: LensBlurStyle
) {
  const k = intensity / 100;
  if (k <= 0.005) return;

  const minSide = Math.min(w, h);
  const blurRadius = Math.max(1.5, minSide * 0.014 * k);

  // Build blurred layer at half-res for speed & velvety optical bokeh
  const bw = Math.max(64, Math.round(w * 0.55));
  const bh = Math.max(64, Math.round(h * 0.55));
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = bw;
  blurCanvas.height = bh;
  const bCtx = blurCanvas.getContext('2d');
  if (!bCtx) return;

  bCtx.filter = `blur(${(blurRadius * 0.55).toFixed(2)}px)`;
  bCtx.drawImage(ctx.canvas, 0, 0, bw, bh);
  bCtx.filter = 'none';

  // Punch clear focus window using destination-out gradient mask
  bCtx.globalCompositeOperation = 'destination-out';
  if (style === 'radial-prime') {
    const cx = bw * 0.5;
    const cy = bh * 0.48;
    const innerR = Math.min(bw, bh) * (0.28 - k * 0.06);
    const outerR = Math.hypot(bw, bh) * 0.54;
    const grad = bCtx.createRadialGradient(cx, cy, Math.max(4, innerR), cx, cy, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.68)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    bCtx.fillStyle = grad;
    bCtx.fillRect(0, 0, bw, bh);
  } else if (style === 'tilt-horizontal') {
    const grad = bCtx.createLinearGradient(0, 0, 0, bh);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.28, 'rgba(0,0,0,0.88)');
    grad.addColorStop(0.5, 'rgba(0,0,0,1)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.88)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    bCtx.fillStyle = grad;
    bCtx.fillRect(0, 0, bw, bh);
  } else {
    const grad = bCtx.createLinearGradient(0, 0, bw, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.28, 'rgba(0,0,0,0.88)');
    grad.addColorStop(0.5, 'rgba(0,0,0,1)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.88)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    bCtx.fillStyle = grad;
    bCtx.fillRect(0, 0, bw, bh);
  }

  ctx.save();
  ctx.globalAlpha = Math.min(0.95, 0.35 + k * 0.6);
  ctx.drawImage(blurCanvas, 0, 0, w, h);
  ctx.restore();
}

/** 2. Shadow Play / Gobo (Botanical Leaf, Venetian Blinds, Window Pane, Palm Frond) */
function drawShadowPlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  pattern: ShadowPlayPattern,
  direction: ShadowPlayDirection
) {
  const k = intensity / 100;
  if (k <= 0.005) return;

  const sw = Math.max(160, Math.round(w * 0.5));
  const sh = Math.max(160, Math.round(h * 0.5));
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = sw;
  shadowCanvas.height = sh;
  const sCtx = shadowCanvas.getContext('2d');
  if (!sCtx) return;

  // Fill white (multiply identity)
  sCtx.fillStyle = '#FFFFFF';
  sCtx.fillRect(0, 0, sw, sh);

  const penumbra = Math.max(4, Math.min(sw, sh) * (pattern === 'venetian-blinds' ? 0.024 : 0.032));
  sCtx.save();
  sCtx.filter = `blur(${penumbra.toFixed(1)}px)`;

  if (direction === 'right') {
    sCtx.translate(sw, 0);
    sCtx.scale(-1, 1);
  }

  // Natural cool-umber shadow tone (never flat harsh black)
  sCtx.fillStyle = '#22201F';

  if (pattern === 'venetian-blinds') {
    sCtx.save();
    sCtx.translate(-sw * 0.12, -sh * 0.14);
    sCtx.rotate(0.24);
    const slats = 11;
    const spanH = sh * 1.45;
    const step = spanH / slats;
    for (let i = 0; i < slats; i++) {
      const y = i * step;
      const barH = step * 0.44;
      sCtx.fillRect(0, y, sw * 1.45, barH);
    }
    // Vertical blind cord line
    sCtx.fillRect(sw * 0.36, 0, sw * 0.015, spanH);
    sCtx.fillRect(sw * 0.84, 0, sw * 0.015, spanH);
    sCtx.restore();
  } else if (pattern === 'window-pane') {
    // Architectural sun-box: dark surrounding wall, bright skewed window opening with mullions
    sCtx.fillRect(-sw * 0.1, -sh * 0.1, sw * 1.2, sh * 1.2);
    sCtx.fillStyle = '#FFFFFF';
    sCtx.save();
    sCtx.transform(1, 0.22, -0.14, 1, sw * 0.12, sh * 0.06);
    const wx = sw * 0.08;
    const wy = sh * 0.1;
    const ww = sw * 0.66;
    const wh = sh * 0.68;
    const bar = Math.max(8, Math.min(sw, sh) * 0.036);
    const paneW = (ww - bar) / 2;
    const paneH = (wh - bar) / 2;
    sCtx.fillRect(wx, wy, paneW, paneH);
    sCtx.fillRect(wx + paneW + bar, wy, paneW, paneH);
    sCtx.fillRect(wx, wy + paneH + bar, paneW, paneH);
    sCtx.fillRect(wx + paneW + bar, wy + paneH + bar, paneW, paneH);
    sCtx.restore();
  } else if (pattern === 'botanical-leaf') {
    // Organic olive/fig branch arching from upper-left with dappled leaves
    sCtx.save();
    sCtx.strokeStyle = '#22201F';
    sCtx.lineCap = 'round';

    const drawBranch = (
      sx: number,
      sy: number,
      cx: number,
      cy: number,
      ex: number,
      ey: number,
      leafCount: number,
      scale: number
    ) => {
      sCtx.lineWidth = Math.max(3, Math.min(sw, sh) * 0.016 * scale);
      sCtx.beginPath();
      sCtx.moveTo(sx, sy);
      sCtx.quadraticCurveTo(cx, cy, ex, ey);
      sCtx.stroke();

      for (let i = 1; i <= leafCount; i++) {
        const t = i / (leafCount + 0.4);
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
        const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
        const tx = 2 * (1 - t) * (cx - sx) + 2 * t * (ex - cx);
        const ty = 2 * (1 - t) * (cy - sy) + 2 * t * (ey - cy);
        const baseAngle = Math.atan2(ty, tx);

        for (const side of [-1, 1]) {
          const leafLen = Math.min(sw, sh) * (0.14 + (1 - Math.abs(t - 0.5)) * 0.12) * scale;
          const leafWid = leafLen * 0.34;
          sCtx.save();
          sCtx.translate(px, py);
          sCtx.rotate(baseAngle + side * (0.68 + (i % 2) * 0.14));
          sCtx.beginPath();
          sCtx.moveTo(0, 0);
          sCtx.quadraticCurveTo(leafLen * 0.45, -leafWid, leafLen, 0);
          sCtx.quadraticCurveTo(leafLen * 0.45, leafWid, 0, 0);
          sCtx.fill();
          sCtx.restore();
        }
      }
    };

    drawBranch(-sw * 0.08, sh * 0.06, sw * 0.34, sh * 0.18, sw * 0.72, sh * 0.52, 6, 1.05);
    drawBranch(-sw * 0.05, sh * 0.44, sw * 0.28, sh * 0.48, sw * 0.58, sh * 0.86, 5, 0.92);
    drawBranch(sw * 0.24, -sh * 0.06, sw * 0.54, sh * 0.16, sw * 0.88, sh * 0.3, 4, 0.82);
    sCtx.restore();
  } else {
    // Graceful coastal palm frond arching across sunlit scene
    sCtx.save();
    sCtx.strokeStyle = '#22201F';
    sCtx.lineWidth = Math.max(4, Math.min(sw, sh) * 0.022);
    sCtx.beginPath();
    sCtx.moveTo(-sw * 0.1, -sh * 0.04);
    sCtx.quadraticCurveTo(sw * 0.42, sh * 0.14, sw * 0.92, sh * 0.64);
    sCtx.stroke();

    const leaflets = 14;
    for (let i = 1; i <= leaflets; i++) {
      const t = i / (leaflets + 1);
      const sx = -sw * 0.1;
      const sy = -sh * 0.04;
      const cx = sw * 0.42;
      const cy = sh * 0.14;
      const ex = sw * 0.92;
      const ey = sh * 0.64;
      const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
      const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
      const tx = 2 * (1 - t) * (cx - sx) + 2 * t * (ex - cx);
      const ty = 2 * (1 - t) * (cy - sy) + 2 * t * (ey - cy);
      const angle = Math.atan2(ty, tx);
      const len = Math.min(sw, sh) * (0.24 + Math.sin(t * Math.PI) * 0.32);
      const wid = Math.min(sw, sh) * 0.028;

      for (const side of [-1, 1]) {
        sCtx.save();
        sCtx.translate(px, py);
        sCtx.rotate(angle + side * 0.96);
        sCtx.beginPath();
        sCtx.moveTo(0, 0);
        sCtx.quadraticCurveTo(len * 0.5, side * wid * 1.4, len, side * wid * 0.6);
        sCtx.quadraticCurveTo(len * 0.48, -side * wid * 0.4, 0, 0);
        sCtx.fill();
        sCtx.restore();
      }
    }
    sCtx.restore();
  }

  sCtx.restore();

  // Composite onto photo using multiply with soft editorial opacity
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = Math.min(0.76, k * 0.72);
  ctx.drawImage(shadowCanvas, 0, 0, w, h);
  ctx.restore();
}

/** 3. Atmospheric Mist / Fog (Ground Fog, Morning Haze, Drifting Alpine) */
function drawAtmosphericMist(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  style: MistStyle,
  tone: MistTone
) {
  const k = intensity / 100;
  if (k <= 0.005) return;

  const baseRgb = tone === 'warm-cream' ? '248, 238, 222' : '226, 234, 240';
  const highRgb = tone === 'warm-cream' ? '255, 248, 236' : '240, 245, 250';

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  if (style === 'ground-fog') {
    // Low-lying valley mist rising smoothly from bottom edge
    const baseGrad = ctx.createLinearGradient(0, h, 0, h * 0.22);
    baseGrad.addColorStop(0, `rgba(${baseRgb}, ${(0.68 * k).toFixed(3)})`);
    baseGrad.addColorStop(0.38, `rgba(${baseRgb}, ${(0.34 * k).toFixed(3)})`);
    baseGrad.addColorStop(0.75, `rgba(${highRgb}, ${(0.1 * k).toFixed(3)})`);
    baseGrad.addColorStop(1, `rgba(${highRgb}, 0)`);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // Organic billowing mist pockets
    const puffs = [
      { x: 0.18, y: 0.88, rx: 0.46, ry: 0.24, a: 0.34 },
      { x: 0.56, y: 0.92, rx: 0.52, ry: 0.28, a: 0.38 },
      { x: 0.86, y: 0.84, rx: 0.42, ry: 0.22, a: 0.3 },
      { x: 0.36, y: 0.72, rx: 0.44, ry: 0.16, a: 0.18 },
    ];
    for (const p of puffs) {
      ctx.save();
      ctx.translate(w * p.x, h * p.y);
      ctx.scale(1, (h * p.ry) / Math.max(1, w * p.rx));
      const r = w * p.rx;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(${highRgb}, ${(p.a * k).toFixed(3)})`);
      g.addColorStop(0.6, `rgba(${baseRgb}, ${(p.a * 0.42 * k).toFixed(3)})`);
      g.addColorStop(1, `rgba(${baseRgb}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (style === 'morning-haze') {
    // Translucent all-over atmospheric veil lifting contrast softly
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(${highRgb}, ${(0.44 * k).toFixed(3)})`);
    grad.addColorStop(0.5, `rgba(${baseRgb}, ${(0.28 * k).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${baseRgb}, ${(0.36 * k).toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle aerial glow near upper center
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.26, 0, w * 0.5, h * 0.26, Math.max(w, h) * 0.72);
    glow.addColorStop(0, `rgba(${highRgb}, ${(0.32 * k).toFixed(3)})`);
    glow.addColorStop(1, `rgba(${highRgb}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Drifting alpine fog bands crossing mid-frame
    const bands = [
      { x: 0.24, y: 0.46, rx: 0.62, ry: 0.14, a: 0.36 },
      { x: 0.74, y: 0.56, rx: 0.6, ry: 0.16, a: 0.34 },
      { x: 0.48, y: 0.68, rx: 0.68, ry: 0.15, a: 0.26 },
      { x: 0.16, y: 0.32, rx: 0.46, ry: 0.12, a: 0.2 },
    ];
    for (const b of bands) {
      ctx.save();
      ctx.translate(w * b.x, h * b.y);
      ctx.scale(1, (h * b.ry) / Math.max(1, w * b.rx));
      const r = w * b.rx;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(${highRgb}, ${(b.a * k).toFixed(3)})`);
      g.addColorStop(0.55, `rgba(${baseRgb}, ${(b.a * 0.45 * k).toFixed(3)})`);
      g.addColorStop(1, `rgba(${baseRgb}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

/** 4. Sun Rays / Diagonal Tyndall God Rays */
function drawSunRays(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  direction: SunRaysDirection,
  tone: SunRaysTone
) {
  const k = intensity / 100;
  if (k <= 0.005) return;

  const coreRgb = tone === 'golden' ? '255, 224, 168' : '255, 250, 238';
  const warmRgb = tone === 'golden' ? '245, 178, 96' : '236, 240, 246';

  const originX =
    direction === 'top-left'
      ? -w * 0.08
      : direction === 'top-right'
        ? w * 1.08
        : w * 0.5;
  const originY = -h * 0.14;
  const maxDist = Math.hypot(w, h) * 1.28;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Soft overhead solar bloom at the ray origin
  const bloomR = Math.max(w, h) * 0.72;
  const bloom = ctx.createRadialGradient(originX, originY, 0, originX, originY, bloomR);
  bloom.addColorStop(0, `rgba(${coreRgb}, ${(0.56 * k).toFixed(3)})`);
  bloom.addColorStop(0.42, `rgba(${warmRgb}, ${(0.22 * k).toFixed(3)})`);
  bloom.addColorStop(1, `rgba(${warmRgb}, 0)`);
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  // Volumetric shaft cones radiating through natural haze
  const baseAngles =
    direction === 'top-left'
      ? [0.42, 0.58, 0.73, 0.89, 1.06, 1.24]
      : direction === 'top-right'
        ? [Math.PI - 1.24, Math.PI - 1.06, Math.PI - 0.89, Math.PI - 0.73, Math.PI - 0.58, Math.PI - 0.42]
        : [1.14, 1.3, 1.46, 1.62, 1.78, 1.96];

  const widths = [0.065, 0.11, 0.055, 0.125, 0.07, 0.09];
  const alphas = [0.22, 0.34, 0.18, 0.3, 0.2, 0.24];

  for (let i = 0; i < baseAngles.length; i++) {
    const angle = baseAngles[i];
    const halfSpread = widths[i] * 0.5;
    const alpha = alphas[i] * k;

    const x1 = originX + Math.cos(angle - halfSpread) * maxDist;
    const y1 = originY + Math.sin(angle - halfSpread) * maxDist;
    const x2 = originX + Math.cos(angle + halfSpread) * maxDist;
    const y2 = originY + Math.sin(angle + halfSpread) * maxDist;

    // Soft radial fade along shaft length
    const midX = (x1 + x2) * 0.5;
    const midY = (y1 + y2) * 0.5;
    const shaftGrad = ctx.createLinearGradient(originX, originY, midX, midY);
    shaftGrad.addColorStop(0, `rgba(${coreRgb}, ${(alpha * 1.15).toFixed(3)})`);
    shaftGrad.addColorStop(0.45, `rgba(${warmRgb}, ${(alpha * 0.58).toFixed(3)})`);
    shaftGrad.addColorStop(0.85, `rgba(${warmRgb}, ${(alpha * 0.12).toFixed(3)})`);
    shaftGrad.addColorStop(1, `rgba(${warmRgb}, 0)`);

    ctx.save();
    ctx.filter = `blur(${Math.max(8, Math.min(w, h) * 0.025).toFixed(1)}px)`;
    ctx.fillStyle = shaftGrad;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/** 5. Backlight Sun Halo & Subtle Optical Lens Rings */
function drawSunHalo(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  position: SunHaloPosition
) {
  const k = intensity / 100;
  if (k <= 0.005) return;

  const sx =
    position === 'top-left'
      ? w * 0.08
      : position === 'top-right'
        ? w * 0.92
        : position === 'edge-left'
          ? -w * 0.02
          : w * 1.02;
  const sy =
    position === 'top-left' || position === 'top-right' ? h * 0.08 : h * 0.42;

  const diag = Math.hypot(w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Primary luminous solar core
  const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, diag * 0.56);
  core.addColorStop(0, `rgba(255, 246, 224, ${(0.74 * k).toFixed(3)})`);
  core.addColorStop(0.18, `rgba(255, 206, 132, ${(0.52 * k).toFixed(3)})`);
  core.addColorStop(0.48, `rgba(244, 152, 82, ${(0.22 * k).toFixed(3)})`);
  core.addColorStop(0.82, `rgba(220, 120, 74, ${(0.06 * k).toFixed(3)})`);
  core.addColorStop(1, 'rgba(220, 120, 74, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  // Subtle multi-coated optical ghost elements along axis through frame center
  const cx = w * 0.5;
  const cy = h * 0.5;
  const dx = cx - sx;
  const dy = cy - sy;

  const ghosts = [
    { t: 0.62, r: diag * 0.085, color: '255, 214, 156', a: 0.14, ring: false },
    { t: 1.18, r: diag * 0.055, color: '176, 212, 232', a: 0.12, ring: true },
    { t: 1.56, r: diag * 0.11, color: '248, 178, 124', a: 0.11, ring: true },
  ];

  for (const g of ghosts) {
    const gx = sx + dx * g.t;
    const gy = sy + dy * g.t;
    const rad = ctx.createRadialGradient(gx, gy, g.ring ? g.r * 0.58 : 0, gx, gy, g.r);
    if (g.ring) {
      rad.addColorStop(0, `rgba(${g.color}, 0)`);
      rad.addColorStop(0.76, `rgba(${g.color}, ${(g.a * k).toFixed(3)})`);
      rad.addColorStop(0.92, `rgba(${g.color}, ${(g.a * 1.45 * k).toFixed(3)})`);
      rad.addColorStop(1, `rgba(${g.color}, 0)`);
    } else {
      rad.addColorStop(0, `rgba(${g.color}, ${(g.a * k).toFixed(3)})`);
      rad.addColorStop(1, `rgba(${g.color}, 0)`);
    }
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(gx, gy, g.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** 6. Analog 35mm Light Leak */
function drawLightLeak(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  style: LightLeakStyle,
  seed: number
) {
  const k = intensity / 100;
  if (k <= 0.005) return;

  const flip = seed % 2 === 0;
  ctx.save();
  if (flip) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.globalCompositeOperation = 'screen';

  const drawGlow = (
    nx: number,
    ny: number,
    rx: number,
    ry: number,
    stops: [number, string][]
  ) => {
    ctx.save();
    ctx.translate(w * nx, h * ny);
    ctx.scale(1, (h * ry) / Math.max(1, w * rx));
    const r = w * rx;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    for (const [pos, col] of stops) g.addColorStop(pos, col);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  if (style === 'side-amber') {
    drawGlow(0.02, 0.44, 0.44, 0.72, [
      [0, `rgba(255, 224, 150, ${(0.72 * k).toFixed(3)})`],
      [0.32, `rgba(248, 128, 48, ${(0.58 * k).toFixed(3)})`],
      [0.68, `rgba(210, 56, 36, ${(0.24 * k).toFixed(3)})`],
      [1, 'rgba(180, 36, 24, 0)'],
    ]);
    drawGlow(0.14, 0.76, 0.36, 0.42, [
      [0, `rgba(255, 168, 86, ${(0.44 * k).toFixed(3)})`],
      [0.6, `rgba(220, 74, 42, ${(0.18 * k).toFixed(3)})`],
      [1, 'rgba(220, 74, 42, 0)'],
    ]);
  } else if (style === 'corner-crimson') {
    drawGlow(0.96, 0.08, 0.56, 0.54, [
      [0, `rgba(255, 210, 140, ${(0.76 * k).toFixed(3)})`],
      [0.34, `rgba(236, 76, 52, ${(0.56 * k).toFixed(3)})`],
      [0.72, `rgba(176, 26, 48, ${(0.24 * k).toFixed(3)})`],
      [1, 'rgba(140, 18, 36, 0)'],
    ]);
    drawGlow(0.84, 0.28, 0.34, 0.42, [
      [0, `rgba(255, 134, 68, ${(0.38 * k).toFixed(3)})`],
      [1, 'rgba(200, 40, 36, 0)'],
    ]);
  } else if (style === 'double-burn') {
    drawGlow(0.0, 0.25, 0.38, 0.58, [
      [0, `rgba(255, 188, 92, ${(0.64 * k).toFixed(3)})`],
      [0.45, `rgba(232, 74, 38, ${(0.4 * k).toFixed(3)})`],
      [1, 'rgba(200, 32, 24, 0)'],
    ]);
    drawGlow(1.0, 0.78, 0.44, 0.52, [
      [0, `rgba(255, 224, 148, ${(0.62 * k).toFixed(3)})`],
      [0.45, `rgba(240, 108, 52, ${(0.36 * k).toFixed(3)})`],
      [1, 'rgba(210, 52, 34, 0)'],
    ]);
  } else if (style === 'sun-streak') {
    // Vertical 35mm camera back-door hinge leak band
    const xPos = w * (0.2 + ((seed * 17) % 10) * 0.025);
    const bandW = w * 0.26;
    const g = ctx.createLinearGradient(xPos - bandW, 0, xPos + bandW, 0);
    g.addColorStop(0, 'rgba(210, 52, 24, 0)');
    g.addColorStop(0.28, `rgba(232, 82, 34, ${(0.34 * k).toFixed(3)})`);
    g.addColorStop(0.5, `rgba(255, 214, 138, ${(0.68 * k).toFixed(3)})`);
    g.addColorStop(0.72, `rgba(244, 118, 46, ${(0.38 * k).toFixed(3)})`);
    g.addColorStop(1, 'rgba(200, 44, 24, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Prism-spectrum editorial glass leak (warm gold -> rose -> soft cyan)
    drawGlow(0.08, 0.14, 0.52, 0.44, [
      [0, `rgba(255, 232, 168, ${(0.64 * k).toFixed(3)})`],
      [0.4, `rgba(242, 128, 134, ${(0.38 * k).toFixed(3)})`],
      [0.72, `rgba(148, 178, 236, ${(0.2 * k).toFixed(3)})`],
      [1, 'rgba(110, 160, 230, 0)'],
    ]);
    drawGlow(0.88, 0.86, 0.46, 0.42, [
      [0, `rgba(164, 212, 244, ${(0.44 * k).toFixed(3)})`],
      [0.48, `rgba(214, 146, 198, ${(0.26 * k).toFixed(3)})`],
      [1, 'rgba(214, 146, 198, 0)'],
    ]);
  }

  ctx.restore();
}

/** 7. Anamorphic Horizontal Cinema Streaks on Real Bright Peaks */
function drawAnamorphicStreaks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  tone: AnamorphicTone,
  peaks: SpecularPeak[]
) {
  const k = intensity / 100;
  if (k <= 0.005 || peaks.length === 0) return;

  const primaryRgb =
    tone === 'cinema-blue'
      ? '116, 186, 255'
      : tone === 'amber-gold'
        ? '255, 192, 108'
        : '242, 246, 255';
  const coreRgb =
    tone === 'cinema-blue'
      ? '216, 238, 255'
      : tone === 'amber-gold'
        ? '255, 238, 198'
        : '255, 255, 255';

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (const p of peaks) {
    const px = p.nx * w;
    const py = p.ny * h;
    const amp = (0.32 + p.strength * 0.68) * k;
    const halfLen = w * (0.28 + p.strength * 0.48) * (0.65 + k * 0.45);
    const thick = Math.max(1.5, Math.min(w, h) * (0.0055 + p.strength * 0.005));

    // Wide feathered anamorphic streak
    const hGrad = ctx.createLinearGradient(px - halfLen, py, px + halfLen, py);
    hGrad.addColorStop(0, `rgba(${primaryRgb}, 0)`);
    hGrad.addColorStop(0.28, `rgba(${primaryRgb}, ${(0.22 * amp).toFixed(3)})`);
    hGrad.addColorStop(0.47, `rgba(${coreRgb}, ${(0.64 * amp).toFixed(3)})`);
    hGrad.addColorStop(0.5, `rgba(${coreRgb}, ${(0.88 * amp).toFixed(3)})`);
    hGrad.addColorStop(0.53, `rgba(${coreRgb}, ${(0.64 * amp).toFixed(3)})`);
    hGrad.addColorStop(0.72, `rgba(${primaryRgb}, ${(0.22 * amp).toFixed(3)})`);
    hGrad.addColorStop(1, `rgba(${primaryRgb}, 0)`);

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, thick / Math.max(1, halfLen * 0.08));
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen, Math.max(1.5, halfLen * 0.032), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Razor thin bright core filament
    ctx.strokeStyle = hGrad;
    ctx.lineWidth = Math.max(1, thick * 0.34);
    ctx.beginPath();
    ctx.moveTo(px - halfLen * 0.92, py);
    ctx.lineTo(px + halfLen * 0.92, py);
    ctx.stroke();

    // Soft elliptical halo glow around the source
    const haloR = Math.min(w, h) * (0.045 + p.strength * 0.04);
    const halo = ctx.createRadialGradient(px, py, 0, px, py, haloR);
    halo.addColorStop(0, `rgba(${coreRgb}, ${(0.52 * amp).toFixed(3)})`);
    halo.addColorStop(0.5, `rgba(${primaryRgb}, ${(0.18 * amp).toFixed(3)})`);
    halo.addColorStop(1, `rgba(${primaryRgb}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, haloR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** 8. Optical Light Glint (4-Point / 6-Point Star Cross Filter on Real Specular Peaks) */
function drawLightGlints(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  angleMode: LightGlintAngle,
  peaks: SpecularPeak[]
) {
  const k = intensity / 100;
  if (k <= 0.005 || peaks.length === 0) return;

  const minSide = Math.min(w, h);
  const angles =
    angleMode === 'cross-45'
      ? [Math.PI * 0.25, Math.PI * 0.75]
      : angleMode === 'cross-0'
        ? [0, Math.PI * 0.5]
        : [0, Math.PI / 3, (2 * Math.PI) / 3];

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (const p of peaks) {
    const px = p.nx * w;
    const py = p.ny * h;
    const amp = (0.38 + p.strength * 0.62) * k;
    const armLen = minSide * (0.045 + p.strength * 0.075) * (0.65 + k * 0.5);

    // Subtle tint sampled from the actual specular highlight pixel
    const tr = Math.round(215 + p.r * 0.15);
    const tg = Math.round(212 + p.g * 0.16);
    const tb = Math.round(205 + p.b * 0.18);

    for (const ang of angles) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      const grad = ctx.createLinearGradient(-armLen, 0, armLen, 0);
      grad.addColorStop(0, `rgba(${tr},${tg},${tb},0)`);
      grad.addColorStop(0.35, `rgba(${tr},${tg},${tb},${(0.32 * amp).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(255,255,255,${(0.92 * amp).toFixed(3)})`);
      grad.addColorStop(0.65, `rgba(${tr},${tg},${tb},${(0.32 * amp).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1, minSide * 0.0022);
      ctx.beginPath();
      ctx.moveTo(-armLen, 0);
      ctx.lineTo(armLen, 0);
      ctx.stroke();

      // Secondary softer sheen along star arm
      ctx.lineWidth = Math.max(2, minSide * 0.0055);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(-armLen * 0.72, 0);
      ctx.lineTo(armLen * 0.72, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Pinpoint jewel center glow
    const cR = Math.max(2, minSide * 0.014 * (0.7 + p.strength * 0.6));
    const core = ctx.createRadialGradient(px, py, 0, px, py, cR);
    core.addColorStop(0, `rgba(255,255,255,${(0.85 * amp).toFixed(3)})`);
    core.addColorStop(0.5, `rgba(${tr},${tg},${tb},${(0.28 * amp).toFixed(3)})`);
    core.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(px, py, cR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** 9. Atmosphere Particles: Floating Sun Motes, Soft Rain, or Rainy Glass Dew */
function drawAtmosphereParticles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  mode: AtmosphereParticleMode,
  seed: number
) {
  const k = intensity / 100;
  if (k <= 0.005) return;

  const minSide = Math.min(w, h);
  const rng = createRng(seed * 73 + (mode === 'sun-motes' ? 11 : mode === 'soft-rain' ? 29 : 47));

  ctx.save();

  if (mode === 'sun-motes') {
    ctx.globalCompositeOperation = 'screen';
    const count = Math.round(32 + k * 75);
    for (let i = 0; i < count; i++) {
      const x = rng() * w;
      // Slightly biased toward upper two-thirds where sunlight catches dust
      const y = Math.pow(rng(), 0.85) * h;
      const depth = rng(); // 0 = sharp tiny speck, 1 = soft foreground bokeh mote
      const radius = minSide * (0.0018 + depth * depth * 0.014);
      const alpha = (0.14 + (1 - depth * 0.5) * 0.45) * k;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(255, 244, 218, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.45, `rgba(255, 222, 168, ${(alpha * 0.55).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(255, 210, 150, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mode === 'soft-rain') {
    ctx.globalCompositeOperation = 'screen';
    const streaks = Math.round(70 + k * 170);
    const windAngle = 0.16; // gentle diagonal slant
    for (let i = 0; i < streaks; i++) {
      const x = rng() * w * 1.15 - w * 0.08;
      const y = rng() * h;
      const layer = rng(); // 0 = distant fine rain, 1 = close larger streak
      const len = minSide * (0.032 + layer * 0.078);
      const lw = Math.max(0.65, minSide * (0.0007 + layer * 0.0015));
      const alpha = (0.08 + layer * 0.24) * k;

      const x2 = x - Math.sin(windAngle) * len;
      const y2 = y + Math.cos(windAngle) * len;

      const grad = ctx.createLinearGradient(x, y, x2, y2);
      grad.addColorStop(0, 'rgba(225, 236, 246, 0)');
      grad.addColorStop(0.55, `rgba(225, 236, 246, ${alpha.toFixed(3)})`);
      grad.addColorStop(1, `rgba(245, 250, 255, ${(alpha * 0.45).toFixed(3)})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  } else {
    // Translucent glass dew droplets with subtle shadow base + top-left highlight crescent
    const drops = Math.round(28 + k * 68);
    for (let i = 0; i < drops; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = minSide * (0.003 + Math.pow(rng(), 2) * 0.015);
      const squashY = 1 + rng() * 0.28;
      const alpha = (0.24 + rng() * 0.36) * k;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, squashY);

      // Soft bottom contact shadow
      ctx.fillStyle = `rgba(18, 22, 28, ${(alpha * 0.42).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(r * 0.14, r * 0.22, r * 1.04, 0, Math.PI * 2);
      ctx.fill();

      // Translucent dew body
      const body = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r);
      body.addColorStop(0, `rgba(255, 255, 255, ${(alpha * 0.72).toFixed(3)})`);
      body.addColorStop(0.55, `rgba(230, 240, 248, ${(alpha * 0.22).toFixed(3)})`);
      body.addColorStop(0.88, `rgba(255, 255, 255, ${(alpha * 0.42).toFixed(3)})`);
      body.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Crisp specular highlight pinpoint
      ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.32, Math.max(0.8, r * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

/** 10. Analog Film Dust, Hairs & Micro-Scratches */
function drawFilmDust(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  style: FilmDustStyle,
  seed: number
) {
  const k = intensity / 100;
  if (k <= 0.005) return;

  const minSide = Math.min(w, h);
  const rng = createRng(seed * 97 + (style === 'subtle-scan' ? 3 : style === 'dust-hairs' ? 19 : 41));

  ctx.save();

  // Micro mineral dust specks (bright white/cream film negative dust)
  const speckCount = Math.round((style === 'subtle-scan' ? 45 : 85) * (0.45 + k * 0.9));
  for (let i = 0; i < speckCount; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = Math.max(0.55, minSide * (0.00055 + Math.pow(rng(), 3) * 0.0028));
    const isBright = rng() > 0.16;
    const alpha = (0.18 + rng() * 0.56) * k;

    ctx.fillStyle = isBright
      ? `rgba(246, 242, 234, ${alpha.toFixed(3)})`
      : `rgba(24, 22, 20, ${(alpha * 0.52).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rng() * 0.7), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Organic curled darkroom fibers / lint hairs
  const hairCount =
    style === 'subtle-scan'
      ? Math.round(3 + k * 5)
      : style === 'dust-hairs'
        ? Math.round(8 + k * 14)
        : Math.round(6 + k * 10);

  ctx.lineCap = 'round';
  for (let i = 0; i < hairCount; i++) {
    const sx = rng() * w;
    const sy = rng() * h;
    const len = minSide * (0.012 + rng() * 0.038);
    const angle = rng() * Math.PI * 2;
    const ex = sx + Math.cos(angle) * len;
    const ey = sy + Math.sin(angle) * len;
    const cx = (sx + ex) * 0.5 + (rng() - 0.5) * len * 0.9;
    const cy = (sy + ey) * 0.5 + (rng() - 0.5) * len * 0.9;
    const alpha = (0.22 + rng() * 0.48) * k;

    ctx.strokeStyle = `rgba(245, 240, 232, ${alpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(0.6, minSide * 0.0011);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }

  // Vertical 35mm transport emulsion scratches
  if (style === 'vintage-scratches') {
    const scratchCount = Math.round(3 + k * 6);
    for (let i = 0; i < scratchCount; i++) {
      const x = (0.06 + rng() * 0.88) * w;
      const y1 = rng() * h * 0.35;
      const y2 = y1 + h * (0.35 + rng() * 0.65);
      const alpha = (0.14 + rng() * 0.34) * k;

      const grad = ctx.createLinearGradient(x, y1, x, y2);
      grad.addColorStop(0, 'rgba(244, 238, 228, 0)');
      grad.addColorStop(0.25, `rgba(244, 238, 228, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.75, `rgba(244, 238, 228, ${(alpha * 0.8).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(244, 238, 228, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(0.7, minSide * (0.0008 + rng() * 0.0009));
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x + (rng() - 0.5) * 2.5, y2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** 11. Authentic 90s Quartz LED Film Camera Date Stamp */
function drawDateStamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: StillEffectsConfig['dateStamp']
) {
  if (!config.enabled) return;

  const text = (config.customText || config.autoExifText || format90sDateStamp()).trim();
  if (!text) return;

  const minSide = Math.min(w, h);
  const fontSize = Math.max(12, Math.round(minSide * 0.036));
  const padX = Math.round(minSide * 0.048);
  const padY = Math.round(minSide * 0.042);

  let x = w - padX;
  let y = h - padY;
  let align: CanvasTextAlign = 'right';
  let baseline: CanvasTextBaseline = 'bottom';

  if (config.position === 'bottom-left') {
    x = padX;
    y = h - padY;
    align = 'left';
    baseline = 'bottom';
  } else if (config.position === 'top-right') {
    x = w - padX;
    y = padY;
    align = 'right';
    baseline = 'top';
  }

  const palette =
    config.style === 'amber-led'
      ? { glow: 'rgba(255, 88, 20, 0.92)', mid: 'rgba(255, 138, 42, 0.96)', core: 'rgba(255, 224, 154, 0.92)' }
      : config.style === 'crimson-90s'
        ? { glow: 'rgba(235, 36, 24, 0.92)', mid: 'rgba(255, 78, 52, 0.95)', core: 'rgba(255, 196, 174, 0.9)' }
        : { glow: 'rgba(248, 244, 236, 0.55)', mid: 'rgba(244, 240, 232, 0.9)', core: 'rgba(255, 255, 255, 0.95)' };

  ctx.save();
  ctx.font = `600 ${fontSize}px "JetBrains Mono", "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  // Pass 1: Wide emulsion halation bleed
  ctx.globalCompositeOperation = 'screen';
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = Math.max(8, Math.round(fontSize * 0.58));
  ctx.fillStyle = palette.glow;
  ctx.fillText(text, x, y);

  // Pass 2: Medium LED phosphor glow
  ctx.shadowColor = palette.mid;
  ctx.shadowBlur = Math.max(3, Math.round(fontSize * 0.22));
  ctx.fillStyle = palette.mid;
  ctx.fillText(text, x, y);

  // Pass 3: Crisp luminous filament center
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.core;
  ctx.fillText(text, x, y);

  ctx.restore();
}

/**
 * Master STILL. Effects Compositor:
 * Applies all active optical, analog, and natural atmosphere effects in physically accurate order:
 * 1. Lens Falloff Blur -> 2. Shadow Play (Gobo) -> 3. Atmospheric Mist -> 4. Sun Rays ->
 * 5. Backlight Sun Halo -> 6. Analog Light Leak -> 7. Anamorphic Streaks & Light Glints ->
 * 8. Atmosphere Particles (Motes/Rain/Dew) -> 9. Film Dust & Scratches -> 10. 90s Date Stamp
 */
export function applyStillEffectsToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  effects?: StillEffectsConfig | null
): void {
  if (!effects || !hasActiveStillEffects(effects) || w <= 0 || h <= 0) return;

  // 1. Optical Lens Falloff / Tilt-Shift
  if (effects.lensBlur.intensity > 0) {
    drawLensBlur(ctx, w, h, effects.lensBlur.intensity, effects.lensBlur.style);
  }

  // 2. Natural Shadow Play (Gobo shadows fall directly onto the graded scene)
  if (effects.shadowPlay.intensity > 0) {
    drawShadowPlay(
      ctx,
      w,
      h,
      effects.shadowPlay.intensity,
      effects.shadowPlay.pattern,
      effects.shadowPlay.direction
    );
  }

  // 3. Detect specular peaks BEFORE light leaks/mist wash out highlights
  const needsPeaks =
    effects.anamorphic.intensity > 0 || effects.lightGlint.intensity > 0;
  const peaks = needsPeaks
    ? detectSpecularPeaks(
        ctx.canvas,
        effects.lightGlint.intensity > 0 && effects.anamorphic.intensity === 0 ? 0.84 : 0.78,
        8
      )
    : [];

  // 4. Atmospheric Mist / Morning Haze
  if (effects.mist.intensity > 0) {
    drawAtmosphericMist(ctx, w, h, effects.mist.intensity, effects.mist.style, effects.mist.tone);
  }

  // 5. Volumetric Sun Rays
  if (effects.sunRays.intensity > 0) {
    drawSunRays(ctx, w, h, effects.sunRays.intensity, effects.sunRays.direction, effects.sunRays.tone);
  }

  // 6. Backlight Sun Halo & Optical Ghost Rings
  if (effects.sunHalo.intensity > 0) {
    drawSunHalo(ctx, w, h, effects.sunHalo.intensity, effects.sunHalo.position);
  }

  // 7. Analog 35mm Light Leak
  if (effects.lightLeak.intensity > 0) {
    drawLightLeak(
      ctx,
      w,
      h,
      effects.lightLeak.intensity,
      effects.lightLeak.style,
      effects.lightLeak.seed
    );
  }

  // 8. Anamorphic Horizontal Streaks (anchored on real light sources)
  if (effects.anamorphic.intensity > 0) {
    drawAnamorphicStreaks(ctx, w, h, effects.anamorphic.intensity, effects.anamorphic.tone, peaks);
  }

  // 9. Optical 4-Point / 6-Point Light Glints (anchored on real specular sparkles)
  if (effects.lightGlint.intensity > 0) {
    drawLightGlints(ctx, w, h, effects.lightGlint.intensity, effects.lightGlint.angle, peaks);
  }

  // 10. Living Natural Particles (Sun Motes, Soft Rain, Glass Dew)
  if (effects.atmosphereParticles.intensity > 0) {
    drawAtmosphereParticles(
      ctx,
      w,
      h,
      effects.atmosphereParticles.intensity,
      effects.atmosphereParticles.mode,
      effects.atmosphereParticles.seed
    );
  }

  // 11. Darkroom Film Dust, Hairs & Micro-Scratches
  if (effects.filmDust.intensity > 0) {
    drawFilmDust(
      ctx,
      w,
      h,
      effects.filmDust.intensity,
      effects.filmDust.style,
      effects.filmDust.seed
    );
  }

  // 12. 90s Quartz LED Date Stamp (burned onto the emulsion top layer)
  if (effects.dateStamp.enabled) {
    drawDateStamp(ctx, w, h, effects.dateStamp);
  }
}
