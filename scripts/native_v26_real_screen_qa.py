#!/usr/bin/env python3
from pathlib import Path
import importlib.util, shutil
from playwright.sync_api import sync_playwright, Error as PlaywrightError
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('baseqa',ROOT/'scripts/pwa_visual_qa.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base);base.ROOT=ROOT
INITIAL=(ROOT/'admin/bronuvannia/index.html').read_text().split('<body>',1)[1].split('<noscript>',1)[0]
CSS=['admin-v250.css','admin-glass-test.css','address-autocomplete.css','admin-native-v2.css','admin-native-v21.css','admin-native-v22.css','admin-native-v23.css','admin-native-v24.css','admin-native-v25.css','admin-native-v26.css']
JS=['vacleaner-core.js','admin-v250.js','admin-glass-test.js','address-autocomplete.js','admin-native-v2.js','admin-native-v22.js','admin-native-v23.js','admin-native-v24.js','admin-native-v26.js']
OUT=Path('/mnt/data/native_v26_preview');OUT.mkdir(exist_ok=True)
passed=0;failed=[]
def check(ok,label):
 global passed
 if ok: passed+=1; print('PASS',label)
 else: failed.append(label); print('FAIL',label)
def boot(browser,w=390,h=844):
 p=browser.new_page(viewport={'width':w,'height':h},is_mobile=True);p.set_default_timeout(6000)
 p.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
 p.evaluate("html=>{document.body.innerHTML=html;document.documentElement.classList.add('glass-test','native-test','native-v2','native-v21','native-v22','native-v23','native-v24','native-v25','native-v26')}",INITIAL)
 p.evaluate(base.init_script(True,True))
 for f in CSS:p.add_style_tag(content=(ROOT/'assets'/f).read_text())
 for f in JS:p.add_script_tag(content=(ROOT/'assets'/f).read_text())
 p.wait_for_selector('.app');p.wait_for_timeout(250)
 return p
def open_view(p,v):
 d=p.locator(f'.mobile-nav [data-mobile-view="{v}"]')
 if d.count():d.click()
 else:
  p.locator('.mobile-nav .more-nav').click();p.wait_for_selector('.mobile-more-menu');p.locator(f'[data-more-view="{v}"]').click()
 p.wait_for_timeout(120)
def rect(p,sel):
 return p.locator(sel).evaluate("e=>{let r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height,sw:e.scrollWidth,cw:e.clientWidth}}")
with sync_playwright() as pw:
 try:b=pw.chromium.launch(headless=True,args=['--no-sandbox'])
 except PlaywrightError:
  exe=shutil.which('chromium') or shutil.which('google-chrome');b=pw.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=exe)
 for w in (320,390,430):
  p=boot(b,w);open_view(p,'bookings');card=p.locator('.booking-card').first;card.evaluate('e=>e.click()');p.wait_for_selector('.detail');p.wait_for_timeout(100)
  p.locator('.audit-panel-head').click();p.wait_for_timeout(40)
  h=rect(p,'.audit-panel-head h3');u=rect(p,'#auditReload')
  check(u['l']>=h['r']+4,f'{w}px Detail: refresh separated from heading')
  check(u['r']<=w-8 and u['w']>=80 and u['h']>=44,f'{w}px Detail: refresh fits and is 44px+')
  more=p.locator('.native-detail-actions .booking-action-more > summary:visible')
  if more.count():
   m=rect(p,'.native-detail-actions .booking-action-more > summary:visible')
   check(m['r']<=w-8 and m['l']>=8 and m['h']>=44,f'{w}px Detail: More fits')
   gap=p.locator('.native-detail-actions .booking-action-more > summary').evaluate("e=>{let a=e.querySelector('span').getBoundingClientRect(),b=e.querySelector('em').getBoundingClientRect();return b.left-a.right}")
   check(gap>=6,f'{w}px Detail: ellipsis and More label have visible gap')
  if w==390:p.screenshot(path=str(OUT/'01-detail-actions.png'),full_page=True)
  p.close()

  p=boot(b,w);open_view(p,'campaigns');btn=p.locator('[data-campaign-sms]').first
  if not btn.count():btn=p.locator('#smsCampaign')
  btn.click();p.wait_for_selector('.sms-campaign-modal');p.wait_for_timeout(180)
  title=rect(p,'.sms-heading h2');close=rect(p,'.sms-workspace-header .close');journal=rect(p,'.sms-history-open');meta=rect(p,'.sms-header-meta');body=rect(p,'.sms-workspace-body')
  check(title['r']<=close['l']-4,f'{w}px SMS: title does not collide with close')
  check(journal['l']>=8 and journal['r']<=w-8 and journal['h']>=40,f'{w}px SMS: Journal gets full safe row')
  check(journal['t']>=max(title['b'],close['b'])-1,f'{w}px SMS: Journal below title/actions')
  check(meta['t']>=journal['b']+4,f'{w}px SMS: meta below Journal')
  check(body['t']>=meta['b']-1,f'{w}px SMS: body below header/meta')
  check(p.locator('.sms-history-open').inner_text().strip().startswith('Журнал'),f'{w}px SMS: Journal label visible')
  if w==390:p.screenshot(path=str(OUT/'02-sms-return.png'),full_page=True)
  p.close()
 b.close()
print(f'V2.6 REAL SCREEN QA: PASS {passed} · FAIL {len(failed)}')
if failed:
 for x in failed:print(' -',x)
 raise SystemExit(1)
