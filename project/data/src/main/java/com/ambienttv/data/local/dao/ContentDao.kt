package com.ambienttv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ambienttv.data.local.entity.ContentEntity
import kotlinx.coroutines.flow.Flow

/**
 * Room DAO for content item database operations.
 */
@Dao
interface ContentDao {

    @Query("SELECT * FROM content_items WHERE categoryId = :categoryId")
    suspend fun getByCategory(categoryId: String): List<ContentEntity>

    @Query("SELECT * FROM content_items WHERE type = :type")
    suspend fun getByType(type: String): List<ContentEntity>

    @Query("SELECT * FROM content_items WHERE source = :source")
    suspend fun getBySource(source: String): List<ContentEntity>

    @Query("SELECT * FROM content_items WHERE id = :id")
    suspend fun getById(id: String): ContentEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<ContentEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: ContentEntity)

    @Query("DELETE FROM content_items WHERE source = 'LOCAL'")
    suspend fun clearLocalContent()

    @Query("DELETE FROM content_items WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("SELECT * FROM content_items")
    fun observeAll(): Flow<List<ContentEntity>>

    @Query("SELECT * FROM content_items")
    suspend fun getAll(): List<ContentEntity>
}
