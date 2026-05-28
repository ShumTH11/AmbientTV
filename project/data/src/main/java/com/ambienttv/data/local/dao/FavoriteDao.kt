package com.ambienttv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ambienttv.data.local.entity.FavoriteEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FavoriteDao {

    @Query("SELECT * FROM favorites ORDER BY addedAt DESC")
    fun getAll(): Flow<List<FavoriteEntity>>

    @Query("SELECT * FROM favorites WHERE pairId = :pairId LIMIT 1")
    suspend fun getById(pairId: String): FavoriteEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: FavoriteEntity)

    @Query("DELETE FROM favorites WHERE pairId = :pairId")
    suspend fun delete(pairId: String)

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE pairId = :pairId)")
    fun isFavorite(pairId: String): Flow<Boolean>
}
