package ai.securespace.attestation

import android.content.Context
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest

class RemoteAttestationClient(private val context: Context) {
    
    /**
     * 1. Fetches a cryptographically secure Nonce from the Backend.
     * 2. Requests an Integrity Token from Google Play Services.
     * 3. Submits the JWS token back to the Backend for verification.
     */
    fun performHardwareAttestation(serverNonceBase64: String, onTokenReceived: (String) -> Unit) {
        // Initialize the Play Integrity Manager
        val integrityManager = IntegrityManagerFactory.create(context)
        
        // Bind the server-generated nonce to prevent replay attacks
        val request = IntegrityTokenRequest.builder()
            .setNonce(serverNonceBase64)
            .build()
            
        integrityManager.requestIntegrityToken(request)
            .addOnSuccessListener { response ->
                val jwsToken = response.token()
                // Transmit this token to the backend over an mTLS/TLS 1.3 channel
                onTokenReceived(jwsToken)
            }
            .addOnFailureListener { e ->
                // Attestation failed (e.g., Play Services missing, network error)
                throw SecurityException("Hardware attestation failed to generate token: ${e.message}")
            }
    }
}
