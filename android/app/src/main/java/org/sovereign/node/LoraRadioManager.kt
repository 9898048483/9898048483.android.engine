package org.sovereign.node

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * LoRa Radio USB-OTG & UART Interface
 * Drives external SX1262 / SX1276 LoRa transceivers via Android USB Host / OTG serial.
 * Supports adaptive spreading factors (SF7-SF12), frequency band selection, CRC16 framing,
 * and asynchronous transaction queues.
 */
class LoraRadioManager(private val context: Context) {

    companion object {
        private const val TAG = "LoraRadioManager"
        private const val ACTION_USB_PERMISSION = "org.sovereign.node.USB_PERMISSION"
        const val PREAMBLE_MAGIC = 0x9898.toShort()

        // Standard Frequency Bands
        const val FREQ_868_MHZ = 868100000L // EU868
        const val FREQ_915_MHZ = 915000000L // US915
        const val FREQ_433_MHZ = 433175000L // AS433 / Generic
    }

    enum class SpreadingFactor(val value: Int) {
        SF7(7), SF8(8), SF9(9), SF10(10), SF11(11), SF12(12)
    }

    private val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private val scopeJob = Job()
    private val scope = CoroutineScope(Dispatchers.IO + scopeJob)

    private var usbConnection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var inEndpoint: UsbEndpoint? = null
    private var outEndpoint: UsbEndpoint? = null

    private var currentFrequency = FREQ_868_MHZ
    private var currentSF = SpreadingFactor.SF7
    private var isRadioActive = false

