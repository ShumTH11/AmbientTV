package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Extracted audio features used for AI-based content matching.
 */
@Serializable
public data class AudioFeatures(
    val bpm: Float,
    val key: String?,
    val mood: String?,
    val genre: String?,
    val spectralCentroid: Float? = null
)
