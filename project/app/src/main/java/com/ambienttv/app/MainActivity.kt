package com.ambienttv.app

import android.content.Context
import android.content.pm.ActivityInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.util.UnstableApi
import com.ambienttv.app.navigation.TvNavigation
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main entry point activity for AmbientTV.
 *
 * Sets up the Compose TV UI with [TvNavigation] and handles:
 * - Audio focus management at the activity level
 * - Landscape orientation lock (TV apps are always landscape)
 * - Immersive full-screen mode (hides system bars)
 * - Edge-to-edge display
 *
 * Annotated with [@AndroidEntryPoint] to enable Hilt field injection
 * in the activity and its attached fragments/composables.
 */
@UnstableApi
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private var audioFocusRequest: AudioFocusRequest? = null
    private var hasAudioFocus: Boolean = false

    private val audioManager by lazy {
        getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

    private val audioAttributes by lazy {
        AudioAttributes.Builder()
            .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_MOVIE)
            .build()
    }

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                hasAudioFocus = true
            }
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                hasAudioFocus = false
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Allow ducking — lower volume temporarily
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Lock to landscape orientation (TV standard)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE

        // Request audio focus at the activity level
        requestAudioFocus()

        // Set up edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // Hide system bars for immersive TV experience
        val insetsController = WindowInsetsControllerCompat(window, window.decorView)
        insetsController.hide(WindowInsetsCompat.Type.systemBars())
        insetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

        val deepLinkPairId = intent?.data?.lastPathSegment

        // Set the Compose content
        setContent {
            TvNavigation(startPairId = deepLinkPairId)
        }
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        val pairId = intent?.data?.lastPathSegment ?: return
        // TvNavigation handles deep links via composition; for simplicity we rely on restart
        // or a shared event bus. For now, restart activity with the new intent.
        this.intent = intent
        recreate()
    }

    override fun onResume() {
        super.onResume()
        if (!hasAudioFocus) {
            requestAudioFocus()
        }
    }

    override fun onPause() {
        super.onPause()
        // Do not abandon audio focus on pause to allow quick resume
    }

    override fun onDestroy() {
        abandonAudioFocus()
        super.onDestroy()
    }

    /**
     * Requests audio focus from the system for media playback.
     * Uses AudioFocusRequest on API 26+ for proper focus handling.
     */
    private fun requestAudioFocus() {
        hasAudioFocus = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val afr = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(audioAttributes)
                .setWillPauseWhenDucked(true)
                .setOnAudioFocusChangeListener(audioFocusChangeListener)
                .build()
            audioFocusRequest = afr
            audioManager.requestAudioFocus(afr) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                audioFocusChangeListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    /**
     * Abandons audio focus when the activity is destroyed.
     */
    private fun abandonAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let {
                audioManager.abandonAudioFocusRequest(it)
            }
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(audioFocusChangeListener)
        }
        hasAudioFocus = false
    }
}
