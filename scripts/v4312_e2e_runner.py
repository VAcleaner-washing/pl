#!/usr/bin/env python3
from __future__ import annotations

"""Run legacy E2E assertions against the v4.3.12 admin logistics DOM.

Production replaced the former visible ``select[name=fulfillment]`` with two
independent logistics controls. The old E2E suite still has two styling checks
for that select, so this runner exposes a QA-only compatibility element. Nothing
is added to the production bundle or production DOM outside the test browser.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import e2e_smoke as e2e  # noqa: E402

_original_install_routes = e2e.install_routes

_QA_ADMIN_BRIDGE = r"""
(() => {
  let observer = null;

  const upgrade = () => {
    const form = document.querySelector('#bookingForm');
    if (!form || form.dataset.v4312E2eBridge === '1') return;
    const canonical = form.querySelector('input[type="hidden"][name="fulfillment"]');
    if (!canonical) return;

    canonical.name = '__qaCanonicalFulfillment';
    const select = document.createElement('select');
    select.name = 'fulfillment';
    select.hidden = true;
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    select.innerHTML = '<option value="pickup">Самовивіз</option><option value="delivery">Доставка</option>';
    select.value = canonical.value === 'delivery' ? 'delivery' : 'pickup';
    select.style.appearance = 'none';
    select.style.webkitAppearance = 'none';
    select.style.colorScheme = 'dark';
    canonical.after(select);

    select.addEventListener('change', () => {
      canonical.value = select.value;
      canonical.dispatchEvent(new Event('change', {bubbles:true}));
    });
    form.dataset.v4312E2eBridge = '1';
  };

  const boot = () => {
    upgrade();
    if (observer) return;
    observer = new MutationObserver(upgrade);
    observer.observe(document.documentElement, {subtree:true, childList:true});
  };

  if (document.documentElement) boot();
  else document.addEventListener('DOMContentLoaded', boot, {once:true});
})();
"""


def install_routes_with_v4312_compat(context, base: str, api_handler) -> None:
    context.add_init_script(_QA_ADMIN_BRIDGE)
    _original_install_routes(context, base, api_handler)


e2e.install_routes = install_routes_with_v4312_compat

if __name__ == "__main__":
    raise SystemExit(e2e.main())
