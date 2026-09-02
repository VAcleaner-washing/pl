#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import importlib.util, shutil, json, re
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('baseqa',ROOT/'scripts/pwa_visual_qa.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base);base.ROOT=ROOT
INITIAL=(ROOT/'admin/bronuvannia/index.html').read_text(encoding='utf-8').split('<body>',1)[1].split('<noscript>',1)[0]
CSS=['admin-v250.css','admin-glass-test.css','address-autocomplete.css','admin-native-v2.css','admin-native-v21.css','admin-native-v22.css','admin-native-v23.css','admin-native-v24.css','admin-native-v25.css']
JS=['vacleaner-core.js','admin-v250.js','admin-glass-test.js','address-autocomplete.js','admin-native-v2.js','admin-native-v22.js','admin-native-v23.js','admin-native-v24.js','admin-native-v25.js']
passed=0;failed=[]
def check(ok,label):
    global passed
    if ok: passed+=1;print('PASS',label)
    else: failed.append(label);print('FAIL',label)

def boot(browser,width=390,height=844,add_cancelled=False):
    p=browser.new_page(viewport={'width':width,'height':height},is_mobile=True)
    p.set_default_timeout(7000)
    p.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
    p.evaluate("html=>{document.body.innerHTML=html;document.documentElement.classList.add('glass-test','native-test','native-v2','native-v21','native-v22','native-v23','native-v24','native-v25')}",INITIAL)
    p.evaluate(base.init_script(True,True))
    if add_cancelled:
        p.evaluate("""()=>{const x=structuredClone(window.__bookings[0]);x.id='00000000-0000-4000-8000-000000009999';x.booking_code='VAC-PWA-CANCELLED';x.status='cancelled';x.customer_name='Тест Скасований';window.__bookings.push(x)}""")
    for f in CSS:p.add_style_tag(content=(ROOT/'assets'/f).read_text(encoding='utf-8'))
    for f in JS:p.add_script_tag(content=(ROOT/'assets'/f).read_text(encoding='utf-8'))
    p.wait_for_selector('.app');p.wait_for_timeout(280)
    if p.locator('.pwa-update-later').count():
        try:p.locator('.pwa-update-later').click();p.wait_for_timeout(20)
        except:pass
    return p

def open_view(p,v):
    direct=p.locator(f'.mobile-nav [data-mobile-view="{v}"]')
    if direct.count():direct.click()
    else:
        p.locator('.mobile-nav .more-nav').click();p.wait_for_selector('.mobile-more-menu');p.locator(f'[data-more-view="{v}"]').click()
    p.wait_for_timeout(180)

def no_overflow(p):
    return p.evaluate("""()=>{const d=document.documentElement,b=document.body,m=document.querySelector('.main');return d.scrollWidth<=innerWidth+1&&b.scrollWidth<=innerWidth+1&&(!m||m.scrollWidth<=m.clientWidth+1)}""")


def no_double_shell(p):
    return p.evaluate(r'''()=>{
      const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'};
      const ignore=e=>e.matches('.window-choice input[type=radio],.fulfillment-choice input[type=radio],.product-choice input[type=radio]');
      for(const e of document.querySelectorAll('input,select,textarea,button,summary')){
        if(!vis(e)||ignore(e)) continue;
        const es=getComputedStyle(e),r=e.getBoundingClientRect();
        const eb=['Top','Right','Bottom','Left'].reduce((n,x)=>n+parseFloat(es['border'+x+'Width']||0),0);
        if(eb<1) continue;
        let a=e.parentElement,depth=0;
        while(a&&a!==document.body&&depth++<3){
          if(vis(a)){const as=getComputedStyle(a),ar=a.getBoundingClientRect();const ab=['Top','Right','Bottom','Left'].reduce((n,x)=>n+parseFloat(as['border'+x+'Width']||0),0);const ratio=(ar.width*ar.height)/(r.width*r.height);if(ab>=1&&ratio<2.6&&parseFloat(as.borderRadius)>5)return false}
          a=a.parentElement;
        }
      }
      return true;
    }''' )

def visible_texts(locator):
    return [re.sub(r'\s+',' ',x.strip()) for x in locator.all_inner_texts() if x.strip()]

def detail_action_inventory(p):
    direct=visible_texts(p.locator('.detail-actions > button:visible'))
    more=p.locator('.detail-actions .booking-action-more > summary:visible')
    sheet=[]
    if more.count():
        more.click();p.wait_for_selector('.native-v2-action-sheet');p.wait_for_timeout(40)
        sheet=visible_texts(p.locator('.native-v2-action-sheet .native-v2-sheet-action:visible'))
        p.locator('.native-v2-sheet-close').click();p.wait_for_timeout(20)
    return direct,sheet

EXPECTED={
 'pending':({'Опрацювати заявку','Редагувати'},{'Скасувати'}),
 'waiting_payment':({'Опрацювати заявку','Редагувати'},{'Виправити статус','Скасувати'}),
 'confirmed':({'Видати техніку','Редагувати'},{'Виправити статус','Скасувати'}),
 'issued':({'Прийняти повернення','Розрахунок','Продовжити оренду'},{'Виправити статус','Скасувати'}),
 'completed':({'Переглянути розрахунок','Приведи друга','Виправити статус'},set()),
 'cancelled':({'Виправити статус'},set()),
}

with sync_playwright() as pw:
    try:b=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    except PlaywrightError:
        exe=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
        if not exe:raise
        b=pw.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=exe)

    # Every primary surface remains geometrically healthy on the three target widths.
    for width in (320,390,430):
        p=boot(b,width)
        try:
            for view in ('upcoming','bookings','calendar','equipment','clients','campaigns','finances','analytics','chemistry','settings'):
                if view!='upcoming':open_view(p,view)
                check(no_overflow(p),f'{width}px {view}: no overflow')
                check(no_double_shell(p),f'{width}px {view}: no double shell')
        finally:p.close()

    # Finance filter restored and interactive.
    p=boot(b);open_view(p,'finances')
    filt=p.locator('#expenseCategoryFilter:visible')
    check(filt.count()==1,'Finance: category filter visible')
    if filt.count():
        options=filt.locator('option').count();check(options>=5,'Finance: category filter keeps production options')
        values=filt.locator('option').evaluate_all('els=>els.map(e=>e.value).filter(Boolean)')
        if len(values)>1:
            filt.select_option(values[1]);p.wait_for_timeout(100)
            check(p.locator('#expenseCategoryFilter').input_value()==values[1],'Finance: category filter state survives rerender')
    p.close()

    # More keeps connection state in the profile metadata without a floating row.
    p=boot(b);p.locator('.mobile-nav .more-nav').click();p.wait_for_selector('.mobile-more-menu');p.wait_for_timeout(70)
    check(p.locator('.native-v23-connection:visible').count()==0,'More: floating connection row hidden')
    meta=p.locator('.native-profile-card span>small:visible');check(meta.count()==1 and 'Адміністратор' in meta.inner_text(),'More: profile metadata exposed')
    p.evaluate("Object.defineProperty(navigator,'onLine',{value:false,writable:true,configurable:true});window.dispatchEvent(new Event('offline'))");p.wait_for_timeout(40)
    check(p.locator('html.native-v24-offline').count()==1,'More: offline state updates')
    check(p.locator('.topbar .connection-state:visible').count()==0,'More: topbar remains uncluttered')
    p.close()

    # Compact completed booking keeps deposit truth + comment cue.
    p=boot(b);open_view(p,'bookings');p.locator('[data-filter="completed"]').click();p.wait_for_timeout(90)
    completed=p.locator('.booking-card.native-v22-compact').first
    check(completed.count()==1,'Completed: compact card exists')
    if completed.count():
        check(completed.locator('.booking-deposit-state:visible').count()==1,'Completed: deposit state retained')
        check(completed.locator('.booking-mobile-flags:visible').count()==1,'Completed: comment presence retained')
        check(completed.locator('.booking-note:visible').count()==0,'Completed: verbose comment remains compacted')
    p.close()

    # Booking actions + detail actions parity for every canonical status.
    p=boot(b,add_cancelled=True);open_view(p,'bookings')
    for status,(expected_direct,expected_sheet) in EXPECTED.items():
        p.locator(f'[data-filter="{status}"]').click();p.wait_for_timeout(90)
        card=p.locator('.booking-card').first if p.locator('.booking-card').count() else None
        check(card is not None,f'{status}: booking card present')
        if card is None:continue
        direct=set(visible_texts(card.locator('.booking-actions > button:visible')))
        more=card.locator('.booking-action-more > summary:visible');sheet=set()
        if more.count():
            more.click();p.wait_for_selector('.native-v2-action-sheet');p.wait_for_timeout(30)
            sheet=set(visible_texts(p.locator('.native-v2-action-sheet .native-v2-sheet-action:visible')))
            p.locator('.native-v2-sheet-close').click();p.wait_for_timeout(20)
        check(expected_direct.issubset(direct),f'{status}: list direct actions preserved')
        check(expected_sheet==sheet,f'{status}: list More actions preserved')
        card.evaluate('el=>el.click()');p.wait_for_selector('.detail');p.wait_for_timeout(100)
        d,s=detail_action_inventory(p);d=set(d);s=set(s)
        check(expected_direct.issubset(d),f'{status}: detail direct actions preserved')
        check(expected_sheet==s,f'{status}: detail More actions preserved')
        if status=='pending':
            audit=p.locator('.detail .audit-panel:visible');check(audit.count()==1,'Detail: audit disclosure restored')
            if audit.count():
                check(p.locator('#auditContent:visible').count()==0,'Detail: audit collapsed by default')
                p.locator('.audit-panel-head').click();p.wait_for_timeout(30)
                check(p.locator('#auditContent:visible').count()==1,'Detail: audit expands')
                check(p.locator('#auditReload:visible').count()==1,'Detail: audit reload remains available')
        p.locator('.detail .back').click();p.wait_for_timeout(80)
    p.close()


    # V2.5 screenshot-derived visual contracts.
    p=boot(b);open_view(p,'bookings')
    toolbar=p.locator('.booking-toolbar')
    check(toolbar.count()==1 and toolbar.evaluate("e=>getComputedStyle(e).position==='static'"),'V2.5: booking filters scroll with content, no card overlap')
    chips=p.locator('.booking-toolbar .chip:visible')
    check(all(x>=44 for x in chips.evaluate_all("els=>els.map(e=>e.getBoundingClientRect().height)")),'V2.5: booking filter targets 44px+')
    p.locator('[data-filter="completed"]').click();p.wait_for_timeout(60)
    compact=p.locator('.booking-card.native-v22-compact').first
    if compact.count():
        check(compact.locator('.booking-finance>em.neutral:visible').count()==0,'V2.5: zero final balance does not waste compact-card row')
    p.close()

    p=boot(b);open_view(p,'bookings');p.locator('[data-filter="confirmed"]').click();p.wait_for_timeout(60);p.locator('.booking-card').first.evaluate('e=>e.click()');p.wait_for_selector('.detail');p.locator('.audit-panel-head').click();p.wait_for_timeout(40)
    entry=p.locator('#auditContent .audit-entry:visible').first
    if entry.count():
        check(entry.evaluate("e=>getComputedStyle(e).borderRadius==='0px'"),'V2.5: audit history rows are flat')
    reload=p.locator('#auditReload:visible')
    if reload.count():check(reload.evaluate("e=>e.getBoundingClientRect().height>=44"),'V2.5: audit reload 44px touch target')
    p.locator('.native-detail-actions').scroll_into_view_if_needed();more=p.locator('.detail-actions .booking-action-more summary')
    if more.count():
        more.click();p.wait_for_selector('.native-v2-action-sheet');
        actions=p.locator('.native-v2-sheet-action:visible')
        check(actions.count()>=1 and all(x>=50 for x in actions.evaluate_all("els=>els.map(e=>e.getBoundingClientRect().height)")),'V2.5: action sheet uses full-height list rows')
    p.close()

    p=boot(b);p.locator('.mobile-nav .more-nav').click();p.wait_for_selector('.mobile-more-menu');p.wait_for_timeout(50)
    check(p.locator('.native-v23-connection:visible').count()==0,'V2.5: standalone connection row removed')
    meta=p.locator('.native-profile-card span>small:visible')
    check(meta.count()==1 and 'Адміністратор' in meta.inner_text(),'V2.5: profile metadata retained')
    p.close()

    for action,formsel in [('issue','.issue-form'),('finance','.finance-form')]:
        p=boot(b);open_view(p,'bookings');loc=p.locator(f'.booking-card [data-action="{action}"]').first
        if loc.count():
            loc.click();p.wait_for_selector(formsel);p.wait_for_timeout(60)
            head=p.locator(f'{formsel} .issue-booking-head').first
            check(head.count()==1 and head.evaluate("e=>parseFloat(getComputedStyle(e).borderTopWidth)<=1"),f'V2.5: {action} context has one thin shell')
        p.close()

    p=boot(b);open_view(p,'campaigns')
    sm=p.locator('.campaign-metrics small:visible')
    if sm.count():check(min(sm.evaluate_all("els=>els.map(e=>parseFloat(getComputedStyle(e).fontSize))"))>=10,'V2.5: campaign metric labels readable')
    p.close()

    p=boot(b);open_view(p,'calendar')
    labels=p.locator('.day-labels>span:visible')
    if labels.count():check(min(labels.evaluate_all("els=>els.map(e=>parseFloat(getComputedStyle(e).fontSize))"))>=10.5,'V2.5: calendar column labels readable')
    p.close()
    # V2.5 user-reported regressions: clipping, upcoming rail, More profile and process documents.
    for width in (320,390,430):
        p=boot(b,width);open_view(p,'analytics')
        period=p.locator('.analytics-periods .chip:visible, .admin-periods .chip:visible')
        check(all(x['left']>=-1 and x['right']<=width+1 for x in period.evaluate_all("els=>els.map(e=>{let r=e.getBoundingClientRect();return {left:r.left,right:r.right}})")),f'V2.5 {width}px: analytics periods fully inside viewport')
        open_view(p,'finances');period=p.locator('.analytics-periods .chip:visible, .admin-periods .chip:visible')
        check(all(x['left']>=-1 and x['right']<=width+1 for x in period.evaluate_all("els=>els.map(e=>{let r=e.getBoundingClientRect();return {left:r.left,right:r.right}})")),f'V2.5 {width}px: finance periods fully inside viewport')
        open_view(p,'clients');sels=p.locator('.clients-toolbar select:visible')
        check(all(x['left']>=-1 and x['right']<=width+1 for x in sels.evaluate_all("els=>els.map(e=>{let r=e.getBoundingClientRect();return {left:r.left,right:r.right}})")),f'V2.5 {width}px: clients segment/sort controls fully visible')
        open_view(p,'upcoming')
        check(p.locator('.upcoming-row .upcoming-time i:visible').count()>0 and p.locator('.upcoming-row .schedule-badge:visible').count()>0,f'V2.5 {width}px: upcoming restores arrow + relative day badge')
        p.close()

    p=boot(b);open_view(p,'settings');
    if p.locator('[data-settings-tab="delivery"]').count():p.locator('[data-settings-tab="delivery"]').click();p.wait_for_timeout(80)
    fuel=p.locator('.settings-fuel-grid')
    if fuel.count():
        one_shell=fuel.evaluate("""el=>[...el.querySelectorAll('label')].every(l=>{let d=l.querySelector(':scope>div'),i=l.querySelector('input');if(!d||!i)return true;return parseFloat(getComputedStyle(d).borderTopWidth)>0&&parseFloat(getComputedStyle(i).borderTopWidth)===0})""")
        check(one_shell,'V2.5: fuel numeric controls have one visible shell')
    tabs=p.locator('.settings-tabs .settings-tab:visible')
    check(tabs.count()==5,'V2.5: all five settings tabs visible without clipped rail')
    p.locator('.mobile-nav .more-nav').click();p.wait_for_timeout(40)
    check(p.locator('.native-profile-card.native-v25-profile-static').count()==1,'V2.5: More profile is informational, not Settings shortcut')
    p.close()

    p=boot(b);open_view(p,'bookings');proc=p.locator('.booking-card [data-action="process"]').first
    if proc.count():
        proc.click();p.wait_for_selector('.process-form');p.wait_for_timeout(80)
        check(p.locator('[data-v25-document-file]').count()==1,'V2.5: process exposes document photo upload')
        check(p.locator('[data-v25-document-view]').count()==1,'V2.5: process exposes document photo viewer')
    p.close()

    p=boot(b);open_view(p,'campaigns');camp=p.locator('[data-campaign-sms]').first
    if camp.count():
        camp.click();p.wait_for_selector('.sms-campaign-modal');p.wait_for_timeout(120)
        title=p.locator('.sms-heading h2').inner_text();check('RETURN' in title,'V2.5: RETURN campaign title remains readable')
        geom=p.locator('.sms-campaign-modal').evaluate("el=>{let h=el.querySelector('.sms-workspace-header').getBoundingClientRect(),b=el.querySelector('.sms-workspace-body').getBoundingClientRect();return {hb:h.bottom,bt:b.top,sw:el.scrollWidth,cw:el.clientWidth}}")
        check(geom['bt']>=geom['hb']-1 and geom['sw']<=geom['cw']+1,'V2.5: RETURN SMS header/body do not overlap or overflow')
    p.close()

    b.close()

