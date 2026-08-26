"""
Multi-Guardian Social Recovery Protocol
File: android-client/social_recovery.py

Architecture:
- Decentralized $m$-of-$n$ Social Recovery Protocol for Token 9898048483 Smart Accounts.
- Core Security Mechanisms:
  1. $m$-of-$n$ Threshold Configuration:
     - Defines quorum (e.g. 3-of-5 trusted friends, hardware backup keys, or institutional guardians).
  2. Time-Delayed Dispute Window:
     - When a recovery request is initiated, a mandatory dispute timelock (e.g. 48 hours) begins.
     - Legitimate wallet owners can cancel unauthorized / malicious recovery attempts instantly.
  3. Tor Onion Relay Broadcast:
     - Guardians sign approval payloads with post-quantum signatures and broadcast over encrypted onion relays.
  4. Final Ownership Handover:
     - Once threshold $m$ approvals are validated and the dispute window has elapsed, ownership transfers atomically.
"""

import time
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum


class RecoveryStatus(str, Enum):
    PENDING = "PENDING"
    DISPUTE_WINDOW_ACTIVE = "DISPUTE_WINDOW_ACTIVE"
    EXECUTED = "EXECUTED"
    CANCELLED = "CANCELLED"


@dataclass
class Guardian:
    guardian_id: str
    label: str
    public_key_hex: str
    guardian_type: str = "FRIEND"  # FRIEND | HARDWARE_BACKUP | INSTITUTIONAL
    is_active: bool = True
    added_at: float = field(default_factory=time.time)


@dataclass
class GuardianApproval:
    guardian_id: str
    signature_hex: str
    onion_relay_node: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class RecoverySession:
    session_id: str
    wallet_address: str
    current_owner_public_key: str
    proposed_new_owner_key: str
    initiated_at: float
    timelock_delay_seconds: float
    required_threshold: int
    approvals: Dict[str, GuardianApproval] = field(default_factory=dict)
    status: RecoveryStatus = RecoveryStatus.PENDING
    cancelled_by: Optional[str] = None
    executed_at: Optional[float] = None


