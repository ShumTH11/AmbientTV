package com.ambienttv.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing a playback history entry.
 *
 * Stores references to the video/audio items, when they were last played,
 * and the playback progress so that resume-from-position is possible.
 */
@Entity(tableName = "history")
data class HistoryEntity(
    @PrimaryKey val pairId: String,
    val videoId: String,
    val audioId: String,
    val playedAt: Long = System.currentTimeMillis(),
    val progressMs: Long = 0,
    val durationMs: Long = 0
)
