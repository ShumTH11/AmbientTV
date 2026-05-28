package com.ambienttv.data.remote.dto

import kotlinx.serialization.Serializable

/**
 * Top-level response from YouTube Data API search endpoint.
 */
@Serializable
data class YouTubeSearchResponse(
    val kind: String = "",
    val etag: String = "",
    val nextPageToken: String? = null,
    val prevPageToken: String? = null,
    val pageInfo: YouTubePageInfo = YouTubePageInfo(),
    val items: List<YouTubeSearchItem> = emptyList()
)

/**
 * Page info within a YouTube search response.
 */
@Serializable
data class YouTubePageInfo(
    val totalResults: Int = 0,
    val resultsPerPage: Int = 0
)

/**
 * Individual search result item from YouTube.
 */
@Serializable
data class YouTubeSearchItem(
    val kind: String = "",
    val etag: String = "",
    val id: YouTubeVideoId = YouTubeVideoId(),
    val snippet: YouTubeSnippet? = null
)

/**
 * Video identifier within a YouTube search result.
 */
@Serializable
data class YouTubeVideoId(
    val kind: String = "",
    val videoId: String = ""
)

/**
 * Snippet containing video metadata from YouTube.
 */
@Serializable
data class YouTubeSnippet(
    val publishedAt: String? = null,
    val channelId: String? = null,
    val title: String = "",
    val description: String = "",
    val channelTitle: String? = null,
    val thumbnails: YouTubeThumbnails? = null,
    val liveBroadcastContent: String? = null
)

/**
 * Thumbnail URLs for a YouTube video at various resolutions.
 */
@Serializable
data class YouTubeThumbnails(
    val default: YouTubeThumbnail? = null,
    val medium: YouTubeThumbnail? = null,
    val high: YouTubeThumbnail? = null,
    val standard: YouTubeThumbnail? = null,
    val maxres: YouTubeThumbnail? = null
)

/**
 * Individual thumbnail URL and dimensions.
 */
@Serializable
data class YouTubeThumbnail(
    val url: String = "",
    val width: Int? = null,
    val height: Int? = null
)
