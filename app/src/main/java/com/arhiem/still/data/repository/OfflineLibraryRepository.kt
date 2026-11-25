package com.arhiem.still.data.repository

import com.arhiem.still.domain.model.EditedPhotoRecord
import com.arhiem.still.domain.model.FavoritePreset
import com.arhiem.still.domain.model.SavedProject
import com.arhiem.still.domain.repository.LibraryRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Sprint 0 offline Library repository.
 * Emits empty local collections until persistence and editing workflows are introduced in later sprints.
 */
class OfflineLibraryRepository : LibraryRepository {

    private val favoritePresets = MutableStateFlow<List<FavoritePreset>>(emptyList())
    private val savedProjects = MutableStateFlow<List<SavedProject>>(emptyList())
    private val recentlyEditedPhotos = MutableStateFlow<List<EditedPhotoRecord>>(emptyList())

    override fun observeFavoritePresets(): Flow<List<FavoritePreset>> =
        favoritePresets.asStateFlow()

    override fun observeSavedProjects(): Flow<List<SavedProject>> =
        savedProjects.asStateFlow()

    override fun observeRecentlyEditedPhotos(): Flow<List<EditedPhotoRecord>> =
        recentlyEditedPhotos.asStateFlow()
}
