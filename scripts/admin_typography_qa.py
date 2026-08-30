#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import pwa_visual_qa as fixture  # noqa: E402

VIEWS = ['bookings','calendar','upcoming','equipment','clients','campaigns','finances','analytics','chemistry','settings']


def visible_overbold(page):
    return page.evaluate("""()=>[...document.querySelectorAll('body *')].filter(el=>{
      const r=el.getBoundingClientRect(),cs=getComputedStyle(el),text=(el.textContent||'').trim();
      if(!text||r.width<=0||r.height<=0||cs.display==='none'||cs.visibility==='hidden')return false;
      if(el.children.length)return false;
      if(el.tagName==='I' && /^[›→←↗×!]+$/.test(text))return false;
      return Number.parseInt(cs.fontWeight||'400',10)>700;
    }).map(el=>({tag:el.tagName.toLowerCase(),className:String(el.className||''),weight:getComputedStyle(el).fontWeight,text:(el.textContent||'').trim().slice(0,100)}))""")


def open_base(browser):
    page = fixture.render_page(browser, 1440, 900, authenticated=True, standalone=False)
    if page.locator('.pwa-update-later').count():
        page.locator('.pwa-update-later').click()
    return page


def assert_clean(page, label, failures):
    offenders = visible_overbold(page)
    if offenders:
        failures.append(f"{label}: {offenders[:8]}")
        print(f"FAIL: {label}: over-bold text {offenders[:8]}")
    else:
        print(f"PASS: {label}: no visible text above 700")


def main():
    failures=[]
    with sync_playwright() as pw:
        opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
        if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
        browser = pw.chromium.launch(**opts)
        page = open_base(browser)
        try:
            for view in VIEWS:
                button=page.locator(f'.nav button[data-view="{view}"]')
                if button.count():
                    button.click(); page.wait_for_timeout(80)
                assert_clean(page, f'view:{view}', failures)
        finally:
            page.close()

        page = open_base(browser)
        try:
            page.locator('.chip').nth(5).click(); page.wait_for_timeout(60)
            page.locator('.booking-card').last.locator('button', has_text='Переглянути розрахунок').click(); page.wait_for_timeout(80)
            assert_clean(page, 'modal:returned-finance', failures)
        finally:
            page.close()

        page = open_base(browser)
        try:
            page.locator('.chip').nth(5).click(); page.wait_for_timeout(60)
            page.locator('.booking-card').last.locator('.booking-client-link').click(); page.wait_for_timeout(80)
            assert_clean(page, 'modal:client-card', failures)
            if page.locator('#clientOpenReferral').count():
                page.locator('#clientOpenReferral').click(); page.wait_for_timeout(80)
                assert_clean(page, 'modal:referral', failures)
            else:
                failures.append('modal:referral: referral CTA missing in fixture')
        finally:
            page.close()
        browser.close()

    if failures:
        print(f'Admin typography QA failed: {len(failures)}')
        for item in failures: print(' -',item)
        raise SystemExit(1)
    print('Admin typography QA: 13/13 PASS')

if __name__ == '__main__':
    main()
