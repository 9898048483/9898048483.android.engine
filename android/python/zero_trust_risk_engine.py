import time
import random
import json

# ==============================================================================
# AI SECURE SPACE - ZERO-TRUST CONTINUOUS RISK ENGINE (PROMPT 30)
# Role: Cyber Identity & Behavioral Biometrics Architect
# Requirements: Continuous risk scoring, signal aggregation, adaptive session
# ==============================================================================

class TrustState:
    SECURE = "SECURE_ENCLAVE_OPEN"
    RESTRICTED = "STEP_UP_AUTH_REQUIRED"
    LOCKED = "ZERO_TRUST_LOCKDOWN"

class ZeroTrustEngine:
    """
    Continuous Risk-Based Authentication Engine.
    Dynamically adjusts access and session limits based on ambient confidence signals.
    """
    def __init__(self):
        self.current_risk_score = 0
        self.state = TrustState.SECURE
        self.session_duration_max = 3600 # 1 hour max by default

    def evaluate_signals(self, signals: dict) -> tuple:
        """
        Calculates an ambient risk score (0-100) based on weighted heuristics.
        """
        # 1. Background Biometrics / Behavioral (Confidence 0.0 to 1.0)
        # e.g., Face ID background scanning, typing dynamics
        bio_confidence = signals.get("biometric_confidence", 1.0)
        bio_penalty = (1.0 - bio_confidence) * 45  # Max 45 points of risk
        
        # 2. Network Safety State
        net_type = signals.get("network_type", "SECURE_WIFI")
        net_penalty = 0
        if net_type == "PUBLIC_WIFI":
            net_penalty = 15
        elif net_type == "TOR_EXIT_NODE":
            net_penalty = 40
            
        # 3. Device Posture / Integrity (Play Integrity / Bootloader state)
        device_integrity = signals.get("device_integrity", "STRONG")
        integrity_penalty = 0
        if device_integrity == "BASIC":
            integrity_penalty = 25
        elif device_integrity == "COMPROMISED":
            integrity_penalty = 100 # Immediate maximum risk
            
        # 4. Geolocation / Velocity Anomaly (e.g., Impossible travel)
        geo_anomaly = signals.get("geo_velocity_anomaly", False)
        geo_penalty = 35 if geo_anomaly else 0

        # Calculate absolute bounded risk (0 to 100)
        total_risk = bio_penalty + net_penalty + integrity_penalty + geo_penalty
        self.current_risk_score = min(100, int(total_risk))
        
        self._transition_state_machine()
        return self.current_risk_score, self.state
        
    def _transition_state_machine(self):
        """State machine dictating access levels and adaptive session lengths."""
        if self.current_risk_score >= 75:
            # High Risk - Terminate access
            self.state = TrustState.LOCKED
            self.session_duration_max = 0
        elif self.current_risk_score >= 35:
            # Medium Risk - Restrict and request step-up auth
            self.state = TrustState.RESTRICTED
            self.session_duration_max = 300 # Limit TTL to 5 minutes
        else:
            # Low Risk - Trusted
            self.state = TrustState.SECURE
            self.session_duration_max = 3600 # Extended 1-hour TTL

    def run_simulation(self):
        print("[*] Initializing Zero-Trust Continuous Risk Evaluator...")
        time.sleep(0.5)
        
        scenarios = [
            {
                "name": "User at Home (Trusted Baseline)",
                "signals": {"biometric_confidence": 0.98, "network_type": "SECURE_WIFI", "device_integrity": "STRONG", "geo_velocity_anomaly": False}
            },
            {
                "name": "User travels to Coffee Shop (Public WiFi, masked face)",
                "signals": {"biometric_confidence": 0.65, "network_type": "PUBLIC_WIFI", "device_integrity": "STRONG", "geo_velocity_anomaly": False}
            },
            {
                "name": "Device connects via Tor, Impossible Travel Detected",
                "signals": {"biometric_confidence": 0.50, "network_type": "TOR_EXIT_NODE", "device_integrity": "STRONG", "geo_velocity_anomaly": True}
            },
            {
                "name": "Hardware Integrity Compromised (Root/Magisk Detected)",
                "signals": {"biometric_confidence": 0.95, "network_type": "SECURE_WIFI", "device_integrity": "COMPROMISED", "geo_velocity_anomaly": False}
            }
        ]
        
        for i, scenario in enumerate(scenarios):
            print(f"\n[*] Continuous Evaluation Tick #{i+1}: {scenario['name']}")
            time.sleep(0.5)
            score, state = self.evaluate_signals(scenario['signals'])
            
            print(f" -> Signals Evaluated: {json.dumps(scenario['signals'])}")
            print(f" -> Ambient Risk Score: {score} / 100")
            
            if state == TrustState.SECURE:
                print(f" [+] Status: {state} | Action: Access Granted. Session TTL: {self.session_duration_max}s.")
            elif state == TrustState.RESTRICTED:
                print(f" [!] Status: {state} | Action: Triggering Step-Up Auth (Biometric/PIN). Session TTL capped to {self.session_duration_max}s.")
            elif state == TrustState.LOCKED:
                print(f" [X] Status: {state} | Action: ENCLAVE LOCKDOWN. Terminating session & purging memory.")
            
            time.sleep(1.0)


if __name__ == "__main__":
    print("===========================================================================")
    print("  AI SECURE SPACE: ZERO-TRUST CONTINUOUS RISK ENGINE (Prompt 30)")
    print("===========================================================================")
    engine = ZeroTrustEngine()
    engine.run_simulation()
    print("===========================================================================")
