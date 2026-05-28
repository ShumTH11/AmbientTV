package com.ambienttv.ui.navigation

/**
 * Sealed class defining all navigation routes in the AmbientTV app.
 * Each screen has a unique route string used by the Navigation Compose NavHost.
 */
sealed class Screen(val route: String) {

    /**
     * Category browser - the main entry screen showing all content categories.
     */
    data object CategoryBrowser : Screen("categories")

    /**
     * Content pair player - full-screen video playback with synchronized audio.
     * Requires a pairId argument to load the specific content pair.
     */
    data object ContentPairPlayer : Screen("player/{pairId}") {
        /**
         * Creates the actual route string with the pairId argument filled in.
         */
        fun createRoute(pairId: String): String = "player/$pairId"
    }

    /**
     * Settings screen - content sources, AI configuration, and app preferences.
     */
    data object Settings : Screen("settings")

    /**
     * Ambient mode - minimal UI full-screen playback experience.
     */
    data object AmbientMode : Screen("ambient")

    /**
     * Favorites screen - user-saved content pairs.
     */
    data object Favorites : Screen("favorites")

    /**
     * History screen - recently played content pairs.
     */
    data object History : Screen("history")
}
