package com.quantum

import android.content.Context
import android.util.Log
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import java.security.Signature

class BiometricPromptManager(private val activity: FragmentActivity) {

    private val TAG = "BiometricPromptManager"

    fun authenticateAndSign(signature: Signature, payload: ByteArray, onSuccess: (ByteArray) -> Unit, onError: (String) -> Unit) {
        val executor = ContextCompat.getMainExecutor(activity)

        val biometricPrompt = BiometricPrompt(activity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    Log.e(TAG, "Authentication error: \$errString")
                    onError(errString.toString())
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    Log.i(TAG, "Hardware Authentication Succeeded!")
                    try {
                        val cryptoObject = result.cryptoObject
                        val sig = cryptoObject?.signature
                        if (sig != null) {
                            sig.update(payload)
                            val signedBytes = sig.sign()
                            onSuccess(signedBytes)
                        } else {
                            onError("Signature object was null after authentication.")
                        }
                    } catch (e: Exception) {
                        onError("Signing failed: \${e.message}")
                    }
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    Log.w(TAG, "Authentication failed. Biometric not recognized.")
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Quantum Secure Transaction")
            .setSubtitle("Sign using StrongBox hardware key")
            .setDescription("Please authenticate with Biometrics to authorize this shielded transfer.")
            .setNegativeButtonText("Cancel")
            .build()

        try {
            // Using the CryptoObject binds the biometric authentication to the hardware-backed key
            biometricPrompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(signature))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start biometric prompt: \${e.message}")
            onError(e.message ?: "Unknown error")
        }
    }
}
