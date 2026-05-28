package com.ambienttv.data.repository

import com.ambienttv.data.local.dao.ContentDao
import com.ambienttv.data.local.dao.FavoriteDao
import com.ambienttv.data.local.entity.FavoriteEntity
import com.ambienttv.data.mapper.DomainMapper
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.repository.FavoritesRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FavoritesRepositoryImpl @Inject constructor(
    private val favoriteDao: FavoriteDao,
    private val contentDao: ContentDao,
    private val domainMapper: DomainMapper
) : FavoritesRepository {

    override fun observeFavorites(): Flow<List<ContentPair>> {
        return favoriteDao.getAll().flatMapLatest { favorites ->
            flow {
                val pairs = favorites.mapNotNull { entity ->
                    buildPair(entity)
                }
                emit(pairs)
            }
        }
    }

    override fun isFavorite(pairId: String): Flow<Boolean> {
        return favoriteDao.isFavorite(pairId)
    }

    override suspend fun getFavoriteById(pairId: String): ContentPair? {
        return favoriteDao.getById(pairId)?.let { buildPair(it) }
    }

    override suspend fun addFavorite(pair: ContentPair) {
        // Ensure the underlying items exist in the content table so we can rebuild the pair later
        val videoEntity = domainMapper.toContentEntity(pair.video)
        val audioEntity = domainMapper.toContentEntity(pair.audio)
        contentDao.insert(videoEntity)
        contentDao.insert(audioEntity)

        val entity = FavoriteEntity(
            pairId = pair.id,
            videoId = pair.video.id,
            audioId = pair.audio.id
        )
        favoriteDao.insert(entity)
    }

    override suspend fun removeFavorite(pairId: String) {
        favoriteDao.delete(pairId)
    }

    private suspend fun buildPair(entity: FavoriteEntity): ContentPair? {
        val video = contentDao.getById(entity.videoId) ?: return null
        val audio = contentDao.getById(entity.audioId) ?: return null
        return ContentPair(
            id = entity.pairId,
            video = domainMapper.toContentItem(video),
            audio = domainMapper.toContentItem(audio),
            matchScore = 1.0f,
            isUserOverride = true
        )
    }
}
