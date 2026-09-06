#!/usr/bin/env python3
from __future__ import annotations

"""Load the v4.3.12 admin prelude in legacy PWA fixtures.

The shared PWA fixture intentionally builds the admin shell manually instead of
executing every production script tag. v4.3.12 introduces a small prelude that
must run before admin-v250.js because it exposes the delivery-leg mileage helper
used during the first booking/finance render. This adapter keeps the legacy
fixture faithful to production without weakening any assertions.
"""


def install(pwa):
    def render_page(browser, width: int, height: int, authenticated: bool = True, standalone: bool = False):
        page = browser.new_page(viewport={"width": width, "height": height}, is_mobile=width <= 900)
        page.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
        page.evaluate("html => { document.body.innerHTML = html; document.documentElement.classList.add('glass-test'); }", pwa.INITIAL_ADMIN_ROOTS)
        page.evaluate(pwa.init_script(authenticated, standalone))
        page.add_style_tag(content=(pwa.ROOT / "assets/admin-v250.css").read_text(encoding="utf-8"))
        page.add_style_tag(content=(pwa.ROOT / "assets/admin-glass-test.css").read_text(encoding="utf-8"))
        page.add_style_tag(content=(pwa.ROOT / "assets/address-autocomplete.css").read_text(encoding="utf-8"))
        page.add_script_tag(content=(pwa.ROOT / "assets/vacleaner-core.js").read_text(encoding="utf-8"))
        # Production order: the v4.3.12 prelude must exist before the base admin
        # executes its initial render and finance/delivery helpers.
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
