#!/usr/bin/env python3
from __future__ import annotations
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BOOKING_API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5'
SETTINGS_API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-settings'

HTML='''<!doctype html><html><body>
<form class="booking-form">
<nav class="booking-progress"><button type="button">1</button><button type="button">2</button><button type="button">3</button><button type="button">4</button></nav>
<section id="booking-products" class="booking-step"><div class="booking-products"><button type="button" class="is-selected">Kärcher Puzzi</button></div></section>
<section id="booking-dates" class="booking-step"><div class="booking-date-grid">
<label>Отримання<input type="date" min="2026-08-07" max="2027-01-01" value="2026-08-07"></label>
<label>Вікно видачі<select><option value="morning">Ранок · 08:00–10:00</option><option value="evening" selected>Вечір · 17:30–20:00</option></select></label>
<label>Повернення<input type="date" min="2026-08-07" max="2027-01-01" value="2026-08-08"></label>
<label>Вікно повернення<select><option value="morning">Ранок · 08:00–10:00</option><option value="evening" selected>Вечір · 17:30–20:00</option></select></label>
</div><div class="availability-card idle"><strong>Перевірка</strong><span>...</span></div></section>
<section id="booking-extras" class="booking-step"></section><section id="booking-contact" class="booking-step"><label>Телефон<input type="tel"></label><label class="booking-consent"><input type="checkbox" required><span>Погоджуюсь з умовами</span></label></section>
<div class="booking-summary"><div class="booking-summary-total"><span>Разом</span><strong>700 грн</strong></div><p></p></div>
<div class="booking-mobile-summary"><div></div></div>
<div class="booking-conditions"><ul><li></li><li></li><li></li></ul></div>
</form></body></html>'''

def route_handler(route):
    url=route.request.url
    if url.startswith(SETTINGS_API):
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'slots':{'morningStart':'08:00','morningEnd':'10:00','eveningStart':'17:30','eveningEnd':'20:00'},'depositRules':{'oneUnit':{'day':1000,'weekend':2000}}}))
        return
    if url.startswith(BOOKING_API):
        try: body=route.request.post_data_json or {}
        except Exception: body={}
        action=body.get('action')
        if action=='loyalty_lookup':
            route.fulfill(status=200,content_type='application/json',body=json.dumps({'loyalty':{'level':'Start','percent':0,'completedOrders':0}})); return
        if body.get('productCode')=='sc2':
            route.fulfill(status=200,content_type='application/json',body=json.dumps({'available':True,'remaining':{'sc2':1},'estimate':{'totalAmount':500,'depositAmount':1000,'rentalDays':1}})); return
        payload={'available':False,'remaining':{'puzzi':0},'nextAvailable':{'startDate':'2026-08-08','pickupWindow':'morning','returnDate':'2026-08-09','returnWindow':'morning'},'estimate':{'totalAmount':700,'depositAmount':1000}}
        route.fulfill(status=409 if action=='create' else 200,content_type='application/json',body=json.dumps({'error':'not_available',**payload})); return
    route.continue_()

