package com.ambienttv.ai

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.preset.DefaultCategories
import java.util.Calendar
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Suggests a content category based on the device's local time and season.
 *
 * Rules:
 * - Night (22-06)  → calm ambient (Nature) or festive lights in December (Christmas)
 * - Morning (06-12)→ Nature / Relax
 * - Day (12-18)    → Fantasy / Steampunk
 * - Evening (18-22)→ Cyberpunk / Sci-Fi
 *
 * Seasonal overrides:
 * - December evenings/nights → Christmas
 * - June-August mornings     → Nature (summer vibes)
 */
@Singleton
class TimeAwareCategoryProvider @Inject constructor() {

    fun suggestCategory(): ContentCategory {
        val calendar = Calendar.getInstance()
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        val month = calendar.get(Calendar.MONTH) // 0 = January, 11 = December

        val baseCategory = when (hour) {
            in 6..11 -> DefaultCategories.NATURE   // Morning
            in 12..17 -> DefaultCategories.FANTASY // Day
            in 18..21 -> DefaultCategories.CYBERPUNK // Evening
            else -> DefaultCategories.NATURE       // Night
        }

        // Seasonal overrides
        return when {
            // December festive season — Christmas in evening/night
            month == Calendar.DECEMBER && hour >= 17 -> DefaultCategories.CHRISTMAS
            // Late December any time
            month == Calendar.DECEMBER && calendar.get(Calendar.DAY_OF_MONTH) >= 20 -> DefaultCategories.CHRISTMAS
            // Summer mornings
            month in listOf(Calendar.JUNE, Calendar.JULY, Calendar.AUGUST) && hour in 5..10 -> DefaultCategories.NATURE
            else -> baseCategory
        }
    }

    /**
     * Returns a human-readable label explaining why this category was suggested.
     */
    fun suggestionReason(category: ContentCategory): String {
        val calendar = Calendar.getInstance()
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        return when {
            category.id == "christmas" -> "Festive season pick"
            category.id == "nature" && hour in 5..11 -> "Morning calm"
            category.id == "cyberpunk" -> "Evening vibes"
            category.id == "fantasy" -> "Afternoon epic"
            else -> "Recommended for you"
        }
    }
}
