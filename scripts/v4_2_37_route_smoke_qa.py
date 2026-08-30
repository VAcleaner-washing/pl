#!/usr/bin/env python3
from __future__ import annotations
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from pwa_visual_qa import render_page

ROOT=Path(__file__).resolve().parents[1]
passed=0
failed=[]
def check(ok,label):
    global passed
    if ok:
        passed+=1; print('PASS:',label)
    else:
        failed.append(label); print('FAIL:',label)

def run(browser,width,standalone):
    page=render_page(browser,width,844 if width<=900 else 900,True,standalone)
    page.set_default_timeout(6000)
    tag=f"{'PWA' if standalone else 'desktop'}-{width}"
    try:
        search=page.locator('#globalSearch')
        search.fill('Анна'); page.wait_for_timeout(100)
        booking=page.locator('[data-search-booking]').first
        check(booking.count()>0,f'{tag}: global search exposes a booking')
        booking.click(); page.wait_for_selector('.detail')
        check('До пошуку' in page.locator('.detail .back').inner_text(),f'{tag}: search booking detail labels exact return route')
        # Deep path: search -> booking -> client -> new booking -> client -> booking -> search.
        page.locator('[data-client-card]').click(); page.wait_for_selector('#clientEditor')
        check(page.locator('.client-header-close').inner_text().strip()=='←' and 'До бронювання' in (page.locator('.client-header-close').get_attribute('aria-label') or ''),f'{tag}: client opened from booking exposes an explicit route back')
        page.locator('#clientCreateBooking').click(); page.wait_for_selector('#bookingForm')
        # A waiting service-worker prompt is already present in the fixture. While work is active it must be deferred.
        prompts=page.locator('.pwa-update-prompt')
        deferred=prompts.count()>=1 and all(prompts.nth(i).evaluate("el=>getComputedStyle(el).visibility")=='hidden' and prompts.nth(i).evaluate("el=>getComputedStyle(el).pointerEvents")=='none' for i in range(prompts.count()))
        check(deferred,f'{tag}: update prompt defers while new-booking modal is active')
        page.locator('.booking-cancel').click(); page.wait_for_selector('#clientEditor')
        check(page.locator('#clientEditor').count()==1,f'{tag}: cancelling new booking returns to client card')
        page.locator('.client-header-close').click(); page.wait_for_selector('.detail')
        check(page.locator('.detail').count()==1,f'{tag}: closing client returns to booking detail')
        page.locator('.detail .back').click(); page.wait_for_selector('[data-search-booking]')
        check(search.input_value()=='Анна',f'{tag}: final Back restores exact search query')
        # Once back at the root view the deferred update notice may safely reappear above navigation.
        prompt=page.locator('.pwa-update-prompt')
        if prompt.count():
            check(prompt.first.evaluate("el=>getComputedStyle(el).visibility")=='visible',f'{tag}: deferred update prompt returns only after active workflow closes')
            if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click()
        # Direct client search path also returns to search.
        client=page.locator('[data-search-client]').first
        check(client.count()>0,f'{tag}: global search exposes a client')
        client.click(); page.wait_for_selector('#clientEditor')
        check(page.locator('.client-header-close').inner_text().strip()=='←' and 'До пошуку' in (page.locator('.client-header-close').get_attribute('aria-label') or ''),f'{tag}: search client exposes explicit Back to search')
        page.locator('.client-header-close').click(); page.wait_for_selector('[data-search-client]')
        check(search.input_value()=='Анна',f'{tag}: client Back preserves search query')
    finally:
        page.close()

def main():
    global passed,failed
    with sync_playwright() as p:
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        options={'headless':True,'args':['--no-sandbox']}
        if executable: options['executable_path']=executable
        elif Path('/usr/bin/chromium').exists(): options.update(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
        browser=p.chromium.launch(**options)
        try:
            run(browser,390,True)
            run(browser,1440,False)
        finally:
            browser.close()
    print(f'v4.2.37 route smoke: {passed}/{passed+len(failed)} PASS')
    return 1 if failed else 0
if __name__=='__main__': raise SystemExit(main())
