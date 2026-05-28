package com.ambienttv.data.repository

import com.ambienttv.data.catalog.CatalogDataSource
import com.ambienttv.data.datasource.GenerationDataSource
import com.ambienttv.data.license.LicenseChecker
import com.ambienttv.data.datasource.LocalDataSource
import com.ambienttv.data.local.dao.CategoryDao
import com.ambienttv.data.local.dao.ContentDao
import com.ambienttv.data.local.dao.ContentPairDao
import com.ambienttv.data.mapper.DomainMapper
import com.ambienttv.data.mapper.DtoMapper
import com.ambienttv.data.datasource.RemoteDataSource
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.GenerationStatus
import com.ambienttv.domain.model.MediaResult
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.preset.DefaultCategories
import com.ambienttv.domain.repository.ContentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

/**
 * Implementation of [ContentRepository] that coordinates between local data sources,
 * remote APIs, and AI generation to provide a unified content management interface.
 *
 * Uses Clean Architecture principles: the repository implements the domain interface
 * and delegates to appropriate data sources while handling mapping between entity
 * and domain models.
 */
class ContentRepositoryImpl @Inject constructor(
    private val localDataSource: LocalDataSource,
    private val remoteDataSource: RemoteDataSource,
    private val generationDataSource: GenerationDataSource,
    private val licenseChecker: LicenseChecker,
    private val contentDao: ContentDao,
    private val contentPairDao: ContentPairDao,
    private val categoryDao: CategoryDao,
    private val domainMapper: DomainMapper,
    private val dtoMapper: DtoMapper,
    private val catalogDataSource: CatalogDataSource
) : ContentRepository {

    // ----- Local Content Scanning -----

    override suspend fun scanLocalContent(paths: List<String>): Flow<List<ContentItem>> {
        return localDataSource.scanDirectories(paths)
    }

    // ----- Search Operations -----

    override suspend fun searchByCategory(category: ContentCategory): List<ContentItem> {
        val localResults = try {
            contentDao.getByCategory(category.id)
                .map { entity -> domainMapper.toContentItem(entity) }
        } catch (_: Exception) {
            emptyList()
        }

        if (localResults.isNotEmpty()) {
            return localResults.filter { licenseChecker.canPlay(it) }
        }

        val remoteResults = try {
            remoteDataSource.searchAll(category.name)
                .filter { item ->
                    item.category.id == category.id ||
                        item.tags.any { tag ->
                            category.defaultTags.any { defaultTag ->
                                tag.key == defaultTag.key && tag.value.equals(defaultTag.value, ignoreCase = true)
                            }
                        }
                }
        } catch (_: Exception) {
            emptyList()
        }

        return (localResults + remoteResults)
            .filter { licenseChecker.canPlay(it) }
            .distinctBy { it.uri }
    }

    override suspend fun searchByTags(tags: List<ContentTag>): List<ContentItem> {
        val allCached = try {
            contentDao.getAll()
                .map { entity -> domainMapper.toContentItem(entity) }
        } catch (_: Exception) {
            emptyList()
        }

        val matchingLocal = allCached.filter { item ->
            tags.any { searchTag ->
                item.tags.any { itemTag ->
                    itemTag.key.equals(searchTag.key, ignoreCase = true) &&
                        itemTag.value.equals(searchTag.value, ignoreCase = true)
                }
            }
        }

        if (matchingLocal.isNotEmpty()) {
            return matchingLocal.filter { licenseChecker.canPlay(it) }
        }

        val query = tags.joinToString(" ") { it.value }
        return try {
            remoteDataSource.searchAll(query)
                .filter { item ->
                    tags.any { searchTag ->
                        item.tags.any { itemTag ->
                            itemTag.key.equals(searchTag.key, ignoreCase = true) &&
                                itemTag.value.equals(searchTag.value, ignoreCase = true)
                        }
                    }
                }
                .filter { licenseChecker.canPlay(it) }
                .distinctBy { it.uri }
        } catch (_: Exception) {
            emptyList()
        }
    }

    // ----- Content Pairs -----

    override suspend fun getContentPairs(category: ContentCategory): List<ContentPair> {
        // 1. User-saved pairs (highest priority)
        val pairEntities = contentPairDao.getAll()
        if (pairEntities.isNotEmpty()) {
            val savedPairs = pairEntities.mapNotNull { entity ->
                val video = contentDao.getById(entity.videoId)
                val audio = contentDao.getById(entity.audioId)
                if (video != null && audio != null) {
                    domainMapper.toContentPair(
                        entity = entity,
                        video = domainMapper.toContentItem(video),
                        audio = domainMapper.toContentItem(audio)
                    )
                } else null
            }.filter { pair ->
                pair.video.category.id == category.id || pair.audio.category.id == category.id
            }
            if (savedPairs.isNotEmpty()) return savedPairs
        }

        // 2. Bundled catalog (curated, works offline if cached)
        val catalogPairs = catalogDataSource.getPairs(category)
        if (catalogPairs.isNotEmpty()) {
            return catalogPairs.filter { licenseChecker.canPlay(it.video) && licenseChecker.canPlay(it.audio) }
        }

        // 3. Remote APIs (YouTube, Pixabay, Pexels, Internet Archive)
        val videos = searchByCategory(category).filter { it.type == MediaType.VIDEO }
        val audios = try {
            contentDao.getByType("AUDIO").map { domainMapper.toContentItem(it) }
        } catch (_: Exception) {
            emptyList()
        }

        return if (videos.isNotEmpty() && audios.isNotEmpty()) {
            buildPairsFromItems(videos, audios, category)
        } else {
            generateFallbackPairs(category, videos, audios)
        }
    }

    override suspend fun saveContentPair(pair: ContentPair) {
        val videoEntity = domainMapper.toContentEntity(pair.video)
        val audioEntity = domainMapper.toContentEntity(pair.audio)
        val pairEntity = domainMapper.toContentPairEntity(pair)

        contentDao.insert(videoEntity)
        contentDao.insert(audioEntity)
        contentPairDao.insert(pairEntity)
    }

    override suspend fun deleteContentPair(pairId: String) {
        contentPairDao.delete(pairId)
    }

    // ----- Categories -----

    override fun getAllCategories(): Flow<List<ContentCategory>> {
        return categoryDao.getAll()
            .map { entities ->
                if (entities.isEmpty()) {
                    DefaultCategories.ALL.also { defaults ->
                        defaults.forEach { addCategory(it) }
                    }
                } else {
                    entities.map { domainMapper.toContentCategory(it) }
                }
            }
    }

    override suspend fun addCategory(category: ContentCategory) {
        val entity = domainMapper.toCategoryEntity(category)
        categoryDao.insert(entity)
    }

    // ----- Private Helpers -----

    /**
     * Builds content pairs from available video and audio items.
     * Creates sensible pairings based on category matching.
     */
    private fun buildPairsFromItems(
        videos: List<ContentItem>,
        audios: List<ContentItem>,
        category: ContentCategory
    ): List<ContentPair> {
        val pairs = mutableListOf<ContentPair>()
        val maxPairs = minOf(videos.size, audios.size, MAX_PAIRS)

        for (i in 0 until maxPairs) {
            val video = videos[i]
            val audio = audios[i % audios.size]
            val score = calculateMatchScore(video, audio, category)

            pairs.add(
                ContentPair(
                    id = "pair_${category.id}_${i}_${System.currentTimeMillis()}",
                    video = video,
                    audio = audio,
                    matchScore = score,
                    isUserOverride = false
                )
            )
        }

        return pairs.sortedByDescending { it.matchScore }
    }

    /**
     * Generates fallback pairs when insufficient content is available.
     * Attempts AI generation or returns placeholder pairs.
     */
    private suspend fun generateFallbackPairs(
        category: ContentCategory,
        videos: List<ContentItem>,
        audios: List<ContentItem>
    ): List<ContentPair> {
        val pairs = mutableListOf<ContentPair>()

        if (videos.isNotEmpty()) {
            videos.forEachIndexed { i, video ->
                pairs.add(
                    ContentPair(
                        id = "pair_${category.id}_${i}_${System.currentTimeMillis()}",
                        video = video,
                        audio = buildPlaceholderAudio(category),
                        matchScore = 0.3f,
                        isUserOverride = false
                    )
                )
            }
        } else {
            val generationResult = generationDataSource.generateVideo(
                "${category.name} ambient looping video"
            )

            if (generationResult is MediaResult.Success) {
                pairs.add(
                    ContentPair(
                        video = generationResult.contentItem,
                        audio = buildPlaceholderAudio(category),
                        matchScore = 0.5f
                    )
                )
            }
        }

        return pairs
    }

    /**
     * Creates a placeholder audio item for pairing when no real audio is available.
     */
    private fun buildPlaceholderAudio(category: ContentCategory): ContentItem {
        return ContentItem(
            id = "placeholder_audio_${category.id}_${System.currentTimeMillis()}",
            type = MediaType.AUDIO,
            source = com.ambienttv.domain.model.ContentSource.AI_GENERATED,
            uri = "placeholder://audio/${category.id}",
            title = "${category.name} Ambient Audio",
            tags = category.defaultTags,
            category = category,
            licenseType = com.ambienttv.domain.model.LicenseType.FREE,
            metadata = com.ambienttv.domain.model.MediaMetadata(
                durationMs = 30000,
                mood = category.defaultTags.find { it.key == "mood" }?.value,
                colorPalette = category.defaultTags.find { it.key == "colorPalette" }?.value?.split(",")
                    ?: emptyList()
            )
        )
    }

    /**
     * Calculates a match score between a video and audio item based on tag overlap
     * and category alignment.
     */
    private fun calculateMatchScore(
        video: ContentItem,
        audio: ContentItem,
        category: ContentCategory
    ): Float {
        var score = 0.0f

        if (video.category.id == category.id) score += 0.3f
        if (audio.category.id == category.id) score += 0.3f

        val videoTagKeys = video.tags.map { it.key to it.value.lowercase() }.toSet()
        val audioTagKeys = audio.tags.map { it.key to it.value.lowercase() }.toSet()
        val commonTags = videoTagKeys.intersect(audioTagKeys)

        if (commonTags.isNotEmpty()) {
            score += (commonTags.size.toFloat() / maxOf(videoTagKeys.size, audioTagKeys.size)) * 0.4f
        }

        val videoMood = video.tags.find { it.key == "mood" }?.value?.lowercase()
        val audioMood = audio.tags.find { it.key == "mood" }?.value?.lowercase()
        if (videoMood != null && audioMood != null && videoMood == audioMood) {
            score += 0.2f
        }

        return score.coerceIn(0.0f, 1.0f)
    }

    companion object {
        private const val MAX_PAIRS = 10
    }
}
