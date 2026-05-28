package com.ambienttv.domain.model

/**
 * Represents a single playback history record.
 *
 * @param pair The content pair that was played
 * @param playedAt Timestamp (epoch millis) of the last playback
 * @param progressMs Last known playback position in milliseconds
 * @param durationMs Total duration of the pair in milliseconds (0 if unknown)
 */
data class HistoryEntry(
    val pair: ContentPair,
    val playedAt: Long,
    val progressMs: Long,
    val durationMs: Long
)
