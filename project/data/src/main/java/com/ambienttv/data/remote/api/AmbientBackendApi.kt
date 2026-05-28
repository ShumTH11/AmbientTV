package com.ambienttv.data.remote.api

import com.ambienttv.data.catalog.CatalogDto
import com.ambienttv.data.remote.dto.PexelsResponse
import com.ambienttv.data.remote.dto.PixabayResponse
import com.ambienttv.data.remote.dto.YouTubeSearchResponse
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * API interface for the AmbientTV backend server.
 *
 * The backend acts as a secure proxy: it holds all third-party API keys
 * (Pexels, Pixabay, YouTube, Coverr) and performs searches on behalf of
 * the Android TV app. This prevents key extraction from the APK.
 *
 * Base URL: `http://10.0.2.2:3000/` for Android Emulator,
 * or your deployed server address for production.
 */
interface AmbientBackendApi {

    /**
     * Returns the curated content catalog (same JSON bundled in assets).
     * In production this can be enriched with server-side updates.
     */
    @GET("api/catalog")
    suspend fun getCatalog(): CatalogDto

    /**
     * Proxied Pexels video search.
     */
    @GET("api/search/pexels")
    suspend fun searchPexels(
        @Query("query") query: String,
        @Query("per_page") perPage: Int = 10
    ): PexelsResponse

    /**
     * Proxied Pixabay video search.
     */
    @GET("api/search/pixabay")
    suspend fun searchPixabay(
        @Query("query") query: String,
        @Query("per_page") perPage: Int = 10
    ): PixabayResponse

    /**
     * Proxied YouTube Data API v3 search.
     */
    @GET("api/search/youtube")
    suspend fun searchYouTube(
        @Query("query") query: String,
        @Query("maxResults") maxResults: Int = 10
    ): YouTubeSearchResponse

    /**
     * Proxied Internet Archive search.
     */
    @GET("api/search/archive")
    suspend fun searchInternetArchive(
        @Query("query") query: String,
        @Query("rows") rows: Int = 10
    ): com.ambienttv.data.remote.dto.InternetArchiveResponse

    companion object {
        /**
         * Base URL for the AmbientTV backend.
         *
         * Local development:
         *   • Android Emulator → `http://10.0.2.2:3000/`
         *   • Real device (same Wi-Fi) → `http://YOUR_PC_IP:3000/`
         *     Find IP: Get-NetIPAddress (PowerShell) or ipconfig
         *
         * Production (Fly.io / Cloud Run / etc):
         *   • `https://ambienttv-backend.fly.dev/`
         */
        const val BASE_URL = "http://10.0.2.2:3000/"
    }
}
