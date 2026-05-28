package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Sealed class representing how content was resolved for a given category.
 * Content can come from local storage, remote APIs, AI generation, or fallback defaults.
 */
@Serializable
public sealed class ContentResolution {

    @Serializable
    public data class Local(val items: List<ContentItem>) : ContentResolution()

    @Serializable
    public data class Remote(val items: List<ContentItem>) : ContentResolution()

    @Serializable
    public data class Generated(val result: MediaResult) : ContentResolution()

    @Serializable
    public data class Fallback(val defaultCategory: ContentCategory) : ContentResolution()
}
