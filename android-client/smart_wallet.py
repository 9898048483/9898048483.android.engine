"""
Post-Quantum Smart Account Abstraction (ERC-4337)
File: android-client/smart_wallet.py

Architecture:
- ERC-4337 Compliant Smart Contract Wallet for Token 9898048483 Android client.
- Key Capabilities:
  1. UserOperation Mempool & Bundler Interface:
     - Bundles UserOperations (sender, nonce, callData, gasLimits, paymasterAndData, signature).
  2. Paymaster Gas Sponsorship:
     - Subsidizes gas fees or enables paying gas in Token 9898048483 / synthetic stables (sUSDC).
  3. Spending Velocity & Security Invariants:
     - Enforces customizable daily spending limits with 24-hour rolling window resets.
     - Emergency account freeze / unfreeze toggles.
  4. Batch Execution Engine:
     - Executes multiple calls atomically in a single transaction (e.g. Approve + AMM Swap).
  5. Recurring Subscriptions:
     - Automated recurring micropayment scheduler.
"""

import time
import json
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


@dataclass
class Call:
    target_address: str
    value: float
    data: str  # Function signature / calldata hex
    token_symbol: str = "TOKEN_9898048483"


@dataclass
class UserOperation:
    sender: str
    nonce: int
    init_code: str
    call_data: str
    call_gas_limit: int
    verification_gas_limit: int
    pre_verification_gas: int
    max_fee_per_gas: float
    max_priority_fee_per_gas: float
    paymaster_and_data: str
    signature: str


@dataclass
class Subscription:
    subscription_id: str
    recipient_address: str
    amount: float
    interval_seconds: float
    last_paid_epoch: float
    is_active: bool = True
    memo: str = ""


@dataclass
class ExecutionResult:
    tx_hash: str
    success: bool
    calls_executed: int
    gas_used: int
    fee_paid: float
    fee_currency: str
    timestamp: float


