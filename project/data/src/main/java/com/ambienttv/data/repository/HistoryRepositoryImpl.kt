package com.ambienttv.data.repository

import com.ambienttv.data.local.dao.ContentDao
import com.ambienttv.data.local.dao.HistoryDao
import com.ambienttv.data.local.entity.HistoryEntity
import com.ambienttv.data.mapper.DomainMapper
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.HistoryEntry
import com.ambienttv.domain.repository.HistoryRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HistoryRepositoryImpl @Inject constructor(
    private val historyDao: HistoryDao,
    private val contentDao: ContentDao,
    private val domainMapper: DomainMapper
) : HistoryRepository {

    override suspend fun getEntryById(pairId: String): HistoryEntry? {
        return historyDao.getById(pairId)?.let { buildEntry(it) }
    }

    override fun observeHistory(): Flow<List<HistoryEntry>> {
        return historyDao.getAll().flatMapLatest { entries ->
            flow {
                val result = entries.mapNotNull { entity ->
                    buildEntry(entity)
                }
                emit(result)
            }
        }
    }

    override suspend fun recordPlayback(pair: ContentPair, progressMs: Long, durationMs: Long) {
        // Persist the underlying items so we can rebuild later
        contentDao.insert(domainMapper.toContentEntity(pair.video))
        contentDao.insert(domainMapper.toContentEntity(pair.audio))

        historyDao.insert(
            HistoryEntity(
                pairId = pair.id,
                videoId = pair.video.id,
                audioId = pair.audio.id,
                playedAt = System.currentTimeMillis(),
                progressMs = progressMs,
                durationMs = durationMs
            )
        )

        // Keep only the last 100 entries to prevent unbounded growth
        if (historyDao.count() > MAX_HISTORY_SIZE) {
            historyDao.trimToLimit(MAX_HISTORY_SIZE)
        }
    }

    override suspend fun removeEntry(pairId: String) {
        historyDao.delete(pairId)
    }

    override suspend fun clearHistory() {
        historyDao.clearAll()
    }

    private suspend fun buildEntry(entity: HistoryEntity): HistoryEntry? {
        val video = contentDao.getById(entity.videoId) ?: return null
        val audio = contentDao.getById(entity.audioId) ?: return null
        return HistoryEntry(
            pair = ContentPair(
                id = entity.pairId,
                video = domainMapper.toContentItem(video),
                audio = domainMapper.toContentItem(audio),
                matchScore = 1.0f,
                isUserOverride = false
            ),
            playedAt = entity.playedAt,
            progressMs = entity.progressMs,
            durationMs = entity.durationMs
        )
    }

    companion object {
        private const val MAX_HISTORY_SIZE = 100
    }
}
