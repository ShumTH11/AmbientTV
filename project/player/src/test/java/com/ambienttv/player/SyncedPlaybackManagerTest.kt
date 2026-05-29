package com.ambienttv.player

import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import io.mockk.MockKAnnotations
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.verify
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@ExperimentalCoroutinesApi
class SyncedPlaybackManagerTest {

    @MockK(relaxed = true)
    private lateinit var videoPlayer: ExoPlayerWrapper

    @MockK(relaxed = true)
    private lateinit var audioPlayer: ExoPlayerWrapper

    private lateinit var manager: SyncedPlaybackManager

    @Before
    fun setUp() {
        MockKAnnotations.init(this)
        every { videoPlayer.player } returns mockk(relaxed = true)
        every { audioPlayer.player } returns mockk(relaxed = true)
        manager = SyncedPlaybackManager(videoPlayer, audioPlayer)
    }

    @Test
    fun `initial state is Idle`() = runTest {
        val state = manager.state.first()
        assertEquals(SyncedPlaybackState.Idle, state)
    }

    @Test
    fun `prepareBoth sets state to Ready when both players ready`() = runTest {
        every { videoPlayer.currentState } returns PlayerState.Ready
        every { audioPlayer.currentState } returns PlayerState.Ready
        
        manager.prepareBoth(
            videoUrl = "https://example.com/video.mp4",
            audioUrl = "https://example.com/audio.mp3"
        )
        
        verify { videoPlayer.prepareVideo("https://example.com/video.mp4") }
        verify { audioPlayer.prepareAudio("https://example.com/audio.mp3") }
    }

    @Test
    fun `playBoth calls play on both players`() {
        manager.playBoth()
        verify { videoPlayer.play() }
        verify { audioPlayer.play() }
    }

    @Test
    fun `pauseBoth calls pause on both players`() {
        manager.pauseBoth()
        verify { videoPlayer.pause() }
        verify { audioPlayer.pause() }
    }

    @Test
    fun `syncPositions seeks audio to video position`() {
        every { videoPlayer.currentPosition } returns 5000L
        
        manager.syncPositions()
        verify { audioPlayer.seekTo(5000L) }
    }

    @Test
    fun `release releases both players`() {
        manager.release()
        verify { videoPlayer.release() }
        verify { audioPlayer.release() }
    }
}
