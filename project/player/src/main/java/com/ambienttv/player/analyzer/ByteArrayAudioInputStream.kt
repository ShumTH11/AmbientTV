package com.ambienttv.player.analyzer

import be.tarsos.dsp.io.TarsosDSPAudioFormat
import be.tarsos.dsp.io.TarsosDSPAudioInputStream
import java.io.IOException

/**
 * Wraps a raw PCM byte array as a TarsosDSP [TarsosDSPAudioInputStream].
 */
class ByteArrayAudioInputStream(
    private val data: ByteArray,
    private val audioFormat: TarsosDSPAudioFormat
) : TarsosDSPAudioInputStream {

    private var position = 0

    override fun getFormat(): TarsosDSPAudioFormat = audioFormat

    override fun getFrameLength(): Long = -1L

    @Throws(IOException::class)
    override fun read(b: ByteArray, off: Int, len: Int): Int {
        val remaining = data.size - position
        if (remaining <= 0) return -1
        val toRead = minOf(len, remaining)
        System.arraycopy(data, position, b, off, toRead)
        position += toRead
        return toRead
    }

    @Throws(IOException::class)
    override fun skip(bytesToSkip: Long): Long {
        val toSkip = minOf(bytesToSkip.toInt(), data.size - position).toLong()
        position += toSkip.toInt()
        return toSkip
    }

    @Throws(IOException::class)
    override fun close() {
        // No-op
    }
}
