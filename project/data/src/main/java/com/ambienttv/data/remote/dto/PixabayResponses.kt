package com.ambienttv.data.remote.dto

import kotlinx.serialization.Serializable

/**
 * Top-level response from Pixabay video search API.
 */
@Serializable
data class PixabayResponse(
    val total: Int = 0,
    val totalHits: Int = 0,
    val hits: List<PixabayVideoHit> = emptyList()
)

/**
 * Individual video result from Pixabay.
 */
@Serializable
data class PixabayVideoHit(
    val id: Long = 0,
    val pageURL: String = "",
    val type: String = "",
    val tags: String = "",
    val duration: Int = 0,
    val picture_id: String = "",
    val videos: PixabayVideoFormats = PixabayVideoFormats(),
    val views: Int = 0,
    val downloads: Int = 0,
    val likes: Int = 0,
    val comments: Int = 0,
    val user_id: Long = 0,
    val user: String = "",
    val userImageURL: String = ""
)

/**
 * Available video formats/qualities from Pixabay.
 */
@Serializable
data class PixabayVideoFormats(
    val large: PixabayVideoFormat? = null,
    val medium: PixabayVideoFormat? = null,
    val small: PixabayVideoFormat? = null,
    val tiny: PixabayVideoFormat? = null
)

/**
 * Individual video format with URL and dimensions.
 */
@Serializable
data class PixabayVideoFormat(
    val url: String = "",
    val width: Int = 0,
    val height: Int = 0,
    val size: Int = 0
)
