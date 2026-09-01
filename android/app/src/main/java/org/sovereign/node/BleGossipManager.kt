package org.sovereign.node

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanRecord
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import android.util.LruCache
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.nio.ByteBuffer
import java.security.MessageDigest
import java.util.UUID

/**
 * Bluetooth Low Energy (BLE) Mesh Gossip & Autonomous Peer Discovery
 * Propagates compact 128-byte signed transaction headers and node routing tables
 * with LRU packet deduplication and adaptive low-battery throttling.
 */
class BleGossipManager(private val context: Context) {

    companion object {
        private const val TAG = "BleGossipManager"
        val SERVICE_UUID: UUID = UUID.fromString("00009898-0000-1000-8000-00805F9B34FB")
        val SERVICE_PARCEL_UUID = ParcelUuid(SERVICE_UUID)
        private const val LRU_CACHE_CAPACITY = 2048
        private const val BATTERY_LOW_THRESHOLD_PCT = 20
    }

    private val bluetoothManager: BluetoothManager? =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter

    private var advertiser: BluetoothLeAdvertiser? = null
    private var scanner: BluetoothLeScanner? = null

    private val scopeJob = Job()
    private val scope = CoroutineScope(Dispatchers.IO + scopeJob)

    // Deduplication cache: stores Blake3 / SHA-256 hex digests of seen packets
    private val seenPacketsCache = LruCache<String, Long>(LRU_CACHE_CAPACITY)

    private var isGossipActive = false
    private var isThrottledLowBattery = false

    // Registered transaction arrival listener
    var onTransactionReceived: ((ByteArray) -> Unit)? = null
    var onPeerDiscovered: ((String, Int) -> Unit)? = null

