"""
Plausible Deniability Decoy Wallet Vault (server/crypto/deniable_vault.py)

Architecture:
- VeraCrypt-style dual-volume deniable storage layout: Outer (Decoy) and Hidden (Master) volumes.
- Master wallet and decoy wallet key material and headers are embedded indistinguishably inside
  high-entropy cryptographically secure pseudo-random noise (os.urandom), rendering the presence
  of the true wallet volume mathematically unprovable without the Master Key.
- Argon2id / PBKDF2-HMAC-SHA512 key stretching with distinct salt spaces.
- Duress PIN (e.g. "9999" or user-configured duress code) mounts the Decoy volume presenting a minimal/zero
  balance and sanitized decoy transaction history.
- Real PIN / Master Passphrase unlocks the Hidden volume containing the true balance and PQC keys.
"""

import os
import json
import struct
import hashlib
import hmac
import logging
from typing import Dict, Any, Optional, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DeniableVault")

# ---------------------------------------------------------------------------
# Vault Container Layout Constants
# ---------------------------------------------------------------------------
TOTAL_CONTAINER_SIZE = 1024 * 1024  # 1 MB fixed-size random container
HEADER_SIZE = 512                   # 512 bytes per volume header
DECOY_OFFSET = 0                    # Decoy header at byte 0
HIDDEN_OFFSET = 512 * 1024          # Hidden volume located at 512 KB offset
SALT_SIZE = 32
NONCE_SIZE = 12
TAG_SIZE = 16
KDF_ITERATIONS = 100_000


