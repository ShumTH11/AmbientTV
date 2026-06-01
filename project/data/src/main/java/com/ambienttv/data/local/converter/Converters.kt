package com.ambienttv.data.local.converter

import androidx.room.TypeConverter
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import timber.log.Timber
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.MediaMetadata

/**
 * Room type converters for serializing/deserializing complex types to/from JSON strings.
 * Uses kotlinx.serialization for consistent JSON handling.
 */
class Converters {

    private val json = Json { ignoreUnknownKeys = true }

    // List<ContentTag> converters
    @TypeConverter
    fun fromContentTagList(tags: List<ContentTag>): String {
        return json.encodeToString(ListSerializer(ContentTag.serializer()), tags)
    }

    @TypeConverter
    fun toContentTagList(tagsJson: String): List<ContentTag> {
        return if (tagsJson.isBlank()) {
            emptyList()
        } else {
            try {
                json.decodeFromString(ListSerializer(ContentTag.serializer()), tagsJson)
            } catch (e: Exception) {
                Timber.e(e, "Failed to deserialize ContentTag list")
                emptyList()
            }
        }
    }

    // MediaMetadata converters
    @TypeConverter
    fun fromMediaMetadata(metadata: MediaMetadata): String {
        return json.encodeToString(MediaMetadata.serializer(), metadata)
    }

    @TypeConverter
    fun toMediaMetadata(metadataJson: String): MediaMetadata {
        return if (metadataJson.isBlank()) {
            MediaMetadata()
        } else {
            try {
                json.decodeFromString(MediaMetadata.serializer(), metadataJson)
            } catch (e: Exception) {
                Timber.e(e, "Failed to deserialize MediaMetadata")
                MediaMetadata()
            }
        }
    }

    // List<String> converter (for color palettes)
    @TypeConverter
    fun fromStringList(list: List<String>): String {
        return json.encodeToString(list)
    }

    @TypeConverter
    fun toStringList(jsonString: String): List<String> {
        return if (jsonString.isBlank()) {
            emptyList()
        } else {
            try {
                json.decodeFromString(jsonString)
            } catch (e: Exception) {
                Timber.e(e, "Failed to deserialize String list")
                emptyList()
            }
        }
    }
}
