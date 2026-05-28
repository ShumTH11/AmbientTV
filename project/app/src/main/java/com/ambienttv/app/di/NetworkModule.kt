package com.ambienttv.app.di

import com.ambienttv.app.BuildConfig
import com.ambienttv.data.remote.api.AmbientBackendApi
import com.ambienttv.data.remote.api.InternetArchiveApi
import com.ambienttv.data.remote.api.PexelsApi
import com.ambienttv.data.remote.api.PixabayApi
import com.ambienttv.data.remote.api.YouTubeApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

/**
 * Hilt module that provides network dependencies.
 *
 * **Architecture note**: The Android TV app no longer holds third-party API keys.
 * All searches are proxied through the AmbientTV backend (see `/backend`).
 * The backend stores keys in its own `.env` file, keeping them out of the APK.
 *
 * Legacy Retrofit instances (YouTube, Pixabay, Pexels) are retained for
 * potential direct use in debug builds but are **not consumed** by production
 * repository code. The [RemoteDataSourceImpl] routes everything through
 * [AmbientBackendApi].
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    // ----- API Key Constants (legacy, no longer used in production) -----
    private const val YOUTUBE_API_KEY = ""
    private const val PIXABAY_API_KEY = ""
    private const val PEXELS_API_KEY = ""

    private val JSON_CONTENT_TYPE = "application/json".toMediaType()

    // ----- OkHttpClient -----

    @Provides
    @Singleton
    fun provideOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }

    // ----- JSON -----

    @Provides
    @Singleton
    fun provideJson(): Json {
        return Json {
            ignoreUnknownKeys = true
            isLenient = true
            encodeDefaults = true
        }
    }

    // ----- AmbientTV Backend (primary) -----

    /**
     * Provides an OkHttpClient with Bearer-token auth for the AmbientTV backend.
     * The token is read from BuildConfig.APP_SECRET (populated from local.properties).
     */
    @Provides
    @Singleton
    @Named("backendClient")
    fun provideBackendClient(okHttpClient: OkHttpClient): OkHttpClient {
        return okHttpClient.newBuilder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer ${BuildConfig.APP_SECRET}")
                    .build()
                chain.proceed(request)
            }
            .build()
    }

    /**
     * Provides the AmbientTV backend API.
     * Base URL points to the local backend server (Emulator: 10.0.2.2:3000).
     * Change to your production domain before release.
     */
    @Provides
    @Singleton
    fun provideAmbientBackendApi(
        @Named("backendClient") client: OkHttpClient,
        json: Json
    ): AmbientBackendApi {
        return Retrofit.Builder()
            .baseUrl(AmbientBackendApi.BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory(JSON_CONTENT_TYPE))
            .build()
            .create(AmbientBackendApi::class.java)
    }

    // ----- Legacy Direct APIs (retained for debug/fallback only) -----

    @Provides
    @Singleton
    @Named("youtubeClient")
    fun provideYouTubeClient(okHttpClient: OkHttpClient): OkHttpClient {
        return okHttpClient.newBuilder()
            .addInterceptor { chain ->
                val original = chain.request()
                val url = original.url.newBuilder()
                    .addQueryParameter("key", YOUTUBE_API_KEY)
                    .build()
                val request = original.newBuilder().url(url).build()
                chain.proceed(request)
            }
            .build()
    }

    @Provides
    @Singleton
    @Named("pixabayClient")
    fun providePixabayClient(okHttpClient: OkHttpClient): OkHttpClient {
        return okHttpClient.newBuilder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Authorization", PIXABAY_API_KEY)
                    .build()
                chain.proceed(request)
            }
            .build()
    }

    @Provides
    @Singleton
    @Named("pexelsClient")
    fun providePexelsClient(okHttpClient: OkHttpClient): OkHttpClient {
        return okHttpClient.newBuilder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Authorization", PEXELS_API_KEY)
                    .build()
                chain.proceed(request)
            }
            .build()
    }

    @Provides
    @Singleton
    fun provideYouTubeApi(
        @Named("youtubeClient") client: OkHttpClient,
        json: Json
    ): YouTubeApi {
        return Retrofit.Builder()
            .baseUrl(YouTubeApi.BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory(JSON_CONTENT_TYPE))
            .build()
            .create(YouTubeApi::class.java)
    }

    @Provides
    @Singleton
    fun providePixabayApi(
        @Named("pixabayClient") client: OkHttpClient,
        json: Json
    ): PixabayApi {
        return Retrofit.Builder()
            .baseUrl(PixabayApi.BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory(JSON_CONTENT_TYPE))
            .build()
            .create(PixabayApi::class.java)
    }

    @Provides
    @Singleton
    fun providePexelsApi(
        @Named("pexelsClient") client: OkHttpClient,
        json: Json
    ): PexelsApi {
        return Retrofit.Builder()
            .baseUrl(PexelsApi.BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory(JSON_CONTENT_TYPE))
            .build()
            .create(PexelsApi::class.java)
    }

    @Provides
    @Singleton
    fun provideInternetArchiveApi(
        okHttpClient: OkHttpClient,
        json: Json
    ): InternetArchiveApi {
        return Retrofit.Builder()
            .baseUrl(InternetArchiveApi.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(JSON_CONTENT_TYPE))
            .build()
            .create(InternetArchiveApi::class.java)
    }
}
