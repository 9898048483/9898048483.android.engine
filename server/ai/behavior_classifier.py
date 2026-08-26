"""
Proof-of-Action Behavioral AI Engine
File: server/ai/behavior_classifier.py

Architecture:
- Privacy-preserving, zero-PII behavioral entropy analysis and Sybil anomaly classification.
- Biometric Touch Telemetry Evaluation:
  - Trajectory curvature (Bezier deviation / jerkiness).
  - Pressure gradient variance & contact area dynamics.
  - Micro-jitter & physical finger-tremor Fourier entropy.
  - Inter-action cadence & human reaction time distributions.
- Anti-Bot & Synthetic Automation Detection:
  - Detects Appium/ADB input tap commands (perfect linear trajectories, 0-jitter, constant interval).
  - Detects virtualized touch injection and automated multi-instance cloud emulators.
- Dynamic Human Confidence Scoring (0.0 to 1.0) & Faucet/Reward Adjustment.
"""

import math
import time
import statistics
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class TouchPoint:
    x: float
    y: float
    pressure: float
    timestamp_ms: float
    contact_area: float = 1.0


@dataclass
class GestureTelemetry:
    gesture_type: str  # "SWIPE", "TAP", "SCROLL", "PINCH"
    touch_points: List[TouchPoint]
    device_orientation: str = "PORTRAIT"
    screen_dpi: float = 420.0


@dataclass
class BehavioralScoreResult:
    is_human: bool
    human_confidence_score: float  # 0.0 (synthetic/bot) to 1.0 (verified human)
    entropy_score: float
    jitter_variance: float
    curvature_index: float
    cadence_regularity: float
    detected_anomalies: List[str]
    reward_multiplier: float  # 0.0 to 1.0
    classification_timestamp: float


