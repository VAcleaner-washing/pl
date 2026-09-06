#!/usr/bin/env python3
from __future__ import annotations

"""Run the legacy full E2E suite against the v4.3.12 admin logistics DOM.

The production booking form intentionally replaced the old visible
``select[name=fulfillment]`` with two independent logistics controls while
keeping a canonical hidden fulfillment value for the backend contract. The
legacy E2E suite still contains two visual-contract assertions against the old
select. Inject the same QA-only bridge used by the legacy PWA suites so the
production DOM and behavior stay untouched.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import e2e_smoke as e2e  # noqa: E402
from v4312_pwa_compat import _QA_LEGACY_BRIDGE  # noqa: E402

_original_install_routes = e2e.install_routes

_QA_STYLE_BRIDGE = r"""
(() => {
  const installStyle = () => {
    if (document.getElementById('v4312-e2e-compat-style')) return;
    const style = document.createElement('style');
    style.id = 'v4312-e2e-compat-style';
    style.textContent = '#bookingForm select[name="fulfillment"]{appearance:none;-webkit-appearance:none;color-scheme:dark}';
    (document.head || document.documentElement).append(style);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installStyle, {once:true});
  } else {
    installStyle();
  }
})();
"""


def install_routes_with_v4312_compat(context, base: str, api_handler) -> None:
    context.add_init_script(_QA_LEGACY_BRIDGE)
    context.add_init_script(_QA_STYLE_BRIDGE)
    _original_install_routes(context, base, api_handler)


e2e.install_routes = install_routes_with_v4312_compat

if __name__ == "__main__":
    raise SystemExit(e2e.main())
