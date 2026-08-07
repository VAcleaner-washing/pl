#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import time
import mimetypes
from urllib.parse import urlparse, unquote
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, BrowserContext, Page, Route, sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SUPABASE_HOST = "https://yweluzclearwrazdkahu.supabase.co"


def iso(offset: int = 0) -> str:
    return (date.today() + timedelta(days=offset)).isoformat()


def next_weekend() -> tuple[str, str]:
    today = date.today()
    days_to_saturday = (5 - today.weekday()) % 7
    if days_to_saturday == 0:
        days_to_saturday = 7
    saturday = today + timedelta(days=days_to_saturday)
    return saturday.isoformat(), (saturday + timedelta(days=1)).isoformat()


def normalized_text(value: str) -> str:
    """Collapse all Unicode whitespace so locale-formatted money is stable in CI."""
    return " ".join(str(value or "").split())


def select_uses_dark_theme(page: Page, selector: str) -> bool:
    """Native option popups are OS-rendered; assert the control + explicit CSS contract instead."""
    return bool(page.locator(selector).evaluate(r"""el => {
      const style=getComputedStyle(el);
      const sheets=[...document.styleSheets];
      let explicitOptionRule=false;
      for(const sheet of sheets){
        let rules; try{rules=sheet.cssRules}catch{continue}
        for(const rule of [...rules]){
          const text=String(rule.cssText||'');
          if(text.includes('.field select option') && /background\s*:\s*(#10181d|rgb\(16,\s*24,\s*29\))/i.test(text) && /color\s*:\s*(#f5f1ea|rgb\(245,\s*241,\s*234\))/i.test(text)){
            explicitOptionRule=true; break;
          }
        }
        if(explicitOptionRule)break;
      }
      return style.appearance==='none' && String(style.colorScheme||'').includes('dark') && explicitOptionRule;
    }"""))


def booking(
    booking_id: str,
    code: str,
    status: str,
    start_offset: int,
    return_offset: int,
    product_code: str = "puzzi",
    product_label: str = "Kärcher Puzzi 8/1",
) -> dict[str, Any]:
    start = iso(start_offset)
    finish = iso(return_offset)
    return {
        "id": booking_id,
        "booking_code": code,
        "product_code": product_code,
        "product_label": product_label,
        "start_date": start,
        "return_date": finish,
        "start_at": f"{start}T07:00:00.000Z",
        "end_at": f"{finish}T09:30:00.000Z",
        "pickup_window": "morning",
        "return_window": "morning",
        "rental_days": max(1, return_offset - start_offset),
        "fulfillment": "pickup",
        "fulfillment_address": "Полтава, вул. Європейська, 146Е",
        "customer_name": "Тестовий клієнт",
        "customer_phone": "+380951111111",
        "customer_telegram": "@test_client",
        "customer_comment": "Потрібно почистити диван",
        "extras": {
            "selected_items": [],
            "chemistry": {"used_packets": 0, "story_mention": False},
        },
        "base_amount": 700,
        "extras_amount": 0,
        "delivery_amount": 0,
        "total_amount": 700,
        "prepayment_amount": 200,
        "prepayment_paid": status not in {"pending", "waiting_payment"},
        "deposit_amount": 1000,
        "deposit_paid": status in {"issued", "completed"},
        "deposit_returned": status == "completed",
        "issue_payment_amount": 0,
        "issue_payment_paid": False,
        "return_payment_amount": 0,
        "return_payment_paid": False,
        "status": status,
        "source": "vacleaner_website",
        "admin_note": "",
        "created_at": f"{iso(-2)}T10:00:00.000Z",
        "updated_at": f"{iso(-1)}T10:00:00.000Z",
    }


BOOKINGS = [
    booking("00000000-0000-4000-8000-000000000001", "VAC-TEST-001", "pending", 0, 1),
    booking("00000000-0000-4000-8000-000000000002", "VAC-TEST-002", "waiting_payment", 1, 2),
    booking("00000000-0000-4000-8000-000000000003", "VAC-TEST-003", "confirmed", 0, 1, "sc2", "Kärcher SC 2 Deluxe"),
    booking("00000000-0000-4000-8000-000000000004", "VAC-TEST-004", "issued", -2, -1),
]


