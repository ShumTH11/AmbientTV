package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ScanResult
import com.ambienttv.domain.preset.ScanPaths
import com.ambienttv.domain.repository.ContentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

/**
 * Use case for scanning local storage for media content.
 * Emits progress updates and final results as a Flow.
 */
public class ScanLocalContentUseCase @Inject constructor(
    private val contentRepository: ContentRepository
) {

    /**
     * Scans the specified paths (or defaults) for local media content.
     *
     * @param paths List of directory paths to scan, defaults to combined music and video paths
     * @return Flow emitting scan progress and results
     */
    public suspend operator fun invoke(
        paths: List<String> = ScanPaths.DEFAULT_MUSIC_PATHS + ScanPaths.DEFAULT_VIDEO_PATHS
    ): Flow<ScanResult> = flow {
        var totalScanned = 0
        val allItems = mutableListOf<com.ambienttv.domain.model.ContentItem>()

        contentRepository.scanLocalContent(paths).collect { batch ->
            totalScanned += batch.size
            allItems.addAll(batch)
            emit(
                ScanResult.Progress(
                    scanned = totalScanned,
                    total = paths.size,
                    currentPath = paths.getOrElse(totalScanned % paths.size) { "" }
                )
            )
        }

        emit(ScanResult.Completed(items = allItems.toList()))
    }
}
