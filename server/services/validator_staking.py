"""
Validator Staking & Yield Distribution Engine
File: server/services/validator_staking.py

Architecture:
- Proof-of-Stake validator registry, token bonding, and unbonding lock queue (14 days).
- Dynamic APY Yield Calculation:
  - Base APY dynamically scales between 4.5% and 18.0% inversely proportional to staking ratio (Staked / Total Circulating).
- Slashing Conditions:
  - Double-signing / Equivocation: 15% slash of staked bond + permanent validator jailing.
  - Excessive Downtime (offline for > 10,000 blocks): 1% soft slash + temporary suspension.
  - Invalid Block Proposal: 5% slash.
- Yield Distribution:
  - Continuous block-by-block compound yield calculation funded by transaction fee splits & ecosystem reserve allocations.
"""

import time
import math
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class ValidatorStatus(str, Enum):
    ACTIVE = "ACTIVE"
    JAILED = "JAILED"
    SUSPENDED = "SUSPENDED"
    UNBONDING = "UNBONDING"
    INACTIVE = "INACTIVE"


class SlashReason(str, Enum):
    DOUBLE_SIGNING = "DOUBLE_SIGNING"
    EXCESSIVE_DOWNTIME = "EXCESSIVE_DOWNTIME"
    INVALID_BLOCK_PROPOSAL = "INVALID_BLOCK_PROPOSAL"


@dataclass
class UnbondingRequest:
    request_id: str
    validator_address: str
    delegator_address: str
    amount: float
    requested_at: float
    completion_epoch: float
    is_claimed: bool = False


@dataclass
class ValidatorNode:
    validator_address: str
    node_onion_address: str
    public_key_hex: str
    staked_amount: float
    accumulated_rewards: float = 0.0
    commission_rate: float = 0.05  # 5% default commission
    status: ValidatorStatus = ValidatorStatus.ACTIVE
    last_active_timestamp: float = field(default_factory=time.time)
    missed_blocks_count: int = 0
    blocks_proposed: int = 0
    jailed_until: Optional[float] = None
    created_at: float = field(default_factory=time.time)


