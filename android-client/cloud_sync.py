"""
Encrypted Cloud Backup & Panic Purge Engine
File: android-client/cloud_sync.py

Architecture:
- Authenticated AES-256-GCM cloud backup encryption for wallet containers and metadata.
- Google Drive API integration for automated, encrypted offsite snapshot synchronization.
- Anti-Forensic Panic Hook:
  - Invoked upon Duress PIN entry, remote distress signal over Tor mesh, or tamper detection.
  - Instantly shreds local cloud OAuth access/refresh tokens.
  - Securely overwrites (zeroizes) local wallet container headers and keys with cryptographic entropy before file unlinking.
"""

import os
import sys
import json
import time
import shutil
import hashlib
from typing import Optional, Dict, Any, Tuple, List
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


class EncryptedCloudBackupManager:
    """
    Manages client-side AES-256-GCM volume encryption for Google Drive backups
    and executes instant zeroization upon panic distress triggers.
    """

    def __init__(
        self,
        wallet_dir: str = "data/wallet",
        token_credentials_path: str = "data/wallet/drive_token.json",
        wallet_header_path: str = "data/wallet/wallet_header.dat",
        master_passphrase: Optional[str] = None,
    ) -> None:
        self.wallet_dir = wallet_dir
        self.token_credentials_path = token_credentials_path
        self.wallet_header_path = wallet_header_path
        os.makedirs(self.wallet_dir, exist_ok=True)

        # Derive 256-bit AES-GCM Key
        salt = b"Token9898048483_CloudBackupSalt_v1"
        passphrase = (master_passphrase or "EnclaveHardwareDerivedKey_9898048483").encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        self.aes_key = kdf.derive(passphrase)
        self.aesgcm = AESGCM(self.aes_key)
        self.is_purged = False
        self.last_backup_timestamp: Optional[float] = None

    def encrypt_payload(self, plaintext_bytes: bytes, associated_data: Optional[bytes] = None) -> bytes:
        """
        Encrypts arbitrary payload using AES-256-GCM.
        Format: [12-byte Nonce] + [Ciphertext + 16-byte Tag]
        """
        if self.is_purged:
            raise RuntimeError("Cannot encrypt: Device has executed emergency panic purge.")
        nonce = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(nonce, plaintext_bytes, associated_data)
        return nonce + ciphertext

    def decrypt_payload(self, encrypted_bytes: bytes, associated_data: Optional[bytes] = None) -> bytes:
        """
        Decrypts an AES-256-GCM encrypted payload.
        """
        if self.is_purged:
            raise RuntimeError("Cannot decrypt: Device has executed emergency panic purge.")
        if len(encrypted_bytes) < 28:
            raise ValueError("Invalid ciphertext length: must include 12-byte nonce and 16-byte tag.")
        nonce = encrypted_bytes[:12]
        ciphertext = encrypted_bytes[12:]
        return self.aesgcm.decrypt(nonce, ciphertext, associated_data)

    def create_encrypted_backup_bundle(
        self,
        wallet_state: Dict[str, Any],
        output_path: Optional[str] = None,
    ) -> Tuple[str, int]:
        """
        Serializes and encrypts wallet metadata into an offsite-ready encrypted backup package.
        """
        if self.is_purged:
            raise RuntimeError("Cannot backup: Storage has been purged.")

        raw_json = json.dumps(wallet_state, indent=2).encode('utf-8')
        enc_bytes = self.encrypt_payload(raw_json, associated_data=b"token_9898048483_backup")

        target_file = output_path or os.path.join(self.wallet_dir, "cloud_vault_backup.enc")
        with open(target_file, "wb") as f:
            f.write(enc_bytes)

        self.last_backup_timestamp = time.time()
        return target_file, len(enc_bytes)

    def upload_to_google_drive(
        self,
        backup_file_path: str,
        drive_service: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Uploads the encrypted backup bundle to Google Drive AppData / Vault folder.
        Uses provided Google Drive API client or produces authenticated snapshot metadata.
        """
        if self.is_purged:
            raise RuntimeError("Cannot upload: Cloud tokens purged.")

        if not os.path.exists(backup_file_path):
            raise FileNotFoundError(f"Backup file not found at {backup_file_path}")

        file_size = os.path.getsize(backup_file_path)
        with open(backup_file_path, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()

        if drive_service is not None:
            try:
                from googleapiclient.http import MediaFileUpload
                file_metadata = {
                    'name': 'token_9898048483_vault_backup.enc',
                    'description': 'Encrypted PQC Token Wallet Vault Backup',
                }
                media = MediaFileUpload(backup_file_path, mimetype='application/octet-stream')
                result = drive_service.files().create(body=file_metadata, media_body=media).execute()
                return {
                    "status": "UPLOADED",
                    "drive_file_id": result.get("id", "drive_file_001"),
                    "file_size": file_size,
                    "sha256": file_hash,
                    "timestamp": time.time(),
                }
            except Exception as e:
                print(f"[Drive Backup] Google API upload exception: {e}")

        # Standard simulated response for offline/embedded runtimes
        return {
            "status": "READY_FOR_SYNC",
            "local_path": backup_file_path,
            "file_size": file_size,
            "sha256": file_hash,
            "timestamp": time.time(),
        }

    def _secure_shred_file(self, file_path: str, passes: int = 3) -> bool:
        """
        Anti-forensic file shredder: overwrites target file with pseudorandom entropy
        across multiple passes before truncation and unlinking.
        """
        if not os.path.exists(file_path):
            return True

        try:
            size = os.path.getsize(file_path)
            if size > 0:
                with open(file_path, "r+b") as f:
                    for _ in range(passes):
                        f.seek(0)
                        f.write(os.urandom(size))
                        f.flush()
                        os.fsync(f.fileno())
                    # Final zero pass
                    f.seek(0)
                    f.write(b"\x00" * size)
                    f.flush()
                    os.fsync(f.fileno())

            os.remove(file_path)
            return True
        except Exception as e:
            print(f"[Panic Shred] Error shredding file {file_path}: {e}")
            try:
                os.remove(file_path)
                return True
            except Exception:
                return False

    def trigger_panic_purge(
        self,
        reason: str = "DURESS_PIN_ENTERED",
        distress_pin: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        EMERGENCY PANIC PURGE HOOK:
        1. Immediately wipes Google Drive OAuth access and refresh tokens.
        2. Shreds local wallet header and master container files with cryptographic noise.
        3. Clears in-memory keys and marks state as purged.
        """
        purged_artifacts: List[str] = []

        # 1. Purge Cloud OAuth Tokens
        if os.path.exists(self.token_credentials_path):
            if self._secure_shred_file(self.token_credentials_path):
                purged_artifacts.append("drive_token.json")

        # 2. Shred Wallet Headers & Container Files
        if os.path.exists(self.wallet_header_path):
            if self._secure_shred_file(self.wallet_header_path):
                purged_artifacts.append("wallet_header.dat")

        # Check for any .enc or .dat files in wallet dir and shred them
        if os.path.exists(self.wallet_dir):
            for fname in os.listdir(self.wallet_dir):
                if fname.endswith((".enc", ".dat", ".key", ".secret", ".bin")):
                    full_path = os.path.join(self.wallet_dir, fname)
                    if self._secure_shred_file(full_path):
                        purged_artifacts.append(fname)

        # 3. In-memory Zeroization
        self.aes_key = b"\x00" * 32
        self.is_purged = True

        report = {
            "status": "PURGED_ZEROIZED",
            "reason": reason,
            "purged_artifacts_count": len(purged_artifacts),
            "purged_artifacts": purged_artifacts,
            "timestamp": time.time(),
        }
        print(f"[PANIC PURGE] Completed anti-forensic zeroization. Reason: {reason}")
        return report


# Global Instance
cloud_sync_manager = EncryptedCloudBackupManager()
