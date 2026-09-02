#!/usr/bin/env python3
from pathlib import Path
import importlib.util, shutil
from playwright.sync_api import sync_playwright, Error as PlaywrightError
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('v24',ROOT/'scripts/native_v24_qa.py')
# avoid importing because it executes; recreate helpers through base fixture
specb=importlib.util.spec_from_file_location('baseqa',ROOT/'scripts/pwa_visual_qa.py')
base=importlib.util.module_from_spec(specb);specb.loader.exec_module(base);base.ROOT=ROOT
INITIAL=(ROOT/'admin/bronuvannia/index.html').read_text().split('<body>',1)[1].split('<noscript>',1)[0]
CSS=['admin-v250.css','admin-glass-test.css','address-autocomplete.css','admin-native-v2.css','admin-native-v21.css','admin-native-v22.css','admin-native-v23.css','admin-native-v24.css']
JS=['vacleaner-core.js','admin-v250.js','admin-glass-test.js','address-autocomplete.js','admin-native-v2.js','admin-native-v22.js','admin-native-v23.js','admin-native-v24.js']
passed=0;failed=[]
def check(ok,label):
 global passed
 if ok:passed+=1;print('PASS',label)
 else:failed.append(label);print('FAIL',label)
def boot(browser,w=390,h=844):
 p=browser.new_page(viewport={'width':w,'height':h},is_mobile=True);p.set_default_timeout(6000)
 p.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
 p.evaluate("html=>{document.body.innerHTML=html;document.documentElement.classList.add('glass-test','native-test','native-v2','native-v21','native-v22','native-v23','native-v24')}",INITIAL);p.evaluate(base.init_script(True,True))
 for f in CSS:p.add_style_tag(content=(ROOT/'assets'/f).read_text())
 for f in JS:p.add_script_tag(content=(ROOT/'assets'/f).read_text())
 p.wait_for_selector('.app');p.wait_for_timeout(220);return p
def open_view(p,v):
 d=p.locator(f'.mobile-nav [data-mobile-view="{v}"]')
 if d.count():d.click()
 else:p.locator('.mobile-nav .more-nav').click();p.wait_for_selector('.mobile-more-menu');p.locator(f'[data-more-view="{v}"]').click()
 p.wait_for_timeout(140)
def no_overflow(p):return p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1")
def no_double_shell(p):
 return p.evaluate(r'''()=>{const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'};const ignore=e=>e.matches('.window-choice input[type=radio],.fulfillment-choice input[type=radio],.product-choice input[type=radio]');for(const e of document.querySelectorAll('input,select,textarea,button,summary')){if(!vis(e)||ignore(e))continue;const es=getComputedStyle(e),r=e.getBoundingClientRect();const eb=['Top','Right','Bottom','Left'].reduce((n,x)=>n+parseFloat(es['border'+x+'Width']||0),0);if(eb<1)continue;let a=e.parentElement,d=0;while(a&&a!==document.body&&d++<3){if(vis(a)){const as=getComputedStyle(a),ar=a.getBoundingClientRect(),ab=['Top','Right','Bottom','Left'].reduce((n,x)=>n+parseFloat(as['border'+x+'Width']||0),0),ratio=(ar.width*ar.height)/(r.width*r.height);if(ab>=1&&ratio<2.45&&parseFloat(as.borderRadius)>5)return false}a=a.parentElement}}return true}''')
def footer_clear(p,formsel):
 return p.evaluate("""sel=>{const f=document.querySelector(sel),foot=f?.querySelector(':scope > footer');if(!f||!foot)return true;const r=foot.getBoundingClientRect();return r.bottom<=innerHeight+1&&r.top>=0&&r.height>=44}""",formsel)
with sync_playwright() as pw:
 try:b=pw.chromium.launch(headless=True,args=['--no-sandbox'])
 except PlaywrightError:
  exe=shutil.which('chromium') or shutil.which('google-chrome');b=pw.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=exe)
 for w in (320,390,430):
  # all settings tabs
  p=boot(b,w);open_view(p,'settings');tabs=p.locator('[data-settings-tab]')
  for i in range(tabs.count()):
   tab=tabs.nth(i);name=tab.get_attribute('data-settings-tab') or str(i);tab.click();p.wait_for_timeout(80)
   check(no_overflow(p),f'{w}px settings {name}: no overflow');check(no_double_shell(p),f'{w}px settings {name}: no double shell')
  p.close()
  # deep modal flows
  for action,formsel in [('process','.process-form'),('issue','.issue-form'),('finance','.finance-form'),('complete','.finance-form'),('extend','.extend-form')]:
   p=boot(b,w);open_view(p,'bookings');loc=p.locator(f'.booking-card [data-action="{action}"]').first
   if loc.count():
    loc.click();p.wait_for_selector(formsel);p.wait_for_timeout(100)
    check(no_overflow(p),f'{w}px {action}: no overflow');check(no_double_shell(p),f'{w}px {action}: no double shell');check(footer_clear(p,formsel),f'{w}px {action}: footer visible')
   p.close()
  p=boot(b,w);p.locator('#mobileNewBooking').click();p.wait_for_selector('.booking-form');p.wait_for_timeout(100);check(no_overflow(p),f'{w}px new booking: no overflow');check(no_double_shell(p),f'{w}px new booking: no double shell');p.close()
  p=boot(b,w);open_view(p,'campaigns');p.locator('#smsCampaign').click();p.wait_for_selector('.sms-campaign-modal');p.wait_for_timeout(120);check(no_overflow(p),f'{w}px SMS: no overflow');check(no_double_shell(p),f'{w}px SMS: no double shell');p.close()
  p=boot(b,w);open_view(p,'clients');p.locator('[data-client-open]').first.locator('.client-name').click();p.wait_for_selector('#clientEditor');p.wait_for_timeout(100);check(no_overflow(p),f'{w}px client: no overflow');check(no_double_shell(p),f'{w}px client: no double shell');p.close()
 b.close()
print(f'NATIVE V2.4 DEEP QA: PASS {passed} · FAIL {len(failed)}')
if failed:
 for x in failed:print(' -',x)
 raise SystemExit(1)
