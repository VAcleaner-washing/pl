#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def iso(offset: int = 0) -> str:
    return (date.today() + timedelta(days=offset)).isoformat()


def booking(idx: int, status: str, product: str = "puzzi", label: str = "Kärcher Puzzi 8/1") -> dict[str, Any]:
    start = iso(idx - 1)
    finish = iso(idx)
    return {
        "id": f"00000000-0000-4000-8000-{idx:012d}",
        "booking_code": f"VAC-PWA-{idx:03d}",
        "product_code": product,
        "product_label": label,
        "start_date": start,
        "return_date": finish,
        "start_at": f"{start}T07:00:00.000Z",
        "end_at": f"{finish}T09:30:00.000Z",
        "pickup_window": "morning",
        "return_window": "morning",
        "rental_days": 1,
        "fulfillment": "delivery" if idx % 2 == 0 else "pickup",
        "fulfillment_address": "Полтава, вул. Європейська, 146Е",
        "customer_name": "Анна Коваленко" if idx % 2 else "Олексій Петренко",
        "customer_phone": f"+3809511111{idx:02d}",
        "customer_telegram": "@vacleaner_test",
        "customer_comment": "Потрібно почистити диван, матрац і килим у вітальні.",
        "extras": {
            "selected_items": [{"code": "carp_deta", "label": "Плямовивідник Carp-Deta 30 мл", "price": 100}],
            "chemistry": {"used_packets": 1, "story_mention": True},
            "discount": {"percent": 0},
        },
        "base_amount": 700,
        "extras_amount": 100,
        "delivery_amount": 250 if idx % 2 == 0 else 0,
        "total_amount": 1050 if idx % 2 == 0 else 800,
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
        "source": "instagram",
        "admin_note": "Перевірити комплект перед видачею.",
        "created_at": f"{iso(-3)}T10:00:00.000Z",
        "updated_at": f"{iso(-1)}T12:00:00.000Z",
    }


BOOKINGS = [
    booking(1, "pending"),
    booking(2, "waiting_payment", "puzzi_jimmy", "Puzzi + Jimmy"),
    booking(3, "confirmed", "sc2", "Kärcher SC 2 Deluxe"),
    booking(4, "issued"),
    booking(5, "completed"),
]