    private val txQueue = ConcurrentLinkedQueue<ByteArray>()
    var onPacketReceived: ((ByteArray, Int) -> Unit)? = null // payload, RSSI estimate

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
            val action = intent?.action
            if (ACTION_USB_PERMISSION == action) {
                synchronized(this) {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }

                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        device?.let { connectToDevice(it) }
                    } else {
                        Log.w(TAG, "USB Permission denied for LoRa device.")
                    }
                }
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED == action) {
                disconnectDevice()
            }
        }
    }

    fun initLoRaRadio(frequencyHz: Long = FREQ_868_MHZ, sf: SpreadingFactor = SpreadingFactor.SF7) {
        this.currentFrequency = frequencyHz
        this.currentSF = sf

        val filter = IntentFilter(ACTION_USB_PERMISSION).apply {
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        context.registerReceiver(usbReceiver, filter)

        discoverAndConnectLoRaDevice()
    }

    private fun discoverAndConnectLoRaDevice() {
        val deviceList = usbManager.deviceList
        for ((_, device) in deviceList) {
            // Common CP210x, CH340, FTDI, or native SX1262 USB Dongle vendor IDs
            val isKnownSerialDevice = device.vendorId in listOf(0x10C4, 0x1A86, 0x0403, 0x2341, 0x0483)
            if (isKnownSerialDevice || device.deviceClass == UsbConstants.USB_CLASS_COMM) {
                Log.i(TAG, "Found LoRa USB device: ${device.deviceName} (VID: ${device.vendorId}, PID: ${device.productId})")
                if (usbManager.hasPermission(device)) {
                    connectToDevice(device)
                } else {
                    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                    val permissionIntent = PendingIntent.getBroadcast(
                        context, 0, Intent(ACTION_USB_PERMISSION), flags
                    )
                    usbManager.requestPermission(device, permissionIntent)
                }
                return
            }
        }
        Log.i(TAG, "No direct LoRa USB-OTG radio detected; simulated off-grid queue ready.")
    }

    private fun connectToDevice(device: UsbDevice) {
        val connection = usbManager.openDevice(device) ?: return
        val intf = device.getInterface(0)
        if (!connection.claimInterface(intf, true)) {
            connection.close()
            return
        }

        usbConnection = connection
        usbInterface = intf

        for (i in 0 until intf.endpointCount) {
            val ep = intf.getEndpoint(i)
            if (ep.direction == UsbConstants.USB_DIR_IN) {
                inEndpoint = ep
            } else if (ep.direction == UsbConstants.USB_DIR_OUT) {
                outEndpoint = ep
            }
        }

        isRadioActive = true
        configureRadioParameters(currentFrequency, currentSF)
        startIoPipelines()
        Log.i(TAG, "LoRa Radio Connected and Configured successfully.")
    }

    private fun configureRadioParameters(freq: Long, sf: SpreadingFactor) {
        // Send AT / SX1262 SPI command frame to set frequency and spreading factor
        val configFrame = ByteBuffer.allocate(12).order(ByteOrder.LITTLE_ENDIAN).apply {
            put(0xAA.toByte())
            put(0x55.toByte())
            putLong(freq)
            put(sf.value.toByte())
            put(0x00.toByte()) // CRC mode on
        }.array()

        sendRaw(configFrame)
    }

    private fun startIoPipelines() {
        // Outbound transmission loop
        scope.launch {
            while (isActive && isRadioActive) {
                val packet = txQueue.poll()
                if (packet != null) {
                    val framed = framePacket(packet)
                    sendRaw(framed)
                    delay(calculateAirTimeMs(framed.size, currentSF))
                } else {
                    delay(50L)
                }
            }
        }

        // Inbound reception loop
        scope.launch {
            val buffer = ByteArray(512)
            while (isActive && isRadioActive) {
                val conn = usbConnection
                val inEp = inEndpoint
                if (conn != null && inEp != null) {
                    val bytesRead = conn.bulkTransfer(inEp, buffer, buffer.size, 100)
                    if (bytesRead > 4) {
                        handleRawInboundData(buffer.copyOf(bytesRead))
                    }
                } else {
                    delay(200L)
                }
            }
        }
    }

    /**
     * Frames payload with Sovereign 0x9898 Preamble, length byte, and CRC16
     */
    private fun framePacket(payload: ByteArray): ByteArray {
        val crc = computeCrc16(payload)
        val frame = ByteBuffer.allocate(2 + 1 + payload.size + 2).order(ByteOrder.BIG_ENDIAN)
        frame.putShort(PREAMBLE_MAGIC)
        frame.put(payload.size.toByte())
        frame.put(payload)
        frame.putShort(crc.toShort())
        return frame.array()
    }

    private fun handleRawInboundData(data: ByteArray) {
        if (data.size < 5) return
        val buffer = ByteBuffer.wrap(data).order(ByteOrder.BIG_ENDIAN)
        val magic = buffer.short
        if (magic != PREAMBLE_MAGIC) return

        val length = buffer.get().toInt() and 0xFF
        if (buffer.remaining() < length + 2) return

        val payload = ByteArray(length)
        buffer.get(payload)
        val receivedCrc = buffer.short.toInt() and 0xFFFF
        val calculatedCrc = computeCrc16(payload)

        if (receivedCrc == calculatedCrc) {
            Log.d(TAG, "Valid LoRa packet received ($length bytes)")
            onPacketReceived?.invoke(payload, -85) // Estimated RSSI
        } else {
            Log.w(TAG, "LoRa CRC mismatch: rec=$receivedCrc, calc=$calculatedCrc")
        }
    }

    /**
     * Enqueues an off-grid transaction for broadcast over LoRa radio
     */
    fun enqueueTransaction(txBytes: ByteArray) {
        txQueue.offer(txBytes)
        Log.d(TAG, "Enqueued transaction for LoRa broadcast. Queue size: ${txQueue.size}")
    }

    private fun sendRaw(data: ByteArray) {
        val conn = usbConnection
        val outEp = outEndpoint
        if (conn != null && outEp != null) {
            conn.bulkTransfer(outEp, data, data.size, 500)
        }
    }

    private fun computeCrc16(data: ByteArray): Int {
        var crc = 0xFFFF
        for (b in data) {
            crc = (crc ushr 8) xor CRC16_TABLE[(crc xor (b.toInt() and 0xFF)) and 0xFF]
        }
        return crc and 0xFFFF
    }

    private fun calculateAirTimeMs(payloadBytes: Int, sf: SpreadingFactor): Long {
        // Approximate LoRa Time on Air calculation
        val symbolRate = (1 shl sf.value).toDouble() / 125000.0
        val nSymbols = 8 + Math.max(0.0, Math.ceil((8.0 * payloadBytes - 4.0 * sf.value + 28.0) / (4.0 * sf.value))) * 4
        return (nSymbols * symbolRate * 1000).toLong().coerceAtLeast(100L)
    }

    fun disconnectDevice() {
        isRadioActive = false
        usbConnection?.let {
            usbInterface?.let { intf -> it.releaseInterface(intf) }
            it.close()
        }
        usbConnection = null
        usbInterface = null
        try {
            context.unregisterReceiver(usbReceiver)
        } catch (_: Exception) {}
        scopeJob.cancel()
        Log.i(TAG, "LoRa Radio Disconnected.")
    }

    companion object Table {
        private val CRC16_TABLE = IntArray(256) { i ->
            var curr = i
            for (j in 0 until 8) {
                curr = if ((curr and 1) != 0) (curr ushr 1) xor 0xA001 else curr ushr 1
            }
            curr
        }
    }
}
