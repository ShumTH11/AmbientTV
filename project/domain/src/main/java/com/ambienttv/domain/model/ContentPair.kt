package com.ambienttv.domain.model

import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * A matched pair of video and audio content with a compatibility score.
 */
@Serializable
public data class ContentPair(
    val id: String = UUID.randomUUID().toString(),
    val video: ContentItem,
    val audio: ContentItem,
    val matchScore: Float,
    val isUserOverride: Boolean = false
)