def init_script(authenticated: bool = True) -> str:
    session = {
        "access_token": "pwa-access",
        "refresh_token": "pwa-refresh",
        "expires_at": int(time.time()) + 3600,
        "user": {"id": "00000000-0000-4000-8000-999999999999"},
    }
    config = json.loads((ROOT / "config/vacleaner.json").read_text(encoding="utf-8"))
    return f"""
    (()=>{{
      const store=new Map();
      const sessionStore=new Map();
      const makeStorage=map=>({{getItem:key=>map.has(String(key))?map.get(String(key)):null,setItem:(key,value)=>map.set(String(key),String(value)),removeItem:key=>map.delete(String(key)),clear:()=>map.clear()}});
      Object.defineProperty(window,'localStorage',{{value:makeStorage(store),configurable:true}});
      Object.defineProperty(window,'sessionStorage',{{value:makeStorage(sessionStore),configurable:true}});
      {f'''localStorage.setItem('vacleaner_session',{json.dumps(json.dumps(session))});
      localStorage.setItem('vacleaner_session_persistent','1');
      localStorage.setItem('vacleaner_session_seen',String(Date.now()));''' if authenticated else ''}
      window.__swMessages=[];window.__swListeners={{}};
      const waiting={{state:'installed',postMessage:data=>window.__swMessages.push(data),addEventListener:()=>{{}}}};
      const registration={{waiting,installing:null,update:async()=>{{}},addEventListener:()=>{{}},pushManager:{{getSubscription:async()=>null}}}};
      const sw={{controller:{{}},ready:Promise.resolve(registration),getRegistrations:async()=>[],register:async()=>registration,addEventListener:(type,cb)=>window.__swListeners[type]=cb}};
      Object.defineProperty(navigator,'serviceWorker',{{value:sw,configurable:true}});
      window.__emitSwMessage=data=>window.__swListeners.message?.({{data}});
      Object.defineProperty(navigator,'onLine',{{value:true,writable:true,configurable:true}});
      window.Notification={{permission:'default',requestPermission:async()=>'default'}};
      window.__bookings={json.dumps(BOOKINGS, ensure_ascii=False)};
      window.__config={json.dumps(config, ensure_ascii=False)};
      window.fetch=async(url,options={{}})=>{{
        let payload={{}};try{{payload=options.body?JSON.parse(options.body):{{}}}}catch{{}}
        let body={{}};
        const text=String(url);
        if(text.includes('vacleaner-settings'))body={{slots:window.__config.slots,depositRules:window.__config.depositRules,catalog:window.__config.catalog}};
        else if(text.includes('vacleaner-admin-bookings-v3')){{
          if(payload.action==='list')body={{bookings:window.__bookings}};
          else if(payload.action==='calendar')body={{days:Array.from({{length:14}},(_,i)=>({{date:new Date(Date.now()+i*86400000).toISOString().slice(0,10),resources:{{puzzi:{{label:'Puzzi',capacity:2,morning:2,evening:1}},sc2:{{label:'SC 2',capacity:2,morning:2,evening:2}},jimmy:{{label:'Jimmy',capacity:2,morning:1,evening:2}},abir:{{label:'ABIR',capacity:2,morning:2,evening:2}}}}}}))}};
          else if(payload.action==='lookup_customer')body={{customer:{{phone:'+380951111111',name:'Анна Коваленко',address:'Полтава, вул. Соборності, 10',documentType:'ID-картка',documentNumber:'000123456',documentVerifiedAt:new Date().toISOString(),hasDocument:true,isRepeatCustomer:true,completedOrders:4,totalOrders:5,totalSpent:4200,lastDate:'{iso(-20)}',lastProduct:'Kärcher Puzzi 8/1',loyalty:{{level:'Regular',percent:5}}}}}};
          else if(payload.action==='audit_log')body={{entries:[{{id:1,booking_id:window.__bookings[0].id,booking_code:window.__bookings[0].booking_code,event_type:'updated',changed_fields:['status'],old_values:{{status:'pending'}},new_values:{{status:'confirmed'}},actor_id:'a',source:'edge:update',created_at:new Date().toISOString()}}]}};
          else body={{booking:window.__bookings.find(x=>x.id===payload.bookingId)||window.__bookings[0],finance:{{refundAmount:350,dueAmount:0,totalAmount:850,receivedAmount:1200}}}};
        }} else if(text.includes('/auth/v1/token'))body={json.dumps(session)};
        else if(text.includes('vacleaner-push'))body={{publicKey:'B'.repeat(88),subscribedDevices:1,delivered:true}};
        return {{ok:true,status:200,json:async()=>body}};
      }};
      navigator.clipboard={{writeText:async()=>{{}}}};
    }})()
    """


class QA:
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

    def shot(self, page: Page, name: str) -> None:
        self.artifacts.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(self.artifacts / name), full_page=True)


def render_page(browser: Browser, width: int, height: int, authenticated: bool = True) -> Page:
    page = browser.new_page(viewport={"width": width, "height": height}, is_mobile=width <= 900)
    page.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
    page.evaluate(init_script(authenticated))
    page.add_style_tag(content=(ROOT / "assets/admin-v250.css").read_text(encoding="utf-8"))
    page.add_script_tag(content=(ROOT / "assets/vacleaner-core.js").read_text(encoding="utf-8"))
    page.add_script_tag(content=(ROOT / "assets/admin-v250.js").read_text(encoding="utf-8"))
    page.wait_for_selector(".app" if authenticated else ".auth-card")
    if authenticated: page.wait_for_selector(".booking-list")
    page.wait_for_timeout(150)
    return page


