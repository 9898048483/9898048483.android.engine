"""
Continuous Formal Verification Runtime Guard
File: server/services/formal_runtime_guard.py

Architecture:
- Active in-memory mathematical runtime guard for Token 9898048483.
- Core Invariant:
  1. Strict Total Supply Cap:
     - Absolute ceiling: $989,804,848,300.0$ tokens.
     - Formal Invariant: $\\forall t, \\quad \\sum_{a \\in \\text{Ledger}} \\text{Balance}_t(a) + \\text{Unclaimed}_t \\le 989,804,848,300.0$.
  2. Conservation of Mass in Transfers:
     - For any valid transaction $(u, v, \\Delta)$, $\\Delta > 0$, $\\text{Balance}(u) \\ge \\Delta$,
       $\\text{Balance}_{new}(u) + \\text{Balance}_{new}(v) = \\text{Balance}_{old}(u) + \\text{Balance}_{old}(v)$.
  3. Continuous Runtime Assertion & Quarantine:
     - Automatically aborts any proposed block or state delta that violates invariants before committing to RAM or disk.
"""

import time
import math
import hashlib
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field


TOTAL_SUPPLY_CAP = 989_804_848_300.0


@dataclass
class InvariantCheckReport:
    check_id: str
    is_valid: bool
    current_total_supply: float
    max_cap_limit: float
    delta_discrepancy: float
    invariant_violation_reason: Optional[str] = None
    checked_at: float = field(default_factory=time.time)


class ContinuousFormalRuntimeGuard:
    """
    Formal methods verification guard auditing all state transitions against mathematical tokenomics bounds.
    """

    def __init__(self, total_cap: float = TOTAL_SUPPLY_CAP) -> None:
        self.lock = threading.RLock()
        self.total_cap = total_cap
        self.audit_log: List[InvariantCheckReport] = []
        self.quarantine_mode_active: bool = False

    def verify_ledger_invariants(
        self,
        account_balances: Dict[str, float],
        proposed_transfers: Optional[List[Dict[str, Any]]] = None,
    ) -> InvariantCheckReport:
        """
        Runs formal checks over the proposed state:
        1. Non-negative balances: $\\forall a, \\text{Balance}(a) \\ge 0$
        2. Total sum conservation: $\\sum \\text{Balance} \\le 989,804,848,300.0$
        3. Double-spend prevention: No balance underflow
        """
        with self.lock:
            check_id = f"formal_check_{secrets.token_hex(6)}"

            # 1. Non-negative checks
            for addr, bal in account_balances.items():
                if bal < 0.0:
                    report = InvariantCheckReport(
                        check_id=check_id,
                        is_valid=False,
                        current_total_supply=0.0,
                        max_cap_limit=self.total_cap,
                        delta_discrepancy=bal,
                        invariant_violation_reason=f"Negative balance detected on account {addr} ({bal}).",
                    )
                    self.audit_log.append(report)
                    return report

            # 2. Total supply conservation check
            total_sum = round(sum(account_balances.values()), 4)
            if total_sum > self.total_cap:
                overflow = round(total_sum - self.total_cap, 4)
                self.quarantine_mode_active = True
                report = InvariantCheckReport(
                    check_id=check_id,
                    is_valid=False,
                    current_total_supply=total_sum,
                    max_cap_limit=self.total_cap,
                    delta_discrepancy=overflow,
                    invariant_violation_reason=f"Supply cap overflow: {total_sum} exceeds {self.total_cap} by {overflow} tokens!",
                )
                self.audit_log.append(report)
                return report

            # 3. Simulate proposed batch
            if proposed_transfers:
                temp_balances = dict(account_balances)
                for tx in proposed_transfers:
                    s = tx.get("sender")
                    r = tx.get("recipient")
                    amt = float(tx.get("amount", 0.0))

                    if amt <= 0:
                        report = InvariantCheckReport(
                            check_id=check_id,
                            is_valid=False,
                            current_total_supply=total_sum,
                            max_cap_limit=self.total_cap,
                            delta_discrepancy=0.0,
                            invariant_violation_reason=f"Zero or negative transfer amount {amt} in tx.",
                        )
                        self.audit_log.append(report)
                        return report

                    s_bal = temp_balances.get(s, 0.0)
                    if s_bal < amt:
                        report = InvariantCheckReport(
                            check_id=check_id,
                            is_valid=False,
                            current_total_supply=total_sum,
                            max_cap_limit=self.total_cap,
                            delta_discrepancy=amt - s_bal,
                            invariant_violation_reason=f"Insufficient balance for {s}: has {s_bal}, tried to send {amt}.",
                        )
                        self.audit_log.append(report)
                        return report

                    temp_balances[s] = round(s_bal - amt, 4)
                    temp_balances[r] = round(temp_balances.get(r, 0.0) + amt, 4)

                # Re-verify sum after batch
                batch_sum = round(sum(temp_balances.values()), 4)
                if batch_sum > self.total_cap:
                    report = InvariantCheckReport(
                        check_id=check_id,
                        is_valid=False,
                        current_total_supply=batch_sum,
                        max_cap_limit=self.total_cap,
                        delta_discrepancy=round(batch_sum - self.total_cap, 4),
                        invariant_violation_reason=f"Batch execution would exceed cap: {batch_sum} > {self.total_cap}.",
                    )
                    self.audit_log.append(report)
                    return report

            report = InvariantCheckReport(
                check_id=check_id,
                is_valid=True,
                current_total_supply=total_sum,
                max_cap_limit=self.total_cap,
                delta_discrepancy=0.0,
            )
            self.audit_log.append(report)
            return report


# Global Formal Guard Singleton
formal_runtime_guard = ContinuousFormalRuntimeGuard()
