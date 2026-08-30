#!/usr/bin/env python3
from __future__ import annotations
import json, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as pwa  # noqa: E402

passed=0
failed=[]

def check(cond,label):
    global passed
    if cond:
        passed+=1; print('PASS:',label)
    else:
        failed.append(label); print('FAIL:',label)

def rect(page,selector):
    return page.locator(selector).bounding_box()

def run(browser,width,height):
    page=pwa.render_page(browser,width,height)
    label=f'{width}x{height}'
    try:
        page.locator('.pwa-update-later').click(); page.wait_for_timeout(40)
        page.locator('.nav button[data-view="finances"]').click(); page.wait_for_timeout(120)
        check(page.locator('.delivery-car-cost').count()==2,f'{label}: Passat CC and Fiesta render as two vehicle rows')
        check(page.locator('.delivery-car-cost').nth(0).inner_text().startswith('Passat CC'),f'{label}: Passat CC identity stays visible')
        check(page.locator('.delivery-car-cost').nth(1).inner_text().startswith('Fiesta'),f'{label}: Fiesta identity stays visible')
        check(page.locator('.delivery-car-cost').first.locator('.delivery-car-metric').count()==2,f'{label}: vehicle row has two separate finance metrics')
        check('Залишається після пального' in page.locator('.delivery-car-cost').first.inner_text(),f'{label}: net metric has explicit human label')
        check('Середня відстань до клієнта' in page.locator('.delivery-map-card').inner_text(),f'{label}: Finance leads with km to client')
        text=page.locator('.finance-toolbar').inner_text()+page.locator('.delivery-map-card').inner_text()
        check('completed_at' not in text and 'route distance' not in text.lower(),f'{label}: no technical field names leak into Finance copy')
        first=rect(page,'.delivery-car-cost:nth-child(1)'); second=rect(page,'.delivery-car-cost:nth-child(2)')
        check(first and second and abs(first['x']-second['x'])<2 and abs(first['width']-second['width'])<2 and second['y']>first['y']+first['height'],f'{label}: vehicle cards are stacked full-width, never squeezed side by side')
        check(not page.evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth'),f'{label}: Finance has no horizontal document overflow')
        metrics=page.locator('.delivery-car-cost').first.locator('.delivery-car-metric')
        if metrics.count()==2:
            a=metrics.nth(0).bounding_box(); b=metrics.nth(1).bounding_box()
            check(a and b and a['width']>=150 and b['width']>=190,f'{label}: vehicle finance metrics keep readable width')
    finally:
        page.close()

def main():
    global passed
    with sync_playwright() as p:
        opts={'headless':True,'args':['--no-sandbox']}
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if executable: opts['executable_path']=executable
        elif Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
        browser=p.chromium.launch(**opts)
        try:
            for dims in [(1650,900),(1280,800),(1024,768)]: run(browser,*dims)
        finally:
            browser.close()
    result={'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'}
    print(json.dumps(result,ensure_ascii=False))
    return 0 if not failed else 1

if __name__=='__main__': raise SystemExit(main())
