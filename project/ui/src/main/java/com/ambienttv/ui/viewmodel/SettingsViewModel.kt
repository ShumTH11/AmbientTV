package com.ambienttv.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ambienttv.domain.model.ScanResult
import com.ambienttv.domain.usecase.GetSettingsUseCase
import com.ambienttv.domain.usecase.ScanLocalContentUseCase
import com.ambienttv.domain.usecase.UpdateAiGenerationUseCase
import com.ambienttv.domain.usecase.UpdateOnlineSourcesUseCase
import com.ambienttv.domain.usecase.UpdateScanPathsUseCase
import com.ambienttv.domain.usecase.UpdateSleepTimerUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the Settings screen.
 *
 * Manages content source settings, AI configuration toggles, and local content scanning.
 * All settings are now persisted via DataStore and survive process death / reboot.
 *
 * @param getSettingsUseCase Stream of persisted [AppSettings]
 * @param scanLocalContentUseCase Use case for scanning local storage for media content
 * @param updateOnlineSourcesUseCase Persist online-sources toggle
 * @param updateAiGenerationUseCase Persist AI-generation toggle
 * @param updateScanPathsUseCase Persist scan-paths list
 * @param updateSleepTimerUseCase Persist sleep-timer value
 */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    getSettingsUseCase: GetSettingsUseCase,
    private val scanLocalContentUseCase: ScanLocalContentUseCase,
    private val updateOnlineSourcesUseCase: UpdateOnlineSourcesUseCase,
    private val updateAiGenerationUseCase: UpdateAiGenerationUseCase,
    private val updateScanPathsUseCase: UpdateScanPathsUseCase,
    private val updateSleepTimerUseCase: UpdateSleepTimerUseCase
) : ViewModel() {

    /**
     * Current settings snapshot (hot, survives configuration changes and reboots).
     */
    val settings = getSettingsUseCase()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = com.ambienttv.domain.model.AppSettings()
        )

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val _scanProgress = MutableStateFlow<Triple<Int, Int, String>?>(null)
    val scanProgress: StateFlow<Triple<Int, Int, String>?> = _scanProgress.asStateFlow()

    private val _scanCompleted = MutableStateFlow(false)
    val scanCompleted: StateFlow<Boolean> = _scanCompleted.asStateFlow()

    private val _lastScanResult = MutableStateFlow(0)
    val lastScanResult: StateFlow<Int> = _lastScanResult.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    /**
     * Triggers a scan of local content directories (taken from persisted settings).
     */
    fun scanNow() {
        viewModelScope.launch {
            _isScanning.value = true
            _scanCompleted.value = false
            _scanProgress.value = null
            _errorMessage.value = null

            val paths = settings.value.scanPaths
            if (paths.isEmpty()) {
                _isScanning.value = false
                _errorMessage.value = "No scan paths configured. Add paths in settings."
                return@launch
            }

            try {
                scanLocalContentUseCase(paths = paths)
                    .onEach { result ->
                        when (result) {
                            is ScanResult.Progress -> {
                                _scanProgress.value = Triple(
                                    result.scanned,
                                    result.total,
                                    result.currentPath
                                )
                            }
                            is ScanResult.Completed -> {
                                _lastScanResult.value = result.items.size
                                _isScanning.value = false
                                _scanCompleted.value = true
                                _scanProgress.value = null
                            }
                            is ScanResult.Error -> {
                                _errorMessage.value =
                                    "Scan error at ${result.path}: ${result.message}"
                            }
                        }
                    }
                    .launchIn(this)
            } catch (e: Exception) {
                _isScanning.value = false
                _errorMessage.value = e.message ?: "Scan failed"
            }
        }
    }

    fun toggleOnline() {
        viewModelScope.launch {
            updateOnlineSourcesUseCase(!settings.value.onlineSourcesEnabled)
        }
    }

    fun toggleAI() {
        viewModelScope.launch {
            updateAiGenerationUseCase(!settings.value.aiGenerationEnabled)
        }
    }

    fun updatePaths(paths: List<String>) {
        viewModelScope.launch {
            updateScanPathsUseCase(paths)
        }
    }

    fun addPath(path: String) {
        if (path.isNotBlank() && !settings.value.scanPaths.contains(path)) {
            updatePaths(settings.value.scanPaths + path)
        }
    }

    fun removePath(path: String) {
        updatePaths(settings.value.scanPaths.filter { it != path })
    }

    fun setSleepTimer(minutes: Int) {
        viewModelScope.launch {
            updateSleepTimerUseCase(minutes)
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun resetScanCompleted() {
        _scanCompleted.value = false
    }
}
