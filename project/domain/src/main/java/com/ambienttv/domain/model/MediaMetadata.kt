package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Metadata for media content including duration, BPM, mood, and technical details.
 */
@Serializable
public data class MediaMetadata(
    val durationMs: Long = 0,
    val bpm: Float? = null,
    val musicalKey: String? = null,
    val mood: String? = null,
    val era: String? = null,
    val colorPalette: List<String> = emptyList(),
    val resolution: String? = null,
    val fileSize: Long = 0
)
