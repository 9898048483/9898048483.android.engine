"""
Anti-Double-Spend & Sequence Nonce Validator
File: server/crypto/nonce_validator.py

Architecture:
- Prevents transaction replay attacks and double-spending across peer-to-peer and ledger transactions.
- Monotonic Per-Wallet Nonce Tracking: Enforces strictly sequential transaction numbers (N, N+1, N+2).
- Cryptographic Timestamp Drift Window: Enforces allowable drift (+-300 seconds) against consensus clock.
- High-Performance In-Memory Bloom Filter: Fast O(1) duplicate transaction hash screening before block commitment.
- Strict In-Memory Seen Transaction Cache: Exact cryptographic collision confirmation.
"""

import time
import math
import hashlib
import threading
import logging
from typing import Dict, Any, Optional, Tuple, Set

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NonceValidator")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300.0  # 5 minutes drift window
BLOOM_FILTER_SIZE_BITS = 1_000_000           # 1M bit array (~122 KB)
BLOOM_FILTER_HASH_FUNCTIONS = 5


class BloomFilter:
    """
    High-speed in-memory Bloom filter for O(1) probabilistic set membership
    with low false-positive probability.
    """

    def __init__(self, size_bits: int = BLOOM_FILTER_SIZE_BITS, num_hashes: int = BLOOM_FILTER_HASH_FUNCTIONS) -> None:
        self.size_bits = size_bits
        self.num_hashes = num_hashes
        self.bit_array = bytearray(math.ceil(size_bits / 8))
        self.element_count = 0

    def _get_hashes(self, item: str) -> list[int]:
        """Generates k distinct bit positions using SHA-256 and MD5 hash expansion."""
        raw_bytes = item.encode("utf-8")
        h1 = int(hashlib.sha256(raw_bytes).hexdigest()[:16], 16)
        h2 = int(hashlib.md5(raw_bytes).hexdigest()[:16], 16)

        positions = []
        for i in range(self.num_hashes):
            # Kirsch-Mitzenmacher optimization: gi(x) = h1(x) + i * h2(x) mod m
            pos = (h1 + i * h2) % self.size_bits
            positions.append(pos)
        return positions

    def add(self, item: str) -> None:
        """Adds an item to the Bloom filter."""
        for pos in self._get_hashes(item):
            byte_idx = pos // 8
            bit_idx = pos % 8
            self.bit_array[byte_idx] |= (1 << bit_idx)
        self.element_count += 1

    def contains(self, item: str) -> bool:
        """Checks if an item might be in the set (False positive possible, False negative impossible)."""
        for pos in self._get_hashes(item):
            byte_idx = pos // 8
            bit_idx = pos % 8
            if not (self.bit_array[byte_idx] & (1 << bit_idx)):
                return False
        return True


