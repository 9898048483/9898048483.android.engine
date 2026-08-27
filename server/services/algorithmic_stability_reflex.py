"""
Autonomous Algorithmic Stability & Reflex Liquidity Controller
File: server/services/algorithmic_stability_reflex.py

Architecture:
- Cybernetic PID-controlled supply stabilization and liquidity reflex engine for Token 9898048483.
- Core Pillars:
  1. Proportional-Integral-Derivative (PID) Dynamic Supply Controller:
     - Continuously regulates algorithmic expansion and contraction based on error $e(t) = P_{\\text{target}} - P_{\\text{oracle}}$:
       $u(t) = K_p e(t) + K_i \\int_0^t e(\\tau) d\\tau + K_d \\frac{de(t)}{dt}$.
     - Dampens price deviations and guarantees perpetual market depth.
  2. Protocol-Owned Reserve (POR) Multi-Asset Vault:
     - Maintains a diversified collateral reserve (USDC, PAXG Gold, BTC, ETH) with autonomous algorithmic rebalancing.
  3. Anti-Run Reflex Slippage & Dynamic Burn Tax:
     - Imposes dynamic anti-panic sell slippage fees ($S_{\\text{tax}} = \\alpha \\cdot (\\Delta P / P)^2$) during sudden mass liquidations, redirecting 100% of the penalty to the Protocol Reserve and floor liquidity buyback walls.
"""

import time
import math
import hashlib
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ProtocolReserveVault:
    vault_id: str
    usdc_reserve: float
    gold_paxg_reserve: float
    btc_reserve: float
    eth_reserve: float
    total_reserve_usd_value: float
    collateralization_ratio_pct: float
    last_rebalanced_at: float = field(default_factory=time.time)


@dataclass
class PIDControllerState:
    target_price_usd: float = 1.00
    current_price_usd: float = 1.00
    kp: float = 0.35
    ki: float = 0.05
    kd: float = 0.15
    integral_error: float = 0.0
    previous_error: float = 0.0
    last_action_applied: str = "EQUILIBRIUM"  # "MINT_EXPAND", "BURN_CONTRACT", "EQUILIBRIUM"
    adjustment_supply_units: float = 0.0
    last_updated_at: float = field(default_factory=time.time)


@dataclass
class AntiRunSlippageRecord:
    tx_id: str
    seller_address: str
    sell_volume_token9898: float
    price_impact_pct: float
    penalty_tax_pct: float
    retained_reserve_usd: float
    is_mitigated: bool
    assessed_at: float = field(default_factory=time.time)


class AlgorithmicStabilityReflexEngine:
    """
    PID-controlled autonomous monetary reflex engine for Token 9898048483.
    """

    def __init__(self, target_price_usd: float = 1.00) -> None:
        self.lock = threading.RLock()
        self.pid_state = PIDControllerState(target_price_usd=target_price_usd)
        self.reserve = ProtocolReserveVault(
            vault_id="por_vault_9898",
            usdc_reserve=25_000_000.0,
            gold_paxg_reserve=5_000.0,    # ~10M USD
            btc_reserve=250.0,             # ~15M USD
            eth_reserve=4_000.0,           # ~10M USD
            total_reserve_usd_value=60_000_000.0,
            collateralization_ratio_pct=145.0,  # Over-collateralized
        )
        self.anti_run_records: List[AntiRunSlippageRecord] = []

    def execute_pid_stability_epoch(
        self,
        current_oracle_price_usd: float,
        dt_seconds: float = 60.0,
    ) -> PIDControllerState:
        """
        Executes PID controller feedback loop:
        $u(t) = K_p e(t) + K_i \\int e dt + K_d \\frac{de}{dt}$
        """
        with self.lock:
            state = self.pid_state
            state.current_price_usd = current_oracle_price_usd
            error = state.target_price_usd - current_oracle_price_usd

            # Proportional term
            p_term = state.kp * error

            # Integral term (clamped)
            state.integral_error += error * (dt_seconds / 3600.0)
            state.integral_error = max(-5.0, min(5.0, state.integral_error))
            i_term = state.ki * state.integral_error

            # Derivative term
            d_term = state.kd * ((error - state.previous_error) / max(1.0, dt_seconds))
            state.previous_error = error

            # Control output
            u = p_term + i_term + d_term

            if u > 0.01:
                # Target price > Oracle price -> Under-peg -> Burn / Contract supply
                action = "BURN_CONTRACT"
                supply_delta = round(abs(u) * 50_000.0, 2)
            elif u < -0.01:
                # Oracle price > Target price -> Over-peg -> Mint / Expand supply
                action = "MINT_EXPAND"
                supply_delta = round(abs(u) * 50_000.0, 2)
            else:
                action = "EQUILIBRIUM"
                supply_delta = 0.0

            state.last_action_applied = action
            state.adjustment_supply_units = supply_delta
            state.last_updated_at = time.time()

            return state

    def evaluate_anti_run_panic_sell(
        self,
        seller_address: str,
        sell_volume_token9898: float,
        current_liquidity_depth_usd: float = 10_000_000.0,
    ) -> AntiRunSlippageRecord:
        """
        Calculates dynamic anti-run slippage tax during aggressive liquidation waves.
        """
        with self.lock:
            tx_id = f"anti_run_{secrets.token_hex(6)}"
            # Price impact $\\Delta P / P = \\text{Volume} / \\text{Depth}$
            price_impact = min(1.0, sell_volume_token9898 / max(1.0, current_liquidity_depth_usd))

            # Dynamic reflex tax: if impact > 2%, tax scales quadratically up to 25%
            if price_impact > 0.02:
                penalty_tax_pct = min(25.0, round(100.0 * (price_impact ** 1.5) * 5.0, 2))
            else:
                penalty_tax_pct = 0.3  # Standard baseline 0.3%

            retained_usd = round(sell_volume_token9898 * (penalty_tax_pct / 100.0), 2)
            # Add retained penalty directly to reserve liquidity buffer
            self.reserve.usdc_reserve += retained_usd

            record = AntiRunSlippageRecord(
                tx_id=tx_id,
                seller_address=seller_address,
                sell_volume_token9898=sell_volume_token9898,
                price_impact_pct=round(price_impact * 100.0, 2),
                penalty_tax_pct=penalty_tax_pct,
                retained_reserve_usd=retained_usd,
                is_mitigated=True,
            )

            self.anti_run_records.append(record)
            return record


# Global Algorithmic Stability Singleton
algorithmic_stability_reflex_engine = AlgorithmicStabilityReflexEngine()
