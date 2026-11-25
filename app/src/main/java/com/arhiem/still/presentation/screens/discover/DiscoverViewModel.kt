package com.arhiem.still.presentation.screens.discover

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.arhiem.still.domain.model.EditorialCollection
import com.arhiem.still.domain.model.PresetCollectionPreview
import com.arhiem.still.domain.model.RecentUsageItem
import com.arhiem.still.domain.repository.DiscoverRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

data class DiscoverUiState(
    val featuredCollection: EditorialCollection? = null,
    val curatedCollections: List<PresetCollectionPreview> = emptyList(),
    val recentlyUsed: List<RecentUsageItem> = emptyList()
)

class DiscoverViewModel(
    discoverRepository: DiscoverRepository
) : ViewModel() {

    val uiState: StateFlow<DiscoverUiState> = combine(
        discoverRepository.observeFeaturedCollection(),
        discoverRepository.observeCuratedCollections(),
        discoverRepository.observeRecentlyUsed()
    ) { featured, curated, recent ->
        DiscoverUiState(
            featuredCollection = featured,
            curatedCollections = curated,
            recentlyUsed = recent
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = DiscoverUiState()
    )

    companion object {
        fun provideFactory(repository: DiscoverRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return DiscoverViewModel(repository) as T
                }
            }
    }
}
