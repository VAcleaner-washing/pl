#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
PAGES=[
 ('sc2','tekhnika/karcher-sc-2-deluxe/index.html'),
 ('abir','tekhnika/robot-dlia-vikon-abir/index.html'),
 ('reviews','vidhuky/index.html'),
]
VIEWS=[(320,844),(390,844),(430,932),(768,1024),(1024,768),(1280,800),(1650,760),(1920,1080)]
CSS='\n'.join((ROOT/p).read_text(encoding='utf-8') for p in ['_next/static/chunks/0-rnytzezgu81.css','assets/public-fixes.css','assets/public-experience.css','assets/site-v400.css','assets/puzzi-seo.css'] if (ROOT/p).exists())
failed=[]; passed=0

def check(cond,label):
 global passed
 if cond: passed+=1; print('PASS:',label)
 else: failed.append(label); print('FAIL:',label)

def overflow(page):
 return page.evaluate("""()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bad:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.position!=='fixed'&&!el.classList.contains('final-cta-orbit')&&r.width>1&&(r.right>innerWidth+2||r.left<-2)}).slice(0,8).map(el=>String(el.className||el.tagName))})""")

with sync_playwright() as p:
 opts={'headless':True}
 if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
 browser=p.chromium.launch(**opts)
 try:
  for name,rel in PAGES:
   html=(ROOT/rel).read_text(encoding='utf-8')
   for w,h in VIEWS:
    page=browser.new_page(viewport={'width':w,'height':h},is_mobile=w<=900)
    page.set_content(html,wait_until='domcontentloaded'); page.add_style_tag(content=CSS); page.wait_for_timeout(60)
    label=f'{name} {w}x{h}';ov=overflow(page)
    check(ov['sw']<=ov['cw']+2 and not ov['bad'],f'{label}: no horizontal/outside-viewport layout')
    check(page.locator('h1').count()==1 and page.locator('h1').is_visible(),f'{label}: primary heading is visible')
    check(page.locator('.site-header').count()==1,f'{label}: one canonical header')
    if name in {'sc2','abir'}:
     product='sc2' if name=='sc2' else 'abir'
     check(page.locator(f'a[href="/bronuvannia/?product={product}"]').count()>=2,f'{label}: product-aware booking CTA survives real layout')
     check(page.locator('.mobile-booking').count()==1,f'{label}: one mobile booking bar contract')
    else:
     check(page.locator('.proof-stat-grid article').count()==3,f'{label}: social proof is a three-metric set')
     if w<=700:
      boxes=[page.locator('.proof-stat-grid article').nth(i).bounding_box() for i in range(3)]
      check(all(boxes) and boxes[1]['y']>boxes[0]['y'] and boxes[2]['y']>boxes[1]['y'],f'{label}: social proof stacks cleanly on mobile')
    page.close()
  solution_links=[
   ('steam-link','rishennia/steam/index.html','/tekhnika/karcher-sc-2-deluxe/','Kärcher SC 2 Deluxe'),
   ('windows-link','rishennia/windows/index.html','/tekhnika/robot-dlia-vikon-abir/','Робот для вікон · ABIR WD8'),
  ]
  for name,rel,href,text in solution_links:
   html=(ROOT/rel).read_text(encoding='utf-8')
   for w,h in [(390,844),(1280,800)]:
    page=browser.new_page(viewport={'width':w,'height':h},is_mobile=w<=900);page.set_content(html,wait_until='domcontentloaded');page.add_style_tag(content=CSS);page.wait_for_timeout(30)
    label=f'{name} {w}x{h}'; link=page.locator(f'.feature-list a[href="{href}"]'); ov=overflow(page)
    check(link.count()==1 and link.is_visible(),f'{label}: equipment name is a visible product link')
    check(link.inner_text().strip()==text,f'{label}: product link keeps the canonical equipment name')
    check(ov['sw']<=ov['cw']+2 and not ov['bad'],f'{label}: linked equipment row creates no overflow')
    page.close()
  booking=(ROOT/'bronuvannia/index.html').read_text(encoding='utf-8')
  for w,h in [(390,844),(1280,800)]:
   page=browser.new_page(viewport={'width':w,'height':h},is_mobile=w<=900);page.set_content(booking,wait_until='domcontentloaded');page.add_style_tag(content=CSS);page.wait_for_timeout(50)
   label=f'booking {w}x{h}';txt=page.locator('body').inner_text();ov=overflow(page)
   check('Базові порції для Puzzi видаємо окремо' in txt,f'{label}: chemistry distinction is visible in server layout')
   check('7:00–9:30' not in txt and '08:00–10:00' in txt,f'{label}: current morning slot is visible in server layout')
   check(ov['sw']<=ov['cw']+2 and not ov['bad'],f'{label}: no horizontal/outside-viewport layout')
   page.close()
 finally: browser.close()
print(json.dumps({'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'},ensure_ascii=False))
raise SystemExit(1 if failed else 0)
