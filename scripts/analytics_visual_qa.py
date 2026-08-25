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
   check(bool(box and box['width']>min(280,w-70) and box['height']>=(140 if w<=700 else 180)),f'{label}: trend chart has useful readable area')
   check(page.locator('[data-trend-metric]').count()==2,f'{label}: revenue/rentals switch is present')
   rev_labels=page.eval_on_selector_all('.analytics-trend-y-label','els=>els.map(e=>e.textContent||"")')
   check(all('k' not in x.lower() for x in rev_labels),f'{label}: revenue axis uses full values instead of k-abbreviations')
   if w<=700:
    check(len(rev_labels)==0,f'{label}: mobile chart removes squeezed Y-axis labels from the plot')
    check(page.locator('.analytics-trend-bar').count()>=1,f'{label}: PWA uses readable bars instead of a squeezed line spike')
    check(page.locator('.analytics-trend-line').count()==0,f'{label}: PWA does not render the desktop line chart')
    check(page.locator('.analytics-trend-mobile-scale').is_visible(),f'{label}: mobile chart keeps a compact readable scale label')
    check('0–' in page.locator('.analytics-trend-mobile-scale b').inner_text(),f'{label}: mobile scale clearly states the chart range')
    check(page.locator('.analytics-trend-mobile-scale').evaluate('el=>getComputedStyle(el).backgroundColor') in ('rgba(0, 0, 0, 0)','transparent'),f'{label}: mobile scale is not rendered as a nested card')
   else:
    check(len(rev_labels)>=2,f'{label}: desktop chart keeps full Y-axis labels')
    check(page.locator('.analytics-trend-line').count()==1,f'{label}: desktop keeps the line trend')
   x_boxes=page.eval_on_selector_all('.analytics-trend-x-label','els=>els.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}})')
   chart_box=page.locator('.analytics-trend-chart').bounding_box()
   check(bool(chart_box and all(x['left']>=chart_box['x']-2 and x['right']<=chart_box['x']+chart_box['width']+2 for x in x_boxes)),f'{label}: first/last date labels stay inside chart')
   if w<=500:
    font=float(page.locator('.analytics-trend-x-label').first.evaluate('el=>parseFloat(getComputedStyle(el).fontSize)'))
    check(font<=10.5,f'{label}: PWA date labels stay compact without squeezing the plot')
   page.locator('[data-trend-metric="rentals"]').click(); page.wait_for_timeout(20)
   rent_labels=page.eval_on_selector_all('.analytics-trend-y-label','els=>els.map(e=>e.textContent||"")')
   if w<=700:
    scale_text=page.locator('.analytics-trend-mobile-scale b').inner_text().strip()
    check('ор.' in scale_text and '0–' in scale_text,f'{label}: mobile rental chart states an integer rental range outside the plot')
   else:
    check(len(rent_labels)==len(set(rent_labels)) and all(x.isdigit() for x in rent_labels),f'{label}: rental axis uses unique whole-number ticks')
   page.locator('[data-trend-metric="revenue"]').click(); page.wait_for_timeout(20)
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
