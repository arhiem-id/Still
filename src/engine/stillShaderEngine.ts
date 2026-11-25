import {
  createLutTexturePixels,
  ParsedCubeLut,
  sampleLut3D,
} from './stillLutEngine';
import {
  applyStillEffectsToCanvas,
  StillEffectsConfig,
} from './stillEffectsEngine';

/**
 * Full per-pixel optical & film grading uniforms passed to STILL.'s WebGL shader
 * and its mathematical CPU twin (for .CUBE 3D LUT export & fallback rendering).
 */
export interface ShaderGradingParams {
  // Core filmic tone curve
  exposure: number; // EV stops (-1.2 .. +1.2)
  contrast: number; // (-0.6 .. +0.7)
  highlights: number; // (-0.8 .. +0.6)
  shadows: number; // (-0.6 .. +0.8)
  fade: number; // (0 .. 0.25) lifted analog matte black toe
  /** 5-point Master RGB Tone Curve Y values at X = [0, 0.25, 0.5, 0.75, 1.0] */
  toneCurve: [number, number, number, number, number];

  // Global color & film chemistry
  temperature: number; // (-0.6 .. +0.6) blue <-> amber
  tint: number; // (-0.5 .. +0.5) green <-> magenta
  saturation: number; // (-1.0 .. +0.8)
  vibrance: number; // (-0.6 .. +0.7)
  grayscale: number; // (0 .. 1)
  sepia: number; // (0 .. 1)
  bleachBypass: number; // (0 .. 1) silver-retention metallic high-contrast look
  crossProcess: number; // (0 .. 1) analog C-41/E-6 channel crossover
  skinProtect: number; // (0 .. 1) shields warm skin tones from extreme shifts

  // 6-Band Selective HSL: [Red, Orange, Yellow, Green, Cyan, Blue]
  hslHue: [number, number, number, number, number, number]; // -1..1 (scaled to ±45° or ±120° for signature IR)
  hslSat: [number, number, number, number, number, number]; // -1..1
  hslLum: [number, number, number, number, number, number]; // -1..1
  /** When > 0, shifts foliage greens toward crimson/rose like Kodak Aerochrome IR */
  infraredShift: number; // 0..1

  // 3-Way Luminance-Masked Split Toning (true per-pixel!)
  shadowTint: [number, number, number]; // RGB 0..1
  shadowTintStrength: number; // 0..0.65
  midtoneTint: [number, number, number]; // RGB 0..1
  midtoneTintStrength: number; // 0..0.55
  highlightTint: [number, number, number]; // RGB 0..1
  highlightTintStrength: number; // 0..0.65

  // Optical restore, lens, micro-detail & analog emulsion physics
  deblur: number; // 0..1.0 (multi-radius anti-halo optical focus recovery)
  denoise: number; // 0..1.0 (edge-preserving bilateral noise reduction)
  clarity: number; // -0.6..1.0 (local midtone micro-contrast / editorial texture)
  sharpen: number; // 0..1.0 (optical unsharp mask micro-detail)
  chromaticAberration: number; // 0..1.0 (subtle vintage radial lens R/B fringing)
  bloom: number; // 0..1 (Pro-Mist highlight diffusion glow)
  halation: number; // 0..1 (CineStill warm red-orange halo around bright edges)
  grain: number; // 0..1 (luminance-weighted organic silver grain)
  vignette: number; // 0..1

  // Optional imported 3D .CUBE LUT
  lut: ParsedCubeLut | null;
  lutStrength: number; // 0..1

  // Optional Optical & Natural Atmosphere Effects (Light Leak, Sun Rays, Shadow Play, Mist, etc.)
  effects?: StillEffectsConfig | null;
}

export const NEUTRAL_TONE_CURVE: [number, number, number, number, number] = [
  0, 0.25, 0.5, 0.75, 1,
];

export function isToneCurveNeutral(
  curve?: [number, number, number, number, number] | null
): boolean {
  if (!curve || curve.length !== 5) return true;
  for (let i = 0; i < 5; i++) {
    if (Math.abs(curve[i] - NEUTRAL_TONE_CURVE[i]) > 0.004) return false;
  }
  return true;
}

export const NEUTRAL_SHADER_PARAMS: ShaderGradingParams = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  fade: 0,
  toneCurve: [0, 0.25, 0.5, 0.75, 1],
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  grayscale: 0,
  sepia: 0,
  bleachBypass: 0,
  crossProcess: 0,
  skinProtect: 0,
  hslHue: [0, 0, 0, 0, 0, 0],
  hslSat: [0, 0, 0, 0, 0, 0],
  hslLum: [0, 0, 0, 0, 0, 0],
  infraredShift: 0,
  shadowTint: [0.5, 0.5, 0.5],
  shadowTintStrength: 0,
  midtoneTint: [0.5, 0.5, 0.5],
  midtoneTintStrength: 0,
  highlightTint: [0.5, 0.5, 0.5],
  highlightTintStrength: 0,
  deblur: 0,
  denoise: 0,
  clarity: 0,
  sharpen: 0,
  chromaticAberration: 0,
  bloom: 0,
  halation: 0,
  grain: 0,
  vignette: 0,
  lut: null,
  lutStrength: 0,
  effects: null,
};

const VERTEX_SHADER_SRC = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision highp float;

varying vec2 v_uv;
uniform sampler2D u_image;
uniform sampler2D u_lut;
uniform vec2 u_texelSize;

uniform float u_exposure;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_fade;
uniform float u_toneCurve[5];
uniform float u_hasToneCurve;

uniform float u_temperature;
uniform float u_tint;
uniform float u_saturation;
uniform float u_vibrance;
uniform float u_grayscale;
uniform float u_sepia;
uniform float u_bleachBypass;
uniform float u_crossProcess;
uniform float u_skinProtect;

uniform float u_hslHue[6];
uniform float u_hslSat[6];
uniform float u_hslLum[6];
uniform float u_infraredShift;

uniform vec3 u_shadowTint;
uniform float u_shadowTintStrength;
uniform vec3 u_midtoneTint;
uniform float u_midtoneTintStrength;
uniform vec3 u_highlightTint;
uniform float u_highlightTintStrength;

uniform float u_deblur;
uniform float u_denoise;
uniform float u_clarity;
uniform float u_sharpen;
uniform float u_chromaticAberration;
uniform float u_bloom;
uniform float u_halation;
uniform float u_grain;
uniform float u_vignette;

uniform float u_hasLut;
uniform float u_lutSize;
uniform float u_lutStrength;

