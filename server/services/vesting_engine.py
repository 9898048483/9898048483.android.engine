"""
Token Vesting & Linear Escrow Schedule Engine
File: server/services/vesting_engine.py

Architecture:
- Continuous linear & cliff vesting schedule manager for core contributors, ecosystem grants, and liquidity partners.
- Vesting Schedule Parameters:
  - Total allocated tokens.
  - Start epoch, Cliff duration (seconds), and Total Vesting duration (seconds).
  - Continuous per-second linear unlocked balance calculation.
- Contract Permissions & Governance:
  - Revocable vs Non-revocable vesting contracts.
  - Early termination accounting: returns unvested token balance to Master Vault Treasury / 51% reserve pool while allowing beneficiary to claim vested amount up to termination time.
- Integrated with MasterVaultLedgerEngine for verified release receipts.
"""

import time
import math
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class VestingCategory(str, Enum):
    CORE_CONTRIBUTOR = "CORE_CONTRIBUTOR"
    ECOSYSTEM_GRANT = "ECOSYSTEM_GRANT"
    INSTITUTIONAL_LIQUIDITY = "INSTITUTIONAL_LIQUIDITY"
    COMMUNITY_AIRDROP = "COMMUNITY_AIRDROP"


class ScheduleStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    REVOKED = "REVOKED"


@dataclass
class VestingSchedule:
    schedule_id: str
    beneficiary_address: str
    category: VestingCategory
    total_allocation: float
    start_time: float
    cliff_duration_seconds: float
    vesting_duration_seconds: float
    is_revocable: bool
    status: ScheduleStatus = ScheduleStatus.ACTIVE
    released_amount: float = 0.0
    revoked_at: Optional[float] = None
    unvested_returned_to_treasury: float = 0.0
    created_at: float = field(default_factory=time.time)


@dataclass
class VestingClaimReceipt:
    claim_id: str
    schedule_id: str
    beneficiary_address: str
    amount_claimed: float
    total_claimed_to_date: float
    remaining_locked: float
    tx_hash: str
    timestamp: float


