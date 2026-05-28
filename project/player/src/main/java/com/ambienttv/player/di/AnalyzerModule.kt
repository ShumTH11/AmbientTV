package com.ambienttv.player.di

import com.ambienttv.domain.usecase.AnalyzeAudioUseCase
import com.ambienttv.player.analyzer.AnalyzeAudioUseCaseImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class AnalyzerModule {

    @Binds
    abstract fun bindAnalyzeAudioUseCase(impl: AnalyzeAudioUseCaseImpl): AnalyzeAudioUseCase
}
