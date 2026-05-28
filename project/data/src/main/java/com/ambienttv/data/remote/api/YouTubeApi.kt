package com.ambienttv.data.remote.api

import com.ambienttv.data.remote.dto.YouTubeSearchResponse
import com.ambienttv.data.remote.dto.YouTubeSnippet
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Retrofit API interface for YouTube Data API v3.
 * Provides video search functionality for ambient content.
 */
interface YouTubeApi {

    @GET("youtube/v3/search")
    suspend fun searchVideos(
        @Query("q") query: String,
        @Query("maxResults") maxResults: Int = 10,
        @Query("type") type: String = "video",
        @Query("videoDuration") duration: String = "short",
        @Query("part") part: String = "snippet"
    ): YouTubeSearchResponse

    @GET("youtube/v3/videos")
    suspend fun getVideoDetails(
        @Query("id") videoId: String,
        @Query("part") part: String = "contentDetails,snippet"
    ): YouTubeVideoDetailsResponse

    companion object {
        const val BASE_URL = "https://www.googleapis.com/"
    }
}

/**
 * Response wrapper for YouTube video details API.
 */
@kotlinx.serialization.Serializable
data class YouTubeVideoDetailsResponse(
    val items: List<YouTubeVideoDetailItem> = emptyList()
)

/**
 * Individual video detail item from YouTube API.
 */
@kotlinx.serialization.Serializable
data class YouTubeVideoDetailItem(
    val id: String = "",
    val contentDetails: YouTubeContentDetails? = null,
    val snippet: YouTubeSnippet? = null
)

/**
 * Content details section of a YouTube video.
 */
@kotlinx.serialization.Serializable
data class YouTubeContentDetails(
    val duration: String? = null
)