class NonceValidator:
    """
    Distributed Consensus Nonce & Anti-Double-Spend Validator Engine.
    """

    def __init__(
        self,
        timestamp_tolerance_seconds: float = DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
    ) -> None:
        self.timestamp_tolerance = timestamp_tolerance_seconds
        self.bloom_filter = BloomFilter()
        
        # Per-wallet highest confirmed monotonic nonce: wallet_address -> int
        self.wallet_nonces: Dict[str, int] = {}
        
        # Exact transaction hash storage: tx_hash -> timestamp
        self.seen_transactions: Dict[str, float] = {}

        # Pending unconfirmed transaction nonces for mempool protection
        self.pending_nonces: Dict[str, Set[int]] = {}

        self.lock = threading.RLock()

    def get_next_expected_nonce(self, wallet_address: str) -> int:
        """Returns the next expected monotonic sequence nonce for a given wallet."""
        with self.lock:
            current_nonce = self.wallet_nonces.get(wallet_address, 0)
            return current_nonce + 1

    def validate_transaction_envelope(
        self,
        tx_hash: str,
        from_wallet: str,
        nonce: int,
        timestamp: float,
        current_time: Optional[float] = None,
    ) -> Tuple[bool, str]:
        """
        Validates transaction against double-spend, replay, and sequence rules.
        
        Verification Steps:
        1. Timestamp drift check within allowable window (+-300s).
        2. Fast Bloom filter check for previous tx_hash ingestion.
        3. Exact cache lookup for duplicate tx_hash (anti-replay).
        4. Monotonic nonce check: nonce MUST be strictly equal to expected next nonce (or in valid sequence).
        """
        if current_time is None:
            current_time = time.time()

        with self.lock:
            # 1. Cryptographic Timestamp Window
            drift = abs(current_time - timestamp)
            if drift > self.timestamp_tolerance:
                err_msg = (
                    f"Timestamp drift rejection: tx_timestamp={timestamp:.2f}, "
                    f"consensus_time={current_time:.2f}, drift={drift:.2f}s "
                    f"(max allowed: {self.timestamp_tolerance}s)"
                )
                logger.warning(f"[Anti-Replay] {err_msg}")
                return False, err_msg

            # 2. Bloom Filter Quick Rejection & Exact Hash Lookup
            if self.bloom_filter.contains(tx_hash):
                if tx_hash in self.seen_transactions:
                    err_msg = f"Double-spend detected: Transaction hash {tx_hash} has already been executed."
                    logger.warning(f"[Anti-Double-Spend] {err_msg}")
                    return False, err_msg

            # 3. Monotonic Nonce Sequence Validation
            expected_nonce = self.get_next_expected_nonce(from_wallet)
            if nonce < expected_nonce:
                err_msg = (
                    f"Nonce replay rejection for {from_wallet[:12]}...: "
                    f"submitted nonce={nonce}, already confirmed={expected_nonce - 1}"
                )
                logger.warning(f"[Nonce Replay] {err_msg}")
                return False, err_msg

            if nonce > expected_nonce:
                err_msg = (
                    f"Nonce gap rejection for {from_wallet[:12]}...: "
                    f"submitted nonce={nonce}, expected sequence={expected_nonce}"
                )
                logger.warning(f"[Nonce Gap] {err_msg}")
                return False, err_msg

            # 4. Mempool Pending Conflict Check
            if from_wallet in self.pending_nonces and nonce in self.pending_nonces[from_wallet]:
                err_msg = f"Mempool conflict: Nonce {nonce} is already pending for wallet {from_wallet[:12]}..."
                logger.warning(f"[Mempool Nonce] {err_msg}")
                return False, err_msg

            return True, "Transaction envelope passed anti-double-spend and nonce validation."

    def commit_transaction(
        self,
        tx_hash: str,
        from_wallet: str,
        nonce: int,
        timestamp: float,
    ) -> bool:
        """
        Commits validated transaction to permanent seen state, updates Bloom filter,
        and increments the monotonic wallet sequence counter.
        """
        with self.lock:
            # Re-verify before commit
            valid, reason = self.validate_transaction_envelope(tx_hash, from_wallet, nonce, timestamp)
            if not valid:
                logger.error(f"[Commit Failed] {reason}")
                return False

            # Update Bloom filter and exact dictionary
            self.bloom_filter.add(tx_hash)
            self.seen_transactions[tx_hash] = timestamp

            # Advance wallet nonce
            self.wallet_nonces[from_wallet] = nonce

            # Clear any pending record
            if from_wallet in self.pending_nonces and nonce in self.pending_nonces[from_wallet]:
                self.pending_nonces[from_wallet].remove(nonce)

            logger.info(
                f"[Nonce Committed] Wallet: {from_wallet[:12]}... | Nonce: {nonce} | TxHash: {tx_hash[:16]}..."
            )
            return True

    def track_pending_nonce(self, from_wallet: str, nonce: int) -> None:
        """Registers a pending nonce in the local mempool."""
        with self.lock:
            if from_wallet not in self.pending_nonces:
                self.pending_nonces[from_wallet] = set()
            self.pending_nonces[from_wallet].add(nonce)

    def release_pending_nonce(self, from_wallet: str, nonce: int) -> None:
        """Releases a dropped or failed pending nonce."""
        with self.lock:
            if from_wallet in self.pending_nonces:
                self.pending_nonces[from_wallet].discard(nonce)

    def get_stats(self) -> Dict[str, Any]:
        """Returns runtime consensus nonce statistics."""
        with self.lock:
            return {
                "total_seen_transactions": len(self.seen_transactions),
                "bloom_filter_elements": self.bloom_filter.element_count,
                "tracked_wallets_count": len(self.wallet_nonces),
                "timestamp_tolerance_seconds": self.timestamp_tolerance,
            }


# Global Singleton Instance
nonce_validator = NonceValidator()
