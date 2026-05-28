package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Represents a content category with associated tags for matching video/audio pairs.
 */
@Serializable
public data class ContentCategory(
    val id: String,
    val name: String,
    val description: String,
    val defaultTags: List<ContentTag>,
    val thumbnailUrl: String? = null
)
