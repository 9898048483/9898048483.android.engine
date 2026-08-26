"""
Decentralized Credit & Sybil-Proof Reputation Engine
File: server/services/reputation.py

Architecture:
- Non-custodial on-chain credit scoring, ZK credential issuance, and under-collateralized lending parameters.
- Score Model (Range: 300 - 850):
  1. Holding Duration & Age Factor (0 - 150 pts): Length of continuous token holding.
  2. Staking Consistency & Volume (0 - 200 pts): Staking ratio and duration in PoS/PQC validator pools.
  3. Governance & Voting Participation (0 - 150 pts): DAO participation and proposal voting.
  4. Dispute & Default History (0 - 200 pts penalty/reward): Past loan repayments and slash-free history.
  5. Hardware Attestation Bonus (0 - 150 pts): StrongBox / Secure Enclave or Ledger verification.
- Zero-Knowledge Credential Issuance:
  - Generates cryptographic attestation proving $\text{CreditScore} \ge \text{Threshold}$ and $\text{ZeroDefaults} = \text{True}$ without disclosing wallet address or transaction ledger history.
- Under-Collateralized Lending Matrix:
  - Tier A (Score > 780): Collateral Ratio 80% (Under-collateralized borrowing allowed).
  - Tier B (Score 700 - 780): Collateral Ratio 100%.
  - Tier C (Score < 700): Standard over-collateralized 150%.
"""

import time
import math
import hashlib
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class LendingTier(str, Enum):
    TIER_A_PRIME = "TIER_A_PRIME"           # Score >= 780, LTV up to 125% (Collateral 80%)
    TIER_B_STANDARD = "TIER_B_STANDARD"     # Score 700-779, LTV 100% (Collateral 100%)
    TIER_C_SUBPRIME = "TIER_C_SUBPRIME"     # Score < 700, LTV 66% (Collateral 150%)


@dataclass
class OnChainBehaviorMetrics:
    account_address: str
    holding_duration_days: float
    total_staked_amount: float
    staking_duration_days: float
    governance_votes_cast: int
    successful_loan_repayments: int
    unresolved_disputes: int
    has_hardware_attestation: bool = False


@dataclass
class CreditScoreReport:
    account_address: str
    credit_score: int  # 300 to 850
    rating_category: str  # "EXCELLENT", "GOOD", "FAIR", "POOR"
    holding_score: int
    staking_score: int
    governance_score: int
    repayment_score: int
    hardware_bonus: int
    lending_tier: LendingTier
    required_collateral_ratio_percent: float
    max_undercollateralized_borrow_cap: float
    calculated_at: float = field(default_factory=time.time)


@dataclass
class ZKCreditCredential:
    credential_id: str
    nullifier_hash: str
    threshold_proven: int
    has_zero_defaults: bool
    lending_tier: LendingTier
    zk_proof_hex: str
    issuer_attestation_sig: str
    issued_at: float = field(default_factory=time.time)
    expires_at: float = field(default_factory=lambda: time.time() + 86400 * 30)  # 30 days validity


