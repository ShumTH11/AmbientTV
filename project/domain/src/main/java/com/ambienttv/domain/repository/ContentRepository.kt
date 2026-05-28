package com.ambienttv.domain.repository

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentTag
import kotlinx.coroutines.flow.Flow

/**
 * Repository interface for content management operations.
 * Defines how content is scanned, searched, stored, and retrieved.
 */
public interface ContentRepository {

    /**
     * Scans local filesystem paths for media content.
     *
     * @param paths List of directory paths to scan
     * @return Flow emitting lists of discovered content items as scanning progresses
     */
    public suspend fun scanLocalContent(paths: List<String>): Flow<List<ContentItem>>

    /**
     * Searches for content items matching the given category.
     *
     * @param category The content category to search by
     * @return List of matching content items
     */
    public suspend fun searchByCategory(category: ContentCategory): List<ContentItem>

    /**
     * Searches for content items matching the given tags.
     *
     * @param tags List of content tags to match against
     * @return List of content items with matching tags
     */
    public suspend fun searchByTags(tags: List<ContentTag>): List<ContentItem>

    /**
     * Retrieves pre-matched content pairs for a category.
     *
     * @param category The content category
     * @return List of video/audio content pairs
     */
    public suspend fun getContentPairs(category: ContentCategory): List<ContentPair>

    /**
     * Persists a content pair for future playback.
     *
     * @param pair The content pair to save
     */
    public suspend fun saveContentPair(pair: ContentPair)

    /**
     * Deletes a previously saved content pair.
     *
     * @param pairId The unique identifier of the pair to delete
     */
    public suspend fun deleteContentPair(pairId: String)

    /**
     * Provides a stream of all available content categories.
     *
     * @return Flow emitting the current list of categories
     */
    public fun getAllCategories(): Flow<List<ContentCategory>>

    /**
     * Adds a new content category.
     *
     * @param category The category to add
     */
    public suspend fun addCategory(category: ContentCategory)
}