def calendar_days() -> list[dict[str, Any]]:
    days = []
    for offset in range(14):
        resources = {
            key: {"label": label, "capacity": 2, "morning": 2, "evening": 2}
            for key, label in {
                "puzzi": "Puzzi",
                "sc2": "SC 2",
                "jimmy": "Jimmy",
                "abir": "ABIR",
            }.items()
        }
        days.append({"date": iso(offset), "resources": resources})
    return days


def session_script() -> str:
    session = {
        "access_token": "test-access-token",
        "refresh_token": "test-refresh-token",
        "expires_in": 3600,
        "expires_at": int(time.time()) + 3600,
        "token_type": "bearer",
        "user": {"id": "00000000-0000-4000-8000-000000000099"},
    }
    return f"""
        localStorage.setItem('vacleaner_session', {json.dumps(json.dumps(session))});
        localStorage.setItem('vacleaner_session_persistent', '1');
        localStorage.setItem('vacleaner_session_seen', String(Date.now()));
    """


def install_routes(context: BrowserContext, base: str, api_handler, static_root: Path | None = None) -> None:
    def serve_static(route: Route) -> None:
        parsed = urlparse(route.request.url)
        raw_path = unquote(parsed.path or "/")
        relative = raw_path.lstrip("/")
        candidate = (static_root / relative) if static_root else None
        if candidate and candidate.is_dir():
            candidate = candidate / "index.html"
        elif candidate and not candidate.suffix:
            directory_index = candidate / "index.html"
            if directory_index.exists():
                candidate = directory_index
        if not candidate or not candidate.exists() or not candidate.is_file():
            candidate = static_root / "404.html" if static_root else None
            if not candidate or not candidate.exists():
                route.fulfill(status=404, content_type="text/plain", body="Not found")
                return
        try:
            candidate.resolve().relative_to(static_root.resolve())
        except ValueError:
            route.fulfill(status=403, content_type="text/plain", body="Forbidden")
            return
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        route.fulfill(status=200, content_type=content_type, body=candidate.read_bytes())

    def route_handler(route: Route) -> None:
        url = route.request.url
        if url.startswith(SUPABASE_HOST):
            api_handler(route)
        elif url.startswith(base) and static_root is not None:
            serve_static(route)
        elif url.startswith(base):
            route.continue_()
        else:
            route.abort()

    context.route("**/*", route_handler)


def make_api_handler(config: dict[str, Any]):
    catalog = config["catalog"]
    slots = config["slots"]
    deposit_rules = config["depositRules"]

    def handler(route: Route) -> None:
        request = route.request
        url = request.url
        try:
            payload = request.post_data_json if request.post_data else {}
        except Exception:
            payload = {}
        if "/auth/v1/token" in url:
            body = {
                "access_token": "test-access-token",
                "refresh_token": "test-refresh-token",
                "expires_in": 3600,
                "expires_at": int(time.time()) + 3600,
                "token_type": "bearer",
                "user": {"id": "00000000-0000-4000-8000-000000000099"},
            }
        elif "/functions/v1/vacleaner-settings" in url:
            body = {"slots": slots, "depositRules": deposit_rules, "catalog": catalog}
        elif "/functions/v1/vacleaner-admin-bookings-v3" in url or "/functions/v1/vacleaner-admin-data-v1" in url:
            action = payload.get("action")
            if action == "list":
                body = {"bookings": BOOKINGS}
            elif action == "calendar":
                body = {"days": calendar_days()}
            elif action == "clients":
                body = {"customers": [{"phone": "+380951111111", "name": "Тестовий клієнт", "telegram": "@test_client", "address": "Полтава", "document_type": "ID-картка", "document_number": "000123", "document_verified_at": None}]}
            elif action == "save_customer":
                body = {"customer": {"phone": payload.get("customerPhone"), "name": payload.get("customerName")}}
            elif action == "lookup_customer":
                body = {"customer": None}
            elif action == "audit_log":
                body = {"entries": []}
            else:
                body = {"booking": BOOKINGS[0], "finance": {"refundAmount": 500, "dueAmount": 0}}
        elif "/functions/v1/vacleaner-booking-v5" in url:
            action = payload.get("action")
            if action == "loyalty_lookup":
                body = {"loyalty": {"level": "Start", "percent": 0, "completedOrders": 0}}
            elif action == "availability":
                body = {
                    "available": True,
                    "remaining": {"puzzi": 2},
                    "estimate": {
                        "rentalDays": 1,
                        "baseAmount": 700,
                        "extrasAmount": 0,
                        "deliveryAmount": 0,
                        "totalAmount": 700,
                        "prepaymentAmount": 200,
                    },
                }
            else:
                body = {"success": True, "bookingCode": "VAC-E2E-001", "status": "pending"}
        elif "/functions/v1/vacleaner-push" in url:
            body = {"publicKey": "B" * 88, "subscribedDevices": 0, "delivered": True}
        else:
            body = {}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body, ensure_ascii=False))

    return handler


