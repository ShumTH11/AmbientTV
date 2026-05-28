package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Result of validating a content item's license for playback.
 */
@Serializable
public data class LicenseValidation(
    val isValid: Boolean,
    val requiresAttribution: Boolean,
    val attributionText: String? = null,
    val restrictions: List<String> = emptyList()
)
