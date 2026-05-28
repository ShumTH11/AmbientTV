package com.ambienttv.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import com.ambienttv.feature.favorites.FavoritesScreen
import com.ambienttv.feature.history.HistoryScreen
import com.ambienttv.ui.navigation.Screen
import com.ambienttv.ui.screen.AmbientModeScreen
import com.ambienttv.ui.screen.CategoryBrowserScreen
import com.ambienttv.ui.screen.ContentPairPlayerScreen
import com.ambienttv.ui.screen.SettingsScreen

/**
 * TV Navigation host for AmbientTV.
 *
 * Sets up the Navigation Compose NavHost with all routes for the app.
 * Lives in the :app module to avoid circular dependencies between :ui and :feature:* modules.
 *
 * @param navController The navigation controller for managing screen transitions
 * @param startDestination The initial route to display (defaults to category browser)
 */
@Composable
fun TvNavigation(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.CategoryBrowser.route,
    startPairId: String? = null
) {
    LaunchedEffect(startPairId) {
        if (!startPairId.isNullOrBlank()) {
            navController.navigate(Screen.ContentPairPlayer.createRoute(startPairId)) {
                popUpTo(Screen.CategoryBrowser.route) { inclusive = false }
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Category Browser - main entry screen
        composable(route = Screen.CategoryBrowser.route) {
            CategoryBrowserScreen(
                onCategorySelected = { category ->
                    navController.navigate(
                        Screen.ContentPairPlayer.createRoute(pairId = category.id)
                    )
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onNavigateToFavorites = {
                    navController.navigate(Screen.Favorites.route)
                },
                onNavigateToHistory = {
                    navController.navigate(Screen.History.route)
                }
            )
        }

        // Content Pair Player - full-screen video playback
        composable(
            route = Screen.ContentPairPlayer.route,
            arguments = listOf(
                navArgument("pairId") {
                    type = NavType.StringType
                }
            )
        ) { backStackEntry ->
            val pairId = backStackEntry.arguments?.getString("pairId") ?: ""

            val placeholderCategory = ContentCategory(
                id = pairId,
                name = "Loading...",
                description = "",
                defaultTags = emptyList()
            )

            val placeholderPair = ContentPair(
                id = pairId,
                video = ContentItem(
                    id = "placeholder_video",
                    type = MediaType.VIDEO,
                    source = ContentSource.LOCAL,
                    uri = "",
                    title = "Loading...",
                    tags = emptyList(),
                    category = placeholderCategory,
                    licenseType = LicenseType.FREE,
                    metadata = MediaMetadata()
                ),
                audio = ContentItem(
                    id = "placeholder_audio",
                    type = MediaType.AUDIO,
                    source = ContentSource.LOCAL,
                    uri = "",
                    title = "Loading...",
                    tags = emptyList(),
                    category = placeholderCategory,
                    licenseType = LicenseType.FREE,
                    metadata = MediaMetadata()
                ),
                matchScore = 0f
            )

            ContentPairPlayerScreen(
                pair = placeholderPair,
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        // Settings screen
        composable(route = Screen.Settings.route) {
            SettingsScreen(
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        // Ambient Mode screen
        composable(route = Screen.AmbientMode.route) {
            AmbientModeScreen(
                onExit = {
                    navController.popBackStack()
                }
            )
        }

        // Favorites screen
        composable(route = Screen.Favorites.route) {
            FavoritesScreen(
                onBack = {
                    navController.popBackStack()
                },
                onPlayPair = { pair ->
                    navController.navigate(
                        Screen.ContentPairPlayer.createRoute(pairId = pair.id)
                    )
                }
            )
        }

        // History screen
        composable(route = Screen.History.route) {
            HistoryScreen(
                onBack = {
                    navController.popBackStack()
                },
                onPlayPair = { pair ->
                    navController.navigate(
                        Screen.ContentPairPlayer.createRoute(pairId = pair.id)
                    )
                }
            )
        }
    }
}
