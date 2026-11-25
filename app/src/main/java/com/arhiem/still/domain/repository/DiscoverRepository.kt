package com.arhiem.still.domain.repository

import com.arhiem.still.domain.model.EditorialCollection
import com.arhiem.still.domain.model.PresetCollectionPreview
import com.arhiem.still.domain.model.RecentUsageItem
import kotlinx.coroutines.flow.Flow

interface DiscoverRepository {
    fun observeFeaturedCollection(): Flow<EditorialCollection>
    fun observeCuratedCollections(): Flow<List<PresetCollectionPreview>>
    fun observeRecentlyUsed(): Flow<List<RecentUsageItem>>
}
