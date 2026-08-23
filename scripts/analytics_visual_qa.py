#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).resolve().parent))
from pwa_visual_qa import render_page, no_overflow

ROOT=Path(__file__).resolve().parents[1]
VIEWS=[(320,844),(390,844),(430,932),(768,1024),(1024,768),(1280,800),(1650,760),(1920,1080)]
failed=[]; passed=0

def check(cond,label):
 global passed
 if cond:
  passed+=1; print('PASS:',label)
 else:
  failed.append(label); print('FAIL:',label)

with sync_playwright() as p:
 opts={'headless':True}
 if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
 browser=p.chromium.launch(**opts)
 try:
  for w,h in VIEWS:
   page=render_page(browser,w,h)
   page.locator('[data-view="analytics"]').first.evaluate('el=>el.click()')
   page.wait_for_selector('.analytics-trend-panel')
   page.wait_for_timeout(80)
   if page.locator('#pwaUpdateLater').count(): page.locator('#pwaUpdateLater').click()
   label=f'{w}x{h}'
   check(no_overflow(page),f'{label}: analytics has no horizontal overflow')
   check(page.locator('.analytics-trend-panel svg').count()==1,f'{label}: one real trend SVG is visible')
   box=page.locator('.analytics-trend-chart').bounding_box()
   check(bool(box and box['width']>min(280,w-70) and box['height']>=180),f'{label}: trend chart has useful readable area')
   check(page.locator('[data-trend-metric]').count()==2,f'{label}: revenue/rentals switch is present')
   check(page.locator('.analytics-funnel-row').count()==5,f'{label}: cumulative funnel exposes five workflow stages')
   check(page.locator('.source-performance-panel .analytics-panel-head>strong').inner_text().strip()=='7',f'{label}: source KPI shows applications, not channel count')
   if w in (390,1280):
    out=ROOT/'tmp-analytics-4105'; out.mkdir(exist_ok=True)
    page.screenshot(path=str(out/f'analytics-{w}.png'),full_page=True)
   page.close()
 finally:
  browser.close()
print(json.dumps({'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'},ensure_ascii=False))
raise SystemExit(1 if failed else 0)
