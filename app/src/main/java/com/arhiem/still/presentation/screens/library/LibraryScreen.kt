package com.arhiem.still.presentation.screens.library

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.arhiem.still.presentation.components.EditorialDivider
import com.arhiem.still.presentation.components.EditorialEmptyState

@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel,
    onNavigateToDiscover: () -> Unit,
    onNavigateToStudio: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = 24.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            Text(
                text = "Library",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "LOCAL ARCHIVE",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(14.dp))
        EditorialDivider()
        Spacer(modifier = Modifier.height(20.dp))

        // Editorial section selector (Favorites / Projects / Recent)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            LibrarySection.entries.forEach { section ->
                val isSelected = uiState.activeSection == section
                val count = when (section) {
                    LibrarySection.Favorites -> uiState.favoritePresets.size
                    LibrarySection.Projects -> uiState.savedProjects.size
                    LibrarySection.Recent -> uiState.recentlyEditedPhotos.size
                }

                Column(
                    modifier = Modifier
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            role = Role.Tab,
                            onClick = { viewModel.onSelectSection(section) }
                        )
                        .padding(vertical = 8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = section.label,
                            style = MaterialTheme.typography.titleMedium,
                            color = if (isSelected) {
                                MaterialTheme.colorScheme.onBackground
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                        Text(
                            text = count.toString().padStart(2, '0'),
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isSelected) {
                                MaterialTheme.colorScheme.secondary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Box(
                        modifier = Modifier
                            .height(1.5.dp)
                            .width(24.dp)
                            .background(
                                if (isSelected) MaterialTheme.colorScheme.onBackground
                                else MaterialTheme.colorScheme.background
                            )
                    )
                }
            }
        }

        EditorialDivider()
        Spacer(modifier = Modifier.height(12.dp))

        when (uiState.activeSection) {
            LibrarySection.Favorites -> {
                EditorialEmptyState(
                    metadataTag = "00 FAVORITE PRESETS",
                    title = "No saved presets yet",
                    description = "Bookmark color profiles you return to most and keep them ready offline.",
                    actionLabel = "Explore Discover ->",
                    onActionClick = onNavigateToDiscover
                )
            }

            LibrarySection.Projects -> {
                EditorialEmptyState(
                    metadataTag = "00 SAVED PROJECTS",
                    title = "No editorial projects yet",
                    description = "Non-destructive editing sessions created in Studio are stored privately on this device.",
                    actionLabel = "Open Studio ->",
                    onActionClick = onNavigateToStudio
                )
            }

            LibrarySection.Recent -> {
                EditorialEmptyState(
                    metadataTag = "00 RECENTLY EDITED",
                    title = "No edited photographs yet",
                    description = "Photographs exported or adjusted in Studio will appear in chronological order.",
                    actionLabel = "Import in Studio ->",
                    onActionClick = onNavigateToStudio
                )
            }
        }
    }
}
