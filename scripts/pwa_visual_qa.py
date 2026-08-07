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


HISTORICAL_COMPLETED = booking(6, "completed", "sc2", "Kärcher SC 2 Deluxe")
HISTORICAL_COMPLETED.update({
    "booking_code": "HIST-PWA-001",
    "source": "historical_import",
    "extras": {
        "selected_items": [{
            "code": "premium_nozzles",
            "label": "Насадки «Преміум» до SC 2",
            "price": 0,
            "historical": True,
            "included_in_total": True,
        }],
        "selected_items_amount": 0,
        "chemistry": {"used_packets": 0, "story_mention": False},
        "historical_import": {"source": "Бронювання.txt", "raw_rental": "пароочисник преміум"},
    },
})

BOOKINGS = [
    booking(1, "pending"),
    booking(2, "waiting_payment", "puzzi_jimmy", "Puzzi + Jimmy"),
    booking(3, "confirmed", "sc2", "Kärcher SC 2 Deluxe"),
    booking(4, "issued"),
    booking(5, "completed"),
    HISTORICAL_COMPLETED,
]
# The process-flow regression must exercise Telegram's phone deep-link fallback.
BOOKINGS[0]["customer_telegram"] = ""


def init_script(authenticated: bool = True, standalone: bool = False) -> str:
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
      Object.defineProperty(navigator,'standalone',{{value:{str(standalone).lower()},configurable:true}});
      window.Notification={{permission:'default',requestPermission:async()=>'default'}};
      window.__bookings={json.dumps(BOOKINGS, ensure_ascii=False)};
      window.__config={json.dumps(config, ensure_ascii=False)};
      window.fetch=async(url,options={{}})=>{{
        let payload={{}};try{{payload=options.body?JSON.parse(options.body):{{}}}}catch{{}}
        let body={{}};
        const text=String(url);
        if(text.includes('vacleaner-settings'))body={{slots:window.__config.slots,depositRules:window.__config.depositRules,catalog:window.__config.catalog}};
        else if(text.includes('vacleaner-admin-bookings-v3')||text.includes('vacleaner-admin-data-v1')){{
          if(payload.action==='list')body={{bookings:window.__bookings}};
          else if(payload.action==='calendar')body={{days:Array.from({{length:14}},(_,i)=>({{date:new Date(Date.now()+i*86400000).toISOString().slice(0,10),resources:{{puzzi:{{label:'Puzzi',capacity:2,morning:2,evening:1}},sc2:{{label:'SC 2',capacity:2,morning:2,evening:2}},jimmy:{{label:'Jimmy',capacity:2,morning:1,evening:2}},abir:{{label:'ABIR',capacity:2,morning:2,evening:2}}}}}}))}};
          else if(payload.action==='clients')body={{customers:[{{phone:'+380951111111',name:'Анна Коваленко',telegram:'@anna',address:'Полтава, вул. Соборності, 10',document_type:'ID-картка',document_number:'000123456',document_verified_at:new Date().toISOString()}}]}};
          else if(payload.action==='health')body={{checkedAt:new Date().toISOString(),reservation:{{healthy:true,transactionLock:true,halfOpenSlots:true,capacityHardBlock:true,pendingDoesNotReserve:true}},push:{{healthy:true,configReady:true,activeSubscriptions:3,lastSuccessAt:new Date().toISOString(),lastFailureAt:null}}}};
          else if(payload.action==='campaigns')body={{campaigns:[{{id:'10000000-0000-4000-8000-000000000001',name:'RETURN · 180+ днів',campaign_type:'return',status:'active',discount_type:'percent',discount_value:10,dormant_days:180,assignedCodes:12,audienceSize:12,usedCount:3,completedUses:2,conversion:25,revenue:1600,discountGiven:240,codes:[{{code:'VA-ABC1234',customer_phone:'+380951111111'}}]}}]}};
          else if(payload.action==='save_customer')body={{customer:{{phone:payload.customerPhone,name:payload.customerName,telegram:payload.customerTelegram,address:payload.customerAddress}}}};
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


def render_page(browser: Browser, width: int, height: int, authenticated: bool = True, standalone: bool = False) -> Page:
    page = browser.new_page(viewport={"width": width, "height": height}, is_mobile=width <= 900)
    page.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
    page.evaluate(init_script(authenticated, standalone))
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


def open_mobile_view(page: Page, view: str) -> None:
    direct = page.locator(f'.nav button[data-view="{view}"]:visible')
    if direct.count():
        direct.click()
    else:
        page.locator('.more-nav:visible').click()
        page.locator(f'[data-more-view="{view}"]').click()
    page.wait_for_timeout(70)


def mobile_suite(browser: Browser, qa: QA, width: int, label: str) -> None:
    height=844
    safe_top=47
    safe_bottom=34
    page = render_page(browser, width, height, standalone=True)
    try:
        page.evaluate(f"document.documentElement.style.setProperty('--pwa-safe-top','{safe_top}px');document.documentElement.style.setProperty('--pwa-safe-bottom','{safe_bottom}px')")
        page.wait_for_timeout(80)
        dismiss_update(page, qa, f"{label}-update-prompt.png" if label=='mobile-390' else None)
        qa.check(no_overflow(page), f"{label}: shell has no horizontal overflow")
        app_box = page.locator('.app').bounding_box()
        qa.check(app_box is not None and abs(app_box['y'])<=0.5 and abs(app_box['y']+app_box['height']-height)<=1, f"{label}: app shell fills the physical viewport to the bottom")
        shell_position = page.locator('.app').evaluate("el=>getComputedStyle(el).position")
        nav_position = page.locator('.sidebar').evaluate("el=>getComputedStyle(el).position")
        qa.check(shell_position=='fixed' and nav_position=='relative', f"{label}: installed PWA uses intrinsic grid bottom navigation instead of a bottom-positioned overlay")
        grid_contract = page.locator('.app').evaluate("el=>({display:getComputedStyle(el).display,rows:getComputedStyle(el).gridTemplateRows,height:getComputedStyle(el).height})")
        qa.check(grid_contract['display']=='grid' and len(grid_contract['rows'].split())>=3, f"{label}: standalone shell is a three-row topbar/main/navigation grid")
        topbar = page.locator(".topbar").bounding_box()
        main_head = page.locator(".page-head").bounding_box()
        sidebar = page.locator(".sidebar").bounding_box()
        qa.check(topbar is not None and abs(topbar["height"]-(64+safe_top))<=1.5, f"{label}: topbar has one stable safe-area height")
        qa.check(main_head is not None and topbar is not None and main_head["y"] >= topbar["y"] + topbar["height"] + 8, f"{label}: content starts below status bar and topbar")
        expected_pwa_pad=max(8,min(12,safe_bottom-22))
        qa.check(page.locator('html').evaluate("el=>el.classList.contains('pwa-standalone')"), f"{label}: installed mode is detected independently from Safari")
        qa.check(sidebar is not None and abs(sidebar["y"] + sidebar["height"] - height) <= 1 and abs(sidebar["height"]-(62+expected_pwa_pad))<=1.5, f"{label}: standalone bottom navigation sits lower than the Safari mobile contract")
        heights = page.locator(".nav button:visible").evaluate_all("els=>els.map(el=>el.getBoundingClientRect().height)")
        qa.check(all(value >= 44 for value in heights), f"{label}: bottom navigation tap targets are at least 44px")
        qa.check(page.locator('.nav button[data-view="analytics"]:visible').count()==1 and page.locator('.nav button[data-view="equipment"]:visible').count()==0, f"{label}: analytics replaces equipment in the five primary bottom-nav actions")
        page.locator('.nav button[data-view="analytics"]:visible').click();page.wait_for_timeout(30)
        qa.check(page.locator('.nav button[data-view="analytics"].active:visible').count()==1 and page.locator('.more-nav.active:visible').count()==0, f"{label}: analytics is the only active bottom-nav item on analytics view")
        page.locator('.nav button[data-view="bookings"]:visible').click();page.wait_for_timeout(30)
        page.locator('.more-nav:visible').click();page.wait_for_timeout(20)
        qa.check(page.locator('.mobile-more-card [data-more-view="equipment"]:visible').count()==1 and page.locator('.mobile-more-card [data-more-view="analytics"]:visible').count()==0, f"{label}: equipment lives in More while analytics stays primary")
        page.locator('.mobile-more-close:visible').click();page.wait_for_timeout(20)
        qa.check(page.locator('.connection-state:visible').count()==0, f"{label}: mobile topbar keeps only search and primary action")
        qa.check(page.locator('.operations-bar').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), f"{label}: attention cards never hide in a horizontal carousel")
        toolbar_contract=page.locator('.booking-toolbar').evaluate("el=>({position:getComputedStyle(el).position,overflowX:getComputedStyle(el).overflowX,wrap:getComputedStyle(el).flexWrap})")
        qa.check(toolbar_contract['position']=='sticky' and toolbar_contract['overflowX'] in ('auto','scroll') and toolbar_contract['wrap']=='nowrap', f"{label}: booking filters stay in one compact sticky row")

        # Bottom nav must not move when only the app content scrolls.
        nav_before=page.locator('.sidebar').bounding_box()
        page.locator('.main').evaluate("el=>el.scrollTop=Math.min(420,el.scrollHeight-el.clientHeight)")
        page.wait_for_timeout(50)
        nav_after=page.locator('.sidebar').bounding_box()
        qa.check(nav_before is not None and nav_after is not None and abs(nav_before['y']-nav_after['y'])<=0.5 and abs(nav_after['y']+nav_after['height']-height)<=1, f"{label}: bottom navigation does not walk during content scroll")
        page.locator('#globalSearch').evaluate('el=>el.blur()')
        page.evaluate("()=>window.dispatchEvent(new Event('resize'))");page.wait_for_timeout(50)
        nav_refresh=page.locator('.sidebar').bounding_box()
        qa.check(nav_refresh is not None and abs(nav_refresh['y']+nav_refresh['height']-height)<=1 and not page.locator('html').evaluate("el=>el.classList.contains('keyboard-open')"), f"{label}: data/viewport refresh cannot lift bottom navigation without a keyboard")
        page.locator('.main').evaluate('el=>el.scrollTop=0')

        # Status filters become the sticky control row after the KPI/hero block scrolls away.
        toolbar_before=page.locator('.booking-toolbar').bounding_box()
        main_box=page.locator('.main').bounding_box()
        page.locator('.main').evaluate("el=>el.scrollTop=Math.min(520,Math.max(0,el.scrollHeight-el.clientHeight))")
        page.wait_for_timeout(60)
        toolbar_after=page.locator('.booking-toolbar').bounding_box()
        qa.check(toolbar_before is not None and toolbar_after is not None and main_box is not None and toolbar_after['y']<=main_box['y']+1.5, f"{label}: status filters pin directly below the hero/topbar after scroll")
        page.locator('.main').evaluate('el=>el.scrollTop=0')

        # Explicit tab navigation clears the global search instead of leaking it into the next view.
        page.locator('#globalSearch').fill('Белих Елеонора')
        page.locator('.nav button[data-view="calendar"]').click();page.wait_for_timeout(50)
        qa.check(page.locator('#globalSearch').input_value()=='' and page.locator('#clearSearch').evaluate('el=>el.classList.contains("hidden")'), f"{label}: search clears when manager changes tabs")
        open_mobile_view(page,'bookings')

        # Walk every admin view, not only the primary four.
        for view in ["bookings","calendar", "upcoming", "equipment", "clients", "campaigns", "analytics", "chemistry", "settings"]:
            open_mobile_view(page,view)
            qa.check(no_overflow(page), f"{label}: {view} view stays inside viewport")
            qa.check(page.locator('.main').evaluate('el=>el.scrollLeft')==0, f"{label}: {view} cannot drift horizontally")
            qa.check(page.locator('.main').evaluate('el=>el.scrollTop')==0, f"{label}: {view} opens at top")
            if view=='settings':
                cards=page.locator('.settings-grid>*:visible').evaluate_all('els=>els.map(el=>el.getBoundingClientRect())')
                qa.check(bool(cards) and all(r['left']>=11 and r['right']<=width-11 for r in cards), f"{label}: settings cards use full mobile width")
                slot_rows=page.locator('.slot-editor-row:visible').evaluate_all('els=>els.map(el=>({r:el.getBoundingClientRect(),children:[...el.querySelectorAll(".premium-control")].map(x=>x.getBoundingClientRect())}))')
                qa.check(all(all(c['left']>=row['r']['left']-1 and c['right']<=row['r']['right']+1 for c in row['children']) for row in slot_rows), f"{label}: time-slot controls stay inside settings cards")
                page.wait_for_timeout(30)
                qa.check(page.locator('.operational-health-card').count()==1, f"{label}: settings exposes production health")
                qa.check(page.locator('.health-state.ok').count()>=2, f"{label}: push and double-booking health are verified at runtime")
            if view=='equipment':
                qa.check(page.locator('.catalog-toolbar').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), f"{label}: equipment toolbar stays inside its own width")
                single=page.locator('.equipment-image-1 img').first
                qa.check(single.count()==1 and single.evaluate("el=>parseFloat(getComputedStyle(el).objectPosition.split(' ')[1])>=65"), f"{label}: single-equipment photography is vertically centered on the machine")
                image_box=page.locator('.equipment-image-1').first.bounding_box()
                qa.check(image_box is not None and image_box['height']>=205, f"{label}: single-equipment photography keeps a useful mobile viewport")
            if view=='analytics':
                qa.check(page.locator('.analytics-toolbar').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), f"{label}: analytics toolbar stays inside its own width")
                qa.check(page.locator('.analytics-periods').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), f"{label}: analytics period controls never widen 320px viewport")
                qa.check(page.locator('.status-dashboard').evaluate('el=>el.scrollWidth<=el.clientWidth+1'), f"{label}: analytics status dashboard contains its own content")
                status_geometry=page.locator('.status-dashboard').evaluate("""el=>{const d=el.getBoundingClientRect(),items=[...el.querySelectorAll('.analytics-status-item')].map(x=>x.getBoundingClientRect());return{dashboard:{left:d.left,right:d.right},items:items.map(r=>({left:r.left,right:r.right,width:r.width}))}}""")
                qa.check(bool(status_geometry['items']) and all(r['left']>=status_geometry['dashboard']['left']-1 and r['right']<=status_geometry['dashboard']['right']+1 for r in status_geometry['items']), f"{label}: analytics status cards stay inside dashboard")
                if width<=360:
                    lefts=[round(r['left'],1) for r in status_geometry['items']]
                    qa.check(len(set(lefts))==1, f"{label}: analytics statuses collapse to one stable column")
                qa.check(page.locator('.utilization-panel').count()==1 and page.locator('.utilization-row').count()>=4, f"{label}: analytics exposes utilization by physical equipment")
                qa.check(page.locator('.customer-health-panel').count()==1 and page.locator('.customer-health-panel').inner_text().find('Repeat-rate')==-1, f"{label}: repeat customer decision panel renders without duplicating KPI copy")
                qa.check(page.locator('#showSleepingClients').count()==1, f"{label}: sleeping-client segment has a direct action")
                qa.check('Сплячі 180+ днів' in page.locator('.customer-health-panel').inner_text(), f"{label}: analytics uses the six-month sleeping-customer threshold")
            if view=='chemistry':
                qa.check(page.locator('.chem-product-row').filter(has_text='Carp-Deta').count()==1, f"{label}: Carp-Deta is present in chemistry pricing")

        # Returned bookings always start at the top and are sorted by return/end date, newest first.
        open_mobile_view(page,'bookings')
        page.locator('.main').evaluate("el=>el.scrollTop=Math.min(360,el.scrollHeight-el.clientHeight)")
        page.locator('[data-filter="completed"]').click();page.wait_for_timeout(40)
        qa.check(page.locator('.main').evaluate('el=>el.scrollTop')==0, f"{label}: returned filter resets list scroll to top")
        first_returned=page.locator('.booking-card').first.get_attribute('data-id')
        qa.check(first_returned==HISTORICAL_COMPLETED['id'], f"{label}: returned bookings are sorted newest return date first")

        # Returned historical bookings keep mapped extras visible without inventing a current price.
        historical_card=page.locator('.booking-card', has_text='HIST-PWA-001')
        qa.check(historical_card.count()==1 and 'Насадки «Преміум» до SC 2' in historical_card.locator('.booking-extra').inner_text(), f"{label}: returned historical booking shows mapped premium nozzles")
        qa.check('0 грн' not in historical_card.locator('.booking-extra').inner_text(), f"{label}: historical extra never displays a fake zero price")
        historical_card.click();page.wait_for_selector('.detail')
        qa.check(page.locator('.extras-panel', has_text='Насадки «Преміум» до SC 2').count()==1, f"{label}: historical extra remains visible in booking detail")
        qa.check(page.locator('.historical-extra-note', has_text='у складі історичної суми').count()==1, f"{label}: historical detail explains extra is included in original total")
        page.locator('.detail .back').click();page.wait_for_timeout(40)
        if page.locator('[data-filter="all"]').count(): page.locator('[data-filter="all"]').click()

        # Finance badges must remain rectangular, aligned and contained on narrow cards.
        page.locator('[data-filter="confirmed"]').click();page.wait_for_timeout(30)
        finance_card=page.locator(f'.booking-card[data-id="{BOOKINGS[2]["id"]}"]')
        finance_geometry=finance_card.locator('.booking-finance').evaluate("""el=>{const p=el.getBoundingClientRect(),due=el.querySelector('em')?.getBoundingClientRect(),dep=el.querySelector('.booking-deposit-state')?.getBoundingClientRect();return{p:{l:p.left,r:p.right},due:due?{l:due.left,r:due.right,t:due.top,b:due.bottom,h:due.height}:null,dep:dep?{l:dep.left,r:dep.right,t:dep.top,b:dep.bottom,h:dep.height}:null}}""")
        fg=finance_geometry
        qa.check(fg['due'] is not None and fg['dep'] is not None and fg['due']['l']>=fg['p']['l']-1 and fg['dep']['r']<=fg['p']['r']+1, f"{label}: due and deposit controls stay inside finance card")
        qa.check(fg['due'] is not None and fg['dep'] is not None and fg['due']['h']>=48 and fg['dep']['h']>=48 and not (fg['due']['r']>fg['dep']['l'] and fg['dep']['r']>fg['due']['l'] and fg['due']['b']>fg['dep']['t'] and fg['dep']['b']>fg['due']['t']), f"{label}: due and deposit controls never overlap")
        page.locator('[data-filter="all"]').click();page.wait_for_timeout(30)

        # Client search is contextual and the card can be edited.
        open_mobile_view(page,'clients')
        page.locator('#globalSearch').fill('Анна')
        page.wait_for_timeout(40)
        qa.check(page.locator('#pageTitle').inner_text().strip()=='Клієнти', f"{label}: searching clients never jumps to bookings")
        qa.check(page.locator('.client-row').count()>=1, f"{label}: client search filters inside clients view")
        qa.check(page.locator('.campaign-panel').count()==0, f"{label}: clients view is free of campaign management")
        stats=page.locator('.client-mobile-stats:visible').first
        qa.check(stats.count()==1 and 'оренд' in stats.inner_text() and 'грн' in stats.inner_text(), f"{label}: client card shows rental count and total spend in PWA")
        page.evaluate("()=>document.querySelector('[data-view=campaigns]')?.click()");page.wait_for_timeout(60)
        qa.check(page.locator('.campaign-panel').count()==1, f"{label}: campaigns render in their dedicated view")
        qa.check('RETURN' in page.locator('.campaign-panel').inner_text(), f"{label}: RETURN campaign is visible in campaigns view")
        open_mobile_view(page,'clients')
        qa.check('Сплячі 180+ днів' in page.locator('#clientSegment').inner_text(), f"{label}: sleeping segment uses 180 days")
        last_text=page.locator('.client-last-date').first.inner_text().strip() if page.locator('.client-last-date').count() else ''
        qa.check(bool(__import__('re').fullmatch(r'\d{2}\.\d{2}\.\d{4}|—',last_text)), f"{label}: client last-rental date includes full year")
        if page.locator('.client-edit-btn').count():
            page.locator('.client-edit-btn').first.click();page.wait_for_selector('#clientEditor')
            qa.check(no_overflow(page), f"{label}: client editor has no horizontal overflow")
            client_title=page.locator('#clientEditor>header h2').bounding_box();client_footer=page.locator('#clientEditor>footer').bounding_box();client_save=page.locator('#clientEditor>footer .btn').last.bounding_box()
            qa.check(client_title is not None and client_title['y']>=safe_top+8, f"{label}: client editor header clears Dynamic Island safe area")
            qa.check(client_footer is not None and abs(client_footer['y']+client_footer['height']-height)<=1 and client_save is not None and client_save['y']+client_save['height']<=height-safe_bottom+1, f"{label}: client editor footer clears Home Indicator")
            qa.check(page.locator('#clientEditor input[name=customerName]').count()==1 and page.locator('#clientEditor input[name=customerPhone]').count()==1, f"{label}: client editor exposes core contact fields")
            page.locator('#clientEditor [data-close]').first.click()
        if page.locator('#clearSearch').is_visible(): page.locator('#clearSearch').click();page.wait_for_timeout(30)

        # More sheet remains usable and contained.
        page.locator(".more-nav:visible").click()
        qa.check(rect_inside(page, ".mobile-more-card", top=safe_top, bottom=height-safe_bottom), f"{label}: More sheet stays between status bar and home indicator")
        page.keyboard.press("Escape")

        # Booking form: true mobile stepper, one section only, stable custom dates.
        open_mobile_view(page,'bookings')
        page.locator("#newBooking").click()
        page.wait_for_selector("#bookingForm")
        qa.check(page.locator('#bookingForm .booking-form-scroll').evaluate('el=>el.scrollTop')==0, f"{label}: new booking modal always opens at its own top")
        qa.check(no_overflow(page), f"{label}: new booking modal has no horizontal overflow")
        header_title=page.locator('#bookingForm>header h2').bounding_box()
        progress=page.locator('#bookingForm .mobile-booking-progress').bounding_box()
        header_box=page.locator('#bookingForm>header').bounding_box()
        first_section=page.locator('#bookingForm [data-mobile-step="1"]:visible').bounding_box()
        qa.check(header_title is not None and header_title['y']>=safe_top+8, f"{label}: booking header clears Dynamic Island safe area")
        qa.check(progress is not None and header_box is not None and first_section is not None and progress['y']>=header_title['y'] and progress['y']+progress['height']<=header_box['y']+header_box['height']+1 and first_section['y']>=header_box['y']+header_box['height']-1, f"{label}: booking progress is integrated into the header instead of floating between blocks")
        qa.check(page.locator('#mobileBookingStepLabel').evaluate('el=>getComputedStyle(el).display')=='none', f"{label}: redundant 'Крок 1 з 4' strip is not rendered between blocks")
        qa.check(page.locator('#bookingForm [data-mobile-step]:visible').count()==1, f"{label}: booking form shows exactly one mobile step")
        qa.check(page.locator('#bookingForm input[name="startDate"]').input_value()=='' and page.locator('#bookingForm input[name="returnDate"]').input_value()=='', f"{label}: new booking never preselects hidden dates")
        footer=page.locator('#bookingForm>footer').bounding_box(); footer_button=page.locator('#bookingForm>footer .btn:visible').last.bounding_box()
        qa.check(footer is not None and abs(footer['y']+footer['height']-height)<=1 and footer_button is not None and footer_button['y']+footer_button['height']<=height-safe_bottom+1, f"{label}: booking footer is pinned and clears Home Indicator")
        date_tap=page.locator('#bookingForm .date-control').first.evaluate("el=>{const i=el.querySelector('input[type=date]'),r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{pointer:getComputedStyle(i).pointerEvents,hit:hit===i||i.contains(hit)}}")
        qa.check(date_tap['pointer']=='auto' and date_tap['hit'], f"{label}: tapping the date field reaches the native calendar input")
        date_before=page.locator('#bookingForm .date-control').first.bounding_box()
        page.locator('#bookingForm input[name="startDate"]').evaluate("el=>{el.value='2026-08-08';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}")
        page.wait_for_timeout(80)
        date_after=page.locator('#bookingForm .date-control').first.bounding_box()
        qa.check(date_before is not None and date_after is not None and abs(date_before['y']-date_after['y'])<=0.5 and abs(date_before['height']-date_after['height'])<=0.5, f"{label}: admin date control geometry is invariant after date selection")
        qa.check(page.locator('#bookingForm input[name="returnDate"]').input_value()=='2026-08-09', f"{label}: return date follows first date only until manager edits it")
        page.locator('.mobile-booking-next').click(); page.wait_for_timeout(60)
        qa.check(page.locator('#bookingForm').get_attribute('data-mobile-step')=='2' and page.locator('#bookingForm [data-mobile-step]:visible').count()==1, f"{label}: Next advances to one clean client step")
        page.locator('.mobile-booking-back').click(); page.wait_for_timeout(60)
        date_back=page.locator('#bookingForm .date-control').first.bounding_box()
        qa.check(date_after is not None and date_back is not None and abs(date_after['y']-date_back['y'])<=0.5 and abs(date_after['height']-date_back['height'])<=0.5, f"{label}: admin date returns to identical geometry after step navigation")

        # Keyboard mode is explicit and must hide bottom navigation instead of moving it.
        page.locator('.mobile-booking-next').click(); page.locator('#bookingForm input[name="customerPhone"]').focus()
        page.wait_for_timeout(160)
        page.evaluate("document.documentElement.classList.add('keyboard-open');document.documentElement.style.setProperty('--keyboard-viewport-height','560px');document.documentElement.style.setProperty('--keyboard-viewport-top','0px')")
        page.wait_for_timeout(40)
        qa.check(page.locator('.sidebar:visible').count()==0, f"{label}: keyboard hides bottom nav instead of pushing it upward")
        qa.check(page.locator('#bookingForm').bounding_box()['height']<=560.5, f"{label}: booking modal follows keyboard visual height only while keyboard is open")
        keyboard_footer=page.locator('#bookingForm>footer').bounding_box()
        qa.check(keyboard_footer is not None and keyboard_footer['y']+keyboard_footer['height']<=560.5, f"{label}: booking actions remain reachable above keyboard")
        page.evaluate("document.documentElement.classList.remove('keyboard-open');document.documentElement.style.removeProperty('--keyboard-viewport-height');document.documentElement.style.removeProperty('--keyboard-viewport-top')")
        page.wait_for_timeout(80)
        qa.check(page.locator('.sidebar:visible').count()==1 and abs(page.locator('.sidebar').bounding_box()['y']+page.locator('.sidebar').bounding_box()['height']-height)<=1, f"{label}: bottom nav returns to exact bottom after keyboard closes")
        if label=='mobile-390': qa.shot(page,'mobile-390-booking-step2.png')
        page.locator("#bookingForm .close").click()

        # Existing booking edit must have one real internal scroll owner; footer stays fixed.
        edit_target=BOOKINGS[2]
        page.locator(f'.booking-card[data-id="{edit_target["id"]}"] [data-action="edit"]').click()
        page.wait_for_selector('#bookingForm')
        qa.check(page.locator('#bookingForm h2').inner_text().strip()=='Редагувати бронювання', f"{label}: edit opens the booking editor, not a separate legacy form")
        metrics=page.locator('#bookingForm .booking-form-scroll').evaluate("el=>({sh:el.scrollHeight,ch:el.clientHeight,oy:getComputedStyle(el).overflowY})")
        qa.check(metrics['oy'] in ('auto','scroll') and metrics['sh']>metrics['ch']+20, f"{label}: edit booking has a real internal vertical scroll region")
        page.locator('#bookingForm .booking-form-scroll').evaluate("el=>el.scrollTop=Math.min(220,el.scrollHeight-el.clientHeight)")
        page.wait_for_timeout(40)
        qa.check(page.locator('#bookingForm .booking-form-scroll').evaluate('el=>el.scrollTop')>0, f"{label}: edit booking content actually scrolls")
        edit_footer=page.locator('#bookingForm>footer').bounding_box()
        qa.check(edit_footer is not None and abs(edit_footer['y']+edit_footer['height']-height)<=1, f"{label}: edit booking footer remains pinned while form scrolls")
        page.locator('#bookingForm .close').click()

        # Offline must not throw user out of the authenticated shell.
        page.evaluate("navigator.onLine=false;dispatchEvent(new Event('offline'))")
        page.wait_for_timeout(40)
        qa.check(page.locator('.app').count()==1 and page.locator('.auth').count()==0, f"{label}: offline transition keeps authenticated shell")
        page.evaluate("navigator.onLine=true;dispatchEvent(new Event('online'))")
        page.wait_for_timeout(100)
        page.locator('.toast').evaluate_all("els=>els.forEach(el=>el.remove())")

        # Deep-link from a push while PWA is already open.
        target = BOOKINGS[2]
        page.evaluate("data=>window.__emitSwMessage(data)", {"type": "VACLEANER_OPEN_BOOKING", "bookingId": target["id"], "url": f"https://vacleaner.test/admin/bronuvannia/?booking={target['id']}"})
        page.wait_for_selector(".detail")
        detail_text=page.locator('.detail').inner_text();qa.check(target["booking_code"] in detail_text, f"{label}: push deep-link opens exact booking")
        qa.check(no_overflow(page), f"{label}: booking detail has no horizontal overflow")
        qa.check(page.locator(".detail-actions").evaluate("el=>getComputedStyle(el).position") != "sticky", f"{label}: detail actions do not cover client content")
        qa.check(page.locator(".detail-top").evaluate("el=>getComputedStyle(el).position") == "sticky", f"{label}: detail back row stays sticky during long booking scroll")
        top_meta=page.locator('.detail-top').evaluate("el=>{const back=el.querySelector('.back')?.getBoundingClientRect(),code=el.querySelector('.detail-top-meta span')?.getBoundingClientRect();return{back:back?{h:back.height,w:back.width}:null,code:code?{h:code.height,w:code.width}:null}}")
        qa.check(top_meta['back'] is not None and top_meta['code'] is not None and top_meta['back']['h']<=46 and top_meta['code']['h']<=22, f"{label}: detail back control and booking code stay on one compact row")
        flow=page.locator('.flow-compact')
        qa.check(flow.evaluate("el=>el.scrollWidth<=el.clientWidth+1"), f"{label}: booking progress stays inside its card")
        step_geometry=flow.locator('.steps').evaluate("el=>{const p=el.getBoundingClientRect();return{p:{l:p.left,r:p.right},items:[...el.querySelectorAll('.step')].map(x=>{const r=x.getBoundingClientRect();return{l:r.left,r:r.right}})}}")
        qa.check(bool(step_geometry['items']) and all(x['l']>=step_geometry['p']['l']-1 and x['r']<=step_geometry['p']['r']+1 for x in step_geometry['items']), f"{label}: all booking-progress stages fit without smashed labels")
        period_box=page.locator('.detail-hero .period').bounding_box(); image_box=page.locator('.detail-hero .hero-images').bounding_box()
        qa.check(period_box is not None and image_box is not None and image_box['y']>=period_box['y']+period_box['height']+8, f"{label}: booking-detail photography never overlaps rental dates")
        if label=='mobile-390': qa.shot(page, f"{label}-detail-top.png")
        page.locator(".detail").evaluate("el=>el.scrollTop=el.scrollHeight")
        page.wait_for_timeout(80)
        actions = page.locator(".detail-actions").bounding_box()
        qa.check(actions is not None and actions["y"] + actions["height"] <= height-safe_bottom+1, f"{label}: detail actions clear Home Indicator after scroll")
        sticky_back=page.locator('.detail-top .back').bounding_box()
        qa.check(sticky_back is not None and sticky_back['y']>=safe_top and sticky_back['y']+sticky_back['height']<=height, f"{label}: back-to-bookings remains visible at the bottom of a long booking detail")
        page.locator(".back").click()
        expected_scroll = page.locator('.main').evaluate("el=>{el.scrollTop=Math.min(420,el.scrollHeight-el.clientHeight);return el.scrollTop}")
        page.evaluate("bookingId=>document.querySelector(`.booking-card[data-id=\"${bookingId}\"]`)?.click()", BOOKINGS[0]["id"])
        page.wait_for_selector('.detail');page.locator('.back').click();page.wait_for_timeout(80)
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
            footer_box = page.locator(f"{selector}>footer").bounding_box()
            footer_action=page.locator(f"{selector}>footer .btn:visible").last.bounding_box()
            qa.check(header_box is not None and header_box["y"] >= safe_top+8, f"{label}: {action} header respects top safe area")
            qa.check(footer_box is not None and abs(footer_box['y']+footer_box['height']-height)<=1 and footer_action is not None and footer_action['y']+footer_action['height']<=height-safe_bottom+1, f"{label}: {action} footer is pinned above Home Indicator")
            if action in ('issue','complete','finance'):
                layout_ok=page.locator(f"{selector} .modal-layout").evaluate("el=>{const section=el.querySelector('.modal-section')?.getBoundingClientRect(),summary=el.querySelector('.modal-summary')?.getBoundingClientRect();return !!section&&!!summary&&summary.top>=section.bottom+7}")
                qa.check(layout_ok, f"{label}: {action} summary starts after the data card and never overlaps it")
            if action=='process':
                qa.check(page.locator('#processForm .process-grid').evaluate('el=>el.scrollTop')==0, f"{label}: process modal opens at its own top")
                telegram_href=page.locator('#sendTelegram').get_attribute('href') or ''
                qa.check(telegram_href.startswith('https://t.me/+380') and '?text=' not in telegram_href, f"{label}: Telegram action opens the customer phone chat without a long draft")
                qa.check('share/url?url=&' not in telegram_href, f"{label}: Telegram action never generates the broken empty share URL")
                switch_gap=page.locator('#processForm').evaluate("""form=>{const a=form.elements.confirmationSent.closest('.switch').getBoundingClientRect(),b=form.elements.prepaymentPaid.closest('.switch').getBoundingClientRect();return b.top-a.bottom}""")
                qa.check(switch_gap>=8, f"{label}: conditions and prepayment blocks keep a visible gap")
                qa.check(page.locator('#saveProcess').count()==1 and page.locator('#confirmProcess').count()==1, f"{label}: processing has separate save and confirm actions")
                qa.check(page.locator('#confirmProcess').is_disabled(), f"{label}: confirmation stays locked until 200 UAH is marked received")
            if label=='mobile-390': qa.shot(page, f"mobile-390-{action}-modal.png")
            page.locator(f"{selector} .close").click()
        if label=='mobile-390': qa.shot(page, f"{label}-bookings.png")
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
        desktop_shell=page.evaluate("()=>{const main=document.querySelector('.main'),top=document.querySelector('.topbar'),mr=main.getBoundingClientRect(),tr=top.getBoundingClientRect();return{bodyOverflow:getComputedStyle(document.body).overflow,mainOverflow:getComputedStyle(main).overflowY,mainTop:mr.top,topBottom:tr.bottom}}")
        qa.check(desktop_shell['bodyOverflow']=='hidden' and desktop_shell['mainOverflow'] in ('auto','scroll'), "Desktop: main is the single vertical scroll owner")
        qa.check(abs(desktop_shell['mainTop']-desktop_shell['topBottom'])<=1, "Desktop: scrollbar starts below the fixed topbar instead of hiding underneath it")
        for view in ["bookings", "calendar", "upcoming", "equipment", "clients", "campaigns", "analytics", "chemistry", "settings"]:
            page.locator('.main').evaluate("el=>el.scrollTop=Math.min(360,Math.max(0,el.scrollHeight-el.clientHeight))")
            page.locator(f'.nav button[data-view="{view}"]').click()
            page.wait_for_timeout(90)
            qa.check(no_overflow(page), f"Desktop: {view} view has no horizontal overflow")
            qa.check(page.locator('.main').evaluate('el=>el.scrollTop')==0, f"Desktop: {view} view always opens at the top")
        page.locator('.nav button[data-view="bookings"]').click();page.wait_for_timeout(90)
        main_box=page.locator('.main').bounding_box();page.locator('.main').evaluate("el=>el.scrollTop=Math.min(520,Math.max(0,el.scrollHeight-el.clientHeight))");page.wait_for_timeout(50)
        desktop_toolbar=page.locator('.booking-toolbar').bounding_box()
        qa.check(main_box is not None and desktop_toolbar is not None and desktop_toolbar['y']<=main_box['y']+9, "Desktop: status filters stay sticky under the fixed topbar")
        page.locator('.main').evaluate('el=>el.scrollTop=0')
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



