#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import time
import threading
from contextlib import contextmanager
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, BrowserContext, Page, Route, expect, sync_playwright

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


def choose_booking_slot(page: Page, index: int, value: str, scope: str = ".booking-date-grid") -> None:
    """Drive the customer-visible slot cards; the native select is state-only after enhancement."""
    native = page.locator(f"{scope} select").nth(index)
    custom = page.locator(f"{scope} .vx-slot-options").nth(index)
    expect(custom).to_be_visible()
    button = custom.locator(f'button[data-value="{value}"]')
    expect(button).to_be_visible()
    button.click()
    expect(native).to_have_value(value)


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


class QuietStaticHandler(SimpleHTTPRequestHandler):
    """Serve the built site exactly as a browser receives it, without noisy CI logs."""

    def log_message(self, _format: str, *_args: Any) -> None:
        return

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


@contextmanager
def static_server(root: Path):
    handler = partial(QuietStaticHandler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def install_routes(context: BrowserContext, base: str, api_handler) -> None:

    def route_handler(route: Route) -> None:
        url = route.request.url
        if url.startswith(SUPABASE_HOST):
            api_handler(route)
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

    def capture_failure(self, page: Page, stem: str, runtime_events: list[dict[str, Any]] | None = None) -> None:
        """Persist enough browser state to diagnose CI without reproducing it locally."""
        self.artifacts.mkdir(parents=True, exist_ok=True)
        diagnostics: dict[str, Any] = {"url": page.url, "runtimeEvents": runtime_events or []}
        try:
            diagnostics.update(page.evaluate("""()=>({
              title:document.title,
              readyState:document.readyState,
              bodyClass:document.body?.className||'',
              viewportWidth:window.innerWidth,
              summaryCount:document.querySelectorAll('.booking-summary').length,
              summaryDisplay:document.querySelector('.booking-summary')
                ? getComputedStyle(document.querySelector('.booking-summary')).display
                : null
            })"""))
        except Exception as exc:
            diagnostics["evaluationError"] = str(exc)
        try:
            (self.artifacts / f"{stem}.html").write_text(page.content(), encoding="utf-8")
        except Exception as exc:
            diagnostics["htmlError"] = str(exc)
        try:
            page.screenshot(path=str(self.artifacts / f"{stem}.png"), full_page=True)
        except Exception as exc:
            diagnostics["screenshotError"] = str(exc)
        (self.artifacts / f"{stem}.json").write_text(
            json.dumps(diagnostics, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


def no_horizontal_overflow(page: Page) -> bool:
    return bool(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"))


def public_tests(browser: Browser, base: str, api_handler, checks: Checks, static_root: Path) -> None:
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, service_workers="block")
    context.add_init_script(r"""
      window.__vacPackageTitleHistory=[];
      const recordPackageTitles=()=>{
        if(location.pathname.replace(/\/+$/,'')!=='/komplekty')return;
        const titles=[...document.querySelectorAll('.package-page-grid .package-card h2')].map(el=>(el.textContent||'').trim());
        if(!titles.length)return;
        const signature=JSON.stringify(titles);
        const last=window.__vacPackageTitleHistory.at(-1);
        if(!last||last.signature!==signature)window.__vacPackageTitleHistory.push({signature,titles,time:performance.now()});
      };
      new MutationObserver(recordPackageTitles).observe(document,{subtree:true,childList:true,characterData:true});
      document.addEventListener('DOMContentLoaded',recordPackageTitles);
    """)
    install_routes(context, base, api_handler)
    page = context.new_page()
    runtime_events: list[dict[str, Any]] = []
    page.on("console", lambda message: runtime_events.append({"type": "console", "level": message.type, "text": message.text}))
    page.on("pageerror", lambda error: runtime_events.append({"type": "pageerror", "text": str(error)}))
    page.on("requestfailed", lambda request: runtime_events.append({"type": "requestfailed", "url": request.url, "error": request.failure or "unknown"}))
    try:
        response = page.goto(f"{base}/bronuvannia/", wait_until="networkidle")
        checks.check(response is not None and response.ok, "Booking page is served over HTTP")
        page.wait_for_selector(".booking-summary", state="attached")
        expect(page.locator(".booking-summary")).to_be_visible()
        spot = page.locator(".booking-extras label", has_text="Універсальний плямовивідник")
        stain = page.locator(".booking-extras label", has_text="VA STAIN OX")
        checks.check(spot.count() == 1 and "100" in spot.locator("strong").inner_text(), "universal stain remover is shown once at 100 UAH")
        checks.check(stain.count() == 1 and "100" in stain.locator("strong").inner_text(), "VA STAIN OX is shown once at 100 UAH")
        checks.check(page.locator(".booking-extras", has_text="Carp-Deta").count() == 0, "Legacy Carp-Deta is hidden publicly")
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
        def set_period(start: str, finish: str, pickup: str, returned: str, expected: str) -> str:
            def settle_date(control, value: str) -> None:
                control.fill(value)
                page.evaluate("()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))")
                expect(control).to_have_value(value)

            settle_date(dates.nth(0), start)
            choose_booking_slot(page, 0, pickup)
            settle_date(dates.nth(1), finish)
            choose_booking_slot(page, 1, returned)
            deposit = page.locator(".vx-summary-deposit strong")
            expect(deposit).to_contain_text(expected, timeout=3000)
            return normalized_text(deposit.inner_text())

        checks.check("1 000" in set_period(saturday, sunday, "morning", "morning", "1 000"), "Saturday morning to Sunday morning keeps 1000 UAH deposit")
        checks.check("1 000" in set_period(saturday, sunday, "evening", "evening", "1 000"), "Saturday evening to Sunday evening keeps 1000 UAH deposit")
        checks.check("2 000" in set_period(friday, sunday, "evening", "morning", "2 000"), "Friday evening to Sunday morning uses 2000 UAH weekend deposit")
        checks.check("2 000" in set_period(friday, sunday, "evening", "evening", "2 000"), "Friday evening to Sunday evening uses 2000 UAH weekend deposit")
        checks.check("2 000" in set_period(saturday, monday, "morning", "morning", "2 000"), "Saturday morning to Monday morning uses 2000 UAH weekend deposit")
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

        page.goto(f"{base}/bronuvannia/?product=puzzi", wait_until="networkidle")
        page.wait_for_selector("#booking-products.vx-product-prefilled")
        checks.check(page.locator("#booking-products .booking-products>button:visible").count() == 1, "Product-aware booking shows only the preselected equipment")
        change_product = page.locator(".vx-product-prefill-bar button")
        checks.check(change_product.count() == 1 and "Змінити техніку" in change_product.inner_text(), "Product-aware booking keeps an explicit equipment change action")
        change_product.click()
        checks.check(page.locator("#booking-products .booking-products>button:visible").count() >= 8, "Equipment change action restores the complete catalogue")
        consent = page.locator(".booking-consent span")
        checks.check("умови бронювання і політику конфіденційності." in normalized_text(consent.inner_text()), "Booking consent has complete legal punctuation")
        checks.check(consent.locator('a[href="/umovy/"]').count() == 1 and consent.locator('a[href="/polityka-konfidenciynosti/"]').count() == 1, "Booking consent links to both legal pages")

        page.goto(f"{base}/", wait_until="networkidle")
        quiz_cta = page.locator("a", has_text="Підібрати рішення ↓").first
        checks.check(quiz_cta.count() == 1 and quiz_cta.get_attribute("href") == "/pidbir/", "Home solution CTA opens the dedicated quiz")

        page.goto(f"{base}/komplekty/", wait_until="networkidle")
        page.wait_for_selector(".package-page-grid .package-card h2")
        canonical_package_titles = [
            "Глибоке очищення диванів і матраців", "Дивани + вікна", "Дивани + кухня та ванна",
            "Генеральне прибирання", "Ідеальні вікна", "HOME RESET",
        ]
        live_titles = [title.strip() for title in page.locator(".package-page-grid .package-card h2").all_inner_texts()]
        title_history = page.evaluate("window.__vacPackageTitleHistory || []")
        checks.check(live_titles == canonical_package_titles, "Package page keeps all six canonical titles after hydration")
        checks.check(all(not any(stale in " ".join(entry.get("titles", [])) for stale in ["Комбо","Глибоке очищення текстилю","Текстиль + вікна","Текстиль + кухня та ванна"]) for entry in title_history), "Package titles never flash retired public names during hydration")
        price_geometry = page.locator(".package-page-grid .package-card").evaluate_all(r"""cards=>cards.map(card=>{
          const cardBox=card.getBoundingClientRect(),price=card.querySelector('.package-price')?.getBoundingClientRect();
          return price?{cardTop:cardBox.top,priceTop:price.top-cardBox.top}:null;
        }).filter(Boolean)""")
        row1=[entry["priceTop"] for entry in price_geometry[:3]]
        row2=[entry["priceTop"] for entry in price_geometry[3:6]]
        checks.check(len(row1)==3 and max(row1)-min(row1)<=1.5, "Package prices share one baseline across desktop row 1")
        checks.check(len(row2)==3 and max(row2)-min(row2)<=1.5, "Package prices share one baseline across desktop row 2")
        checks.screenshot(page, "packages-desktop.png")
    except Exception:
        checks.capture_failure(page, "public-desktop-failure", runtime_events)
        raise
    finally:
        context.close()

    # Full public small-desktop sweep: this is where long editorial headings and
    # breakpoint gaps tend to surface (for example /dostavka/ around 1024px).
    context = browser.new_context(viewport={"width": 1024, "height": 900}, service_workers="block")
    install_routes(context, base, api_handler)
    page = context.new_page()
    try:
        visual_paths = ["/", "/tekhnika/karcher-puzzi-8-1/", "/rishennia/", "/komplekty/", "/yak-tse-pratsiuie/", "/vidhuky/", "/faq/", "/kontakty/", "/umovy/", "/dostavka/", "/pro-nas/", "/blog/", "/polityka-konfidenciynosti/"]
        small_desktop_ok = True
        hero_titles_ok = True
        for path in visual_paths:
            page.goto(f"{base}{path}", wait_until="networkidle")
            page.wait_for_selector(".site-header")
            if not no_horizontal_overflow(page):
                small_desktop_ok = False
                break
            hero = page.locator(".inner-hero h1").first
            if hero.count():
                fits = hero.evaluate("el => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= innerWidth + 1")
                if not fits:
                    hero_titles_ok = False
                    break
        checks.check(small_desktop_ok, "All public pages avoid horizontal overflow at 1024px")
        checks.check(hero_titles_ok, f"Editorial hero titles fit their grid columns at 1024px ({path})")
        page.goto(f"{base}/tekhnika/karcher-puzzi-8-1/", wait_until="networkidle")
        hero_image_fill = page.locator(".puzzi-hero-visual img").evaluate("""img=>{
          const frame=img.parentElement.getBoundingClientRect(),r=img.getBoundingClientRect(),style=getComputedStyle(img);
          return style.objectFit==='cover' && Math.abs(r.left-frame.left)<=1 && Math.abs(r.top-frame.top)<=1 && Math.abs(r.right-frame.right)<=1 && Math.abs(r.bottom-frame.bottom)<=1;
        }""")
        checks.check(hero_image_fill, "Puzzi hero image fills its complete visual panel at 1024px")
        checks.screenshot(page, "puzzi-1024.png")
    finally:
        context.close()

    # /pidbir/ must have a usable first paint even if JS is slow or unavailable.
    context = browser.new_context(viewport={"width": 1024, "height": 900}, java_script_enabled=False, service_workers="block")
    install_routes(context, base, api_handler)
    page = context.new_page()
    try:
        page.goto(f"{base}/pidbir/", wait_until="domcontentloaded")
        fallback = page.locator(".inner-hero")
        checks.check(fallback.count() == 1 and fallback.is_visible(), "Smart Guide keeps a visible no-JS fallback instead of a blank page")
    finally:
        context.close()

    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, service_workers="block")
    install_routes(context, base, api_handler)
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
        checks.check(page.locator("#booking-products.is-vx-active").count() == 1 and page.locator("#booking-dates:visible").count() == 0, "Locked progress navigation does not skip mobile booking prerequisites")
        checks.check(page.locator("main > footer.v4-footer:visible").count() == 0, "Mobile booking keeps reviews/footer outside the four-step wizard")
        deposit_note = page.locator(".vx-mobile-deposit")
        checks.check(deposit_note.count() == 1 and "…" not in deposit_note.inner_text() and "після вибору дат" in deposit_note.inner_text(), "Mobile booking deposit hint stays readable without ellipsis")

        # Regression: the fixed CTA belongs to the wizard step, not to transient estimate refreshes.
        # Any step-3/4 change may refresh the estimate, but it must never send the CTA back to dates.
        cta = page.locator(".booking-mobile-summary button")
        checks.check("Обрати техніку" in cta.inner_text(), "Mobile CTA starts on equipment")
        page.locator(".booking-products button").first.click()
        page.wait_for_timeout(60)
        checks.check("Обрати дату" in cta.inner_text(), "Mobile CTA advances equipment → date")
        cta.click()
        page.wait_for_timeout(80)
        checks.check(page.locator("#booking-dates.is-vx-active").count() == 1, "Mobile CTA opens date step")

        mobile_dates = page.locator('#booking-dates input[type="date"]')
        mobile_dates.nth(0).fill(iso(2))
        choose_booking_slot(page, 0, "morning", "#booking-dates")
        mobile_dates.nth(1).fill(iso(3))
        choose_booking_slot(page, 1, "morning", "#booking-dates")
        mobile_dates.nth(1).dispatch_event("change")
        page.wait_for_timeout(520)
        checks.check("До отримання" in cta.inner_text(), "Mobile CTA advances date → fulfillment after availability")
        cta.click()
        page.wait_for_timeout(80)
        checks.check(page.locator("#booking-extras.is-vx-active").count() == 1, "Mobile CTA opens fulfillment step")

        delivery = page.locator('#booking-extras .booking-choice-row button', has_text='Доставка по Полтаві')
        delivery.click()
        page.wait_for_timeout(50)
        checks.check("Обрати дату" not in cta.inner_text(), "Delivery choice never regresses CTA to date during estimate refresh")
        address = page.locator('#booking-extras .booking-delivery-address input')
        address.fill('Європейська 146Е, кв. 1')
        page.wait_for_timeout(50)
        checks.check("До контактів" in cta.inner_text(), "Valid delivery address advances CTA to contacts immediately")
        page.wait_for_timeout(420)
        checks.check("До контактів" in cta.inner_text(), "Delivery estimate refresh keeps CTA on contacts")

        story = page.locator('#booking-extras .booking-chemistry input[type="checkbox"]')
        story.check()
        page.wait_for_timeout(50)
        checks.check("До контактів" in cta.inner_text(), "Stories checkbox never regresses CTA to date")
        page.wait_for_timeout(420)
        checks.check("До контактів" in cta.inner_text(), "Stories estimate refresh keeps CTA on contacts")

        extra = page.locator('#booking-extras .booking-extras input[type="checkbox"]').first
        extra.check()
        page.wait_for_timeout(50)
        checks.check("До контактів" in cta.inner_text(), "Extra-item checkbox never regresses CTA to date")
        page.wait_for_timeout(420)
        checks.check("До контактів" in cta.inner_text(), "Extra-item estimate refresh keeps CTA on contacts")

        cta.click()
        page.wait_for_timeout(80)
        checks.check(page.locator("#booking-contact.is-vx-active").count() == 1, "Mobile CTA opens contacts step")
        contact_inputs = page.locator('#booking-contact .booking-contact-grid input')
        contact_inputs.nth(0).fill('Тестовий Клієнт')
        contact_inputs.nth(1).fill('+380951111111')
        page.wait_for_timeout(50)
        checks.check("Обрати дату" not in cta.inner_text(), "Phone entry never regresses CTA to date")
        page.wait_for_timeout(420)
        checks.check("Обрати дату" not in cta.inner_text(), "Phone estimate refresh keeps CTA on contacts")
        promo = page.locator('#booking-contact .booking-promo-field input')
        promo.fill('RETURN10')
        page.wait_for_timeout(50)
        checks.check("Обрати дату" not in cta.inner_text(), "Promo entry never regresses CTA to date")
        page.wait_for_timeout(420)
        checks.check("Обрати дату" not in cta.inner_text(), "Promo estimate refresh keeps CTA on contacts")
        page.locator('#booking-contact .booking-consent input').check()
        page.wait_for_timeout(50)
        checks.check("Надіслати заявку" in cta.inner_text(), "Completed contacts expose final submit CTA")

        checks.screenshot(page, "public-mobile.png")
        page.goto(f"{base}/", wait_until="networkidle")
        page.wait_for_selector(".site-header")
        brand_box = page.locator(".site-header .brand").bounding_box()
        menu_box = page.locator(".site-header .menu-button").bounding_box()
        same_row = brand_box is not None and menu_box is not None and abs((brand_box["y"] + brand_box["height"] / 2) - (menu_box["y"] + menu_box["height"] / 2)) < 4
        checks.check(same_row, "Mobile header logo and menu stay on one row")
        checks.check(page.locator(".header-cta:visible").count() == 0, "Mobile header does not duplicate booking CTA")
        checks.check(page.locator(".mobile-booking:visible").count() == 1, "Regular pages keep one bottom CTA")

        regular_paths = ["/", "/tekhnika/karcher-puzzi-8-1/", "/rishennia/", "/komplekty/", "/yak-tse-pratsiuie/", "/vidhuky/", "/faq/", "/kontakty/", "/umovy/"]
        mobile_cta_ok = True
        for path in regular_paths:
            page.goto(f"{base}{path}", wait_until="networkidle")
            cta = page.locator(".mobile-booking:visible")
            if cta.count() != 1:
                mobile_cta_ok = False
                break
            links = cta.locator("a:visible")
            if links.count() != 2:
                mobile_cta_ok = False
                break
            box = cta.bounding_box()
            first = links.nth(0).bounding_box()
            second = links.nth(1).bounding_box()
            display = cta.evaluate("el => getComputedStyle(el).display")
            if not box or not first or not second or display != "grid":
                mobile_cta_ok = False
                break
            first_right = first["x"] + first["width"]
            second_right = second["x"] + second["width"]
            container_right = box["x"] + box["width"]
            if first_right > second["x"] + 1 or first["x"] < box["x"] - 1 or second_right > container_right + 1 or not no_horizontal_overflow(page):
                mobile_cta_ok = False
                break
        checks.check(mobile_cta_ok, "Mobile booking and Instagram CTA never overlap on public pages")

        page.goto(f"{base}/tekhnika/karcher-puzzi-8-1/", wait_until="networkidle")
        puzzi_mobile_fill = page.locator(".puzzi-hero-visual img").evaluate("""img=>{
          const frame=img.parentElement.getBoundingClientRect(),r=img.getBoundingClientRect(),style=getComputedStyle(img);
          return style.objectFit==='cover' && Math.abs(r.width-frame.width)<=1 && Math.abs(r.height-frame.height)<=1;
        }""")
        checks.check(puzzi_mobile_fill and no_horizontal_overflow(page), "Puzzi hero fills the mobile panel without horizontal overflow")
        checks.screenshot(page, "puzzi-mobile.png")

        page.goto(f"{base}/vidhuky/", wait_until="networkidle")
        page.wait_for_selector(".vx-proof__cta")
        review_cta = page.locator(".vx-proof__cta")
        review_style = review_cta.evaluate("el=>({background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color,fill:getComputedStyle(el).webkitTextFillColor,appearance:getComputedStyle(el).appearance})")
        checks.check("linear-gradient" in review_style["background"] and review_style["appearance"] == "none" and review_style["fill"] not in ("", "auto"), "Review first-collection CTA keeps VAcleaner styling instead of Safari browser blue")

        page.goto(f"{base}/", wait_until="networkidle")
        page.wait_for_selector(".vx-home-reset-gift")
        checks.check(page.locator('.vx-home-reset-gift').first.get_attribute('href') == 'https://vahome.com.ua/catalog?collection=entry', "HOME RESET diffuser gift opens the VA HOME Entry collection filter")
        finish = page.locator('.v21-day-grid article').filter(has_text='Дім знову свіжий').first
        checks.check(finish.count() == 1 and 'Фінальний штрих — аромадифузор VA HOME · Entry у подарунок' in finish.locator('p').inner_text(), "HOME RESET real plan ends with the VA HOME atmosphere step")

        page.goto(f"{base}/", wait_until="networkidle")
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
    install_routes(context, base, api_handler)
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
        checks.check(page.locator("#bookingForm").get_by_text("VA SPOT FIX · 50 мл", exact=True).count() == 1, "VA SPOT FIX is available in admin booking form")
        checks.check(page.locator("#bookingForm").get_by_text("VA STAIN OX · 30 мл", exact=True).count() == 1, "VA STAIN OX is available in admin booking form")
        fulfillment = page.locator('#bookingForm select[name="fulfillment"]')
        document_type = page.locator('#bookingForm select[name="documentType"]')
        checks.check(fulfillment.evaluate("el => getComputedStyle(el).appearance") == "none", "Fulfillment select uses premium styling")
        checks.check(document_type.evaluate("el => getComputedStyle(el).appearance") == "none", "Document type select uses premium styling")
        checks.check(select_uses_dark_theme(page, '#bookingForm select[name="fulfillment"]'), "Select options define their own dark theme")
        document_check = page.locator('#bookingForm input[name="identityVerified"]')
        document_check.check()
        checks.check(document_check.is_checked() and document_check.evaluate("el => getComputedStyle(el).backgroundImage") != "none", "Document verified checkbox has checked visual")
        discount_editor = page.locator('#bookingForm [data-discount-editor]')
        checks.check(discount_editor.count() == 1, "Booking form has one custom manual discount editor")
        checks.check(discount_editor.locator('[data-discount-choice]').count() == 4, "Manual discount offers none, 5%, 10% and fixed amount")
        checks.check(discount_editor.locator('[data-discount-choice="p5"]').evaluate("el => getComputedStyle(el).appearance") == "none", "Discount buttons do not use browser-native appearance")
        discount_editor.locator('[data-discount-choice="fixed"]').click()
        fixed_discount = discount_editor.locator('[data-discount-fixed]')
        checks.check(fixed_discount.is_visible() and fixed_discount.get_attribute('inputmode') == 'numeric', "Fixed discount opens a custom numeric field")
        checks.check(float(fixed_discount.evaluate("el => parseFloat(getComputedStyle(el).fontSize)")) >= 16, "Fixed discount field is iPhone-safe at 16px or larger")
        discount_editor.locator('[data-discount-choice="none"]').click()
        footer = page.locator("#bookingForm footer")
        box = footer.bounding_box()
        checks.check(box is not None and box["y"] < 1000 and box["height"] >= 44, "Desktop modal footer is visible")
        checks.check(no_horizontal_overflow(page), "Admin desktop has no horizontal overflow")
        checks.screenshot(page, "admin-desktop-modal.png")
        page.locator("#bookingForm header [data-close]").click()
        issued_return = page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000004"] [data-action="complete"]')
        checks.check(issued_return.count() == 1, "Issued booking exposes the return settlement action")
        issued_return.click()
        page.wait_for_selector("#financeForm")
        return_discount = page.locator('#financeForm [data-discount-editor]')
        checks.check(return_discount.count() == 1, "Return settlement has the same manual discount editor")
        return_discount.locator('[data-discount-choice="p5"]').click()
        return_discount.get_by_role("button", name="Компенсація", exact=True).click()
        checks.check(return_discount.locator('[name="manualDiscountType"]').input_value() == 'percent' and return_discount.locator('[name="manualDiscountValue"]').input_value() == '5', "Return settlement can apply a manual 5% discount")
        checks.check("оренда після знижки" in return_discount.locator('[data-discount-preview]').inner_text(), "Return settlement recalculates the rental live")
        finance_scroll = page.locator('#financeForm .modal-layout')
        checks.check(finance_scroll.evaluate("el => ['auto','scroll'].includes(getComputedStyle(el).overflowY)"), "Return settlement uses its own scroll container")
        checks.check(no_horizontal_overflow(page), "Return settlement has no horizontal overflow")
        page.locator("#financeForm header [data-close]").click()
        page.locator("#globalSearch").fill("VAC-TEST-001")
        checks.check(page.locator(".booking-card").count() == 1, "Global search filters bookings")
        page.locator("#clearSearch").click()
        checks.check(page.locator(".booking-card").count() >= 4, "Search clear restores bookings")
    finally:
        context.close()

    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, service_workers="block")
    context.add_init_script(session_script())
    install_routes(context, base, api_handler)
    page = context.new_page()
    try:
        page.goto(f"{base}/admin/bronuvannia/", wait_until="networkidle")
        page.wait_for_selector(".upcoming-scope")
        mobile_selectors = [
            '.mobile-nav button[data-mobile-view="upcoming"]:visible',
            '.mobile-nav button[data-mobile-view="bookings"]:visible',
            '#mobileNewBooking:visible',
            '.mobile-nav button[data-mobile-view="calendar"]:visible',
            '.mobile-nav .more-nav:visible',
        ]
        checks.check(all(page.locator(selector).count() == 1 for selector in mobile_selectors), "Mobile bottom navigation has five primary items")
        order = page.locator('.mobile-nav > button:visible').evaluate_all("els=>els.map(el=>el.dataset.mobileView||el.id||el.dataset.mobileMore)")
        checks.check(order == ['upcoming','bookings','mobileNewBooking','calendar','1'], "Mobile bottom navigation order is Upcoming, Bookings, New, Calendar, More")
        checks.check(page.locator('.mobile-nav button[data-mobile-view="upcoming"].active:visible').count() == 1, "Upcoming is the mobile start view")
        checks.check(page.locator('html').evaluate("el=>el.classList.contains('pwa-browser')&&!el.classList.contains('pwa-standalone')"), "Mobile browser admin uses the browser-only shell contract")
        page.evaluate("window.scrollTo(0,99999)")
        page.wait_for_timeout(50)
        checks.check(page.evaluate("window.scrollY") == 0 and page.locator('.main').evaluate("el=>['auto','scroll'].includes(getComputedStyle(el).overflowY)"), "Mobile browser cannot scroll the root into blank space while main remains scrollable")
        page.locator(".mobile-nav .more-nav:visible").click()
        checks.check(page.locator('.mobile-nav .more-nav.active:visible').count() == 1 and page.locator('.mobile-nav button[data-mobile-view].active:visible').count() == 0, "Opening More makes More the only active bottom-nav item")
        more = page.locator(".mobile-more-menu:visible")
        expected_more = ["Техніка", "Клієнти", "Кампанії", "Аналітика", "Хімія", "Налаштування"]
        checks.check(more.count() == 1 and all(more.get_by_text(label, exact=True).count() == 1 for label in expected_more), "Mobile More contains all six secondary sections")
        page.keyboard.press("Escape")
        page.wait_for_timeout(30)
        checks.check(page.locator('.mobile-nav button[data-mobile-view="upcoming"].active:visible').count() == 1 and page.locator('.mobile-nav .more-nav.active:visible').count() == 0, "Closing More restores the active state of the current primary view")
        page.evaluate("document.querySelector('.main').scrollTop=600")
        page.locator('.mobile-nav button[data-mobile-view="calendar"]:visible').click()
        page.wait_for_timeout(100)
        checks.check(page.evaluate("document.querySelector('.main').scrollTop") == 0, "Mobile tab switch returns content to top")
        tap_heights = page.locator(".mobile-nav button:visible").evaluate_all("els => els.map(el => el.getBoundingClientRect().height)")
        checks.check(all(height >= 44 for height in tap_heights), "Mobile navigation tap targets are at least 44px")
        page.locator("#mobileNewBooking:visible").click()
        page.wait_for_selector("#bookingForm")
        mobile_discount = page.locator('#bookingForm [data-discount-editor]')
        checks.check(mobile_discount.count() == 1, "Mobile booking includes the custom manual discount editor")
        page.locator('#bookingForm input[name="startDate"]').fill(iso(0))
        page.locator('#bookingForm input[name="returnDate"]').fill(iso(1))
        page.locator('#bookingForm .mobile-booking-next').click()
        page.locator('#bookingForm input[name="customerName"]').fill('Тестовий клієнт')
        page.locator('#bookingForm input[name="customerPhone"]').fill('+380951111111')
        page.locator('#bookingForm .mobile-booking-next').click()
        page.locator('#bookingForm .mobile-booking-next').click()
        checks.check(mobile_discount.is_visible(), "Mobile booking reaches the discount editor on the payment step")
        fixed_choice = mobile_discount.locator('[data-discount-choice="fixed"]')
        fixed_box = fixed_choice.bounding_box()
        checks.check(fixed_box is not None and fixed_box["height"] >= 44, "Mobile discount choices are proper tap targets")
        fixed_choice.click()
        fixed_input = mobile_discount.locator('[data-discount-fixed]')
        fixed_input.fill('250')
        mobile_discount.get_by_role("button", name="Домовленість", exact=True).click()
        checks.check(float(fixed_input.evaluate("el => parseFloat(getComputedStyle(el).fontSize)")) >= 16, "Mobile fixed discount input remains at least 16px")
        checks.check(page.locator('#bookingForm .booking-form-scroll').evaluate("el => ['auto','scroll'].includes(getComputedStyle(el).overflowY)"), "Mobile booking discount stays inside the modal scroll owner")
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
    with static_server(root) as base, sync_playwright() as playwright:
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