def no_overflow(page: Page) -> bool:
    return bool(page.evaluate("""
      (()=>{
        const doc=document.documentElement,body=document.body,main=document.querySelector('.main');
        return doc.scrollWidth<=doc.clientWidth+1&&body.scrollWidth<=innerWidth+1&&(!main||main.scrollWidth<=main.clientWidth+1);
      })()
    """))


def rect_inside(page: Page, selector: str, top: float = 0, bottom: float | None = None) -> bool:
    box = page.locator(selector).bounding_box()
    if not box:
        return False
    limit = page.viewport_size["height"] if bottom is None else bottom
    return box["x"] >= -1 and box["y"] >= top - 1 and box["x"] + box["width"] <= page.viewport_size["width"] + 1 and box["y"] + box["height"] <= limit + 1


def dismiss_update(page: Page, qa: QA, shot_name: str | None = None) -> None:
    page.wait_for_selector(".pwa-update-prompt")
    qa.check(page.locator(".pwa-update-prompt").count() == 1, "Controlled PWA update prompt is rendered")
    qa.check(page.locator(".pwa-update-now").bounding_box()["height"] >= 42, "Update action has a usable tap target")
    if shot_name: qa.shot(page, shot_name)
    page.locator(".pwa-update-later").click()
    qa.check(page.locator(".pwa-update-prompt").count() == 0, "Update prompt can be postponed without reload")


