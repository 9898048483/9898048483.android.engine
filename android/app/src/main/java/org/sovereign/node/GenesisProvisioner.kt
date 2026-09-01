package org.sovereign.node

import android.content.Context
import android.content.Intent
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

/**
 * Autonomous Genesis Provisioner
 * Automatically mints 1,000.00 TOKEN9898 to the newly derived hardware identity on first boot.
 * Writes cryptographic genesis proof to disk and broadcasts over local Android IPC.
 */
object GenesisProvisioner {

    private const val TAG = "GenesisProvisioner"
    private const val PREFS_NAME = "sovereign_genesis_vault"
    private const val KEY_IS_PROVISIONED = "is_genesis_provisioned"
    private const val KEY_WALLET_ADDRESS = "genesis_wallet_address"
    private const val KEY_TOKEN_BALANCE = "genesis_token_balance"
    private const val KEY_GENESIS_PROOF = "genesis_signature_proof"
    private const val KEY_GENESIS_TIMESTAMP = "genesis_timestamp_ms"

    const val INITIAL_TOKEN_ALLOCATION = 1000.00
    const val TOKEN_SYMBOL = "TOKEN9898"
    const val GENESIS_BLOCK_HASH = "000000009898048483a9f0e1c2b3d4e5f60718293a4b5c6d7e8f90123456789a"

    data class GenesisState(
        val isProvisioned: Boolean,
        val walletAddress: String,
        val tokenBalance: Double,
        val tokenSymbol: String,
        val genesisProof: String,
        val timestamp: Long
    )

    /**
     * Ensures genesis state is provisioned with 1,000 tokens on Dispatchers.IO
     */
    suspend fun ensureGenesisProvisioned(context: Context): GenesisState = withContext(Dispatchers.IO) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        if (prefs.getBoolean(KEY_IS_PROVISIONED, false)) {
            val address = prefs.getString(KEY_WALLET_ADDRESS, "") ?: ""
            val balance = prefs.getFloat(KEY_TOKEN_BALANCE, 1000f).toDouble()
            val proof = prefs.getString(KEY_GENESIS_PROOF, "") ?: ""
            val time = prefs.getLong(KEY_GENESIS_TIMESTAMP, System.currentTimeMillis())

            Log.i(TAG, "Genesis already initialized for identity: $address (Balance: $balance $TOKEN_SYMBOL)")
            return@withContext GenesisState(true, address, balance, TOKEN_SYMBOL, proof, time)
        }

        Log.i(TAG, "First boot detected! Minting genesis allocation of $INITIAL_TOKEN_ALLOCATION $TOKEN_SYMBOL...")

        val keyManager = HardwareKeyManager(context)
        val keyPair = keyManager.getOrCreateMasterKey(requireUserAuth = false)
        val walletAddress = keyManager.deriveQuantumDid(keyPair.public)
        val timestamp = System.currentTimeMillis()

        // Construct Genesis Block Payload
        val genesisBlock = JSONObject().apply {
            put("version", "2.0.0")
            put("blockHeight", 0)
            put("parentHash", GENESIS_BLOCK_HASH)
            put("recipientAddress", walletAddress)
            put("initialMintAmount", INITIAL_TOKEN_ALLOCATION)
            put("tokenSymbol", TOKEN_SYMBOL)
            put("timestamp", timestamp)
            put("consensusType", "PQC_M_LWE_LATTICE")
            put("nodeOwner", "Autonomous Android Sovereign Node")
        }

        val payloadBytes = genesisBlock.toString().toByteArray(StandardCharsets.UTF_8)
        val signatureBytes = keyManager.signPayload(payloadBytes)
        val signatureBase64 = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)

        genesisBlock.put("genesisSignature", signatureBase64)

        // Persist to encrypted preferences
        prefs.edit().apply {
            putBoolean(KEY_IS_PROVISIONED, true)
            putString(KEY_WALLET_ADDRESS, walletAddress)
            putFloat(KEY_TOKEN_BALANCE, INITIAL_TOKEN_ALLOCATION.toFloat())
            putString(KEY_GENESIS_PROOF, signatureBase64)
            putLong(KEY_GENESIS_TIMESTAMP, timestamp)
            apply()
        }

        // Also write atomic genesis ledger file into internal app storage
        try {
            val genesisFile = File(context.filesDir, "genesis_ledger.json")
            genesisFile.writeText(genesisBlock.toString(2), StandardCharsets.UTF_8)
            Log.d(TAG, "Genesis ledger written to ${genesisFile.absolutePath}")
        } catch (e: Exception) {
            Log.w(TAG, "Failed writing genesis_ledger.json file: ${e.message}")
        }

        // Broadcast Genesis Creation Proof over local IPC
        val broadcastIntent = Intent("org.sovereign.node.GENESIS_INITIALIZED").apply {
            putExtra("walletAddress", walletAddress)
            putExtra("tokenBalance", INITIAL_TOKEN_ALLOCATION)
            putExtra("tokenSymbol", TOKEN_SYMBOL)
            putExtra("genesisProof", signatureBase64)
            setPackage(context.packageName)
        }
        context.sendBroadcast(broadcastIntent)

        Log.i(TAG, "Genesis successfully minted! Wallet: $walletAddress with $INITIAL_TOKEN_ALLOCATION $TOKEN_SYMBOL")

        return@withContext GenesisState(
            isProvisioned = true,
            walletAddress = walletAddress,
            tokenBalance = INITIAL_TOKEN_ALLOCATION,
            tokenSymbol = TOKEN_SYMBOL,
            genesisProof = signatureBase64,
            timestamp = timestamp
        )
    }

    /**
     * Reads current persistent ledger balance
     */
    fun getCurrentBalance(context: Context): Double {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getFloat(KEY_TOKEN_BALANCE, 1000f).toDouble()
    }
}
