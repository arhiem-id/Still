package com.arhiem.still.presentation.screens.discover

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.arhiem.still.domain.model.EditorialCollection
import com.arhiem.still.domain.model.PresetCollectionPreview
import com.arhiem.still.presentation.components.EditorialDivider
import com.arhiem.still.presentation.components.EditorialEmptyState
import com.arhiem.still.presentation.components.EditorialSectionHeader
import com.arhiem.still.presentation.components.StillWordmark

@Composable
fun DiscoverScreen(
    viewModel: DiscoverViewModel,
    onNavigateToStudio: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding(),
        contentPadding = PaddingValues(
            start = 24.dp,
            end = 24.dp,
            top = 28.dp,
            bottom = 48.dp
        )
    ) {
        item(key = "wordmark") {
            StillWordmark(
                subtitle = "THE EDITORIAL COLOR STUDIO"
            )
            Spacer(modifier = Modifier.height(24.dp))
            EditorialDivider()
            Spacer(modifier = Modifier.height(28.dp))
        }

        uiState.featuredCollection?.let { featured ->
            item(key = "featured_editorial") {
                FeaturedEditorialBlock(collection = featured)
                Spacer(modifier = Modifier.height(44.dp))
            }
        }

        item(key = "curated_header") {
            EditorialSectionHeader(
                title = "Curated Collections",
                metadata = "${uiState.curatedCollections.size} SERIES"
            )
            Spacer(modifier = Modifier.height(24.dp))
        }

        itemsIndexed(
            items = uiState.curatedCollections,
            key = { _, item -> item.id }
        ) { index, collection ->
            CuratedCollectionRow(collection = collection)
            if (index < uiState.curatedCollections.lastIndex) {
                Spacer(modifier = Modifier.height(28.dp))
                EditorialDivider()
                Spacer(modifier = Modifier.height(28.dp))
            }
        }

        item(key = "recently_used_section") {
            Spacer(modifier = Modifier.height(48.dp))
            EditorialSectionHeader(
                title = "Recently Used",
                metadata = "${uiState.recentlyUsed.size} ITEMS"
            )
            if (uiState.recentlyUsed.isEmpty()) {
                EditorialEmptyState(
                    metadataTag = "NO RECENT ACTIVITY",
                    title = "Your recent looks appear here",
                    description = "Color profiles applied in Studio are indexed locally for quick return.",
                    actionLabel = "Open Studio ->",
                    onActionClick = onNavigateToStudio
                )
            }
        }
    }
}

@Composable
private fun FeaturedEditorialBlock(
    collection: EditorialCollection
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = collection.issueNumber,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.secondary
            )
            Text(
                text = collection.filmStockNote,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Image(
            painter = painterResource(id = collection.coverResId),
            contentDescription = collection.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(3f / 4f)
        )
        Spacer(modifier = Modifier.height(20.dp))
        Text(
            text = collection.title,
            style = MaterialTheme.typography.displayMedium,
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = collection.subtitle,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "${collection.presetCount} PROFILES · OFFLINE EDITION",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun CuratedCollectionRow(
    collection: PresetCollectionPreview
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${collection.indexCode} · ${collection.profileTag}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "${collection.presetCount} LOOKS",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.secondary
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Image(
            painter = painterResource(id = collection.previewResId),
            contentDescription = collection.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(4f / 3f)
        )
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = collection.name,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = collection.toneDescription,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
