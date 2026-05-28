package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Extracted visual features used for AI-based content matching.
 */
@Serializable
public data class VisualFeatures(
    val dominantColors: List<String>,
    val motionLevel: Float,
    val sceneType: String?,
    val brightness: Float
)
