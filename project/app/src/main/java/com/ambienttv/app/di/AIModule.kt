package com.ambienttv.app.di

import com.ambienttv.ai.AIContentAdapterImpl
import com.ambienttv.domain.ai.AIContentAdapter
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module that binds the AI content adapter interface to its implementation.
 *
 * [CategoryMatcher], [ContentRouter], and [ContentCache] are all provided
 * automatically by Hilt via their @Inject-annotated constructors in the :ai module.
 * Only the interface binding needs to be declared here.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class AIModule {

    /**
     * Binds [AIContentAdapterImpl] to the [AIContentAdapter] interface.
     */
    @Binds
    @Singleton
    abstract fun bindAIContentAdapter(
        impl: AIContentAdapterImpl
    ): AIContentAdapter
}
