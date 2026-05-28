package com.ambienttv.player.analyzer

import com.ambienttv.domain.model.AudioAnalysisResult
import com.ambienttv.domain.usecase.AnalyzeAudioUseCase
import javax.inject.Inject

class AnalyzeAudioUseCaseImpl @Inject constructor(
    private val analyzer: AudioAnalyzer
) : AnalyzeAudioUseCase {

    override suspend fun invoke(filePath: String): AudioAnalysisResult? {
        return analyzer.analyze(filePath)
    }
}
