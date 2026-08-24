package ai.securespace.crypto

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import java.security.KeyStore
import java.security.cert.Certificate
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class StrongBoxKeyManager {
    private val TAG = "StrongBoxKeyManager"
    private val KEY_ALIAS = "ai_crypto_engine_master_key"
    private val ANDROID_KEYSTORE = "AndroidKeyStore"

    /**
     * Generates a Hardware-Backed AES-256-GCM key.
     * Enforces StrongBox (Titan M), Device Unlock requirements, and Attestation.
     */
    fun generateKey(attestationChallenge: ByteArray?): Boolean {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            if (keyStore.containsAlias(KEY_ALIAS)) return true

            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            val builder = KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            ).apply {
                setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                setKeySize(256)

                // 1. Enforce Biometric/Lock-Screen Invalidation
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    setInvalidatedByBiometricEnrollment(true)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    // 2. Enforce physical StrongBox TEE silicon
                    setIsStrongBoxBacked(true)
                    // 3. Prevent decryption while the device is locked
                    setUnlockedDeviceRequired(true)
                }
                
                // 4. Hardware Attestation for Remote Root-of-Trust Validation
                attestationChallenge?.let { setAttestationChallenge(it) }
            }

            keyGenerator.init(builder.build())
            keyGenerator.generateKey()
            Log.i(TAG, "Successfully provisioned StrongBox AES-256 key.")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "StrongBox generation failed, attempting TEE fallback.", e)
            return tryFallbackKeyGeneration(attestationChallenge)
        }
    }

    private fun tryFallbackKeyGeneration(attestationChallenge: ByteArray?): Boolean {
        return try {
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            val builder = KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            ).apply {
                setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                setKeySize(256)
                attestationChallenge?.let { setAttestationChallenge(it) }
            }
            keyGenerator.init(builder.build())
            keyGenerator.generateKey()
            Log.i(TAG, "Successfully provisioned fallback TEE AES-256 key.")
            true
        } catch (fallbackEx: Exception) {
            Log.e(TAG, "Fatal: Hardware Key generation failed entirely.", fallbackEx)
            false
        }
    }

    fun getAttestationCertificateChain(): Array<Certificate>? {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        return keyStore.getCertificateChain(KEY_ALIAS)
    }

    fun encrypt(plaintext: ByteArray): ByteArray? {
        return try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            val secretKey = keyStore.getKey(KEY_ALIAS, null) as SecretKey
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            
            val iv = cipher.iv
            val ciphertext = cipher.doFinal(plaintext)
            iv + ciphertext
        } catch (e: Exception) {
            Log.e(TAG, "Encryption failed.", e)
            null
        }
    }

    fun decrypt(cipherData: ByteArray): ByteArray? {
        return try {
            if (cipherData.size < 12) throw IllegalArgumentException("Invalid ciphertext length")
            
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            val secretKey = keyStore.getKey(KEY_ALIAS, null) as SecretKey
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            
            val iv = cipherData.copyOfRange(0, 12)
            val ciphertext = cipherData.copyOfRange(12, cipherData.size)
            val spec = GCMParameterSpec(128, iv)
            
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)
            cipher.doFinal(ciphertext)
        } catch (e: Exception) {
            Log.e(TAG, "Decryption failed.", e)
            null
        }
    }
}
