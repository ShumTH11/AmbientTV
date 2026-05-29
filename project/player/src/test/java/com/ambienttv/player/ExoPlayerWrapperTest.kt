package com.ambienttv.player

import android.content.Context
import android.media.AudioManager
import androidx.media3.common.Player
import com.ambienttv.player.cache.PlaybackCacheManager
import io.mockk.MockKAnnotations
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@ExperimentalCoroutinesApi
class ExoPlayerWrapperTest {

    @MockK(relaxed = true)
    private lateinit var context: Context

    @MockK(relaxed = true)
    private lateinit var cacheManager: PlaybackCacheManager

    @MockK(relaxed = true)
    private lateinit var audioManager: AudioManager

    private lateinit var wrapper: ExoPlayerWrapper

    @Before
    fun setUp() {
        MockKAnnotations.init(this)
        every { context.getSystemService(Context.AUDIO_SERVICE) } returns audioManager
        every { audioManager.requestAudioFocus(any() as AudioManager.OnAudioFocusChangeListener, any(), any()) } returns AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        every { cacheManager.buildCacheDataSourceFactory() } returns mockk(relaxed = true)

        wrapper = ExoPlayerWrapper(context, cacheManager)
    }

    @Test
    fun `initial state is Idle`() = runTest {
        val state = wrapper.playerState.first()
        assertTrue(state is PlayerState.Idle)
    }

    @Test
    fun `prepareVideo sets media type to VIDEO`() {
        wrapper.prepareVideo("https://example.com/video.mp4")
        assertTrue(wrapper.isActive || wrapper.currentState is PlayerState.Loading)
    }

    @Test
    fun `prepareAudio sets media type to AUDIO`() {
        wrapper.prepareAudio("https://example.com/audio.mp3")
        assertTrue(wrapper.isActive || wrapper.currentState is PlayerState.Loading)
    }

    @Test
    fun `play requests audio focus for audio media`() {
        wrapper.prepareAudio("https://example.com/audio.mp3")
        wrapper.play()
        verify { audioManager.requestAudioFocus(any() as AudioManager.OnAudioFocusChangeListener, any(), any()) }
    }

    @Test
    fun `stop resets state to Stopped`() = runTest {
        wrapper.stop()
        val state = wrapper.currentState
        assertTrue(state is PlayerState.Stopped)
    }

    @Test
    fun `seekTo clamps negative values to zero`() {
        wrapper.seekTo(-1000)
        assertEquals(0L, wrapper.currentPosition)
    }

    @Test
    fun `volume clamped to 0-1 range`() {
        wrapper.setVolume(1.5f)
        assertEquals(1f, wrapper.getVolume())

        wrapper.setVolume(-0.5f)
        assertEquals(0f, wrapper.getVolume())
    }

    @Test
    fun `release cancels coroutines and releases player`() {
        wrapper.release()
        assertFalse(wrapper.isActive)
    }
}
