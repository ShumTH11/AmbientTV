package com.ambienttv.domain.usecase

import com.ambienttv.domain.repository.SettingsRepository
import javax.inject.Inject

class UpdateAmbientModeUseCase @Inject constructor(
    private val repository: SettingsRepository
) {
    suspend operator fun invoke(enabled: Boolean) {
        repository.setAmbientMode(enabled)
    }
}
