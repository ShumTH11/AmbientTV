package com.ambienttv.data.remote.api

import com.ambienttv.data.remote.dto.PexelsResponse
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Retrofit API interface for Pexels video search.
 * Provides access to high-quality free stock videos.
 */
interface PexelsApi {

    @GET("videos/search")
    suspend fun searchVideos(
        @Query("query") query: String,
        @Query("per_page") perPage: Int = 10,
        @Query("orientation") orientation: String = "landscape"
    ): PexelsResponse

    companion object {
        const val BASE_URL = "https://api.pexels.com/"
    }
}
