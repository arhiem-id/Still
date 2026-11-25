package com.arhiem.still.domain.model

import androidx.annotation.DrawableRes

/**
 * Editorial monograph feature displayed at the top of Discover.
 */
data class EditorialCollection(
    val id: String,
    val issueNumber: String,
    val title: String,
    val subtitle: String,
    val filmStockNote: String,
    val presetCount: Int,
    @DrawableRes val coverResId: Int
)

/**
 * Curated preset collection preview rendered in the Discover editorial index.
 */
data class PresetCollectionPreview(
    val id: String,
    val indexCode: String,
    val name: String,
    val toneDescription: String,
    val presetCount: Int,
    val profileTag: String,
    @DrawableRes val previewResId: Int
)

/**
 * Lightweight record of a recently used preset or collection.
 */
data class RecentUsageItem(
    val id: String,
    val title: String,
    val category: String,
    val timestampLabel: String
)

/**
 * Domain model for a favorite preset stored locally in the Library.
 */
data class FavoritePreset(
    val id: String,
    val name: String,
    val collectionName: String,
    val profileCode: String
)

/**
 * Domain model for a saved editing project stored locally in the Library.
 */
data class SavedProject(
    val id: String,
    val title: String,
    val aspectRatioLabel: String,
    val lastModifiedLabel: String
)

/**
 * Domain model for a recently edited photograph.
 */
data class EditedPhotoRecord(
    val id: String,
    val displayName: String,
    val resolutionLabel: String,
    val editedDateLabel: String
)
