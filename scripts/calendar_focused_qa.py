#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pwaqa',ROOT/'scripts/pwa_visual_qa.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
viewports=[(320,844),(390,844),(430,932),(768,1024),(1024,900),(1280,900),(1650,760),(1920,1080)]
passed=0
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium')
  for w,h in viewports:
    page=m.render_page(b,w,h,standalone=w<=900)
    try:
      if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click(); page.wait_for_timeout(20)
      if w<=900:m.open_mobile_view(page,'calendar')
      else:
        page.locator('.nav button[data-view="calendar"]').click();page.wait_for_timeout(80)
      assert m.no_overflow(page),f'{w}: overflow'
      assert page.locator('.calendar-grid').count()==1,f'{w}: calendar missing'
      assert page.locator('.day-card').count()>=1,f'{w}: day cards missing'
      outside=page.locator('.day-card,.day-row,.slot').evaluate_all('(els)=>els.some(el=>{const r=el.getBoundingClientRect();return r.left<-1||r.right>innerWidth+1})')
      assert not outside,f'{w}: calendar element outside viewport'
      assert page.locator('.slot').count()>=8,f'{w}: slots missing'
      print(f'PASS {w}x{h}: calendar contained with readable slots')
      passed+=1
    finally:page.close()
  b.close()
print(f'Calendar focused QA PASS: {passed}/{len(viewports)} viewports')