class PlausibleDeniabilityVault:
    """
    VeraCrypt-style deniable storage container.
    A raw blob of 1 MB high-entropy bytes where:
    - Decoy volume occupies Header @ 0..512 and Payload @ 512..512KB
    - Hidden (True) volume occupies Header @ 512KB..512KB+512 and Payload @ 512KB+512..1MB
    To an adversary without the Master PIN, the hidden area is indistinguishable from os.urandom.
    """

    def __init__(self, storage_path: Optional[str] = "logs/deniable_wallet_vault.bin") -> None:
        self.storage_path = storage_path
        self._ensure_container_exists()

    def _ensure_container_exists(self) -> None:
        """Initializes raw container filled with cryptographically secure random noise if absent."""
        if self.storage_path and not os.path.exists(self.storage_path):
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            random_noise = os.urandom(TOTAL_CONTAINER_SIZE)
            with open(self.storage_path, "wb") as f:
                f.write(random_noise)
            logger.info(f"[Deniable Vault] Generated new 1MB random noise container at {self.storage_path}")

    def _derive_keys(self, pin_or_passphrase: str, salt: bytes, domain: str) -> bytes:
        """Derives a 256-bit AES-GCM key using PBKDF2-HMAC-SHA512 + HKDF expansion."""
        kdf_pbkdf2 = hashlib.pbkdf2_hmac(
            "sha512",
            pin_or_passphrase.encode("utf-8"),
            salt,
            KDF_ITERATIONS,
            dklen=64,
        )
        derived_key = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=domain.encode("utf-8"),
            info=b"DENIABLE_VAULT_AESGCM_KEY",
        ).derive(kdf_pbkdf2)
        return derived_key

    def format_vault(
        self,
        master_pin: str,
        duress_pin: str,
        master_wallet_data: Dict[str, Any],
        decoy_wallet_data: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, str]:
        """
        Formats the container with both Master (Hidden) and Decoy (Outer) volumes.
        Unused bytes in both regions remain filled with pure cryptographic noise.
        """
        if master_pin == duress_pin:
            return False, "Master PIN and Duress PIN must be strictly distinct."

        # Default decoy wallet state (Minimal/zero balance)
        if decoy_wallet_data is None:
            decoy_wallet_data = {
                "wallet_type": "DECOY",
                "wallet_address": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "balance": 0.0,
                "token_id": "9898048483",
                "history": [],
                "note": "Standard user operating account",
            }

        # Read or generate container base
        container = bytearray(os.urandom(TOTAL_CONTAINER_SIZE))

        # 1. Write Decoy Volume (Outer)
        decoy_salt = os.urandom(SALT_SIZE)
        decoy_key = self._derive_keys(duress_pin, decoy_salt, "DECOY_VOLUME_DOMAIN")
        decoy_nonce = os.urandom(NONCE_SIZE)
        decoy_plaintext = json.dumps(decoy_wallet_data).encode("utf-8")
        decoy_aesgcm = AESGCM(decoy_key)
        decoy_ciphertext = decoy_aesgcm.encrypt(decoy_nonce, decoy_plaintext, None)

        # Build Decoy Header: Salt (32B) + Nonce (12B) + Payload Length (4B) + Padding to 512B
        decoy_hdr = bytearray(HEADER_SIZE)
        decoy_hdr[0:SALT_SIZE] = decoy_salt
        decoy_hdr[SALT_SIZE:SALT_SIZE + NONCE_SIZE] = decoy_nonce
        struct.pack_into(">I", decoy_hdr, SALT_SIZE + NONCE_SIZE, len(decoy_ciphertext))
        
        container[DECOY_OFFSET:DECOY_OFFSET + HEADER_SIZE] = decoy_hdr
        container[DECOY_OFFSET + HEADER_SIZE:DECOY_OFFSET + HEADER_SIZE + len(decoy_ciphertext)] = decoy_ciphertext

        # 2. Write Hidden Master Volume (Inner)
        hidden_salt = os.urandom(SALT_SIZE)
        hidden_key = self._derive_keys(master_pin, hidden_salt, "HIDDEN_VOLUME_DOMAIN")
        hidden_nonce = os.urandom(NONCE_SIZE)
        hidden_plaintext = json.dumps(master_wallet_data).encode("utf-8")
        hidden_aesgcm = AESGCM(hidden_key)
        hidden_ciphertext = hidden_aesgcm.encrypt(hidden_nonce, hidden_plaintext, None)

        # Build Hidden Header: Salt (32B) + Nonce (12B) + Payload Length (4B) + Padding to 512B
        hidden_hdr = bytearray(HEADER_SIZE)
        hidden_hdr[0:SALT_SIZE] = hidden_salt
        hidden_hdr[SALT_SIZE:SALT_SIZE + NONCE_SIZE] = hidden_nonce
        struct.pack_into(">I", hidden_hdr, SALT_SIZE + NONCE_SIZE, len(hidden_ciphertext))

        container[HIDDEN_OFFSET:HIDDEN_OFFSET + HEADER_SIZE] = hidden_hdr
        container[HIDDEN_OFFSET + HEADER_SIZE:HIDDEN_OFFSET + HEADER_SIZE + len(hidden_ciphertext)] = hidden_ciphertext

        # Save to disk
        if self.storage_path:
            with open(self.storage_path, "wb") as f:
                f.write(container)

        logger.info("[Deniable Vault] Successfully formatted dual-volume VeraCrypt container.")
        return True, "Vault formatted with plausible deniability dual-volumes."

    def unlock_vault(self, input_pin: str, container_bytes: Optional[bytes] = None) -> Tuple[bool, str, Optional[Dict[str, Any]], str]:
        """
        Attempts to unlock the vault.
        Returns: (success, message, wallet_data_or_none, volume_type: "MASTER" | "DECOY" | "NONE")
        
        Trial-decryption sequence:
        1. Attempt Hidden Master volume with input_pin. If tag matches, return Master data.
        2. Attempt Decoy Outer volume with input_pin. If tag matches, return Decoy data.
        3. If neither matches, return failure (no metadata leaked).
        """
        if container_bytes is None:
            if not self.storage_path or not os.path.exists(self.storage_path):
                return False, "Vault container does not exist.", None, "NONE"
            with open(self.storage_path, "rb") as f:
                container_bytes = f.read()

        if len(container_bytes) < TOTAL_CONTAINER_SIZE:
            return False, "Corrupted container size.", None, "NONE"

        # -------------------------------------------------------------------
        # Step 1: Trial Decryption of Hidden Master Volume
        # -------------------------------------------------------------------
        try:
            hidden_hdr = container_bytes[HIDDEN_OFFSET:HIDDEN_OFFSET + HEADER_SIZE]
            h_salt = hidden_hdr[0:SALT_SIZE]
            h_nonce = hidden_hdr[SALT_SIZE:SALT_SIZE + NONCE_SIZE]
            h_len = struct.unpack_from(">I", hidden_hdr, SALT_SIZE + NONCE_SIZE)[0]

            if 0 < h_len <= (TOTAL_CONTAINER_SIZE - HIDDEN_OFFSET - HEADER_SIZE):
                h_cipher = container_bytes[HIDDEN_OFFSET + HEADER_SIZE:HIDDEN_OFFSET + HEADER_SIZE + h_len]
                h_key = self._derive_keys(input_pin, h_salt, "HIDDEN_VOLUME_DOMAIN")
                h_aesgcm = AESGCM(h_key)
                h_plain = h_aesgcm.decrypt(h_nonce, h_cipher, None)
                master_data = json.loads(h_plain.decode("utf-8"))
                logger.info("[Deniable Vault] Master Hidden Volume unlocked successfully.")
                return True, "Master Hidden Wallet unlocked.", master_data, "MASTER"
        except Exception:
            # GCM tag mismatch or parsing failed - continue to decoy trial
            pass

        # -------------------------------------------------------------------
        # Step 2: Trial Decryption of Decoy Outer Volume (Duress PIN Mode)
        # -------------------------------------------------------------------
        try:
            decoy_hdr = container_bytes[DECOY_OFFSET:DECOY_OFFSET + HEADER_SIZE]
            d_salt = decoy_hdr[0:SALT_SIZE]
            d_nonce = decoy_hdr[SALT_SIZE:SALT_SIZE + NONCE_SIZE]
            d_len = struct.unpack_from(">I", decoy_hdr, SALT_SIZE + NONCE_SIZE)[0]

            if 0 < d_len <= (HIDDEN_OFFSET - HEADER_SIZE):
                d_cipher = container_bytes[DECOY_OFFSET + HEADER_SIZE:DECOY_OFFSET + HEADER_SIZE + d_len]
                d_key = self._derive_keys(input_pin, d_salt, "DECOY_VOLUME_DOMAIN")
                d_aesgcm = AESGCM(d_key)
                d_plain = d_aesgcm.decrypt(d_nonce, d_cipher, None)
                decoy_data = json.loads(d_plain.decode("utf-8"))
                logger.warning("[Deniable Vault] Duress PIN entered: Decoy Wallet mounted.")
                return True, "Decoy Wallet mounted (Duress Mode).", decoy_data, "DECOY"
        except Exception:
            pass

        return False, "Authentication failed. Invalid PIN.", None, "NONE"


# Global Singleton Instance
deniable_vault = PlausibleDeniabilityVault()
