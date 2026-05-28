package com.ambienttv.domain.repository

import com.ambienttv.domain.model.AppSettings
import kotlinx.coroutines.flow.Flow

/**
 * Repository for persisting and observing application-level user settings.
 *
 * Implementations are expected to store values durably (e.g. via DataStore Preferences)
 * so that settings survive process death and device reboots.
 */
interface SettingsRepository {

    /**
     * Hot stream that emits the current [AppSettings] whenever any preference changes.
     */
    fun settingsFlow(): Flow<AppSettings>

    /**
     * Suspending read of the current settings snapshot.
     */
    suspend fun getSettings(): AppSettings

    suspend fun setOnlineSources(enabled: Boolean)
    suspend fun setAiGeneration(enabled: Boolean)
    suspend fun setScanPaths(paths: List<String>)
    suspend fun setAudioVolume(volume: Float)
    suspend fun setAmbientMode(enabled: Boolean)
    suspend fun setSleepTimerMinutes(minutes: Int)
}
