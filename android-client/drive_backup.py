import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from android_client.storage_bridge import StorageBridge
from android_client.keystore_manager import KeyStoreManager

class DriveBackupEngine:
    """
    Handles secure Google Drive backup and emergency zeroization (Panic Wipe).
    """
    
    def __init__(self, credentials_path, container_path):
        self.credentials_path = credentials_path
        self.container_path = container_path
        # In production, this key must be derived from user-auth + KEK in KeyStore
        self.aes_key = AESGCM.generate_key(bit_length=256)
        self.aesgcm = AESGCM(self.aes_key)
        
        self.keystore = KeyStoreManager()
        self.storage_bridge = StorageBridge(container_path, 1024*1024)

    def encrypt_and_upload(self, drive_service):
        """Encrypts local storage with AES-GCM and uploads to Drive."""
        with open(self.container_path, "rb") as f:
            data = f.read()
            
        nonce = os.urandom(12)
        encrypted_data = self.aesgcm.encrypt(nonce, data, None)
        
        # Save encrypted file locally before upload
        encrypted_path = f"{self.container_path}.enc"
        with open(encrypted_path, "wb") as f:
            f.write(nonce + encrypted_data)
            
        # Upload to Google Drive
        file_metadata = {'name': 'vault_backup.enc'}
        media = MediaFileUpload(encrypted_path, mimetype='application/octet-stream')
        drive_service.files().create(body=file_metadata, media_body=media).execute()
        
        # Clean up encrypted temp file
        os.remove(encrypted_path)
        print("Backup complete.")

    def panic_wipe(self):
        """Executes emergency zeroization."""
        print("EMERGENCY PANIC WIPE INITIATED.")
        
        # 1. Purge KeyStore keys
        self.keystore.clear_all()
        
        # 2. Unmount and securely wipe volume headers/file
        self.storage_bridge.unmount()
        if os.path.exists(self.container_path):
            file_size = os.path.getsize(self.container_path)
            with open(self.container_path, "r+b") as f:
                # Overwrite with high-entropy noise before deletion
                f.write(os.urandom(file_size))
            os.remove(self.container_path)
        
        print("PANIC WIPE EXECUTED. STORAGE PURGED.")
