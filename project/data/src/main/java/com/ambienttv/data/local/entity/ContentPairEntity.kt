package com.ambienttv.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing a matched video/audio content pair.
 */
@Entity(tableName = "content_pairs")
data class ContentPairEntity(
    @PrimaryKey val id: String,
    val videoId: String,
    val audioId: String,
    val matchScore: Float,
    val isUserOverride: Boolean
)