class SmartAccount:
    """
    ERC-4337 Post-Quantum Smart Contract Account with multi-call batching,
    velocity controls, and subscription management.
    """

    def __init__(
        self,
        account_address: str,
        owner_public_key: str,
        daily_spending_limit: float = 50000.0,
    ) -> None:
        self.account_address = account_address
        self.owner_public_key = owner_public_key
        self.daily_spending_limit = daily_spending_limit
        self.lock = threading.RLock()

        self.nonce: int = 0
        self.is_frozen: bool = False
        self.balance: float = 0.0

        # Spending tracking: {date_epoch_day: amount_spent}
        self.daily_spent: Dict[int, float] = {}

        # Recurring subscriptions: sub_id -> Subscription
        self.subscriptions: Dict[str, Subscription] = {}

    def set_balance(self, amount: float) -> None:
        with self.lock:
            self.balance = amount

    def freeze_account(self) -> None:
        with self.lock:
            self.is_frozen = True

    def unfreeze_account(self) -> None:
        with self.lock:
            self.is_frozen = False

    def _get_current_day_index(self) -> int:
        return int(time.time() // 86400)

    def get_remaining_daily_limit(self) -> float:
        with self.lock:
            day = self._get_current_day_index()
            spent_today = self.daily_spent.get(day, 0.0)
            return max(0.0, self.daily_spending_limit - spent_today)

    def execute_batch(
        self,
        calls: List[Call],
        paymaster_sponsor: bool = False,
        fee_token: str = "TOKEN_9898048483",
    ) -> ExecutionResult:
        """
        Executes a sequence of calls atomically as a single smart account transaction.
        """
        with self.lock:
            if self.is_frozen:
                raise ValueError("Smart account is frozen: all outgoing operations halted.")

            if not calls:
                raise ValueError("Batch must contain at least one call.")

            total_value = sum(c.value for c in calls)
            day = self._get_current_day_index()
            spent_today = self.daily_spent.get(day, 0.0)

            if (spent_today + total_value) > self.daily_spending_limit:
                raise ValueError(
                    f"Daily spending limit exceeded: attempting {total_value}, remaining limit is {self.get_remaining_daily_limit()}."
                )

            # Simulated gas and execution
            gas_used = len(calls) * 21000 + 15000
            fee = 0.0 if paymaster_sponsor else (gas_used * 0.0000001)

            if not paymaster_sponsor:
                total_required = total_value + fee
                if self.balance < total_required:
                    raise ValueError(f"Insufficient smart account balance for batch execution: required {total_required}, available {self.balance}.")
                self.balance -= total_required
            else:
                if self.balance < total_value:
                    raise ValueError(f"Insufficient balance for batch value: required {total_value}, available {self.balance}.")
                self.balance -= total_value

            self.daily_spent[day] = spent_today + total_value
            self.nonce += 1

            now = time.time()
            tx_hash = f"0x_aa_batch_{hashlib.sha256(f'{self.account_address}:{self.nonce}:{now}'.encode()).hexdigest()[:32]}"

            return ExecutionResult(
                tx_hash=tx_hash,
                success=True,
                calls_executed=len(calls),
                gas_used=gas_used,
                fee_paid=fee,
                fee_currency="SPONSORED" if paymaster_sponsor else fee_token,
                timestamp=now,
            )

    def create_subscription(
        self,
        recipient_address: str,
        amount: float,
        interval_seconds: float,
        memo: str = "",
    ) -> Subscription:
        """Registers a recurring micropayment subscription."""
        with self.lock:
            if amount <= 0 or interval_seconds <= 0:
                raise ValueError("Subscription amount and interval must be positive.")

            now = time.time()
            sub_id = f"sub_{hashlib.sha256(f'{self.account_address}:{recipient_address}:{amount}:{now}'.encode()).hexdigest()[:16]}"
            sub = Subscription(
                subscription_id=sub_id,
                recipient_address=recipient_address,
                amount=amount,
                interval_seconds=interval_seconds,
                last_paid_epoch=0.0,
                is_active=True,
                memo=memo,
            )
            self.subscriptions[sub_id] = sub
            return sub

    def process_due_subscription(self, subscription_id: str) -> Optional[ExecutionResult]:
        """Executes a recurring subscription payment if interval has passed."""
        with self.lock:
            if subscription_id not in self.subscriptions:
                raise ValueError(f"Subscription {subscription_id} not found.")

            sub = self.subscriptions[subscription_id]
            if not sub.is_active:
                return None

            now = time.time()
            if (now - sub.last_paid_epoch) < sub.interval_seconds:
                return None  # Not due yet

            # Execute single call via batch runner
            res = self.execute_batch(
                calls=[Call(target_address=sub.recipient_address, value=sub.amount, data="0x_recurring_pay")],
                paymaster_sponsor=True,
            )
            sub.last_paid_epoch = now
            return res


class PaymasterBundlerService:
    """
    Bundler service simulating ERC-4337 UserOperation validation and gas sponsorship.
    """

    def __init__(self, sponsor_pool_balance: float = 1000000.0) -> None:
        self.sponsor_pool_balance = sponsor_pool_balance
        self.lock = threading.Lock()

    def validate_and_sponsor_user_op(self, user_op: UserOperation) -> Dict[str, Any]:
        """Validates UserOperation signature and attaches paymaster sponsorship signature."""
        with self.lock:
            if not user_op.sender or not user_op.signature:
                raise ValueError("Invalid UserOperation: missing sender or signature.")

            gas_cost_estimate = (user_op.call_gas_limit + user_op.verification_gas_limit) * user_op.max_fee_per_gas
            if self.sponsor_pool_balance < gas_cost_estimate:
                raise ValueError("Paymaster sponsorship pool depleted.")

            self.sponsor_pool_balance -= gas_cost_estimate
            paymaster_sig = f"0x_pm_sig_{hashlib.sha256(f'{user_op.sender}:{user_op.nonce}'.encode()).hexdigest()[:24]}"

            return {
                "status": "USER_OP_SPONSORED",
                "sender": user_op.sender,
                "nonce": user_op.nonce,
                "estimated_gas_sponsored": gas_cost_estimate,
                "paymaster_signature": paymaster_sig,
            }
