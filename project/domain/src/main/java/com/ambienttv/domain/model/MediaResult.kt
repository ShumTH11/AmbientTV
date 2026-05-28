package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Sealed class representing the result of a media generation operation.
 */
@Serializable
public sealed class MediaResult {

    @Serializable
    public data class Success(val contentItem: ContentItem) : MediaResult()

    @Serializable
    public data class Error(val message: String, val fallback: ContentItem? = null) : MediaResult()

    @Serializable
    public data class InProgress(val progress: Float) : MediaResult()
}
