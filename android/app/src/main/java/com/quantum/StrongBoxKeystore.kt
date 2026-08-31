package com.quantum

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.spec.ECGenParameterSpec

class StrongBoxKeystore {

    companion object {
        private const val KEY_ALIAS = "quantum_strongbox_key"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TAG = "StrongBoxKeystore"
    }

    fun generateStrongBoxBackedKey(): KeyPair? {
        try {
            val keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                ANDROID_KEYSTORE
            )

            val parameterSpec = KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
                .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(true)
                // Require StrongBox hardware security module (Titan M2 on Pixels)
                .setIsStrongBoxBacked(true)
                .build()

            keyPairGenerator.initialize(parameterSpec)
            val keyPair = keyPairGenerator.generateKeyPair()
            
            Log.i(TAG, "StrongBox hardware-backed ECDSA key pair generated successfully.")
            return keyPair
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate StrongBox key. Device may not have StrongBox HSM: ${e.message}")
            return null
        }
    }

    fun getSignatureKeystoreEntry(): KeyStore.Entry? {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)
        return keyStore.getEntry(KEY_ALIAS, null)
    }
}
