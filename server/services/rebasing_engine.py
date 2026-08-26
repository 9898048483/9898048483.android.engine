"""
Automated Yield Distributor & Real-Time Rebasing Engine
File: server/services/rebasing_engine.py

Architecture:
- High-precision algorithmic rebasing and continuous interest compounding engine.
- Implements elastic supply distribution:
  - Balances scale dynamically based on a global multiplier index:
    $\text{Effective Balance} = \text{Internal Shares} \times \text{Rebase Multiplier}$
- Core Pillars:
  1. Continuous Compound Interest & Yield Accrual:
     - Calculates continuous compounding yield $A = P \cdot e^{r \cdot \Delta t}$ based on vault performance.
  2. Dynamic Yield Streaming to Liquidity Pools & Stakers:
     - Real-time distribution of protocol revenue, AMM fees, and RWA yields.
  3. Rebase Epoch Schedule & Maximum Elasticity Bounds:
     - Hard caps daily rebase delta within safety limits [-5%, +5%] to prevent economic exploit spikes.
"""

import time
import math
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class RebaseEpochEvent:
    epoch_number: int
    prior_multiplier: float
    new_multiplier: float
    rebase_delta_percentage: float
    total_shares: float
    total_effective_supply: float
    yield_distributed_tokens: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class StakerYieldPosition:
    address: str
    internal_shares: float
    entry_multiplier: float
    accrued_dividends_claimed: float = 0.0
    last_updated: float = field(default_factory=time.time)


class RebasingAndYieldEngine:
    """
    Manages internal shares, dynamic rebase multiplier, and continuous yield distribution.
    """

    MAX_REBASE_DELTA_PERCENT = 0.05  # Max 5% change per epoch
    MIN_REBASE_DELTA_PERCENT = -0.05 # Max 5% contraction per epoch

    def __init__(self, initial_supply: float = 1_000_000.0) -> None:
        self.lock = threading.RLock()
        self.rebase_multiplier: float = 1.0
        self.total_shares: float = initial_supply
        self.staker_positions: Dict[str, StakerYieldPosition] = {}
        self.rebase_history: List[RebaseEpochEvent] = []
        self.current_epoch: int = 1
        self.annual_percentage_yield (APY): float = 0.12  # 12% target APY
        self.apy_rate = 0.12
        self.last_rebase_timestamp = time.time()

    def deposit_staked_tokens(self, address: str, amount: float) -> float:
        """
        Converts nominal tokens into internal shares:
        $\text{Shares} = \frac{\text{Amount}}{\text{Multiplier}}$
        """
        with self.lock:
            if amount <= 0:
                raise ValueError("Deposit amount must be positive.")

            shares_minted = amount / self.rebase_multiplier

            if address in self.staker_positions:
                pos = self.staker_positions[address]
                pos.internal_shares += shares_minted
                pos.last_updated = time.time()
            else:
                self.staker_positions[address] = StakerYieldPosition(
                    address=address,
                    internal_shares=shares_minted,
                    entry_multiplier=self.rebase_multiplier,
                )

            self.total_shares += shares_minted
            return shares_minted

    def get_effective_balance(self, address: str) -> float:
        """Calculates current rebased balance: Shares * Multiplier."""
        with self.lock:
            if address not in self.staker_positions:
                return 0.0
            shares = self.staker_positions[address].internal_shares
            return round(shares * self.rebase_multiplier, 6)

    def trigger_rebase_epoch(self, external_yield_inflow: float = 0.0) -> RebaseEpochEvent:
        """
        Calculates continuous yield accrual and applies bounded rebase multiplier adjustment.
        """
        with self.lock:
            now = time.time()
            dt_years = max(0.0001, (now - self.last_rebase_timestamp) / (365.0 * 86400.0))

            # Continuous compounding factor: exp(r * dt) - 1
            organic_yield_fraction = math.exp(self.apy_rate * dt_years) - 1.0

            # Compute target delta multiplier
            prior_mult = self.rebase_multiplier
            total_current_supply = self.total_shares * prior_mult

            # Additional multiplier boost from external RWA revenue
            external_fraction = (external_yield_inflow / total_current_supply) if total_current_supply > 0 else 0.0
            total_delta_fraction = organic_yield_fraction + external_fraction

            # Apply bounded safety clamping [-5%, +5%]
            clamped_delta = max(
                self.MIN_REBASE_DELTA_PERCENT,
                min(self.MAX_REBASE_DELTA_PERCENT, total_delta_fraction),
            )

            new_mult = prior_mult * (1.0 + clamped_delta)
            self.rebase_multiplier = new_mult
            self.last_rebase_timestamp = now
            self.current_epoch += 1

            new_total_supply = self.total_shares * new_mult
            distributed_yield = new_total_supply - total_current_supply

            event = RebaseEpochEvent(
                epoch_number=self.current_epoch,
                prior_multiplier=round(prior_mult, 8),
                new_multiplier=round(new_mult, 8),
                rebase_delta_percentage=round(clamped_delta * 100.0, 4),
                total_shares=round(self.total_shares, 4),
                total_effective_supply=round(new_total_supply, 4),
                yield_distributed_tokens=round(distributed_yield, 4),
                timestamp=now,
            )

            self.rebase_history.append(event)
            return event

    def withdraw_staked_tokens(self, address: str, amount_nominal: float) -> float:
        """Withdraws rebased tokens and burns corresponding internal shares."""
        with self.lock:
            current_bal = self.get_effective_balance(address)
            if amount_nominal > current_bal:
                raise ValueError(f"Insufficient staked balance: Requested {amount_nominal}, Available {current_bal}")

            shares_to_burn = amount_nominal / self.rebase_multiplier
            self.staker_positions[address].internal_shares -= shares_to_burn
            self.total_shares -= shares_to_burn

            return amount_nominal


# Global Rebasing Engine Singleton
rebasing_engine = RebasingAndYieldEngine()
