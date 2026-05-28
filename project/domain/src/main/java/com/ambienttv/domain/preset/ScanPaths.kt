package com.ambienttv.domain.preset

/**
 * Default file system paths and supported media extensions for local content scanning.
 * These paths are checked during the initial scan for local media files.
 */
public object ScanPaths {

    /**
     * Default paths to scan for music/audio files.
     */
    public val DEFAULT_MUSIC_PATHS: List<String> = listOf(
        "/media/music",
        "/sdcard/Music",
        "/storage/usb/music"
    )

    /**
     * Default paths to scan for video files.
     */
    public val DEFAULT_VIDEO_PATHS: List<String> = listOf(
        "/media/videos",
        "/sdcard/Videos",
        "/storage/usb/videos"
    )

    /**
     * Default paths to scan for pre-matched content pairs.
     */
    public val DEFAULT_PAIRS_PATHS: List<String> = listOf(
        "/media/pairs",
        "/sdcard/AmbientTV/pairs"
    )

    /**
     * Supported video file extensions for local scanning.
     */
    public val SUPPORTED_VIDEO_EXTENSIONS: List<String> = listOf("mp4", "webm", "mkv")

    /**
     * Supported audio file extensions for local scanning.
     */
    public val SUPPORTED_AUDIO_EXTENSIONS: List<String> = listOf("mp3", "ogg", "aac", "flac", "wav")
}
