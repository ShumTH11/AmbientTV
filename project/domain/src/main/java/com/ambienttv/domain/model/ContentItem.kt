package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Represents a single piece of content (video or audio) from any source.
 */
@Serializable
public data class ContentItem(
    val id: String,
    val type: MediaType,
    val source: ContentSource,
    val uri: String,
    val title: String,
    val tags: List<ContentTag>,
    val category: ContentCategory,
    val licenseType: LicenseType,
    val metadata: MediaMetadata,
    val localPath: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