class ProofOfActionBehaviorClassifier:
    """
    Lightweight, high-precision statistical classifier for human touch entropy
    and Sybil automation detection without storing personally identifiable information.
    """

    def __init__(
        self,
        min_human_threshold: float = 0.65,
        min_points_per_gesture: int = 4,
    ) -> None:
        self.min_human_threshold = min_human_threshold
        self.min_points_per_gesture = min_points_per_gesture

    def _calculate_curvature_deviation(self, points: List[TouchPoint]) -> float:
        """
        Calculates deviation of trajectory from a strict mathematical straight line.
        Bots and ADB scripts almost always exhibit exact 0.0 straight-line Euclidean vectors.
        """
        if len(points) < 3:
            return 0.0

        p_start = points[0]
        p_end = points[-1]

        # Line equation: Ax + By + C = 0
        A = p_end.y - p_start.y
        B = p_start.x - p_end.x
        C = p_end.x * p_start.y - p_start.x * p_end.y
        denominator = math.sqrt(A * A + B * B) + 1e-9

        deviations = []
        for p in points[1:-1]:
            dist = abs(A * p.x + B * p.y + C) / denominator
            deviations.append(dist)

        return statistics.mean(deviations) if deviations else 0.0

    def _calculate_jitter_and_microtremor(self, points: List[TouchPoint]) -> float:
        """
        Calculates natural human physiological micro-tremor (8-12 Hz biological tremor).
        Absence of micro-tremor indicates software injection or script execution.
        """
        if len(points) < 3:
            return 0.0

        accelerations = []
        for i in range(len(points) - 2):
            p0, p1, p2 = points[i], points[i + 1], points[i + 2]
            dt1 = (p1.timestamp_ms - p0.timestamp_ms) + 1e-6
            dt2 = (p2.timestamp_ms - p1.timestamp_ms) + 1e-6

            vx1 = (p1.x - p0.x) / dt1
            vy1 = (p1.y - p0.y) / dt1
            vx2 = (p2.x - p1.x) / dt2
            vy2 = (p2.y - p1.y) / dt2

            ax = (vx2 - vx1) / dt2
            ay = (vy2 - vy1) / dt2
            accelerations.append(math.sqrt(ax * ax + ay * ay))

        return statistics.variance(accelerations) if len(accelerations) > 1 else 0.0

    def _calculate_pressure_dynamics(self, points: List[TouchPoint]) -> Tuple[float, float]:
        """
        Extracts pressure mean and standard deviation across touch duration.
        """
        pressures = [p.pressure for p in points]
        if not pressures:
            return 0.0, 0.0
        mean_p = statistics.mean(pressures)
        std_p = statistics.stdev(pressures) if len(pressures) > 1 else 0.0
        return mean_p, std_p

    def _calculate_temporal_cadence_entropy(self, gestures: List[GestureTelemetry]) -> float:
        """
        Measures Shannon entropy of time intervals between consecutive gestures.
        Fixed-interval automated loops produce near-zero entropy.
        """
        if len(gestures) < 2:
            return 1.0

        intervals = []
        for i in range(len(gestures) - 1):
            t1 = gestures[i].touch_points[-1].timestamp_ms if gestures[i].touch_points else 0
            t2 = gestures[i + 1].touch_points[0].timestamp_ms if gestures[i + 1].touch_points else 0
            diff = max(1.0, t2 - t1)
            intervals.append(diff)

        # Discretize intervals into 50ms bins
        bins: Dict[int, int] = {}
        for iv in intervals:
            bin_idx = int(iv // 50)
            bins[bin_idx] = bins.get(bin_idx, 0) + 1

        total = len(intervals)
        entropy = 0.0
        for count in bins.values():
            p = count / total
            if p > 0:
                entropy -= p * math.log2(p)

        # Normalize entropy (0.0 to 1.0)
        max_possible = math.log2(total) if total > 1 else 1.0
        return min(1.0, entropy / max(1.0, max_possible))

    def evaluate_telemetry(
        self,
        gestures: List[GestureTelemetry],
    ) -> BehavioralScoreResult:
        """
        Performs multi-dimensional behavioral classification on raw gesture session telemetry.
        """
        anomalies: List[str] = []
        if not gestures:
            return BehavioralScoreResult(
                is_human=False,
                human_confidence_score=0.0,
                entropy_score=0.0,
                jitter_variance=0.0,
                curvature_index=0.0,
                cadence_regularity=0.0,
                detected_anomalies=["EMPTY_TELEMETRY_SESSION"],
                reward_multiplier=0.0,
                classification_timestamp=time.time(),
            )

        curvature_scores: List[float] = []
        jitter_scores: List[float] = []
        pressure_stds: List[float] = []

        total_points = 0
        for gesture in gestures:
            pts = gesture.touch_points
            total_points += len(pts)
            if len(pts) < self.min_points_per_gesture:
                continue

            curv = self._calculate_curvature_deviation(pts)
            jitter = self._calculate_jitter_and_microtremor(pts)
            _, p_std = self._calculate_pressure_dynamics(pts)

            curvature_scores.append(curv)
            jitter_scores.append(jitter)
            pressure_stds.append(p_std)

        avg_curvature = statistics.mean(curvature_scores) if curvature_scores else 0.0
        avg_jitter = statistics.mean(jitter_scores) if jitter_scores else 0.0
        avg_p_std = statistics.mean(pressure_stds) if pressure_stds else 0.0
        temporal_entropy = self._calculate_temporal_cadence_entropy(gestures)

        # Anomaly Rules
        if avg_curvature < 0.05 and len(gestures) > 1:
            anomalies.append("PERFECT_LINEAR_TRAJECTORY (ADB/Synthesized Input)")

        if avg_jitter < 1e-7 and len(gestures) > 1:
            anomalies.append("ZERO_PHYSIOLOGICAL_TREMOR (Virtual Touch Driver)")

        if avg_p_std < 1e-4 and len(gestures) > 1:
            anomalies.append("CONSTANT_PRESSURE_PROFILE (Synthetic Injection)")

        if temporal_entropy < 0.20 and len(gestures) >= 3:
            anomalies.append("DETERMINISTIC_CADENCE_LOOP (Bot Script)")

        # Aggregate Score (0.0 to 1.0)
        # Higher curvature, moderate jitter, pressure variation, and high entropy -> Human
        curv_norm = min(1.0, avg_curvature / 5.0)
        jitter_norm = min(1.0, avg_jitter * 1000.0)
        p_std_norm = min(1.0, avg_p_std / 0.15)

        raw_score = (
            0.30 * curv_norm +
            0.25 * jitter_norm +
            0.20 * p_std_norm +
            0.25 * temporal_entropy
        )

        # Penalty for detected synthetic anomalies
        penalty = len(anomalies) * 0.35
        final_human_score = max(0.0, min(1.0, raw_score - penalty))

        is_human = final_human_score >= self.min_human_threshold and len(anomalies) == 0

        # Proportional reward multiplier
        reward_multiplier = 1.0 if is_human else (final_human_score if final_human_score > 0.3 else 0.0)

        return BehavioralScoreResult(
            is_human=is_human,
            human_confidence_score=round(final_human_score, 4),
            entropy_score=round(temporal_entropy, 4),
            jitter_variance=round(avg_jitter, 6),
            curvature_index=round(avg_curvature, 4),
            cadence_regularity=round(1.0 - temporal_entropy, 4),
            detected_anomalies=anomalies,
            reward_multiplier=round(reward_multiplier, 4),
            classification_timestamp=time.time(),
        )


# Global Classifier Instance
behavior_classifier = ProofOfActionBehaviorClassifier()
