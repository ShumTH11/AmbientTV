package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Represents the current ambient environment profile detected by AI analysis,
 * combining audio and visual fingerprints to suggest content categories.
 */
@Serializable
public data class AmbientProfile(
    val audioFingerprint: AudioFeatures? = null,
    val visualFingerprint: VisualFeatures? = null,
    val suggestedCategory: ContentCategory? = null,
    val timestamp: Long = System.currentTimeMillis()
)
