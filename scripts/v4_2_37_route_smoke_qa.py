#!/usr/bin/env python3
from __future__ import annotations
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
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

PROMPT_STATES = """()=>Array.from(document.querySelectorAll('.pwa-update-prompt'),el=>({
    visibility:getComputedStyle(el).visibility,pointerEvents:getComputedStyle(el).pointerEvents
}))"""
DEFERRED_PROMPTS = """()=>{const nodes=Array.from(document.querySelectorAll('.pwa-update-prompt'));
    return nodes.length>0&&nodes.every(el=>getComputedStyle(el).visibility==='hidden'&&getComputedStyle(el).pointerEvents==='none')}
"""

def prompts_deferred(page,timeout=1000):
    # Pointer interception must stop immediately. Visibility may finish the
    # existing CSS transition; wait for its state, never retry the journey.
    initial=page.evaluate(PROMPT_STATES)
    if not initial or any(row['pointerEvents']!='none' for row in initial):
        return False
    try:
        page.wait_for_function(DEFERRED_PROMPTS,timeout=timeout)
    except PlaywrightTimeoutError:
        print('Prompt deferral deadline:',page.evaluate(PROMPT_STATES))
        return False
    return True

def verify_prompt_wait_contract(browser):
    # Isolated timing fixtures own their CSS. Product journeys below continue
    # to use the real, unchanged application styles and controls.
    page=browser.new_page()
    try:
        page.set_content('''<style>
          .pwa-update-prompt{visibility:visible;pointer-events:auto}
          html.modal-open .pwa-update-prompt{visibility:hidden;pointer-events:none;
            transition:visibility 0s linear .12s}
          </style><aside class="pwa-update-prompt">Fixture update</aside>''')
        immediate=page.evaluate('''async()=>{
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          document.documentElement.classList.add('modal-open');
          const el=document.querySelector('.pwa-update-prompt');
          return {visibility:getComputedStyle(el).visibility,pointerEvents:getComputedStyle(el).pointerEvents}
        }''')
        check(immediate['visibility']=='visible' and immediate['pointerEvents']=='none',
              'prompt contract: old immediate assertion rejects a valid CSS transition')
        check(prompts_deferred(page),'prompt contract: bounded wait accepts the completed transition')
        page.add_style_tag(content='.pwa-update-prompt{transition:none!important;visibility:visible!important;pointer-events:none!important}')
        check(not prompts_deferred(page,timeout=250),'prompt contract: permanently visible prompt still fails')
        page.add_style_tag(content='.pwa-update-prompt{visibility:hidden!important;pointer-events:auto!important}')
        check(not prompts_deferred(page),'prompt contract: hidden but interactive prompt still fails immediately')
        page.add_style_tag(content='.pwa-update-prompt{pointer-events:none!important}.bad-prompt{pointer-events:auto!important}')
        page.evaluate("document.body.insertAdjacentHTML('beforeend','<aside class=\"pwa-update-prompt bad-prompt\">Second prompt</aside>')")
        check(not prompts_deferred(page),'prompt contract: every prompt must be non-interactive')
        page.evaluate("document.querySelectorAll('.pwa-update-prompt').forEach(el=>el.remove())")
        check(not prompts_deferred(page),'prompt contract: missing prompt never counts as deferral')
    finally:
        page.close()

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
        check('До пошуку' in (page.locator('.detail .back').get_attribute('aria-label') or ''),f'{tag}: search booking detail labels exact return route')
        # Deep path: search -> booking -> client -> new booking -> client -> booking -> search.
        page.locator('[data-client-card]').click(); page.wait_for_selector('#clientEditor')
        check(page.locator('#clientEditor>header .admin-screen-back').is_visible() and 'До бронювання' in (page.locator('#clientEditor>header .admin-screen-back').get_attribute('aria-label') or ''),f'{tag}: client opened from booking exposes an explicit route back')
        page.locator('#clientCreateBooking').click(); page.wait_for_selector('#bookingForm')
        # A waiting service-worker prompt is already present in the fixture. While work is active it must be deferred.
        check(prompts_deferred(page),f'{tag}: update prompt defers while new-booking modal is active')
        page.locator('.booking-cancel').click(); page.wait_for_selector('#clientEditor')
        check(page.locator('#clientEditor').count()==1,f'{tag}: cancelling new booking returns to client card')
        page.locator('#clientEditor>header .admin-screen-back').click(); page.wait_for_selector('.detail')
        check(page.locator('.detail').count()==1,f'{tag}: client Back returns to booking detail')
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
        check(page.locator('#clientEditor>header .admin-screen-back').is_visible() and 'До пошуку' in (page.locator('#clientEditor>header .admin-screen-back').get_attribute('aria-label') or ''),f'{tag}: search client exposes explicit Back to search')
        page.locator('#clientEditor>header .admin-screen-back').click(); page.wait_for_selector('[data-search-client]')
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
            verify_prompt_wait_contract(browser)
            run(browser,390,True)
            run(browser,1440,False)
        finally:
            browser.close()
    print(f'v4.2.37 route smoke: {passed}/{passed+len(failed)} PASS')
    return 1 if failed else 0
if __name__=='__main__': raise SystemExit(main())
