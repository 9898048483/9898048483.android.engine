package org.sovereign.node

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Autonomous Boot & Package Update Receiver
 * Listens for system boot completion and package replacement to launch the 24/7 Sovereign Engine.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SovereignBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.i(TAG, "Received system broadcast event: $action")

        if (Intent.ACTION_BOOT_COMPLETED == action ||
            Intent.ACTION_MY_PACKAGE_REPLACED == action ||
            "android.intent.action.QUICKBOOT_POWERON" == action ||
            "com.htc.intent.action.QUICKBOOT_POWERON" == action
        ) {
            startSovereignService(context, action ?: "UNKNOWN_ACTION")
        }
    }

    private fun startSovereignService(context: Context, triggerAction: String) {
        try {
            val serviceIntent = Intent(context, SovereignForegroundService::class.java).apply {
                putExtra(SovereignForegroundService.EXTRA_TRIGGER_ACTION, triggerAction)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "Starting Sovereign Foreground Service (Android O+)...")
                context.startForegroundService(serviceIntent)
            } else {
                Log.d(TAG, "Starting Sovereign Service (Legacy Android)...")
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch SovereignForegroundService: ${e.message}", e)
        }
    }
}
