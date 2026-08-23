#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ADMIN_HTML = (ROOT / 'admin/bronuvannia/index.html').read_text(encoding='utf-8')
INITIAL_ADMIN_ROOTS = ADMIN_HTML.split('<body>', 1)[1].split('<noscript>', 1)[0]
CONFIG = json.loads((ROOT / 'config/vacleaner.json').read_text(encoding='utf-8'))
ADMIN_JS = (ROOT / 'assets/admin-v250.js').read_text(encoding='utf-8')


def main() -> int:
    failures: list[str] = []
    passed = 0

    def check(value: bool, label: str) -> None:
        nonlocal passed
        if value:
            passed += 1
            print(f'PASS: {label}')
        else:
            failures.append(label)
            print(f'FAIL: {label}')

    check('bookingsLoaded:false' in ADMIN_JS, 'admin state tracks whether real bookings were loaded')
    check("if(!state.bookingsLoaded){renderLoading();return}" in ADMIN_JS, 'nearest view cannot show a false empty state before first real list')
    check('installAdminResumeRecovery();registerPwa();start();' in ADMIN_JS, 'resume recovery is installed before the first admin load')

    mock = f"""
    (()=>{{
      const store=new Map(),sessionStore=new Map();
      const storage=map=>({{getItem:k=>map.has(String(k))?map.get(String(k)):null,setItem:(k,v)=>map.set(String(k),String(v)),removeItem:k=>map.delete(String(k)),clear:()=>map.clear()}});
      Object.defineProperty(window,'localStorage',{{value:storage(store),configurable:true}});
      Object.defineProperty(window,'sessionStorage',{{value:storage(sessionStore),configurable:true}});
      localStorage.setItem('vacleaner_session',JSON.stringify({{access_token:'fresh-access',refresh_token:'refresh-one',expires_at:{int(time.time())+3600},user:{{id:'qa-user'}}}}));
      localStorage.setItem('vacleaner_session_persistent','1');
      localStorage.setItem('vacleaner_session_seen',String(Date.now()));
      window.__backendReady=false;window.__listCalls=0;
      const response=(status,body)=>({{ok:status>=200&&status<300,status,json:async()=>body}});
      const config={json.dumps(CONFIG, ensure_ascii=False)};
      const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
      const after=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
      const booking={{id:'22222222-2222-4222-8222-222222222222',booking_code:'VAC-QA-RESUME',product_code:'puzzi',product_label:'Kärcher Puzzi 8/1',start_date:tomorrow,return_date:after,start_at:tomorrow+'T08:00:00.000Z',end_at:after+'T10:00:00.000Z',pickup_window:'morning',return_window:'morning',rental_days:1,fulfillment:'pickup',fulfillment_address:'Полтава',customer_name:'Resume QA Client',customer_phone:'+380952222222',customer_comment:'',extras:{{selected_items:[]}},base_amount:700,extras_amount:0,delivery_amount:0,total_amount:700,prepayment_amount:200,prepayment_paid:true,deposit_amount:1000,deposit_paid:false,deposit_returned:false,status:'confirmed',source:'site',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}};
      const registration={{waiting:null,installing:null,update:async()=>{{}},addEventListener:()=>{{}},pushManager:{{getSubscription:async()=>null}}}};
      Object.defineProperty(navigator,'serviceWorker',{{value:{{controller:{{}},ready:Promise.resolve(registration),getRegistrations:async()=>[],register:async()=>registration,addEventListener:()=>{{}}}},configurable:true}});
      Object.defineProperty(navigator,'onLine',{{value:true,configurable:true}});
      Object.defineProperty(navigator,'standalone',{{value:true,configurable:true}});
      window.Notification={{permission:'default',requestPermission:async()=>'default'}};
      navigator.clipboard={{writeText:async()=>{{}}}};
      window.fetch=async(url,options={{}})=>{{
        const text=String(url); let payload={{}}; try{{payload=options.body?JSON.parse(options.body):{{}}}}catch{{}}
        if(text.includes('vacleaner-settings'))return response(200,{{slots:config.slots,depositRules:config.depositRules,catalog:config.catalog,deliveryFee:config.deliveryFee}});
        if(text.includes('vacleaner-admin-data-v1')){{
          if(payload.action==='list')window.__listCalls++;
          if(!window.__backendReady)throw new TypeError('simulated iOS resume network interruption');
          if(payload.action==='list')return response(200,{{bookings:[booking],expenses:[]}});
          if(payload.action==='clients')return response(200,{{customers:[]}});
          if(payload.action==='campaigns')return response(200,{{campaigns:[]}});
          return response(200,{{}});
        }}
        if(text.includes('vacleaner-admin-bookings-v3')){{
          if(payload.action==='calendar')return response(200,{{days:[]}});
          return response(200,{{}});
        }}
        if(text.includes('vacleaner-push'))return response(200,{{publicKey:'',subscribedDevices:0}});
        return response(200,{{}});
      }};
    }})()
    """

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
        page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body></body></html>')
        page.evaluate('(html)=>document.body.innerHTML=html', INITIAL_ADMIN_ROOTS)
        page.evaluate(mock)
        page.add_style_tag(content=(ROOT / 'assets/admin-v250.css').read_text(encoding='utf-8'))
        page.add_script_tag(content=(ROOT / 'assets/vacleaner-core.js').read_text(encoding='utf-8'))
        page.add_script_tag(content=ADMIN_JS)
        page.wait_for_selector('.load-state', timeout=7000)

        check(page.locator('.upcoming-scope').count() == 0, 'failed first load does not pretend there are zero nearest events')
        initial_calls = page.evaluate('window.__listCalls')
        page.evaluate("window.__backendReady=true; window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));")
        page.wait_for_selector('.upcoming-scope', timeout=7000)
        page.wait_for_selector('text=Resume QA Client', timeout=7000)
        page.wait_for_timeout(100)

        check(page.evaluate('window.__listCalls') > initial_calls, 'pageshow recovery performs a new real bookings request')
        check(page.locator('.loading-shell').count() == 0, 'resume recovery exits loading state')
        check(page.locator('.upcoming-scope [data-upcoming-scope="all"] b').inner_text() == '1', 'nearest count is restored from server data')
        check(page.locator('text=Resume QA Client').count() >= 1, 'nearest booking is visible after iOS-style resume')
        check(page.locator('.auth-card').count() == 0, 'valid persisted session survives resume recovery')
        browser.close()

    print(json.dumps({'passed': passed, 'failed': failures, 'status': 'failed' if failures else 'passed'}, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
