"""Jack Daniels & Jimmy Gilbert VDOT model: race -> VDOT -> training paces & predictions.

VO2(v)  = -4.60 + 0.182258 v + 0.000104 v^2          (v in m/min)
%max(t) = 0.8 + 0.1894393 e^(-0.012778 t) + 0.2989558 e^(-0.1932605 t)   (t in min)
VDOT    = VO2(v) / %max(t)
"""
from __future__ import annotations

import math

RACES = {"1 milla": 1609.34, "5K": 5000, "10K": 10000, "Media": 21097.5, "Maratón": 42195}


def vo2(v_m_min: float) -> float:
    return -4.60 + 0.182258 * v_m_min + 0.000104 * v_m_min ** 2


def pct_max(t_min: float) -> float:
    return 0.8 + 0.1894393 * math.exp(-0.012778 * t_min) + 0.2989558 * math.exp(-0.1932605 * t_min)


def vdot(distance_m: float, time_s: float) -> float:
    t = time_s / 60
    return vo2(distance_m / t) / pct_max(t)


def velocity_for_vo2(target: float) -> float:
    """Inverse of vo2(): speed in m/min that costs `target` ml/kg/min."""
    a, b, c = 0.000104, 0.182258, -4.60 - target
    return (-b + math.sqrt(b * b - 4 * a * c)) / (2 * a)


def predict_time(v: float, distance_m: float) -> float:
    """Race time (s) at `distance_m` for a runner with VDOT `v` (bisection)."""
    lo, hi = distance_m / 1000 * 120, distance_m / 1000 * 900  # 2:00/km .. 15:00/km
    for _ in range(100):
        mid = (lo + hi) / 2
        if vdot(distance_m, mid) > v:
            lo = mid   # too fast for this VDOT -> need more time
        else:
            hi = mid
    return (lo + hi) / 2


def pace_at_fraction(v: float, frac: float) -> float:
    """sec/km at `frac` of VDOT."""
    return 60_000 / velocity_for_vo2(frac * v)


def training_paces(v: float) -> dict[str, tuple[float, float] | float]:
    """Daniels training intensities (approximate % of VDOT); sec/km.

    E (easy/Z2): 59-74 % · M: marathon race pace · T (threshold): 83-88 %
    I (interval): 95-100 % · R (repetition): ~mile race pace
    """
    return {
        "E": (pace_at_fraction(v, 0.74), pace_at_fraction(v, 0.62)),
        "M": predict_time(v, RACES["Maratón"]) / 42.195,
        "T": (pace_at_fraction(v, 0.88), pace_at_fraction(v, 0.84)),
        "I": pace_at_fraction(v, 0.975),
        "R": predict_time(v, RACES["1 milla"]) / 1.60934,
    }


def required_vdot(distance_m: float, time_s: float) -> float:
    return vdot(distance_m, time_s)