def public_date_suite(browser: Browser, qa: QA) -> None:
    page=browser.new_page(viewport={"width":390,"height":844},is_mobile=True)
    try:
        html = "<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"></head><body><main style=\"padding:24px\"><div class=\"booking-date-grid\" style=\"display:grid;gap:16px\"><label>Отримання<input type=\"date\" value=\"\"></label><label>Повернення<input type=\"date\" value=\"\"></label></div></main></body></html>"
        page.set_content(html)
        page.evaluate("window.fetch=async()=>({ok:true,json:async()=>({})})")
        page.add_style_tag(content=(ROOT/'assets/public-experience.css').read_text(encoding='utf-8'))
        page.add_script_tag(content=(ROOT/'assets/vacleaner-core.js').read_text(encoding='utf-8'))
        page.add_script_tag(content=(ROOT/'assets/public-experience.js').read_text(encoding='utf-8'))
        page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
        page.wait_for_selector('.vx-date-trigger')
        qa.check(page.locator('.vx-date-trigger').count()==2,'Public: both dates use stable custom controls')
        first=page.locator('.vx-date-trigger').first
        before=first.bounding_box()
        page.locator('.booking-date-grid input[type=\"date\"]').first.evaluate("el=>{el.value='2026-08-08';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}")
        page.wait_for_timeout(60)
        after=first.bounding_box()
        qa.check(before is not None and after is not None and abs(before['y']-after['y'])<=0.5 and abs(before['height']-after['height'])<=0.5,'Public: date geometry does not move after value selection')
        first.click();page.wait_for_selector('.vx-calendar-layer.is-open');page.wait_for_timeout(40)
        open_box=first.bounding_box();qa.check(after is not None and open_box is not None and abs(after['y']-open_box['y'])<=0.5 and abs(after['height']-open_box['height'])<=0.5,'Public: opening calendar does not move date field')
        page.locator('.vx-calendar-close').click();page.wait_for_timeout(40)
        closed=first.bounding_box();qa.check(after is not None and closed is not None and abs(after['y']-closed['y'])<=0.5,'Public: closing calendar restores identical date position')
        qa.check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Public: enhanced date controls never create horizontal overflow')
    finally:
        page.close()

