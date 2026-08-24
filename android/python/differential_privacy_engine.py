import math
import random
import time
import json

# ==============================================================================
# AI SECURE SPACE - DIFFERENTIAL PRIVACY TELEMETRY ENGINE (PROMPT 29)
# Role: Privacy Engineering & Applied Mathematics Architect
# Requirements: Laplace/Gaussian mechanisms, Privacy Budget Tracker, Local Aggregation
# ==============================================================================

class PrivacyBudgetExceeded(Exception):
    """Exception raised when the privacy budget is depleted."""
    pass

class PrivacyBudgetManager:
    """
    Tracks the expenditure of the Privacy Budget (Epsilon and Delta).
    Ensures that mathematical guarantees of indistinguishability are maintained.
    """
    def __init__(self, max_epsilon=10.0, max_delta=1e-5):
        self.max_epsilon = max_epsilon
        self.max_delta = max_delta
        self.used_epsilon = 0.0
        self.used_delta = 0.0

    def consume(self, epsilon, delta=0.0):
        if self.used_epsilon + epsilon > self.max_epsilon or self.used_delta + delta > self.max_delta:
            raise PrivacyBudgetExceeded(
                f"Privacy budget depleted! (Used ε: {self.used_epsilon}/{self.max_epsilon}). "
                "Halting telemetry transmission to prevent Deanonymization."
            )
        self.used_epsilon += epsilon
        self.used_delta += delta

class DifferentialPrivacyEngine:
    def __init__(self, budget_manager):
        self.budget = budget_manager

    def _laplace_noise(self, scale):
        """Generates random noise drawn from a Laplace distribution."""
        u = random.uniform(-0.5, 0.5)
        return -scale * math.copysign(1.0, u) * math.log(1.0 - 2.0 * abs(u))

    def apply_laplace(self, value, sensitivity, epsilon):
        """
        Applies Pure (ε)-Differential Privacy using the Laplace mechanism.
        Best for continuous/unbounded data where strict privacy is required.
        """
        self.budget.consume(epsilon)
        scale = sensitivity / epsilon
        noise = self._laplace_noise(scale)
        return value + noise

    def apply_gaussian(self, value, sensitivity, epsilon, delta):
        """
        Applies Approximate (ε, δ)-Differential Privacy using the Gaussian mechanism.
        Allows for less overall noise on high-sensitivity queries but relaxes strict privacy bounds.
        """
        self.budget.consume(epsilon, delta)
        # sigma >= sensitivity * sqrt(2 * ln(1.25/delta)) / epsilon
        sigma = (sensitivity * math.sqrt(2 * math.log(1.25 / delta))) / epsilon
        noise = random.gauss(0, sigma)
        return value + noise

    def aggregate_telemetry(self, raw_metrics):
        print("[*] Applying Local Differential Privacy to Telemetry...")
        time.sleep(0.3)
        perturbed_metrics = {}
        
        # 1. App Usage Duration (Continuous Value)
        # Sensitivity: Max expected single-session change ~ 60 mins
        val1 = raw_metrics.get("app_usage_minutes", 0)
        eps1 = 0.5
        p_val1 = max(0, round(self.apply_laplace(val1, sensitivity=60.0, epsilon=eps1), 2))
        perturbed_metrics["app_usage_minutes"] = p_val1
        print(f" -> [Laplace Mechanism] App Usage (ε={eps1}):")
        print(f"      True={val1}m | Perturbed={p_val1}m")

        # 2. Crash Count (Discrete Value)
        # Sensitivity: 1 (A crash either happened or it didn't)
        val2 = raw_metrics.get("crash_count", 0)
        eps2, del2 = 0.2, 1e-6
        p_val2 = max(0, int(round(self.apply_gaussian(val2, sensitivity=1.0, epsilon=eps2, delta=del2))))
        perturbed_metrics["crash_count"] = p_val2
        print(f" -> [Gaussian Mechanism] Crash Count (ε={eps2}, δ={del2}):")
        print(f"      True={val2} | Perturbed={p_val2}")

        # 3. Cryptographic Operations Count
        # Sensitivity: ~ 50 ops
        val3 = raw_metrics.get("crypto_ops", 0)
        eps3 = 1.0
        p_val3 = max(0, int(round(self.apply_laplace(val3, sensitivity=50.0, epsilon=eps3))))
        perturbed_metrics["crypto_ops"] = p_val3
        print(f" -> [Laplace Mechanism] Crypto Ops (ε={eps3}):")
        print(f"      True={val3} | Perturbed={p_val3}")

        print(f"\n[+] Privacy Budget Consumed: ε = {self.budget.used_epsilon:.2f} / {self.budget.max_epsilon}")
        return perturbed_metrics

if __name__ == "__main__":
    print("===========================================================================")
    print("  AI SECURE SPACE: DIFFERENTIAL PRIVACY TELEMETRY (Prompt 29)")
    print("===========================================================================")
    
    # Initialize global privacy budget (ε = 5.0 maximum per device lifetime/cycle)
    budget = PrivacyBudgetManager(max_epsilon=5.0)
    dp_engine = DifferentialPrivacyEngine(budget)
    
    raw_device_telemetry = {
        "app_usage_minutes": 125,
        "crash_count": 0,
        "crypto_ops": 312
    }
    
    print("[*] Raw System Telemetry Collected (Held Securely in Local Memory)")
    time.sleep(0.5)
    
    try:
        safe_payload = dp_engine.aggregate_telemetry(raw_device_telemetry)
        print("\n[*] Exfiltrating Plausibly Deniable Telemetry to Cloud Aggregator:")
        print(json.dumps(safe_payload, indent=2))
        print("\n[+] Telemetry successfully masked. Reverse-engineering user actions is mathematically bounded.")
    except PrivacyBudgetExceeded as e:
        print(f"\n[!] SECURITY LOCK: {e}")

    print("===========================================================================")
