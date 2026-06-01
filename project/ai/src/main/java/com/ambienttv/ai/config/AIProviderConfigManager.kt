package com.ambienttv.ai.config

import android.content.Context
import com.ambienttv.domain.model.AIProvider
import com.ambienttv.domain.model.AIProviderConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Loads and manages AI provider configuration from a JSON config file.
 *
 * Reads provider settings (API keys, base URLs, timeouts, enabled flags)
 * from `assets/ai_providers.json` or falls back to a safe default config
 * where all providers are disabled.
 *
 * This ensures the app never crashes due to missing AI provider config,
 * and all AI generation gracefully falls back to local content.
 */
@Singleton
public class AIProviderConfigManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = false
        isLenient = true
    }

    /**
     * Loads the AI provider configuration map.
     *
     * First attempts to read from `assets/ai_providers.json`. If the file
     * is missing or malformed, returns the default config where all
     * providers are disabled (safe fallback).
     *
     * @return Map of [AIProvider] to [AIProviderConfig] for each known provider.
     */
    public fun loadConfig(): Map<AIProvider, AIProviderConfig> {
        return try {
            val assetConfig = loadFromAssets()
            if (assetConfig != null && assetConfig.providers.isNotEmpty()) {
                assetConfig.providers.associateBy({ it.provider }, { it.toDomainConfig() })
            } else {
                defaultConfig()
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to load AI provider config, using defaults")
            defaultConfig()
        }
    }

    /**
     * Returns the config for a specific provider, or a disabled default.
     */
    public fun getProviderConfig(provider: AIProvider): AIProviderConfig {
        return loadConfig()[provider]
            ?: AIProviderConfig(
                provider = provider,
                apiKey = null,
                baseUrl = null,
                timeoutMs = DEFAULT_TIMEOUT_MS,
                enabled = false
            )
    }

    /**
     * Returns true if at least one provider is enabled for the given media type.
     */
    public fun hasEnabledProvider(type: com.ambienttv.domain.model.MediaType): Boolean {
        val config = loadConfig()
        return when (type) {
            com.ambienttv.domain.model.MediaType.AUDIO ->
                AUDIO_PROVIDERS.any { config[it]?.enabled == true }

            com.ambienttv.domain.model.MediaType.VIDEO ->
                VIDEO_PROVIDERS.any { config[it]?.enabled == true }
        }
    }

    // ── private helpers ────────────────────────────────────────────────────

    private fun loadFromAssets(): ProviderConfigRoot? {
        return try {
            context.assets.open(CONFIG_FILE_NAME).use { stream ->
                val content = stream.bufferedReader().use { it.readText() }
                json.decodeFromString(ProviderConfigRoot.serializer(), content)
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to load AI config from assets")
            null
        }
    }

    private fun defaultConfig(): Map<AIProvider, AIProviderConfig> {
        return ALL_PROVIDERS.associateWith { provider ->
            AIProviderConfig(
                provider = provider,
                apiKey = null,
                baseUrl = when (provider) {
                    AIProvider.SUNO -> "https://api.suno.ai"
                    AIProvider.MUSICGEN -> "https://api.musicgen.ai"
                    AIProvider.STABLE_AUDIO -> "https://api.stability.ai/v1/audio"
                    AIProvider.RUNWAY -> "https://api.runwayml.com/v1"
                    AIProvider.STABLE_VIDEO -> "https://api.stability.ai/v1/video"
                    AIProvider.PIKA -> "https://api.pika.art"
                },
                timeoutMs = DEFAULT_TIMEOUT_MS,
                enabled = false // All disabled by default — safe fallback
            )
        }
    }

    private companion object {
        const val CONFIG_FILE_NAME = "ai_providers.json"
        const val DEFAULT_TIMEOUT_MS = 30_000L

        val AUDIO_PROVIDERS = setOf(
            AIProvider.SUNO,
            AIProvider.MUSICGEN,
            AIProvider.STABLE_AUDIO
        )

        val VIDEO_PROVIDERS = setOf(
            AIProvider.RUNWAY,
            AIProvider.STABLE_VIDEO,
            AIProvider.PIKA
        )

        val ALL_PROVIDERS = AIProvider.entries.toList()
    }
}

/**
 * Serializable root object for the AI providers JSON config file.
 */
@Serializable
private data class ProviderConfigRoot(
    val version: Int = 1,
    val providers: List<ProviderConfigEntry> = emptyList()
)

/**
 * Serializable entry for a single provider in the JSON config.
 */
@Serializable
private data class ProviderConfigEntry(
    val provider: AIProvider,
    val apiKey: String? = null,
    val baseUrl: String? = null,
    val timeoutMs: Long = 30_000L,
    val enabled: Boolean = false
) {
    /**
     * Converts to the domain [AIProviderConfig] model.
     */
    fun toDomainConfig(): AIProviderConfig = AIProviderConfig(
        provider = provider,
        apiKey = apiKey,
        baseUrl = baseUrl,
        timeoutMs = timeoutMs,
        enabled = enabled
    )
}
