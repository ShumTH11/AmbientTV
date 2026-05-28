package com.ambienttv.data.local

import com.ambienttv.data.datasource.ContentMetadata
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.preset.ScanPaths
import com.ambienttv.domain.usecase.AnalyzeAudioUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.util.UUID
import javax.inject.Inject

/**
 * Scans directories for media files, parses ID3 tags from audio files,
 * and reads sidecar JSON metadata files.
 *
 * Supported audio formats: MP3, OGG, AAC, FLAC, WAV
 * Supported video formats: MP4, WebM, MKV
 */
class FileScanner @Inject constructor(
    private val analyzeAudioUseCase: AnalyzeAudioUseCase
) {

    private val json = Json { ignoreUnknownKeys = true }

    private val audioExtensions = ScanPaths.SUPPORTED_AUDIO_EXTENSIONS
    private val videoExtensions = ScanPaths.SUPPORTED_VIDEO_EXTENSIONS

    private val allSupportedExtensions = audioExtensions + videoExtensions

    /**
     * Scans a directory recursively for media files with supported extensions.
     *
     * @param path Directory path to scan
     * @param extensions List of file extensions to include (without dots)
     * @return Flow emitting each discovered file
     */
    fun scanDirectory(path: String, extensions: List<String>): Flow<File> = flow {
        val dir = File(path)
        if (!dir.exists() || !dir.isDirectory) {
            return@flow
        }

        val files = dir.walkTopDown()
            .filter { file ->
                file.isFile && extensions.any { ext ->
                    file.extension.equals(ext, ignoreCase = true)
                }
            }

        files.forEach { file ->
            emit(file)
        }
    }.flowOn(Dispatchers.IO)

    /**
     * Scans multiple directories for all supported media types.
     *
     * @param paths List of directory paths to scan
     * @return Flow emitting batches of discovered content items
     */
    fun scanDirectories(paths: List<String>): Flow<List<ContentItem>> = flow {
        val items = mutableListOf<ContentItem>()

        for (path in paths) {
            val dir = File(path)
            if (!dir.exists() || !dir.isDirectory) continue

            dir.walkTopDown()
                .filter { it.isFile }
                .forEach { file ->
                    val contentItem = processMediaFile(file)
                    if (contentItem != null) {
                        items.add(contentItem)
                        if (items.size >= BATCH_SIZE) {
                            emit(items.toList())
                            items.clear()
                        }
                    }
                }
        }

        if (items.isNotEmpty()) {
            emit(items.toList())
        }
    }.flowOn(Dispatchers.IO)

    /**
     * Processes a single media file into a ContentItem.
     * Attempts to read sidecar JSON metadata and parse ID3 tags for audio.
     */
    private suspend fun processMediaFile(file: File): ContentItem? {
        val ext = file.extension.lowercase()
        if (ext !in allSupportedExtensions) return null

        val mediaType = when {
            audioExtensions.contains(ext) -> MediaType.AUDIO
            videoExtensions.contains(ext) -> MediaType.VIDEO
            else -> return null
        }

        val sidecarFile = File(file.parent, "${file.nameWithoutExtension}.json")
        val sidecarMetadata = if (sidecarFile.exists()) {
            parseSidecarJson(sidecarFile)
        } else null

        val id3Metadata = if (mediaType == MediaType.AUDIO) {
            parseId3Tags(file)
        } else null

        val metadata = mergeMetadata(id3Metadata, sidecarMetadata)

        // Run audio analysis for local audio files if BPM/key not already known
        val analysis = if (mediaType == MediaType.AUDIO && metadata?.bpm == null) {
            analyzeAudioUseCase(file.absolutePath)
        } else null

        val category = inferCategoryFromMetadata(sidecarMetadata, file.name)

        val tags = buildTagsFromMetadata(sidecarMetadata, file, analysis)

        return ContentItem(
            id = UUID.nameUUIDFromBytes(file.absolutePath.toByteArray()).toString(),
            type = mediaType,
            source = ContentSource.LOCAL,
            uri = file.toURI().toString(),
            title = file.nameWithoutExtension.replace("_", " ").replace("-", " "),
            tags = tags,
            category = category,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata(
                durationMs = metadata?.durationMs ?: 0,
                bpm = analysis?.bpm ?: metadata?.bpm,
                musicalKey = analysis?.musicalKey,
                mood = metadata?.mood ?: sidecarMetadata?.mood,
                era = metadata?.era,
                colorPalette = metadata?.colorPalette ?: emptyList(),
                resolution = metadata?.resolution,
                fileSize = file.length()
            ),
            localPath = file.absolutePath,
            createdAt = file.lastModified()
        )
    }

    /**
     * Parses a sidecar JSON file for metadata.
     * Expected format: { "category": "...", "mood": "...", "bpm": 120, "tags": [...] }
     */
    fun parseSidecarJson(jsonFile: File): ContentMetadata? {
        return try {
            val content = jsonFile.readText()
            val jsonObj = json.parseToJsonElement(content) as? JsonObject
                ?: return null

            val tags = (jsonObj["tags"] as? kotlinx.serialization.json.JsonArray)?.map { 
                it.jsonPrimitive.content 
            } ?: emptyList()

            ContentMetadata(
                title = jsonObj["title"]?.jsonPrimitive?.content,
                category = (jsonObj["category"] as? kotlinx.serialization.json.JsonPrimitive)?.content,
                mood = jsonObj["mood"]?.jsonPrimitive?.content,
                bpm = (jsonObj["bpm"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.toFloatOrNull(),
                era = jsonObj["era"]?.jsonPrimitive?.content,
                tags = tags
            )
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Parses ID3 tags from audio files.
     * Supports basic metadata extraction from MP3 and other audio formats.
     */
    fun parseId3Tags(audioFile: File): MediaMetadata? {
        return try {
            val extension = audioFile.extension.lowercase()

            when (extension) {
                "mp3" -> parseMp3Tags(audioFile)
                "ogg" -> parseOggTags(audioFile)
                "flac" -> parseFlacTags(audioFile)
                "aac", "wav" -> parseGenericAudioTags(audioFile)
                else -> null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun parseMp3Tags(file: File): MediaMetadata {
        return try {
            val audioStream = java.io.FileInputStream(file)
            val duration = estimateAudioDuration(file)
            audioStream.close()

            MediaMetadata(
                durationMs = duration,
                fileSize = file.length()
            )
        } catch (_: Exception) {
            MediaMetadata(fileSize = file.length())
        }
    }

    private fun parseOggTags(file: File): MediaMetadata {
        return MediaMetadata(
            durationMs = estimateAudioDuration(file),
            fileSize = file.length()
        )
    }

    private fun parseFlacTags(file: File): MediaMetadata {
        return MediaMetadata(
            durationMs = estimateAudioDuration(file),
            fileSize = file.length()
        )
    }

    private fun parseGenericAudioTags(file: File): MediaMetadata {
        return MediaMetadata(
            durationMs = estimateAudioDuration(file),
            fileSize = file.length()
        )
    }

    private fun estimateAudioDuration(file: File): Long {
        return try {
            val fileSize = file.length()
            val bitrate = when (file.extension.lowercase()) {
                "mp3" -> 128000
                "ogg" -> 160000
                "flac" -> 800000
                "aac" -> 128000
                "wav" -> 1411200
                else -> 128000
            }
            (fileSize * 8 * 1000) / bitrate
        } catch (_: Exception) {
            0L
        }
    }

    private fun mergeMetadata(
        id3Metadata: MediaMetadata?,
        sidecarMetadata: ContentMetadata?
    ): MediaMetadata? {
        return if (id3Metadata != null && sidecarMetadata != null) {
            id3Metadata.copy(
                bpm = sidecarMetadata.bpm ?: id3Metadata.bpm,
                mood = sidecarMetadata.mood ?: id3Metadata.mood,
                era = sidecarMetadata.era ?: id3Metadata.era,
                colorPalette = sidecarMetadata.tags.ifEmpty { id3Metadata.colorPalette }
            )
        } else {
            id3Metadata
        }
    }

    private fun inferCategoryFromMetadata(
        sidecarMetadata: ContentMetadata?,
        fileName: String
    ): ContentCategory {
        val mood = sidecarMetadata?.mood?.lowercase() ?: ""
        val categoryId = sidecarMetadata?.category?.lowercase() ?: ""

        return when {
            categoryId.contains("christmas") || mood.contains("festive") || mood.contains("holiday") -> {
                com.ambienttv.domain.preset.DefaultCategories.CHRISTMAS
            }
            categoryId.contains("fantasy") || mood.contains("epic") || mood.contains("medieval") -> {
                com.ambienttv.domain.preset.DefaultCategories.FANTASY
            }
            categoryId.contains("cyberpunk") || mood.contains("dark") || mood.contains("futuristic") || 
                mood.contains("neon") -> {
                com.ambienttv.domain.preset.DefaultCategories.CYBERPUNK
            }
            categoryId.contains("nature") || mood.contains("calm") || mood.contains("relax") || 
                mood.contains("ambient") -> {
                com.ambienttv.domain.preset.DefaultCategories.NATURE
            }
            categoryId.contains("steampunk") || mood.contains("industrial") || mood.contains("victorian") -> {
                com.ambienttv.domain.preset.DefaultCategories.STEAMPUNK
            }
            fileName.lowercase().contains("christmas") -> com.ambienttv.domain.preset.DefaultCategories.CHRISTMAS
            fileName.lowercase().contains("fantasy") -> com.ambienttv.domain.preset.DefaultCategories.FANTASY
            fileName.lowercase().contains("cyber") -> com.ambienttv.domain.preset.DefaultCategories.CYBERPUNK
            fileName.lowercase().contains("nature") || fileName.lowercase().contains("ambient") -> {
                com.ambienttv.domain.preset.DefaultCategories.NATURE
            }
            else -> com.ambienttv.domain.preset.DefaultCategories.NATURE
        }
    }

    private fun buildTagsFromMetadata(
        sidecarMetadata: ContentMetadata?,
        file: File,
        analysis: com.ambienttv.domain.model.AudioAnalysisResult?
    ): List<ContentTag> {
        val tags = mutableListOf<ContentTag>()

        sidecarMetadata?.mood?.let {
            tags.add(ContentTag("mood", it, 1.0f))
        }
        sidecarMetadata?.category?.let {
            tags.add(ContentTag("category", it, 1.0f))
        }
        (sidecarMetadata?.bpm ?: analysis?.bpm?.toInt())?.let {
            tags.add(ContentTag("bpm", it.toString(), 0.9f))
        }
        analysis?.musicalKey?.let {
            tags.add(ContentTag("key", it, 0.85f))
        }
        sidecarMetadata?.era?.let {
            tags.add(ContentTag("era", it, 0.8f))
        }

        val ext = file.extension.lowercase()
        tags.add(ContentTag("format", ext, 0.5f))

        return tags
    }

    companion object {
        private const val BATCH_SIZE = 10
    }
}


