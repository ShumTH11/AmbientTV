package com.ambienttv.domain.usecase

import com.ambienttv.domain.repository.SettingsRepository
import javax.inject.Inject

class UpdateOnlineSourcesUseCase @Inject constructor(
    private val repository: SettingsRepository
) {
    suspend operator fun invoke(enabled: Boolean) {
        repository.setOnlineSources(enabled)
    }
}
