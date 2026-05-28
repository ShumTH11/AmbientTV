package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Configuration for an AI media generation provider.
 */
@Serializable
public data class AIProviderConfig(
    val provider: AIProvider,
    val apiKey: String?,
    val baseUrl: String?,
    val timeoutMs: Long = 30000,
    val enabled: Boolean = true
)
