package com.ambienttv.data.datasource

import com.ambienttv.domain.model.ContentItem
import kotlinx.coroutines.flow.Flow
import java.io.File

/**
 * Data source for locally stored content (files on disk, Room DB cache).
 */
public interface LocalDataSource {

    /**
     * Scans the given directories for media files and returns discovered content.
     */
    public suspend fun scanDirectories(paths: List<String>): Flow<List<ContentItem>>

    /**
     * Reads sidecar metadata JSON associated with a media file.
     */
    public suspend fun readSidecarMetadata(file: File): ContentMetadata?

    /**
     * Returns all content items currently cached in local storage.
     */
    public suspend fun getCachedContent(): List<ContentItem>

    /**
     * Returns cached content items filtered by media type.
     */
    public suspend fun getCachedContentByType(type: String): List<ContentItem>

    /**
     * Saves content items to the local cache.
     */
    public suspend fun cacheContent(items: List<ContentItem>)

    /**
     * Clears only LOCAL source content from the cache.
     */
    public suspend fun clearLocalCache()
}
