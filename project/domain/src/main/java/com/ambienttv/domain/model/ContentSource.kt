package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class ContentSource {
    LOCAL,
    YOUTUBE,
    INTERNET_ARCHIVE,
    PIXABAY,
    PEXELS,
    AI_GENERATED
}