# Static PWA isolation/deep-link contracts.
manifest=json.loads((ROOT/'admin/manifest-native-v25.webmanifest').read_text())
check(manifest['name']=='VAcleaner Native V2.5 Final Polish RC','Manifest: V2.5 name')
check(manifest['start_url']=='/admin/bronuvannia-native-v25/' and manifest['scope']=='/admin/bronuvannia-native-v25/','Manifest: V2.5 route/scope')
sw=(ROOT/'admin/sw-native-v25.js').read_text()
check("const FALLBACK=ROUTE" in sw,'SW: offline fallback stays on V2.5')
check("/^\\/admin\\/bronuvannia\\/?$/" in sw and "target.pathname=ROUTE" in sw,'SW: production deep links rewrite to V2.5')
route=(ROOT/'admin/bronuvannia-native-v25/index.html').read_text()
check('/assets/admin-native-v25.css?v=4247' in route and '/assets/admin-native-v25.js?v=4247' in route,'Route: V2.5 assets loaded')
v25js=(ROOT/'assets/admin-native-v25.js').read_text()
check("const ROUTE='/admin/bronuvannia-native-v25/'" in v25js and 'data:{url:ROUTE}' in v25js and '__nativeV25=true' in v25js,'Local notifications: V2.5 route wins over inherited V2.3 patch')

print(f'NATIVE V2.5 QA: PASS {passed} · FAIL {len(failed)}')
if failed:
    for x in failed:print(' -',x)
    raise SystemExit(1)
