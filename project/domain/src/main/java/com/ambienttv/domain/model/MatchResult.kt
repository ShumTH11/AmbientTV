package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Result of matching video and audio content, including score and tag analysis.
 */
@Serializable
public data class MatchResult(
    val score: Float,
    val priority: MatchPriority,
    val matchedTags: List<ContentTag>,
    val mismatchedTags: List<ContentTag>
)
