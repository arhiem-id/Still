package com.arhiem.still.rendering

/**
 * Sprint 0 architectural boundary for the STILL. non-destructive color rendering engine.
 *
 * Image decoding, GPU shader pipelines, and color LUT evaluation are intentionally
 * omitted in Sprint 0 and will be implemented behind this contract in subsequent sprints.
 */
interface StillRenderEngine {
    val capabilities: RenderCapabilities
}

data class RenderCapabilities(
    val isPipelineInitialized: Boolean = false,
    val colorSpaceLabel: String = "Display P3 / Linear",
    val bitDepthLabel: String = "16-bit Float (Planned)"
)

class PlaceholderRenderEngine : StillRenderEngine {
    override val capabilities: RenderCapabilities = RenderCapabilities(
        isPipelineInitialized = false
    )
}
