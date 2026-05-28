package com.ambienttv.domain.repository

import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.HistoryEntry
import kotlinx.coroutines.flow.Flow

/**
 * Repository for managing playback history.
 *
 * Implementations are expected to keep the history list trimmed to a reasonable
 * size (e.g. last 100 entries) and persist everything durably.
 */
interface HistoryRepository {

    /**
     * Hot stream of history entries ordered by most-recently-played first.
     */
    fun observeHistory(): Flow<List<HistoryEntry>>

    /**
     * Retrieves a specific history entry by pair ID, or null if not found.
     */
    suspend fun getEntryById(pairId: String): com.ambienttv.domain.model.HistoryEntry?

    /**
     * Records or updates a history entry for the given pair.
     * If an entry already exists for the pair, it is overwritten with the new timestamp.
     */
    suspend fun recordPlayback(pair: ContentPair, progressMs: Long, durationMs: Long)

    /**
     * Removes a single history entry.
     */
    suspend fun removeEntry(pairId: String)

    /**
     * Clears the entire playback history.
     */
    suspend fun clearHistory()
}
