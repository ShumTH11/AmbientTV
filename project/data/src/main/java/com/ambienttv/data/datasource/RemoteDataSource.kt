package com.ambienttv.data.datasource

import com.ambienttv.domain.model.ContentItem

/**
 * Data source for remote content APIs (YouTube, Pixabay, Pexels, Internet Archive).
 */
public interface RemoteDataSource {

    /**
     * Searches YouTube for videos matching the query.
     */
    public suspend fun searchYouTube(query: String, maxResults: Int = 10): List<ContentItem>

    /**
     * Searches Pixabay for videos matching the query.
     */
    public suspend fun searchPixabayVideos(query: String): List<ContentItem>

    /**
     * Searches Pexels for videos matching the query.
     */
    public suspend fun searchPexelsVideos(query: String): List<ContentItem>

    /**
     * Searches Internet Archive for content matching the query.
     */
    public suspend fun searchInternetArchive(query: String): List<ContentItem>

    /**
     * Searches all remote sources and aggregates results.
     */
    public suspend fun searchAll(query: String): List<ContentItem>
}