float getLuma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float evalToneCurveScalar(float x) {
  float xc = clamp(x, 0.0, 1.0);
  float y0 = u_toneCurve[0];
  float y1 = u_toneCurve[1];
  float y2 = u_toneCurve[2];
  float y3 = u_toneCurve[3];
  float y4 = u_toneCurve[4];

  // Segment slopes (dx = 0.25)
  float d0 = (y1 - y0) * 4.0;
  float d1 = (y2 - y1) * 4.0;
  float d2 = (y3 - y2) * 4.0;
  float d3 = (y4 - y3) * 4.0;

  // Monotonic Fritsch-Carlson tangents (smooth filmic curve without overshoot)
  float m0 = d0;
  float m1 = (d0 * d1 <= 0.0) ? 0.0 : 0.5 * (d0 + d1);
  float m2 = (d1 * d2 <= 0.0) ? 0.0 : 0.5 * (d1 + d2);
  float m3 = (d2 * d3 <= 0.0) ? 0.0 : 0.5 * (d2 + d3);
  float m4 = d3;

  float p0, p1, t0, t1, t;
  if (xc < 0.25) {
    p0 = y0; p1 = y1; t0 = m0; t1 = m1; t = xc * 4.0;
  } else if (xc < 0.50) {
    p0 = y1; p1 = y2; t0 = m1; t1 = m2; t = (xc - 0.25) * 4.0;
  } else if (xc < 0.75) {
    p0 = y2; p1 = y3; t0 = m2; t1 = m3; t = (xc - 0.50) * 4.0;
  } else {
    p0 = y3; p1 = y4; t0 = m3; t1 = m4; t = (xc - 0.75) * 4.0;
  }

  float t2 = t * t;
  float t3 = t2 * t;
  float h00 = 2.0 * t3 - 3.0 * t2 + 1.0;
  float h10 = t3 - 2.0 * t2 + t;
  float h01 = -2.0 * t3 + 3.0 * t2;
  float h11 = t3 - t2;
  return clamp(h00 * p0 + h10 * 0.25 * t0 + h01 * p1 + h11 * 0.25 * t1, 0.0, 1.0);
}

vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float h = 0.0;
  float s = 0.0;
  float l = 0.5 * (maxC + minC);
  float d = maxC - minC;
  if (d > 0.00001) {
    s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
    if (maxC == c.r) {
      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
      h = (c.b - c.r) / d + 2.0;
    } else {
      h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 0.5) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  if (s <= 0.00001) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(
    hue2rgb(p, q, h + 1.0 / 3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0 / 3.0)
  );
}

float bandWeight(float hue, float center, float width) {
  float d = abs(hue - center);
  d = min(d, 1.0 - d);
  return smoothstep(width, 0.0, d);
}

