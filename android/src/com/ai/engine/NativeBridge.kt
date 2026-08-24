package com.ai.engine

import java.nio.ByteBuffer
import org.json.JSONObject

/**
 * Thread-safe Kotlin/Java JNI runtime wrapper for libai_native_engine.so
 */
object NativeBridge {

    init {
        try {
            System.loadLibrary("ai_native_engine")
        } catch (e: UnsatisfiedLinkError) {
            System.err.println("Native library ai_native_engine could not be loaded: ${e.message}")
        }
    }

    data class LocaleInfo(
        val bcp47Tag: String,
        val languageIso639_1: String,
        val languageIso639_2: String,
        val scriptIso15924: String,
        val countryIso3166_1: String,
        val displayName: String,
        val isRTL: Boolean,
        val currencyCode: String
    )

    // JNI Native Declarations
    external fun nativeInitialize(sharedMemorySizeMb: Int, appDataDir: String): Boolean
    external fun nativeShutdown()
    external fun nativeExecutePython(scriptName: String, functionName: String, payload: ByteArray): String
    external fun nativeWriteIpcPacket(packetType: Int, data: ByteArray): Boolean
    external fun nativeGetLocaleInfo(): String
    external fun nativeGetDirectSharedBuffer(): ByteBuffer?

    fun initialize(shmSizeMb: Int = 16, dataDir: String = ""): Boolean {
        return nativeInitialize(shmSizeMb, dataDir)
    }

    fun getDetectedLocale(): LocaleInfo {
        val jsonStr = nativeGetLocaleInfo()
        val json = JSONObject(jsonStr)
        return LocaleInfo(
            bcp47Tag = json.optString("bcp47Tag", "en-US"),
            languageIso639_1 = json.optString("languageIso639_1", "en"),
            languageIso639_2 = json.optString("languageIso639_2", "eng"),
            scriptIso15924 = json.optString("scriptIso15924", "Latn"),
            countryIso3166_1 = json.optString("countryIso3166_1", "US"),
            displayName = json.optString("displayName", "English (United States)"),
            isRTL = json.optBoolean("isRTL", false),
            currencyCode = json.optString("currencyCode", "USD")
        )
    }

    fun executePython(script: String, function: String, data: ByteArray = ByteArray(0)): String {
        return nativeExecutePython(script, function, data)
    }

    fun sendIpcMessage(type: Int, payload: ByteArray): Boolean {
        return nativeWriteIpcPacket(type, payload)
    }
}
