package com.ambienttv.domain.usecase

import com.ambienttv.domain.repository.SettingsRepository
import javax.inject.Inject

class UpdateSleepTimerUseCase @Inject constructor(
    private val repository: SettingsRepository
) {
    suspend operator fun invoke(minutes: Int) {
        repository.setSleepTimerMinutes(minutes)
    }
}
