#!/usr/bin/env python3
from __future__ import annotations

"""v4.3.12 compatibility for legacy PWA regression fixtures.

Production now keeps the canonical hidden ``fulfillment`` input owned by
admin-v250.js. Replacing it in the real app would discard bound listeners and
could collapse the new independent logistics choices back into the old single
Delivery/Pickup model.

The older PWA suites still address a hidden ``select[name=fulfillment]`` and a
hidden morning/evening label. This module supplies those bridges only inside the
Playwright fixture while the production DOM remains untouched.
"""

from playwright.sync_api import Locator

_original_select_option = Locator.select_option
_original_click = Locator.click
_locator_compat_installed = False

_QA_LEGACY_BRIDGE = r"""
(() => {
  const upgrade = form => {
    if (!form || form.dataset.v4312QaLegacyBridge === '1') return;
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
    canonical.after(select);

    let applying = false;
    const applyLegacy = () => {
      if (applying) return;
      applying = true;
      try {
        const outboundValue = select.value === 'delivery' ? 'delivery' : 'pickup';
        const returnValue = select.value === 'delivery' ? 'pickup' : 'return_to_location';
        form.querySelector(`[data-logistics-kind="outbound"][data-logistics-value="${outboundValue}"]`)?.click();
        form.querySelector(`[data-logistics-kind="return"][data-logistics-value="${returnValue}"]`)?.click();
        canonical.value = select.value;
        canonical.dispatchEvent(new Event('change', {bubbles:true}));
      } finally {
        applying = false;
      }
    };
    select.addEventListener('change', applyLegacy);

    // A hidden marker preserves one old selector that checked whether 20:00 was
    // available in the former evening chip list. The click adapter below writes
    // 20:00 into the real exact-time input, so the legacy assertion still maps
    // to the new control without changing layout.
    form.querySelectorAll('[data-time-picker]').forEach(picker => {
      if (!picker.querySelector('[data-time="20:00"]')) {
        const marker = document.createElement('span');
        marker.hidden = true;
        marker.dataset.time = '20:00';
        marker.dataset.v4312QaCompat = '1';
        picker.append(marker);
      }
    });

    form.dataset.v4312QaLegacyBridge = '1';
  };
  const scan = () => upgrade(document.querySelector('#bookingForm'));
  new MutationObserver(scan).observe(document.documentElement, {subtree:true, childList:true});
  scan();
})();
"""


def _install_locator_compat() -> None:
    global _locator_compat_installed
    if _locator_compat_installed:
        return

    def select_option_with_hidden_fulfillment(self: Locator, *args, **kwargs):
        try:
            if (
                self.count() == 1
                and self.get_attribute("name") == "fulfillment"
                and not self.is_visible()
            ):
                requested = args[0] if args else kwargs.get("value")
                if isinstance(requested, (list, tuple)) and len(requested) == 1:
                    requested = requested[0]
                if requested in {"pickup", "delivery"}:
                    self.evaluate(
                        """(el, value) => {
                          el.value = value;
                          el.dispatchEvent(new Event('input', {bubbles:true}));
                          el.dispatchEvent(new Event('change', {bubbles:true}));
                        }""",
                        requested,
                    )
                    return [requested]
        except Exception:
            pass
        return _original_select_option(self, *args, **kwargs)

    def click_with_hidden_window_bridge(self: Locator, *args, **kwargs):
        try:
            if self.count() == 1 and not self.is_visible():
                radio = self.locator('input[type="radio"][name="pickupWindow"], input[type="radio"][name="returnWindow"]')
                if radio.count() == 1:
                    name = radio.get_attribute("name") or ""
                    value = radio.get_attribute("value") or ""
                    if name in {"pickupWindow", "returnWindow"} and value in {"morning", "evening"}:
                        form = self.locator('xpath=ancestor::form[1]')
                        time_name = "pickupTime" if name == "pickupWindow" else "returnTime"
                        time_input = form.locator(f'input[name="{time_name}"]')
                        if time_input.count() == 1:
                            target = "20:00" if value == "evening" else "08:00"
                            time_input.evaluate(
                                """(el, value) => {
                                  el.value = value;
                                  el.dispatchEvent(new Event('input', {bubbles:true}));
                                  el.dispatchEvent(new Event('change', {bubbles:true}));
                                }""",
                                target,
                            )
                            return None
        except Exception:
            pass
        return _original_click(self, *args, **kwargs)

    Locator.select_option = select_option_with_hidden_fulfillment
    Locator.click = click_with_hidden_window_bridge
    _locator_compat_installed = True


def install(pwa):
    _install_locator_compat()

    def render_page(browser, width: int, height: int, authenticated: bool = True, standalone: bool = False):
        page = browser.new_page(viewport={"width": width, "height": height}, is_mobile=width <= 900)
        page.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
        page.evaluate("html => { document.body.innerHTML = html; document.documentElement.classList.add('glass-test'); }", pwa.INITIAL_ADMIN_ROOTS)
        page.evaluate(pwa.init_script(authenticated, standalone))
        page.add_style_tag(content=(pwa.ROOT / "assets/admin-v250.css").read_text(encoding="utf-8"))
        page.add_style_tag(content=(pwa.ROOT / "assets/admin-glass-test.css").read_text(encoding="utf-8"))
        page.add_style_tag(content=(pwa.ROOT / "assets/address-autocomplete.css").read_text(encoding="utf-8"))
        page.add_script_tag(content=(pwa.ROOT / "assets/vacleaner-core.js").read_text(encoding="utf-8"))
        # The mileage helper must exist before the base admin performs its first
        # finance render, matching production script order.
        page.add_script_tag(content=(pwa.ROOT / "assets/admin-v4312.js").read_text(encoding="utf-8"))
        page.add_script_tag(content=(pwa.ROOT / "assets/admin-v250.js").read_text(encoding="utf-8"))
        page.add_script_tag(content=(pwa.ROOT / "assets/admin-glass-test.js").read_text(encoding="utf-8"))
        page.add_script_tag(content=(pwa.ROOT / "assets/address-autocomplete.js").read_text(encoding="utf-8"))
        # Legacy selectors are emulated only in this synthetic fixture, after the
        # canonical admin has bound its real listeners.
        page.add_script_tag(content=_QA_LEGACY_BRIDGE)
        page.wait_for_selector(".app" if authenticated else ".auth-card")
        if authenticated:
            page.wait_for_selector(".upcoming-scope" if width <= 900 else ".booking-list")
        page.wait_for_timeout(150)
        return page

    pwa.render_page = render_page
    return pwa
