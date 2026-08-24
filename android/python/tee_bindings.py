import ctypes
import os

class AICryptoEngineHardwareBridge:
    """
    Python CTypes binding linking ai_crypto_engine.py directly to the native 
    C++ JNI StrongBox abstraction layer.
    """
    def __init__(self, lib_path="libtee_bridge.so"):
        try:
            self.lib = ctypes.CDLL(lib_path)
            
            # Key Generation
            self.lib.hardware_generate_key.argtypes = [ctypes.c_char_p, ctypes.c_size_t]
            self.lib.hardware_generate_key.restype = ctypes.c_int
            
            # Encryption
            self.lib.hardware_encrypt.argtypes = [
                ctypes.c_char_p, ctypes.c_size_t, 
                ctypes.POINTER(ctypes.POINTER(ctypes.c_uint8)), ctypes.POINTER(ctypes.c_size_t)
            ]
            self.lib.hardware_encrypt.restype = ctypes.c_int
            
            # Decryption
            self.lib.hardware_decrypt.argtypes = [
                ctypes.c_char_p, ctypes.c_size_t, 
                ctypes.POINTER(ctypes.POINTER(ctypes.c_uint8)), ctypes.POINTER(ctypes.c_size_t)
            ]
            self.lib.hardware_decrypt.restype = ctypes.c_int
            
            # Buffer Management
            self.lib.hardware_free_buffer.argtypes = [ctypes.POINTER(ctypes.c_uint8), ctypes.c_size_t]
            self.lib.hardware_free_buffer.restype = None
            
            self._mock_mode = False
        except OSError:
            self._mock_mode = True

    def generate_attested_key(self, challenge: bytes = b"") -> bool:
        if self._mock_mode: return True
        chal_ptr = ctypes.c_char_p(challenge) if challenge else None
        return self.lib.hardware_generate_key(chal_ptr, len(challenge)) == 1

    def encrypt_data(self, plaintext: bytes) -> bytes:
        if self._mock_mode:
            return os.urandom(12) + bytes([x ^ 0xFF for x in plaintext]) # Mock GCM
            
        out_ptr = ctypes.POINTER(ctypes.c_uint8)()
        out_len = ctypes.c_size_t(0)
        
        if self.lib.hardware_encrypt(plaintext, len(plaintext), ctypes.byref(out_ptr), ctypes.byref(out_len)) != 1:
            raise RuntimeError("Hardware Encryption Failed")
            
        result = bytes(ctypes.cast(out_ptr, ctypes.POINTER(ctypes.c_uint8 * out_len.value)).contents)
        self.lib.hardware_free_buffer(out_ptr, out_len) # SECURE_BZERO applied here
        return result

    def decrypt_data(self, ciphertext: bytes) -> bytes:
        if self._mock_mode:
            return bytes([x ^ 0xFF for x in ciphertext[12:]])
            
        out_ptr = ctypes.POINTER(ctypes.c_uint8)()
        out_len = ctypes.c_size_t(0)
        
        if self.lib.hardware_decrypt(ciphertext, len(ciphertext), ctypes.byref(out_ptr), ctypes.byref(out_len)) != 1:
            raise RuntimeError("Hardware Decryption Failed")
            
        result = bytes(ctypes.cast(out_ptr, ctypes.POINTER(ctypes.c_uint8 * out_len.value)).contents)
        self.lib.hardware_free_buffer(out_ptr, out_len) # SECURE_BZERO applied here
        return result