def main():
    with sync_playwright() as p:
        options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
        executable=os.environ.get('CHROMIUM_PATH')
        if executable: options['executable_path']=executable
        elif Path('/usr/bin/chromium').exists(): options['executable_path']='/usr/bin/chromium'
        browser=p.chromium.launch(**options)
        consent_page=browser.new_page(viewport={'width':390,'height':844})
        consent_page.route('**/*',route_handler)
        consent_page.set_content(HTML,wait_until='domcontentloaded')
        consent_page.add_script_tag(path=str(ROOT/'assets/vacleaner-core.js'))
        consent_page.add_script_tag(path=str(ROOT/'assets/public-booking-slots.js'))
        consent_page.add_script_tag(path=str(ROOT/'assets/public-experience.js'))
        consent_page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
        consent_page.wait_for_timeout(120)
        assert consent_page.locator('.vx-marketing-consent').count()==1, 'Optional marketing consent was not injected'
        assert consent_page.locator('.vx-marketing-consent input').is_checked() is False, 'Marketing consent must default to unchecked'
        assert 'Отримувати персональні пропозиції та бонуси VAcleaner' in consent_page.locator('.vx-marketing-consent').inner_text()
        consent_page.close()
        page=browser.new_page(viewport={'width':390,'height':844})
        errors=[]
        page.on('pageerror',lambda exc: errors.append(str(exc)))
        page.route('**/*',route_handler)
        page.set_content(HTML,wait_until='domcontentloaded')
        page.evaluate("""window.__mutationCount=0;window.__cardChildMutations=0;window.__qaObserver=new MutationObserver(list=>window.__mutationCount+=list.length);window.__qaObserver.observe(document.body,{childList:true,subtree:true,attributes:true,characterData:true});window.__cardObserver=new MutationObserver(list=>window.__cardChildMutations+=list.filter(m=>m.type==='childList'||m.type==='characterData').length);window.__cardObserver.observe(document.querySelector('.availability-card'),{childList:true,subtree:true,characterData:true});""")
        page.add_script_tag(path=str(ROOT/'assets/vacleaner-core.js'))
        page.add_script_tag(path=str(ROOT/'assets/public-booking-slots.js'))
        page.add_script_tag(path=str(ROOT/'assets/public-experience.js'))
        page.wait_for_timeout(450)
        first=page.evaluate('window.__mutationCount')
        page.wait_for_timeout(700)
        second=page.evaluate('window.__mutationCount')
        delta=second-first
        assert delta <= 5, f'Mutation storm detected after settle: {first} -> {second} (delta {delta})'
        before=page.url
        result=page.evaluate("""async()=>{const r=await fetch('https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',productCode:'puzzi',startDate:'2026-08-07',returnDate:'2026-08-08',pickupWindow:'evening',returnWindow:'evening'})});let d={};try{d=await r.clone().json()}catch{};return {status:r.status,data:d}}""")
        page.wait_for_timeout(260)
        card_text=page.locator('.availability-card').inner_text()
        panel_text=page.locator('.vx-nearest-availability-panel').inner_text()
        assert result['status']==409, result
        assert card_text=='Перевірка...', f'React-owned availability card was rewritten: {card_text!r}'
        assert page.evaluate('window.__cardChildMutations')==0, f"Nearest UX mutated React-owned availability card: {page.evaluate('window.__cardChildMutations')} mutations"
        assert 'На цей час техніка зайнята' in panel_text, panel_text
        assert '8 серпня' in panel_text, panel_text
        assert page.locator('.vx-use-nearest').count()==1
        # Repeated unavailable responses must update one external panel, never duplicate it.
        page.evaluate("""async()=>{await fetch('https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'availability',productCode:'puzzi',startDate:'2026-08-07',returnDate:'2026-08-08',pickupWindow:'evening',returnWindow:'evening'})})}""")
        page.wait_for_timeout(120)
        assert page.locator('.vx-nearest-availability-panel').count()==1
        assert page.evaluate('window.__cardChildMutations')==0
        # An available response removes only our external suggestion.
        page.evaluate("""async()=>{await fetch('https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'availability',productCode:'sc2',startDate:'2026-08-08',returnDate:'2026-08-09',pickupWindow:'morning',returnWindow:'morning'})})}""")
        page.wait_for_timeout(120)
        assert page.locator('.vx-nearest-availability-panel').count()==0
        assert page.evaluate('window.__cardChildMutations')==0
        assert page.url==before, f'Unavailable flow navigated away: {before} -> {page.url}'
        assert not errors, f'Page errors: {errors}'
        print(f'Public booking resilience PASS: mutation plateau {first}->{second}; nearest suggestion never mutates React-owned availability card; unavailable 409 stays on page.')
        browser.close()

if __name__=='__main__': main()
