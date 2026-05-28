package com.ambienttv.data.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.ambienttv.domain.model.AppSettings
import com.ambienttv.domain.preset.ScanPaths
import com.ambienttv.domain.repository.SettingsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "ambienttv_settings")

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context
) : SettingsRepository {

    private val dataStore = context.dataStore

    private object Keys {
        val ONLINE_SOURCES = booleanPreferencesKey("online_sources_enabled")
        val AI_GENERATION = booleanPreferencesKey("ai_generation_enabled")
        val SCAN_PATHS = stringPreferencesKey("scan_paths_json")
        val AUDIO_VOLUME = floatPreferencesKey("audio_volume")
        val AMBIENT_MODE = booleanPreferencesKey("ambient_mode_enabled")
        val SLEEP_TIMER = intPreferencesKey("sleep_timer_minutes")
    }

    override fun settingsFlow(): Flow<AppSettings> = dataStore.data.map { prefs ->
        AppSettings(
            onlineSourcesEnabled = prefs[Keys.ONLINE_SOURCES] ?: true,
            aiGenerationEnabled = prefs[Keys.AI_GENERATION] ?: false,
            scanPaths = parseScanPaths(prefs[Keys.SCAN_PATHS]),
            audioVolume = prefs[Keys.AUDIO_VOLUME] ?: 1.0f,
            ambientModeEnabled = prefs[Keys.AMBIENT_MODE] ?: false,
            sleepTimerMinutes = prefs[Keys.SLEEP_TIMER] ?: 0
        )
    }

    override suspend fun getSettings(): AppSettings = settingsFlow().first()

    override suspend fun setOnlineSources(enabled: Boolean) {
        dataStore.edit { it[Keys.ONLINE_SOURCES] = enabled }
    }

    override suspend fun setAiGeneration(enabled: Boolean) {
        dataStore.edit { it[Keys.AI_GENERATION] = enabled }
    }

    override suspend fun setScanPaths(paths: List<String>) {
        dataStore.edit { it[Keys.SCAN_PATHS] = paths.joinToString("|") }
    }

    override suspend fun setAudioVolume(volume: Float) {
        dataStore.edit { it[Keys.AUDIO_VOLUME] = volume.coerceIn(0f, 1f) }
    }

    override suspend fun setAmbientMode(enabled: Boolean) {
        dataStore.edit { it[Keys.AMBIENT_MODE] = enabled }
    }

    override suspend fun setSleepTimerMinutes(minutes: Int) {
        dataStore.edit { it[Keys.SLEEP_TIMER] = minutes.coerceAtLeast(0) }
    }

    private fun parseScanPaths(raw: String?): List<String> {
        if (raw.isNullOrBlank()) {
            return ScanPaths.DEFAULT_MUSIC_PATHS + ScanPaths.DEFAULT_VIDEO_PATHS
        }
        return raw.split("|").filter { it.isNotBlank() }
    }
}
