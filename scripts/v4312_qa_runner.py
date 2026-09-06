#!/usr/bin/env python3
from __future__ import annotations

import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import pwa_visual_qa as pwa  # noqa: E402
from v4312_pwa_compat import install  # noqa: E402

install(pwa)

if len(sys.argv) < 2:
    raise SystemExit("usage: v4312_qa_runner.py <script> [args...]")

target = Path(sys.argv[1])
if not target.is_absolute():
    target = ROOT / target
sys.argv = [str(target), *sys.argv[2:]]
runpy.run_path(str(target), run_name="__main__")
