from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ASSETS = DIST / 'assets' if (DIST / 'assets' / 'admin-v4319-prepayment-waiver.js').exists() else ROOT / 'assets'
OUT = ROOT / 'pwa-test-results'
OUT.mkdir(exist_ok=True)
css = (ASSETS / 'admin-v250.css').read_text(encoding='utf-8')
js = (ASSETS / 'admin-v4319-prepayment-waiver.js').read_text(encoding='utf-8')

markup = '''
<form class="modal-form process-form" id="processForm" data-documents-required="0">
  <header><div><small>VA-4319-QA</small><h2>Опрацювати заявку</h2><p>QA</p></div></header>
  <div class="process-grid">
    <section class="modal-section"><div class="process-section-head"><span>01</span><div><h3>Контакт</h3></div></div>
      <label class="switch wide"><input name="contacted" type="checkbox"><span><b>З клієнтом зв’язались</b></span></label>
    </section>
    <section class="modal-section"><div class="process-section-head"><span>02</span><div><h3>Дані</h3></div></div>
      <label class="field"><span>ПІБ</span><input name="customerName" value="Тест Клієнт"></label>
      <label class="field"><span>Телефон</span><input name="customerPhone" value="0501234567"></label>
      <label class="field"><span>Адреса</span><input name="customerAddress" value="Полтава"></label>
      <label class="field"><span>Тип документа</span><select name="documentType"><option>Паспорт</option></select></label>
      <label class="field"><span>Документ</span><input name="documentNumber" value=""></label>
      <label class="switch wide"><input name="identityVerified" type="checkbox"><span><b>Документ перевірено</b></span></label>
    </section>
    <section class="modal-section"><div class="process-section-head"><span>03</span><div><h3>Очікування передплати</h3><p>Збережіть опрацювання, дочекайтеся 200 грн.</p></div></div>
      <label class="switch wide"><input name="confirmationSent" type="checkbox"><span><b>Умови клієнту надіслано</b></span></label>
      <label class="switch wide"><input name="prepaymentPaid" type="checkbox"><span><b>Передплата 200 грн отримана</b><small>Після цієї галочки бронювання можна підтвердити.</small></span></label>
      <div class="confirm-preview" id="confirmPreview"></div>
    </section>
  </div>
  <footer><button class="btn primary" type="button" id="saveProcess">Зберегти зміни</button><button class="btn green" id="confirmProcess" type="submit">Підтвердити бронювання</button></footer>
</form>
'''

html = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}\nbody{{background:#070b0e;color:#eef2f3;padding:16px}}.process-form{{max-width:760px;margin:auto}}</style></head><body>{markup}</body></html>'''

checks=[]
def check(ok,label):
    checks.append((bool(ok),label)); print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width,height in ((390,844),(932,430)):
        page=browser.new_page(viewport={'width':width,'height':height})
        requests=[]
        page.route('https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-prepayment-waiver-v1', lambda route, request: (requests.append(json.loads(request.post_data or '{}')), route.fulfill(status=200,content_type='application/json',body='{"prepaymentWaiver":true,"booking":{}}'))[1])
        page.set_content(html,wait_until='load')
        # This QA never submits the backend action, so it must not depend on localStorage.
        # page.set_content() uses an opaque origin in Chromium where localStorage can be blocked.
        page.add_script_tag(content=js)
        page.wait_for_timeout(80)

        waiver=page.locator('input[name="prepaymentWaived"]')
        paid=page.locator('input[name="prepaymentPaid"]')
        confirm=page.locator('#confirmProcess')
        save=page.locator('#saveProcess')
        label=page.locator('.prepayment-waiver-switch')
        check(waiver.count()==1,f'{width}: explicit no-prepayment switch is injected once')
        check('день у день' in label.inner_text().lower(),f'{width}: waiver reason is clear to manager')
        check(confirm.is_disabled(),f'{width}: confirm starts guarded')

        page.locator('input[name="contacted"]').check()
        page.locator('input[name="confirmationSent"]').check()
        page.wait_for_timeout(20)
        check(confirm.is_disabled(),f'{width}: contact + terms alone do not bypass payment')

        paid.check(); page.wait_for_timeout(20)
        check(not confirm.is_disabled(),f'{width}: legacy paid path remains available')
        check(not waiver.is_checked(),f'{width}: paid path does not imply waiver')

        waiver.check(); page.wait_for_timeout(30)
        check(not paid.is_checked(),f'{width}: waiver explicitly clears paid checkbox')
        check(not confirm.is_disabled(),f'{width}: explicit waiver unlocks confirmation')
        check('без 200 грн' in confirm.inner_text().lower(),f'{width}: primary action names the exception')
        check(save.is_disabled(),f'{width}: waiver cannot be silently saved as waiting-payment')
        check(label.evaluate("el => el.classList.contains('is-active')"),f'{width}: waiver has visible active state')

        # Ensure the waiver layer remains inside the modal width in portrait and iPhone landscape.
        box=label.bounding_box()
        check(box and box['x'] >= -1 and box['x']+box['width'] <= width+1,f'{width}: waiver control has no horizontal clipping')

        # Do not submit here: production backend is intentionally not required for branch browser QA.
        page.screenshot(path=str(OUT/f'admin-prepayment-waiver-v4319-{width}.png'),full_page=False)
        page.close()
    browser.close()

failed=[label for ok,label in checks if not ok]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-prepayment-waiver-v4319-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
