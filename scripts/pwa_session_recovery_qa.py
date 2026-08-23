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

    mock = f"""
    (()=>{{
      const store=new Map(),sessionStore=new Map();
      const storage=map=>({{getItem:k=>map.has(String(k))?map.get(String(k)):null,setItem:(k,v)=>map.set(String(k),String(v)),removeItem:k=>map.delete(String(k)),clear:()=>map.clear()}});
      Object.defineProperty(window,'localStorage',{{value:storage(store),configurable:true}});
      Object.defineProperty(window,'sessionStorage',{{value:storage(sessionStore),configurable:true}});
      localStorage.setItem('vacleaner_session',JSON.stringify({{access_token:'stale-access',refresh_token:'refresh-one',expires_at:{int(time.time())+3600},user:{{id:'qa-user'}}}}));
      localStorage.setItem('vacleaner_session_persistent','1');
      localStorage.setItem('vacleaner_session_seen',String(Date.now()));
      window.__refreshCalls=0;window.__old401Calls=0;window.__freshCalls=0;
      const response=(status,body)=>({{ok:status>=200&&status<300,status,json:async()=>body}});
      const config={json.dumps(CONFIG, ensure_ascii=False)};
      const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
      const after=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
      const booking={{id:'11111111-1111-4111-8111-111111111111',booking_code:'VAC-QA-001',product_code:'puzzi',product_label:'Kärcher Puzzi 8/1',start_date:tomorrow,return_date:after,start_at:tomorrow+'T08:00:00.000Z',end_at:after+'T10:00:00.000Z',pickup_window:'morning',return_window:'morning',rental_days:1,fulfillment:'pickup',fulfillment_address:'Полтава',customer_name:'QA Client',customer_phone:'+380951111111',customer_comment:'',extras:{{selected_items:[]}},base_amount:700,extras_amount:0,delivery_amount:0,total_amount:700,prepayment_amount:200,prepayment_paid:true,deposit_amount:1000,deposit_paid:false,deposit_returned:false,status:'confirmed',source:'site',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}};
      const waiting={{state:'installed',postMessage:()=>{{}},addEventListener:()=>{{}}}};
      const registration={{waiting:null,installing:null,update:async()=>{{}},addEventListener:()=>{{}},pushManager:{{getSubscription:async()=>null}}}};
      Object.defineProperty(navigator,'serviceWorker',{{value:{{controller:{{}},ready:Promise.resolve(registration),getRegistrations:async()=>[],register:async()=>registration,addEventListener:()=>{{}}}},configurable:true}});
      Object.defineProperty(navigator,'onLine',{{value:true,configurable:true}});
      Object.defineProperty(navigator,'standalone',{{value:true,configurable:true}});
      window.Notification={{permission:'default',requestPermission:async()=>'default'}};
      navigator.clipboard={{writeText:async()=>{{}}}};
      window.fetch=async(url,options={{}})=>{{
        const text=String(url); let payload={{}}; try{{payload=options.body?JSON.parse(options.body):{{}}}}catch{{}}
        if(text.includes('/auth/v1/token?grant_type=refresh_token')){{
          window.__refreshCalls++;
          await new Promise(resolve=>setTimeout(resolve,90));
          return response(200,{{access_token:'fresh-access',refresh_token:'refresh-two',expires_at:Math.floor(Date.now()/1000)+3600,user:{{id:'qa-user'}}}});
        }}
        if(text.includes('vacleaner-settings'))return response(200,{{slots:config.slots,depositRules:config.depositRules,catalog:config.catalog,deliveryFee:config.deliveryFee}});
        if(text.includes('vacleaner-admin-data-v1')||text.includes('vacleaner-admin-bookings-v3')){{
          const auth=String((options.headers||{{}}).Authorization||'');
          if(auth==='Bearer stale-access'){{window.__old401Calls++;return response(401,{{error:'unauthorized'}})}}
          if(auth==='Bearer fresh-access')window.__freshCalls++;
          if(payload.action==='list')return response(200,{{bookings:[booking]}});
          if(payload.action==='calendar')return response(200,{{days:[]}});
          if(payload.action==='clients')return response(200,{{customers:[]}});
          if(payload.action==='campaigns')return response(200,{{campaigns:[]}});
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
        page.add_script_tag(content=(ROOT / 'assets/admin-v250.js').read_text(encoding='utf-8'))
        page.wait_for_selector('.upcoming-scope', timeout=7000)
        page.wait_for_timeout(150)

        check(page.locator('.loading-shell').count() == 0, 'expired-token recovery exits the skeleton state')
        check(page.locator('.upcoming-scope').count() == 1, 'nearest-rentals view renders after recovery')
        check(page.evaluate('window.__old401Calls') >= 2, 'parallel stale-token requests reproduce the 401 burst')
        check(page.evaluate('window.__refreshCalls') == 1, 'parallel 401 responses share one token refresh')
        check(page.evaluate('window.__freshCalls') >= 2, 'failed admin requests retry with the refreshed token')
        check(page.evaluate("JSON.parse(localStorage.getItem('vacleaner_session')).access_token") == 'fresh-access', 'refreshed session is persisted for the PWA')
        check(page.locator('.auth-card').count() == 0, 'successful refresh does not throw the user back to login')
        browser.close()

    print(json.dumps({'passed': passed, 'failed': failures, 'status': 'failed' if failures else 'passed'}, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
