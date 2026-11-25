package com.arhiem.still.presentation.screens.studio

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.arhiem.still.presentation.components.EditorialDivider

/**
 * Sprint 0 Studio workspace foundation.
 * Provides the photo import entry point (Android Photo Picker, zero storage permissions),
 * an editorial preview frame placeholder, and an architectural toolbar placeholder.
 * No image processing or simulated editing controls are implemented in Sprint 0.
 */
@Composable
fun StudioScreen(
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        onResult = { uri ->
            if (uri != null) {
                viewModel.onPhotoSelected(uri)
            }
        }
    )

    val launchImport = {
        photoPickerLauncher.launch(
            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
        )
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = 24.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // Editorial workspace header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            Text(
                text = "Studio",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = uiState.colorSpaceLabel.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(14.dp))
        EditorialDivider()
        Spacer(modifier = Modifier.height(24.dp))

        // Image preview placeholder frame
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentAlignment = Alignment.Center
        ) {
            ImagePreviewPlaceholder(
                selectedUriLabel = uiState.selectedPhotoUri?.lastPathSegment,
                onImportPhoto = launchImport,
                onClearSelection = viewModel::onClearSelection
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Editing toolbar placeholder (Sprint 0 boundary — no fake sliders)
        EditingToolbarPlaceholder()

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun ImagePreviewPlaceholder(
    selectedUriLabel: String?,
    onImportPhoto: () -> Unit,
    onClearSelection: () -> Unit
) {
    val borderColor = MaterialTheme.colorScheme.outline
    val registrationColor = MaterialTheme.colorScheme.secondary

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(3f / 4f)
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .border(0.75.dp, borderColor)
    ) {
        // Subtle editorial crop registration corner marks
        Canvas(modifier = Modifier.fillMaxSize()) {
            val inset = 16.dp.toPx()
            val markLength = 12.dp.toPx()
            val stroke = 1.dp.toPx()

            drawCornerMark(registrationColor, inset, inset, markLength, markLength, stroke)
            drawCornerMark(registrationColor, size.width - inset, inset, -markLength, markLength, stroke)
            drawCornerMark(registrationColor, inset, size.height - inset, markLength, -markLength, stroke)
            drawCornerMark(registrationColor, size.width - inset, size.height - inset, -markLength, -markLength, stroke)
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = if (selectedUriLabel == null) "CANVAS · 3:4 FRAME" else "SOURCE LINKED",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.secondary
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = if (selectedUriLabel == null) {
                    "Import a photograph"
                } else {
                    "Photograph ready for Studio"
                },
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (selectedUriLabel == null) {
                    "Select an image from your device to prepare the non-destructive workspace."
                } else {
                    selectedUriLabel
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(24.dp))

            if (selectedUriLabel == null) {
                Button(
                    onClick = onImportPhoto,
                    shape = MaterialTheme.shapes.small,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                ) {
                    Text(
                        text = "Import Photo",
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onImportPhoto,
                        shape = MaterialTheme.shapes.small,
                        border = BorderStroke(0.75.dp, MaterialTheme.colorScheme.onBackground)
                    ) {
                        Text(
                            text = "Replace",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                    OutlinedButton(
                        onClick = onClearSelection,
                        shape = MaterialTheme.shapes.small,
                        border = BorderStroke(0.75.dp, MaterialTheme.colorScheme.outline)
                    ) {
                        Text(
                            text = "Clear",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawCornerMark(
    color: Color,
    originX: Float,
    originY: Float,
    dx: Float,
    dy: Float,
    strokeWidth: Float
) {
    drawLine(
        color = color,
        start = Offset(originX, originY),
        end = Offset(originX + dx, originY),
        strokeWidth = strokeWidth
    )
    drawLine(
        color = color,
        start = Offset(originX, originY),
        end = Offset(originX, originY + dy),
        strokeWidth = strokeWidth
    )
}

@Composable
private fun EditingToolbarPlaceholder() {
    Column(modifier = Modifier.fillMaxWidth()) {
        EditorialDivider()
        Spacer(modifier = Modifier.height(14.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "EDITING TOOLBAR",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "WORKSTATION READY · SPRINT 1+",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.secondary
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            listOf("Presets", "Tone", "Color", "Grain").forEach { slot ->
                Text(
                    text = slot,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f)
                )
            }
        }
    }
}
