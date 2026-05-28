package com.ambienttv.domain.usecase

import com.ambienttv.domain.repository.SettingsRepository
import javax.inject.Inject

class UpdateScanPathsUseCase @Inject constructor(
    private val repository: SettingsRepository
) {
    suspend operator fun invoke(paths: List<String>) {
        repository.setScanPaths(paths)
    }
}
