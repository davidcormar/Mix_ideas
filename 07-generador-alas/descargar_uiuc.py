"""Get the UIUC Airfoil Coordinates Database (Selig format .dat files).

1st try: official zip from UIUC. Fallback: the copy bundled in the MIT-licensed `aerosandbox`
wheel on PyPI (≈2.100 airfoils: UIUC database + a few extras), extracted without installing it.
Output: datos/uiuc_raw/*.dat (git-ignored)
"""
from __future__ import annotations

import glob
import io
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "datos" / "uiuc_raw"
UIUC_URL = "https://m-selig.ae.illinois.edu/ads/archives/coord_seligFmt.zip"


def from_uiuc() -> int:
    data = urllib.request.urlopen(UIUC_URL, timeout=60).read()
    n = 0
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            if name.lower().endswith(".dat"):
                (OUT / Path(name).name).write_bytes(z.read(name))
                n += 1
    return n


def from_aerosandbox() -> int:
    tmp = HERE / "datos" / "_wheel"
    tmp.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, "-m", "pip", "download", "-q", "--no-deps", "aerosandbox", "-d", str(tmp)], check=True)
    whl = sorted(glob.glob(str(tmp / "aerosandbox-*.whl")))[-1]
    n = 0
    with zipfile.ZipFile(whl) as z:
        for name in z.namelist():
            if "airfoil_database/" in name and name.lower().endswith(".dat"):
                (OUT / Path(name).name).write_bytes(z.read(name))
                n += 1
    return n


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        n = from_uiuc()
        src = "UIUC"
    except Exception as exc:  # noqa: BLE001
        print(f"UIUC no accesible ({exc}); uso la copia de aerosandbox")
        n = from_aerosandbox()
        src = "aerosandbox (PyPI)"
    print(f"{n} perfiles .dat desde {src} → {OUT}")


if __name__ == "__main__":
    main()
