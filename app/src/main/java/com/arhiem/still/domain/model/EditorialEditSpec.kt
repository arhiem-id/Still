package com.arhiem.still.domain.model

enum class CropRatio(val label: String, val ratioValue: Float?) {
    ORIGINAL("Original", null),
    FOUR_FIVE("4:5", 4f / 5f),
    THREE_FOUR("3:4", 3f / 4f),
    SQUARE("1:1", 1f),
    SIXTEEN_NINE("16:9", 16f / 9f)
}

enum class MatteFrameStyle(val label: String) {
    NONE("None"),
    PAPER("Paper"),
    INK("Ink"),
    GALLERY("Gallery")
}

enum class ExportFormat(val extension: String, val mimeType: String) {
    JPEG("jpg", "image/jpeg"),
    PNG("png", "image/png")
}

enum class ExportQuality(val maxDimensionPx: Int, val jpegQuality: Int) {
    STANDARD(1440, 85),
    HIGH(2048, 92),
    PRINT_MAX(3200, 96)
}

data class CustomPresetRecipe(
    val id: String,
    val code: String,
    val name: String,
    val basePresetId: String?,
    val tone: ToneMood,
    val intensity: Int,
    val exposure: Float,
    val contrast: Float,
    val warmth: Float,
    val saturation: Float,
    val fade: Float,
    val grain: Float,
    val vignette: Float
)

data class EditorialExportConfig(
    val cropRatio: CropRatio = CropRatio.ORIGINAL,
    val frameStyle: MatteFrameStyle = MatteFrameStyle.NONE,
    val includeMarginStamp: Boolean = false,
    val format: ExportFormat = ExportFormat.JPEG,
    val quality: ExportQuality = ExportQuality.HIGH
)