def public_nearest_availability_suite(browser: Browser, qa: QA) -> None:
    page=browser.new_page(viewport={"width":390,"height":844},is_mobile=True)
    try:
        html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div class="booking-date-grid"><label>Отримання<input type="date"></label><select><option value="morning">Ранок</option><option value="evening">Вечір</option></select><label>Повернення<input type="date"></label><select><option value="morning">Ранок</option><option value="evening">Вечір</option></select></div><div class="availability-card idle">Оберіть дату</div></body></html>'
        page.set_content(html)
        cfg=json.loads((ROOT/'config/vacleaner.json').read_text(encoding='utf-8'))
        page.evaluate("cfg=>{window.__cfg=cfg;window.fetch=async(url,init={})=>{let p={};try{p=JSON.parse(init.body||'{}')}catch{};const data=String(url).includes('vacleaner-settings')?{slots:cfg.slots,depositRules:cfg.depositRules,catalog:cfg.catalog}:p.action==='availability'?{available:false,nextAvailable:{startDate:'2026-08-09',pickupWindow:'morning',returnDate:'2026-08-10',returnWindow:'morning'}}:{};return {ok:true,status:200,json:async()=>data,clone(){return this}}};}",cfg)
        page.add_style_tag(content=(ROOT/'assets/public-fixes.css').read_text(encoding='utf-8'))
        page.add_script_tag(content=(ROOT/'assets/vacleaner-core.js').read_text(encoding='utf-8'))
        page.add_script_tag(content=(ROOT/'assets/public-booking-slots.js').read_text(encoding='utf-8'))
        before_url=page.url
        page.evaluate("()=>fetch('https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5',{method:'POST',body:JSON.stringify({action:'availability'})})")
        page.wait_for_selector('.vx-nearest-availability-panel')
        qa.check(page.url==before_url, 'Public: unavailable slot is rendered in-place without page navigation')
        text=page.locator('.vx-nearest-availability-panel').inner_text()
        qa.check('Найближче вільне вікно' in text and '9 серпня' in text, 'Public: unavailable equipment shows the nearest compatible free window')
        qa.check(page.locator('.vx-use-nearest').count()==1, 'Public: nearest availability offers one explicit apply action')
        page.locator('.vx-use-nearest').click();page.wait_for_timeout(60)
        dates=page.locator('.booking-date-grid input[type="date"]').evaluate_all('els=>els.map(x=>x.value)')
        windows=page.locator('.booking-date-grid select').evaluate_all('els=>els.map(x=>x.value)')
        qa.check(dates==['2026-08-09','2026-08-10'] and windows==['morning','morning'], 'Public: nearest-window action applies the complete compatible rental period')
        qa.check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'Public: nearest-availability message does not introduce horizontal overflow')
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
        footer=page.locator('#bookingForm>footer .btn:visible').last.bounding_box()
        footer_shell=page.locator('#bookingForm>footer').bounding_box();qa.check(footer is not None and footer_shell is not None and abs(footer_shell['y']+footer_shell['height']-390)<=1 and footer['y']+footer['height']<=369.5, "Landscape: modal footer is pinned and actions clear home indicator")
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
            public_date_suite(browser, qa)
            public_nearest_availability_suite(browser, qa)
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
