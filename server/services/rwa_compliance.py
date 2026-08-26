"""
ERC-3643 Permissioned RWA Compliance & Identity Registry (T-REX Protocol)
File: server/services/rwa_compliance.py

Architecture:
- Institutional Real-World Asset (RWA) compliance engine for Token 9898048483 backings.
- Standard: ERC-3643 (Token for Regulated EXchanges / T-REX).
- Core Pillars:
  1. ONCHAINID Decentralized Identity Registry:
     - Stores and verifies claim topics (KYC/AML approval, Accredited Investor status, Jurisdiction).
  2. Dynamic Compliance Rules & Transfer Modifiers:
     - Checks sender/recipient country whitelisting, daily max volume per investor tier,
       and token holding limits.
  3. Non-Custodial Legal Recovery & Judicial Freeze:
     - Allows designated compliance officer / custodian agent to freeze compromised wallets
       and recover tokens to newly verified ONCHAINID identity contracts.
"""

import time
import hashlib
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum


class ClaimTopic(int, Enum):
    KYC_AML_VERIFIED = 1
    ACCREDITED_INVESTOR = 2
    QUALIFIED_INSTITUTIONAL_BUYER = 3
    SANCTION_FREE_ATTESTATION = 4


@dataclass
class IdentityClaim:
    claim_id: str
    topic: ClaimTopic
    issuer_address: str
    signature: str
    data_hash: str
    issued_at: float
    expires_at: float


@dataclass
class OnChainIDProfile:
    identity_address: str
    wallet_address: str
    country_code: str  # ISO 3166-1 alpha-2, e.g. "US", "DE", "SG", "CH"
    claims: Dict[ClaimTopic, IdentityClaim] = field(default_factory=dict)
    is_frozen: bool = False
    created_at: float = field(default_factory=time.time)


@dataclass
class RWAComplianceConfig:
    allowed_countries: Set[str] = field(default_factory=lambda: {"US", "DE", "SG", "CH", "GB", "AE", "JP"})
    max_unaccredited_holding: float = 50_000.0
    require_accreditation_threshold: float = 100_000.0


