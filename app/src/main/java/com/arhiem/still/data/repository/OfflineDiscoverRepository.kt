package com.arhiem.still.data.repository

import com.arhiem.still.data.local.CuratedCatalogDataSource
import com.arhiem.still.domain.model.EditorialCollection
import com.arhiem.still.domain.model.PresetCollectionPreview
import com.arhiem.still.domain.model.RecentUsageItem
import com.arhiem.still.domain.repository.DiscoverRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flowOf

class OfflineDiscoverRepository(
    private val catalogDataSource: CuratedCatalogDataSource
) : DiscoverRepository {

    private val recentlyUsedFlow = MutableStateFlow<List<RecentUsageItem>>(emptyList())

    override fun observeFeaturedCollection(): Flow<EditorialCollection> =
        flowOf(catalogDataSource.getFeaturedCollection())

    override fun observeCuratedCollections(): Flow<List<PresetCollectionPreview>> =
        flowOf(catalogDataSource.getCuratedCollections())

    override fun observeRecentlyUsed(): Flow<List<RecentUsageItem>> =
        recentlyUsedFlow.asStateFlow()
}
