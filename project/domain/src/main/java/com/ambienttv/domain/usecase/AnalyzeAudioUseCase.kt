package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.AudioAnalysisResult

/**
 * Analyzes a local audio file to extract BPM and musical key.
 * Returns null if analysis fails or format is unsupported.
 */
interface AnalyzeAudioUseCase {
    suspend operator fun invoke(filePath: String): AudioAnalysisResult?
}
