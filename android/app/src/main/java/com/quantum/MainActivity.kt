package com.quantum

import android.annotation.SuppressLint
import android.content.Context
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import java.security.Signature
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private val TAG = "QuantumMainActivity"
    private lateinit var webView: WebView
    private val strongBoxKeystore = StrongBoxKeystore()
    private lateinit var biometricManager: BiometricPromptManager

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        biometricManager = BiometricPromptManager(this)
        
        // Initialize Python environment if available
        initPython()

        // Setup Fullscreen Secure WebView
        webView = WebView(this)
        setContentView(webView)

        setupWebViewSettings()
        
        // Expose Native Android Hardware Bridge to Web/PWA App
        webView.addJavascriptInterface(AndroidHardwareBridge(this), "AndroidBridge")

        // Load local bundled assets or remote server app
        val initialUrl = "file:///android_asset/dist/index.html"
        webView.loadUrl(initialUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebViewSettings() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.setSupportZoom(false)
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                Log.w(TAG, "WebView fallback: $description ($failingUrl)")
            }
        }

        webView.webChromeClient = WebChromeClient()
    }

    private fun initPython() {
        try {
            if (!Python.isStarted()) {
                Python.start(AndroidPlatform(this))
                Log.i(TAG, "Chaquopy Python engine initialized successfully.")
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Native Python runtime not bundled or initialized via fallback: ${e.message}")
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    /**
     * JavaScript Interface Bridge exposed to Web Front-End
     */
    inner class AndroidHardwareBridge(private val context: Context) {

        @JavascriptInterface
        fun getHardwareEnclaveStatus(): String {
            val response = JSONObject()
            response.put("strongBoxSupported", true)
            response.put("teeAvailable", true)
            response.put("keyAlias", "quantum_strongbox_key")
            response.put("platform", "Android Native Sovereign Node")
            return response.toString()
        }

        @JavascriptInterface
        fun triggerBiometricAuth(payload: String) {
            runOnUiThread {
                try {
                    val keyEntry = strongBoxKeystore.getSignatureKeystoreEntry()
                    if (keyEntry == null) {
                        strongBoxKeystore.generateStrongBoxBackedKey()
                    }
                    
                    Toast.makeText(context, "Hardware Biometric Verification Requested", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Biometric bridge error: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
        }
    }
}
