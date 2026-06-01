package com.ambienttv.data.mapper

import com.ambienttv.data.local.entity.CategoryEntity
import com.ambienttv.data.local.entity.ContentEntity
import com.ambienttv.data.local.entity.ContentPairEntity
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.preset.DefaultCategories
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import timber.log.Timber
import javax.inject.Inject

/**
 * Maps between Room entity models and domain models.
 * Handles JSON serialization/deserialization for complex types.
 */
class DomainMapper @Inject constructor() {

    private val json = Json { ignoreUnknownKeys = true }

    // ----- ContentEntity <-> ContentItem -----

    fun toContentItem(entity: ContentEntity): ContentItem {
        val tags = parseTagsJson(entity.tagsJson)
        val metadata = parseMetadataJson(entity.metadataJson)
        val category = findCategoryById(entity.categoryId)

        return ContentItem(
            id = entity.id,
            type = MediaType.valueOf(entity.type),
            source = ContentSource.valueOf(entity.source),
            uri = entity.uri,
            title = entity.title,
            tags = tags,
            category = category,
            licenseType = LicenseType.valueOf(entity.licenseType),
            metadata = metadata,
            localPath = entity.localPath,
            createdAt = entity.createdAt
        )
    }

    fun toContentEntity(item: ContentItem): ContentEntity {
        return ContentEntity(
            id = item.id,
            type = item.type.name,
            source = item.source.name,
            uri = item.uri,
            title = item.title,
            tagsJson = serializeTags(item.tags),
            categoryId = item.category.id,
            licenseType = item.licenseType.name,
            metadataJson = serializeMetadata(item.metadata),
            localPath = item.localPath,
            createdAt = item.createdAt
        )
    }

    // ----- ContentPairEntity <-> ContentPair -----

    fun toContentPair(
        entity: ContentPairEntity,
        video: ContentItem,
        audio: ContentItem
    ): ContentPair {
        return ContentPair(
            id = entity.id,
            video = video,
            audio = audio,
            matchScore = entity.matchScore,
            isUserOverride = entity.isUserOverride
        )
    }

    fun toContentPairEntity(pair: ContentPair): ContentPairEntity {
        return ContentPairEntity(
            id = pair.id,
            videoId = pair.video.id,
            audioId = pair.audio.id,
            matchScore = pair.matchScore,
            isUserOverride = pair.isUserOverride
        )
    }

    // ----- CategoryEntity <-> ContentCategory -----

    fun toContentCategory(entity: CategoryEntity): ContentCategory {
        val tags = parseTagsJson(entity.defaultTagsJson)

        return ContentCategory(
            id = entity.id,
            name = entity.name,
            description = entity.description,
            defaultTags = tags,
            thumbnailUrl = entity.thumbnailUrl
        )
    }

    fun toCategoryEntity(category: ContentCategory): CategoryEntity {
        return CategoryEntity(
            id = category.id,
            name = category.name,
            description = category.description,
            defaultTagsJson = serializeTags(category.defaultTags),
            thumbnailUrl = category.thumbnailUrl
        )
    }

    // ----- JSON Helpers -----

    fun parseTagsJson(tagsJson: String): List<ContentTag> {
        return if (tagsJson.isBlank()) {
            emptyList()
        } else {
            try {
                json.decodeFromString(ListSerializer(ContentTag.serializer()), tagsJson)
            } catch (e: Exception) {
                Timber.e(e, "Failed to parse tags JSON")
                emptyList()
            }
        }
    }

    fun serializeTags(tags: List<ContentTag>): String {
        return json.encodeToString(ListSerializer(ContentTag.serializer()), tags)
    }

    fun parseMetadataJson(metadataJson: String): MediaMetadata {
        return if (metadataJson.isBlank()) {
            MediaMetadata()
        } else {
            try {
                json.decodeFromString(MediaMetadata.serializer(), metadataJson)
            } catch (e: Exception) {
                Timber.e(e, "Failed to parse metadata JSON")
                MediaMetadata()
            }
        }
    }

    fun serializeMetadata(metadata: MediaMetadata): String {
        return json.encodeToString(MediaMetadata.serializer(), metadata)
    }

    private fun findCategoryById(categoryId: String): ContentCategory {
        return DefaultCategories.ALL.find { it.id == categoryId }
            ?: ContentCategory(
                id = categoryId,
                name = categoryId.replaceFirstChar { it.uppercase() },
                description = "",
                defaultTags = emptyList()
            )
    }
}
