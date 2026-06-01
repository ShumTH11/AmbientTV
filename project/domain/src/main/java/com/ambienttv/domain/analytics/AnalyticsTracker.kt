package com.ambienttv.domain.analytics

/**
 * Anonymous analytics tracker interface.
 * All events are privacy-preserving: no user IDs, no device IDs, no PII.
 */
public interface AnalyticsTracker {

    /**
     * Tracks a screen view event.
     */
    public fun trackScreenView(screenName: String)

    /**
     * Tracks content playback start.
     */
    public fun trackPlaybackStart(categoryId: String, pairId: String)

    /**
     * Tracks content playback end with duration.
     */
    public fun trackPlaybackEnd(categoryId: String, pairId: String, durationMs: Long)

    /**
     * Tracks a category selection.
     */
    public fun trackCategorySelected(categoryId: String)

    /**
     * Tracks a search query (query text is NOT sent — only that search occurred).
     */
    public fun trackSearchPerformed()

    /**
     * Tracks an error (error message is NOT sent — only error category).
     */
    public fun trackError(category: String)

    /**
     * Flushes any buffered events. Called on app background or periodically.
     */
    public suspend fun flush()
}
