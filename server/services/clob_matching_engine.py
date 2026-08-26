"""
High-Performance Central Limit Order Book (CLOB) Matching Engine
File: server/services/clob_matching_engine.py

Architecture:
- High-frequency in-memory Limit Order Book (LOB) matching engine for Token 9898048483 spot/derivatives pairs.
- Core Pillars:
  1. Price-Time Priority (FIFO) Matching:
     - Orders at the same price level are executed in strict arrival timestamp order.
  2. Diverse Order Types:
     - LIMIT, MARKET, POST_ONLY (maker guarantee), and IMMEDIATE_OR_CANCEL (IOC).
  3. Atomic Settlement & Trade Ledger:
     - Emits structured fill events with maker/taker fee breakdown.
"""

import time
import heapq
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    LIMIT = "LIMIT"
    MARKET = "MARKET"
    POST_ONLY = "POST_ONLY"
    IOC = "IOC"  # Immediate or cancel


@dataclass
class CLOBOrder:
    order_id: str
    trader_address: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    price: float
    quantity: float
    filled_quantity: float = 0.0
    timestamp: float = field(default_factory=time.time)

    @property
    def remaining_quantity(self) -> float:
        return self.quantity - self.filled_quantity


@dataclass
class CLOBTradeFill:
    trade_id: str
    maker_order_id: str
    taker_order_id: str
    symbol: str
    price: float
    quantity: float
    maker_fee_tokens: float
    taker_fee_tokens: float
    timestamp: float = field(default_factory=time.time)


class CLOBMatchingEngine:
    """
    Manages dual-sided bid/ask price ladders and deterministic trade matching.
    """

    MAKER_FEE_RATE = 0.0005  # 5 bps
    TAKER_FEE_RATE = 0.0015  # 15 bps

    def __init__(self, symbol: str = "TOKEN9898/USDC") -> None:
        self.symbol = symbol
        self.lock = threading.RLock()
        self.bids: List[CLOBOrder] = []  # Sorted descending by price
        self.asks: List[CLOBOrder] = []  # Sorted ascending by price
        self.orders: Dict[str, CLOBOrder] = {}
        self.trades: List[CLOBTradeFill] = []

    def place_order(
        self,
        trader: str,
        side: OrderSide,
        order_type: OrderType,
        price: float,
        quantity: float,
    ) -> Tuple[CLOBOrder, List[CLOBTradeFill]]:
        """
        Places a new order, matches against opposite book, and settles fills.
        """
        with self.lock:
            if quantity <= 0:
                raise ValueError("Quantity must be positive.")
            if order_type != OrderType.MARKET and price <= 0:
                raise ValueError("Price must be positive for limit orders.")

            order_id = f"order_{secrets.token_hex(6)}"
            order = CLOBOrder(
                order_id=order_id,
                trader_address=trader,
                symbol=self.symbol,
                side=side,
                order_type=order_type,
                price=price,
                quantity=quantity,
            )
            self.orders[order_id] = order

            fills = self._match_order(order)
            return order, fills

    def _match_order(self, taker_order: CLOBOrder) -> List[CLOBTradeFill]:
        fills: List[CLOBTradeFill] = []

        if taker_order.side == OrderSide.BUY:
            # Match against asks (lowest price first)
            while self.asks and taker_order.remaining_quantity > 0:
                best_ask = self.asks[0]
                if taker_order.order_type != OrderType.MARKET and taker_order.price < best_ask.price:
                    break  # Limit price condition not met

                if taker_order.order_type == OrderType.POST_ONLY:
                    # Post-only rejected if it would cross the spread
                    taker_order.quantity = taker_order.filled_quantity  # Cancel remaining
                    break

                matched_qty = min(taker_order.remaining_quantity, best_ask.remaining_quantity)
                execution_price = best_ask.price

                fill = self._execute_fill(maker=best_ask, taker=taker_order, price=execution_price, qty=matched_qty)
                fills.append(fill)

                if best_ask.remaining_quantity <= 1e-8:
                    self.asks.pop(0)

            # Rest remaining limit order if not IOC
            if taker_order.remaining_quantity > 1e-8 and taker_order.order_type not in (OrderType.MARKET, OrderType.IOC):
                self.bids.append(taker_order)
                self.bids.sort(key=lambda o: (-o.price, o.timestamp))

        else:  # SELL
            # Match against bids (highest price first)
            while self.bids and taker_order.remaining_quantity > 0:
                best_bid = self.bids[0]
                if taker_order.order_type != OrderType.MARKET and taker_order.price > best_bid.price:
                    break

                if taker_order.order_type == OrderType.POST_ONLY:
                    taker_order.quantity = taker_order.filled_quantity
                    break

                matched_qty = min(taker_order.remaining_quantity, best_bid.remaining_quantity)
                execution_price = best_bid.price

                fill = self._execute_fill(maker=best_bid, taker=taker_order, price=execution_price, qty=matched_qty)
                fills.append(fill)

                if best_bid.remaining_quantity <= 1e-8:
                    self.bids.pop(0)

            if taker_order.remaining_quantity > 1e-8 and taker_order.order_type not in (OrderType.MARKET, OrderType.IOC):
                self.asks.append(taker_order)
                self.asks.sort(key=lambda o: (o.price, o.timestamp))

        return fills

    def _execute_fill(self, maker: CLOBOrder, taker: CLOBOrder, price: float, qty: float) -> CLOBTradeFill:
        maker.filled_quantity += qty
        taker.filled_quantity += qty

        trade_notional = qty * price
        maker_fee = trade_notional * self.MAKER_FEE_RATE
        taker_fee = trade_notional * self.TAKER_FEE_RATE

        fill = CLOBTradeFill(
            trade_id=f"trade_{secrets.token_hex(6)}",
            maker_order_id=maker.order_id,
            taker_order_id=taker.order_id,
            symbol=self.symbol,
            price=price,
            quantity=qty,
            maker_fee_tokens=round(maker_fee, 4),
            taker_fee_tokens=round(taker_fee, 4),
        )
        self.trades.append(fill)
        return fill


# Global CLOB Matching Engine Singleton
clob_engine = CLOBMatchingEngine()
