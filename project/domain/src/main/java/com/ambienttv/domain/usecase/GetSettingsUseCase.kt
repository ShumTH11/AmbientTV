package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.AppSettings
import com.ambienttv.domain.repository.SettingsRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetSettingsUseCase @Inject constructor(
    private val repository: SettingsRepository
) {
    operator fun invoke(): Flow<AppSettings> = repository.settingsFlow()
}
