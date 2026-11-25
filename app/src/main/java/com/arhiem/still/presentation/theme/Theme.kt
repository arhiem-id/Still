package com.arhiem.still.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val StillLightColorScheme = lightColorScheme(
    primary = StillInk,
    onPrimary = StillPaper,
    secondary = StillTaupe,
    onSecondary = StillInk,
    tertiary = StillOlive,
    onTertiary = StillPaper,
    background = StillPaper,
    onBackground = StillInk,
    surface = StillPaper,
    onSurface = StillInk,
    surfaceVariant = StillPaperSurfaceLow,
    onSurfaceVariant = StillMutedInk,
    surfaceContainerLowest = StillPaper,
    surfaceContainerLow = StillPaperSurfaceLow,
    surfaceContainer = StillPaperSurfaceLow,
    surfaceContainerHigh = StillPaperSurfaceHigh,
    outline = StillHairlineLight,
    outlineVariant = StillHairlineLight
)

private val StillDarkColorScheme = darkColorScheme(
    primary = StillPaper,
    onPrimary = StillInk,
    secondary = StillTaupe,
    onSecondary = StillInk,
    tertiary = StillOlive,
    onTertiary = StillPaper,
    background = StillInk,
    onBackground = StillPaper,
    surface = StillInk,
    onSurface = StillPaper,
    surfaceVariant = StillInkSurfaceLow,
    onSurfaceVariant = StillMutedPaper,
    surfaceContainerLowest = StillInk,
    surfaceContainerLow = StillInkSurfaceLow,
    surfaceContainer = StillInkSurfaceLow,
    surfaceContainerHigh = StillInkSurfaceHigh,
    outline = StillHairlineDark,
    outlineVariant = StillHairlineDark
)

@Composable
fun StillTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) StillDarkColorScheme else StillLightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = StillTypography,
        shapes = StillShapes,
        content = content
    )
}
