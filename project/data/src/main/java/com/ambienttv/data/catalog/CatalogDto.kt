package com.ambienttv.data.catalog

import kotlinx.serialization.Serializable

/**
 * Root DTO for the local content catalog JSON (assets/content_catalog.json).
 */
@Serializable
data class CatalogDto(
    val version: Int,
    val categories: List<CatalogCategoryDto>
)

@Serializable
data class CatalogCategoryDto(
    val id: String,
    val pairs: List<CatalogPairDto>
)

@Serializable
data class CatalogPairDto(
    val videoUrl: String,
    val audioUrl: String,
    val title: String,
    val tags: List<CatalogTagDto> = emptyList()
)

@Serializable
data class CatalogTagDto(
    val key: String,
    val value: String
)
