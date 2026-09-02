#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import importlib.util, shutil
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('baseqa',ROOT/'scripts/pwa_visual_qa.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base);base.ROOT=ROOT
INITIAL=(ROOT/'admin/bronuvannia/index.html').read_text(encoding='utf-8').split('<body>',1)[1].split('<noscript>',1)[0]
CSS=['admin-v250.css','admin-glass-test.css','address-autocomplete.css','admin-native-v2.css','admin-native-v21.css']
JS=['vacleaner-core.js','admin-v250.js','admin-glass-test.js','address-autocomplete.js','admin-native-v2.js']
passed=0;failed=[]
def check(ok,label):
    global passed
    if ok: passed+=1;print('PASS',label)
    else: failed.append(label);print('FAIL',label)

def boot(browser,width=390,height=844):
    p=browser.new_page(viewport={'width':width,'height':height},is_mobile=True)
    p.set_default_timeout(7000)
    p.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
    p.evaluate("html=>{document.body.innerHTML=html;document.documentElement.classList.add('glass-test','native-test','native-v2','native-v21')}",INITIAL)
    p.evaluate(base.init_script(True,True))
    for f in CSS:p.add_style_tag(content=(ROOT/'assets'/f).read_text(encoding='utf-8'))
    for f in JS:p.add_script_tag(content=(ROOT/'assets'/f).read_text(encoding='utf-8'))
    p.wait_for_selector('.app');p.wait_for_timeout(240)
    if p.locator('.pwa-update-later').count():
        try:p.locator('.pwa-update-later').click();p.wait_for_timeout(20)
        except:pass
    return p

def open_view(p,v):
    direct=p.locator(f'.mobile-nav [data-mobile-view="{v}"]')
    if direct.count():direct.click()
    else:
        p.locator('.mobile-nav .more-nav').click();p.wait_for_selector('.mobile-more-menu');p.locator(f'[data-more-view="{v}"]').click()
    p.wait_for_timeout(150)

def no_overflow(p):
    return p.evaluate("""()=>{const d=document.documentElement,b=document.body,m=document.querySelector('.main');return d.scrollWidth<=innerWidth+1&&b.scrollWidth<=innerWidth+1&&(!m||m.scrollWidth<=m.clientWidth+1)}""")

def no_double_shell(p):
    return p.evaluate(r'''()=>{
      const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'};
      const ignore=e=>e.matches('.window-choice input[type=radio],.fulfillment-choice input[type=radio],.product-choice input[type=radio]');
      for(const e of document.querySelectorAll('input,select,textarea,button,summary')){
        if(!vis(e)||ignore(e)) continue;
        const s=getComputedStyle(e),r=e.getBoundingClientRect();
        const eb=['Top','Right','Bottom','Left'].reduce((n,x)=>n+parseFloat(s['border'+x+'Width']||0),0);
        if(eb<1) continue;
        let a=e.parentElement,depth=0;
        while(a&&a!==document.body&&depth++<3){
          if(vis(a)){
            const as=getComputedStyle(a),ar=a.getBoundingClientRect();
            const ab=['Top','Right','Bottom','Left'].reduce((n,x)=>n+parseFloat(as['border'+x+'Width']||0),0);
            const ratio=(ar.width*ar.height)/(r.width*r.height);
            if(ab>=1&&ratio<2.8&&parseFloat(as.borderRadius)>5) return false;
          }
          a=a.parentElement;
        }
      }
      return true;
    }''')

def control_checks(p,label):
    check(no_overflow(p),f'{label}: no overflow')
    check(no_double_shell(p),f'{label}: no double control shell')
    search=p.locator('.search input:visible')
    if search.count(): check(search.first.evaluate("e=>getComputedStyle(e).borderTopWidth==='0px'"),f'{label}: search single shell')
    choices=p.locator('input[type=checkbox]:visible,input[type=radio]:visible')
    if choices.count():
        check(choices.evaluate_all("els=>els.filter(e=>!e.closest('.window-choice,.fulfillment-choice,.product-choice')).every(e=>e.getBoundingClientRect().height<=22)"),f'{label}: checkbox/radio compact')

with sync_playwright() as pw:
    try:b=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    except PlaywrightError:
        exe=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
        if not exe:raise
        b=pw.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=exe)

    for width in (320,390,430):
        p=boot(b,width)
        try:
            for view in ('upcoming','bookings','calendar','equipment','clients','campaigns','finances','analytics','chemistry','settings'):
                if view!='upcoming':open_view(p,view)
                control_checks(p,f'{width}px {view}')
                check(p.locator('.mobile-nav button:visible').evaluate_all('els=>els.every(e=>e.getBoundingClientRect().height>=44)'),f'{width}px {view}: nav 44+')
        finally:p.close()

    # All Settings tabs.
    p=boot(b);open_view(p,'settings')
    tabs=p.locator('.settings-tab').evaluate_all('els=>els.map(e=>e.dataset.settingsTab)')
    for tab in tabs:
        p.locator(f'[data-settings-tab="{tab}"]').click();p.wait_for_timeout(80)
        control_checks(p,f'Settings {tab}')
    p.locator('[data-settings-tab="rental"]').click();p.wait_for_timeout(60);p.locator('.main').evaluate('e=>e.scrollTop=e.scrollHeight');p.wait_for_timeout(60)
    navtop=p.locator('.mobile-nav').evaluate('e=>e.getBoundingClientRect().top')
    vis_buttons=p.locator('.settings-actions .btn:visible,.settings-save-row .btn:visible').evaluate_all('els=>els.map(e=>e.getBoundingClientRect().bottom)')
    check(bool(vis_buttons) and max(vis_buttons)<navtop-6,'Settings: save actions clear bottom nav')
    p.close()

    # New booking form.
    p=boot(b);p.locator('#mobileNewBooking').click();p.wait_for_selector('.booking-form');p.wait_for_timeout(90);control_checks(p,'New booking');p.close()

    # Process, issue, finance, complete, extend.
    for action,formsel in [('process','.process-form'),('issue','.issue-form'),('finance','.finance-form'),('complete','.finance-form'),('extend','.extend-form')]:
        p=boot(b);open_view(p,'bookings');loc=p.locator(f'.booking-card [data-action="{action}"]').first
        if loc.count():
            loc.click();p.wait_for_selector(formsel);p.wait_for_timeout(100);control_checks(p,f'Flow {action}')
            if action in ('process','issue','finance','complete'):
                check(p.locator('input[type=checkbox]:visible').evaluate_all('els=>els.every(e=>e.getBoundingClientRect().height<=22)'),f'Flow {action}: no giant checkbox')
            if action in ('issue','finance','complete'):
                inner=p.locator('.issue-money-control input:visible,.packet-control input:visible')
                if inner.count():check(inner.evaluate_all("els=>els.every(e=>getComputedStyle(e).borderTopWidth==='0px')"),f'Flow {action}: composite input inner border removed')
        p.close()

    # Booking More action sheet.
    p=boot(b);open_view(p,'bookings');card=p.locator('.booking-card').filter(has=p.locator('.booking-action-more')).first
    if card.count():
        card.locator('.booking-action-more summary').click();p.wait_for_selector('.native-v2-action-sheet');p.wait_for_timeout(60)
        check(p.locator('.native-v2-action-sheet:visible').count()==1,'Booking More: sheet visible')
        check(p.locator('.native-v2-sheet-action:visible').count()>=1,'Booking More: real actions')
        check(p.locator('.native-v2-sheet-close:visible').count()==1,'Booking More: close action')
        control_checks(p,'Booking More')
    p.close()

    # Client + SMS.
    p=boot(b);open_view(p,'clients');p.locator('[data-client-open]').first.locator('.client-name').click();p.wait_for_selector('#clientEditor');p.wait_for_timeout(100);control_checks(p,'Client card');p.close()
    p=boot(b);open_view(p,'campaigns');p.locator('#smsCampaign').click();p.wait_for_selector('.sms-campaign-modal');p.wait_for_timeout(300);control_checks(p,'SMS modal');p.close()

    b.close()
print(f'NATIVE V2.1 QA: PASS {passed} · FAIL {len(failed)}')
if failed:
    for x in failed:print(' -',x)
    raise SystemExit(1)
