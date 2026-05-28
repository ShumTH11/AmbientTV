package com.ambienttv.domain.preset

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentTag

/**
 * Pre-defined content categories shipped with the app.
 * Users can select from these defaults or create custom categories.
 */
public object DefaultCategories {

    /**
     * Festive winter scenes with holiday music.
     */
    public val CHRISTMAS: ContentCategory = ContentCategory(
        id = "christmas",
        name = "Christmas & New Year",
        description = "Festive winter scenes with holiday music",
        defaultTags = listOf(
            ContentTag("mood", "festive"),
            ContentTag("era", "modern"),
            ContentTag("season", "winter"),
            ContentTag("colorPalette", "red,green,gold,white")
        )
    )

    /**
     * Enchanted realms and medieval landscapes.
     */
    public val FANTASY: ContentCategory = ContentCategory(
        id = "fantasy",
        name = "Fantasy & Medieval",
        description = "Enchanted realms and medieval landscapes",
        defaultTags = listOf(
            ContentTag("mood", "epic"),
            ContentTag("era", "medieval"),
            ContentTag("genre", "fantasy"),
            ContentTag("colorPalette", "green,brown,gold")
        )
    )

    /**
     * Futuristic neon cities and space vistas.
     */
    public val CYBERPUNK: ContentCategory = ContentCategory(
        id = "cyberpunk",
        name = "Cyberpunk & Sci-Fi",
        description = "Futuristic neon cities and space vistas",
        defaultTags = listOf(
            ContentTag("mood", "dark"),
            ContentTag("era", "future"),
            ContentTag("genre", "sci-fi"),
            ContentTag("colorPalette", "neon-blue,purple,pink,black")
        )
    )

    /**
     * Calming natural scenery with ambient sounds.
     */
    public val NATURE: ContentCategory = ContentCategory(
        id = "nature",
        name = "Nature & Relax",
        description = "Calming natural scenery with ambient sounds",
        defaultTags = listOf(
            ContentTag("mood", "calm"),
            ContentTag("era", "timeless"),
            ContentTag("genre", "ambient"),
            ContentTag("colorPalette", "green,blue,brown")
        )
    )

    /**
     * Victorian industrial steam-powered worlds.
     */
    public val STEAMPUNK: ContentCategory = ContentCategory(
        id = "steampunk",
        name = "Steampunk",
        description = "Victorian industrial steam-powered worlds",
        defaultTags = listOf(
            ContentTag("mood", "industrial"),
            ContentTag("era", "victorian"),
            ContentTag("genre", "steampunk"),
            ContentTag("colorPalette", "bronze,copper,brown,gold")
        )
    )

    /**
     * List of all default categories for easy iteration.
     */
    public val ALL: List<ContentCategory> = listOf(
        CHRISTMAS,
        FANTASY,
        CYBERPUNK,
        NATURE,
        STEAMPUNK
    )
}
