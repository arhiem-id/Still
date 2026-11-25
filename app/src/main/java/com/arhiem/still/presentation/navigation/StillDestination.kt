package com.arhiem.still.presentation.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesomeMosaic
import androidx.compose.material.icons.outlined.CollectionsBookmark
import androidx.compose.material.icons.outlined.CropOriginal
import androidx.compose.ui.graphics.vector.ImageVector
import com.arhiem.still.R

enum class StillDestination(
    val route: String,
    @StringRes val labelResId: Int,
    val icon: ImageVector
) {
    Discover(
        route = "discover",
        labelResId = R.string.nav_discover,
        icon = Icons.Outlined.AutoAwesomeMosaic
    ),
    Studio(
        route = "studio",
        labelResId = R.string.nav_studio,
        icon = Icons.Outlined.CropOriginal
    ),
    Library(
        route = "library",
        labelResId = R.string.nav_library,
        icon = Icons.Outlined.CollectionsBookmark
    )
}
