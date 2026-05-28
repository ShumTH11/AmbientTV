package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Sealed class representing the status of an AI media generation request.
 */
@Serializable
public sealed class GenerationStatus {

    @Serializable
    public data class Pending(val generationId: String) : GenerationStatus()

    @Serializable
    public data class Processing(val generationId: String, val progress: Float) : GenerationStatus()

    @Serializable
    public data class Completed(val generationId: String, val contentItem: ContentItem) : GenerationStatus()

    @Serializable
    public data class Failed(val generationId: String, val reason: String) : GenerationStatus()
}
