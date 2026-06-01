package com.ambienttv.domain.preset

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ScanPathsTest {

    @Test
    fun `default music paths contains expected paths`() {
        val paths = ScanPaths.DEFAULT_MUSIC_PATHS
        assertTrue(paths.contains("/media/music"))
        assertTrue(paths.contains("/sdcard/Music"))
        assertTrue(paths.contains("/storage/usb/music"))
    }

    @Test
    fun `default video paths contains expected paths`() {
        val paths = ScanPaths.DEFAULT_VIDEO_PATHS
        assertTrue(paths.contains("/media/videos"))
        assertTrue(paths.contains("/sdcard/Videos"))
        assertTrue(paths.contains("/storage/usb/videos"))
    }

    @Test
    fun `default pairs paths contains expected paths`() {
        val paths = ScanPaths.DEFAULT_PAIRS_PATHS
        assertTrue(paths.contains("/media/pairs"))
        assertTrue(paths.contains("/sdcard/AmbientTV/pairs"))
    }

    @Test
    fun `supported video extensions`() {
        val exts = ScanPaths.SUPPORTED_VIDEO_EXTENSIONS
        assertEquals(listOf("mp4", "webm", "mkv"), exts)
    }

    @Test
    fun `supported audio extensions`() {
        val exts = ScanPaths.SUPPORTED_AUDIO_EXTENSIONS
        assertEquals(listOf("mp3", "ogg", "aac", "flac", "wav"), exts)
    }

    @Test
    fun `audio and video extensions do not overlap`() {
        val overlap = ScanPaths.SUPPORTED_AUDIO_EXTENSIONS.intersect(
            ScanPaths.SUPPORTED_VIDEO_EXTENSIONS.toSet()
        )
        assertTrue("Audio and video extensions should not overlap", overlap.isEmpty())
    }
}
