package com.ambienttv.app.di

import android.content.Context
import androidx.room.Room
import com.ambienttv.data.local.dao.CategoryDao
import com.ambienttv.data.local.dao.ContentDao
import com.ambienttv.data.local.dao.ContentPairDao
import com.ambienttv.data.local.dao.FavoriteDao
import com.ambienttv.data.local.dao.HistoryDao
import com.ambienttv.data.local.database.AppDatabase
import com.ambienttv.data.local.database.Migrations
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module that provides Room database and DAO singletons.
 *
 * The database is created using the Application context and persists
 * across the entire app lifecycle. All DAOs are provided as singletons
 * to ensure consistent database access throughout the app.
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    /**
     * Provides the singleton Room database instance.
     */
    @Provides
    @Singleton
    fun provideAppDatabase(
        @ApplicationContext context: Context
    ): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            AppDatabase.DATABASE_NAME
        )
            .addMigrations(Migrations.MIGRATION_1_2, Migrations.MIGRATION_2_3)
            .build()
    }

    /**
     * Provides the ContentDao for content item database operations.
     */
    @Provides
    @Singleton
    fun provideContentDao(database: AppDatabase): ContentDao {
        return database.contentDao()
    }

    /**
     * Provides the ContentPairDao for content pair database operations.
     */
    @Provides
    @Singleton
    fun provideContentPairDao(database: AppDatabase): ContentPairDao {
        return database.contentPairDao()
    }

    /**
     * Provides the CategoryDao for category database operations.
     */
    @Provides
    @Singleton
    fun provideCategoryDao(database: AppDatabase): CategoryDao {
        return database.categoryDao()
    }

    /**
     * Provides the FavoriteDao for favorites database operations.
     */
    @Provides
    @Singleton
    fun provideFavoriteDao(database: AppDatabase): FavoriteDao {
        return database.favoriteDao()
    }

    /**
     * Provides the HistoryDao for playback history database operations.
     */
    @Provides
    @Singleton
    fun provideHistoryDao(database: AppDatabase): HistoryDao {
        return database.historyDao()
    }
}
