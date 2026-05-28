package com.ambienttv.player.analyzer

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import be.tarsos.dsp.AudioDispatcher
import be.tarsos.dsp.AudioEvent
import be.tarsos.dsp.AudioProcessor
import be.tarsos.dsp.beatroot.BeatRootOnsetEventHandler
import be.tarsos.dsp.io.TarsosDSPAudioFormat
import be.tarsos.dsp.onsets.ComplexOnsetDetector
import be.tarsos.dsp.onsets.OnsetHandler
import be.tarsos.dsp.pitch.PitchDetectionHandler
import be.tarsos.dsp.pitch.PitchProcessor
import com.ambienttv.domain.model.AudioAnalysisResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.log2
import kotlin.math.roundToInt

@Singleton
class AudioAnalyzer @Inject constructor() {

    companion object {
        private const val MAX_ANALYSIS_SECONDS = 60
        private const val BUFFER_SIZE = 1024
        private const val BUFFER_OVERLAP = 512
    }

    suspend fun analyze(filePath: String): AudioAnalysisResult? = withContext(Dispatchers.Default) {
        val pcmData = decodeToPcm(filePath) ?: return@withContext null
        if (pcmData.isEmpty()) return@withContext null

        val format = TarsosDSPAudioFormat(
            TarsosDSPAudioFormat.Encoding.PCM_SIGNED,
            44100f, 16, 1, 2, 44100f, false
        )

        val inputStream = ByteArrayAudioInputStream(pcmData, format)
        val dispatcher = AudioDispatcher(inputStream, BUFFER_SIZE, BUFFER_OVERLAP)

        // --- BPM detection ---
        val beatRootHandler = BeatRootOnsetEventHandler()
        val onsetDetector = ComplexOnsetDetector(BUFFER_SIZE)
        onsetDetector.setHandler(beatRootHandler)
        dispatcher.addAudioProcessor(onsetDetector)

        // --- Pitch collection for key estimation ---
        val pitches = mutableListOf<Float>()
        val pitchProcessor = PitchProcessor(
            PitchProcessor.PitchEstimationAlgorithm.FFT_YIN,
            44100f,
            BUFFER_SIZE,
            PitchDetectionHandler { result, _ ->
                if (result.pitch > 0) pitches.add(result.pitch)
            }
        )
        dispatcher.addAudioProcessor(pitchProcessor)

        // --- Limit analysis duration ---
        dispatcher.addAudioProcessor(object : AudioProcessor {
            var samplesProcessed = 0L
            val maxSamples = 44100L * MAX_ANALYSIS_SECONDS
            override fun process(event: AudioEvent): Boolean {
                samplesProcessed += event.bufferSize
                return samplesProcessed < maxSamples
            }
            override fun processingFinished() {}
        })

        dispatcher.run()

        // Extract beats from BeatRoot
        val beats = mutableListOf<Double>()
        beatRootHandler.trackBeats(OnsetHandler { time, _ -> beats.add(time) })

        val bpm = if (beats.size >= 2) {
            val intervals = beats.zipWithNext { a, b -> b - a }
            val avgInterval = intervals.average()
            if (avgInterval > 0) (60.0 / avgInterval).toFloat() else null
        } else null

        val key = estimateKey(pitches)

        AudioAnalysisResult(bpm = bpm, musicalKey = key)
    }

    private fun decodeToPcm(filePath: String): ByteArray? {
        val extractor = MediaExtractor()
        return try {
            extractor.setDataSource(filePath)
            val trackIndex = (0 until extractor.trackCount).firstOrNull {
                extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
            } ?: return null

            extractor.selectTrack(trackIndex)
            val format = extractor.getTrackFormat(trackIndex)
            val mime = format.getString(MediaFormat.KEY_MIME)!!
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)

            val codec = MediaCodec.createDecoderByType(mime)
            codec.configure(format, null, null, 0)
            codec.start()

            val pcmStream = ByteArrayOutputStream()
            val info = MediaCodec.BufferInfo()
            var isEOS = false
            var decodedSamples = 0L
            val maxSamples = sampleRate * MAX_ANALYSIS_SECONDS

            while (!isEOS && decodedSamples < maxSamples) {
                val inIndex = codec.dequeueInputBuffer(10000)
                if (inIndex >= 0) {
                    val buffer = codec.getInputBuffer(inIndex)!!
                    val sampleSize = extractor.readSampleData(buffer, 0)
                    if (sampleSize < 0) {
                        codec.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        isEOS = true
                    } else {
                        codec.queueInputBuffer(inIndex, 0, sampleSize, extractor.sampleTime, 0)
                        extractor.advance()
                    }
                }

                val outIndex = codec.dequeueOutputBuffer(info, 10000)
                if (outIndex >= 0) {
                    val outBuffer = codec.getOutputBuffer(outIndex)!!
                    val chunk = ByteArray(info.size)
                    outBuffer.get(chunk)
                    pcmStream.write(chunk)
                    decodedSamples += info.size / 2 // 16-bit = 2 bytes per sample
                    codec.releaseOutputBuffer(outIndex, false)
                } else if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    // Format changed, continue
                }
            }

            codec.stop()
            codec.release()
            extractor.release()

            val rawPcm = pcmStream.toByteArray()
            // Convert stereo to mono if needed by averaging pairs
            convertToMonoIfStereo(rawPcm, format.getInteger(MediaFormat.KEY_CHANNEL_COUNT))
        } catch (e: Exception) {
            null
        } finally {
            extractor.release()
        }
    }

    private fun convertToMonoIfStereo(rawPcm: ByteArray, channels: Int): ByteArray {
        if (channels != 2) return rawPcm
        val monoSize = rawPcm.size / 2
        val mono = ByteArray(monoSize)
        var j = 0
        for (i in rawPcm.indices step 4) {
            // Average two 16-bit samples (little-endian interleaved)
            val left = (rawPcm[i].toInt() and 0xFF) or (rawPcm[i + 1].toInt() shl 8)
            val right = (rawPcm[i + 2].toInt() and 0xFF) or (rawPcm[i + 3].toInt() shl 8)
            val avg = ((left + right) / 2).toShort()
            mono[j] = (avg.toInt() and 0xFF).toByte()
            mono[j + 1] = ((avg.toInt() shr 8) and 0xFF).toByte()
            j += 2
        }
        return mono
    }

    private fun estimateKey(pitches: List<Float>): String? {
        if (pitches.isEmpty()) return null
        val notes = listOf("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
        val noteCounts = mutableMapOf<String, Int>()
        pitches.forEach { freq ->
            val note = frequencyToNote(freq, notes)
            noteCounts[note] = (noteCounts[note] ?: 0) + 1
        }
        return noteCounts.maxByOrNull { it.value }?.key
    }

    private fun frequencyToNote(freq: Float, notes: List<String>): String {
        // A4 = 440Hz -> MIDI note 69
        val midi = 69 + 12 * log2(freq / 440.0)
        val index = midi.roundToInt().mod(12)
        return notes[index]
    }
}
