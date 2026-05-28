package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class LicenseType {
    FREE,
    CC0,
    CREATIVE_COMMONS,
    PROPRIETARY
}