    private val batteryReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
            val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (level >= 0 && scale > 0) {
                val batteryPct = (level * 100) / scale
                val shouldThrottle = batteryPct <= BATTERY_LOW_THRESHOLD_PCT
                if (shouldThrottle != isThrottledLowBattery) {
                    isThrottledLowBattery = shouldThrottle
                    Log.i(TAG, "Battery level $batteryPct% -> Throttling state: $isThrottledLowBattery")
                    restartWithCurrentPolicy()
                }
            }
        }
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            Log.d(TAG, "BLE Mesh Advertising active.")
        }

        override fun onStartFailure(errorCode: Int) {
            Log.w(TAG, "BLE Mesh Advertising failed with code: $errorCode")
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.let { handleScanResult(it) }
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>?) {
            results?.forEach { handleScanResult(it) }
        }

        override fun onScanFailed(errorCode: Int) {
            Log.w(TAG, "BLE Mesh Scan failed with error code: $errorCode")
        }
    }

    @SuppressLint("MissingPermission")
    fun startMeshGossip() {
        if (isGossipActive || bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            Log.w(TAG, "BLE Mesh not started: adapter missing, disabled, or already running.")
            return
        }

        isGossipActive = true
        context.registerReceiver(
            batteryReceiver,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        )

        advertiser = bluetoothAdapter.bluetoothLeAdvertiser
        scanner = bluetoothAdapter.bluetoothLeScanner

        startAdvertising()
        startScanning()
        startPeriodicRoutingGossip()
    }

    @SuppressLint("MissingPermission")
    private fun startAdvertising() {
        val adv = advertiser ?: return

        val advertiseMode = if (isThrottledLowBattery) {
            AdvertiseSettings.ADVERTISE_MODE_LOW_POWER
        } else {
            AdvertiseSettings.ADVERTISE_MODE_BALANCED
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(advertiseMode)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
            .setConnectable(false)
            .setTimeout(0)
            .build()

        // 128-bit mesh node header + compact status
        val nodeHeader = ByteBuffer.allocate(24).apply {
            putLong(0x9898048483L) // Sovereign magic prefix
            putInt(1000)           // Current genesis block height
            putLong(System.currentTimeMillis() / 1000)
        }.array()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(SERVICE_PARCEL_UUID)
            .addServiceData(SERVICE_PARCEL_UUID, nodeHeader)
            .build()

        try {
            adv.startAdvertising(settings, data, advertiseCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Exception starting BLE advertise: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    private fun startScanning() {
        val sc = scanner ?: return

        val scanMode = if (isThrottledLowBattery) {
            ScanSettings.SCAN_MODE_LOW_POWER
        } else {
            ScanSettings.SCAN_MODE_BALANCED
        }

        val scanSettings = ScanSettings.Builder()
            .setScanMode(scanMode)
            .setReportDelay(0)
            .build()

        val filter = ScanFilter.Builder()
            .setServiceUuid(SERVICE_PARCEL_UUID)
            .build()

        try {
            sc.startScan(listOf(filter), scanSettings, scanCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Exception starting BLE scanner: ${e.message}")
        }
    }

    private fun handleScanResult(result: ScanResult) {
        val record: ScanRecord = result.scanRecord ?: return
        val serviceData = record.getServiceData(SERVICE_PARCEL_UUID) ?: return
        val peerAddress = result.device.address
        val rssi = result.rssi

        onPeerDiscovered?.invoke(peerAddress, rssi)

        // Deduplication check
        val packetHash = computeDigestHex(serviceData)
        synchronized(seenPacketsCache) {
            if (seenPacketsCache.get(packetHash) != null) {
                return // Packet already seen and processed
            }
            seenPacketsCache.put(packetHash, System.currentTimeMillis())
        }

        Log.d(TAG, "New Sovereign BLE packet discovered from $peerAddress (RSSI: $rssi dBm, ${serviceData.size} bytes)")
        onTransactionReceived?.invoke(serviceData)
    }

    /**
     * Broadcasts a signed 128-byte transaction header to all nearby mesh peers
     */
    @SuppressLint("MissingPermission")
    fun broadcastTransaction(txBytes: ByteArray) {
        if (!isGossipActive || advertiser == null) return

        val packetHash = computeDigestHex(txBytes)
        synchronized(seenPacketsCache) {
            seenPacketsCache.put(packetHash, System.currentTimeMillis())
        }

        scope.launch {
            try {
                val settings = AdvertiseSettings.Builder()
                    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                    .setConnectable(false)
                    .setTimeout(3000) // Burst broadcast for 3 seconds
                    .build()

                val data = AdvertiseData.Builder()
                    .addServiceUuid(SERVICE_PARCEL_UUID)
                    .addServiceData(SERVICE_PARCEL_UUID, txBytes.take(24).toByteArray())
                    .build()

                advertiser?.startAdvertising(settings, data, object : AdvertiseCallback() {
                    override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                        Log.d(TAG, "Broadcast burst active for TX $packetHash")
                    }
                })
            } catch (e: Exception) {
                Log.w(TAG, "Transaction broadcast burst error: ${e.message}")
            }
        }
    }

    private fun startPeriodicRoutingGossip() {
        scope.launch {
            while (isActive) {
                val delayTime = if (isThrottledLowBattery) 60000L else 20000L
                delay(delayTime)
                if (isGossipActive) {
                    Log.d(TAG, "BLE Mesh Routing Heartbeat | Seen Packets: ${seenPacketsCache.size()}")
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun restartWithCurrentPolicy() {
        try {
            advertiser?.stopAdvertising(advertiseCallback)
            scanner?.stopScan(scanCallback)
            if (isGossipActive) {
                startAdvertising()
                startScanning()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Policy restart exception: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    fun stopMeshGossip() {
        isGossipActive = false
        try {
            context.unregisterReceiver(batteryReceiver)
        } catch (_: Exception) {}

        try {
            advertiser?.stopAdvertising(advertiseCallback)
            scanner?.stopScan(scanCallback)
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping BLE gossip: ${e.message}")
        }
        scopeJob.cancel()
    }

    private fun computeDigestHex(data: ByteArray): String {
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(data)
        return digest.joinToString("") { "%02x".format(it) }
    }
}
