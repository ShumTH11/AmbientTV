package com.ambienttv.domain.preset

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType

/**
 * Offline placeholder media bundled in the app.
 * Used as a graceful fallback when no network content is available.
 */
object PlaceholderContent {

    private const val VIDEO_URI = "android.resource://com.ambienttv.app/raw/placeholder_video"
    private const val AUDIO_URI = "android.resource://com.ambienttv.app/raw/placeholder_audio"

    fun createPlaceholderPair(category: ContentCategory): ContentPair {
        return ContentPair(
            id = "placeholder_${category.id}",
            video = ContentItem(
                id = "placeholder_video",
                type = MediaType.VIDEO,
                source = ContentSource.LOCAL,
                uri = VIDEO_URI,
                title = "Offline Placeholder",
                tags = emptyList(),
                category = category,
                licenseType = LicenseType.FREE,
                metadata = MediaMetadata(durationMs = 2000)
            ),
            audio = ContentItem(
                id = "placeholder_audio",
                type = MediaType.AUDIO,
                source = ContentSource.LOCAL,
                uri = AUDIO_URI,
                title = "Offline Placeholder",
                tags = emptyList(),
                category = category,
                licenseType = LicenseType.FREE,
                metadata = MediaMetadata(durationMs = 2000)
            ),
            matchScore = 0f,
            isUserOverride = false
        )
    }
}
