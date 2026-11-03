"""Synthetic Sentinel-1-like scene: multilook gamma speckle sea clutter + bright ships + land."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class Ship:
    row: float
    col: float
    length_m: float
    heading_deg: float
    has_ais: bool


def make_scene(shape=(1024, 1024), n_ships=25, pixel_m=10.0, looks=4.4, sea_sigma0=0.02,
               dark_fraction=0.3, seed=0):
    """Return (intensity image (linear sigma0), land mask, list[Ship])."""
    rng = np.random.default_rng(seed)
    H, W = shape
    # sea clutter: mean sigma0 with a slow wind-driven gradient, multilook gamma speckle
    yy, xx = np.mgrid[0:H, 0:W]
    mean = sea_sigma0 * (1 + 0.5 * np.sin(xx / W * np.pi))
    img = mean * rng.gamma(looks, 1 / looks, shape)
    # land on the left edge (bright, textured)
    coast = (W * 0.08 + 30 * np.sin(yy[:, 0] / 90.0)).astype(int)
    land = xx < coast[:, None]
    img[land] = 0.3 * rng.gamma(2.0, 0.5, land.sum())
    ships = []
    while len(ships) < n_ships:
        r, c = rng.uniform(20, H - 20), rng.uniform(W * 0.2, W - 20)
        if any(abs(r - s.row) < 25 and abs(c - s.col) < 25 for s in ships):
            continue
        L = rng.uniform(15, 250)
        ships.append(Ship(r, c, L, rng.uniform(0, 180), rng.random() > dark_fraction))
    for s in ships:
        _draw_ship(img, s, pixel_m, rng)
    return img, land, ships


def _draw_ship(img, s: Ship, pixel_m, rng):
    half = max(s.length_m / pixel_m / 2, 0.8)
    th = np.radians(s.heading_deg)
    for t in np.linspace(-half, half, int(4 * half) + 2):
        for w in (-0.6, 0, 0.6):
            r = int(round(s.row + t * np.sin(th) + w * np.cos(th)))
            c = int(round(s.col + t * np.cos(th) - w * np.sin(th)))
            if 0 <= r < img.shape[0] and 0 <= c < img.shape[1]:
                img[r, c] += rng.uniform(1.0, 6.0)  # strong metallic return (≈ +20..25 dB over sea)


def make_ais(ships, pixel_m=10.0, pos_noise_m=60.0, seed=0):
    """AIS reports (row, col, mmsi) for ships with AIS, with position error (time offset, GPS)."""
    rng = np.random.default_rng(seed + 1)
    out = []
    for i, s in enumerate(ships):
        if s.has_ais:
            out.append((s.row + rng.normal(0, pos_noise_m / pixel_m), s.col + rng.normal(0, pos_noise_m / pixel_m),
                        200000000 + i))
    return out
