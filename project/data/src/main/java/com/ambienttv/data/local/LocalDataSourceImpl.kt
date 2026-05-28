package com.ambienttv.data.local

import com.ambienttv.data.local.dao.ContentDao
import com.ambienttv.data.local.entity.ContentEntity
import com.ambienttv.data.mapper.DomainMapper
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.data.datasource.ContentMetadata
import com.ambienttv.data.datasource.LocalDataSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject

/**
 * Implementation of [LocalDataSource] that uses Room DAOs for caching
 * and [FileScanner] for directory scanning.
 */
class LocalDataSourceImpl @Inject constructor(
    private val contentDao: ContentDao,
    private val fileScanner: FileScanner,
    private val domainMapper: DomainMapper
) : LocalDataSource {

    override suspend fun scanDirectories(paths: List<String>): Flow<List<ContentItem>> = flow {
        fileScanner.scanDirectories(paths).collect { batch ->
            val entities = batch.map { item -> domainMapper.toContentEntity(item) }
            contentDao.insertAll(entities)
            emit(batch)
        }
    }.flowOn(Dispatchers.IO)

    override suspend fun readSidecarMetadata(file: File): ContentMetadata? {
        return withContext(Dispatchers.IO) {
            fileScanner.parseSidecarJson(file)?.let {
                it.copy(fileSize = file.length())
            }
        }
    }

    override suspend fun getCachedContent(): List<ContentItem> {
        return withContext(Dispatchers.IO) {
            contentDao.getAll().map { entity -> domainMapper.toContentItem(entity) }
        }
    }

    override suspend fun getCachedContentByType(type: String): List<ContentItem> {
        return withContext(Dispatchers.IO) {
            contentDao.getByType(type).map { entity -> domainMapper.toContentItem(entity) }
        }
    }

    override suspend fun cacheContent(items: List<ContentItem>) {
        withContext(Dispatchers.IO) {
            val entities = items.map { item -> domainMapper.toContentEntity(item) }
            contentDao.insertAll(entities)
        }
    }

    override suspend fun clearLocalCache() {
        withContext(Dispatchers.IO) {
            contentDao.clearLocalContent()
        }
    }
}
