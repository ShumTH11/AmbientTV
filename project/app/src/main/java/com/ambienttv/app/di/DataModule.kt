package com.ambienttv.app.di

import com.ambienttv.data.datasource.GenerationDataSource
import com.ambienttv.data.datasource.LocalDataSource
import com.ambienttv.data.datasource.RemoteDataSource
import com.ambienttv.data.generation.GenerationDataSourceImpl
import com.ambienttv.data.local.LocalDataSourceImpl
import com.ambienttv.data.remote.RemoteDataSourceImpl
import com.ambienttv.data.repository.ContentRepositoryImpl
import com.ambienttv.data.repository.FavoritesRepositoryImpl
import com.ambienttv.data.repository.HistoryRepositoryImpl
import com.ambienttv.data.settings.SettingsRepositoryImpl
import com.ambienttv.domain.repository.ContentRepository
import com.ambienttv.domain.repository.FavoritesRepository
import com.ambienttv.domain.repository.HistoryRepository
import com.ambienttv.domain.repository.SettingsRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module that binds repository and data source interfaces to their implementations.
 *
 * [FileScanner] and [LicenseChecker] are provided automatically by Hilt
 * via their @Inject-annotated constructors in the :data module.
 * Only the interface bindings need to be declared here.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class DataModule {

    /**
     * Binds [ContentRepositoryImpl] to the [ContentRepository] domain interface.
     */
    @Binds
    @Singleton
    abstract fun bindContentRepository(
        impl: ContentRepositoryImpl
    ): ContentRepository

    /**
     * Binds [LocalDataSourceImpl] to the [LocalDataSource] interface.
     */
    @Binds
    @Singleton
    abstract fun bindLocalDataSource(
        impl: LocalDataSourceImpl
    ): LocalDataSource

    /**
     * Binds [RemoteDataSourceImpl] to the [RemoteDataSource] interface.
     */
    @Binds
    @Singleton
    abstract fun bindRemoteDataSource(
        impl: RemoteDataSourceImpl
    ): RemoteDataSource

    /**
     * Binds [GenerationDataSourceImpl] to the [GenerationDataSource] interface.
     */
    @Binds
    @Singleton
    abstract fun bindGenerationDataSource(
        impl: GenerationDataSourceImpl
    ): GenerationDataSource

    /**
     * Binds [SettingsRepositoryImpl] to the [SettingsRepository] domain interface.
     */
    @Binds
    @Singleton
    abstract fun bindSettingsRepository(
        impl: SettingsRepositoryImpl
    ): SettingsRepository

    /**
     * Binds [FavoritesRepositoryImpl] to the [FavoritesRepository] domain interface.
     */
    @Binds
    @Singleton
    abstract fun bindFavoritesRepository(
        impl: FavoritesRepositoryImpl
    ): FavoritesRepository

    /**
     * Binds [HistoryRepositoryImpl] to the [HistoryRepository] domain interface.
     */
    @Binds
    @Singleton
    abstract fun bindHistoryRepository(
        impl: HistoryRepositoryImpl
    ): HistoryRepository
}
