#!/usr/bin/env python3
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSETS=DIST/'assets' if (DIST/'assets'/'admin-v4321.css').exists() else ROOT/'assets'
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)

css='\n'.join((ASSETS/name).read_text(encoding='utf-8') for name in ('admin-v250.css','admin-v430.css','admin-v4321.css'))
js=(ASSETS/'admin-v4321.js').read_text(encoding='utf-8')
markup='''
<div class="detail"><div class="detail-shell">
  <div class="detail-top"><button class="back">← До бронювань</button><div class="detail-top-meta"><span>Бронювання</span><small>Створено 13.09</small></div><em class="native-detail-code">VAC-260913-DA095</em></div>
  <section class="detail-hero"><div class="detail-title-row"><h1>Puzzi + SC 2</h1><span class="hero-status">✓ Видана</span></div><div class="period"><b>13.09</b> · 12:00 → <b>14.09</b> · 12:00<small>1 доба</small></div></section>
  <section class="native-detail-card" data-status="issued">
    <div class="native-detail-info-row" data-v2-date="1"><i>◷</i><div><small>Дата і час</small><strong>13.09 · 12:00 → 14.09 · 12:00</strong></div></div>
    <div class="native-detail-info-row"><i>▣</i><div><small>Техніка</small><strong>Puzzi + SC 2</strong></div></div>
    <div class="native-detail-info-row"><i>⌬</i><div><small>Додатково</small><strong>+ Насадки «Преміум» до SC 2</strong></div></div>
    <div class="native-detail-info-row"><i>○</i><div><small>Клієнт</small><strong>Бондар Ярослав Миколайович</strong><a href="tel:+380506446696">+380 50 644 66 96</a></div></div>
    <div class="native-detail-info-row"><i>⌖</i><div><small>Самовивіз</small><strong>Полтава · місце повідомить менеджер</strong></div></div>
    <div class="native-detail-info-row"><i>₴</i><div><small>Фінанси</small><strong>1 400 грн</strong></div></div>
  </section>
  <section class="native-detail-stack"><article class="card panel finance-panel">
    <h3>Фінанси</h3>
    <div class="money-row"><span>Передоплата за бронювання <small>входить у фінальний взаєморозрахунок</small></span><strong>200 грн</strong></div>
    <div class="money-row"><span>Залог <small>Фактично отримано при видачі</small></span><strong>2 000 грн</strong></div>
    <div class="money-row received-total"><span>Отримано разом</span><strong>2 200 грн</strong></div>
    <div class="money-row"><span>Оренда</span><strong>1 200 грн</strong></div>
    <div class="money-row finance-extra-row"><span>Додатково</span><strong>200 грн</strong></div>
    <div class="money-row"><span>Доставка</span><strong>0 грн</strong></div>
    <div class="money-row expenses-total"><span>Разом витрати</span><strong>1 400 грн</strong></div>
    <div class="balance refund"><span>Попередньо повернути при поверненні</span><strong>800 грн</strong></div>
  </article></section>
  <article class="card audit-panel"><div class="audit-panel-head"><div><small>Контроль змін</small><h3>Історія бронювання</h3></div><button class="btn">Оновити</button></div><div class="audit-list"><article class="audit-entry"><i></i><div><strong>Техніку видано</strong><span>статус · залоговий платіж</span></div><time>13.09 12:04</time></article></div></article>
  <div class="detail-actions native-detail-actions actions"><button class="btn green primary-action" data-action="complete">Прийняти повернення</button><button class="btn booking-action-secondary" data-action="finance">Розрахунок</button><button class="btn extend-rental-action booking-action-secondary" data-action="extend">Продовжити оренду</button><details class="booking-action-more"><summary class="btn">•••</summary></details></div>
</div></div>
'''
html=f'''<!doctype html><html class="native-test native-v2 native-v21 native-v22 native-v23 native-v24 native-v25 native-v26 native-v27 native-v28 v43-prod v4320 v4321 detail-open"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>{css}\nhtml,body{{margin:0;min-height:100%;background:#070b0e}}body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}}</style></head><body class="detail-open">{markup}<script>{js}</script></body></html>'''

checks=[]
def check(ok,label):
    checks.append((bool(ok),label)); print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**opts)
    for width,height in ((320,720),(390,844),(430,932)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load')
        page.wait_for_selector('.v4321-finance-card')
        page.wait_for_timeout(80)
        check(page.locator('.detail').get_attribute('data-v4321-status')=='issued',f'{width}: issued state is attached to detail')
        check(page.locator('.hero-status').inner_text().strip()=='Видана',f'{width}: legacy checkmark is replaced by reference status pill')
        check(not page.locator('[data-v4321-row="date"]').is_visible(),f'{width}: date row is not duplicated inside info card')
        check(not page.locator('[data-v4321-row="finance"]').is_visible(),f'{width}: finance is not duplicated inside info card')
        check(page.locator('.v4321-finance-head strong').inner_text().strip()=='1 400 грн',f'{width}: finance header uses source expense total')
        check(page.locator('.v4321-finance-summary.received strong').inner_text().strip()=='2 200 грн',f'{width}: received summary uses source total')
        check(page.locator('.v4321-finance-balance strong').inner_text().strip()=='800 грн',f'{width}: settlement uses source balance')
        check(page.locator('.v4321-finance-balance').inner_text().strip().startswith('До повернення'),f'{width}: issued refund is presented as “До повернення”')
        primary=page.locator('[data-action="complete"]'); finance=page.locator('[data-action="finance"]'); extend=page.locator('[data-action="extend"]')
        pb=primary.bounding_box(); fb=finance.bounding_box(); eb=extend.bounding_box()
        check(pb is not None and fb is not None and eb is not None,f'{width}: all issued actions are visible')
        if pb and fb and eb:
            check(pb['width']>=max(fb['width'],eb['width'])-1,f'{width}: return action has primary width hierarchy')
            if width>350:
                check(abs(fb['y']-eb['y'])<=2 and eb['x']>fb['x'],f'{width}: calculation and extension share the secondary row')
            else:
                check(eb['y']>fb['y'],f'{width}: narrow-phone actions stack safely')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{width}: no horizontal overflow')
        history=page.locator('.v4321-history-row')
        check(history.is_visible(),f'{width}: booking history row is visible')
        history.click()
        page.wait_for_timeout(30)
        check(page.locator('.audit-panel').is_visible(),f'{width}: booking history expands live audit panel')
        page.screenshot(path=str(OUT/f'admin-booking-detail-v4321-{width}.png'),full_page=True)
        page.close()
    browser.close()

failed=[label for ok,label in checks if not ok]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-booking-detail-v4321-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)