"""
2-of-3 sMPC Threshold Key Sharding Engine
File: server/crypto/smpc_shards.py

Architecture:
- Implements mathematically rigorous 2-of-3 Shamir's Secret Sharing (SSS) over Galois Field GF(2^8) (AES irreducible polynomial 0x11B / x^8 + x^4 + x^3 + x + 1).
- Splits sensitive Master Private Keys / Dilithium / ML-DSA Seeds into 3 independent geographic shards:
    1. Local Device Enclave Shard (Android Keystore / StrongBox backed)
    2. Tor Peer Relay Shard (Ephemeral onion mesh routed)
    3. Cloud Backup Shard (Encrypted distributed replica)
- Enforces quorum threshold: Any 2 shards reconstruct the exact secret in volatile RAM.
- Secure Memory Scrubber: Clears reconstructed keys from RAM immediately following signing execution.
"""

import os
import sys
import json
import secrets
import logging
from typing import List, Tuple, Dict, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sMPCShards")

# ---------------------------------------------------------------------------
# Galois Field GF(2^8) Arithmetic Engine (Rijndael Field 0x11B)
# ---------------------------------------------------------------------------
# Irreducible polynomial for AES/Rijndael: x^8 + x^4 + x^3 + x + 1 (0x11B = 283)
POLYNOMIAL = 0x11B

# Precomputed log and exp tables for fast GF(256) multiplication/division
GF256_EXP = [0] * 512
GF256_LOG = [0] * 256


def _init_gf256_tables() -> None:
    """Initializes logarithmic tables for Galois Field 256."""
    x = 1
    for i in range(255):
        GF256_EXP[i] = x
        GF256_EXP[i + 255] = x
        GF256_LOG[x] = i
        x <<= 1
        if x & 0x100:
            x ^= POLYNOMIAL
    GF256_LOG[0] = 0  # Undefined mathematically, set to 0 by convention


_init_gf256_tables()


def gf_add(a: int, b: int) -> int:
    """Addition in GF(2^8) is bitwise XOR."""
    return a ^ b


def gf_sub(a: int, b: int) -> int:
    """Subtraction in GF(2^8) is identical to addition (bitwise XOR)."""
    return a ^ b


def gf_mul(a: int, b: int) -> int:
    """Multiplication in GF(2^8) using lookup tables."""
    if a == 0 or b == 0:
        return 0
    return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]]


def gf_div(a: int, b: int) -> int:
    """Division in GF(2^8)."""
    if b == 0:
        raise ZeroDivisionError("Division by zero in GF(2^8)")
    if a == 0:
        return 0
    return GF256_EXP[(GF256_LOG[a] - GF256_LOG[b] + 255) % 255]


def gf_eval_poly(poly: List[int], x: int) -> int:
    """Evaluates polynomial at x in GF(2^8) using Horner's rule."""
    result = 0
    for coef in reversed(poly):
        result = gf_add(gf_mul(result, x), coef)
    return result


def gf_interpolate(x_coords: List[int], y_coords: List[int], x_target: int = 0) -> int:
    """Lagrange polynomial interpolation in GF(2^8) evaluated at x_target (0 for secret)."""
    k = len(x_coords)
    secret = 0
    for i in range(k):
        num = 1
        den = 1
        for j in range(k):
            if i != j:
                num = gf_mul(num, gf_sub(x_target, x_coords[j]))
                den = gf_mul(den, gf_sub(x_coords[i], x_coords[j]))
        li = gf_div(num, den)
        secret = gf_add(secret, gf_mul(y_coords[i], li))
    return secret


# ---------------------------------------------------------------------------
# 2-of-3 sMPC Shard Model & Engine
# ---------------------------------------------------------------------------

class KeyShard:
    """Represents an individual SSS key shard assigned to a specific domain."""

    def __init__(self, index: int, data: bytes, domain: str = "GENERIC") -> None:
        if index <= 0 or index > 255:
            raise ValueError("Shard index must be in range 1..255")
        self.index = index
        self.data = data
        self.domain = domain  # "DEVICE_ENCLAVE", "TOR_RELAY", or "CLOUD_BACKUP"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "domain": self.domain,
            "shard_hex": self.data.hex(),
            "byte_len": len(self.data),
        }

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "KeyShard":
        return cls(
            index=payload["index"],
            data=bytes.fromhex(payload["shard_hex"]),
            domain=payload.get("domain", "GENERIC"),
        )