class Checks:
    def __init__(self, artifacts: Path):
        self.artifacts = artifacts
        self.passed = 0
        self.failed: list[str] = []

    def check(self, condition: bool, label: str) -> None:
        if condition:
            self.passed += 1
            print(f"PASS: {label}")
        else:
            self.failed.append(label)
            print(f"FAIL: {label}")

    def screenshot(self, page: Page, name: str) -> None:
        self.artifacts.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(self.artifacts / name), full_page=True)


def no_horizontal_overflow(page: Page) -> bool:
    return bool(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"))


def public_tests(browser: Browser, base: str, api_handler, checks: Checks, static_root: Path) -> None:
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, service_workers="block")
    install_routes(context, base, api_handler, static_root)
    page = context.new_page()
    try:
        page.goto(f"{base}/bronuvannia/", wait_until="networkidle")
        page.wait_for_selector(".booking-summary")
        checks.check(page.locator(".booking-extras").get_by_text("Плямовивідник Carp-Deta 30 мл", exact=True).count() == 1, "Carp-Deta is shown once")
        carp = page.locator(".booking-extras label", has_text="Carp-Deta")
        checks.check(carp.count() == 1 and "100" in carp.locator("strong").inner_text(), "Carp-Deta price is 100 UAH")
        checks.check(page.locator(".vx-summary-prepayment").count() == 1, "One prepayment summary row")
        checks.check(page.locator(".vx-summary-deposit").count() == 1, "One deposit summary row")
        checks.check("Сплачується після підтвердження заявки" in page.locator(".vx-summary-prepayment").inner_text(), "Prepayment copy is clear")
        checks.check("Сплачується під час отримання техніки" in page.locator(".vx-summary-deposit").inner_text(), "Deposit copy is clear")
        summary_before = page.locator(".booking-summary").bounding_box()
        page.locator(".vx-date-trigger").first.click()
        page.wait_for_selector(".vx-calendar-layer.is-open")
        summary_during = page.locator(".booking-summary").bounding_box()
        stable = summary_before is not None and summary_during is not None and abs(summary_before["x"] - summary_during["x"]) < 1 and abs(summary_before["width"] - summary_during["width"]) < 1
        checks.check(stable, "Calendar does not shift booking summary")
        page.locator(".vx-calendar-close").click()
        page.locator(".booking-products button").first.click()
        dates = page.locator('.booking-date-grid input[type="date"]')
        page.wait_for_timeout(120)
        checks.check(dates.nth(0).input_value() == "" and dates.nth(1).input_value() == "", "Selecting equipment does not auto-select dates")
        checks.check(normalized_text(page.locator(".vx-summary-deposit strong").inner_text()) in {"—", "-"}, "Deposit stays unknown until dates are selected")
        checks.check("Оберіть дату" in page.locator(".vx-date-trigger").first.inner_text(), "Custom calendar shows no hidden preselected date")
        saturday, sunday = next_weekend()
        friday = (date.fromisoformat(saturday) - timedelta(days=1)).isoformat()
        monday = (date.fromisoformat(sunday) + timedelta(days=1)).isoformat()
        windows = page.locator('.booking-date-grid select')

        def set_period(start: str, finish: str, pickup: str, returned: str) -> str:
            dates.nth(0).fill(start)
            windows.nth(0).select_option(pickup)
            dates.nth(1).fill(finish)
            windows.nth(1).select_option(returned)
            dates.nth(1).dispatch_event("change")
            windows.nth(1).dispatch_event("change")
            page.wait_for_timeout(220)
            return normalized_text(page.locator(".vx-summary-deposit strong").inner_text())

        checks.check("1 000" in set_period(saturday, sunday, "morning", "morning"), "Saturday morning to Sunday morning keeps 1000 UAH deposit")
        checks.check("1 000" in set_period(saturday, sunday, "evening", "evening"), "Saturday evening to Sunday evening keeps 1000 UAH deposit")
        checks.check("2 000" in set_period(friday, sunday, "evening", "morning"), "Friday evening to Sunday morning uses 2000 UAH weekend deposit")
        checks.check("2 000" in set_period(friday, sunday, "evening", "evening"), "Friday evening to Sunday evening uses 2000 UAH weekend deposit")
        checks.check("2 000" in set_period(saturday, monday, "morning", "morning"), "Saturday morning to Monday morning uses 2000 UAH weekend deposit")
        browser_policy = page.evaluate("""([friday,saturday,sunday])=>({
          friMorning: window.VACLEANER_CORE.rentalBase(window.VACLEANER_CORE.products.sc2,friday,saturday,'morning','morning'),
          friEvening: window.VACLEANER_CORE.rentalBase(window.VACLEANER_CORE.products.sc2,friday,saturday,'evening','evening'),
          sunMorning: window.VACLEANER_CORE.rentalBase(window.VACLEANER_CORE.products.sc2,sunday,new Date(Date.parse(sunday+'T12:00:00Z')+86400000).toISOString().slice(0,10),'morning','morning'),
          sunEvening: window.VACLEANER_CORE.rentalBase(window.VACLEANER_CORE.products.sc2,sunday,new Date(Date.parse(sunday+'T12:00:00Z')+86400000).toISOString().slice(0,10),'evening','evening'),
          handoff: window.VACLEANER_CORE.periodsOverlap(friday,saturday,'morning','morning',saturday,sunday,'morning','morning')
        })""", [friday, saturday, sunday])
        checks.check(browser_policy["friMorning"] == 500, "Friday morning uses weekday rental tariff")
        checks.check(browser_policy["friEvening"] == 600, "Friday evening uses weekend rental tariff")
        checks.check(browser_policy["sunMorning"] == 600, "Sunday morning uses weekend rental tariff")
        checks.check(browser_policy["sunEvening"] == 500, "Sunday evening uses weekday rental tariff")
        checks.check(browser_policy["handoff"] is False, "Morning return releases equipment for morning pickup")
        checks.check("Оберіть дату" not in page.locator(".vx-date-trigger").first.inner_text(), "Custom calendar stays synchronized with selected dates")
        checks.check(no_horizontal_overflow(page), "Public desktop has no horizontal overflow")
        checks.screenshot(page, "public-desktop.png")
    finally:
        context.close()

    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, service_workers="block")
    install_routes(context, base, api_handler, static_root)
    page = context.new_page()
    try:
        page.goto(f"{base}/bronuvannia/", wait_until="networkidle")
        page.wait_for_selector(".booking-form.vx-mobile-stepper")
        page.wait_for_selector(".booking-mobile-summary")
        checks.check(no_horizontal_overflow(page), "Public mobile has no horizontal overflow")
        checks.check(page.locator(".booking-mobile-summary button").bounding_box()["height"] >= 44, "Public mobile CTA is at least 44px")
        checks.check(page.locator(".mobile-booking:visible").count() == 0, "Booking page has only one mobile CTA layer")
        checks.check(page.locator(".booking-step.is-vx-active").count() == 1, "Only one booking step is visible on mobile")
        checks.check(page.locator("#booking-products.is-vx-active").count() == 1, "Mobile booking starts from equipment step")
        progress_labels = page.locator(".booking-progress button b:visible")
        checks.check(progress_labels.count() == 4, "Mobile progress keeps all four step labels")
        page.locator(".booking-progress button").nth(1).click()
        page.wait_for_timeout(100)
        checks.check(page.locator("#booking-dates.is-vx-active").count() == 1 and page.locator("#booking-products:visible").count() == 0, "Progress navigation switches mobile booking step")
        checks.screenshot(page, "public-mobile.png")
        page.goto(f"{base}/", wait_until="networkidle")
        page.wait_for_selector(".site-header")
        brand_box = page.locator(".site-header .brand").bounding_box()
        menu_box = page.locator(".site-header .menu-button").bounding_box()
        same_row = brand_box is not None and menu_box is not None and abs((brand_box["y"] + brand_box["height"] / 2) - (menu_box["y"] + menu_box["height"] / 2)) < 4
        checks.check(same_row, "Mobile header logo and menu stay on one row")
        checks.check(page.locator(".header-cta:visible").count() == 0, "Mobile header does not duplicate booking CTA")
        checks.check(page.locator(".mobile-booking:visible").count() == 1, "Regular pages keep one bottom CTA")
        hero_box = page.locator(".v21-hero-copy").bounding_box()
        viewport_height = page.viewport_size["height"] if page.viewport_size else 844
        hero_limit = min(700, viewport_height * 0.85)
        checks.check(hero_box is not None and hero_box["height"] <= hero_limit, "Mobile home hero copy is compact")
        checks.screenshot(page, "home-mobile.png")
    finally:
        context.close()


