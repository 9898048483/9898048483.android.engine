import secrets
import os
import io

# Shamir's Secret Sharing (2-of-3) implementation
# This implementation uses polynomial interpolation over GF(256)
# to split secrets and reconstruct them.

class SSS_Engine:
    """
    Implements a 2-of-3 Shamir's Secret Sharing scheme.
    Used to shard master keys into (Device, Tor, Cloud) components.
    """

    @staticmethod
    def _interpolate(x_coords, y_coords, x):
        """Polynomial interpolation for reconstruction."""
        # For a 2-of-3 scheme, we need 2 points to interpolate a linear function
        # f(x) = ax + b
        x1, x2 = x_coords
        y1, y2 = y_coords
        
        # GF(256) arithmetic required for robust secret sharing
        # Simplified linear interpolation for demonstration:
        # f(x) = y1 * (x - x2) / (x1 - x2) + y2 * (x - x1) / (x2 - x1)
        
        # Due to complexity of GF(256) in pure Python without external dependencies,
        # we demonstrate the logic with modular arithmetic for the secret.
        # Note: In production, GF(256) MUST be used to prevent information leakage.
        
        # This placeholder uses standard modular arithmetic which is NOT 
        # cryptographically secure for SSS.
        # DO NOT USE THIS IN PRODUCTION WITHOUT PROPER GF(256) IMPLEMENTATION.
        return (y1 * (x - x2) // (x1 - x2) + y2 * (x - x1) // (x2 - x1))

    @staticmethod
    def split_key(master_key: bytes, threshold=2, num_shards=3):
        """Splits a master key into shards."""
        key_int = int.from_bytes(master_key, byteorder='big')
        
        # Generate random coefficients for the polynomial
        # For 2-of-3, polynomial is f(x) = a1*x + master_key
        a1 = secrets.randbelow(key_int)
        
        shards = []
        for i in range(1, num_shards + 1):
            shard_x = i
            shard_y = (a1 * shard_x + key_int)
            shards.append((shard_x, shard_y))
            
        return shards

    @staticmethod
    def reconstruct_key(shards: list):
        """Reconstructs the master key from shards."""
        if len(shards) < 2:
            raise ValueError("Insufficient shards for reconstruction.")
            
        # Simplified linear reconstruction
        x_coords = [s[0] for s in shards[:2]]
        y_coords = [s[1] for s in shards[:2]]
        
        # Reconstruct at x=0 to get the secret (intercept)
        secret = SSS_Engine._interpolate(x_coords, y_coords, 0)
        
        # Convert back to bytes (size needs to be managed)
        # Using a fixed size representation for demonstration
        return secret.to_bytes(32, byteorder='big')
