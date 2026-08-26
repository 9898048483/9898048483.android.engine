"""
Institutional Clearinghouse & Multi-Asset Collateral Margining
File: server/services/clearinghouse.py

Architecture:
- High-performance institutional clearinghouse and real-time cross-margining risk engine for Token 9898048483 perpetual derivatives and spot swaps.
- Core Pillars:
  1. Multi-Asset Portfolio Cross-Margining:
     - Aggregates collateral across multiple tokens (Token 9898048483, BTC, ETH, USDC) with asset haircuts.
     - Calculates Initial Margin Requirement (IMR) and Maintenance Margin Requirement (MMR).
  2. Dynamic Hourly Funding Rate Calculator:
     - Formula: $F = \text{clamp}\left(\frac{\text{Perp Price} - \text{Index Price}}{\text{Index Price}} + \text{clamp}(\text{Interest Rate}, -0.05\%, 0.05\%), -0.75\%, 0.75\%\right)$.
  3. Real-Time Liquidation Dutch Auction Engine:
     - When Margin Ratio $< \text{MMR}$, initiates Dutch auction liquidation with gradual discount curve.
"""

import time
import math
import hashlib
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class PositionSide(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"


@dataclass
class MarginPosition:
    market_id: str
    side: PositionSide
    size: float  # contracts / token units
    entry_price: float
    unrealized_pnl: float = 0.0


@dataclass
class TraderMarginAccount:
    trader_address: str
    deposited_collateral: Dict[str, float] = field(default_factory=dict)  # token -> amount
    positions: Dict[str, MarginPosition] = field(default_factory=dict)    # market_id -> position
    total_collateral_value_usd: float = 0.0
    margin_ratio: float = 1.0  # (Equity / Total Notional Position Value)
    is_liquidatable: bool = False
    last_updated: float = field(default_factory=time.time)


@dataclass
class LiquidationAuctionEvent:
    auction_id: str
    trader_address: str
    liquidated_market_id: str
    position_size: float
    bankruptcy_price: float
    starting_auction_price: float
    clearing_price: Optional[float] = None
    is_settled: bool = False
    initiated_at: float = field(default_factory=time.time)


class InstitutionalClearinghouseEngine:
    """
    Manages portfolio cross-margining, maintenance margin checks, funding rates, and liquidation auctions.
    """

    MAINTENANCE_MARGIN_REQUIREMENT = 0.05  # 5% MMR (20x max leverage)
    INITIAL_MARGIN_REQUIREMENT = 0.10      # 10% IMR (10x max initial leverage)

    # Haircuts for collateral valuation (1.0 = full value, 0.9 = 10% discount)
    COLLATERAL_HAIRCUTS = {
        "USDC": 1.0,
        "TOKEN_9898048483": 0.95,
        "BTC": 0.90,
        "ETH": 0.88,
    }

    # Oracle prices
    ASSET_PRICES_USD = {
        "USDC": 1.0,
        "TOKEN_9898048483": 10.0,
        "BTC": 65_000.0,
        "ETH": 3_500.0,
    }

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.accounts: Dict[str, TraderMarginAccount] = {}
        self.active_auctions: Dict[str, LiquidationAuctionEvent] = []

    def deposit_collateral(self, trader: str, token: str, amount: float) -> TraderMarginAccount:
        """Deposits multi-asset collateral into margin account."""
        with self.lock:
            if amount <= 0:
                raise ValueError("Deposit amount must be positive.")
            if token not in self.COLLATERAL_HAIRCUTS:
                raise ValueError(f"Unsupported collateral asset {token}.")

            if trader not in self.accounts:
                self.accounts[trader] = TraderMarginAccount(trader_address=trader)

            acc = self.accounts[trader]
            acc.deposited_collateral[token] = acc.deposited_collateral.get(token, 0.0) + amount
            self._recalculate_account_risk(trader)
            return acc

    def open_position(
        self,
        trader: str,
        market_id: str,
        side: PositionSide,
        size: float,
        price: float,
    ) -> MarginPosition:
        """Opens a leveraged perpetual position with cross-margin check."""
        with self.lock:
            if trader not in self.accounts:
                raise ValueError("Trader has not deposited collateral.")

            acc = self.accounts[trader]
            notional_val = size * price

            # Required initial margin
            req_margin = notional_val * self.INITIAL_MARGIN_REQUIREMENT
            free_collateral = acc.total_collateral_value_usd

            if free_collateral < req_margin:
                raise PermissionError(f"Insufficient collateral: Available ${free_collateral:.2f}, Required ${req_margin:.2f}")

            pos = MarginPosition(market_id=market_id, side=side, size=size, entry_price=price)
            acc.positions[market_id] = pos
            self._recalculate_account_risk(trader)
            return pos

    def update_market_price_and_evaluate(self, market_id: str, new_price: float) -> None:
        """Updates oracle mark price and evaluates portfolio margin ratios across all accounts."""
        with self.lock:
            self.ASSET_PRICES_USD[market_id] = new_price
            for trader in list(self.accounts.keys()):
                self._recalculate_account_risk(trader)

    def _recalculate_account_risk(self, trader: str) -> None:
        acc = self.accounts[trader]

        # 1. Total Haircut Collateral Value
        total_collat_usd = 0.0
        for token, qty in acc.deposited_collateral.items():
            price = self.ASSET_PRICES_USD.get(token, 1.0)
            haircut = self.COLLATERAL_HAIRCUTS.get(token, 0.8)
            total_collat_usd += (qty * price * haircut)

        acc.total_collateral_value_usd = total_collat_usd

        # 2. Total Position Notional & Unrealized PnL
        total_notional = 0.0
        total_unrealized_pnl = 0.0

        for market_id, pos in acc.positions.items():
            mark_price = self.ASSET_PRICES_USD.get(market_id, pos.entry_price)
            pos_notional = pos.size * mark_price
            total_notional += pos_notional

            if pos.side == PositionSide.LONG:
                pnl = (mark_price - pos.entry_price) * pos.size
            else:
                pnl = (pos.entry_price - mark_price) * pos.size

            pos.unrealized_pnl = pnl
            total_unrealized_pnl += pnl

        equity = total_collat_usd + total_unrealized_pnl
        if total_notional > 0:
            acc.margin_ratio = equity / total_notional
        else:
            acc.margin_ratio = 1.0

        acc.is_liquidatable = (acc.margin_ratio < self.MAINTENANCE_MARGIN_REQUIREMENT) and (total_notional > 0)
        acc.last_updated = time.time()

    def calculate_hourly_funding_rate(
        self,
        perp_mark_price: float,
        index_oracle_price: float,
        base_interest_rate: float = 0.0001,
    ) -> float:
        """
        Calculates hourly dynamic funding rate with premium clamping.
        """
        price_diff = (perp_mark_price - index_oracle_price) / index_oracle_price
        rate = price_diff + max(-0.0005, min(0.0005, base_interest_rate))
        clamped_funding = max(-0.0075, min(0.0075, rate))
        return round(clamped_funding, 6)

    def trigger_liquidation_auction(self, trader: str, market_id: str) -> LiquidationAuctionEvent:
        """
        Initiates Dutch liquidation auction when margin drops below MMR.
        """
        with self.lock:
            acc = self.accounts.get(trader)
            if not acc or not acc.is_liquidatable or market_id not in acc.positions:
                raise ValueError("Position is not eligible for liquidation.")

            pos = acc.positions[market_id]
            mark_price = self.ASSET_PRICES_USD.get(market_id, pos.entry_price)

            auction_id = f"liq_auc_{secrets.token_hex(6)}"
            event = LiquidationAuctionEvent(
                auction_id=auction_id,
                trader_address=trader,
                liquidated_market_id=market_id,
                position_size=pos.size,
                bankruptcy_price=round(mark_price * 0.92, 2),
                starting_auction_price=mark_price,
            )

            # Close position from account
            del acc.positions[market_id]
            self._recalculate_account_risk(trader)

            self.active_auctions.append(event)
            return event


# Global Clearinghouse Singleton
clearinghouse_engine = InstitutionalClearinghouseEngine()
