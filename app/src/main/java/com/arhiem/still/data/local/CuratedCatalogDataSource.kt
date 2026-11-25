package com.arhiem.still.data.local

import com.arhiem.still.R
import com.arhiem.still.domain.model.EditorialCollection
import com.arhiem.still.domain.model.PresetCollectionPreview

/**
 * Offline-first curated catalog bundled with the application.
 * Supplies photography-led editorial collections for Discover without network dependencies.
 */
class CuratedCatalogDataSource {

    fun getFeaturedCollection(): EditorialCollection = EditorialCollection(
        id = "issue-01-travertine",
        issueNumber = "ISSUE 01",
        title = "Light on Limestone",
        subtitle = "Warm architectural daylight, restrained skin tones, and medium-format latitude.",
        filmStockNote = "120MM · PORTRAIT STUDY",
        presetCount = 6,
        coverResId = R.drawable.editorial_featured
    )

    fun getCuratedCollections(): List<PresetCollectionPreview> = listOf(
        PresetCollectionPreview(
            id = "col-noir-silver",
            indexCode = "01",
            name = "Noir Silver",
            toneDescription = "High-acutance silver gelatin contrast with deep ink shadows.",
            presetCount = 5,
            profileTag = "MONOCHROME",
            previewResId = R.drawable.preset_monochrome
        ),
        PresetCollectionPreview(
            id = "col-travertine",
            indexCode = "02",
            name = "Travertine",
            toneDescription = "Sun-washed plaster warmth, muted sand midtones, soft roll-off.",
            presetCount = 6,
            profileTag = "DAYLIGHT",
            previewResId = R.drawable.preset_travertine
        ),
        PresetCollectionPreview(
            id = "col-herbarium",
            indexCode = "03",
            name = "Herbarium",
            toneDescription = "Overcast botanical greens balanced with quiet olive and slate.",
            presetCount = 4,
            profileTag = "NATURAL",
            previewResId = R.drawable.preset_herbarium
        ),
        PresetCollectionPreview(
            id = "col-atelier",
            indexCode = "04",
            name = "Atelier",
            toneDescription = "Directional northern window light calibrated for editorial wool and stone.",
            presetCount = 5,
            profileTag = "INTERIOR",
            previewResId = R.drawable.preset_atelier
        )
    )
}
