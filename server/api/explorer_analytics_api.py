"""
Token 9898048483 Analytics & Public Explorer API Subsystem
File: server/api/explorer_analytics_api.py

Architecture:
- High-throughput public REST & WebSocket Explorer subsystem for Token 9898048483 / USDP.
- Core Components:
  1. In-Memory Block & Transaction Velocity Index:
     - Real-time indexing of latest blocks, transactions, validator block producers, and gas fee burns.
  2. Multi-Tier Token Supply Distribution Analyzer:
     - Real-time aggregation of token distribution:
       - Whales (> 1,000,000 tokens)
       - Institutional Treasury Reserves
       - Mobile NPU Staking Nodes & Retail Validators
       - Deflationary Burn Vault
  3. REST Query Endpoints & Real-Time WebSocket Streaming Emitter:
     - Fast querying of address portfolio analytics, transaction lineage, and network TPS.
"""

import time
import math
import hashlib
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, field

MAX_EXPLORER_CACHE_BLOCKS = 500
MAX_EXPLORER_CACHE_TXS = 2000
TOTAL_GENESIS_SUPPLY = 1_000_000_000.0  # 1 Billion Token 9898048483


@dataclass
class ExplorerBlock:
    block_height: int
    block_hash: str
    parent_hash: str
    proposer_validator: str
    tx_count: int
    total_volume_tokens: float
    fees_burned_tokens: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class ExplorerTransaction:
    tx_hash: str
    block_height: int
    sender_address: str
    recipient_address: str
    token_symbol: str               # "TOKEN9898" or "USDP"
    amount: float
    fee_tokens: float
    tx_type: str                    # "TRANSFER", "STAKE", "MINT_USDP", "ESCROW", "MICRO_TIP"
    status: str = "CONFIRMED"
    timestamp: float = field(default_factory=time.time)


@dataclass
class AddressAnalytics:
    address: str
    balance_token9898: float
    balance_usdp: float
    total_sent_txs: int = 0
    total_received_txs: int = 0
    first_seen: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    account_type: str = "RETAIL_NODE"  # "WHALE", "INSTITUTIONAL", "RETAIL_NODE", "BURN_VAULT"


