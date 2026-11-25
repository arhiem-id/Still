package com.arhiem.still.di

import com.arhiem.still.data.local.CuratedCatalogDataSource
import com.arhiem.still.data.repository.OfflineDiscoverRepository
import com.arhiem.still.data.repository.OfflineLibraryRepository
import com.arhiem.still.domain.repository.DiscoverRepository
import com.arhiem.still.domain.repository.LibraryRepository
import com.arhiem.still.rendering.PlaceholderRenderEngine
import com.arhiem.still.rendering.StillRenderEngine

/**
 * Lightweight manual dependency container for STILL. Sprint 0.
 * Keeps wiring transparent and avoids unnecessary build-time codegen overhead.
 */
class AppContainer {

    private val curatedCatalogDataSource: CuratedCatalogDataSource by lazy {
        CuratedCatalogDataSource()
    }

    val discoverRepository: DiscoverRepository by lazy {
        OfflineDiscoverRepository(curatedCatalogDataSource)
    }

    val libraryRepository: LibraryRepository by lazy {
        OfflineLibraryRepository()
    }

    val renderEngine: StillRenderEngine by lazy {
        PlaceholderRenderEngine()
    }
}
