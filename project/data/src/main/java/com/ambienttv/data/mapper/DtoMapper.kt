package com.ambienttv.data.mapper

import com.ambienttv.data.remote.dto.InternetArchiveDoc
import com.ambienttv.data.remote.dto.PexelsVideo
import com.ambienttv.data.remote.dto.PixabayVideoHit
import com.ambienttv.data.remote.dto.YouTubeSearchItem
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.preset.DefaultCategories
import java.util.UUID
import javax.inject.Inject

/**
 * Maps between API DTOs and domain models.
 * Converts remote API responses into domain ContentItem objects.
 */
class DtoMapper @Inject constructor() {

    /**
     * Maps a YouTube search result item to a ContentItem.
     */
    fun mapYouTubeItemToContentItem(item: YouTubeSearchItem): ContentItem? {
        val videoId = item.id.videoId
        if (videoId.isBlank()) return null

        val snippet = item.snippet ?: return null
        val thumbnailUrl = snippet.thumbnails?.medium?.url
            ?: snippet.thumbnails?.default?.url
            ?: ""

        val category = inferCategoryFromText(snippet.title + " " + snippet.description)

        return ContentItem(
            id = "youtube_$videoId",
            type = MediaType.VIDEO,
            source = ContentSource.YOUTUBE,
            uri = "https://www.youtube.com/watch?v=$videoId",
            title = snippet.title.ifBlank { "YouTube Video" },
            tags = listOf(
                ContentTag("source", "youtube", 1.0f),
                ContentTag("channel", snippet.channelTitle ?: "unknown", 0.5f)
            ) + category.defaultTags.take(3),
            category = category,
            licenseType = LicenseType.PROPRIETARY,
            metadata = MediaMetadata(
                resolution = "720p",
                colorPalette = category.defaultTags.find { it.key == "colorPalette" }?.value?.split(",")
                    ?: emptyList()
            ),
            localPath = null
        )
    }

    /**
     * Maps a Pixabay video hit to a ContentItem.
     */
    fun mapPixabayHitToContentItem(hit: PixabayVideoHit): ContentItem {
        val category = inferCategoryFromText(hit.tags + " " + hit.type)
        val videoUrl = hit.videos.medium?.url
            ?: hit.videos.small?.url
            ?: hit.pageURL

        return ContentItem(
            id = "pixabay_${hit.id}",
            type = MediaType.VIDEO,
            source = ContentSource.PIXABAY,
            uri = videoUrl,
            title = if (hit.tags.isNotBlank()) hit.tags.split(",").first().trim()
                .replaceFirstChar { it.uppercase() } else "Pixabay Video",
            tags = hit.tags.split(",").map { tag ->
                ContentTag("keyword", tag.trim(), 0.7f)
            } + category.defaultTags.take(2),
            category = category,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata(
                durationMs = hit.duration * 1000L,
                resolution = "${hit.videos.medium?.width ?: 0}x${hit.videos.medium?.height ?: 0}",
                colorPalette = category.defaultTags.find { it.key == "colorPalette" }?.value?.split(",")
                    ?: emptyList(),
                fileSize = hit.videos.medium?.size?.toLong() ?: 0
            ),
            localPath = null
        )
    }

    /**
     * Maps a Pexels video to a ContentItem.
     */
    fun mapPexelsVideoToContentItem(video: PexelsVideo): ContentItem {
        val category = inferCategoryFromText(video.url)
        val bestFile = video.video_files
            .filter { it.quality == "sd" || it.quality == "hd" }
            .maxByOrNull { it.width ?: 0 }
            ?: video.video_files.firstOrNull()

        return ContentItem(
            id = "pexels_${video.id}",
            type = MediaType.VIDEO,
            source = ContentSource.PEXELS,
            uri = bestFile?.link ?: video.url,
            title = "${video.user.name} Video",
            tags = listOf(
                ContentTag("source", "pexels", 1.0f),
                ContentTag("photographer", video.user.name, 0.5f)
            ) + category.defaultTags.take(3),
            category = category,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata(
                durationMs = video.duration * 1000L,
                resolution = "${video.width}x${video.height}",
                colorPalette = category.defaultTags.find { it.key == "colorPalette" }?.value?.split(",")
                    ?: emptyList()
            ),
            localPath = null
        )
    }

    /**
     * Maps an Internet Archive document to a ContentItem.
     */
    fun mapInternetArchiveDocToContentItem(doc: InternetArchiveDoc): ContentItem? {
        if (doc.identifier.isBlank()) return null

        val mediatype = doc.mediatype ?: "movies"
        val mediaType = if (mediatype == "audio") MediaType.AUDIO else MediaType.VIDEO
        val category = inferCategoryFromText((doc.title ?: "") + " " + (doc.description ?: ""))

        val licenseType = when {
            doc.licenseurl.isNullOrBlank() -> LicenseType.CREATIVE_COMMONS
            doc.licenseurl.contains("publicdomain") || doc.licenseurl.contains("cc0")
                || doc.licenseurl.contains("zero") -> LicenseType.CC0
            else -> LicenseType.CREATIVE_COMMONS
        }

        return ContentItem(
            id = "ia_${doc.identifier}",
            type = mediaType,
            source = ContentSource.INTERNET_ARCHIVE,
            uri = "https://archive.org/download/${doc.identifier}/${doc.identifier}.mp4",
            title = doc.title ?: "Internet Archive Item",
            tags = listOf(
                ContentTag("source", "internet_archive", 1.0f),
                ContentTag("mediatype", mediatype, 0.5f)
            ) + category.defaultTags.take(2),
            category = category,
            licenseType = licenseType,
            metadata = MediaMetadata(
                colorPalette = category.defaultTags.find { it.key == "colorPalette" }?.value?.split(",")
                    ?: emptyList()
            ),
            localPath = null
        )
    }

    /**
     * Infers a content category from descriptive text using keyword matching.
     */
    private fun inferCategoryFromText(text: String): ContentCategory {
        val lower = text.lowercase()
        var bestCategory = DefaultCategories.NATURE
        var bestScore = 0

        val categoryKeywords = mapOf(
            DefaultCategories.CHRISTMAS to listOf(
                "christmas", "xmas", "santa", "holiday", "festive", "snow", "winter",
                "reindeer", "tree", " Noel", "gift"
            ),
            DefaultCategories.FANTASY to listOf(
                "fantasy", "medieval", "castle", "dragon", "magic", "enchant",
                "wizard", "knight", "fairy", "mythical", "kingdom"
            ),
            DefaultCategories.CYBERPUNK to listOf(
                "cyberpunk", "sci-fi", "scifi", "futuristic", "neon", "tech",
                "cyber", "robot", "future", "space", "digital", "synth"
            ),
            DefaultCategories.STEAMPUNK to listOf(
                "steampunk", "steam", "victorian", "industrial", "gear",
                "clockwork", "brass", "copper", "mechanical", "punk"
            ),
            DefaultCategories.NATURE to listOf(
                "nature", "ambient", "relax", "calm", "forest", "ocean",
                "rain", "peaceful", "landscape", "mountain", "river", "sky"
            )
        )

        for ((category, keywords) in categoryKeywords) {
            val score = keywords.count { lower.contains(it) }
            if (score > bestScore) {
                bestScore = score
                bestCategory = category
            }
        }

        return bestCategory
    }
}