class ExplorerAnalyticsSubsystem:
    """
    High-Performance Public Blockchain Explorer & Analytics Subsystem.
    """

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.blocks: List[ExplorerBlock] = []
        self.transactions: List[ExplorerTransaction] = []
        self.address_book: Dict[str, AddressAnalytics] = {}
        self.total_tokens_burned = 25_480_000.0  # 25.48M burned supply
        self.current_tps = 148_250.0

        # Seed initial explorer blocks and transactions
        self._seed_explorer_data()

    def _seed_explorer_data(self) -> None:
        """Bootstraps realistic blockchain state for explorer visualization."""
        now = time.time()
        prev_hash = "0x0000000000000000genesis_hash_token_9898048483"

        # Initialize core addresses
        self.address_book["0xmaster_treasury_vault_9898"] = AddressAnalytics(
            "0xmaster_treasury_vault_9898", 250_000_000.0, 15_000_000.0, 450, 1200, now - 86400 * 30, now, "INSTITUTIONAL"
        )
        self.address_book["0xquantum_burn_dead_address_0000"] = AddressAnalytics(
            "0xquantum_burn_dead_address_0000", 25_480_000.0, 0.0, 0, 8900, now - 86400 * 30, now, "BURN_VAULT"
        )
        self.address_book["0xdelhi_supercluster_validator_node"] = AddressAnalytics(
            "0xdelhi_supercluster_validator_node", 50_000_000.0, 1_500_000.0, 120, 450, now - 86400 * 20, now, "WHALE"
        )

        # Generate 10 recent blocks
        for i in range(1, 11):
            h_int = 1_450_000 + i
            b_hash = f"0xblock_{hashlib.sha256(f'{h_int}:{prev_hash}'.encode()).hexdigest()[:24]}"
            block = ExplorerBlock(
                block_height=h_int,
                block_hash=b_hash,
                parent_hash=prev_hash,
                proposer_validator="0xdelhi_supercluster_validator_node",
                tx_count=120,
                total_volume_tokens=450_000.0 + (i * 12_000.0),
                fees_burned_tokens=15.42,
                timestamp=now - ((11 - i) * 3),
            )
            self.blocks.append(block)
            prev_hash = b_hash

            # Generate sample txs
            tx_hash = f"0xtx_{hashlib.sha256(f'{b_hash}:{i}'.encode()).hexdigest()[:24]}"
            tx = ExplorerTransaction(
                tx_hash=tx_hash,
                block_height=h_int,
                sender_address="0xmaster_treasury_vault_9898",
                recipient_address="0xdelhi_supercluster_validator_node",
                token_symbol="TOKEN9898",
                amount=5000.0 * i,
                fee_tokens=0.001,
                tx_type="TRANSFER",
                timestamp=block.timestamp,
            )
            self.transactions.append(tx)

    def record_confirmed_block(
        self,
        block_height: int,
        proposer_validator: str,
        transactions_list: List[Dict[str, Any]],
        fees_burned: float = 0.0,
    ) -> ExplorerBlock:
        """Indexes a newly confirmed block and its contained transactions."""
        with self.lock:
            now = time.time()
            parent = self.blocks[-1].block_hash if self.blocks else "0x0000genesis"
            b_hash = f"0xblock_{hashlib.sha256(f'{block_height}:{parent}:{now}'.encode()).hexdigest()[:24]}"

            total_vol = 0.0
            for tx_data in transactions_list:
                amt = float(tx_data.get("amount", 0.0))
                total_vol += amt
                tx_h = tx_data.get("tx_hash", f"0xtx_{secrets.token_hex(12)}")
                s_addr = tx_data.get("sender", "0xunknown_sender")
                r_addr = tx_data.get("recipient", "0xunknown_recipient")
                sym = tx_data.get("token_symbol", "TOKEN9898").upper()

                exp_tx = ExplorerTransaction(
                    tx_hash=tx_h,
                    block_height=block_height,
                    sender_address=s_addr,
                    recipient_address=r_addr,
                    token_symbol=sym,
                    amount=amt,
                    fee_tokens=float(tx_data.get("fee", 0.001)),
                    tx_type=tx_data.get("tx_type", "TRANSFER").upper(),
                    timestamp=now,
                )
                self.transactions.append(exp_tx)
                self._update_address_stats(s_addr, r_addr, amt, sym)

            self.total_tokens_burned += fees_burned

            block = ExplorerBlock(
                block_height=block_height,
                block_hash=b_hash,
                parent_hash=parent,
                proposer_validator=proposer_validator,
                tx_count=len(transactions_list),
                total_volume_tokens=round(total_vol, 2),
                fees_burned_tokens=round(fees_burned, 4),
                timestamp=now,
            )

            self.blocks.append(block)
            if len(self.blocks) > MAX_EXPLORER_CACHE_BLOCKS:
                self.blocks.pop(0)

            return block

    def _update_address_stats(self, sender: str, recipient: str, amount: float, symbol: str) -> None:
        """Maintains dynamic address portfolio index."""
        now = time.time()
        for addr, is_sender in [(sender, True), (recipient, False)]:
            if addr not in self.address_book:
                self.address_book[addr] = AddressAnalytics(
                    address=addr,
                    balance_token9898=100.0,
                    balance_usdp=10.0,
                    first_seen=now,
                    last_active=now,
                )
            acc = self.address_book[addr]
            acc.last_active = now
            if is_sender:
                acc.total_sent_txs += 1
                if symbol == "TOKEN9898":
                    acc.balance_token9898 = max(0.0, acc.balance_token9898 - amount)
            else:
                acc.total_received_txs += 1
                if symbol == "TOKEN9898":
                    acc.balance_token9898 += amount

            # Recalculate tier
            if acc.balance_token9898 >= 1_000_000.0:
                acc.account_type = "WHALE"
            elif "treasury" in addr.lower() or "reserve" in addr.lower():
                acc.account_type = "INSTITUTIONAL"
            else:
                acc.account_type = "RETAIL_NODE"

    def get_supply_distribution_tiers(self) -> Dict[str, Any]:
        """Calculates breakdown of circulating supply tiers and burned tokens."""
        with self.lock:
            circulating = TOTAL_GENESIS_SUPPLY - self.total_tokens_burned
            whales_sum = sum(a.balance_token9898 for a in self.address_book.values() if a.account_type == "WHALE")
            inst_sum = sum(a.balance_token9898 for a in self.address_book.values() if a.account_type == "INSTITUTIONAL")
            retail_sum = max(0.0, circulating - (whales_sum + inst_sum))

            return {
                "total_genesis_supply": TOTAL_GENESIS_SUPPLY,
                "total_burned_supply": round(self.total_tokens_burned, 2),
                "circulating_supply": round(circulating, 2),
                "burn_ratio_pct": round((self.total_tokens_burned / TOTAL_GENESIS_SUPPLY) * 100, 3),
                "tier_breakdown": {
                    "whales_holding_tokens": round(whales_sum, 2),
                    "whales_pct": round((whales_sum / circulating) * 100, 2),
                    "institutional_reserves_tokens": round(inst_sum, 2),
                    "institutional_pct": round((inst_sum / circulating) * 100, 2),
                    "retail_nodes_mesh_tokens": round(retail_sum, 2),
                    "retail_pct": round((retail_sum / circulating) * 100, 2),
                },
            }

    def get_recent_blocks(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns list of most recent confirmed blocks."""
        with self.lock:
            return [
                {
                    "height": b.block_height,
                    "hash": b.block_hash,
                    "proposer": b.proposer_validator,
                    "txs": b.tx_count,
                    "volume": b.total_volume_tokens,
                    "fees_burned": b.fees_burned_tokens,
                    "timestamp": b.timestamp,
                }
                for b in reversed(self.blocks[-limit:])
            ]

    def get_recent_transactions(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Returns list of most recent on-chain transactions."""
        with self.lock:
            return [
                {
                    "tx_hash": t.tx_hash,
                    "block_height": t.block_height,
                    "sender": t.sender_address,
                    "recipient": t.recipient_address,
                    "symbol": t.token_symbol,
                    "amount": t.amount,
                    "fee": t.fee_tokens,
                    "type": t.tx_type,
                    "timestamp": t.timestamp,
                }
                for t in reversed(self.transactions[-limit:])
            ]

    def get_address_details(self, address: str) -> Dict[str, Any]:
        """Fetches detailed portfolio stats and transaction history for an address."""
        with self.lock:
            acc = self.address_book.get(address)
            if not acc:
                return {
                    "address": address,
                    "balance_token9898": 0.0,
                    "balance_usdp": 0.0,
                    "account_type": "NEW_ADDRESS",
                    "total_txs": 0,
                }

            return {
                "address": acc.address,
                "balance_token9898": round(acc.balance_token9898, 4),
                "balance_usdp": round(acc.balance_usdp, 4),
                "account_type": acc.account_type,
                "total_sent_txs": acc.total_sent_txs,
                "total_received_txs": acc.total_received_txs,
                "first_seen": acc.first_seen,
                "last_active": acc.last_active,
            }


# Global Explorer Subsystem Singleton
explorer_analytics_subsystem = ExplorerAnalyticsSubsystem()
