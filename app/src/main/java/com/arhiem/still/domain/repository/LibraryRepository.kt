package com.arhiem.still.domain.repository

import com.arhiem.still.domain.model.EditedPhotoRecord
import com.arhiem.still.domain.model.FavoritePreset
import com.arhiem.still.domain.model.SavedProject
import kotlinx.coroutines.flow.Flow

interface LibraryRepository {
    fun observeFavoritePresets(): Flow<List<FavoritePreset>>
    fun observeSavedProjects(): Flow<List<SavedProject>>
    fun observeRecentlyEditedPhotos(): Flow<List<EditedPhotoRecord>>
}
