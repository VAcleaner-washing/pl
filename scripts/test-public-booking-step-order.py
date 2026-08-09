#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BUNDLE=(ROOT/'_next/static/chunks/146ntlcv_t6~w-v4010.js').read_text()
EXPERIENCE=ROOT/'assets/public-experience.js'

assert '[_,C]=(0,n.useState)("")' in BUNDLE, 'fulfillment must start unselected'
assert '[_,C]=(0,n.useState)("pickup")' not in BUNDLE, 'pickup must never be preselected'
assert '{label:"До отримання",target:"booking-extras"}' in BUNDLE, 'date CTA must lead to step 3'
assert 'className:el&&eo?"is-complete":el&&ei?"is-current":"",onClick:()=>ed("booking-contact")' in BUNDLE, 'step 4 visual state must depend on fulfillment'
assert 'if(!ei)return void W("Оберіть спосіб отримання.")' in BUNDLE, 'submit must reject missing fulfillment'
assert 'disabled:J||"available"!==B||!D||!ei' in BUNDLE, 'desktop submit must be disabled before fulfillment'

HTML='''<!doctype html><html><body>
<form class="booking-form" data-vx-active-step="1">
  <nav class="booking-progress">
    <button type="button" class="is-complete"><span>1</span><b>Техніка</b></button>
    <button type="button" class="is-complete"><span>2</span><b>Дата</b></button>
    <button type="button" class="is-current"><span>3</span><b>Отримання</b></button>
    <button type="button"><span>4</span><b>Контакти</b></button>
  </nav>
  <section id="booking-products" class="booking-step"></section>
  <section id="booking-dates" class="booking-step"></section>
  <section id="booking-extras" class="booking-step"></section>
  <section id="booking-contact" class="booking-step"></section>
  <div class="booking-mobile-summary"><button type="button">До отримання →</button></div>
</form>
</body></html>'''

with sync_playwright() as p:
    options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    if Path('/usr/bin/chromium').exists(): options['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**options)
    page=browser.new_page(viewport={'width':390,'height':844})
    page.set_content(HTML,wait_until='domcontentloaded')
    page.add_script_tag(path=str(EXPERIENCE))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(120)

    active=lambda: page.locator('.booking-step.is-vx-active').get_attribute('id')
    assert active()=='booking-dates', f'expected step 2 active, got {active()}'

    # Direct tap on future step 4 must not skip step 3.
    page.locator('.booking-progress button').nth(3).click()
    page.wait_for_timeout(50)
    assert active()=='booking-dates', f'progress tap skipped step 3: {active()}'

    # Even a stale/mislabelled CTA cannot jump to contacts while step 3 is incomplete.
    cta=page.locator('.booking-mobile-summary button')
    cta.evaluate("e=>e.textContent='До контактів →'")
    cta.click()
    page.wait_for_timeout(50)
    assert active()=='booking-dates', f'stale CTA skipped step 3: {active()}'

    # Correct CTA from date opens step 3.
    cta.evaluate("e=>e.textContent='До отримання →'")
    cta.click()
    page.wait_for_timeout(50)
    assert active()=='booking-extras', f'date CTA did not open step 3: {active()}'

    # React marks step 3 complete only after explicit pickup/delivery selection.
    page.locator('.booking-progress button').nth(2).evaluate("e=>{e.classList.remove('is-current');e.classList.add('is-complete')}")
    cta.evaluate("e=>e.textContent='До контактів →'")
    cta.click()
    page.wait_for_timeout(50)
    assert active()=='booking-contact', f'completed step 3 did not open contacts: {active()}'

    browser.close()

print('Public booking step-order PASS: 1 → 2 → 3 → 4 enforced; no default pickup; future navigation locked.')
