package com.ambienttv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ambienttv.data.local.entity.ContentPairEntity
import kotlinx.coroutines.flow.Flow

/**
 * Room DAO for content pair database operations.
 */
@Dao
interface ContentPairDao {

    @Query("SELECT * FROM content_pairs")
    suspend fun getAll(): List<ContentPairEntity>

    @Query("SELECT * FROM content_pairs WHERE id = :pairId")
    suspend fun getById(pairId: String): ContentPairEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(pair: ContentPairEntity)

    @Query("DELETE FROM content_pairs WHERE id = :pairId")
    suspend fun delete(pairId: String)

    @Query("SELECT * FROM content_pairs")
    fun observeAll(): Flow<List<ContentPairEntity>>
}
