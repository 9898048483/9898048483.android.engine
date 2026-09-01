package org.sovereign.node

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Ultrasonic Acoustic Air-Gap Data Bridge
 * Operates in the 18 kHz - 20 kHz near-ultrasound spectrum using Frequency Shift Keying (FSK).
 * Encodes, modulates, and transmits signed transaction payloads between air-gapped devices
 * via speaker and microphone.
 */
class AcousticBridgeManager(private val context: Context) {

    companion object {
        private const val TAG = "AcousticBridgeManager"
        private const val SAMPLE_RATE = 44100
        private const val FREQ_SPACE = 18500.0 // 0 bit: 18.5 kHz
        private const val FREQ_MARK = 19500.0  // 1 bit: 19.5 kHz
        private const val SAMPLES_PER_BIT = 220 // ~5ms per bit => ~200 baud ultrasonic data rate
        private const val PREAMBLE_SYNC_BYTE = 0x98.toByte()
    }

    private val scopeJob = Job()
    private val scope = CoroutineScope(Dispatchers.Default + scopeJob)

    private var audioRecord: AudioRecord? = null
    private var audioTrack: AudioTrack? = null
    private var isListening = false

    var onPayloadDecoded: ((ByteArray) -> Unit)? = null

    /**
     * Transmits a byte payload using ultrasonic FSK through the device speaker
     */
    fun transmitAcousticPayload(payload: ByteArray, onComplete: (() -> Unit)? = null) {
        scope.launch {
            try {
                val framedPayload = frameAcousticPacket(payload)
                val audioSamples = modulateFsk(framedPayload)

                playAudioSamples(audioSamples)
                Log.i(TAG, "Acoustic ultrasonic transmission completed (${framedPayload.size} bytes).")
                onComplete?.invoke()
            } catch (e: Exception) {
                Log.e(TAG, "Acoustic transmit error: ${e.message}", e)
            }
        }
    }

    private fun frameAcousticPacket(payload: ByteArray): ByteArray {
        val crc = computeChecksum(payload)
        val buffer = ByteBuffer.allocate(1 + 1 + payload.size + 1)
        buffer.put(PREAMBLE_SYNC_BYTE)
        buffer.put(payload.size.toByte())
        buffer.put(payload)
        buffer.put(crc)
        return buffer.array()
    }

