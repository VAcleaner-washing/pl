#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
import importlib.util, sys

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'glass-test-results'
spec=importlib.util.spec_from_file_location('pwaqa',ROOT/'scripts/pwa_visual_qa.py')
mod=importlib.util.module_from_spec(spec); sys.modules['pwaqa']=mod; spec.loader.exec_module(mod)
GLASS=(ROOT/'assets/admin-glass-test.css').read_text(encoding='utf-8')

def check(cond,label,fail):
    print(('PASS' if cond else 'FAIL')+': '+label)
    if not cond: fail.append(label)

def run(browser,w):
    fail=[]; h=844
    page=mod.render_page(browser,w,h,authenticated=True,standalone=True)
    page.evaluate("document.documentElement.classList.add('glass-test');document.documentElement.style.setProperty('--pwa-safe-top','47px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')")
    page.add_style_tag(content=GLASS)
    page.wait_for_timeout(150)
    # dismiss update prompt if present
    if page.locator('.pwa-update-prompt').count(): page.locator('.pwa-update-later').click()
    check(mod.no_overflow(page),f'{w}: no horizontal overflow',fail)
    nav=page.locator('.mobile-nav').bounding_box(); main=page.locator('.main').bounding_box(); search=page.locator('.search').bounding_box()
    check(nav is not None and nav['x']>=8 and nav['x']+nav['width']<=w-8,f'{w}: floating nav inset inside viewport',fail)
    check(nav is not None and nav['y']+nav['height']<=h-30 and nav['y']+nav['height']>=h-48,f'{w}: floating nav clears home indicator',fail)
    check(search is not None and search['x']>=10 and search['x']+search['width']<=w-10,f'{w}: glass search fits',fail)
    # Geometry must remain stable while booking list scrolls (no old collapse behavior)
    mod.open_mobile_view(page,'bookings'); page.wait_for_timeout(120)
    before=page.evaluate("()=>({m:document.querySelector('.main').getBoundingClientRect(),s:document.querySelector('.search').getBoundingClientRect(),n:document.querySelector('.mobile-nav').getBoundingClientRect()})")
    page.locator('.main').evaluate("el=>el.scrollTo(0,Math.min(420,el.scrollHeight-el.clientHeight))")
    page.wait_for_timeout(180)
    after=page.evaluate("()=>({m:document.querySelector('.main').getBoundingClientRect(),s:document.querySelector('.search').getBoundingClientRect(),n:document.querySelector('.mobile-nav').getBoundingClientRect()})")
    check(abs(before['m']['y']-after['m']['y'])<.6 and abs(before['s']['y']-after['s']['y'])<.6 and abs(before['n']['y']-after['n']['y'])<.6,f'{w}: scroll keeps shell/search/nav geometry stable',fail)
    # More popover is glass and inside viewport
    page.locator('.mobile-nav .more-nav:visible').click(); page.wait_for_timeout(80)
    more=page.locator('.mobile-more-menu').bounding_box()
    check(more is not None and more['x']>=8 and more['x']+more['width']<=w-8 and more['y']>40,f'{w}: More glass popover fits',fail)
    page.keyboard.press('Escape'); page.wait_for_timeout(30)
    # Screenshots
    ART.mkdir(exist_ok=True)
    if w==390:
        mod.open_mobile_view(page,'upcoming'); page.wait_for_timeout(100); page.screenshot(path=str(ART/'upcoming-glass-390.png'),full_page=True)
        mod.open_mobile_view(page,'bookings'); page.wait_for_timeout(100); page.screenshot(path=str(ART/'bookings-glass-390.png'),full_page=True)
        mod.open_mobile_view(page,'calendar'); page.wait_for_timeout(100); page.screenshot(path=str(ART/'calendar-glass-390.png'),full_page=True)
    page.close(); return fail

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox'])
    failures=[]
    for w in (320,390,430): failures += run(browser,w)
    browser.close()
if failures:
    print(f'Glass QA failed: {len(failures)}')
    raise SystemExit(1)
print('Glass QA passed')
