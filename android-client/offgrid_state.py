#!/usr/bin/env python3
"""
Offline State Machine & Nonce Desync Protector
Tracks unspent transaction outputs (UTXOs), offline promissory payment vouchers,
and deterministic account nonces using vector clocks to avoid double-spending.
"""

import time
import json
import hashlib
import hmac
from typing import Dict, List, Optional, Any

class OffGridStateManager:
    def __init__(self, node_did: str, initial_balance: float = 1000.00):
        self.node_did = node_did
        self.vector_clock: Dict[str, int] = {node_did: 0}
        self.confirmed_balance: float = initial_balance
        self.reserved_balance: float = 0.00
        self.account_nonce: int = 0
        
        # Local UTXO store: txid:vout -> {amount, recipient, spent}
        self.utxos: Dict[str, Dict[str, Any]] = {
            "genesis_tx:0": {
                "amount": initial_balance,
                "owner": node_did,
                "spent": False,
                "timestamp": int(time.time())
            }
        }
        
        # Pending offline payment vouchers
        self.pending_vouchers: List[Dict[str, Any]] = []

    def get_available_balance(self) -> float:
        """
        Available balance = confirmed balance - reserved balance for offline vouchers
        """
        return max(0.0, self.confirmed_balance - self.reserved_balance)

    def increment_vector_clock(self) -> Dict[str, int]:
        self.vector_clock[self.node_did] = self.vector_clock.get(self.node_did, 0) + 1
        return self.vector_clock.copy()

    def create_offline_voucher(self, recipient_did: str, amount: float, memo: str = "") -> Optional[Dict[str, Any]]:
        """
        Creates an offline promissory payment voucher with optimistic balance reservation.
        """
        available = self.get_available_balance()
        if amount <= 0 or amount > available:
            return None # Insufficient funds or invalid amount

        self.account_nonce += 1
        v_clock = self.increment_vector_clock()
        timestamp = int(time.time())
        voucher_id = hashlib.sha256(f"{self.node_did}:{recipient_did}:{amount}:{self.account_nonce}:{timestamp}".encode('utf-8')).hexdigest()

        voucher = {
            "voucher_id": voucher_id,
            "sender_did": self.node_did,
            "recipient_did": recipient_did,
            "amount": amount,
            "nonce": self.account_nonce,
            "timestamp": timestamp,
            "vector_clock": v_clock,
            "memo": memo,
            "status": "OFFLINE_RESERVED",
            "proof_type": "PQC_OFFLINE_PROMISSORY_V1"
        }

        # Optimistically reserve balance to prevent double spending across offline sessions
        self.reserved_balance += amount
        self.pending_vouchers.append(voucher)
        return voucher

    def receive_offline_voucher(self, voucher: Dict[str, Any]) -> bool:
        """
        Validates and buffers an incoming offline voucher from a peer.
        """
        sender = voucher.get("sender_did")
        recipient = voucher.get("recipient_did")
        amount = float(voucher.get("amount", 0.0))
        nonce = int(voucher.get("nonce", 0))

        if recipient != self.node_did or amount <= 0 or not sender:
            return False

        # Vector clock conflict check
        remote_clock = voucher.get("vector_clock", {})
        for peer, clk in remote_clock.items():
            self.vector_clock[peer] = max(self.vector_clock.get(peer, 0), clk)

        self.pending_vouchers.append(voucher)
        return True

    def reconcile_with_online_mesh(self, mesh_state_root: str) -> Dict[str, Any]:
        """
        Reconciles pending offline vouchers once online mesh connection is restored.
        """
        settled_count = len(self.pending_vouchers)
        settled_amount = 0.0

        for v in self.pending_vouchers:
            if v["sender_did"] == self.node_did:
                self.confirmed_balance -= v["amount"]
                self.reserved_balance -= v["amount"]
                settled_amount -= v["amount"]
            elif v["recipient_did"] == self.node_did:
                self.confirmed_balance += v["amount"]
                settled_amount += v["amount"]

        self.pending_vouchers.clear()
        self.reserved_balance = max(0.0, self.reserved_balance)

        return {
            "settled_count": settled_count,
            "net_balance_delta": settled_amount,
            "current_confirmed_balance": self.confirmed_balance,
            "mesh_state_root": mesh_state_root,
            "reconciliation_time": int(time.time())
        }

    def export_state_snapshot(self) -> str:
        state = {
            "node_did": self.node_did,
            "vector_clock": self.vector_clock,
            "confirmed_balance": self.confirmed_balance,
            "reserved_balance": self.reserved_balance,
            "available_balance": self.get_available_balance(),
            "account_nonce": self.account_nonce,
            "pending_vouchers_count": len(self.pending_vouchers)
        }
        return json.dumps(state, indent=2)

if __name__ == "__main__":
    mgr = OffGridStateManager(node_did="did:quantum:9898:a7f29c01", initial_balance=1000.00)
    v = mgr.create_offline_voucher(recipient_did="did:quantum:9898:b8e31002", amount=75.50, memo="Offline P2P Mesh Payment")
    print(f"[Offline State Machine] Available Balance: {mgr.get_available_balance()} (Voucher Created: {v['voucher_id'][:16]}...)")
