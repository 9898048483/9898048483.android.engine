"""
Quantum Money & Non-Fungible Qubit Tokens (NFT-Q)
File: server/services/quantum_money_engine.py

Architecture:
- Physical cryptographic asset issuance and uncopyable token engine for Token 9898048483.
- Core Pillars:
  1. Wiesner Conjugate-Basis Quantum Money:
     - Based on Stephen Wiesner's theorem and the Quantum No-Cloning Theorem.
     - Each quantum bank note or NFT-Q has a unique public classical serial number $S$ and an array of $n$ physical qubits:
       $|\psi_i\rangle \in \{|0\rangle, |1\rangle, |+\rangle, |-\rangle\}$, chosen randomly across Rectilinear ($+$) and Diagonal ($\times$) bases.
  2. Secret Bank Verification Table:
     - The issuer/central bank maintains a private ledger storing the secret sequence $(b_i, \text{basis}_i)$ for serial $S$.
     - When verifying a note, the bank measures each qubit in its exact preparation basis.
  3. Anti-Counterfeiting & Duplication Collapse Detection:
     - An adversary attempting to clone the note must guess the measurement basis for each qubit.
     - If the adversary measures in the wrong basis (50% probability per qubit), the state collapses into an orthogonal state.
     - Upon subsequent bank verification, each cloned qubit fails with 25% error probability ($P_{\text{success}} = (3/4)^n \approx 0$ for $n \ge 32$).
"""

import time
import math
import random
import hashlib
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field


WIESNER_VERIFICATION_ACCEPTANCE_THRESHOLD = 0.95  # >= 95% match required (accounting for minor channel noise)


@dataclass
class QubitStateSecret:
    qubit_index: int
    bit_value: int    # 0 or 1
    basis: str        # '+' (0 / 90 deg) or 'x' (45 / 135 deg)
    polarization_angle_deg: float


@dataclass
class PhysicalQubitToken:
    serial_number: str
    token_type: str            # "QUANTUM_BANKNOTE" or "NFT_QUBIT"
    denomination_token9898: float
    metadata_uri: Optional[str]
    num_qubits: int
    physical_qubits: List[Dict[str, Any]]  # Simulated physical quantum carrier
    is_spent_or_redeemed: bool = False
    issued_at: float = field(default_factory=time.time)


@dataclass
class QuantumMoneyVerificationResult:
    verification_id: str
    serial_number: str
    total_qubits_tested: int
    matching_qubits_count: int
    verification_fidelity: float
    is_valid_authentic: bool
    is_counterfeit_detected: bool
    rejection_reason: Optional[str] = None
    verified_at: float = field(default_factory=time.time)