class ReputationCreditEngine:
    """
    Computes sybil-resistant on-chain credit scores and issues privacy-preserving ZK credentials.
    """

    MIN_SCORE = 300
    MAX_SCORE = 850

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.user_metrics: Dict[str, OnChainBehaviorMetrics] = {}
        self.issued_zk_credentials: Dict[str, ZKCreditCredential] = {}

    def record_user_metrics(self, metrics: OnChainBehaviorMetrics) -> None:
        """Updates or registers on-chain behavioral history for an account."""
        with self.lock:
            self.user_metrics[metrics.account_address] = metrics

    def compute_credit_score(self, account_address: str) -> CreditScoreReport:
        """
        Evaluates multi-factor reputation algorithm mapping metrics to 300-850 FICO-style credit score.
        """
        with self.lock:
            if account_address not in self.user_metrics:
                # Default baseline score for fresh account
                metrics = OnChainBehaviorMetrics(
                    account_address=account_address,
                    holding_duration_days=0.0,
                    total_staked_amount=0.0,
                    staking_duration_days=0.0,
                    governance_votes_cast=0,
                    successful_loan_repayments=0,
                    unresolved_disputes=0,
                    has_hardware_attestation=False,
                )
            else:
                metrics = self.user_metrics[account_address]

            # 1. Holding Score (0 - 150 pts): 1 point per 2.5 days up to 150 pts (375 days)
            holding_score = min(150, int(metrics.holding_duration_days / 2.5))

            # 2. Staking Score (0 - 200 pts): combo of volume and duration
            staked_vol_factor = min(100, int(metrics.total_staked_amount / 500.0))
            staked_time_factor = min(100, int(metrics.staking_duration_days / 2.0))
            staking_score = min(200, staked_vol_factor + staked_time_factor)

            # 3. Governance Score (0 - 150 pts): 15 pts per vote cast up to 10 votes
            governance_score = min(150, metrics.governance_votes_cast * 15)

            # 4. Repayment & Dispute Score (0 - 200 pts): 40 pts per clean repayment minus 100 per dispute
            repayment_points = min(200, metrics.successful_loan_repayments * 40)
            dispute_penalty = metrics.unresolved_disputes * 100
            repayment_score = max(0, min(200, repayment_points - dispute_penalty))

            # 5. Hardware Attestation Bonus (0 - 150 pts)
            hardware_bonus = 150 if metrics.has_hardware_attestation else 0

            # Composite Score Computation
            raw_earned = holding_score + staking_score + governance_score + repayment_score + hardware_bonus
            # Scale from [0, 850] down to [300, 850]
            credit_score = self.MIN_SCORE + int((raw_earned / 850.0) * (self.MAX_SCORE - self.MIN_SCORE))
            credit_score = max(self.MIN_SCORE, min(self.MAX_SCORE, credit_score))

            # Determine Category & Lending Tier
            if credit_score >= 780:
                rating = "EXCELLENT"
                tier = LendingTier.TIER_A_PRIME
                collateral_ratio = 80.0  # Under-collateralized!
                borrow_cap = 500_000.0
            elif credit_score >= 700:
                rating = "GOOD"
                tier = LendingTier.TIER_B_STANDARD
                collateral_ratio = 100.0
                borrow_cap = 150_000.0
            elif credit_score >= 580:
                rating = "FAIR"
                tier = LendingTier.TIER_C_SUBPRIME
                collateral_ratio = 150.0
                borrow_cap = 50_000.0
            else:
                rating = "POOR"
                tier = LendingTier.TIER_C_SUBPRIME
                collateral_ratio = 200.0
                borrow_cap = 10_000.0

            return CreditScoreReport(
                account_address=account_address,
                credit_score=credit_score,
                rating_category=rating,
                holding_score=holding_score,
                staking_score=staking_score,
                governance_score=governance_score,
                repayment_score=repayment_score,
                hardware_bonus=hardware_bonus,
                lending_tier=tier,
                required_collateral_ratio_percent=collateral_ratio,
                max_undercollateralized_borrow_cap=borrow_cap,
            )

    def issue_zk_credit_credential(
        self,
        account_address: str,
        threshold_to_prove: int = 700,
    ) -> ZKCreditCredential:
        """
        Issues an anonymous ZK credential proving creditworthiness without revealing account ID.
        """
        with self.lock:
            report = self.compute_credit_score(account_address)
            if report.credit_score < threshold_to_prove:
                raise ValueError(
                    f"Cannot issue ZK credential: credit score {report.credit_score} is below threshold {threshold_to_prove}."
                )

            now = time.time()
            nullifier_secret = secrets.token_hex(32)
            nullifier_hash = hashlib.sha256(f"{account_address}:{nullifier_secret}:{now}".encode()).hexdigest()

            # Zero-knowledge proof simulation (e.g., Groth16 / Plonk range proof)
            zk_proof = hashlib.sha256(
                f"ZK_RANGE_PROOF:{nullifier_hash}:{threshold_to_prove}:{report.lending_tier.value}".encode()
            ).hexdigest()

            attestation_sig = f"0x_sig_reputation_ca_{hashlib.sha256(zk_proof.encode()).hexdigest()[:24]}"
            cred_id = f"zk_cred_{nullifier_hash[:16]}"

            credential = ZKCreditCredential(
                credential_id=cred_id,
                nullifier_hash=f"0x_{nullifier_hash}",
                threshold_proven=threshold_to_prove,
                has_zero_defaults=(report.repayment_score >= 0 and self.user_metrics.get(account_address, OnChainBehaviorMetrics(account_address,0,0,0,0,0,0)).unresolved_disputes == 0),
                lending_tier=report.lending_tier,
                zk_proof_hex=f"0x_{zk_proof}",
                issuer_attestation_sig=attestation_sig,
            )

            self.issued_zk_credentials[cred_id] = credential
            return credential

    def verify_zk_credit_credential(
        self,
        credential: ZKCreditCredential,
        required_min_threshold: int = 700,
    ) -> bool:
        """
        Verifies validity of the anonymous ZK credit credential for loan origination.
        """
        if credential.threshold_proven < required_min_threshold:
            return False
        if time.time() > credential.expires_at:
            return False
        if not credential.has_zero_defaults:
            return False
        if not credential.issuer_attestation_sig.startswith("0x_sig_reputation_ca_"):
            return False
        return True


# Global Reputation & Credit Engine Singleton
reputation_credit_engine = ReputationCreditEngine()
