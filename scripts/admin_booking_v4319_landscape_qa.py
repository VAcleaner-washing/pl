#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

import pwa_visual_qa as pwa

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)
FAIL=[]
RESULTS=[]
DIAG={}


def check(cond,label):
    ok=bool(cond)
    print(('PASS' if ok else 'FAIL')+': '+label)
    RESULTS.append({'label':label,'ok':ok})
    if not ok: FAIL.append(label)


def add_production_layers(page):
    for name in (
        'admin-v430.css','admin-v436.css','admin-v437.css','admin-v438.css',
        'admin-v4310.css','admin-v4311.css','admin-v4315.css','admin-v4319.css'
    ):
        page.add_style_tag(content=(ROOT/'assets'/name).read_text(encoding='utf-8'))
    page.evaluate("document.documentElement.classList.add('native-test','native-v2','native-v21','native-v22','native-v23','native-v24','native-v25','native-v26','native-v27','native-v28','v43-prod','v4315','v4316','v4319')")
    page.wait_for_timeout(60)


def open_detail(page):
    if page.locator('.pwa-update-later').count():
        try: page.locator('.pwa-update-later').click(timeout=800)
        except Exception: pass
    card=page.locator('.booking-card').first
    check(card.count()==1,'932x430: bookings fixture is visible')
    card.locator('.booking-row-head').click()
    page.wait_for_selector('.detail')
    page.wait_for_timeout(80)


with sync_playwright() as pw:
    opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**opts)
    try:
        page=pwa.render_page(browser,932,430,authenticated=True,standalone=True)
        try:
            page.evaluate("document.documentElement.style.setProperty('--pwa-safe-left','0px');document.documentElement.style.setProperty('--pwa-safe-right','0px');document.documentElement.style.setProperty('--pwa-safe-bottom','21px')")
            add_production_layers(page)
            query='(min-width:901px) and (max-width:1024px) and (max-height:500px) and (orientation:landscape)'
            media_active=page.evaluate("q=>matchMedia(q).matches",query)
            DIAG['media_active']=media_active
            check(media_active,'932x430: dedicated phone-landscape media query is active')
            open_detail(page)

            metrics=page.locator('.detail').evaluate("""el=>{
              const shell=el.querySelector('.detail-shell'),hero=el.querySelector('.detail-hero'),grid=el.querySelector('.detail-grid'),top=el.querySelector('.detail-top');
              const r=x=>x?x.getBoundingClientRect():null;
              return {
                clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,
                overflowX:getComputedStyle(el).overflowX,overflowY:getComputedStyle(el).overflowY,
                shell:r(shell),hero:r(hero),grid:r(grid),top:r(top),heroImages:el.querySelector('.hero-images')?getComputedStyle(el.querySelector('.hero-images')).display:null,
                gridColumns:grid?getComputedStyle(grid).gridTemplateColumns:'',gridMinHeight:grid?getComputedStyle(grid).minHeight:''
              }
            }""")
            DIAG['detail_metrics']=metrics
            check(metrics['scrollWidth']<=metrics['clientWidth']+1 and metrics['overflowX']=='hidden','932x430: booking detail has no horizontal overflow')
            check(metrics['overflowY'] in ('auto','scroll') and metrics['scrollHeight']>metrics['clientHeight']+20,'932x430: booking detail owns a real vertical scroll')
            check(metrics['shell'] is not None and metrics['shell']['x']>=-1 and metrics['shell']['x']+metrics['shell']['width']<=932+1,'932x430: detail shell stays inside the landscape viewport')
            check(metrics['hero'] is not None and metrics['hero']['height']<190,'932x430: hero cannot consume a giant landscape viewport')
            check(metrics['heroImages']=='none','932x430: desktop hero photography cannot create a black dead zone')
            check(metrics['grid'] is not None and metrics['grid']['y']<430 and metrics['gridMinHeight']=='0px','932x430: useful booking content starts in the first viewport without stretched minimum height')

            first_panel=page.locator('.detail .detail-client-link').first
            first_panel_box=first_panel.bounding_box() if first_panel.count() else None
            DIAG['first_panel_count']=first_panel.count()
            DIAG['first_panel_box']=first_panel_box
            check(first_panel.count()==1 and first_panel_box is not None and first_panel_box['y']<430,'932x430: first booking panel is visible before the first viewport ends')

            page.locator('.detail').evaluate("el=>el.scrollTop=el.scrollHeight")
            page.wait_for_timeout(80)
            actions=page.locator('.detail-actions')
            box=actions.bounding_box() if actions.count() else None
            heights=actions.locator('.btn,summary').evaluate_all("""els=>els.flatMap(el=>{
              const style=getComputedStyle(el),rect=el.getBoundingClientRect();
              const visible=style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0&&el.getClientRects().length>0;
              return visible?[rect.height]:[];
            })""") if actions.count() else []
            DIAG['actions_count']=actions.count()
            DIAG['actions_box']=box
            DIAG['action_heights']=heights
            DIAG['detail_scroll_after']=page.locator('.detail').evaluate("el=>({scrollTop:el.scrollTop,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight})")
            check(box is not None and box['x']>=-1 and box['x']+box['width']<=932+1 and box['y']<430 and box['y']+box['height']<=430+1,'932x430: detail actions are reachable inside the viewport after scroll')
            check(bool(heights) and min(heights)>=44,'932x430: visible detail actions keep 44px touch targets')
            doc_ok=pwa.no_overflow(page)
            DIAG['document_no_overflow']=doc_ok
            DIAG['document_widths']=page.evaluate("()=>({innerWidth:innerWidth,docClientWidth:document.documentElement.clientWidth,docScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body?document.body.scrollWidth:null})")
            check(doc_ok,'932x430: document shell remains horizontally contained')
            page.screenshot(path=str(OUT/'mobile-932x430-booking-detail-v4319.png'),full_page=False)
        finally:
            page.close()

        control=pwa.render_page(browser,1024,768,authenticated=True,standalone=False)
        try:
            add_production_layers(control)
            query='(min-width:901px) and (max-width:1024px) and (max-height:500px) and (orientation:landscape)'
            control_active=control.evaluate("q=>matchMedia(q).matches",query)
            DIAG['control_1024x768_media_active']=control_active
            check(not control_active,'1024x768: tablet/desktop geometry is outside the phone-landscape bridge')
        finally:
            control.close()
    finally:
        browser.close()

DIAG['results']=RESULTS
DIAG['failures']=FAIL
DIAG['total']=len(RESULTS)
DIAG['passed']=len(RESULTS)-len(FAIL)
DIAG['failed']=len(FAIL)
(OUT/'admin-booking-v4319-landscape-result.json').write_text(json.dumps(DIAG,ensure_ascii=False,indent=2),encoding='utf-8')
print(f"TOTAL {len(RESULTS)} · PASS {len(RESULTS)-len(FAIL)} · FAIL {len(FAIL)}")
if FAIL: raise SystemExit(1)
