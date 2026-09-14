#!/usr/bin/env python3
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSETS=DIST/'assets' if (DIST/'assets'/'admin-v4322.css').exists() else ROOT/'assets'
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)

css='\n'.join((ASSETS/name).read_text(encoding='utf-8') for name in ('admin-v250.css','admin-v430.css','admin-v4321.css','admin-v4322.css'))
js=(ASSETS/'admin-v4322.js').read_text(encoding='utf-8')
markup='''
<div class="detail v4321-detail-ready" data-v4321-status="completed"><div class="detail-shell">
  <div class="detail-top"><button class="back">←</button><div class="detail-top-meta"><span>Бронювання</span></div><em class="native-detail-code">VAC-260913-DA095</em></div>
  <section class="native-detail-card" data-status="completed"></section>
  <section class="v4321-finance-card">
    <header class="v4321-finance-head"><span class="v4321-finance-icon"></span><h2>Фінанси</h2><div><small>Разом витрати</small><strong>1 500 грн</strong></div></header>
    <section class="v4321-finance-group received"><h3>Отримано від клієнта</h3>
      <div class="v4321-finance-line"><span>Передоплата<small>входить у фінальний взаєморозрахунок</small></span><b>200 грн</b></div>
      <div class="v4321-finance-line"><span>Залог<small>Взаєморозрахунок завершено</small></span><b>2 000 грн</b></div>
    </section>
    <section class="v4321-finance-group charged"><h3>Нараховано</h3>
      <div class="v4321-finance-line"><span>Оренда</span><b>1 200 грн</b></div>
      <div class="v4321-finance-line"><span>Додатково<small>Насадки 200 грн</small></span><b>200 грн</b></div>
      <div class="v4321-finance-line"><span>Доставка</span><b>0 грн</b></div>
      <div class="v4321-finance-line"><span>Хімія<small>2 використано</small></span><b>100 грн</b></div>
    </section>
    <div class="v4321-finance-summaries">
      <div class="v4321-finance-summary received"><span class="v4321-summary-icon"></span><span><small>Отримано</small><strong>2 200 грн</strong></span></div>
      <div class="v4321-finance-summary charged"><span class="v4321-summary-icon"></span><span><small>Витрати</small><strong>1 500 грн</strong></span></div>
    </div>
    <div class="v4321-finance-balance refund"><span class="v4321-balance-icon"></span><span>Повернено клієнту</span><strong>700 грн</strong></div>
  </section>
  <button class="v4321-history-row" type="button"><span></span><span>Історія бронювання</span><i>›</i></button>
  <div class="detail-actions native-detail-actions v4321-actions">
    <button class="btn primary-action v4321-primary-action" data-action="finance"><span class="v4321-action-icon"></span>Переглянути розрахунок</button>
    <button class="btn referral-action" data-action="referral">Приведи друга</button>
    <button class="btn" data-action="status">Виправити статус</button>
  </div>
</div></div>
'''
html=f'''<!doctype html><html class="native-test v43-prod v4321 v4322 detail-open"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>{css}\nhtml,body{{margin:0;min-height:100%;background:#070b0e}}body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}}</style></head><body class="detail-open">{markup}<script>document.querySelector('[data-action="status"]').addEventListener('click',()=>document.body.dataset.statusProxy='1');</script><script>{js}</script></body></html>'''

checks=[]
def check(value,label):
    checks.append((bool(value),label))
    print(('PASS' if value else 'FAIL')+': '+label)

with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): launch['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**launch)
    for width,height in ((320,720),(390,844),(430,932)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load')
        page.wait_for_selector('.v4322-finance-card')
        page.wait_for_selector('.v4322-more-action')
        page.wait_for_timeout(60)

        check(page.locator('.v4321-finance-head > div').count()==0,f'{width}: duplicated header expense total is absent')
        check(page.locator('.v4321-finance-group.received h3').inner_text().strip()=='Отримано',f'{width}: received section is concise')
        deposit=page.locator('.v4321-finance-group.received .v4321-finance-line').nth(1)
        check(deposit.locator(':scope > span').inner_text().split('\n')[0].strip()=='Застава',f'{width}: manager-facing deposit label is “Застава”')
        check(deposit.locator('small').inner_text().strip()=='повертається після розрахунку',f'{width}: deposit helper explains return')
        check(page.locator('.v4321-finance-group.charged h3').inner_text().strip()=='Нараховано',f'{width}: charged section stays explicit')
        labels=[x.inner_text().strip() for x in page.locator('.v4321-finance-summary small').all()]
        check(labels==['Отримано','Нараховано'],f'{width}: summary labels are received/accrued without duplicate expense wording')
        check(page.locator('.v4321-finance-summary.received strong').inner_text().strip()=='2 200 грн',f'{width}: received amount remains factual')
        check(page.locator('.v4321-finance-summary.charged strong').inner_text().strip()=='1 500 грн',f'{width}: accrued amount remains factual')
        balance=page.locator('.v4321-finance-balance')
        check('Повернено клієнту' in balance.inner_text() and '700 грн' in balance.inner_text(),f'{width}: final refund is unchanged')

        actions=page.locator('.native-detail-actions')
        details=page.locator('[data-action="finance"]')
        referral=page.locator('[data-action="referral"]')
        status=page.locator('[data-action="status"]')
        more=page.locator('.v4322-more-action')
        check('Деталі розрахунку' in details.inner_text(),f'{width}: finance action uses approved label')
        check(details.is_visible() and referral.is_visible() and more.is_visible(),f'{width}: approved completed actions are visible')
        check(not status.is_visible(),f'{width}: direct status correction is moved behind “Ще”')
        ab=actions.bounding_box(); db=details.bounding_box(); rb=referral.bounding_box(); mb=more.bounding_box()
        check(ab and db and db['width']>=ab['width']-3,f'{width}: details action spans the action surface')
        check(rb and mb and abs(rb['y']-mb['y'])<=2 and mb['x']>rb['x'],f'{width}: referral and more share the secondary row')
        more.click()
        check(page.locator('body').get_attribute('data-status-proxy')=='1',f'{width}: “Ще” delegates to canonical status correction control')

        group_style=page.locator('.v4321-finance-group.received').evaluate("el=>({border:getComputedStyle(el).borderTopWidth,bg:getComputedStyle(el).backgroundColor,radius:getComputedStyle(el).borderRadius})")
        check(group_style['border']=='0px' and group_style['radius']=='0px',f'{width}: received group is flat, not a nested card')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{width}: no horizontal overflow')
        page.screenshot(path=str(OUT/f'admin-booking-finance-v4322-{width}.png'),full_page=True)
        page.close()
    browser.close()

failed=[label for passed,label in checks if not passed]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-booking-finance-v4322-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