def mobile_suite(browser: Browser, qa: QA, width: int, label: str) -> None:
    page = render_page(browser, width, 844)
    try:
        page.evaluate("document.documentElement.style.setProperty('--pwa-safe-top','47px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')")
        page.wait_for_timeout(80)
        dismiss_update(page, qa, f"{label}-update-prompt.png" if label=='mobile-390' else None)
        qa.check(no_overflow(page), f"{label}: shell has no horizontal overflow")
        topbar = page.locator(".topbar").bounding_box()
        main_head = page.locator(".page-head").bounding_box()
        sidebar = page.locator(".sidebar").bounding_box()
        qa.check(topbar is not None and topbar["height"] >= 108, f"{label}: topbar includes simulated iPhone safe area")
        qa.check(main_head is not None and topbar is not None and main_head["y"] >= topbar["y"] + topbar["height"] + 8, f"{label}: content starts below the status bar and topbar")
        qa.check(sidebar is not None and abs(sidebar["y"] + sidebar["height"] - 844) <= 1 and sidebar["height"] >= 106, f"{label}: bottom navigation includes home-indicator safe area")
        heights = page.locator(".nav button:visible").evaluate_all("els=>els.map(el=>el.getBoundingClientRect().height)")
        qa.check(all(value >= 44 for value in heights), f"{label}: bottom navigation tap targets are at least 44px")
        qa.check(page.locator(".operations-bar").evaluate("el=>el.scrollWidth>=el.clientWidth"), f"{label}: attention cards use intentional horizontal scrolling")

        for view in ["calendar", "upcoming", "equipment"]:
            page.locator(f'.nav button[data-view="{view}"]:visible').click()
            page.wait_for_timeout(60)
            qa.check(no_overflow(page), f"{label}: {view} view stays inside viewport")
            qa.check(page.evaluate("document.querySelector('.main').scrollTop") == 0, f"{label}: {view} opens at top")
        page.evaluate("navigator.onLine=false;dispatchEvent(new Event('offline'))")
        page.wait_for_timeout(40)
        qa.check(page.locator('.app').count()==1 and page.locator('.auth').count()==0, f"{label}: offline transition keeps the authenticated shell")
        toast_box=page.locator('.toast').bounding_box()
        qa.check(toast_box is not None and toast_box['y']+toast_box['height']<=810.5, f"{label}: offline message clears bottom navigation")
        page.evaluate("navigator.onLine=true;dispatchEvent(new Event('online'))")
        page.wait_for_timeout(100)
        page.locator('.toast').evaluate_all("els=>els.forEach(el=>el.remove())")
        page.locator(".more-nav:visible").click()
        qa.check(rect_inside(page, ".mobile-more-card", top=47, bottom=810), f"{label}: More sheet stays between status bar and home indicator")
        page.keyboard.press("Escape")

        page.locator('.nav button[data-view="bookings"]:visible').click()
        page.locator("#newBooking").click()
        page.wait_for_selector("#bookingForm")
        qa.check(no_overflow(page), f"{label}: new booking modal has no horizontal overflow")
        header_title=page.locator('#bookingForm>header h2').bounding_box();qa.check(header_title is not None and header_title['y']>=58, f"{label}: modal header clears Dynamic Island safe area")
        footer = page.locator("#bookingForm>footer").bounding_box()
        footer_button=page.locator('#bookingForm>footer .btn').last.bounding_box()
        qa.check(footer is not None and footer_button is not None and footer_button['y']+footer_button['height']<=811, f"{label}: modal footer clears home indicator")
        qa.check(page.locator("#bookingForm .booking-form-scroll").evaluate("el=>el.scrollHeight>el.clientHeight"), f"{label}: long booking form has one dedicated scroll region")
        page.locator('#bookingForm input[name="customerName"]').focus()
        page.set_viewport_size({"width": width, "height": 560})
        page.wait_for_timeout(320)
        css_height = page.evaluate("parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pwa-viewport-height'))")
        qa.check(abs(css_height - 560) <= 2, f"{label}: visual viewport height follows simulated keyboard")
        compact_footer = page.locator("#bookingForm>footer").bounding_box()
        qa.check(compact_footer is not None and compact_footer["y"] + compact_footer["height"] <= 560.5, f"{label}: modal actions remain visible above keyboard")
        page.set_viewport_size({"width": width, "height": 844})
        page.wait_for_timeout(180)
        page.locator("#bookingForm .close").click()

        # Deep-link from a push while PWA is already open.
        target = BOOKINGS[2]
        page.evaluate("data=>window.__emitSwMessage(data)", {"type": "VACLEANER_OPEN_BOOKING", "bookingId": target["id"], "url": f"https://vacleaner.test/admin/bronuvannia/?booking={target['id']}"})
        page.wait_for_selector(".detail")
        detail_text=page.locator('.detail').inner_text();qa.check(target["booking_code"] in detail_text, f"{label}: push deep-link opens the exact booking")
        qa.check(no_overflow(page), f"{label}: booking detail has no horizontal overflow")
        qa.check(page.locator(".detail-actions").evaluate("el=>getComputedStyle(el).position") != "sticky", f"{label}: detail actions do not cover client content")
        qa.shot(page, f"{label}-detail-top.png")
        page.locator(".detail").evaluate("el=>el.scrollTop=el.scrollHeight")
        page.wait_for_timeout(80)
        actions = page.locator(".detail-actions").bounding_box()
        qa.check(actions is not None and actions["y"] + actions["height"] <= 810.5, f"{label}: detail actions clear bottom navigation after scroll")
        qa.shot(page, f"{label}-detail-bottom.png")
        page.locator(".back").click()
        expected_scroll = page.locator('.main').evaluate("el=>{el.scrollTop=420;return el.scrollTop}")
        page.evaluate("bookingId=>document.querySelector(`.booking-card[data-id=\"${bookingId}\"]`)?.click()", BOOKINGS[0]["id"])
        page.wait_for_selector('.detail')
        page.locator('.back').click()
        page.wait_for_timeout(80)
        restored_scroll = page.locator('.main').evaluate("el=>el.scrollTop")
        qa.check(abs(restored_scroll-expected_scroll)<=2, f"{label}: returning from details restores list position")

        # Walk all operational modal types.
        scenarios = [
            (BOOKINGS[0]['id'], "process", "#processForm"),
            (BOOKINGS[2]['id'], "issue", "#issueForm"),
            (BOOKINGS[3]['id'], "complete", "#financeForm"),
            (BOOKINGS[3]['id'], "finance", "#financeForm"),
        ]
        for booking_id, action, selector in scenarios:
            page.locator(f'.booking-card[data-id="{booking_id}"]').locator(f'[data-action="{action}"]').click()
            page.wait_for_selector(selector)
            qa.check(no_overflow(page), f"{label}: {action} modal has no horizontal overflow")
            header_box = page.locator(f"{selector}>header h2").bounding_box()
            footer_box = page.locator(f"{selector}>footer .btn").last.bounding_box()
            qa.check(header_box is not None and header_box["y"] >= 58, f"{label}: {action} header respects top safe area")
            qa.check(footer_box is not None and footer_box["y"] + footer_box["height"] <= 811, f"{label}: {action} footer respects bottom safe area")
            if label=='mobile-390': qa.shot(page, f"mobile-390-{action}-modal.png")
            page.locator(f"{selector} .close").click()
        qa.shot(page, f"{label}-bookings.png")
    finally:
        page.close()


