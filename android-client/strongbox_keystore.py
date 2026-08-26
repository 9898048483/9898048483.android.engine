"""
Android StrongBox KeyStore & Biometric Hardware Attestation
File: android-client/strongbox_keystore.py

Architecture:
- High-assurance mobile hardware key isolation for Token 9898048483 Android client.
- Target: Android Keymaster 4.0+ / StrongBox KeyMint HAL (Dedicated Secure Element / Titan M2).
- Core Pillars:
  1. StrongBox Hardware Key Isolation:
     - Keys are generated directly inside dedicated physical tamper-resistant hardware (ISO 7816 / Common Criteria EAL5+).
     - Private keys never touch RAM, Android OS, or application memory.
  2. Biometric Hardware Prompt Gating:
     - Requires hardware-enforced User Authentication (`setUserAuthenticationRequired(true)`).
     - Enforces BiometricPrompt (Class 3 Strong Biometrics - Fingerprint / 3D Face Unlock) per transaction.
  3. X.509 Key Attestation Certificate Chain:
     - Extracts hardware root-of-trust certificate chain back to Google Attestation Root CA.
     - Verifies `attestationSecurityLevel == StrongBox` and `bootState == Verified`.
"""

import time
import hashlib
import secrets
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class SecurityLevel(str, Enum):
    SOFTWARE = "SOFTWARE"
    TRUSTED_EXECUTION_ENVIRONMENT = "TRUSTED_EXECUTION_ENVIRONMENT"
    STRONGBOX = "STRONGBOX"


class BootState(str, Enum):
    VERIFIED = "VERIFIED"
    SELF_SIGNED = "SELF_SIGNED"
    UNVERIFIED = "UNVERIFIED"


@dataclass
class HardwareKeyAttestationRecord:
    key_alias: str
    public_key_hex: str
    security_level: SecurityLevel
    attestation_challenge: str
    verified_boot_state: BootState
    is_user_auth_required: bool
    user_auth_timeout_seconds: int
    attestation_certificate_chain: List[str]
    created_at: float = field(default_factory=time.time)


@dataclass
class BiometricAuthSignatureResult:
    signature_hex: str
    key_alias: str
    signed_payload_hash: str
    biometric_auth_token: str
    timestamp: float = field(default_factory=time.time)


class AndroidStrongBoxKeyStore:
    """
    Simulates Android StrongBox KeyStore KeyMint HAL hardware cryptographic interface.
    """

    GOOGLE_ROOT_CA_CERT = "0x_cert_google_hardware_attestation_root_ca_2026"

    def __init__(self) -> None:
        self.hardware_vault: Dict[str, HardwareKeyAttestationRecord] = {}
        self.device_boot_state: BootState = BootState.VERIFIED

    def generate_strongbox_key_pair(
        self,
        alias: str,
        attestation_challenge: str,
        require_biometrics: bool = True,
        auth_timeout: int = 0,  # 0 = Auth required for every single sign operation
    ) -> HardwareKeyAttestationRecord:
        """
        Generates an asymmetric keypair inside StrongBox dedicated Secure Element.
        """
        if not attestation_challenge:
            raise ValueError("Attestation challenge is mandatory for StrongBox key generation.")

        # Simulate hardware key generation inside Titan M2 / Secure Element
        raw_seed = f"STRONGBOX_HW_KEY_{alias}_{secrets.token_hex(16)}"
        pubkey = f"04_strongbox_pub_{hashlib.sha256(raw_seed.encode()).hexdigest()}"

        # Build X.509 attestation certificate chain simulation
        cert_leaf = f"0x_cert_leaf_key_{alias}_{hashlib.sha256(pubkey.encode()).hexdigest()[:16]}"
        cert_intermediate = "0x_cert_google_strongbox_intermediate_ca"
        cert_chain = [cert_leaf, cert_intermediate, self.GOOGLE_ROOT_CA_CERT]

        record = HardwareKeyAttestationRecord(
            key_alias=alias,
            public_key_hex=pubkey,
            security_level=SecurityLevel.STRONGBOX,
            attestation_challenge=attestation_challenge,
            verified_boot_state=self.device_boot_state,
            is_user_auth_required=require_biometrics,
            user_auth_timeout_seconds=auth_timeout,
            attestation_certificate_chain=cert_chain,
        )

        self.hardware_vault[alias] = record
        return record

    def verify_key_attestation(self, record: HardwareKeyAttestationRecord, expected_challenge: str) -> bool:
        """
        Verifies StrongBox hardware key attestation against Google Root of Trust.
        """
        # 1. Challenge check
        if record.attestation_challenge != expected_challenge:
            return False
        # 2. StrongBox hardware isolation check
        if record.security_level != SecurityLevel.STRONGBOX:
            return False
        # 3. Boot state verified check (no unlocked bootloader / root tampered)
        if record.verified_boot_state != BootState.VERIFIED:
            return False
        # 4. Certificate chain ends with Google Hardware Root CA
        if record.attestation_certificate_chain[-1] != self.GOOGLE_ROOT_CA_CERT:
            return False

        return True

    def sign_transaction_with_biometrics(
        self,
        key_alias: str,
        transaction_payload: bytes,
        biometric_prompt_authenticated: bool,
    ) -> BiometricAuthSignatureResult:
        """
        Signs transaction in hardware only if biometric prompt authentication was granted.
        """
        if key_alias not in self.hardware_vault:
            raise KeyError(f"Key alias {key_alias} not found in StrongBox KeyStore.")

        record = self.hardware_vault[key_alias]
        if record.is_user_auth_required and not biometric_prompt_authenticated:
            raise PermissionError("Biometric hardware authentication required to authorize StrongBox key use.")

        payload_hash = hashlib.sha256(transaction_payload).hexdigest()
        bio_token = f"0x_hat_{secrets.token_hex(16)}"  # Hardware Auth Token (HAT)
        sig_raw = f"{payload_hash}:{record.public_key_hex}:{bio_token}"
        sig_hex = f"0x_hw_sig_{hashlib.sha256(sig_raw.encode()).hexdigest()}"

        return BiometricAuthSignatureResult(
            signature_hex=sig_hex,
            key_alias=key_alias,
            signed_payload_hash=f"0x_{payload_hash}",
            biometric_auth_token=bio_token,
        )


# Global StrongBox KeyStore Instance
strongbox_keystore = AndroidStrongBoxKeyStore()