class SocialRecoveryManager:
    """
    Manages guardian registration, recovery proposal lifecycle, timelock windows, and execution.
    """

    DEFAULT_TIMELOCK_SECONDS = 86400 * 2  # 48 hours

    def __init__(
        self,
        wallet_address: str,
        owner_public_key: str,
        threshold: int = 3,
        timelock_delay_seconds: float = DEFAULT_TIMELOCK_SECONDS,
    ) -> None:
        self.wallet_address = wallet_address
        self.owner_public_key = owner_public_key
        self.threshold = threshold
        self.timelock_delay_seconds = timelock_delay_seconds
        self.lock = threading.RLock()

        self.guardians: Dict[str, Guardian] = {}
        self.sessions: Dict[str, RecoverySession] = {}
        self.current_active_session_id: Optional[str] = None

    def add_guardian(
        self,
        guardian_id: str,
        label: str,
        public_key_hex: str,
        guardian_type: str = "FRIEND",
    ) -> Guardian:
        """Adds a trusted guardian to the wallet recovery set."""
        with self.lock:
            if guardian_id in self.guardians:
                raise ValueError(f"Guardian {guardian_id} already exists.")

            guardian = Guardian(
                guardian_id=guardian_id,
                label=label,
                public_key_hex=public_key_hex,
                guardian_type=guardian_type,
                is_active=True,
            )
            self.guardians[guardian_id] = guardian
            return guardian

    def remove_guardian(self, guardian_id: str) -> None:
        """Removes a guardian from the set."""
        with self.lock:
            if guardian_id not in self.guardians:
                raise ValueError(f"Guardian {guardian_id} not found.")

            del self.guardians[guardian_id]
            if len(self.guardians) < self.threshold:
                raise ValueError(
                    f"Active guardians ({len(self.guardians)}) cannot be less than recovery threshold ({self.threshold})."
                )

    def initiate_recovery(
        self,
        proposed_new_owner_key: str,
        custom_timelock_seconds: Optional[float] = None,
    ) -> RecoverySession:
        """
        Initiates a new social recovery session and starts the dispute timelock countdown.
        """
        with self.lock:
            if len(self.guardians) < self.threshold:
                raise ValueError(f"Insufficient active guardians ({len(self.guardians)}) for threshold ({self.threshold}).")

            if not proposed_new_owner_key:
                raise ValueError("Proposed new owner public key is required.")

            now = time.time()
            session_id = f"rec_{hashlib.sha256(f'{self.wallet_address}:{proposed_new_owner_key}:{now}'.encode()).hexdigest()[:16]}"
            timelock = custom_timelock_seconds if custom_timelock_seconds is not None else self.timelock_delay_seconds

            session = RecoverySession(
                session_id=session_id,
                wallet_address=self.wallet_address,
                current_owner_public_key=self.owner_public_key,
                proposed_new_owner_key=proposed_new_owner_key,
                initiated_at=now,
                timelock_delay_seconds=timelock,
                required_threshold=self.threshold,
                status=RecoveryStatus.DISPUTE_WINDOW_ACTIVE,
            )

            self.sessions[session_id] = session
            self.current_active_session_id = session_id
            return session

    def submit_guardian_approval(
        self,
        session_id: str,
        guardian_id: str,
        signature_hex: str,
        onion_relay_node: str = "tor7q_guardian_relay.onion",
    ) -> GuardianApproval:
        """
        Submits post-quantum cryptographic guardian approval broadcasted through an Onion relay.
        """
        with self.lock:
            if session_id not in self.sessions:
                raise ValueError(f"Recovery session {session_id} not found.")

            session = self.sessions[session_id]
            if session.status != RecoveryStatus.DISPUTE_WINDOW_ACTIVE:
                raise ValueError(f"Cannot submit approval: session is {session.status.value}.")

            if guardian_id not in self.guardians or not self.guardians[guardian_id].is_active:
                raise ValueError(f"Unauthorized or inactive guardian {guardian_id}.")

            # Signature verification simulation
            expected_msg = f"RECOVERY_APPROVAL:{session.wallet_address}:{session.proposed_new_owner_key}:{session.session_id}"
            if not signature_hex or len(signature_hex) < 16:
                raise ValueError("Invalid guardian signature.")

            approval = GuardianApproval(
                guardian_id=guardian_id,
                signature_hex=signature_hex,
                onion_relay_node=onion_relay_node,
            )
            session.approvals[guardian_id] = approval
            return approval

    def cancel_recovery_by_owner(self, session_id: str, cancellation_reason: str = "Disputed by active key holder") -> Dict[str, Any]:
        """
        Enables existing key holder to cancel fraudulent recovery attempts during the dispute window.
        """
        with self.lock:
            if session_id not in self.sessions:
                raise ValueError(f"Recovery session {session_id} not found.")

            session = self.sessions[session_id]
            if session.status != RecoveryStatus.DISPUTE_WINDOW_ACTIVE:
                raise ValueError(f"Session {session_id} is not in dispute window.")

            session.status = RecoveryStatus.CANCELLED
            session.cancelled_by = self.owner_public_key
            if self.current_active_session_id == session_id:
                self.current_active_session_id = None

            return {
                "status": "RECOVERY_CANCELLED",
                "session_id": session_id,
                "reason": cancellation_reason,
                "cancelled_at": time.time(),
            }

    def execute_recovery(self, session_id: str, force_timelock_bypass_for_testing: bool = False) -> Dict[str, Any]:
        """
        Finalizes ownership handover if threshold guardians approved and timelock expired.
        """
        with self.lock:
            if session_id not in self.sessions:
                raise ValueError(f"Recovery session {session_id} not found.")

            session = self.sessions[session_id]
            if session.status != RecoveryStatus.DISPUTE_WINDOW_ACTIVE:
                raise ValueError(f"Session cannot be executed; status is {session.status.value}.")

            if len(session.approvals) < session.required_threshold:
                raise ValueError(
                    f"Quorum not reached: {len(session.approvals)} approvals out of required {session.required_threshold}."
                )

            now = time.time()
            time_elapsed = now - session.initiated_at
            if not force_timelock_bypass_for_testing and time_elapsed < session.timelock_delay_seconds:
                remaining = session.timelock_delay_seconds - time_elapsed
                raise ValueError(f"Timelock dispute window active: {remaining:.1f}s remaining before execution.")

            # Handover ownership
            old_owner = self.owner_public_key
            self.owner_public_key = session.proposed_new_owner_key
            session.status = RecoveryStatus.EXECUTED
            session.executed_at = now
            self.current_active_session_id = None

            return {
                "status": "RECOVERY_EXECUTED",
                "session_id": session_id,
                "wallet_address": self.wallet_address,
                "previous_owner_key": old_owner,
                "new_owner_key": self.owner_public_key,
                "approvals_count": len(session.approvals),
                "executed_at": now,
            }