def admin_tests(browser: Browser, base: str, api_handler, checks: Checks, static_root: Path) -> None:
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, service_workers="block")
    context.add_init_script(session_script())
    install_routes(context, base, api_handler, static_root)
    page = context.new_page()
    try:
        page.goto(f"{base}/admin/bronuvannia/", wait_until="networkidle")
        page.wait_for_selector(".booking-list")
        desktop_views = ["bookings", "calendar", "upcoming", "equipment", "clients", "analytics", "chemistry", "settings"]
        checks.check(all(page.locator(f'.nav button[data-view="{view}"]').count() == 1 for view in desktop_views), "All eight desktop sections are available")
        checks.check(page.locator(".operations-bar").count() == 1, "Operations attention panel is visible")
        checks.check(page.locator(".booking-card").count() >= 4, "Booking cards render from API")
        page.locator("#newBooking").click()
        page.wait_for_selector("#bookingForm")
        checks.check(page.locator("#bookingForm").get_by_text("Плямовивідник Carp-Deta 30 мл", exact=True).count() == 1, "Carp-Deta is available in admin booking form")
        fulfillment = page.locator('#bookingForm select[name="fulfillment"]')
        document_type = page.locator('#bookingForm select[name="documentType"]')
        checks.check(fulfillment.evaluate("el => getComputedStyle(el).appearance") == "none", "Fulfillment select uses premium styling")
        checks.check(document_type.evaluate("el => getComputedStyle(el).appearance") == "none", "Document type select uses premium styling")
        checks.check(select_uses_dark_theme(page, '#bookingForm select[name="fulfillment"]'), "Select options define their own dark theme")
        document_check = page.locator('#bookingForm input[name="identityVerified"]')
        document_check.check()
        checks.check(document_check.is_checked() and document_check.evaluate("el => getComputedStyle(el).backgroundImage") != "none", "Document verified checkbox has checked visual")
        checks.check(page.locator('#bookingForm .switch:has(input[name="discount10"])').count() == 1, "Discount uses unified switch card")
        footer = page.locator("#bookingForm footer")
        box = footer.bounding_box()
        checks.check(box is not None and box["y"] < 1000 and box["height"] >= 44, "Desktop modal footer is visible")
        checks.check(no_horizontal_overflow(page), "Admin desktop has no horizontal overflow")
        checks.screenshot(page, "admin-desktop-modal.png")
        page.locator("#bookingForm header [data-close]").click()
        page.locator("#globalSearch").fill("VAC-TEST-001")
        checks.check(page.locator(".booking-card").count() == 1, "Global search filters bookings")
        page.locator("#clearSearch").click()
        checks.check(page.locator(".booking-card").count() >= 4, "Search clear restores bookings")
    finally:
        context.close()

    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, service_workers="block")
    context.add_init_script(session_script())
    install_routes(context, base, api_handler, static_root)
    page = context.new_page()
    try:
        page.goto(f"{base}/admin/bronuvannia/", wait_until="networkidle")
        page.wait_for_selector(".booking-list")
        mobile_selectors = [
            '.nav button[data-view="bookings"]:visible',
            '.nav button[data-view="calendar"]:visible',
            '.nav button[data-view="upcoming"]:visible',
            '.nav button[data-view="equipment"]:visible',
            '.more-nav:visible',
        ]
        checks.check(all(page.locator(selector).count() == 1 for selector in mobile_selectors), "Mobile bottom navigation has five primary items")
        page.locator(".more-nav:visible").click()
        more = page.locator(".mobile-more-card")
        checks.check(more.get_by_text("Клієнти", exact=True).count() == 1 and more.get_by_text("Налаштування", exact=True).count() == 1, "Mobile More contains remaining sections")
        page.keyboard.press("Escape")
        page.evaluate("document.querySelector('.main').scrollTop=600")
        page.locator('.nav button[data-view="calendar"]:visible').click()
        page.wait_for_timeout(100)
        checks.check(page.evaluate("document.querySelector('.main').scrollTop") == 0, "Mobile tab switch returns content to top")
        tap_heights = page.locator(".nav button:visible").evaluate_all("els => els.map(el => el.getBoundingClientRect().height)")
        checks.check(all(height >= 44 for height in tap_heights), "Mobile navigation tap targets are at least 44px")
        page.locator("#newBooking").click()
        page.wait_for_selector("#bookingForm")
        footer = page.locator("#bookingForm footer")
        box = footer.bounding_box()
        checks.check(box is not None and box["height"] >= 44, "Mobile modal footer remains usable")
        checks.check(no_horizontal_overflow(page), "Admin mobile has no horizontal overflow")
        checks.screenshot(page, "admin-mobile-modal.png")
    finally:
        context.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="dist")
    parser.add_argument("--artifacts", default="test-results")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    artifacts = Path(args.artifacts).resolve()
    if not (root / "index.html").exists():
        raise SystemExit(f"Static root is missing: {root}")
    config = json.loads((PROJECT_ROOT / "config" / "vacleaner.json").read_text(encoding="utf-8"))
    checks = Checks(artifacts)
    api_handler = make_api_handler(config)
    base = "http://127.0.0.1:4173"
    with sync_playwright() as playwright:
        executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
        launch_options = {"headless": True, "args": ["--no-sandbox"]}
        if executable:
            launch_options["executable_path"] = executable
        elif Path("/usr/bin/chromium").exists():
            launch_options["executable_path"] = "/usr/bin/chromium"
        browser = playwright.chromium.launch(**launch_options)
        try:
            public_tests(browser, base, api_handler, checks, root)
            admin_tests(browser, base, api_handler, checks, root)
        except Exception as exc:
            checks.failed.append(f"Unhandled browser error: {exc}")
            print(f"FAIL: Unhandled browser error: {exc}")
        finally:
            browser.close()
    result = {
        "passed": checks.passed,
        "failed": checks.failed,
        "status": "passed" if not checks.failed else "failed",
    }
    artifacts.mkdir(parents=True, exist_ok=True)
    (artifacts / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    return 0 if not checks.failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
