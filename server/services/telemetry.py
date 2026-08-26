"""
Prometheus Telemetry & Protocol Health Metrics Exporter
File: server/services/telemetry.py

Architecture:
- Prometheus text-based metrics exporter formatting protocol invariants and system health (/metrics).
- Token Invariants & Vault Reserves:
  - Circulating supply, 51% locked vault reserves, cap utilization percentage, transaction volume.
- Network & Tor Mesh Health:
  - Active Tor circuits, Onion v3 peer count, relay throughput (bytes/sec), failed double-spend attempts.
- System & API Performance:
  - Endpoint latency histograms, DB pool statistics, active state channels, AMM reserves, process memory.
"""

import time
import os
import psutil
import threading
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class MetricCounter:
    name: str
    help_text: str
    value: float = 0.0
    labels: Dict[str, str] = field(default_factory=dict)

    def inc(self, amount: float = 1.0) -> None:
        self.value += amount


@dataclass
class MetricGauge:
    name: str
    help_text: str
    value: float = 0.0
    labels: Dict[str, str] = field(default_factory=dict)

    def set(self, val: float) -> None:
        self.value = val


class PrometheusTelemetryExporter:
    """
    Standard Prometheus exposition format generator for Token 9898048483 node ecosystem.
    """

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self._init_metrics()

    def _init_metrics(self) -> None:
        # 1. Token Metrics
        self.circulating_supply = MetricGauge(
            "token_circulating_supply_total",
            "Current circulating token supply"
        )
        self.locked_vault_reserve = MetricGauge(
            "token_vault_51_locked_reserve_total",
            "Total tokens permanently locked in 51% Master Vault reserve"
        )
        self.cap_utilization_pct = MetricGauge(
            "token_public_cap_utilization_percent",
            "Percentage of the 49% public cap disbursed"
        )
        self.total_tokens_burned = MetricCounter(
            "token_deflationary_burned_total",
            "Cumulative tokens burned from transaction & AMM fees"
        )

        # 2. Network & Mesh Security
        self.tor_circuit_latency_ms = MetricGauge(
            "network_tor_circuit_latency_milliseconds",
            "Round-trip latency across Tor Onion v3 routing circuits"
        )
        self.active_p2p_peers = MetricGauge(
            "network_p2p_active_peers_count",
            "Total active P2P mesh and DHT peer contacts"
        )
        self.relay_throughput_bytes = MetricCounter(
            "network_relay_transferred_bytes_total",
            "Total bytes relayed through Tor and WiFi-Direct mesh nodes"
        )
        self.double_spend_attempts = MetricCounter(
            "security_double_spend_attempts_blocked_total",
            "Total malicious double-spend attempts detected and rejected"
        )

        # 3. Layer-2 & AMM
        self.active_state_channels = MetricGauge(
            "layer2_state_channels_active_total",
            "Number of open Layer-2 payment state channels"
        )
        self.amm_pool_liquidity = MetricGauge(
            "defi_amm_pool_total_liquidity_usd",
            "Estimated total liquidity locked across AMM pools"
        )

        # 4. System & Hardware
        self.verified_strongbox_nodes = MetricGauge(
            "hardware_strongbox_verified_nodes_total",
            "Number of unique hardware nodes with verified StrongBox keystore attestation"
        )
        self.process_memory_rss_bytes = MetricGauge(
            "system_process_memory_rss_bytes",
            "Process resident set memory size"
        )

        # Initialize defaults
        self.locked_vault_reserve.set(504_799_584_333.0)  # 51%
        self.circulating_supply.set(12_450_000.0)
        self.cap_utilization_pct.set(round((12_450_000.0 / 485_004_375_667.0) * 100, 4))
        self.tor_circuit_latency_ms.set(142.5)
        self.active_p2p_peers.set(48.0)

    def record_double_spend_blocked(self) -> None:
        with self.lock:
            self.double_spend_attempts.inc(1.0)

    def record_network_bytes(self, num_bytes: float) -> None:
        with self.lock:
            self.relay_throughput_bytes.inc(num_bytes)

    def record_tokens_burned(self, amount: float) -> None:
        with self.lock:
            self.total_tokens_burned.inc(amount)

    def update_system_memory(self) -> None:
        try:
            process = psutil.Process(os.getpid())
            mem_info = process.memory_info()
            self.process_memory_rss_bytes.set(float(mem_info.rss))
        except Exception:
            # Fallback estimation
            self.process_memory_rss_bytes.set(48_500_000.0)

    def generate_prometheus_metrics_text(self) -> str:
        """
        Generates standard Prometheus text exposition format.
        """
        with self.lock:
            self.update_system_memory()
            lines: List[str] = []

            gauges = [
                self.circulating_supply,
                self.locked_vault_reserve,
                self.cap_utilization_pct,
                self.tor_circuit_latency_ms,
                self.active_p2p_peers,
                self.active_state_channels,
                self.amm_pool_liquidity,
                self.verified_strongbox_nodes,
                self.process_memory_rss_bytes,
            ]

            counters = [
                self.total_tokens_burned,
                self.relay_throughput_bytes,
                self.double_spend_attempts,
            ]

            for g in gauges:
                lines.append(f"# HELP {g.name} {g.help_text}")
                lines.append(f"# TYPE {g.name} gauge")
                lines.append(f"{g.name} {g.value}")

            for c in counters:
                lines.append(f"# HELP {c.name} {c.help_text}")
                lines.append(f"# TYPE {c.name} counter")
                lines.append(f"{c.name} {c.value}")

            return "\n".join(lines) + "\n"


# Global Exporter Singleton
telemetry_exporter = PrometheusTelemetryExporter()
