package com.ambienttv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ambienttv.data.local.entity.HistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface HistoryDao {

    @Query("SELECT * FROM history ORDER BY playedAt DESC")
    fun getAll(): Flow<List<HistoryEntity>>

    @Query("SELECT * FROM history WHERE pairId = :pairId LIMIT 1")
    suspend fun getById(pairId: String): HistoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: HistoryEntity)

    @Query("DELETE FROM history WHERE pairId = :pairId")
    suspend fun delete(pairId: String)

    @Query("DELETE FROM history")
    suspend fun clearAll()

    @Query("SELECT COUNT(*) FROM history")
    suspend fun count(): Int

    @Query("DELETE FROM history WHERE pairId NOT IN (SELECT pairId FROM history ORDER BY playedAt DESC LIMIT :limit)")
    suspend fun trimToLimit(limit: Int)
}
