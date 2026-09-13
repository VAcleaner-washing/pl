#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)
FAIL=[]
RESULTS=[]


def check(cond,label):
    ok=bool(cond)
    RESULTS.append({'label':label,'ok':ok})
    print(('PASS' if ok else 'FAIL')+': '+label)
    if not ok: FAIL.append(label)


def fixture(status='issued'):
    return f'''<!doctype html><html class="v4321"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
    <main class="detail">
      <section class="native-detail-card" data-status="{status}">
        <div class="native-detail-info-row"><i></i><div><small>Техніка</small><strong>Puzzi + SC 2</strong></div></div>
        <div class="native-detail-info-row"><i></i><div><small>Фінанси</small><div class="native-payments">
          <div class="native-pay-line"><span>Передоплата</span><b>200 грн</b></div>
          <div class="native-pay-line"><span>Залог</span><b>2 000 грн</b></div>
          <div class="native-pay-line"><span>Оренда</span><b>1 200 грн</b></div>
          <div class="native-pay-line"><span>Додатково</span><b>200 грн</b></div>
          <div class="native-pay-line"><span>Доставка</span><b>0 грн</b></div>
        </div></div></div>
      </section>
      <section class="native-detail-stack"></section>
    </main></body></html>'''


with sync_playwright() as pw:
    opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**opts)
    try:
        for width in (390,430):
            page=browser.new_page(viewport={'width':width,'height':844})
            page.set_content(fixture('issued'))
            page.add_style_tag(content=(ROOT/'assets'/'admin-v4321.css').read_text(encoding='utf-8'))
            page.add_script_tag(content=(ROOT/'assets'/'admin-v4321.js').read_text(encoding='utf-8'))
            page.wait_for_timeout(120)

            finance=page.locator('.native-detail-finance-v4321')
            check(finance.count()==1,f'{width}: issued detail gets one redesigned finance block')
            check(page.locator('.native-detail-card .native-detail-info-row').filter(has_text='Фінанси').count()==0,f'{width}: old inline finance row is removed after enhancement')
            check(finance.locator('.v4321-fin-group.received').inner_text().startswith('Отримано від клієнта'),f'{width}: received-money group is explicit')
            check('Передоплата' in finance.locator('.v4321-fin-group.received').inner_text() and 'Залог' in finance.locator('.v4321-fin-group.received').inner_text(),f'{width}: prepayment and deposit stay in received group')
            charged=finance.locator('.v4321-fin-group.charged').inner_text()
            check(all(label in charged for label in ('Оренда','Додатково','Доставка')),f'{width}: charges group contains rental, extras and delivery')
            check(finance.locator('.v4321-fin-tile.received strong').inner_text()=='2 200 грн',f'{width}: received total is 2 200 грн')
            check(finance.locator('.v4321-fin-tile.expenses strong').inner_text()=='1 400 грн',f'{width}: expenses total is 1 400 грн')
            check(finance.locator('.v4321-fin-result strong').inner_text()=='800 грн' and 'До повернення' in finance.locator('.v4321-fin-result').inner_text(),f'{width}: final refund is 800 грн')
            widths=page.evaluate("()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth})")
            check(widths['doc']<=widths['inner']+1 and widths['body']<=widths['inner']+1,f'{width}: finance redesign has no horizontal overflow')
            page.screenshot(path=str(OUT/f'admin-detail-finance-v4321-{width}.png'),full_page=True)
            page.close()

        control=browser.new_page(viewport={'width':390,'height':844})
        control.set_content(fixture('confirmed'))
        control.add_style_tag(content=(ROOT/'assets'/'admin-v4321.css').read_text(encoding='utf-8'))
        control.add_script_tag(content=(ROOT/'assets'/'admin-v4321.js').read_text(encoding='utf-8'))
        control.wait_for_timeout(120)
        check(control.locator('.native-detail-finance-v4321').count()==0,'confirmed: redesign does not invent received deposit before issue')
        check(control.locator('.native-detail-card .native-detail-info-row').filter(has_text='Фінанси').count()==1,'confirmed: existing finance row remains intact')
        control.close()
    finally:
        browser.close()

result={'results':RESULTS,'failures':FAIL,'passed':len(RESULTS)-len(FAIL),'failed':len(FAIL)}
(OUT/'admin-detail-finance-v4321-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(f"TOTAL {len(RESULTS)} · PASS {len(RESULTS)-len(FAIL)} · FAIL {len(FAIL)}")
if FAIL: raise SystemExit(1)