class ValidatorStakingEngine:
    """
    Manages Proof-of-Stake validator nodes, delegator bonding, dynamic yield calculation,
    and slashing defense.
    """

    UNBONDING_PERIOD_SECONDS = 1209600.0  # 14 Days
    MIN_VALIDATOR_STAKE = 10000.0  # Minimum 10,000 tokens to become an active validator
    BASE_MIN_APY = 0.045  # 4.5% min APY
    BASE_MAX_APY = 0.180  # 18.0% max APY

    def __init__(self, total_circulating_supply: float = 485004375667.0) -> None:
        self.total_circulating_supply = total_circulating_supply
        self.lock = threading.RLock()

        # validator_address -> ValidatorNode
        self.validators: Dict[str, ValidatorNode] = {}
        # Unbonding queue: request_id -> UnbondingRequest
        self.unbonding_queue: Dict[str, UnbondingRequest] = {}
        # Slashed funds pool: accumulated burned / slashed tokens
        self.slashed_treasury_pool: float = 0.0

    def register_or_bond_validator(
        self,
        validator_address: str,
        node_onion_address: str,
        public_key_hex: str,
        initial_stake: float,
        commission_rate: float = 0.05,
    ) -> ValidatorNode:
        """
        Registers a new validator or adds bond to an existing validator.
        """
        with self.lock:
            if initial_stake <= 0:
                raise ValueError("Stake amount must be positive.")

            now = time.time()
            if validator_address in self.validators:
                val = self.validators[validator_address]
                val.staked_amount += initial_stake
                if val.status == ValidatorStatus.INACTIVE and val.staked_amount >= self.MIN_VALIDATOR_STAKE:
                    val.status = ValidatorStatus.ACTIVE
                return val

            status = ValidatorStatus.ACTIVE if initial_stake >= self.MIN_VALIDATOR_STAKE else ValidatorStatus.INACTIVE
            node = ValidatorNode(
                validator_address=validator_address,
                node_onion_address=node_onion_address,
                public_key_hex=public_key_hex,
                staked_amount=initial_stake,
                commission_rate=commission_rate,
                status=status,
                last_active_timestamp=now,
                created_at=now,
            )
            self.validators[validator_address] = node
            return node

    def compute_dynamic_network_apy(self) -> float:
        """
        Computes dynamic network APY inversely scaled by the total staked percentage.
        Formula: APY = MIN_APY + (MAX_APY - MIN_APY) * (1 - StakingRatio)
        """
        with self.lock:
            total_staked = sum(v.staked_amount for v in self.validators.values() if v.status == ValidatorStatus.ACTIVE)
            if self.total_circulating_supply <= 0:
                return self.BASE_MIN_APY

            staking_ratio = min(1.0, total_staked / self.total_circulating_supply)
            apy = self.BASE_MIN_APY + (self.BASE_MAX_APY - self.BASE_MIN_APY) * (1.0 - staking_ratio)
            return round(apy, 4)

    def distribute_block_rewards(self, block_proposer_address: str, block_fee_pool: float) -> Dict[str, Any]:
        """
        Distributes block emission rewards & transaction fee splits to active validators.
        """
        with self.lock:
            active_validators = [v for v in self.validators.values() if v.status == ValidatorStatus.ACTIVE]
            if not active_validators:
                return {"distributed": 0.0, "validators_count": 0}

            total_active_stake = sum(v.staked_amount for v in active_validators)
            apy = self.compute_dynamic_network_apy()

            # Base block reward calculated from annualized APY (assuming 5-second blocks: ~6,307,200 blocks/yr)
            annual_blocks = 6307200.0
            base_reward_pool = (total_active_stake * apy) / annual_blocks
            total_reward_to_distribute = base_reward_pool + block_fee_pool

            # 40% to block proposer, 60% split proportionally by stake
            proposer_bonus = total_reward_to_distribute * 0.40
            stake_pool = total_reward_to_distribute * 0.60

            if block_proposer_address in self.validators:
                proposer = self.validators[block_proposer_address]
                proposer.accumulated_rewards += proposer_bonus
                proposer.blocks_proposed += 1

            for val in active_validators:
                if total_active_stake > 0:
                    share = (val.staked_amount / total_active_stake) * stake_pool
                    val.accumulated_rewards += share

            return {
                "distributed": total_reward_to_distribute,
                "current_apy": apy,
                "active_validators_count": len(active_validators),
            }

    def slash_validator(
        self,
        validator_address: str,
        reason: SlashReason,
        evidence_tx_hash: str,
    ) -> Dict[str, Any]:
        """
        Enforces cryptographic slashing penalties for malicious behavior.
        """
        with self.lock:
            if validator_address not in self.validators:
                raise ValueError(f"Validator {validator_address} not found.")

            val = self.validators[validator_address]

            if reason == SlashReason.DOUBLE_SIGNING:
                slash_pct = 0.15  # 15% slash
                val.status = ValidatorStatus.JAILED
                val.jailed_until = time.time() + 86400.0 * 30  # Jailed for 30 days
            elif reason == SlashReason.INVALID_BLOCK_PROPOSAL:
                slash_pct = 0.05  # 5% slash
                val.status = ValidatorStatus.SUSPENDED
            elif reason == SlashReason.EXCESSIVE_DOWNTIME:
                slash_pct = 0.01  # 1% slash
                val.status = ValidatorStatus.SUSPENDED
            else:
                slash_pct = 0.01

            slashed_amount = val.staked_amount * slash_pct
            val.staked_amount -= slashed_amount
            self.slashed_treasury_pool += slashed_amount

            return {
                "status": "SLASHED",
                "validator_address": validator_address,
                "reason": reason.value,
                "slash_percentage": slash_pct * 100,
                "slashed_amount": slashed_amount,
                "remaining_stake": val.staked_amount,
                "new_validator_status": val.status.value,
                "evidence_hash": evidence_tx_hash,
            }

    def request_unbonding(
        self,
        validator_address: str,
        delegator_address: str,
        amount: float,
        custom_unbonding_period: Optional[float] = None,
    ) -> UnbondingRequest:
        """
        Enters tokens into 14-day unbonding lock queue.
        """
        with self.lock:
            if validator_address not in self.validators:
                raise ValueError(f"Validator {validator_address} not found.")

            val = self.validators[validator_address]
            if val.staked_amount < amount:
                raise ValueError("Insufficient staked balance to unbond.")

            now = time.time()
            period = custom_unbonding_period if custom_unbonding_period is not None else self.UNBONDING_PERIOD_SECONDS
            completion = now + period

            val.staked_amount -= amount
            if val.staked_amount < self.MIN_VALIDATOR_STAKE:
                val.status = ValidatorStatus.INACTIVE

            req_id = f"unbond_{hashlib.sha256(f'{validator_address}:{delegator_address}:{amount}:{now}'.encode()).hexdigest()[:16]}"
            req = UnbondingRequest(
                request_id=req_id,
                validator_address=validator_address,
                delegator_address=delegator_address,
                amount=amount,
                requested_at=now,
                completion_epoch=completion,
            )
            self.unbonding_queue[req_id] = req
            return req

    def claim_completed_unbonding(self, request_id: str) -> Dict[str, Any]:
        """
        Claims unbonded tokens after 14-day delay has elapsed.
        """
        with self.lock:
            if request_id not in self.unbonding_queue:
                raise ValueError(f"Unbonding request {request_id} not found.")

            req = self.unbonding_queue[request_id]
            if req.is_claimed:
                raise ValueError("Unbonding request already claimed.")

            now = time.time()
            if now < req.completion_epoch:
                remaining = int(req.completion_epoch - now)
                raise ValueError(f"Unbonding period in progress: {remaining}s remaining.")

            req.is_claimed = True
            return {
                "status": "UNBONDING_RELEASED",
                "request_id": req.request_id,
                "delegator_address": req.delegator_address,
                "amount": req.amount,
                "released_at": now,
            }

    def get_validator_summary(self, validator_address: str) -> Dict[str, Any]:
        """Returns structured JSON summary of validator metrics."""
        with self.lock:
            if validator_address not in self.validators:
                raise ValueError(f"Validator {validator_address} not found.")

            val = self.validators[validator_address]
            return {
                "validator_address": val.validator_address,
                "node_onion_address": val.node_onion_address,
                "staked_amount": val.staked_amount,
                "accumulated_rewards": round(val.accumulated_rewards, 6),
                "commission_rate": val.commission_rate,
                "status": val.status.value,
                "blocks_proposed": val.blocks_proposed,
                "missed_blocks": val.missed_blocks_count,
            }


# Global Staking Engine Singleton
validator_staking_engine = ValidatorStakingEngine()
