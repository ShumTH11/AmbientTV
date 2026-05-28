package com.ambienttv.data.remote.api

import com.ambienttv.data.remote.dto.InternetArchiveResponse
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Retrofit API interface for Internet Archive metadata API.
 * Provides access to public domain and Creative Commons media.
 */
interface InternetArchiveApi {

    @GET("advancedsearch.php")
    suspend fun searchItems(
        @Query("q") query: String,
        @Query("rows") rows: Int = 10,
        @Query("page") page: Int = 1,
        @Query("output") output: String = "json",
        @Query("fl[]") fields: List<String> = listOf("identifier", "title", "description", "mediatype", "licenseurl")
    ): InternetArchiveResponse

    @GET("metadata/{identifier}")
    suspend fun getItemMetadata(
        @retrofit2.http.Path("identifier") identifier: String
    ): InternetArchiveMetadataResponse

    companion object {
        const val BASE_URL = "https://archive.org/"
    }
}

/**
 * Response wrapper for Internet Archive item metadata.
 */
@kotlinx.serialization.Serializable
data class InternetArchiveMetadataResponse(
    val metadata: InternetArchiveItemMetadata? = null,
    val files: List<InternetArchiveFile> = emptyList()
)

/**
 * Metadata section of an Internet Archive item.
 */
@kotlinx.serialization.Serializable
data class InternetArchiveItemMetadata(
    val identifier: List<String>? = null,
    val title: List<String>? = null,
    val description: List<String>? = null,
    val mediatype: List<String>? = null,
    val creator: List<String>? = null,
    val licenseurl: List<String>? = null
)

/**
 * File entry within an Internet Archive item.
 */
@kotlinx.serialization.Serializable
data class InternetArchiveFile(
    val name: String = "",
    val format: String = "",
    val length: String? = null,
    val source: String? = null
)
