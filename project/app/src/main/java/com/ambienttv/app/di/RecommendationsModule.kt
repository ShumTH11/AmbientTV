package com.ambienttv.app.di

import com.ambienttv.app.recommendations.WatchNextUseCaseImpl
import com.ambienttv.domain.usecase.WatchNextUseCase
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class RecommendationsModule {

    @Binds
    abstract fun bindWatchNextUseCase(impl: WatchNextUseCaseImpl): WatchNextUseCase
}
