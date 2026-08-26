"""
Liquid Staking Derivative (LSD) & Restaking Slashing Insurance Pool
File: server/services/liquid_staking_derivative.py

Architecture:
- Liquid Staking Derivative (`stToken9898`) & EigenLayer-style restaking insurance pool for Token 9898048483.
- Core Pillars:
  1. Minting & Burning of `stToken9898`:
     - Users deposit raw `Token9898` to mint yield-bearing `stToken9898`.
     - Exchange rate grows monotonically as staking rewards accrue: $R = \frac{\text{Total Staked} + \text{Rewards}}{\text{Total stToken Supply}}$.
  2. Multi-AVS Restaking Allocation:
     - Re-stakes assets into Actively Validated Services (AVSs) like oracle networks, sequencer rings, and bridges.
  3. Slashing Insurance Reserve:
     - Allocates 15% of restaking yield into a first-loss capital insurance reserve to absorb node operator slashing events.
"""

import time
import math
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class LiquidStakingAccount:
    holder_address: str
    st_token_balance: float
    underlying_token_deposited: float
    minted_at: float = field(default_factory=time.time)


@dataclass
class SlashingInsuranceClaim:
    claim_id: str
    slashed_validator: str
    slashed_amount_tokens: float
    insurance_payout_tokens: float
    is_settled: bool = True
    processed_at: float = field(default_factory=time.time)


class LiquidStakingDerivativeEngine:
    """
    Manages stToken9898 minting/burning, restaking exchange rate dynamics, and slashing insurance.
    """

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.total_underlying_staked: float = 1_000_000.0
        self.total_st_token_supply: float = 1_000_000.0
        self.accumulated_rewards: float = 0.0
        self.insurance_reserve_tokens: float = 50_000.0
        self.accounts: Dict[str, LiquidStakingAccount] = {}
        self.claims: List[SlashingInsuranceClaim] = []

    @property
    def exchange_rate(self) -> float:
        """Returns the current exchange rate of 1 stToken9898 in underlying tokens."""
        if self.total_st_token_supply <= 0:
            return 1.0
        return (self.total_underlying_staked + self.accumulated_rewards) / self.total_st_token_supply

    def stake_and_mint(self, user_address: str, amount_tokens: float) -> Tuple[float, float]:
        """Stakes Token 9898048483 and mints corresponding stToken9898 at current exchange rate."""
        with self.lock:
            if amount_tokens <= 0:
                raise ValueError("Stake amount must be positive.")

            current_rate = self.exchange_rate
            st_tokens_to_mint = amount_tokens / current_rate

            if user_address not in self.accounts:
                self.accounts[user_address] = LiquidStakingAccount(
                    holder_address=user_address,
                    st_token_balance=0.0,
                    underlying_token_deposited=0.0,
                )

            acc = self.accounts[user_address]
            acc.st_token_balance += st_tokens_to_mint
            acc.underlying_token_deposited += amount_tokens

            self.total_underlying_staked += amount_tokens
            self.total_st_token_supply += st_tokens_to_mint

            return round(st_tokens_to_mint, 4), round(current_rate, 6)

    def distribute_staking_rewards(self, reward_amount: float) -> None:
        """Accrues staking and restaking rewards to the pool and directs 15% to insurance reserve."""
        with self.lock:
            if reward_amount <= 0:
                return

            insurance_cut = reward_amount * 0.15
            stakers_cut = reward_amount * 0.85

            self.insurance_reserve_tokens += insurance_cut
            self.accumulated_rewards += stakers_cut

    def process_slashing_insurance_claim(
        self,
        validator_address: str,
        slashed_amount: float,
    ) -> SlashingInsuranceClaim:
        """Compensates slashed stakers from the insurance reserve."""
        with self.lock:
            payout = min(self.insurance_reserve_tokens, slashed_amount)
            self.insurance_reserve_tokens -= payout

            claim = SlashingInsuranceClaim(
                claim_id=f"claim_{secrets.token_hex(6)}",
                slashed_validator=validator_address,
                slashed_amount_tokens=slashed_amount,
                insurance_payout_tokens=payout,
            )
            self.claims.append(claim)
            return claim


# Global LSD Engine Singleton
lsd_engine = LiquidStakingDerivativeEngine()
