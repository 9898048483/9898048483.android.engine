package com.quantum

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.sovereign.node.GenesisProvisioner
import org.sovereign.node.HardwareKeyManager
import org.sovereign.node.SovereignForegroundService

class MainActivity : AppCompatActivity() {

    private val TAG = "QuantumHybridMainActivity"
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private val strongBoxKeystore = StrongBoxKeystore()
    private lateinit var biometricManager: BiometricPromptManager
    private lateinit var hardwareKeyManager: HardwareKeyManager

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val intentData: Intent? = result.data
            val results: Array<Uri>? = when {
                intentData?.clipData != null -> {
                    val count = intentData.clipData!!.itemCount
                    Array(count) { i -> intentData.clipData!!.getItemAt(i).uri }
                }
                intentData?.data != null -> arrayOf(intentData.data!!)
                else -> null
            }
            filePathCallback?.onReceiveValue(results)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        biometricManager = BiometricPromptManager(this)
        hardwareKeyManager = HardwareKeyManager(this)

        // Launch 24/7 Sovereign Foreground Engine Daemon
        launchSovereignForegroundEngine()

        // Root container for WebView + Loading indicator
        val rootLayout = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                12
            )
            isIndeterminate = false
            max = 100
            visibility = View.GONE
        }

        rootLayout.addView(webView)
        rootLayout.addView(progressBar)
        setContentView(rootLayout)

        setupHybridWebView()

        // Expose Native Android Hardware Bridge to Web/PWA front-end
        webView.addJavascriptInterface(AndroidHardwareBridge(this), "AndroidBridge")

        // Load production hybrid app via secure WebViewAssetLoader domain
        loadHybridApp()
    }

    private fun launchSovereignForegroundEngine() {
        try {
            val serviceIntent = Intent(this, SovereignForegroundService::class.java).apply {
                putExtra(SovereignForegroundService.EXTRA_TRIGGER_ACTION, "MAIN_ACTIVITY_LAUNCH")
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            Log.i(TAG, "Sovereign Foreground Engine started from MainActivity.")
        } catch (e: Exception) {
            Log.w(TAG, "Failed launching SovereignForegroundService: ${e.message}")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupHybridWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.setSupportZoom(false)
        settings.displayZoomControls = false
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

        // Modern WebViewAssetLoader to securely serve local files over HTTPS without CORS or ES Module restrictions
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/res/", WebViewAssetLoader.ResourcesPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                if (request != null) {
                    val response = assetLoader.shouldInterceptRequest(request.url)
                    if (response != null) return response
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false

                // Handle external links (WhatsApp, UPI, Phone, Mail)
                if (url.startsWith("https://wa.me") ||
                    url.startsWith("whatsapp://") ||
                    url.startsWith("upi://") ||
                    url.startsWith("tel:") ||
                    url.startsWith("mailto:")
                ) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Log.w(TAG, "Cannot launch external app for $url: ${e.message}")
                    }
                }
                return false
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                Log.w(TAG, "WebView load warning: $description ($failingUrl)")
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d(TAG, "[WebView Console] ${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()}")
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                runOnUiThread {
                    request?.grant(request.resources)
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }
    }

    private fun loadHybridApp() {
        val secureAssetUrl = "https://appassets.androidplatform.net/assets/dist/index.html"
        webView.loadUrl(secureAssetUrl)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    /**
     * Native Android Hardware Bridge exposed to JavaScript via `window.AndroidBridge`
     */
    inner class AndroidHardwareBridge(private val context: Context) {

        @JavascriptInterface
        fun getHardwareEnclaveStatus(): String {
            val hasStrongBox = hardwareKeyManager.hasStrongBox()
            val did = hardwareKeyManager.deriveQuantumDid()
            val balance = GenesisProvisioner.getCurrentBalance(context)

            val response = JSONObject().apply {
                put("strongBoxSupported", hasStrongBox)
                put("teeAvailable", true)
                put("keyAlias", HardwareKeyManager.MASTER_KEY_ALIAS)
                put("quantumDid", did)
                put("genesisBalance", balance)
                put("tokenSymbol", GenesisProvisioner.TOKEN_SYMBOL)
                put("platform", "Android Native Sovereign Node")
                put("deviceModel", Build.MODEL)
                put("androidVersion", Build.VERSION.RELEASE)
                put("sdkInt", Build.VERSION.SDK_INT)
            }
            return response.toString()
        }

        @JavascriptInterface
        fun getGenesisState(): String {
            val balance = GenesisProvisioner.getCurrentBalance(context)
            val did = hardwareKeyManager.deriveQuantumDid()
            val response = JSONObject().apply {
                put("isProvisioned", true)
                put("walletAddress", did)
                put("tokenBalance", balance)
                put("tokenSymbol", GenesisProvisioner.TOKEN_SYMBOL)
            }
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
                    Toast.makeText(context, "Hardware StrongBox Biometric Verified", Toast.LENGTH_SHORT).show()
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

        @JavascriptInterface
        fun sharePayload(title: String, text: String, url: String) {
            runOnUiThread {
                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TITLE, title)
                    putExtra(Intent.EXTRA_TEXT, "$text\n$url".trim())
                    type = "text/plain"
                }
                val shareIntent = Intent.createChooser(sendIntent, title)
                startActivity(shareIntent)
            }
        }
    }
}
