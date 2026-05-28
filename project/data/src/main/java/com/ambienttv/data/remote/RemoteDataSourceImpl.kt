package com.ambienttv.data.remote

import com.ambienttv.data.datasource.RemoteDataSource
import com.ambienttv.data.mapper.DtoMapper
import com.ambienttv.data.remote.api.AmbientBackendApi
import com.ambienttv.domain.model.ContentItem
import kotlinx.coroutines.async
import kotlinx.coroutines.supervisorScope
import javax.inject.Inject

/**
 * Implementation of [RemoteDataSource] that routes all requests through
 * the secure AmbientTV backend. The backend holds third-party API keys
 * (Pexels, Pixabay, YouTube, Coverr) so they are never embedded in the APK.
 *
 * If the backend is unreachable, all methods gracefully return empty lists,
 * allowing the app to fall back to the bundled catalog or local content.
 */
class RemoteDataSourceImpl @Inject constructor(
    private val backendApi: AmbientBackendApi,
    private val dtoMapper: DtoMapper
) : RemoteDataSource {

    override suspend fun searchYouTube(query: String, maxResults: Int): List<ContentItem> {
        return try {
            val response = backendApi.searchYouTube(query = query, maxResults = maxResults)
            response.items.mapNotNull { item ->
                dtoMapper.mapYouTubeItemToContentItem(item)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    override suspend fun searchPixabayVideos(query: String): List<ContentItem> {
        return try {
            val response = backendApi.searchPixabay(query = query, perPage = 10)
            response.hits.map { hit ->
                dtoMapper.mapPixabayHitToContentItem(hit)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    override suspend fun searchPexelsVideos(query: String): List<ContentItem> {
        return try {
            val response = backendApi.searchPexels(query = query, perPage = 10)
            response.videos.map { video ->
                dtoMapper.mapPexelsVideoToContentItem(video)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    override suspend fun searchInternetArchive(query: String): List<ContentItem> {
        return try {
            val response = backendApi.searchInternetArchive(query = query, rows = 10)
            response.response?.docs?.mapNotNull { doc ->
                dtoMapper.mapInternetArchiveDocToContentItem(doc)
            } ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    override suspend fun searchAll(query: String): List<ContentItem> {
        return supervisorScope {
            val deferredResults = listOf(
                async { searchYouTube(query) },
                async { searchPixabayVideos(query) },
                async { searchPexelsVideos(query) },
                async { searchInternetArchive(query) }
            )

            deferredResults.awaitAll().flatten()
        }
    }
}
