#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import pwa_visual_qa as fixture  # noqa: E402

VIEWS = ['bookings','calendar','upcoming','equipment','clients','campaigns','finances','analytics','chemistry','settings']
WIDTHS = [(390,844),(768,1024),(1024,768),(1440,900)]


def open_base(browser):
    page = fixture.render_page(browser, 1440, 900, authenticated=True, standalone=False)
    if page.locator('.pwa-update-later').count():
        page.locator('.pwa-update-later').click()
    return page


def weight(page, selector):
    loc=page.locator(selector).first
    if not loc.count() or not loc.is_visible(): return None
    return int(float(loc.evaluate("el=>getComputedStyle(el).fontWeight")))


def all_weights(page, selector):
    return page.locator(selector).evaluate_all("els=>els.filter(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'}).map(el=>({text:(el.textContent||'').trim().slice(0,80),weight:parseInt(getComputedStyle(el).fontWeight)||400,className:String(el.className||'')}))")


def assert_max(page, selector, maximum, label, failures):
    rows=all_weights(page,selector)
    bad=[r for r in rows if r['weight']>maximum]
    if bad:
        failures.append(f"{label}: {bad[:8]}")
        print(f"FAIL: {label}: {bad[:8]}")
    else:
        print(f"PASS: {label}: <= {maximum} ({len(rows)} visible)")


def assert_exact(page, selector, expected, label, failures):
    value=weight(page,selector)
    if value is None:
        failures.append(f"{label}: selector missing {selector}")
        print(f"FAIL: {label}: selector missing")
    elif value != expected:
        failures.append(f"{label}: {value} != {expected}")
        print(f"FAIL: {label}: {value} != {expected}")
    else:
        print(f"PASS: {label}: {value}")


def visible_overbold(page):
    return page.evaluate("""()=>[...document.querySelectorAll('body *')].filter(el=>{
      const r=el.getBoundingClientRect(),cs=getComputedStyle(el),text=(el.textContent||'').trim();
      if(!text||r.width<=0||r.height<=0||cs.display==='none'||cs.visibility==='hidden')return false;
      if(el.children.length)return false;
      if(/^H[1-4]$/.test(el.tagName))return false;
      if(el.matches('.avatar,.brand strong,.top-profile strong'))return false;
      if(el.tagName==='I' && /^[›→←↗×!]+$/.test(text))return false;
      return Number.parseInt(cs.fontWeight||'400',10)>620;
    }).map(el=>({tag:el.tagName.toLowerCase(),className:String(el.className||''),weight:getComputedStyle(el).fontWeight,text:(el.textContent||'').trim().slice(0,100)}))""")


def main():
    failures=[]
    checks=0
    with sync_playwright() as pw:
        opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
        if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
        browser = pw.chromium.launch(**opts)
        for width,height in WIDTHS:
            page = fixture.render_page(browser, width, height, authenticated=True, standalone=False)
            if page.locator('.pwa-update-later').count():
                page.locator('.pwa-update-later').click()
            try:
                for view in VIEWS:
                    # Desktop nav exists at >= 1024, mobile uses data-mobile-view buttons where available.
                    button=page.locator(f'.nav button[data-view="{view}"]')
                    if button.count() and button.first.is_visible():
                        button.first.click(); page.wait_for_timeout(45)
                    else:
                        mobile=page.locator(f'[data-mobile-view="{view}"]')
                        if mobile.count() and mobile.first.is_visible(): mobile.first.click(); page.wait_for_timeout(45)
                        else:
                            # direct runtime switch for admin-only QA fixture
                            page.evaluate("v=>{if(window.state){state.view=v;render();}}", view); page.wait_for_timeout(45)
                    offenders=visible_overbold(page)
                    checks+=1
                    label=f'{width}x{height}:{view}'
                    if offenders:
                        failures.append(f"{label}: {offenders[:8]}")
                        print(f"FAIL: {label}: over-bold readable text {offenders[:8]}")
                    else:
                        print(f"PASS: {label}: no readable non-heading text above 620")
                    for selector,maximum,name in [
                        ('.status:visible',500,f'{label}: status chips'),
                        ('button:visible,.btn:visible',560,f'{label}: buttons'),
                        ('.field>span:visible',500,f'{label}: field labels'),
                    ]:
                        assert_max(page,selector,maximum,name,failures); checks+=1
            finally:
                page.close()

            # Booking/client-card typography at every responsive breakpoint.
            page = fixture.render_page(browser, width, height, authenticated=True, standalone=False)
            if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click()
            try:
                assert_max(page,'.booking-finance em:visible',460,f'{width}x{height}: booking settlement pill',failures); checks+=1
                assert_max(page,'.booking-deposit-state:visible',460,f'{width}x{height}: booking deposit pill',failures); checks+=1
                if page.locator('.booking-finance em:visible strong').count():
                    assert_exact(page,'.booking-finance em:visible strong',580,f'{width}x{height}: booking settlement amount',failures); checks+=1
                if page.locator('.booking-deposit-state:visible strong').count():
                    assert_exact(page,'.booking-deposit-state:visible strong',580,f'{width}x{height}: booking deposit amount',failures); checks+=1
                # Open a client card from booking row; scroll/body mode differs by width but same hierarchy must hold.
                link=page.locator('.booking-card').last.locator('.booking-client-link')
                if link.count():
                    link.click(); page.wait_for_timeout(70)
                    assert_exact(page,'.client-tier-level',600,f'{width}x{height}: client loyalty level',failures); checks+=1
                    if page.locator('.client-tier-discount').count():
                        assert_exact(page,'.client-tier-discount',580,f'{width}x{height}: client loyalty discount',failures); checks+=1
                    assert_max(page,'.client-contact-section .field>span:visible',500,f'{width}x{height}: client field labels',failures); checks+=1
                    assert_max(page,'.client-section-head>span:visible,.client-section-head small:visible',500,f'{width}x{height}: client section metadata',failures); checks+=1
                    assert_max(page,'.client-card-form button:visible,.client-card-form .btn:visible,.client-card-form a:visible',560,f'{width}x{height}: client card actions',failures); checks+=1
                    assert_max(page,'.glass-client-actions a:visible,.glass-client-actions button:visible',500,f'{width}x{height}: glass client quick actions',failures); checks+=1
                    overflow=page.locator('.client-card-form').evaluate("el=>el.scrollWidth>el.clientWidth+2")
                    checks+=1
                    if overflow:
                        failures.append(f'{width}x{height}: client card horizontal overflow')
                        print(f'FAIL: {width}x{height}: client card horizontal overflow')
                    else: print(f'PASS: {width}x{height}: client card no horizontal overflow')
            finally:
                page.close()
        browser.close()

    if failures:
        print(f'Admin typography QA failed: {len(failures)}')
        for item in failures: print(' -',item)
        raise SystemExit(1)
    print(f'Admin typography QA: {checks}/{checks} PASS')

if __name__ == '__main__':
    main()
