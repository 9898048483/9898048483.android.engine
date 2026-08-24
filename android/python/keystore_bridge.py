import os
import sys
import base64
import logging
import traceback
from typing import Optional, Tuple, Dict, Any

# ==============================================================================
# AI SECURE SPACE - ROOTLESS ANDROID SANDBOX & KEYSTORE INTEGRATION (PROMPT 17)
# Role: Android OS Security Architect
# Requirements: Android KeyStore, Sandbox File Perms, Hardware-Backed TEE Keys
# ==============================================================================

try:
    from jnius import autoclass, cast, PythonJavaClass, java_method
    ANDROID_ENV = True
except ImportError:
    ANDROID_ENV = False

class AndroidKeystoreBridge:
    def __init__(self, key_alias: str = "AISecureSpaceMasterKey"):
        self.key_alias = key_alias
        self.keystore = None
        self.is_hardware_backed = False
        
        self._init_keystore()

    def _init_keystore(self):
        if not ANDROID_ENV:
            return

        try:
            # Java classes
            KeyStore = autoclass('java.security.KeyStore')
            KeyProperties = autoclass('android.security.keystore.KeyProperties')
            KeyGenParameterSpecBuilder = autoclass('android.security.keystore.KeyGenParameterSpec$Builder')
            KeyGenerator = autoclass('javax.crypto.KeyGenerator')

            # Initialize KeyStore
            self.keystore = KeyStore.getInstance("AndroidKeyStore")
            self.keystore.load(None)

            if not self.keystore.containsAlias(self.key_alias):
                # Generate new AES-256 GCM Key in Hardware Keystore
                purposes = KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                builder = KeyGenParameterSpecBuilder(self.key_alias, purposes)
                builder.setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                builder.setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                builder.setKeySize(256)
                builder.setRandomizedEncryptionRequired(True)
                
                keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
                keyGenerator.init(builder.build())
                keyGenerator.generateKey()
            
            # Verify if it's hardware backed
            KeyInfo = autoclass('android.security.keystore.KeyInfo')
            SecretKeyFactory = autoclass('javax.crypto.SecretKeyFactory')
            factory = SecretKeyFactory.getInstance(self.keystore.getKey(self.key_alias, None).getAlgorithm(), "AndroidKeyStore")
            keyInfo = factory.getKeySpec(self.keystore.getKey(self.key_alias, None), KeyInfo)
            self.is_hardware_backed = keyInfo.isInsideSecureHardware()
            
        except Exception as e:
            print(f"[!] Android KeyStore Init Error: {e}")

    def encrypt_data(self, plaintext: bytes) -> Optional[Tuple[bytes, bytes]]:
        if not ANDROID_ENV:
            # Fallback for testing on Linux/Mac
            import struct
            nonce = os.urandom(12)
            # Simulated GCM encrypt (XOR with fixed key for testing only!)
            ct = bytes(a ^ b for a, b in zip(plaintext, b'\x55' * len(plaintext))) + b'\x00' * 16 # mock tag
            return nonce, ct

        try:
            Cipher = autoclass('javax.crypto.Cipher')
            secret_key = self.keystore.getKey(self.key_alias, None)
            
            # AES/GCM/NoPadding
            cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secret_key)
            
            iv = cipher.getIV()
            ciphertext = cipher.doFinal(plaintext)
            
            return bytes(iv), bytes(ciphertext)
            
        except Exception as e:
            print(f"[!] Encryption failed: {e}")
            return None

    def decrypt_data(self, iv: bytes, ciphertext: bytes) -> Optional[bytes]:
        if not ANDROID_ENV:
            # Simulated GCM decrypt
            ct = ciphertext[:-16] # remove mock tag
            return bytes(a ^ b for a, b in zip(ct, b'\x55' * len(ct)))

        try:
            Cipher = autoclass('javax.crypto.Cipher')
            GCMParameterSpec = autoclass('javax.crypto.spec.GCMParameterSpec')
            
            secret_key = self.keystore.getKey(self.key_alias, None)
            cipher = Cipher.getInstance("AES/GCM/NoPadding")
            
            # GCM Tag is 128 bits (16 bytes)
            spec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, secret_key, spec)
            
            plaintext = cipher.doFinal(ciphertext)
            return bytes(plaintext)
            
        except Exception as e:
            print(f"[!] Decryption failed: {e}")
            return None

    def configure_sandbox_permissions(self, data_path: str) -> bool:
        """
        Enforce strict rootless sandbox permissions on application data directory.
        Prevents cross-app leakage by setting mode to 0700 (owner read/write/execute).
        """
        try:
            if not os.path.exists(data_path):
                os.makedirs(data_path, mode=0o700, exist_ok=True)
            else:
                os.chmod(data_path, 0o700)
                
            # Verify permissions
            stat_info = os.stat(data_path)
            mode = stat_info.st_mode & 0o777
            if mode != 0o700:
                print(f"[!] Warning: Sandbox directory {data_path} has loose permissions: {oct(mode)}")
                return False
            return True
        except Exception as e:
            print(f"[!] Failed to configure sandbox permissions: {e}")
            return False


if __name__ == "__main__":
    print("===========================================================================")
    print("  AI SECURE SPACE: ANDROID KEYSTORE & SANDBOX MODULE (Prompt 17)")
    print("===========================================================================")
    
    bridge = AndroidKeystoreBridge("TestMasterKey_V1")
    
    # 1. Hardware Backing Check
    print(f"[*] Android Environment Detected: {ANDROID_ENV}")
    if ANDROID_ENV:
        print(f"[*] Hardware-Backed TEE Key   : {bridge.is_hardware_backed}")
    else:
        print(f"[*] Hardware-Backed TEE Key   : SIMULATED (Linux/Mac Test Mode)")
    
    # 2. Cryptographic Sandbox Ops
    test_message = b"ROOTLESS_SANDBOX_MASTER_SECRET_987654321"
    print(f"\n[*] Original Plaintext        : {test_message.decode()}")
    
    enc_res = bridge.encrypt_data(test_message)
    if enc_res:
        iv, ct = enc_res
        print(f"[*] Encrypted Ciphertext      : {base64.b64encode(ct).decode()}")
        print(f"[*] Initialization Vector     : {base64.b64encode(iv).decode()}")
        
        # 3. Decrypt
        dec_msg = bridge.decrypt_data(iv, ct)
        if dec_msg:
            print(f"[*] Decrypted Plaintext       : {dec_msg.decode()}")
            print(f"[*] Integrity Verification    : {'PASS' if dec_msg == test_message else 'FAIL'}")
        else:
            print("[!] Decryption Error")
            
    # 4. App Sandbox Permission Enforcement
    test_sandbox_dir = "/tmp/aisecure_sandbox_vault" if not ANDROID_ENV else "/data/data/ai.secure.space.touchless/files/secure_vault"
    print(f"\n[*] Configuring Sandbox Perms : {test_sandbox_dir}")
    success = bridge.configure_sandbox_permissions(test_sandbox_dir)
    print(f"[*] Rootless Isolation Status : {'SECURE (0700)' if success else 'VULNERABLE'}")
    
    print("===========================================================================")