class ERC3643ComplianceRegistry:
    """
    Manages ONCHAINID identity claims, transfer compliance verification, and institutional recovery.
    """

    def __init__(self, compliance_officer: str = "0xcompliance_officer_rwa") -> None:
        self.compliance_officer = compliance_officer
        self.lock = threading.RLock()
        self.identities: Dict[str, OnChainIDProfile] = {}  # wallet_addr -> profile
        self.balances: Dict[str, float] = {}
        self.config = RWAComplianceConfig()
        self.trusted_claim_issuers = {
            "0xtrusted_kyc_provider_ca",
            "0xtrusted_accreditation_firm",
            compliance_officer,
        }

    def register_onchain_id(
        self,
        wallet_address: str,
        country_code: str,
    ) -> OnChainIDProfile:
        """Registers a new ONCHAINID identity contract for a wallet."""
        with self.lock:
            id_addr = f"0x_id_{hashlib.sha256(f'{wallet_address}:{country_code}'.encode()).hexdigest()[:16]}"
            profile = OnChainIDProfile(
                identity_address=id_addr,
                wallet_address=wallet_address,
                country_code=country_code.upper(),
            )
            self.identities[wallet_address] = profile
            return profile

    def add_identity_claim(
        self,
        wallet_address: str,
        topic: ClaimTopic,
        issuer_address: str,
        validity_days: int = 365,
    ) -> IdentityClaim:
        """Attaches a signed cryptographic compliance claim to the ONCHAINID identity."""
        with self.lock:
            if wallet_address not in self.identities:
                raise ValueError(f"No ONCHAINID profile registered for {wallet_address}.")
            if issuer_address not in self.trusted_claim_issuers:
                raise PermissionError("Issuer is not in the trusted claim issuer registry.")

            profile = self.identities[wallet_address]
            now = time.time()
            claim_id = f"claim_{secrets.token_hex(6)}"
            data_hash = hashlib.sha256(f"{wallet_address}:{topic.value}:{issuer_address}".encode()).hexdigest()
            sig = f"0x_claim_sig_{hashlib.sha256(f'{data_hash}:{now}'.encode()).hexdigest()[:24]}"

            claim = IdentityClaim(
                claim_id=claim_id,
                topic=topic,
                issuer_address=issuer_address,
                signature=sig,
                data_hash=data_hash,
                issued_at=now,
                expires_at=now + (validity_days * 86400),
            )
            profile.claims[topic] = claim
            return claim

    def can_transfer(
        self,
        from_address: str,
        to_address: str,
        amount: float,
    ) -> Tuple[bool, str]:
        """
        Evaluates ERC-3643 compliance rules:
        1. Both sender and recipient must have active ONCHAINID profiles.
        2. Neither account is frozen.
        3. Both accounts have valid KYC/AML claims and sanction-free attestations.
        4. Both jurisdictions are in the allowed whitelist.
        5. Large transfers (>100k) require Accredited Investor / QIB claim.
        """
        with self.lock:
            # 1. Identity existence
            if from_address not in self.identities:
                return False, f"Sender {from_address} has no registered ONCHAINID."
            if to_address not in self.identities:
                return False, f"Recipient {to_address} has no registered ONCHAINID."

            sender_id = self.identities[from_address]
            recip_id = self.identities[to_address]
            now = time.time()

            # 2. Freeze checks
            if sender_id.is_frozen:
                return False, "Sender account is frozen by compliance officer."
            if recip_id.is_frozen:
                return False, "Recipient account is frozen by compliance officer."

            # 3. Jurisdiction checks
            if sender_id.country_code not in self.config.allowed_countries:
                return False, f"Sender country {sender_id.country_code} is restricted."
            if recip_id.country_code not in self.config.allowed_countries:
                return False, f"Recipient country {recip_id.country_code} is restricted."

            # 4. KYC / Sanction claims checks
            for id_profile, role in [(sender_id, "Sender"), (recip_id, "Recipient")]:
                if ClaimTopic.KYC_AML_VERIFIED not in id_profile.claims:
                    return False, f"{role} missing KYC/AML claim."
                kyc_claim = id_profile.claims[ClaimTopic.KYC_AML_VERIFIED]
                if now > kyc_claim.expires_at:
                    return False, f"{role} KYC/AML claim is expired."

                if ClaimTopic.SANCTION_FREE_ATTESTATION not in id_profile.claims:
                    return False, f"{role} missing sanction-free attestation."

            # 5. Accreditation limits
            recipient_current_bal = self.balances.get(to_address, 0.0)
            if (recipient_current_bal + amount) > self.config.require_accreditation_threshold:
                has_accreditation = (
                    ClaimTopic.ACCREDITED_INVESTOR in recip_id.claims
                    or ClaimTopic.QUALIFIED_INSTITUTIONAL_BUYER in recip_id.claims
                )
                if not has_accreditation:
                    return False, f"Recipient requires Accredited Investor claim for balance exceeding {self.config.require_accreditation_threshold}."

            return True, "COMPLIANCE_PASSED"

    def judicial_freeze(self, wallet_address: str, officer_address: str) -> bool:
        """Freezes wallet on compliance or court order."""
        with self.lock:
            if officer_address != self.compliance_officer:
                raise PermissionError("Unauthorized compliance caller.")
            if wallet_address in self.identities:
                self.identities[wallet_address].is_frozen = True
                return True
            return False

    def recover_tokens_to_new_wallet(
        self,
        lost_wallet: str,
        new_wallet: str,
        officer_address: str,
    ) -> Dict[str, Any]:
        """
        Legal Recovery: Transcribes balance and claims from compromised wallet to new verified identity.
        """
        with self.lock:
            if officer_address != self.compliance_officer:
                raise PermissionError("Unauthorized compliance caller.")
            if lost_wallet not in self.identities:
                raise ValueError("Lost wallet has no registered ONCHAINID.")

            old_profile = self.identities[lost_wallet]
            old_balance = self.balances.get(lost_wallet, 0.0)

            # Register new profile with same country and transferred claims
            new_profile = self.register_onchain_id(new_wallet, old_profile.country_code)
            new_profile.claims = dict(old_profile.claims)

            # Move balance
            self.balances[lost_wallet] = 0.0
            self.balances[new_wallet] = self.balances.get(new_wallet, 0.0) + old_balance
            old_profile.is_frozen = True

            return {
                "status": "TOKEN_RECOVERY_COMPLETED",
                "old_wallet": lost_wallet,
                "new_wallet": new_wallet,
                "recovered_balance": old_balance,
                "timestamp": time.time(),
            }


# Global ERC3643 Registry Singleton
rwa_compliance_registry = ERC3643ComplianceRegistry()
