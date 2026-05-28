package com.ambienttv.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.ambienttv.data.local.converter.Converters
import com.ambienttv.data.local.dao.CategoryDao
import com.ambienttv.data.local.dao.ContentDao
import com.ambienttv.data.local.dao.ContentPairDao
import com.ambienttv.data.local.dao.FavoriteDao
import com.ambienttv.data.local.dao.HistoryDao
import com.ambienttv.data.local.entity.CategoryEntity
import com.ambienttv.data.local.entity.ContentEntity
import com.ambienttv.data.local.entity.ContentPairEntity
import com.ambienttv.data.local.entity.FavoriteEntity
import com.ambienttv.data.local.entity.HistoryEntity

/**
 * Room database for AmbientTV application.
 * Contains tables for content items, content pairs, and categories.
 */
@Database(
    entities = [
        ContentEntity::class,
        ContentPairEntity::class,
        CategoryEntity::class,
        FavoriteEntity::class,
        HistoryEntity::class
    ],
    version = 3,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun contentDao(): ContentDao
    abstract fun contentPairDao(): ContentPairDao
    abstract fun categoryDao(): CategoryDao
    abstract fun favoriteDao(): FavoriteDao
    abstract fun historyDao(): HistoryDao

    companion object {
        const val DATABASE_NAME = "ambienttv_database"
    }
}
