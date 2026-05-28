package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Represents a tag associated with content, used for matching and categorization.
 */
@Serializable
public data class ContentTag(
    val key: String,
    val value: String,
    val confidence: Float = 1.0f
)