def tablet_suite(browser: Browser, qa: QA) -> None:
    page = render_page(browser, 768, 1024)
    try:
        dismiss_update(page, qa)
        qa.check(no_overflow(page), "Tablet: shell has no horizontal overflow")
        qa.check(page.locator(".sidebar").bounding_box()["y"] > 900, "Tablet: navigation is docked to the bottom")
        page.locator("#newBooking").click()
        page.wait_for_selector("#bookingForm")
        qa.check(no_overflow(page), "Tablet: booking modal has no horizontal overflow")
        qa.check(page.locator("#bookingForm>footer").bounding_box()["height"] >= 44, "Tablet: modal footer actions remain usable")
        qa.shot(page, "tablet-booking-modal.png")
    finally:
        page.close()


def desktop_suite(browser: Browser, qa: QA) -> None:
    page = render_page(browser, 1440, 1000)
    try:
        page.wait_for_selector('.pwa-update-prompt')
        page.locator('.pwa-update-now').click()
        qa.check(page.evaluate("window.__swMessages.some(x=>x.type==='SKIP_WAITING')"), "Desktop: Update now asks the waiting worker to activate")
        page.evaluate("document.querySelector('.pwa-update-prompt')?.remove()")
        qa.check(no_overflow(page), "Desktop: shell has no horizontal overflow")
        qa.check(page.locator(".top-profile:visible").count() == 1, "Desktop: administrator profile is visible")
        for view in ["bookings", "calendar", "upcoming", "equipment", "clients", "analytics", "chemistry", "settings"]:
            page.locator(f'.nav button[data-view="{view}"]').click()
            page.wait_for_timeout(50)
            qa.check(no_overflow(page), f"Desktop: {view} view has no horizontal overflow")
        page.locator('.nav button[data-view="bookings"]').click()
        page.locator("#newBooking").click()
        page.wait_for_selector("#bookingForm")
        card = page.locator(".modal-card").bounding_box()
        qa.check(card is not None and card["x"] >= 16 and card["x"] + card["width"] <= 1424, "Desktop: modal keeps balanced outer margins")
        qa.check(page.locator("#bookingForm>footer").bounding_box()["y"] + page.locator("#bookingForm>footer").bounding_box()["height"] <= 984, "Desktop: modal footer is never clipped")
        qa.shot(page, "desktop-booking-modal.png")
    finally:
        page.close()