vec3 sample3DLut(vec3 color) {
  float s = u_lutSize;
  float maxIdx = s - 1.0;
  vec3 scaled = clamp(color, 0.0, 1.0) * maxIdx;
  float b0 = floor(scaled.b);
  float b1 = min(maxIdx, b0 + 1.0);
  float fb = scaled.b - b0;

  float texW = s * s;
  float u0 = (b0 * s + scaled.r + 0.5) / texW;
  float u1 = (b1 * s + scaled.r + 0.5) / texW;
  float v = (scaled.g + 0.5) / s;

  vec3 c0 = texture2D(u_lut, vec2(u0, v)).rgb;
  vec3 c1 = texture2D(u_lut, vec2(u1, v)).rgb;
  return mix(c0, c1, fb);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 src = texture2D(u_image, v_uv);
  vec3 col = src.rgb;

  // 0A. Subtle Radial Vintage-Lens Chromatic Aberration (lateral R/B shift at edges)
  if (u_chromaticAberration > 0.005) {
    vec2 centered = v_uv - 0.5;
    float r2 = dot(centered, centered);
    vec2 shift = centered * r2 * u_chromaticAberration * 0.018;
    float rCh = texture2D(u_image, clamp(v_uv + shift, 0.001, 0.999)).r;
    float bCh = texture2D(u_image, clamp(v_uv - shift, 0.001, 0.999)).b;
    col = vec3(rCh, col.g, bCh);
  }

  // 0A-pre. Edge-Preserving Bilateral Denoise (cleans JPEG blocks & ISO noise before focus recovery)
  if (u_denoise > 0.005) {
    vec2 dt = u_texelSize * (1.0 + u_denoise * 0.65);
    float sigmaR = 0.045 + u_denoise * 0.14;
    float invTwoSigmaR2 = 1.0 / (2.0 * sigmaR * sigmaR);
    vec3 sumCol = col * 0.25;
    float sumW = 0.25;
    for (int iy = -1; iy <= 1; iy++) {
      for (int ix = -1; ix <= 1; ix++) {
        if (ix == 0 && iy == 0) continue;
        vec2 off = vec2(float(ix), float(iy)) * dt;
        vec3 sCol = texture2D(u_image, clamp(v_uv + off, 0.001, 0.999)).rgb;
        vec3 diff = sCol - col;
        float dist2 = dot(diff, diff);
        float spatialW = (ix == 0 || iy == 0) ? 0.125 : 0.0625;
        float rangeW = exp(-dist2 * invTwoSigmaR2);
        float w = spatialW * rangeW;
        sumCol += sCol * w;
        sumW += w;
      }
    }
    vec3 denoised = sumCol / max(sumW, 0.0001);
    col = mix(col, denoised, clamp(u_denoise * 0.92, 0.0, 0.95));
  }

  // 0A-post. Multi-Radius Anti-Halo Optical Deconvolution (Focus / Soft-Blur Recovery)
  if (u_deblur > 0.005) {
    vec2 t = u_texelSize;
    // Inner PSF ring (~1.25px) + Outer PSF ring (~2.5px) models mild optical defocus blur
    vec3 n1 = texture2D(u_image, clamp(v_uv + vec2( 0.0, -1.25) * t, 0.001, 0.999)).rgb;
    vec3 s1 = texture2D(u_image, clamp(v_uv + vec2( 0.0,  1.25) * t, 0.001, 0.999)).rgb;
    vec3 e1 = texture2D(u_image, clamp(v_uv + vec2( 1.25,  0.0) * t, 0.001, 0.999)).rgb;
    vec3 w1 = texture2D(u_image, clamp(v_uv + vec2(-1.25,  0.0) * t, 0.001, 0.999)).rgb;

    vec3 d1 = texture2D(u_image, clamp(v_uv + vec2( 1.75,  1.75) * t, 0.001, 0.999)).rgb;
    vec3 d2 = texture2D(u_image, clamp(v_uv + vec2(-1.75,  1.75) * t, 0.001, 0.999)).rgb;
    vec3 d3 = texture2D(u_image, clamp(v_uv + vec2( 1.75, -1.75) * t, 0.001, 0.999)).rgb;
    vec3 d4 = texture2D(u_image, clamp(v_uv + vec2(-1.75, -1.75) * t, 0.001, 0.999)).rgb;

    vec3 n2 = texture2D(u_image, clamp(v_uv + vec2( 0.0, -2.65) * t, 0.001, 0.999)).rgb;
    vec3 s2 = texture2D(u_image, clamp(v_uv + vec2( 0.0,  2.65) * t, 0.001, 0.999)).rgb;
    vec3 e2 = texture2D(u_image, clamp(v_uv + vec2( 2.65,  0.0) * t, 0.001, 0.999)).rgb;
    vec3 w2 = texture2D(u_image, clamp(v_uv + vec2(-2.65,  0.0) * t, 0.001, 0.999)).rgb;

    vec3 ring1 = (n1 + s1 + e1 + w1) * 0.25;
    vec3 diag1 = (d1 + d2 + d3 + d4) * 0.25;
    vec3 ring2 = (n2 + s2 + e2 + w2) * 0.25;

    // Gaussian-weighted optical blur PSF estimate
    vec3 psfEstimate = col * 0.24 + ring1 * 0.36 + diag1 * 0.24 + ring2 * 0.16;

    // Richardson-Lucy ratio update blended with high-frequency residual
    vec3 rlRecovered = col * clamp((col + 0.03) / (psfEstimate + 0.03), 0.55, 1.85);
    vec3 fineDetail = col - ring1;
    vec3 wideDetail = col - psfEstimate;

    // Gate flat low-contrast surfaces so grain/noise isn't amplified
    float edgeStrength = abs(getLuma(wideDetail)) + abs(getLuma(fineDetail)) * 0.6;
    float edgeGate = smoothstep(0.005, 0.038, edgeStrength);

    vec3 restored = mix(col, rlRecovered, u_deblur * 0.72 * edgeGate);
    restored += (fineDetail * 0.95 + wideDetail * 1.15) * (u_deblur * 0.85 * edgeGate);

    // Anti-halo envelope clamp prevents white/black ringing around high-contrast silhouettes
    vec3 localMin = min(col, min(min(n1, s1), min(e1, w1)));
    vec3 localMax = max(col, max(max(n1, s1), max(e1, w1)));
    float haloMargin = 0.045 + u_deblur * 0.065;
    col = clamp(restored, max(vec3(0.0), localMin - haloMargin), min(vec3(1.0), localMax + haloMargin));
  }

  // 0B. Local Midtone Micro-Contrast (Clarity) & Optical Unsharp Mask (Sharpen)
  if (abs(u_clarity) > 0.005 || u_sharpen > 0.005) {
    vec2 t = u_texelSize;
    if (u_sharpen > 0.005) {
      vec3 n = texture2D(u_image, clamp(v_uv + vec2(0.0, -t.y), 0.001, 0.999)).rgb;
      vec3 s = texture2D(u_image, clamp(v_uv + vec2(0.0,  t.y), 0.001, 0.999)).rgb;
      vec3 e = texture2D(u_image, clamp(v_uv + vec2( t.x, 0.0), 0.001, 0.999)).rgb;
      vec3 w = texture2D(u_image, clamp(v_uv + vec2(-t.x, 0.0), 0.001, 0.999)).rgb;
      vec3 blur3 = (n + s + e + w) * 0.25;
      vec3 detail = col - blur3;
      // Soft edge limiter avoids amplifying flat-sky noise
      float edgeLum = abs(getLuma(detail));
      float noiseGate = smoothstep(0.006, 0.032, edgeLum);
      col = clamp(col + detail * (u_sharpen * 1.45 * noiseGate), 0.0, 1.0);
    }
    if (abs(u_clarity) > 0.005) {
      vec3 wide = vec3(0.0);
      wide += texture2D(u_image, clamp(v_uv + vec2( 3.0,  0.0) * t, 0.001, 0.999)).rgb;
      wide += texture2D(u_image, clamp(v_uv + vec2(-3.0,  0.0) * t, 0.001, 0.999)).rgb;
      wide += texture2D(u_image, clamp(v_uv + vec2( 0.0,  3.0) * t, 0.001, 0.999)).rgb;
      wide += texture2D(u_image, clamp(v_uv + vec2( 0.0, -3.0) * t, 0.001, 0.999)).rgb;
      wide += texture2D(u_image, clamp(v_uv + vec2( 2.2,  2.2) * t, 0.001, 0.999)).rgb;
      wide += texture2D(u_image, clamp(v_uv + vec2(-2.2,  2.2) * t, 0.001, 0.999)).rgb;
      wide += texture2D(u_image, clamp(v_uv + vec2( 2.2, -2.2) * t, 0.001, 0.999)).rgb;
      wide += texture2D(u_image, clamp(v_uv + vec2(-2.2, -2.2) * t, 0.001, 0.999)).rgb;
      wide /= 8.0;
      float curL = getLuma(col);
      float midWeight = clamp(4.0 * curL * (1.0 - curL), 0.0, 1.0);
      vec3 localDiff = col - wide;
      col = clamp(col + localDiff * (u_clarity * 0.82 * midWeight), 0.0, 1.0);
    }
  }

  // 1. Optical Bloom (Pro-Mist) & Film Halation (CineStill bright-edge bleed)
  if (u_bloom > 0.005 || u_halation > 0.005) {
    vec3 bloomAccum = vec3(0.0);
    vec3 haloAccum = vec3(0.0);
    float r1 = 3.5;
    float r2 = 8.5;

    for (int i = 0; i < 8; i++) {
      float angle = float(i) * 0.78539816;
      vec2 dir = vec2(cos(angle), sin(angle));

      vec3 s1 = texture2D(u_image, clamp(v_uv + dir * u_texelSize * r1, 0.001, 0.999)).rgb;
      vec3 s2 = texture2D(u_image, clamp(v_uv + dir * u_texelSize * r2, 0.001, 0.999)).rgb;

      float l1 = getLuma(s1);
      float l2 = getLuma(s2);

      float bw1 = smoothstep(0.56, 0.95, l1);
      float bw2 = smoothstep(0.50, 0.92, l2);
      bloomAccum += s1 * bw1 * 0.65 + s2 * bw2 * 0.35;

      float hw1 = smoothstep(0.68, 0.98, l1);
      float hw2 = smoothstep(0.62, 0.96, l2);
      haloAccum += s1 * hw1 * 0.6 + s2 * hw2 * 0.4;
    }

    bloomAccum /= 8.0;
    haloAccum /= 8.0;

    if (u_bloom > 0.005) {
      // Soft screen-like Pro-Mist diffusion lifting gentle glow without harsh clipping
      vec3 glow = bloomAccum * (u_bloom * 0.52);
      col = 1.0 - (1.0 - col) * (1.0 - glow);
    }

    if (u_halation > 0.005) {
      // Authentic warm crimson-orange antihalation scatter around specular highlights
      float hPower = getLuma(haloAccum);
      vec3 halationTint = vec3(1.0, 0.28, 0.09);
      col = clamp(col + halationTint * hPower * (u_halation * 0.68), 0.0, 1.0);
    }
  }

  // Estimate skin mask before heavy color transforms (for Skin-Tone Protection)
  vec3 origHsl = rgb2hsl(col);
  float skinMask = bandWeight(origHsl.x, 0.065, 0.085) * smoothstep(0.10, 0.28, origHsl.y) * smoothstep(0.18, 0.35, origHsl.z) * (1.0 - smoothstep(0.82, 0.96, origHsl.z));
  float skinShield = skinMask * u_skinProtect;

  // 2. Exposure (photographic EV multiplier with soft highlight roll-off)
  if (abs(u_exposure) > 0.001) {
    float mult = pow(2.0, u_exposure * 0.85);
    col = col * mult;
    // Soft filmic shoulder roll-off above 0.85 so highlights stay creamy
    col = mix(col, 1.0 - exp(-col * 1.45) / (1.0 - exp(-1.45)), smoothstep(0.75, 1.35, col) * 0.55);
    col = clamp(col, 0.0, 1.0);
  }

  // 3. Highlights & Shadows luminance-masked recovery
  float lum = getLuma(col);
  if (abs(u_shadows) > 0.001) {
    float sMask = pow(1.0 - lum, 2.1);
    col = clamp(col + vec3(u_shadows * 0.34 * sMask), 0.0, 1.0);
  }
  lum = getLuma(col);
  if (abs(u_highlights) > 0.001) {
    float hMask = pow(lum, 2.0);
    col = clamp(col + vec3(u_highlights * 0.34 * hMask), 0.0, 1.0);
  }

  // 4. Filmic S-Curve Contrast (preserves gentle film shoulder & toe)
  if (abs(u_contrast) > 0.001) {
    float cAmt = u_contrast * 1.15;
    vec3 linearC = (col - 0.5) * (1.0 + cAmt) + 0.5;
    vec3 sCurve = col * col * (3.0 - 2.0 * col);
    col = clamp(mix(linearC, mix(col, sCurve, clamp(cAmt * 1.2, -0.5, 1.0)), 0.38), 0.0, 1.0);
  }

  // 4B. Custom 5-Point Master RGB Tone Curve
  if (u_hasToneCurve > 0.5) {
    col = vec3(
      evalToneCurveScalar(col.r),
      evalToneCurveScalar(col.g),
      evalToneCurveScalar(col.b)
    );
  }

  // 5. White Balance (Temperature & Tint), subtly moderated on protected skin
  float wbScale = 1.0 - skinShield * 0.45;
  col.r += u_temperature * 0.16 * wbScale;
  col.g += u_temperature * 0.03 * wbScale - u_tint * 0.12 * wbScale;
  col.b -= u_temperature * 0.17 * wbScale;
  col.r += u_tint * 0.07 * wbScale;
  col.b += u_tint * 0.07 * wbScale;
  col = clamp(col, 0.0, 1.0);

  // 6. 6-Channel Selective HSL + optional Kodak Aerochrome Infrared shift
  vec3 hsl = rgb2hsl(col);
  if (hsl.y > 0.015) {
    float wRed    = bandWeight(hsl.x, 0.00, 0.09);
    float wOrange = bandWeight(hsl.x, 0.085, 0.085);
    float wYellow = bandWeight(hsl.x, 0.165, 0.09);
    float wGreen  = bandWeight(hsl.x, 0.33, 0.16);
    float wCyan   = bandWeight(hsl.x, 0.50, 0.13);
    float wBlue   = bandWeight(hsl.x, 0.64, 0.16);

    float dHue =
      wRed    * u_hslHue[0] +
      wOrange * u_hslHue[1] * (1.0 - skinShield * 0.6) +
      wYellow * u_hslHue[2] +
      wGreen  * u_hslHue[3] +
      wCyan   * u_hslHue[4] +
      wBlue   * u_hslHue[5];

    float dSat =
      wRed    * u_hslSat[0] +
      wOrange * u_hslSat[1] * (1.0 - skinShield * 0.5) +
      wYellow * u_hslSat[2] +
      wGreen  * u_hslSat[3] +
      wCyan   * u_hslSat[4] +
      wBlue   * u_hslSat[5];

    float dLum =
      wRed    * u_hslLum[0] +
      wOrange * u_hslLum[1] +
      wYellow * u_hslLum[2] +
      wGreen  * u_hslLum[3] +
      wCyan   * u_hslLum[4] +
      wBlue   * u_hslLum[5];

    // Infrared Aerochrome special foliage-to-crimson shift
    if (u_infraredShift > 0.01) {
      float foliageMask = (wGreen + wYellow * 0.55) * smoothstep(0.08, 0.25, hsl.y);
      hsl.x = fract(mix(hsl.x, 0.965, clamp(foliageMask * u_infraredShift, 0.0, 1.0)));
      dSat += foliageMask * u_infraredShift * 0.35;
    }

    hsl.x = fract(hsl.x + dHue * 0.14 + 1.0);
    hsl.y = clamp(hsl.y * (1.0 + dSat * 0.85), 0.0, 1.0);
    hsl.z = clamp(hsl.z + dLum * 0.16 * (1.0 - abs(hsl.z - 0.5) * 1.4), 0.0, 1.0);
    col = hsl2rgb(hsl);
  }

  // 7. Vibrance & Global Saturation
  float lNow = getLuma(col);
  if (abs(u_vibrance) > 0.001) {
    float maxCh = max(max(col.r, col.g), col.b);
    float minCh = min(min(col.r, col.g), col.b);
    float curSat = maxCh - minCh;
    float vibAmt = u_vibrance * (1.0 - curSat) * (1.0 - skinShield * 0.55);
    col = clamp(mix(vec3(lNow), col, 1.0 + vibAmt), 0.0, 1.0);
  }
  if (abs(u_saturation) > 0.001) {
    float satEff = u_saturation * (1.0 - skinShield * 0.35);
    col = clamp(mix(vec3(getLuma(col)), col, max(0.0, 1.0 + satEff)), 0.0, 1.0);
  }

  // 8. Analog Cross-Process (C-41 / E-6 curved channel crossover)
  if (u_crossProcess > 0.005) {
    vec3 cp;
    cp.r = smoothstep(0.04, 0.94, col.r);
    cp.g = pow(col.g, 0.92) * 0.96 + 0.03;
    cp.b = col.b * 0.78 + 0.14;
    col = mix(col, clamp(cp, 0.0, 1.0), u_crossProcess * 0.65);
  }

  // 9. Bleach Bypass (Silver Retention — desaturated metallic high-contrast editorial look)
  if (u_bleachBypass > 0.005) {
    float bLum = getLuma(col);
    vec3 overlay;
    overlay.r = bLum < 0.5 ? 2.0 * col.r * bLum : 1.0 - 2.0 * (1.0 - col.r) * (1.0 - bLum);
    overlay.g = bLum < 0.5 ? 2.0 * col.g * bLum : 1.0 - 2.0 * (1.0 - col.g) * (1.0 - bLum);
    overlay.b = bLum < 0.5 ? 2.0 * col.b * bLum : 1.0 - 2.0 * (1.0 - col.b) * (1.0 - bLum);
    vec3 silver = mix(overlay, vec3(bLum), 0.32);
    col = mix(col, clamp(silver, 0.0, 1.0), u_bleachBypass * 0.85);
  }

  // 10. Monochrome & Sepia Film Stock Emulation
  if (u_grayscale > 0.005) {
    // Rich panchromatic red/green weighted B&W conversion (classic Ilford/Tri-X)
    float mono = clamp(col.r * 0.30 + col.g * 0.56 + col.b * 0.14, 0.0, 1.0);
    col = mix(col, vec3(mono), u_grayscale);
  }
  if (u_sepia > 0.005) {
    vec3 sep = vec3(
      dot(col, vec3(0.393, 0.769, 0.189)),
      dot(col, vec3(0.349, 0.686, 0.168)),
      dot(col, vec3(0.272, 0.534, 0.131))
    );
    col = mix(col, clamp(sep, 0.0, 1.0), u_sepia);
  }

  // 11. True Per-Pixel 3-Way Luminance-Masked Split Toning
  float splitLum = getLuma(col);
  float shMask = pow(1.0 - smoothstep(0.0, 0.58, splitLum), 1.35);
  float midMask = exp(-pow((splitLum - 0.5) / 0.26, 2.0));
  float hiMask = pow(smoothstep(0.42, 1.0, splitLum), 1.35);

  if (u_shadowTintStrength > 0.002) {
    vec3 tintedSh = mix(col, u_shadowTint * (0.28 + splitLum * 1.15), 0.78);
    col = mix(col, clamp(tintedSh, 0.0, 1.0), shMask * u_shadowTintStrength);
  }
  if (u_midtoneTintStrength > 0.002) {
    vec3 tintedMid = col * (0.65 + u_midtoneTint * 0.72);
    col = mix(col, clamp(tintedMid, 0.0, 1.0), midMask * u_midtoneTintStrength * (1.0 - skinShield * 0.45));
  }
  if (u_highlightTintStrength > 0.002) {
    vec3 tintedHi = mix(col, col * (0.55 + u_highlightTint * 0.55) + u_highlightTint * 0.18, 0.85);
    col = mix(col, clamp(tintedHi, 0.0, 1.0), hiMask * u_highlightTintStrength);
  }

  // 12. Optional Imported 3D .CUBE LUT
  if (u_hasLut > 0.5 && u_lutStrength > 0.005) {
    vec3 lutCol = sample3DLut(col);
    col = mix(col, lutCol, u_lutStrength);
  }

  // 13. Analog Matte Fade Lift (raises black toe smoothly)
  if (u_fade > 0.002) {
    float lift = u_fade * 0.85;
    col = col * (1.0 - lift * 0.65) + vec3(lift * 0.96, lift * 0.94, lift * 0.90);
  }

  // 14. Luminance-Weighted Organic Film Grain (strongest in midtones/shadows, clean in whites)
  if (u_grain > 0.005) {
    vec2 grainCoord = floor(v_uv / max(u_texelSize, vec2(0.0004)) * 0.65);
    float n1 = hash12(grainCoord + vec2(17.1, 31.7));
    float n2 = hash12(grainCoord * 0.5 + vec2(73.3, 19.9));
    float noise = (n1 * 0.65 + n2 * 0.35) - 0.5;
    float gLum = getLuma(col);
    float grainMask = 1.0 - smoothstep(0.65, 0.98, gLum);
    col = clamp(col + vec3(noise * u_grain * 0.22 * (0.35 + 0.65 * grainMask)), 0.0, 1.0);
  }

  // 15. Optical Lens Vignette
  if (u_vignette > 0.005) {
    vec2 centered = (v_uv - 0.5) * vec2(1.0, 1.0);
    float dist = length(centered) * 1.414;
    float vig = smoothstep(0.45, 1.25, dist);
    col *= 1.0 - vig * u_vignette * 0.68;
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
}
`;

// ============================================================================
// Pure CPU Mathematical Twin (for .CUBE 3D LUT export & WebGL fallback)
// ============================================================================
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function rgb2hslCpu(r: number, g: number, b: number): [number, number, number] {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = 0.5 * (maxC + minC);
  const d = maxC - minC;
  if (d > 0.00001) {
    s = l > 0.5 ? d / (2 - maxC - minC) : d / (maxC + minC);
    if (maxC === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (maxC === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hue2rgbCpu(p: number, q: number, tIn: number): number {
  let t = tIn;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 0.5) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hsl2rgbCpu(h: number, s: number, l: number): [number, number, number] {
  if (s <= 0.00001) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgbCpu(p, q, h + 1 / 3),
    hue2rgbCpu(p, q, h),
    hue2rgbCpu(p, q, h - 1 / 3),
  ];
}

function bandWeightCpu(hue: number, center: number, width: number): number {
  let d = Math.abs(hue - center);
  d = Math.min(d, 1 - d);
  return smoothstep(width, 0, d);
}

/**
 * Evaluates a single RGB pixel through STILL.'s full per-pixel color pipeline
 * (Exposure, Shadows/Highlights, Filmic S-Curve, WB, 6-Channel HSL, Infrared,
 * Vibrance/Sat, Cross-Process, Bleach Bypass, Monochrome/Sepia, 3-Way Split Toning,
 * Imported 3D LUT, and Matte Fade). Used for .CUBE 3D LUT Export & CPU fallback.
 */
export function evaluatePixelColorPipeline(
  rIn: number,
  gIn: number,
  bIn: number,
  p: ShaderGradingParams
): [number, number, number] {
  let r = clamp01(rIn);
  let g = clamp01(gIn);
  let b = clamp01(bIn);

  const [oh, os, ol] = rgb2hslCpu(r, g, b);
  const skinMask =
    bandWeightCpu(oh, 0.065, 0.085) *
    smoothstep(0.1, 0.28, os) *
    smoothstep(0.18, 0.35, ol) *
    (1 - smoothstep(0.82, 0.96, ol));
  const skinShield = skinMask * p.skinProtect;

  // Exposure
  if (Math.abs(p.exposure) > 0.001) {
    const mult = Math.pow(2, p.exposure * 0.85);
    const roll = (c: number) => {
      const m = c * mult;
      const shoulder = (1 - Math.exp(-m * 1.45)) / (1 - Math.exp(-1.45));
      const w = smoothstep(0.75, 1.35, m) * 0.55;
      return clamp01(m * (1 - w) + shoulder * w);
    };
    r = roll(r);
    g = roll(g);
    b = roll(b);
  }

  // Shadows / Highlights
  let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (Math.abs(p.shadows) > 0.001) {
    const sAdd = p.shadows * 0.34 * Math.pow(1 - lum, 2.1);
    r = clamp01(r + sAdd);
    g = clamp01(g + sAdd);
    b = clamp01(b + sAdd);
  }
  lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (Math.abs(p.highlights) > 0.001) {
    const hAdd = p.highlights * 0.34 * Math.pow(lum, 2.0);
    r = clamp01(r + hAdd);
    g = clamp01(g + hAdd);
    b = clamp01(b + hAdd);
  }

  // Filmic Contrast
  if (Math.abs(p.contrast) > 0.001) {
    const cAmt = p.contrast * 1.15;
    const scMix = Math.max(-0.5, Math.min(1, cAmt * 1.2));
    const applyC = (c: number) => {
      const lin = (c - 0.5) * (1 + cAmt) + 0.5;
      const sc = c * c * (3 - 2 * c);
      const curved = c + (sc - c) * scMix;
      return clamp01(lin * 0.62 + curved * 0.38);
    };
    r = applyC(r);
    g = applyC(g);
    b = applyC(b);
  }

  // 4B. Custom 5-Point Master RGB Tone Curve (Fritsch-Carlson monotonic cubic)
  if (!isToneCurveNeutral(p.toneCurve)) {
    const [y0, y1, y2, y3, y4] = p.toneCurve;
    const d0 = (y1 - y0) * 4;
    const d1 = (y2 - y1) * 4;
    const d2 = (y3 - y2) * 4;
    const d3 = (y4 - y3) * 4;
    const m0 = d0;
    const m1 = d0 * d1 <= 0 ? 0 : 0.5 * (d0 + d1);
    const m2 = d1 * d2 <= 0 ? 0 : 0.5 * (d1 + d2);
    const m3 = d2 * d3 <= 0 ? 0 : 0.5 * (d2 + d3);
    const m4 = d3;

    const evalCurve = (x: number): number => {
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
    };
    r = evalCurve(r);
    g = evalCurve(g);
    b = evalCurve(b);
  }

  // White balance
  const wbScale = 1 - skinShield * 0.45;
  r = clamp01(r + p.temperature * 0.16 * wbScale + p.tint * 0.07 * wbScale);
  g = clamp01(g + p.temperature * 0.03 * wbScale - p.tint * 0.12 * wbScale);
  b = clamp01(b - p.temperature * 0.17 * wbScale + p.tint * 0.07 * wbScale);

  // 6-Band Selective HSL
  let [h, s, l] = rgb2hslCpu(r, g, b);
  if (s > 0.015) {
    const wRed = bandWeightCpu(h, 0.0, 0.09);
    const wOrange = bandWeightCpu(h, 0.085, 0.085);
    const wYellow = bandWeightCpu(h, 0.165, 0.09);
    const wGreen = bandWeightCpu(h, 0.33, 0.16);
    const wCyan = bandWeightCpu(h, 0.5, 0.13);
    const wBlue = bandWeightCpu(h, 0.64, 0.16);

    const dHue =
      wRed * p.hslHue[0] +
      wOrange * p.hslHue[1] * (1 - skinShield * 0.6) +
      wYellow * p.hslHue[2] +
      wGreen * p.hslHue[3] +
      wCyan * p.hslHue[4] +
      wBlue * p.hslHue[5];

    let dSat =
      wRed * p.hslSat[0] +
      wOrange * p.hslSat[1] * (1 - skinShield * 0.5) +
      wYellow * p.hslSat[2] +
      wGreen * p.hslSat[3] +
      wCyan * p.hslSat[4] +
      wBlue * p.hslSat[5];

    const dLum =
      wRed * p.hslLum[0] +
      wOrange * p.hslLum[1] +
      wYellow * p.hslLum[2] +
      wGreen * p.hslLum[3] +
      wCyan * p.hslLum[4] +
      wBlue * p.hslLum[5];

    if (p.infraredShift > 0.01) {
      const foliage = (wGreen + wYellow * 0.55) * smoothstep(0.08, 0.25, s);
      const amt = clamp01(foliage * p.infraredShift);
      h = (h * (1 - amt) + 0.965 * amt) % 1;
      dSat += foliage * p.infraredShift * 0.35;
    }

    h = (((h + dHue * 0.14) % 1) + 1) % 1;
    s = clamp01(s * (1 + dSat * 0.85));
    l = clamp01(l + dLum * 0.16 * (1 - Math.abs(l - 0.5) * 1.4));
    [r, g, b] = hsl2rgbCpu(h, s, l);
  }

  // Vibrance & Saturation
  if (Math.abs(p.vibrance) > 0.001) {
    const lNow = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const curSat = Math.max(r, g, b) - Math.min(r, g, b);
    const vib = p.vibrance * (1 - curSat) * (1 - skinShield * 0.55);
    r = clamp01(lNow + (r - lNow) * (1 + vib));
    g = clamp01(lNow + (g - lNow) * (1 + vib));
    b = clamp01(lNow + (b - lNow) * (1 + vib));
  }
  if (Math.abs(p.saturation) > 0.001) {
    const lNow = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const mult = Math.max(0, 1 + p.saturation * (1 - skinShield * 0.35));
    r = clamp01(lNow + (r - lNow) * mult);
    g = clamp01(lNow + (g - lNow) * mult);
    b = clamp01(lNow + (b - lNow) * mult);
  }

  // Cross-process
  if (p.crossProcess > 0.005) {
    const amt = p.crossProcess * 0.65;
    const cpr = smoothstep(0.04, 0.94, r);
    const cpg = clamp01(Math.pow(g, 0.92) * 0.96 + 0.03);
    const cpb = clamp01(b * 0.78 + 0.14);
    r = r + (cpr - r) * amt;
    g = g + (cpg - g) * amt;
    b = b + (cpb - b) * amt;
  }

  // Bleach Bypass
  if (p.bleachBypass > 0.005) {
    const bLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ov = (c: number) =>
      bLum < 0.5 ? 2 * c * bLum : 1 - 2 * (1 - c) * (1 - bLum);
    const amt = p.bleachBypass * 0.85;
    r = r + (clamp01(ov(r) * 0.68 + bLum * 0.32) - r) * amt;
    g = g + (clamp01(ov(g) * 0.68 + bLum * 0.32) - g) * amt;
    b = b + (clamp01(ov(b) * 0.68 + bLum * 0.32) - b) * amt;
  }

  // Monochrome & Sepia
  if (p.grayscale > 0.005) {
    const mono = clamp01(r * 0.3 + g * 0.56 + b * 0.14);
    r = r + (mono - r) * p.grayscale;
    g = g + (mono - g) * p.grayscale;
    b = b + (mono - b) * p.grayscale;
  }
  if (p.sepia > 0.005) {
    const sr = clamp01(r * 0.393 + g * 0.769 + b * 0.189);
    const sg = clamp01(r * 0.349 + g * 0.686 + b * 0.168);
    const sb = clamp01(r * 0.272 + g * 0.534 + b * 0.131);
    r = r + (sr - r) * p.sepia;
    g = g + (sg - g) * p.sepia;
    b = b + (sb - b) * p.sepia;
  }

  // 3-Way Luminance-Masked Split Toning
  const sLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const shMask = Math.pow(1 - smoothstep(0, 0.58, sLum), 1.35);
  const midMask = Math.exp(-Math.pow((sLum - 0.5) / 0.26, 2));
  const hiMask = Math.pow(smoothstep(0.42, 1, sLum), 1.35);

  if (p.shadowTintStrength > 0.002) {
    const w = shMask * p.shadowTintStrength;
    const scale = 0.28 + sLum * 1.15;
    r = r + (clamp01(r * 0.22 + p.shadowTint[0] * scale * 0.78) - r) * w;
    g = g + (clamp01(g * 0.22 + p.shadowTint[1] * scale * 0.78) - g) * w;
    b = b + (clamp01(b * 0.22 + p.shadowTint[2] * scale * 0.78) - b) * w;
  }
  if (p.midtoneTintStrength > 0.002) {
    const w = midMask * p.midtoneTintStrength * (1 - skinShield * 0.45);
    r = r + (clamp01(r * (0.65 + p.midtoneTint[0] * 0.72)) - r) * w;
    g = g + (clamp01(g * (0.65 + p.midtoneTint[1] * 0.72)) - g) * w;
    b = b + (clamp01(b * (0.65 + p.midtoneTint[2] * 0.72)) - b) * w;
  }
  if (p.highlightTintStrength > 0.002) {
    const w = hiMask * p.highlightTintStrength;
    const hi = (c: number, t: number) =>
      clamp01(c * 0.15 + (c * (0.55 + t * 0.55) + t * 0.18) * 0.85);
    r = r + (hi(r, p.highlightTint[0]) - r) * w;
    g = g + (hi(g, p.highlightTint[1]) - g) * w;
    b = b + (hi(b, p.highlightTint[2]) - b) * w;
  }

  // Optional 3D LUT
  if (p.lut && p.lutStrength > 0.005) {
    const [lr, lg, lb] = sampleLut3D(p.lut, r, g, b);
    r = r + (lr - r) * p.lutStrength;
    g = g + (lg - g) * p.lutStrength;
    b = b + (lb - b) * p.lutStrength;
  }

  // Analog Matte Fade
  if (p.fade > 0.002) {
    const lift = p.fade * 0.85;
    r = clamp01(r * (1 - lift * 0.65) + lift * 0.96);
    g = clamp01(g * (1 - lift * 0.65) + lift * 0.94);
    b = clamp01(b * (1 - lift * 0.65) + lift * 0.9);
  }

  return [clamp01(r), clamp01(g), clamp01(b)];
}

// ============================================================================
// Reusable High-Speed WebGL Renderer (handles live viewport, thumbnails & export)
// ============================================================================
class StillWebGLContext {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private imageTex: WebGLTexture | null = null;
  private lutTex: WebGLTexture | null = null;
  private lastImageKey = '';
  private lastLutId = '';
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement('canvas');
    this.init();
  }

  private init() {
    const gl = this.canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) return;
    this.gl = gl;

    const vs = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }
    this.program = program;
    gl.useProgram(program);

    // Fullscreen quad (flipped Y UV so HTMLImageElement draws right-side up)
    const quad = new Float32Array([
      -1, -1, 0, 1,
      1, -1, 1, 1,
      -1, 1, 0, 0,
      1, 1, 1, 0,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_pos');
    const aUv = gl.getAttribLocation(program, 'a_uv');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

    // Image & LUT textures
    this.imageTex = this.createLinearTexture(gl);
    this.lutTex = this.createLinearTexture(gl);

    // Cache uniform locations
    const names = [
      'u_image',
      'u_lut',
      'u_texelSize',
      'u_exposure',
      'u_contrast',
      'u_highlights',
      'u_shadows',
      'u_fade',
      'u_toneCurve',
      'u_hasToneCurve',
      'u_temperature',
      'u_tint',
      'u_saturation',
      'u_vibrance',
      'u_grayscale',
      'u_sepia',
      'u_bleachBypass',
      'u_crossProcess',
      'u_skinProtect',
      'u_hslHue',
      'u_hslSat',
      'u_hslLum',
      'u_infraredShift',
      'u_shadowTint',
      'u_shadowTintStrength',
      'u_midtoneTint',
      'u_midtoneTintStrength',
      'u_highlightTint',
      'u_highlightTintStrength',
      'u_deblur',
      'u_denoise',
      'u_clarity',
      'u_sharpen',
      'u_chromaticAberration',
      'u_bloom',
      'u_halation',
      'u_grain',
      'u_vignette',
      'u_hasLut',
      'u_lutSize',
      'u_lutStrength',
    ];
    for (const name of names) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  private compileShader(
    gl: WebGLRenderingContext,
    type: number,
    src: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createLinearTexture(gl: WebGLRenderingContext): WebGLTexture | null {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  isAvailable(): boolean {
    return Boolean(this.gl && this.program && this.imageTex && this.lutTex);
  }

  render(
    source: HTMLImageElement | HTMLCanvasElement,
    sourceKey: string,
    outWidth: number,
    outHeight: number,
    params: ShaderGradingParams
  ): boolean {
    const gl = this.gl;
    if (!gl || !this.program || !this.imageTex || !this.lutTex) return false;

    if (this.canvas.width !== outWidth || this.canvas.height !== outHeight) {
      this.canvas.width = outWidth;
      this.canvas.height = outHeight;
    }

    gl.viewport(0, 0, outWidth, outHeight);
    gl.useProgram(this.program);

    // Upload image texture only when source changes
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTex);
    if (this.lastImageKey !== sourceKey) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source
      );
      this.lastImageKey = sourceKey;
    }
    gl.uniform1i(this.uniforms.u_image, 0);

    // Upload 3D LUT texture if present
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    if (params.lut && params.lutStrength > 0.005) {
      if (this.lastLutId !== params.lut.id) {
        const packed = createLutTexturePixels(params.lut);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          packed.width,
          packed.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          packed.pixels
        );
        this.lastLutId = params.lut.id;
      }
      gl.uniform1f(this.uniforms.u_hasLut, 1.0);
      gl.uniform1f(this.uniforms.u_lutSize, params.lut.size);
      gl.uniform1f(this.uniforms.u_lutStrength, params.lutStrength);
    } else {
      if (this.lastLutId === '') {
        // Bind a 1x1 dummy texture so sampler1 is always valid
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 255])
        );
        this.lastLutId = '__dummy__';
      }
      gl.uniform1f(this.uniforms.u_hasLut, 0.0);
      gl.uniform1f(this.uniforms.u_lutSize, 2.0);
      gl.uniform1f(this.uniforms.u_lutStrength, 0.0);
    }
    gl.uniform1i(this.uniforms.u_lut, 1);

    // Bind grading uniforms
    gl.uniform2f(
      this.uniforms.u_texelSize,
      1 / Math.max(1, outWidth),
      1 / Math.max(1, outHeight)
    );
    gl.uniform1f(this.uniforms.u_exposure, params.exposure);
    gl.uniform1f(this.uniforms.u_contrast, params.contrast);
    gl.uniform1f(this.uniforms.u_highlights, params.highlights);
    gl.uniform1f(this.uniforms.u_shadows, params.shadows);
    gl.uniform1f(this.uniforms.u_fade, params.fade);
    const activeCurve = params.toneCurve ?? NEUTRAL_TONE_CURVE;
    gl.uniform1fv(this.uniforms.u_toneCurve, activeCurve);
    gl.uniform1f(
      this.uniforms.u_hasToneCurve,
      isToneCurveNeutral(activeCurve) ? 0.0 : 1.0
    );

    gl.uniform1f(this.uniforms.u_temperature, params.temperature);
    gl.uniform1f(this.uniforms.u_tint, params.tint);
    gl.uniform1f(this.uniforms.u_saturation, params.saturation);
    gl.uniform1f(this.uniforms.u_vibrance, params.vibrance);
    gl.uniform1f(this.uniforms.u_grayscale, params.grayscale);
    gl.uniform1f(this.uniforms.u_sepia, params.sepia);
    gl.uniform1f(this.uniforms.u_bleachBypass, params.bleachBypass);
    gl.uniform1f(this.uniforms.u_crossProcess, params.crossProcess);
    gl.uniform1f(this.uniforms.u_skinProtect, params.skinProtect);

    gl.uniform1fv(this.uniforms.u_hslHue, params.hslHue);
    gl.uniform1fv(this.uniforms.u_hslSat, params.hslSat);
    gl.uniform1fv(this.uniforms.u_hslLum, params.hslLum);
    gl.uniform1f(this.uniforms.u_infraredShift, params.infraredShift);

    gl.uniform3fv(this.uniforms.u_shadowTint, params.shadowTint);
    gl.uniform1f(
      this.uniforms.u_shadowTintStrength,
      params.shadowTintStrength
    );
    gl.uniform3fv(this.uniforms.u_midtoneTint, params.midtoneTint);
    gl.uniform1f(
      this.uniforms.u_midtoneTintStrength,
      params.midtoneTintStrength
    );
    gl.uniform3fv(this.uniforms.u_highlightTint, params.highlightTint);
    gl.uniform1f(
      this.uniforms.u_highlightTintStrength,
      params.highlightTintStrength
    );

    gl.uniform1f(this.uniforms.u_deblur, params.deblur);
    gl.uniform1f(this.uniforms.u_denoise, params.denoise);
    gl.uniform1f(this.uniforms.u_clarity, params.clarity);
    gl.uniform1f(this.uniforms.u_sharpen, params.sharpen);
    gl.uniform1f(
      this.uniforms.u_chromaticAberration,
      params.chromaticAberration
    );
    gl.uniform1f(this.uniforms.u_bloom, params.bloom);
    gl.uniform1f(this.uniforms.u_halation, params.halation);
    gl.uniform1f(this.uniforms.u_grain, params.grain);
    gl.uniform1f(this.uniforms.u_vignette, params.vignette);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }
}

let sharedOffscreenRenderer: StillWebGLContext | null = null;

function getSharedRenderer(): StillWebGLContext {
  if (!sharedOffscreenRenderer) {
    sharedOffscreenRenderer = new StillWebGLContext();
  }
  return sharedOffscreenRenderer;
}

/**
 * Renders any image/canvas through STILL.'s WebGL2 Optical & Film Shader Engine
 * onto a target 2D canvas context (with automatic CPU pixel fallback if WebGL is unavailable).
 */
export function renderWithShaderToCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  sourceKey: string,
  targetCanvas: HTMLCanvasElement,
  outWidth: number,
  outHeight: number,
  params: ShaderGradingParams
): void {
  targetCanvas.width = outWidth;
  targetCanvas.height = outHeight;
  const ctx2d = targetCanvas.getContext('2d');
  if (!ctx2d) return;

  const renderer = getSharedRenderer();
  if (renderer.isAvailable()) {
    const ok = renderer.render(source, sourceKey, outWidth, outHeight, params);
    if (ok) {
      ctx2d.clearRect(0, 0, outWidth, outHeight);
      ctx2d.drawImage(renderer.canvas, 0, 0, outWidth, outHeight);
      if (params.effects) {
        applyStillEffectsToCanvas(ctx2d, outWidth, outHeight, params.effects);
      }
      return;
    }
  }

  // Exact mathematical CPU fallback
  ctx2d.drawImage(source, 0, 0, outWidth, outHeight);
  const imgData = ctx2d.getImageData(0, 0, outWidth, outHeight);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = evaluatePixelColorPipeline(
      data[i] / 255,
      data[i + 1] / 255,
      data[i + 2] / 255,
      params
    );
    data[i] = Math.round(r * 255);
    data[i + 1] = Math.round(g * 255);
    data[i + 2] = Math.round(b * 255);
  }
  ctx2d.putImageData(imgData, 0, 0);
  if (params.effects) {
    applyStillEffectsToCanvas(ctx2d, outWidth, outHeight, params.effects);
  }
}

/**
 * Fast cached image loader shared by viewport, thumbnails, and batch engine.
 */
const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImageCached(src: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(src);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      imageCache.delete(src);
      reject(new Error('Failed to load image'));
    };
    img.src = src;
  });

  if (imageCache.size > 40) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) imageCache.delete(firstKey);
  }
  imageCache.set(src, promise);
  return promise;
}

/**
 * Fast WebGL-rendered preset thumbnail cache (renders real 6-channel HSL,
 * 3-way split-tone, Pro-Mist bloom, and CineStill halation at 140px in ~1ms).
 */
const thumbCache = new Map<string, string>();

export function renderShaderThumbnail(
  img: HTMLImageElement,
  cacheKey: string,
  params: ShaderGradingParams,
  size = 132
): string {
  const hit = thumbCache.get(cacheKey);
  if (hit) return hit;

  const aspect =
    img.naturalWidth > 0 && img.naturalHeight > 0
      ? img.naturalWidth / img.naturalHeight
      : 1;
  const w = aspect >= 1 ? Math.round(size * aspect) : size;
  const h = aspect >= 1 ? size : Math.round(size / aspect);

  const renderer = getSharedRenderer();
  let dataUrl = '';

  if (renderer.isAvailable()) {
    renderer.render(img, img.src, w, h, params);
    dataUrl = renderer.canvas.toDataURL('image/jpeg', 0.82);
  } else {
    const fallback = document.createElement('canvas');
    renderWithShaderToCanvas(img, img.src, fallback, w, h, params);
    dataUrl = fallback.toDataURL('image/jpeg', 0.82);
  }

  if (thumbCache.size > 260) {
    const first = thumbCache.keys().next().value;
    if (first) thumbCache.delete(first);
  }
  thumbCache.set(cacheKey, dataUrl);
  return dataUrl;
}
