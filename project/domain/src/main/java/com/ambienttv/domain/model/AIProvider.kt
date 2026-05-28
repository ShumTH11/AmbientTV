package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class AIProvider {
    SUNO,
    MUSICGEN,
    STABLE_AUDIO,
    RUNWAY,
    STABLE_VIDEO,
    PIKA
}