    /**
     * Continuous ultrasonic receiver via microphone
     */
    @SuppressLint("MissingPermission")
    fun startUltrasonicReceiver() {
        if (isListening) return
        isListening = true

        scope.launch(Dispatchers.IO) {
            val minBufferSize = AudioRecord.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ).coerceAtLeast(4096)

            try {
                audioRecord = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    minBufferSize
                )

                audioRecord?.startRecording()
                Log.i(TAG, "Ultrasonic Acoustic Receiver active on 18-20 kHz band.")

                val buffer = ShortArray(SAMPLES_PER_BIT)
                val bitBuffer = mutableListOf<Int>()

                while (isActive && isListening) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        val bit = demodulateFskBit(buffer, read)
                        if (bit >= 0) {
                            bitBuffer.add(bit)
                            if (bitBuffer.size >= 8) {
                                val byte = bitsToByte(bitBuffer.take(8))
                                if (byte == PREAMBLE_SYNC_BYTE) {
                                    // Preamble locked! Consume remaining packet
                                    val decodedPayload = parseInboundStream(audioRecord!!)
                                    if (decodedPayload != null) {
                                        onPayloadDecoded?.invoke(decodedPayload)
                                    }
                                    bitBuffer.clear()
                                } else {
                                    bitBuffer.removeAt(0)
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Acoustic receiver exception: ${e.message}", e)
            } finally {
                stopUltrasonicReceiver()
            }
        }
    }

    private fun demodulateFskBit(samples: ShortArray, length: Int): Int {
        // Goertzel Algorithm / Energy detection at 18.5 kHz and 19.5 kHz
        var energySpace = 0.0
        var energyMark = 0.0

        val omegaSpace = 2.0 * PI * FREQ_SPACE / SAMPLE_RATE
        val omegaMark = 2.0 * PI * FREQ_MARK / SAMPLE_RATE

        for (i in 0 until length) {
            val s = samples[i].toDouble()
            energySpace += s * sin(omegaSpace * i)
            energyMark += s * sin(omegaMark * i)
        }

        val magSpace = Math.abs(energySpace)
        val magMark = Math.abs(energyMark)

        val threshold = 15000.0
        return when {
            magMark > magSpace && magMark > threshold -> 1
            magSpace > magMark && magSpace > threshold -> 0
            else -> -1 // Noise
        }
    }

    private fun parseInboundStream(record: AudioRecord): ByteArray? {
        val buffer = ShortArray(SAMPLES_PER_BIT)

        // Read 1-byte length
        val lenBits = readBits(record, buffer, 8) ?: return null
        val payloadLength = bitsToByte(lenBits).toInt() and 0xFF
        if (payloadLength > 256 || payloadLength == 0) return null

        // Read payload bytes
        val payload = ByteArray(payloadLength)
        for (i in 0 until payloadLength) {
            val byteBits = readBits(record, buffer, 8) ?: return null
            payload[i] = bitsToByte(byteBits)
        }

        // Read CRC byte
        val crcBits = readBits(record, buffer, 8) ?: return null
        val expectedCrc = bitsToByte(crcBits)
        val calculatedCrc = computeChecksum(payload)

        return if (expectedCrc == calculatedCrc) payload else null
    }

    private fun readBits(record: AudioRecord, buffer: ShortArray, count: Int): List<Int>? {
        val bits = mutableListOf<Int>()
        for (i in 0 until count) {
            val read = record.read(buffer, 0, buffer.size)
            if (read <= 0) return null
            val bit = demodulateFskBit(buffer, read)
            bits.add(if (bit >= 0) bit else 0)
        }
        return bits
    }

    private fun bitsToByte(bits: List<Int>): Byte {
        var b = 0
        for (i in 0 until 8) {
            if (i < bits.size && bits[i] == 1) {
                b = b or (1 shl (7 - i))
            }
        }
        return b.toByte()
    }

    private fun modulateFsk(data: ByteArray): ShortArray {
        val totalBits = data.size * 8
        val samples = ShortArray(totalBits * SAMPLES_PER_BIT)
        var sampleIndex = 0

        for (byte in data) {
            val b = byte.toInt() and 0xFF
            for (bitPos in 7 downTo 0) {
                val bit = (b ushr bitPos) and 1
                val freq = if (bit == 1) FREQ_MARK else FREQ_SPACE
                val omega = 2.0 * PI * freq / SAMPLE_RATE

                for (i in 0 until SAMPLES_PER_BIT) {
                    val angle = omega * i
                    val amplitude = 28000.0 * sin(angle)
                    samples[sampleIndex++] = amplitude.toInt().toShort()
                }
            }
        }
        return samples
    }

    private fun playAudioSamples(samples: ShortArray) {
        val bufferSize = samples.size * 2
        val track = AudioTrack(
            AudioManager.STREAM_MUSIC,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize,
            AudioTrack.MODE_STATIC
        )
        track.write(samples, 0, samples.size)
        track.play()
        Thread.sleep((samples.size.toDouble() / SAMPLE_RATE * 1000).toLong() + 100)
        track.stop()
        track.release()
    }

    private fun computeChecksum(payload: ByteArray): Byte {
        var sum = 0
        for (b in payload) {
            sum = (sum + (b.toInt() and 0xFF)) and 0xFF
        }
        return sum.toByte()
    }

    fun stopUltrasonicReceiver() {
        isListening = false
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (_: Exception) {}
        audioRecord = null
    }
}
