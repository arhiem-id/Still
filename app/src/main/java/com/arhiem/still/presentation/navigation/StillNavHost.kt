package com.arhiem.still.presentation.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.arhiem.still.di.AppContainer
import com.arhiem.still.presentation.components.StillBottomBar
import com.arhiem.still.presentation.screens.discover.DiscoverScreen
import com.arhiem.still.presentation.screens.discover.DiscoverViewModel
import com.arhiem.still.presentation.screens.library.LibraryScreen
import com.arhiem.still.presentation.screens.library.LibraryViewModel
import com.arhiem.still.presentation.screens.studio.StudioScreen
import com.arhiem.still.presentation.screens.studio.StudioViewModel

@Composable
fun StillAppRoot(
    appContainer: AppContainer,
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val navigateToTopLevel: (StillDestination) -> Unit = { destination ->
        navController.navigate(destination.route) {
            popUpTo(navController.graph.findStartDestination().id) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            StillBottomBar(
                currentRoute = currentRoute,
                onSelectDestination = navigateToTopLevel
            )
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = StillDestination.Discover.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = innerPadding.calculateBottomPadding())
        ) {
            composable(route = StillDestination.Discover.route) {
                val discoverViewModel: DiscoverViewModel = viewModel(
                    factory = DiscoverViewModel.provideFactory(appContainer.discoverRepository)
                )
                DiscoverScreen(
                    viewModel = discoverViewModel,
                    onNavigateToStudio = { navigateToTopLevel(StillDestination.Studio) }
                )
            }

            composable(route = StillDestination.Studio.route) {
                val studioViewModel: StudioViewModel = viewModel(
                    factory = StudioViewModel.provideFactory(appContainer.renderEngine)
                )
                StudioScreen(viewModel = studioViewModel)
            }

            composable(route = StillDestination.Library.route) {
                val libraryViewModel: LibraryViewModel = viewModel(
                    factory = LibraryViewModel.provideFactory(appContainer.libraryRepository)
                )
                LibraryScreen(
                    viewModel = libraryViewModel,
                    onNavigateToDiscover = { navigateToTopLevel(StillDestination.Discover) },
                    onNavigateToStudio = { navigateToTopLevel(StillDestination.Studio) }
                )
            }
        }
    }
}
