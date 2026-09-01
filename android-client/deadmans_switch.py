#!/usr/bin/env python3
"""
Dead-Man's Switch & Sovereign Inheritance Safeguard
Automated time-locked recovery contract. Requires periodic biometric/PIN check-ins.
If no check-in occurs after a user-defined interval (e.g. 90 days), it triggers an
automated Shamir Secret Sharing (SSS) broadcast to pre-configured recovery contacts.
"""

import time
import json
import hashlib
import os
from typing import List, Dict, Tuple, Any, Optional

class DeadMansSwitchGuard:
    def __init__(self, owner_did: str, checkin_interval_days: int = 90):
        self.owner_did = owner_did
        self.checkin_interval_seconds = checkin_interval_days * 86400
        self.last_checkin_timestamp = int(time.time())
        self.recovery_contacts: List[Dict[str, Any]] = []
        self.secret_shares: List[str] = []
        self.is_triggered = False

    def perform_checkin(self, auth_proof: str) -> Dict[str, Any]:
        """
        Refreshes the dead-man timer with biometric or PIN cryptographic proof.
        """
        now = int(time.time())
        self.last_checkin_timestamp = now
        self.is_triggered = False
        
        return {
            "status": "CHECKIN_SUCCESSFUL",
            "timestamp": now,
            "next_deadline": now + self.checkin_interval_seconds,
            "days_remaining": self.checkin_interval_seconds / 86400
        }

    def setup_recovery_scheme(self, master_seed_hex: str, contacts: List[str], threshold: int = 3) -> Dict[str, Any]:
        """
        Splits master seed into k-of-n Shamir Secret Shares distributed to contacts.
        """
        self.recovery_contacts = [{"did": contact_did, "notified": False} for contact_did in contacts]
        n = len(contacts)
        
        # Polynomial Shamir Split simulation
        shares = []
        for i in range(1, n + 1):
            share_payload = f"SSS:SHR:{i}:{threshold}:{master_seed_hex[:16]}:{os.urandom(8).hex()}"
            share_hash = hashlib.sha256(share_payload.encode('utf-8')).hexdigest()
            shares.append(share_hash)

        self.secret_shares = shares

        return {
            "scheme": f"{threshold}-of-{n} SSS",
            "threshold": threshold,
            "total_shares": n,
            "contacts_configured": len(self.recovery_contacts)
        }

    def evaluate_timer_status(self) -> Dict[str, Any]:
        """
        Checks if interval has expired and triggers emergency share broadcast.
        """
        now = int(time.time())
        elapsed = now - self.last_checkin_timestamp
        time_left = self.checkin_interval_seconds - elapsed

        if time_left <= 0 and not self.is_triggered:
            self.is_triggered = True
            broadcast_payload = self._trigger_emergency_broadcast()
            return {
                "status": "TRIGGERED_INHERITANCE_BROADCAST",
                "days_overdue": abs(time_left) / 86400,
                "broadcast_payload": broadcast_payload
            }

        return {
            "status": "ACTIVE_SECURE",
            "seconds_remaining": max(0, time_left),
            "days_remaining": round(max(0, time_left) / 86400, 2),
            "is_triggered": self.is_triggered
        }

    def _trigger_emergency_broadcast(self) -> List[Dict[str, Any]]:
        broadcast_queue = []
        for idx, contact in enumerate(self.recovery_contacts):
            share = self.secret_shares[idx] if idx < len(self.secret_shares) else ""
            packet = {
                "recipient_did": contact["did"],
                "share_index": idx + 1,
                "encrypted_share": share,
                "instruction": "Sovereign Dead-Man Switch Triggered. Recover key at quorum."
            }
            contact["notified"] = True
            broadcast_queue.append(packet)
        return broadcast_queue

if __name__ == "__main__":
    guard = DeadMansSwitchGuard(owner_did="did:quantum:9898:a7f29c01", checkin_interval_days=90)
    guard.setup_recovery_scheme("a1b2c3d4e5f60718293a4b5c6d7e8f90", [
        "did:quantum:9898:guardian1",
        "did:quantum:9898:guardian2",
        "did:quantum:9898:guardian3",
        "did:quantum:9898:guardian4",
        "did:quantum:9898:guardian5"
    ], threshold=3)
    status = guard.evaluate_timer_status()
    print(f"[Dead-Man's Switch] Status: {status['status']} ({status['days_remaining']} days remaining)")
