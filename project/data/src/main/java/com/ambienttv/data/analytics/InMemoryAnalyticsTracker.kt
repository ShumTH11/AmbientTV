package com.ambienttv.data.analytics

import com.ambienttv.domain.analytics.AnalyticsTracker
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * In-memory analytics tracker that batches events and logs them.
 *
 * In production, this would be replaced with a backend upload
 * (e.g., to a self-hosted Plausible/Matomo instance or Firebase Analytics
 * with IP anonymization enabled).
 *
 * All events are anonymous — no user IDs, device IDs, or PII.
 */
@Singleton
class InMemoryAnalyticsTracker @Inject constructor() : AnalyticsTracker {

    private val mutex = Mutex()
    private val eventBuffer = mutableListOf<AnalyticsEvent>()
    private var sessionStartTime = System.currentTimeMillis()

    override fun trackScreenView(screenName: String) {
        enqueue(AnalyticsEvent.ScreenView(screenName))
    }

    override fun trackPlaybackStart(categoryId: String, pairId: String) {
        enqueue(AnalyticsEvent.PlaybackStart(categoryId, pairId))
    }

    override fun trackPlaybackEnd(categoryId: String, pairId: String, durationMs: Long) {
        enqueue(AnalyticsEvent.PlaybackEnd(categoryId, pairId, durationMs))
    }

    override fun trackCategorySelected(categoryId: String) {
        enqueue(AnalyticsEvent.CategorySelected(categoryId))
    }

    override fun trackSearchPerformed() {
        enqueue(AnalyticsEvent.SearchPerformed)
    }

    override fun trackError(category: String) {
        enqueue(AnalyticsEvent.Error(category))
    }

    override suspend fun flush() {
        val events = mutex.withLock {
            val copy = eventBuffer.toList()
            eventBuffer.clear()
            copy
        }

        if (events.isNotEmpty()) {
            // In production: upload to analytics backend
            // For now: log to Timber (visible in debug builds only)
            Timber.d("Analytics flush: ${events.size} events")
            events.forEach { event ->
                Timber.d("  $event")
            }
        }
    }

    private fun enqueue(event: AnalyticsEvent) {
        val stamped = event.copy(timestamp = System.currentTimeMillis())
        synchronized(eventBuffer) {
            eventBuffer.add(stamped)
            if (eventBuffer.size >= MAX_BUFFER_SIZE) {
                // Auto-flush when buffer is full
                // In production: trigger background upload
                Timber.d("Analytics buffer full (${eventBuffer.size} events), auto-flushing")
            }
        }
    }

    private sealed class AnalyticsEvent {
        abstract val timestamp: Long

        data class ScreenView(val screen: String, override val timestamp: Long = 0) : AnalyticsEvent()
        data class PlaybackStart(val categoryId: String, val pairId: String, override val timestamp: Long = 0) : AnalyticsEvent()
        data class PlaybackEnd(val categoryId: String, val pairId: String, val durationMs: Long, override val timestamp: Long = 0) : AnalyticsEvent()
        data class CategorySelected(val categoryId: String, override val timestamp: Long = 0) : AnalyticsEvent()
        data object SearchPerformed : AnalyticsEvent() {
            override val timestamp: Long = 0
        }
        data class Error(val category: String, override val timestamp: Long = 0) : AnalyticsEvent()

        fun copy(timestamp: Long): AnalyticsEvent = when (this) {
            is ScreenView -> copy(timestamp = timestamp)
            is PlaybackStart -> copy(timestamp = timestamp)
            is PlaybackEnd -> copy(timestamp = timestamp)
            is CategorySelected -> copy(timestamp = timestamp)
            is SearchPerformed -> this
            is Error -> copy(timestamp = timestamp)
        }
    }

    companion object {
        private const val MAX_BUFFER_SIZE = 100
    }
}
