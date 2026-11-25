package com.arhiem.still.presentation.screens.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.arhiem.still.domain.model.EditedPhotoRecord
import com.arhiem.still.domain.model.FavoritePreset
import com.arhiem.still.domain.model.SavedProject
import com.arhiem.still.domain.repository.LibraryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

enum class LibrarySection(val label: String) {
    Favorites("Favorites"),
    Projects("Projects"),
    Recent("Recent")
}

data class LibraryUiState(
    val activeSection: LibrarySection = LibrarySection.Favorites,
    val favoritePresets: List<FavoritePreset> = emptyList(),
    val savedProjects: List<SavedProject> = emptyList(),
    val recentlyEditedPhotos: List<EditedPhotoRecord> = emptyList()
)

class LibraryViewModel(
    libraryRepository: LibraryRepository
) : ViewModel() {

    private val activeSectionFlow = MutableStateFlow(LibrarySection.Favorites)

    val uiState: StateFlow<LibraryUiState> = combine(
        activeSectionFlow,
        libraryRepository.observeFavoritePresets(),
        libraryRepository.observeSavedProjects(),
        libraryRepository.observeRecentlyEditedPhotos()
    ) { section, favorites, projects, recent ->
        LibraryUiState(
            activeSection = section,
            favoritePresets = favorites,
            savedProjects = projects,
            recentlyEditedPhotos = recent
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = LibraryUiState()
    )

    fun onSelectSection(section: LibrarySection) {
        activeSectionFlow.value = section
    }

    companion object {
        fun provideFactory(repository: LibraryRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return LibraryViewModel(repository) as T
                }
            }
    }
}
