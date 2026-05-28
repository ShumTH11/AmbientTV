package com.ambienttv.data.remote.dto

import kotlinx.serialization.Serializable

/**
 * Top-level response from Pexels video search API.
 */
@Serializable
data class PexelsResponse(
    val page: Int = 1,
    val per_page: Int = 10,
    val total_results: Int = 0,
    val next_page: String? = null,
    val prev_page: String? = null,
    val videos: List<PexelsVideo> = emptyList()
)

/**
 * Individual video result from Pexels.
 */
@Serializable
data class PexelsVideo(
    val id: Long = 0,
    val width: Int = 0,
    val height: Int = 0,
    val url: String = "",
    val image: String = "",
    val duration: Int = 0,
    val user: PexelsUser = PexelsUser(),
    val video_files: List<PexelsVideoFile> = emptyList(),
    val video_pictures: List<PexelsVideoPicture> = emptyList()
)

/**
 * User information from Pexels.
 */
@Serializable
data class PexelsUser(
    val id: Long = 0,
    val name: String = "",
    val url: String = ""
)

/**
 * Individual video file with quality and format information.
 */
@Serializable
data class PexelsVideoFile(
    val id: Long = 0,
    val quality: String = "",
    val file_type: String = "",
    val width: Int? = null,
    val height: Int? = null,
    val link: String = ""
)

/**
 * Preview picture/thumbnail for a Pexels video.
 */
@Serializable
data class PexelsVideoPicture(
    val id: Long = 0,
    val picture: String = "",
    val nr: Int = 0
)
