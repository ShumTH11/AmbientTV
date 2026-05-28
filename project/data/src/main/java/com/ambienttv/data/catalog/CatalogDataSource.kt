package com.ambienttv.data.catalog

import android.content.Context
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Reads the curated content catalog.
 *
 * Priority:
 * 1. Cached catalog downloaded from backend (internal storage)
 * 2. Bundled assets/content_catalog.json (works offline)
 * 3. Empty catalog (fallback)
 *
 * Keeps the catalog in memory after first load.
 */
@Singleton
class CatalogDataSource @Inject constructor(
    @ApplicationContext private val context: Context,
    private val catalogUpdater: CatalogUpdater
) {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private var catalog: CatalogDto? = null

    private fun getCatalog(): CatalogDto {
        return catalog ?: loadCatalog().also { catalog = it }
    }

    fun invalidateCache() {
        catalog = null
    }

    /**
     * Returns pre-mapped [ContentPair] list for the given [category].
     * If the category is absent from the catalog, returns an empty list.
     */
    fun getPairs(category: ContentCategory): List<ContentPair> {
        val categoryDto = getCatalog().categories.find { it.id == category.id }
            ?: return emptyList()

        return categoryDto.pairs.mapIndexed { index, pairDto ->
            val tags = pairDto.tags.map { ContentTag(it.key, it.value) }

            val video = ContentItem(
                id = "catalog_${category.id}_v${index}",
                type = MediaType.VIDEO,
                source = ContentSource.PIXABAY,
                uri = pairDto.videoUrl,
                title = "${pairDto.title} (Video)",
                tags = tags,
                category = category,
                licenseType = LicenseType.CC0,
                metadata = MediaMetadata()
            )

            val audio = ContentItem(
                id = "catalog_${category.id}_a${index}",
                type = MediaType.AUDIO,
                source = ContentSource.PIXABAY,
                uri = pairDto.audioUrl,
                title = "${pairDto.title} (Audio)",
                tags = tags,
                category = category,
                licenseType = LicenseType.CC0,
                metadata = MediaMetadata()
            )

            ContentPair(
                id = "catalog_${category.id}_${index}",
                video = video,
                audio = audio,
                matchScore = 1.0f,
                isUserOverride = false
            )
        }
    }

    private fun loadCatalog(): CatalogDto {
        // 1. Try cached catalog from backend
        catalogUpdater.readCachedCatalog()?.let { return it }

        // 2. Fallback to bundled assets
        return try {
            val jsonString = context.assets.open(ASSET_FILE_NAME)
                .bufferedReader()
                .use { it.readText() }
            json.decodeFromString(CatalogDto.serializer(), jsonString)
        } catch (e: Exception) {
            CatalogDto(version = 1, categories = emptyList())
        }
    }

    companion object {
        private const val ASSET_FILE_NAME = "content_catalog.json"
    }
}
