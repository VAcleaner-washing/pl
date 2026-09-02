#!/usr/bin/env python3
from pathlib import Path
import importlib.util, shutil
from playwright.sync_api import sync_playwright, Error as PlaywrightError
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('baseqa',ROOT/'scripts/pwa_visual_qa.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base);base.ROOT=ROOT
INITIAL=(ROOT/'admin/bronuvannia/index.html').read_text().split('<body>',1)[1].split('<noscript>',1)[0]
CSS=['admin-v250.css','admin-glass-test.css','address-autocomplete.css','admin-native-v2.css','admin-native-v21.css','admin-native-v22.css','admin-native-v23.css','admin-native-v24.css','admin-native-v25.css','admin-native-v26.css','admin-native-v27.css']
JS=['vacleaner-core.js','admin-v250.js','admin-glass-test.js','address-autocomplete.js','admin-native-v2.js','admin-native-v22.js','admin-native-v23.js','admin-native-v24.js','admin-native-v26.js','admin-native-v27.js']
P=F=0
def ck(ok,label):
 global P,F
 if ok:P+=1;print('PASS',label)
 else:F+=1;print('FAIL',label)
def boot(b,w):
 p=b.new_page(viewport={'width':w,'height':844},is_mobile=True);p.set_default_timeout(5000)
 p.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
 p.evaluate("html=>{document.body.innerHTML=html;document.documentElement.classList.add('glass-test','native-test','native-v2','native-v21','native-v22','native-v23','native-v24','native-v25','native-v26','native-v27')}",INITIAL);p.evaluate(base.init_script(True,True))
 for f in CSS:p.add_style_tag(content=(ROOT/'assets'/f).read_text())
 for f in JS:p.add_script_tag(content=(ROOT/'assets'/f).read_text())
 p.wait_for_selector('.app');p.wait_for_timeout(160);return p
def openv(p,v):
 d=p.locator(f'.mobile-nav [data-mobile-view="{v}"]')
 if d.count():d.click()
 else:p.locator('.more-nav').click();p.wait_for_selector('.mobile-more-menu');p.locator(f'[data-more-view="{v}"]').click()
 p.wait_for_timeout(80)
with sync_playwright() as pw:
 try:b=pw.chromium.launch(headless=True,args=['--no-sandbox'])
 except PlaywrightError:b=pw.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=shutil.which('chromium') or shutil.which('google-chrome'))
 for w in (320,390,430):
  p=boot(b,w)
  for i,v in enumerate(('upcoming','bookings','calendar','equipment','clients','campaigns','finances','analytics','chemistry','settings')):
   if i:openv(p,v)
   ok=p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1&&(!document.querySelector('.main')||document.querySelector('.main').scrollWidth<=document.querySelector('.main').clientWidth+1)")
   ck(ok,f'{w}px {v}: no horizontal overflow')
  p.close()
 b.close()
print(f'V2.7 PRIMARY QA: PASS {P} · FAIL {F}')
raise SystemExit(1 if F else 0)