class ShamirThresholdEngine:
    """
    Cryptographically secure 2-of-3 Shamir's Secret Sharing threshold engine
    for distributed multi-party computation (sMPC).
    """

    SHARD_DOMAINS = [
        "LOCAL_DEVICE_ENCLAVE",
        "TOR_PEER_RELAY",
        "CLOUD_ENCRYPTED_BACKUP",
    ]

    @classmethod
    def split_secret(
        cls,
        secret: bytes,
        threshold: int = 2,
        num_shards: int = 3,
    ) -> List[KeyShard]:
        """
        Splits arbitrary-length secret bytes into `num_shards` independent shards.
        Requires any `threshold` shards to reconstruct.
        """
        if threshold > num_shards:
            raise ValueError("Threshold cannot exceed total number of shards.")
        if num_shards > 255:
            raise ValueError("Maximum 255 shards in GF(2^8).")
        if not secret:
            raise ValueError("Secret bytes cannot be empty.")

        secret_len = len(secret)
        # Allocate shard byte arrays
        shard_buffers = [bytearray(secret_len) for _ in range(num_shards)]

        # Byte-by-byte polynomial generation
        for byte_idx, secret_byte in enumerate(secret):
            # Polynomial f(x) = secret_byte + a1*x + a2*x^2 + ...
            # coefficients = [secret_byte, a1, a2, ...]
            poly = [secret_byte]
            for _ in range(threshold - 1):
                poly.append(secrets.randbelow(256))

            # Evaluate at x = 1, 2, ..., num_shards
            for shard_idx in range(num_shards):
                x = shard_idx + 1
                y = gf_eval_poly(poly, x)
                shard_buffers[shard_idx][byte_idx] = y

        shards = []
        for idx in range(num_shards):
            domain = cls.SHARD_DOMAINS[idx] if idx < len(cls.SHARD_DOMAINS) else f"SHARD_{idx+1}"
            shards.append(KeyShard(index=idx + 1, data=bytes(shard_buffers[idx]), domain=domain))

        logger.info(f"[sMPC] Generated {num_shards} shards with threshold {threshold} for {secret_len}-byte secret.")
        return shards

    @classmethod
    def reconstruct_secret(cls, shards: List[KeyShard], threshold: int = 2) -> bytearray:
        """
        Reconstructs secret from a quorum of at least `threshold` distinct shards.
        Returns a mutable `bytearray` in volatile RAM suitable for explicit zeroization.
        """
        if len(shards) < threshold:
            raise ValueError(f"Insufficient shards for quorum: provided {len(shards)}, required {threshold}")

        # Deduplicate shards by index
        unique_shards = {}
        for shard in shards:
            unique_shards[shard.index] = shard

        if len(unique_shards) < threshold:
            raise ValueError("Duplicate shard indices provided; insufficient unique shares.")

        # Take first `threshold` shards
        selected_shards = list(unique_shards.values())[:threshold]
        x_coords = [s.index for s in selected_shards]
        
        # Verify length consistency
        expected_len = len(selected_shards[0].data)
        for s in selected_shards:
            if len(s.data) != expected_len:
                raise ValueError("Shard length mismatch; corrupted shares.")

        reconstructed = bytearray(expected_len)

        for byte_idx in range(expected_len):
            y_coords = [s.data[byte_idx] for s in selected_shards]
            reconstructed[byte_idx] = gf_interpolate(x_coords, y_coords, x_target=0)

        return reconstructed

    @staticmethod
    def zeroize_buffer(buffer: bytearray) -> None:
        """Cryptographically sanitizes memory buffer in volatile RAM."""
        for i in range(len(buffer)):
            buffer[i] = 0


# Global Singleton Instance
smpc_engine = ShamirThresholdEngine()