class TokenVestingEngine:
    """
    Manages continuous linear token vesting schedules, cliff periods,
    and revocable escrow contracts.
    """

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.schedules: Dict[str, VestingSchedule] = {}
        self.claim_history: List[VestingClaimReceipt] = []

    def create_vesting_schedule(
        self,
        beneficiary_address: str,
        total_allocation: float,
        category: VestingCategory,
        cliff_duration_seconds: float,
        vesting_duration_seconds: float,
        is_revocable: bool = False,
        start_time: Optional[float] = None,
    ) -> VestingSchedule:
        """
        Initializes a new linear vesting schedule with optional cliff delay.
        """
        with self.lock:
            if total_allocation <= 0:
                raise ValueError("Vesting allocation must be positive.")
            if vesting_duration_seconds <= 0:
                raise ValueError("Vesting duration must be greater than zero.")
            if cliff_duration_seconds > vesting_duration_seconds:
                raise ValueError("Cliff duration cannot exceed total vesting duration.")

            now = time.time()
            effective_start = start_time if start_time is not None else now

            raw_id = f"{beneficiary_address}:{total_allocation}:{effective_start}:{category.value}".encode('utf-8')
            schedule_id = f"vest_sch_{hashlib.sha256(raw_id).hexdigest()[:16]}"

            schedule = VestingSchedule(
                schedule_id=schedule_id,
                beneficiary_address=beneficiary_address,
                category=category,
                total_allocation=total_allocation,
                start_time=effective_start,
                cliff_duration_seconds=cliff_duration_seconds,
                vesting_duration_seconds=vesting_duration_seconds,
                is_revocable=is_revocable,
                status=ScheduleStatus.ACTIVE,
                released_amount=0.0,
                created_at=now,
            )

            self.schedules[schedule_id] = schedule
            return schedule

    def compute_vested_amount(self, schedule_id: str, current_time: Optional[float] = None) -> float:
        """
        Calculates the cumulative amount of tokens vested up to `current_time`.
        """
        with self.lock:
            if schedule_id not in self.schedules:
                raise ValueError(f"Vesting schedule {schedule_id} not found.")

            sch = self.schedules[schedule_id]
            now = current_time if current_time is not None else time.time()

            if sch.status == ScheduleStatus.REVOKED:
                # If revoked, vesting stops at revocation timestamp
                now = min(now, sch.revoked_at) if sch.revoked_at else now

            if now < sch.start_time:
                return 0.0

            cliff_end = sch.start_time + sch.cliff_duration_seconds
            if now < cliff_end:
                # Before cliff ends, 0 tokens are unlocked
                return 0.0

            vesting_end = sch.start_time + sch.vesting_duration_seconds
            if now >= vesting_end:
                return sch.total_allocation

            # Continuous linear calculation
            time_elapsed = now - sch.start_time
            vested = (sch.total_allocation * time_elapsed) / sch.vesting_duration_seconds
            return round(min(sch.total_allocation, vested), 6)

    def compute_claimable_amount(self, schedule_id: str, current_time: Optional[float] = None) -> float:
        """
        Calculates tokens currently vested but not yet claimed.
        """
        with self.lock:
            sch = self.schedules[schedule_id]
            total_vested = self.compute_vested_amount(schedule_id, current_time)
            return max(0.0, round(total_vested - sch.released_amount, 6))

    def claim_vested_tokens(
        self,
        schedule_id: str,
        caller_address: str,
        current_time: Optional[float] = None,
    ) -> VestingClaimReceipt:
        """
        Releases all unlocked tokens to the beneficiary.
        """
        with self.lock:
            if schedule_id not in self.schedules:
                raise ValueError(f"Vesting schedule {schedule_id} not found.")

            sch = self.schedules[schedule_id]
            if sch.beneficiary_address != caller_address:
                raise ValueError("Caller is not the authorized schedule beneficiary.")

            claimable = self.compute_claimable_amount(schedule_id, current_time)
            if claimable <= 1e-6:
                raise ValueError("No unlocked tokens available to claim at this time.")

            now = current_time if current_time is not None else time.time()
            sch.released_amount += claimable

            if round(sch.released_amount, 4) >= round(sch.total_allocation, 4):
                sch.status = ScheduleStatus.COMPLETED

            claim_id = f"claim_{hashlib.sha256(f'{schedule_id}:{sch.released_amount}:{now}'.encode()).hexdigest()[:16]}"
            tx_hash = f"0x_vest_claim_{hashlib.sha256(f'{claim_id}:{claimable}'.encode()).hexdigest()[:32]}"
            remaining = max(0.0, round(sch.total_allocation - sch.released_amount, 6))

            receipt = VestingClaimReceipt(
                claim_id=claim_id,
                schedule_id=schedule_id,
                beneficiary_address=sch.beneficiary_address,
                amount_claimed=claimable,
                total_claimed_to_date=round(sch.released_amount, 6),
                remaining_locked=remaining,
                tx_hash=tx_hash,
                timestamp=now,
            )

            self.claim_history.append(receipt)
            return receipt

    def revoke_vesting_schedule(
        self,
        schedule_id: str,
        admin_address: str,
        current_time: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Revokes a revocable vesting schedule. Unvested tokens are returned to the treasury,
        and the schedule is frozen.
        """
        with self.lock:
            if schedule_id not in self.schedules:
                raise ValueError(f"Vesting schedule {schedule_id} not found.")

            sch = self.schedules[schedule_id]
            if not sch.is_revocable:
                raise ValueError("This vesting contract is non-revocable.")

            if sch.status != ScheduleStatus.ACTIVE:
                raise ValueError(f"Schedule is not active (Status: {sch.status.value}).")

            now = current_time if current_time is not None else time.time()
            vested_so_far = self.compute_vested_amount(schedule_id, now)
            unvested_return = max(0.0, round(sch.total_allocation - vested_so_far, 6))

            sch.status = ScheduleStatus.REVOKED
            sch.revoked_at = now
            sch.unvested_returned_to_treasury = unvested_return

            return {
                "status": "REVOKED",
                "schedule_id": schedule_id,
                "revoked_by": admin_address,
                "vested_entitlement": vested_so_far,
                "already_claimed": sch.released_amount,
                "claimable_remaining": max(0.0, round(vested_so_far - sch.released_amount, 6)),
                "unvested_returned_to_treasury": unvested_return,
                "revocation_timestamp": now,
            }

    def get_schedule_summary(self, schedule_id: str) -> Dict[str, Any]:
        """Returns structured JSON summary of schedule metrics."""
        with self.lock:
            if schedule_id not in self.schedules:
                raise ValueError(f"Vesting schedule {schedule_id} not found.")

            sch = self.schedules[schedule_id]
            vested = self.compute_vested_amount(schedule_id)
            claimable = self.compute_claimable_amount(schedule_id)

            return {
                "schedule_id": sch.schedule_id,
                "beneficiary_address": sch.beneficiary_address,
                "category": sch.category.value,
                "total_allocation": sch.total_allocation,
                "start_time": sch.start_time,
                "cliff_duration_seconds": sch.cliff_duration_seconds,
                "vesting_duration_seconds": sch.vesting_duration_seconds,
                "is_revocable": sch.is_revocable,
                "status": sch.status.value,
                "total_vested": vested,
                "released_amount": sch.released_amount,
                "claimable_now": claimable,
                "unvested_returned_to_treasury": sch.unvested_returned_to_treasury,
            }


# Global Vesting Engine Singleton
vesting_engine = TokenVestingEngine()
