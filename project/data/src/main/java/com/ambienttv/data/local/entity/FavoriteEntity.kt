package com.ambienttv.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing a user-favorited content pair.
 *
 * Stores minimal references to the video and audio items plus the timestamp
 * so that favorites can be displayed and ordered by when they were added.
 */
@Entity(tableName = "favorites")
data class FavoriteEntity(
    @PrimaryKey val pairId: String,
    val videoId: String,
    val audioId: String,
    val addedAt: Long = System.currentTimeMillis()
)
