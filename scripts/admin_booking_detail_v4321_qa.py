#!/usr/bin/env python3
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
    print(('PASS' if ok else 'FAIL')+': '+label)
    RESULTS.append({'label':label,'ok':ok})
    if not ok: FAIL.append(label)

def norm(value):
    return ' '.join(str(value or '').split())

HTML='''<!doctype html><html class="v43-prod v4321"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<div class="detail"><section class="native-detail-card" data-status="issued">
  <div class="native-detail-info-row"><i></i><div><small>Техніка</small><strong>Puzzi + SC 2</strong></div></div>
  <div class="native-detail-info-row"><i></i><div><small>Додатково</small><strong>+ Насадки «Преміум» до SC 2</strong></div></div>
  <div class="native-detail-info-row" data-native-detail-client><i></i><div><small>Клієнт</small><strong>Бондарь Ярослав Миколайович</strong><a>+380 50 644 66 96</a></div></div>
  <div class="native-detail-info-row"><i></i><div><small>Самовивіз</small><strong>Полтава · місце повідомить менеджер</strong></div></div>
  <div class="native-detail-info-row"><i></i><div><small>Фінанси</small><div class="native-payments">
    <div class="native-pay-line"><span>Передоплата</span><b>200 грн</b></div>
    <div class="native-pay-line"><span>Залог</span><b>2 000 грн</b></div>
    <div class="native-pay-line"><span>Оренда</span><b>1 200 грн</b></div>
    <div class="native-pay-line"><span>Додатково</span><b>200 грн</b></div>
    <div class="native-pay-line"><span>Доставка</span><b>0 грн</b></div>
  </div></div></div>
</section><details class="audit-panel"><summary>Історія бронювання</summary></details></div>
</body></html>'''

with sync_playwright() as pw:
    opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**opts)
    try:
        for width in (390,430):
            page=browser.new_page(viewport={'width':width,'height':844})
            page.set_content(HTML)
            page.add_style_tag(content=(ROOT/'assets/admin-v4321.css').read_text(encoding='utf-8'))
            page.add_script_tag(content=(ROOT/'assets/admin-v4321.js').read_text(encoding='utf-8'))
            page.wait_for_selector('.native-detail-finance-v4321')
            page.wait_for_timeout(80)
            card=page.locator('.native-detail-finance-v4321')
            text=card.inner_text()
            check(page.locator('.native-detail-card .native-detail-info-row').count()==4,f'{width}px: finance is a separate detail card')
            check('Отримано від клієнта' in text and 'Нараховано' in text,f'{width}px: received and charged groups are explicit')
            received_amount=norm(page.locator('.v4321-summary-received strong').inner_text())
            expenses_amount=norm(page.locator('.v4321-summary-expenses strong').inner_text())
            result_amount=norm(page.locator('.v4321-summary-result strong').inner_text())
            check(received_amount=='2 200 грн' and expenses_amount=='1 400 грн' and result_amount=='800 грн',f'{width}px: 2200 received / 1400 expenses / 800 refund is truthful')
            result=page.locator('.v4321-summary-result')
            result_label=norm(result.locator('small').inner_text())
            check(result_label=='До повернення' and result_amount=='800 грн',f'{width}px: final refund result is prominent')
            widths=page.evaluate('()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth})')
            check(widths['doc']<=widths['inner']+1 and widths['body']<=widths['inner']+1,f'{width}px: no horizontal overflow')
            summary_boxes=page.locator('.v4321-summary-card').evaluate_all('els=>els.map(e=>e.getBoundingClientRect())')
            check(len(summary_boxes)==2 and all(b['width']>120 and b['height']>54 for b in summary_boxes),f'{width}px: summary tiles remain readable')
            page.screenshot(path=str(OUT/f'admin-booking-detail-v4321-{width}.png'),full_page=True)
            page.close()
    finally:
        browser.close()

(OUT/'admin-booking-detail-v4321-result.json').write_text(json.dumps({'results':RESULTS,'failures':FAIL,'total':len(RESULTS),'passed':len(RESULTS)-len(FAIL),'failed':len(FAIL)},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'TOTAL {len(RESULTS)} · PASS {len(RESULTS)-len(FAIL)} · FAIL {len(FAIL)}')
if FAIL: raise SystemExit(1)
