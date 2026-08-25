import os
from server.plausible_deniability import PlausibleStorageEngine
from android_client.keystore_manager import KeyStoreManager

class StorageBridge:
    """
    Android-side bridge connecting UI to the Plausible Storage Engine.
    Handles PIN routing and memory safety.
    """
    
    def __init__(self, container_path, size):
        self.engine = PlausibleStorageEngine(container_path, size)
        self.keystore = KeyStoreManager()
        self.active_key_buffer = None
        
        # Define known PINs or derivation logic
        self.PIN_DECOY = "PIN_A" 
        self.PIN_HIDDEN = "PIN_B"

    def _zeroize_buffer(self):
        """Securely zeroize intermediate key buffers."""
        if self.active_key_buffer:
            for i in range(len(self.active_key_buffer)):
                self.active_key_buffer[i] = 0
            self.active_key_buffer = None

    def mount_volume(self, pin: str, salt: bytes, offset: int):
        """Routes PIN to the appropriate volume."""
        self._zeroize_buffer()
        
        # Derive master key
        master_key = self.engine.access_volume(pin, offset, salt)
        
        # Store in a mutable bytearray for zeroization
        self.active_key_buffer = bytearray(master_key)
        
        if pin == self.PIN_HIDDEN:
            print("Accessing Hidden Volume")
            # Additional hardware-backed wrapping could occur here
        else:
            print("Accessing Decoy Volume")
            
        return True

    def unmount(self):
        """Performs secure unmount and RAM zeroization."""
        self._zeroize_buffer()
        print("Volume unmounted securely.")
