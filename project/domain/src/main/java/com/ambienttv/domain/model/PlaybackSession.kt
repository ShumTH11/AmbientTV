package com.ambienttv.domain.model

import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * Represents an active playback session of a content pair.
 */
@Serializable
public data class PlaybackSession(
    val pair: ContentPair,
    val sessionId: String = UUID.randomUUID().toString(),
    val startedAt: Long = System.currentTimeMillis()
)
