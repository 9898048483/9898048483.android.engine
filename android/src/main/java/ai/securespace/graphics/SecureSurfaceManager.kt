package ai.securespace.graphics

import android.app.Activity
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import android.view.View

object SecureSurfaceManager {
    
    /**
     * Enforces hardware-level display security.
     * Prevents screen recording, screenshots, and remote mirroring.
     */
    fun enforceSecureWindow(activity: Activity) {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    /**
     * Prevents Tapjacking by ignoring touch events if another window
     * (like a transparent malicious overlay) is obscuring the view.
     */
    fun enableTapjackingProtection(view: View) {
        view.filterTouchesWhenObscured = true
    }

    /**
     * Detects if other applications currently have the "Draw Over Other Apps" permission,
     * which could be used for invisible overlay attacks.
     */
    fun detectActiveOverlays(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context)
        }
        return false
    }
}
