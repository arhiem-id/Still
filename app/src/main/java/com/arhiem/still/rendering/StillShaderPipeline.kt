package com.arhiem.still.rendering

import com.arhiem.still.domain.model.ToneMood

/**
 * STILL. Engine v2 — Native Android 6-Engine Rendering Architecture Contract.
 *
 * 1. Optical & Film Physics Shader (AGSL RuntimeShader on API 33+ / OpenGL ES 3.0 fallback)
 *    - 6-Band Selective HSL Matrix [Red, Orange, Yellow, Green, Cyan, Blue]
 *    - True Per-Pixel 3-Way Luminance-Masked Split Toning (Shadows / Midtones / Highlights)
 *    - Filmic S-Curve, Bleach Bypass, Cross-Process, Aerochrome Infrared Shift
 *    - Optical Pro-Mist Highlight Bloom & CineStill Crimson Halation
 *    - Luminance-Weighted Organic Film Grain & Optical Vignette
 *
 * 2. Smart Histogram & Adaptive Tone Engine
 *    - 256-bin luminance histogram -> 48-bin UI sparkline
 *    - Dynamic-range-aware Highlight Guard (Bright) & Shadow Guard (Dark)
 *    - Warm skin-tone presence estimation for automatic Skin Guard
 *
 * 3. 3D LUT (.CUBE) Engine
 *    - Standard Adobe / DaVinci Resolve 3D .CUBE parser & trilinear GPU strip packer
 *    - 17x17x17 .CUBE LUT exporter for all 70 STILL. presets & custom recipes
 *
 * 4. Editorial Series / Batch Sync Engine
 *    - Multi-plate editing (2..8 plates) synced to Hero photo histogram exposure
 *
 * 5. Geometry & Auto-Horizon Engine
 *    - Fine straighten (-15°..+15°) with exact inscribed-rectangle auto-zoom
 *    - Offline Sobel gradient-orientation horizon & architectural vertical detector
 *    - 90° rotation and Horizontal / Vertical mirror flip transforms
 *
 * 6. Micro-Detail & Texture Engine
 *    - Wide midtone-masked local micro-contrast (Clarity)
 *    - Edge-gated optical unsharp mask (Sharpen)
 *    - Radial vintage lens chromatic aberration (Lens Fringe)
 */
data class OpticalGradingUniforms(
    val exposure: Float = 0f,
    val contrast: Float = 0f,
    val highlights: Float = 0f,
    val shadows: Float = 0f,
    val fade: Float = 0f,
    val temperature: Float = 0f,
    val tint: Float = 0f,
    val saturation: Float = 0f,
    val vibrance: Float = 0f,
    val grayscale: Float = 0f,
    val sepia: Float = 0f,
    val bleachBypass: Float = 0f,
    val crossProcess: Float = 0f,
    val skinProtect: Float = 0f,
    val infraredShift: Float = 0f,
    val hslHue: FloatArray = FloatArray(6),
    val hslSat: FloatArray = FloatArray(6),
    val hslLum: FloatArray = FloatArray(6),
    val shadowTintRgb: FloatArray = floatArrayOf(0.5f, 0.5f, 0.5f),
    val shadowTintStrength: Float = 0f,
    val midtoneTintRgb: FloatArray = floatArrayOf(0.5f, 0.5f, 0.5f),
    val midtoneTintStrength: Float = 0f,
    val highlightTintRgb: FloatArray = floatArrayOf(0.5f, 0.5f, 0.5f),
    val highlightTintStrength: Float = 0f,
    val bloom: Float = 0f,
    val halation: Float = 0f,
    val grain: Float = 0f,
    val vignette: Float = 0f,
    val deblur: Float = 0f,
    val denoise: Float = 0f,
    val clarity: Float = 0f,
    val sharpen: Float = 0f,
    val chromaticAberration: Float = 0f,
)

data class OpticalRestoreState(
    val deblur: Float = 0f,
    val denoise: Float = 0f,
    val upscale2xCrisp: Boolean = false,
)

data class GeometryTransformState(
    val straightenDegrees: Float = 0f,
    val rotate90Degrees: Int = 0,
    val flipHorizontal: Boolean = false,
    val flipVertical: Boolean = false,
)

data class FreeCropRectState(
    val x: Float = 0.08f,
    val y: Float = 0.08f,
    val width: Float = 0.84f,
    val height: Float = 0.84f,
)

data class PhotoHistogramMetrics(
    val meanLuminance: Float,
    val shadowFloorP05: Float,
    val medianP50: Float,
    val highlightCeilingP95: Float,
    val clippedHighlightRatio: Float,
    val crushedShadowRatio: Float,
    val skinPresenceRatio: Float,
)

data class CubeLut3D(
    val id: String,
    val title: String,
    val size: Int,
    val rgbData: FloatArray,
)

data class SeriesPlateSyncState(
    val plateId: String,
    val displayName: String,
    val toneMood: ToneMood,
    val matchedExposureDelta: Float,
    val histogram: PhotoHistogramMetrics?,
)