def auth_suite(browser: Browser, qa: QA) -> None:
    page = render_page(browser, 390, 844, authenticated=False)
    try:
        page.evaluate("document.documentElement.style.setProperty('--pwa-safe-top','47px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')")
        page.wait_for_timeout(60)
        dismiss_update(page, qa)
        qa.check(no_overflow(page), "Auth: login screen has no horizontal overflow")
        font_size=float(page.locator('#authForm input[name="password"]').evaluate("el=>parseFloat(getComputedStyle(el).fontSize)"))
        qa.check(font_size >= 16, "Auth: iPhone inputs are at least 16px and cannot trigger Safari auto-zoom")
        auth_overflow=page.locator('.auth').evaluate("el=>getComputedStyle(el).overflowY")
        qa.check(auth_overflow == 'hidden', "Auth: outer viewport is locked instead of rubber-band scrolling")
        card=page.locator('.auth-card').bounding_box()
        qa.check(card is not None and card['y']>=47 and card['y']+card['height']<=810.5, "Auth: login card clears both iPhone safe areas")
        page.locator('#authForm input[name="password"]').focus()
        page.set_viewport_size({"width":390,"height":520})
        page.wait_for_timeout(300)
        card=page.locator('.auth-card').bounding_box()
        qa.check(card is not None and card['y'] >= -0.5 and card['y'] + card['height'] <= 520.5, "Auth: keyboard keeps the card inside the visual viewport")
        outer_scroll=page.evaluate("()=>({body:document.body.scrollTop||0,html:document.documentElement.scrollTop||0,auth:document.querySelector('.auth')?.scrollTop||0})")
        qa.check(outer_scroll['body']==0 and outer_scroll['html']==0 and outer_scroll['auth']==0, "Auth: keyboard focus does not pan the page shell")
        button=page.locator('#authForm .primary').bounding_box()
        if button is not None and button['y']+button['height']>520.5:
            page.locator('.auth-card').evaluate("el=>el.scrollTop=el.scrollHeight")
            page.wait_for_timeout(40)
            button=page.locator('#authForm .primary').bounding_box()
        qa.check(button is not None and button['y']+button['height']<=520.5, "Auth: login action remains reachable above keyboard")
        qa.shot(page,'auth-mobile-keyboard.png')
    finally:
        page.close()


def landscape_suite(browser: Browser, qa: QA) -> None:
    page = render_page(browser, 844, 390)
    try:
        page.evaluate("document.documentElement.style.setProperty('--pwa-safe-bottom','21px')")
        page.wait_for_timeout(50)
        dismiss_update(page, qa)
        qa.check(no_overflow(page), "Landscape: shell has no horizontal overflow")
        top=page.locator('.topbar').bounding_box();bottom=page.locator('.sidebar').bounding_box()
        qa.check(top is not None and bottom is not None and top['y']+top['height']<bottom['y'], "Landscape: header and navigation leave a usable content viewport")
        page.locator('#newBooking').click();page.wait_for_selector('#bookingForm')
        qa.check(no_overflow(page), "Landscape: booking modal has no horizontal overflow")
        footer=page.locator('#bookingForm>footer .btn').last.bounding_box()
        qa.check(footer is not None and footer['y']+footer['height']<=369.5, "Landscape: modal actions clear the home indicator")
        qa.shot(page,'landscape-booking-modal.png')
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts", default="pwa-test-results")
    args = parser.parse_args()
    artifacts = Path(args.artifacts).resolve()
    qa = QA(artifacts)
    with sync_playwright() as p:
        executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
        options: dict[str, Any] = {"headless": True, "args": ["--no-sandbox"]}
        if executable:
            options["executable_path"] = executable
        elif Path("/usr/bin/chromium").exists():
            options["executable_path"] = "/usr/bin/chromium"
        browser = p.chromium.launch(**options)
        try:
            mobile_suite(browser, qa, 320, "mobile-320")
            mobile_suite(browser, qa, 390, "mobile-390")
            mobile_suite(browser, qa, 430, "mobile-430")
            tablet_suite(browser, qa)
            landscape_suite(browser, qa)
            auth_suite(browser, qa)
            desktop_suite(browser, qa)
        except Exception as exc:
            qa.failed.append(f"Unhandled PWA visual error: {exc}")
            print(f"FAIL: Unhandled PWA visual error: {exc}")
        finally:
            browser.close()
    result = {"passed": qa.passed, "failed": qa.failed, "status": "passed" if not qa.failed else "failed"}
    artifacts.mkdir(parents=True, exist_ok=True)
    (artifacts / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    return 0 if not qa.failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
