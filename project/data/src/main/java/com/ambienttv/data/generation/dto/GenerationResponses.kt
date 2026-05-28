package com.ambienttv.data.generation.dto

import kotlinx.serialization.Serializable

/**
 * Request body for submitting a music generation job.
 */
@Serializable
data class MusicGenerationRequest(
    val prompt: String = "",
    val duration: Int = 30,
    val style: String? = null,
    val bpm: Int? = null,
    val callbackUrl: String? = null
)

/**
 * Request body for submitting a video generation job.
 */
@Serializable
data class VideoGenerationRequest(
    val prompt: String = "",
    val duration: Int = 5,
    val resolution: String = "720p",
    val style: String? = null,
    val callbackUrl: String? = null
)

/**
 * Response from a generation API when a job is submitted.
 */
@Serializable
data class GenerationSubmitResponse(
    val generationId: String = "",
    val status: String = "pending",
    val estimatedSeconds: Int? = null,
    val message: String? = null
)

/**
 * Status response for a running or completed generation job.
 */
@Serializable
data class GenerationStatusResponse(
    val generationId: String = "",
    val status: String = "pending", // pending, processing, completed, failed
    val progress: Float = 0.0f,
    val resultUrl: String? = null,
    val thumbnailUrl: String? = null,
    val duration: Int? = null,
    val error: String? = null,
    val createdAt: Long? = null,
    val completedAt: Long? = null
)

/**
 * Result of a completed generation job.
 */
@Serializable
data class GenerationResultResponse(
    val generationId: String = "",
    val downloadUrl: String = "",
    val thumbnailUrl: String? = null,
    val metadata: GenerationResultMetadata? = null
)

/**
 * Metadata associated with a generated media file.
 */
@Serializable
data class GenerationResultMetadata(
    val duration: Int? = null,
    val resolution: String? = null,
    val format: String? = null,
    val fileSize: Long? = null,
    val bpm: Int? = null,
    val style: String? = null
)
