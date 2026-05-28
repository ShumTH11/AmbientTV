package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class MatchPriority {
    EXACT_MATCH,
    PARTIAL_MATCH,
    FALLBACK
}
