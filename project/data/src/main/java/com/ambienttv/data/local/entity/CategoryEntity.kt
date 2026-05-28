package com.ambienttv.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing a content category with default tags for matching.
 */
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val defaultTagsJson: String,
    val thumbnailUrl: String?
)
