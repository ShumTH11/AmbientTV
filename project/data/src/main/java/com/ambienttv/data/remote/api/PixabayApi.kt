package com.ambienttv.data.remote.api

import com.ambienttv.data.remote.dto.PixabayResponse
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Retrofit API interface for Pixabay video search.
 * Provides access to royalty-free stock videos.
 */
interface PixabayApi {

    @GET("api/videos/")
    suspend fun searchVideos(
        @Query("q") query: String,
        @Query("per_page") perPage: Int = 10,
        @Query("video_type") videoType: String = "film"
    ): PixabayResponse

    companion object {
        const val BASE_URL = "https://pixabay.com/"
    }
}
