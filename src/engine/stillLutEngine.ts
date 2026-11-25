export interface ParsedCubeLut {
  id: string;
  name: string;
  size: number;
  /** RGB triplets in 0..1, length = size * size * size * 3 (R fastest, then G, then B) */
  data: Float32Array;
  createdAt: string;
}

/**
 * Parses a standard Adobe / DaVinci Resolve 3D .CUBE LUT file.
 */
export function parseCubeLut(
  cubeText: string,
  fallbackName: string
): ParsedCubeLut {
  const lines = cubeText.split(/\r?\n/);
  let title = fallbackName.replace(/\.cube$/i, '').trim() || 'Imported LUT';
  let size = 0;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  const values: number[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('TITLE')) {
      const match = line.match(/TITLE\s+"([^"]+)"/i);
      if (match?.[1]) title = match[1].trim();
      continue;
    }
    if (line.startsWith('LUT_3D_SIZE')) {
      const parts = line.split(/\s+/);
      const parsed = Number.parseInt(parts[1] ?? '0', 10);
      if (Number.isFinite(parsed) && parsed >= 2 && parsed <= 65) {
        size = parsed;
      }
      continue;
    }
    if (line.startsWith('DOMAIN_MIN')) {
      const p = line.split(/\s+/).slice(1).map(Number);
      if (p.length >= 3 && p.every(Number.isFinite)) {
        domainMin = [p[0], p[1], p[2]];
      }
      continue;
    }
    if (line.startsWith('DOMAIN_MAX')) {
      const p = line.split(/\s+/).slice(1).map(Number);
      if (p.length >= 3 && p.every(Number.isFinite)) {
        domainMax = [p[0], p[1], p[2]];
      }
      continue;
    }
    if (/^[A-Z_]+/.test(line)) {
      // Skip other header metadata (e.g. LUT_1D_SIZE, etc.)
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      const r = Number.parseFloat(parts[0]);
      const g = Number.parseFloat(parts[1]);
      const b = Number.parseFloat(parts[2]);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        const normR =
          (r - domainMin[0]) / Math.max(0.0001, domainMax[0] - domainMin[0]);
        const normG =
          (g - domainMin[1]) / Math.max(0.0001, domainMax[1] - domainMin[1]);
        const normB =
          (b - domainMin[2]) / Math.max(0.0001, domainMax[2] - domainMin[2]);
        values.push(
          Math.max(0, Math.min(1, normR)),
          Math.max(0, Math.min(1, normG)),
          Math.max(0, Math.min(1, normB))
        );
      }
    }
  }

  if (size === 0) {
    const inferred = Math.round(Math.cbrt(values.length / 3));
    if (inferred >= 2 && inferred * inferred * inferred * 3 === values.length) {
      size = inferred;
    }
  }

  const expected = size * size * size * 3;
  if (size < 2 || values.length < expected) {
    throw new Error('Invalid or unsupported 3D .CUBE file format.');
  }

  return {
    id: `lut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: title,
    size,
    data: new Float32Array(values.slice(0, expected)),
    createdAt: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  };
}

/**
 * Packs a 3D LUT (R fastest, G middle, B slowest) into a 2D RGBA8 strip texture
 * of width (size * size) and height (size) for fast WebGL fragment shader sampling.
 */
export function createLutTexturePixels(lut: ParsedCubeLut): {
  width: number;
  height: number;
  pixels: Uint8Array;
  size: number;
} {
  const s = lut.size;
  const width = s * s;
  const height = s;
  const pixels = new Uint8Array(width * height * 4);

  for (let b = 0; b < s; b++) {
    for (let g = 0; g < s; g++) {
      for (let r = 0; r < s; r++) {
        const lutIdx = (b * s * s + g * s + r) * 3;
        const x = b * s + r;
        const y = g;
        const texIdx = (y * width + x) * 4;
        pixels[texIdx] = Math.round(lut.data[lutIdx] * 255);
        pixels[texIdx + 1] = Math.round(lut.data[lutIdx + 1] * 255);
        pixels[texIdx + 2] = Math.round(lut.data[lutIdx + 2] * 255);
        pixels[texIdx + 3] = 255;
      }
    }
  }

  return { width, height, pixels, size: s };
}

/**
 * Trilinear interpolation of an RGB color through a 3D LUT (used for CPU fallback & chaining).
 */
export function sampleLut3D(
  lut: ParsedCubeLut,
  r: number,
  g: number,
  b: number
): [number, number, number] {
  const s = lut.size;
  const maxIdx = s - 1;

  const cr = Math.max(0, Math.min(1, r)) * maxIdx;
  const cg = Math.max(0, Math.min(1, g)) * maxIdx;
  const cb = Math.max(0, Math.min(1, b)) * maxIdx;

  const r0 = Math.floor(cr);
  const g0 = Math.floor(cg);
  const b0 = Math.floor(cb);
  const r1 = Math.min(maxIdx, r0 + 1);
  const g1 = Math.min(maxIdx, g0 + 1);
  const b1 = Math.min(maxIdx, b0 + 1);

  const fr = cr - r0;
  const fg = cg - g0;
  const fb = cb - b0;

  const get = (ri: number, gi: number, bi: number, ch: number) =>
    lut.data[(bi * s * s + gi * s + ri) * 3 + ch];

  const out: [number, number, number] = [0, 0, 0];
  for (let ch = 0; ch < 3; ch++) {
    const c000 = get(r0, g0, b0, ch);
    const c100 = get(r1, g0, b0, ch);
    const c010 = get(r0, g1, b0, ch);
    const c110 = get(r1, g1, b0, ch);
    const c001 = get(r0, g0, b1, ch);
    const c101 = get(r1, g0, b1, ch);
    const c011 = get(r0, g1, b1, ch);
    const c111 = get(r1, g1, b1, ch);

    const c00 = c000 + (c100 - c000) * fr;
    const c10 = c010 + (c110 - c010) * fr;
    const c01 = c001 + (c101 - c001) * fr;
    const c11 = c011 + (c111 - c011) * fr;

    const c0 = c00 + (c10 - c00) * fg;
    const c1 = c01 + (c11 - c01) * fg;

    out[ch] = c0 + (c1 - c0) * fb;
  }
  return out;
}

/**
 * Generates a standard 17x17x17 (or custom size) Adobe/DaVinci .CUBE 3D LUT text file
 * from any pixel-grading function so STILL. presets & custom recipes can be exported
 * directly into Lightroom, DaVinci Resolve, Premiere, or CapCut.
 */
export function exportRecipeToCubeLut(
  title: string,
  evaluatePixel: (r: number, g: number, b: number) => [number, number, number],
  size = 17
): string {
  const safeTitle = title.replace(/"/g, '').trim() || 'STILL Editorial Grade';
  const lines: string[] = [
    '# Generated by STILL. — The Editorial Color Studio',
    `TITLE "${safeTitle}"`,
    `LUT_3D_SIZE ${size}`,
    'DOMAIN_MIN 0.0 0.0 0.0',
    'DOMAIN_MAX 1.0 1.0 1.0',
    '',
  ];

  const denom = size - 1;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const [or, og, ob] = evaluatePixel(r / denom, g / denom, b / denom);
        lines.push(
          `${or.toFixed(6)} ${og.toFixed(6)} ${ob.toFixed(6)}`
        );
      }
    }
  }

  return lines.join('\n');
}
