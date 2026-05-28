package com.ambienttv.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing a content item (video or audio) stored locally.
 * Tags and metadata are stored as JSON strings for flexible serialization.
 */
@Entity(tableName = "content_items")
data class ContentEntity(
    @PrimaryKey val id: String,
    val type: String, // "VIDEO" or "AUDIO"
    val source: String,
    val uri: String,
    val title: String,
    val tagsJson: String, // serialized List<ContentTag>
    val categoryId: String,
    val licenseType: String,
    val metadataJson: String, // serialized MediaMetadata
    val localPath: String?,
    val createdAt: Long
)
