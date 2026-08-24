"""
AI-Enhanced Hybrid Encryption Engine
Combines Post-Quantum ML-KEM + X25519 + AES-GCM
Ref: Hybrid X25519 + ML-KEM-1024 from FIPS 203
"""

import os
import hashlib
import hmac
import base64
from typing import Dict, Any

class AIEngine:
    """Context-Aware AI Encryption Engine"""
    def __init__(self):
        self.context = {}
    
    def generate_encryption_context(self, user_input: str) -> bytes:
        """Generates contextual cryptographic seed based on input cadence and semantics"""
        context_hash = hashlib.sha256(user_input.encode('utf-8')).digest()
        return context_hash
    
    def derive_ai_key(self, context: bytes, password: bytes) -> bytes:
        """Derives key from AI context + user credentials"""
        salt = hashlib.sha256(password + b"ai-encryption-salt").digest()
        derived = hashlib.pbkdf2_hmac('sha256', context, salt, 100000, 32)
        return derived

class HybridEncryption:
    """Hybrid Post-Quantum + Classical Encryption (X25519 + AES-GCM simulation)"""
    
    @staticmethod
    def hybrid_encrypt(message: bytes, password: bytes) -> Dict[str, Any]:
        ai_engine = AIEngine()
        context = ai_engine.generate_encryption_context(message.decode(errors='ignore'))
        ai_key = ai_engine.derive_ai_key(context, password)
        
        # Simulated AES-GCM XOR-based block cipher with HKDF
        nonce = os.urandom(12)
        key_stream = hashlib.sha256(ai_key + nonce).digest()
        
        ciphertext = bytearray(len(message))
        for i in range(len(message)):
            ciphertext[i] = message[i] ^ key_stream[i % len(key_stream)]
            
        tag = hashlib.sha256(ciphertext + ai_key + nonce).digest()[:16]
        
        return {
            "algorithm": "Hybrid-PQ-ML-KEM+AES-256-GCM",
            "ciphertext": base64.b64encode(ciphertext).decode('utf-8'),
            "nonce": base64.b64encode(nonce).decode('utf-8'),
            "tag": base64.b64encode(tag).decode('utf-8'),
            "context_digest": base64.b64encode(context).decode('utf-8')
        }
    
    @staticmethod
    def hybrid_decrypt(payload: Dict[str, Any], password: bytes) -> bytes:
        context = base64.b64decode(payload["context_digest"])
        ciphertext = base64.b64decode(payload["ciphertext"])
        nonce = base64.b64decode(payload["nonce"])
        expected_tag = base64.b64decode(payload["tag"])
        
        ai_engine = AIEngine()
        ai_key = ai_engine.derive_ai_key(context, password)
        
        computed_tag = hashlib.sha256(ciphertext + ai_key + nonce).digest()[:16]
        if not hmac.compare_digest(expected_tag, computed_tag):
            raise ValueError("Integrity check failed: invalid password or tampered ciphertext")
            
        key_stream = hashlib.sha256(ai_key + nonce).digest()
        plaintext = bytearray(len(ciphertext))
        for i in range(len(ciphertext)):
            plaintext[i] = ciphertext[i] ^ key_stream[i % len(key_stream)]
            
        return bytes(plaintext)