class QuantumMoneyEngine:
    """
    Wiesner-style Quantum Money and Non-Fungible Qubit (NFT-Q) issuance and verification engine.
    """

    def __init__(self, default_qubits_per_note: int = 32) -> None:
        self.lock = threading.RLock()
        self.default_qubits = default_qubits_per_note
        # Secret Bank Vault Table: serial_number -> List[QubitStateSecret]
        self._bank_secret_table: Dict[str, List[QubitStateSecret]] = {}
        # Active circulating notes: serial_number -> PhysicalQubitToken
        self.circulating_tokens: Dict[str, PhysicalQubitToken] = {}
        self.verification_history: List[QuantumMoneyVerificationResult] = []

    def mint_quantum_banknote(
        self,
        denomination: float,
        token_type: str = "QUANTUM_BANKNOTE",
        metadata_uri: Optional[str] = None,
        num_qubits: Optional[int] = None,
    ) -> PhysicalQubitToken:
        """
        Mints a new Quantum Banknote or NFT-Q with unique serial number $S$ and $n$ conjugate-basis qubits.
        """
        with self.lock:
            n = num_qubits or self.default_qubits
            serial = f"QM9898_{secrets.token_hex(8).upper()}"

            secret_records: List[QubitStateSecret] = []
            physical_qubit_carriers: List[Dict[str, Any]] = []

            for i in range(n):
                bit = secrets.randbelow(2)
                basis = random.choice(['+', 'x'])

                if basis == '+':
                    angle = 0.0 if bit == 0 else 90.0
                else:
                    angle = 45.0 if bit == 0 else 135.0

                secret = QubitStateSecret(
                    qubit_index=i,
                    bit_value=bit,
                    basis=basis,
                    polarization_angle_deg=angle,
                )
                secret_records.append(secret)

                # The physical qubit held by user
                carrier = {
                    "qubit_id": i,
                    "state_vector_angle_deg": angle,
                    "is_collapsed": False,
                }
                physical_qubit_carriers.append(carrier)

            # Store secret verification recipe in bank vault
            self._bank_secret_table[serial] = secret_records

            token = PhysicalQubitToken(
                serial_number=serial,
                token_type=token_type,
                denomination_token9898=denomination,
                metadata_uri=metadata_uri,
                num_qubits=n,
                physical_qubits=physical_qubit_carriers,
            )

            self.circulating_tokens[serial] = token
            return token

    def mint_nft_qubit(
        self,
        nft_title: str,
        metadata_uri: str,
        num_qubits: int = 64,
    ) -> PhysicalQubitToken:
        """Mints an uncopyable Non-Fungible Qubit (NFT-Q) digital artwork/asset."""
        return self.mint_quantum_banknote(
            denomination=1.0,
            token_type="NFT_QUBIT",
            metadata_uri=metadata_uri,
            num_qubits=num_qubits,
        )

    def attempt_counterfeit_cloning(
        self,
        token: PhysicalQubitToken,
    ) -> Tuple[PhysicalQubitToken, PhysicalQubitToken]:
        """
        Simulates an adversary attempting to duplicate the quantum note without knowing the secret basis table.
        Due to the No-Cloning Theorem, measuring in random bases collapses the wavefunctions,
        corrupting both original and clone with ~25% error probability per qubit.
        """
        with self.lock:
            clone_qubits: List[Dict[str, Any]] = []
            tampered_orig_qubits: List[Dict[str, Any]] = []

            for q in token.physical_qubits:
                guessed_basis = random.choice(['+', 'x'])
                orig_angle = q["state_vector_angle_deg"]

                # If original was in '+', angles are 0 (0) or 90 (1)
                # If guessed basis matches, measurement is perfect.
                # If guessed basis is wrong, outcome is 50/50 and state collapses to the guessed basis!
                if guessed_basis == '+':
                    if orig_angle in [0.0, 90.0]:
                        measured_bit = 0 if orig_angle == 0.0 else 1
                    else:
                        measured_bit = secrets.randbelow(2)
                    new_angle = 0.0 if measured_bit == 0 else 90.0
                else:  # guessed 'x'
                    if orig_angle in [45.0, 135.0]:
                        measured_bit = 0 if orig_angle == 45.0 else 1
                    else:
                        measured_bit = secrets.randbelow(2)
                    new_angle = 45.0 if measured_bit == 0 else 135.0

                # Both original and clone are now collapsed to the measured state
                tampered_orig_qubits.append({
                    "qubit_id": q["qubit_id"],
                    "state_vector_angle_deg": new_angle,
                    "is_collapsed": True,
                })
                clone_qubits.append({
                    "qubit_id": q["qubit_id"],
                    "state_vector_angle_deg": new_angle,
                    "is_collapsed": True,
                })

            token.physical_qubits = tampered_orig_qubits

            cloned_token = PhysicalQubitToken(
                serial_number=token.serial_number,
                token_type=token.token_type,
                denomination_token9898=token.denomination_token9898,
                metadata_uri=token.metadata_uri,
                num_qubits=token.num_qubits,
                physical_qubits=clone_qubits,
            )

            return token, cloned_token

    def verify_and_redeem_quantum_money(
        self,
        token: PhysicalQubitToken,
        redeem_on_success: bool = False,
    ) -> QuantumMoneyVerificationResult:
        """
        Bank verifies banknote/NFT-Q by measuring each physical qubit in its authentic secret basis.
        Counterfeits or tampered notes collapse and fail immediately.
        """
        with self.lock:
            serial = token.serial_number
            secret_records = self._bank_secret_table.get(serial)

            if not secret_records:
                return QuantumMoneyVerificationResult(
                    verification_id=f"ver_{secrets.token_hex(4)}",
                    serial_number=serial,
                    total_qubits_tested=len(token.physical_qubits),
                    matching_qubits_count=0,
                    verification_fidelity=0.0,
                    is_valid_authentic=False,
                    is_counterfeit_detected=True,
                    rejection_reason="Serial number not found in secret bank register.",
                )

            if token.is_spent_or_redeemed:
                return QuantumMoneyVerificationResult(
                    verification_id=f"ver_{secrets.token_hex(4)}",
                    serial_number=serial,
                    total_qubits_tested=len(token.physical_qubits),
                    matching_qubits_count=0,
                    verification_fidelity=0.0,
                    is_valid_authentic=False,
                    is_counterfeit_detected=True,
                    rejection_reason="Token has already been spent or redeemed.",
                )

            matches = 0
            n = len(secret_records)

            for i in range(n):
                secret = secret_records[i]
                carrier = token.physical_qubits[i]
                current_angle = carrier["state_vector_angle_deg"]

                # Bank measures in the authentic secret basis
                if secret.basis == '+':
                    # Projection onto 0 deg (|0>) or 90 deg (|1>)
                    if current_angle == 0.0:
                        measured_bit = 0
                    elif current_angle == 90.0:
                        measured_bit = 1
                    else:
                        # State was collapsed in 'x' basis (45 or 135 deg) -> 50% probability
                        measured_bit = 0 if random.random() < 0.5 else 1
                else:  # secret.basis == 'x'
                    # Projection onto 45 deg (|+>) or 135 deg (|->)
                    if current_angle == 45.0:
                        measured_bit = 0
                    elif current_angle == 135.0:
                        measured_bit = 1
                    else:
                        # State was collapsed in '+' basis (0 or 90 deg) -> 50% probability
                        measured_bit = 0 if random.random() < 0.5 else 1

                if measured_bit == secret.bit_value:
                    matches += 1

            fidelity = matches / n
            is_authentic = fidelity >= WIESNER_VERIFICATION_ACCEPTANCE_THRESHOLD
            is_counterfeit = not is_authentic

            if is_authentic and redeem_on_success:
                token.is_spent_or_redeemed = True

            res = QuantumMoneyVerificationResult(
                verification_id=f"ver_{secrets.token_hex(6)}",
                serial_number=serial,
                total_qubits_tested=n,
                matching_qubits_count=matches,
                verification_fidelity=round(fidelity, 4),
                is_valid_authentic=is_authentic,
                is_counterfeit_detected=is_counterfeit,
                rejection_reason=None if is_authentic else f"Measurement fidelity {fidelity:.2%} below required {WIESNER_VERIFICATION_ACCEPTANCE_THRESHOLD:.0%} threshold.",
            )

            self.verification_history.append(res)
            return res


# Global Quantum Money Singleton
quantum_money_engine = QuantumMoneyEngine()
