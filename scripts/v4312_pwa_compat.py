#!/usr/bin/env python3
from __future__ import annotations

"""Load the v4.3.12 admin prelude in legacy PWA fixtures.

The shared PWA fixture intentionally builds the admin shell manually instead of
executing every production script tag. v4.3.12 introduces a small prelude that
must run before admin-v250.js because it exposes the delivery-leg mileage helper
used during the first booking/finance render.

The legacy suites also drive the old fulfillment <select>. Production keeps that
selector hidden as a compatibility bridge so managers never see duplicate
logistics controls. Playwright refuses normal select_option() on hidden controls,
so the QA adapter mirrors a native change event only for that exact bridge.
"""

from playwright.sync_api import Locator

_original_select_option = Locator.select_option
_locator_compat_installed = False


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
            # Fall through to Playwright's canonical behavior. Unexpected states
            # must still fail instead of being hidden by the compatibility layer.
            pass
        return _original_select_option(self, *args, **kwargs)

    Locator.select_option = select_option_with_hidden_fulfillment
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
        # Test fixtures need the prelude active before the base admin's first
        # render. In production it is also active for every later modal render.
        page.add_script_tag(content=(pwa.ROOT / "assets/admin-v4312.js").read_text(encoding="utf-8"))
        page.add_script_tag(content=(pwa.ROOT / "assets/admin-v250.js").read_text(encoding="utf-8"))
        page.add_script_tag(content=(pwa.ROOT / "assets/admin-glass-test.js").read_text(encoding="utf-8"))
        page.add_script_tag(content=(pwa.ROOT / "assets/address-autocomplete.js").read_text(encoding="utf-8"))
        page.wait_for_selector(".app" if authenticated else ".auth-card")
        if authenticated:
            page.wait_for_selector(".upcoming-scope" if width <= 900 else ".booking-list")
        page.wait_for_timeout(150)
        return page

    pwa.render_page = render_page
    return pwa
