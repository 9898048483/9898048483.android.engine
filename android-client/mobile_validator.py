#!/usr/bin/env python3
"""
Mobile Validator Daemon & Proof-of-Stake Engine
Opportunistic validator daemon that monitors device battery level, thermal state, and Wi-Fi connection.
When the Android phone is charging and idle, it participates in block attestation,
signs validation tickets using ML-DSA-87, and claims staking rewards autonomously.
"""

import time
import json
import hashlib
import os
from typing import Dict, Any, Optional

class MobileValidatorDaemon:
    def __init__(self, validator_did: str, min_battery_for_active_staking: int = 80):
        self.validator_did = validator_did
        self.min_battery = min_battery_for_active_staking
        self.is_charging = True
        self.current_battery_pct = 95
        self.cpu_temp_celsius = 34.5
        self.is_wifi_connected = True
        
        self.total_attestations_signed = 0
        self.accumulated_rewards_token = 0.00
        self.staked_token_balance = 1000.00 # Genesis 1,000 TOKEN stake

    def update_hardware_telemetry(self, battery_pct: int, is_charging: bool, cpu_temp: float, is_wifi: bool):
        """
        Updates live device telemetry from Android BatteryManager / ThermalManager.
        """
        self.current_battery_pct = battery_pct
        self.is_charging = is_charging
        self.cpu_temp_celsius = cpu_temp
        self.is_wifi_connected = is_wifi

    def is_eligible_to_validate(self) -> bool:
        """
        Validation Policy:
        - Must be plugged into AC/Wireless charger OR battery >= 80%
        - Thermal throttle threshold: CPU temp < 42.0°C
        - Wi-Fi or unmetered connection preferred to preserve mobile data
        """
        has_power = self.is_charging or (self.current_battery_pct >= self.min_battery)
        thermal_ok = self.cpu_temp_celsius < 42.0
        return has_power and thermal_ok and self.is_wifi_connected

    def attest_block(self, block_height: int, block_hash: str, parent_hash: str) -> Optional[Dict[str, Any]]:
        """
        Signs a block attestation ticket if eligible.
        """
        if not self.is_eligible_to_validate():
            return None

        timestamp = int(time.time())
        attestation_payload = f"{block_height}:{block_hash}:{parent_hash}:{self.validator_did}:{timestamp}"
        ticket_hash = hashlib.sha256(attestation_payload.encode('utf-8')).hexdigest()

        # Simulated ML-DSA-87 Lattice Signature on hardware
        pqc_sig = hashlib.sha3_256(f"MLDSA87:{ticket_hash}:{self.validator_did}".encode('utf-8')).hexdigest()

        # Reward calculation: 0.05 TOKEN per attested block
        reward = 0.05
        self.total_attestations_signed += 1
        self.accumulated_rewards_token += reward

        ticket = {
            "ticket_id": ticket_hash,
            "block_height": block_height,
            "block_hash": block_hash,
            "validator_did": self.validator_did,
            "timestamp": timestamp,
            "pqc_signature": pqc_sig,
            "attestation_reward": reward,
            "total_accumulated_rewards": round(self.accumulated_rewards_token, 4)
        }

        return ticket

    def get_validator_status(self) -> Dict[str, Any]:
        return {
            "validator_did": self.validator_did,
            "is_eligible": self.is_eligible_to_validate(),
            "is_charging": self.is_charging,
            "battery_pct": self.current_battery_pct,
            "cpu_temp_celsius": self.cpu_temp_celsius,
            "wifi_connected": self.is_wifi_connected,
            "staked_balance": self.staked_token_balance,
            "total_attestations": self.total_attestations_signed,
            "accumulated_rewards": round(self.accumulated_rewards_token, 4)
        }

if __name__ == "__main__":
    daemon = MobileValidatorDaemon(validator_did="did:quantum:9898:a7f29c01")
    daemon.update_hardware_telemetry(battery_pct=92, is_charging=True, cpu_temp=33.8, is_wifi=True)
    ticket = daemon.attest_block(block_height=1001, block_hash="0xabcd1234", parent_hash="0x98980000")
    print(f"[Mobile Validator Engine] Attestation Signed: {ticket['ticket_id'][:16]}... (Rewards: {daemon.accumulated_rewards_token} TOKEN)")
