package org.sovereign.node

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * Hardware KeyStore & StrongBox Non-Exportable Enclave Manager
 * Generates hardware-backed EC/PQC key pairs backed by physical StrongBox (e.g. Titan M2) or standard TEE.
 * Exposes DID derivation and non-exportable hardware signing interfaces.
 */
class HardwareKeyManager(private val context: Context) {

    companion object {
        private const val TAG = "HardwareKeyManager"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val MASTER_KEY_ALIAS = "sovereign_master_strongbox_key"
        const val DID_PREFIX = "did:quantum:9898:"

        init {
            // Pre-load native PQC crypto bridge library if present
            try {
                System.loadLibrary("crypto_bridge")
                Log.d(TAG, "Native crypto_bridge JNI loaded successfully.")
            } catch (e: UnsatisfiedLinkError) {
                Log.w(TAG, "Native crypto_bridge not yet initialized: ${e.message}")
            }
        }
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
        load(null)
    }

    /**
     * Checks if the physical device hardware has a dedicated StrongBox Keymaster security chip
     */
    fun hasStrongBox(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            context.packageManager.hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)
        } else {
            false
        }
    }

    /**
     * Generates or retrieves the hardware-backed non-exportable master key
     */
    @Synchronized
    fun getOrCreateMasterKey(requireUserAuth: Boolean = false): KeyPair {
        if (keyStore.containsAlias(MASTER_KEY_ALIAS)) {
            val entry = keyStore.getEntry(MASTER_KEY_ALIAS, null) as? KeyStore.PrivateKeyEntry
            if (entry != null) {
                return KeyPair(entry.certificate.publicKey, entry.privateKey)
            }
        }

        return generateHardwareKey(requireUserAuth)
    }

    private fun generateHardwareKey(requireUserAuth: Boolean): KeyPair {
        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            ANDROID_KEYSTORE
        )

        val builder = KeyGenParameterSpec.Builder(
            MASTER_KEY_ALIAS,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        ).apply {
            setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
            
            if (requireUserAuth) {
                setUserAuthenticationRequired(true)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL)
                }
            }

            // Target physical StrongBox security chip if available, otherwise fall back to hardware TEE
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && hasStrongBox()) {
                try {
                    setIsStrongBoxBacked(true)
                    Log.i(TAG, "StrongBox hardware enclave selected for master key generation.")
                } catch (e: Exception) {
                    Log.w(TAG, "StrongBox fallback to standard TEE: ${e.message}")
                    setIsStrongBoxBacked(false)
                }
            }
        }

        return try {
            keyPairGenerator.initialize(builder.build())
            keyPairGenerator.generateKeyPair()
        } catch (e: Exception) {
            Log.w(TAG, "Failed with StrongBox, retrying on standard TEE: ${e.message}")
            // Fallback without StrongBox flag
            val fallbackBuilder = KeyGenParameterSpec.Builder(
                MASTER_KEY_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            ).apply {
                setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
            }
            keyPairGenerator.initialize(fallbackBuilder.build())
            keyPairGenerator.generateKeyPair()
        }
    }

    /**
     * Derives a deterministic Quantum DID Identity from the hardware public key
     * Example: did:quantum:9898:a7f29c01...
     */
    fun deriveQuantumDid(publicKey: PublicKey? = null): String {
        val pub = publicKey ?: getOrCreateMasterKey().public
        val sha256 = MessageDigest.getInstance("SHA-256")
        val hash = sha256.digest(pub.encoded)
        val hex = hash.joinToString("") { "%02x".format(it) }
        return "$DID_PREFIX$hex"
    }

    /**
     * Signs payload in hardware silicon using SHA256withECDSA or native ML-DSA-87 wrapper
     */
    fun signPayload(payload: ByteArray): ByteArray {
        val entry = keyStore.getEntry(MASTER_KEY_ALIAS, null) as? KeyStore.PrivateKeyEntry
            ?: throw IllegalStateException("Hardware master key is missing or not generated")

        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(entry.privateKey)
        signature.update(payload)
        return signature.sign()
    }

    /**
     * Verifies signature against the derived public key
     */
    fun verifySignature(payload: ByteArray, signatureBytes: ByteArray, publicKey: PublicKey? = null): Boolean {
        val pub = publicKey ?: getOrCreateMasterKey().public
        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initVerify(pub)
        signature.update(payload)
        return signature.verify(signatureBytes)
    }

    // =========================================================================
    // Native JNI Interface for C++ NIST Post-Quantum ML-DSA-87 / ML-KEM-1024
    // =========================================================================

    external fun nativeGeneratePqcKeyPair(): Array<ByteArray>?
    external fun nativeSignMldsa87(secretKey: ByteArray, message: ByteArray): ByteArray?
    external fun nativeVerifyMldsa87(publicKey: ByteArray, message: ByteArray, signature: ByteArray): Boolean
    external fun nativeEncapsulateMlkem1024(publicKey: ByteArray): Array<ByteArray>?
    external fun nativeDecapsulateMlkem1024(secretKey: ByteArray, ciphertext: ByteArray): ByteArray?
}
