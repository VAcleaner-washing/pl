"""Exercise the LAB artifact itself, with no API routes, sessions or fake server responses."""
import argparse
import json
import os
import socket
import threading
import time
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
import e2e_smoke as smoke
from admin_idle_qa import navigate as navigate_without_diagnostics
from admin_entrypoint_finance_qa import PagesHandler


def host_diagnostics():
    result={}
    for name,path in {
        'memoryCurrent':'/sys/fs/cgroup/memory.current',
        'memoryPeak':'/sys/fs/cgroup/memory.peak',
        'memoryEvents':'/sys/fs/cgroup/memory.events',
        'processStatus':'/proc/self/status',
    }.items():
        try:result[name]=Path(path).read_text()
        except OSError as error:result[name]={'error':str(error)}
    return result


def capture_lab_failure(page,view,error):
    evidence=getattr(page,'_vac_lab_diagnostics',None)
    if not evidence or evidence.get('captured'):return
    evidence['captured']=True
    checks,width=evidence['checks'],evidence['width']
    checks.artifacts.mkdir(parents=True,exist_ok=True)
    result={'width':width,'view':view,'error':str(error),'capturedAt':time.time(),
            'events':list(evidence['events']),'host':host_diagnostics(),
            'pageClosed':page.is_closed()}
    # A failure may be a stalled renderer. Bound DOM polling and screenshot
    # collection independently, and never replace or retry the original error.
    try:
        handle=page.wait_for_function('''()=>{
          const describe=node=>{if(!node)return null;const style=getComputedStyle(node),rect=node.getBoundingClientRect();return {
            tag:node.tagName,id:node.id,classes:node.className,rect:rect.toJSON(),
            connected:node.isConnected,disabled:node.disabled,inert:node.inert,
            display:style.display,visibility:style.visibility,pointerEvents:style.pointerEvents,
            opacity:style.opacity,transform:style.transform,animationName:style.animationName,
            inertAncestor:node.closest('[inert]')?.outerHTML.slice(0,800),
            hiddenAncestor:node.closest('[hidden]')?.outerHTML.slice(0,800),
            hit:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.outerHTML.slice(0,800)};};
          return {readyState:document.readyState,visibility:document.visibilityState,focus:document.hasFocus(),
            adminView:document.documentElement.dataset.adminView,
            activeElement:document.activeElement?.outerHTML.slice(0,1600),
            htmlClasses:document.documentElement.className,bodyClasses:document.body.className,
            viewport:{width:innerWidth,height:innerHeight,visualWidth:visualViewport?.width,visualHeight:visualViewport?.height},
            navigation:[...document.querySelectorAll('.nav [data-view],.mobile-nav [data-mobile-view]')].map(describe),
            layers:document.querySelector('#layer')?.innerHTML.slice(0,12000),
            animations:document.getAnimations().map(animation=>({state:animation.playState,time:animation.currentTime,
              target:animation.effect?.target?.outerHTML.slice(0,800),timing:animation.effect?.getComputedTiming()})),
            resources:{count:performance.getEntriesByType('resource').length,
              last:performance.getEntriesByType('resource').slice(-12).map(entry=>({name:entry.name,type:entry.initiatorType,duration:entry.duration,bytes:entry.transferSize}))}};
        }''',timeout=3000,polling=100)
        result['dom']=handle.json_value()
        handle.dispose()
    except Exception as diagnostic_error:result['domError']=str(diagnostic_error)
    try:page.screenshot(path=str(checks.artifacts/f'{width}-navigation-failure.png'),timeout=3000)
    except Exception as diagnostic_error:result['screenshotError']=str(diagnostic_error)
    (checks.artifacts/f'{width}-navigation-failure.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')


def navigate(page,view):
    try:return navigate_without_diagnostics(page,view)
    except Exception as error:
        try:capture_lab_failure(page,view,error)
        except Exception as diagnostic_error:print('LAB_NAV_DIAGNOSTICS_FAILED',str(diagnostic_error),flush=True)
        raise


@contextmanager
def lab_width_diagnostics(context,checks,width,browser_events):
    context.tracing.start(screenshots=True,snapshots=True,sources=True)
    page=context.new_page()
    events=[]
    evidence={'width':width,'checks':checks,'events':events,'captured':False}
    page._vac_lab_diagnostics=evidence
    page.on('crash',lambda:events.append({'type':'page-crash','time':time.time()}))
    page.on('close',lambda:events.append({'type':'page-close','time':time.time(),'cleanup':evidence.get('cleanup',False)}))
    failed=False
    try:yield page
    except Exception as error:
        failed=True
        try:capture_lab_failure(page,'width-session',error)
        except Exception as diagnostic_error:print('LAB_WIDTH_DIAGNOSTICS_FAILED',str(diagnostic_error),flush=True)
        raise
    finally:
        checks.artifacts.mkdir(parents=True,exist_ok=True)
        cleanup_errors=[]
        try:context.tracing.stop(path=str(checks.artifacts/f'{width}-trace.zip'))
        except Exception as diagnostic_error:
            cleanup_errors.append(str(diagnostic_error))
            events.append({'type':'trace-save-error','error':str(diagnostic_error)})
        evidence['cleanup']=True
        try:context.close()
        except Exception as diagnostic_error:
            cleanup_errors.append(str(diagnostic_error))
            events.append({'type':'context-close-error','error':str(diagnostic_error)})
        (checks.artifacts/f'{width}-session-events.json').write_text(json.dumps({
            'width':width,'events':events,'browserEvents':browser_events,'host':host_diagnostics(),
        },ensure_ascii=False,indent=2)+'\n')
        if cleanup_errors and not failed:raise RuntimeError('LAB diagnostics cleanup failed: '+'; '.join(cleanup_errors))


@contextmanager
def lab_server(root):
    faults={'disconnect':False}
    class Handler(PagesHandler):
        def do_GET(self):
            if faults['disconnect']:
                self.connection.shutdown(socket.SHUT_RDWR)
                self.connection.close()
                return
            super().do_GET()
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:yield f'http://127.0.0.1:{server.server_port}',faults
    finally:server.shutdown();server.server_close();thread.join(timeout=5)


def exercise_time_picker(page,form,checks,width):
    pickup=form.locator('[name="pickupTime"]')
    trigger=pickup.locator('..').locator('.admin-v4315-time-trigger')
    overlay=page.locator('.admin-v4315-time-overlay')
    page.evaluate('document.documentElement.style.setProperty("--pwa-safe-bottom","34px")')
    initial=pickup.input_value();trigger.click()
    expect(overlay.locator('.lab-time-periods')).to_be_visible()
    seen=[]
    for period,start,end in [('morning',420,690),('day',720,990),('evening',1020,1260)]:
        overlay.locator(f'[data-time-period="{period}"]').click()
        options=overlay.locator('.admin-v4315-time-option:not([hidden])')
        expected=[f'{m//60:02d}:{m%60:02d}' for m in range(start,end+1,30)]
        expect(options).to_have_count(len(expected))
        values=options.evaluate_all('buttons=>buttons.map(button=>button.dataset.time)');seen+=values
        checks.check(values==expected and pickup.input_value()==initial,f'{width}: {period} exposes original choices without changing the form')
        geometry=overlay.locator('.admin-v4315-time-scroll').evaluate('''scroll=>({
            scroll:scroll.scrollHeight,client:scroll.clientHeight,viewport:innerHeight,
            choices:[...scroll.querySelectorAll('button:not([hidden])')].map(button=>button.getBoundingClientRect().toJSON())
        })''')
        checks.check(geometry['scroll']<=geometry['client']+1 and all(r['height']>=44 and r['bottom']<=geometry['viewport']-34+1 for r in geometry['choices']),f'{width}: {period} fits without clipped choices above simulated home area')
        checks.screenshot(page,f'{width}-time-{period}.png')
    checks.check(len(seen)==len(set(seen))==29 and seen[0]=='07:00' and seen[-1]=='21:00',f'{width}: all 29 original time choices remain reachable')
    close=overlay.locator('.admin-v4315-time-close');close.focus();page.keyboard.press('Shift+Tab')
    expect(overlay.locator('.admin-v4315-time-option:not([hidden])').last).to_be_focused()
    page.keyboard.press('Tab');expect(close).to_be_focused()
    checks.check(True,f'{width}: time picker contains keyboard focus above the parent modal')
    overlay.locator('[data-time-period="day"]').click();overlay.locator('[data-time="16:30"]').click()
    expect(overlay).not_to_be_visible();expect(pickup).to_have_value('16:30');expect(trigger).to_contain_text('16:30')
    trigger.click();expect(overlay.locator('[data-time-period="day"]')).to_have_attribute('aria-pressed','true')
    expect(overlay.locator('[data-time="16:30"]')).to_be_visible()
    page.keyboard.press('Escape');expect(overlay).not_to_be_visible();expect(form).to_be_visible();expect(trigger).to_be_focused()
    expect(page.locator('#labLeaveDialog')).not_to_be_attached()
    checks.check(True,f'{width}: chosen time reopens in its group; Escape closes only the picker')
    pickup.evaluate("input=>{input.value='06:45';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}")
    trigger.click();expect(overlay.locator('.admin-v4315-current-off-grid')).to_be_visible()
    close.click();expect(overlay).not_to_be_visible();expect(pickup).to_have_value('06:45')
    checks.check(True,f'{width}: closing the picker preserves an existing off-grid time')
    trigger.click();overlay.locator('[data-time="10:30"]').click();expect(pickup).to_have_value('10:30')
    trigger.click();expect(overlay.locator('.admin-v4315-current-off-grid')).not_to_be_attached()
    expect(overlay.locator('.lab-time-periods')).to_have_count(1);close.click()
    if width==440:
        page.set_viewport_size({'width':440,'height':360});trigger.click()
        expect(overlay.locator('.admin-v4315-time-option:not([hidden])')).to_have_count(10)
        last=overlay.locator('.admin-v4315-time-option:not([hidden])').last;last.scroll_into_view_if_needed()
        bounds=last.bounding_box();heading=overlay.locator('.admin-v4315-time-sheet-head').bounding_box()
        (checks.artifacts/'short-time-geometry.json').write_text(json.dumps({'last':bounds,'heading':heading,'viewport':page.evaluate('({innerHeight,visualHeight:visualViewport.height})')},indent=2)+'\n')
        checks.screenshot(page,'short-time-picker.png')
        checks.check(bounds['y']+bounds['height']<=360-34+1 and heading['y']>=48,f'{width}: short viewport scroll reaches the last choice and keeps the sheet header visible')
        close.click();page.set_viewport_size({'width':440,'height':956})
    returned=form.locator('[name="returnTime"]');returned.locator('..').locator('.admin-v4315-time-trigger').click()
    expect(overlay.locator('.admin-v4315-time-sheet-head strong')).to_have_text('Час повернення')
    overlay.locator('[data-time-period="evening"]').click();overlay.locator('[data-time="21:00"]').click()
    expect(returned).to_have_value('21:00');expect(pickup).to_have_value('10:30')
    checks.check(True,f'{width}: pickup and final return choices update their own canonical inputs')
    page.evaluate('document.documentElement.style.removeProperty("--pwa-safe-bottom")')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--artifacts',default='lab-test-results/browser')
    parser.add_argument('--iphone-only',action='store_true',help='Target the installed iPhone 17 Pro Max PWA simulation')
    args=parser.parse_args()
    checks=smoke.Checks(Path(args.artifacts).resolve());density=[]
    root=smoke.PROJECT_ROOT/'lab-test-results/dist'
    cache_name='vacleaner-lab-'+str(json.loads((root/'release.json').read_text())['build'])
    with lab_server(root) as (base,transport),sync_playwright() as pw:
        options={'headless':True}
        if args.browser=='chromium':options['args']=['--no-sandbox']
        if exe:=os.environ.get('PLAYWRIGHT_'+args.browser.upper()+'_EXECUTABLE'):options['executable_path']=exe
        browser=getattr(pw,args.browser).launch(**options)
        browser_events=[]
        browser.on('disconnected',lambda:browser_events.append({'type':'browser-disconnected','time':time.time()}))
        def context_for(width,workers='block'):
            if width==440:
                device={k:v for k,v in pw.devices['iPhone 17 Pro Max'].items() if k!='default_browser_type'}
                # Standalone PWA has no Safari toolbars. Its logical screen is 440 x 956.
                device['viewport']={'width':440,'height':956}
                context=browser.new_context(**device,service_workers=workers)
                context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
                return context
            return browser.new_context(viewport={'width':width,'height':932},service_workers=workers)
        widths=[440] if args.iphone_only else [320,390,430,440,768,1024,1280,1440,1648]
        for width in widths:
            context=context_for(width)
            with lab_width_diagnostics(context,checks,width,browser_events) as page:
                errors=[];external=[];api_network=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                def request(req):
                    if urlsplit(req.url).scheme in ['http','https'] and not req.url.startswith(base):external.append(req.url)
                    if '/sandbox-api/' in req.url:api_network.append(req.url)
                page.on('request',request)
                page.goto(base+'/admin/bronuvannia/')
                page.wait_for_selector('#view .upcoming-row,#view .booking-card')
                expect(page.locator('.lab-banner')).to_be_visible()
                for view in ['upcoming','bookings','calendar','equipment','clients','campaigns','finances','analytics','chemistry','settings']:
                    navigate(page,view);page.wait_for_timeout(120)
                    checks.check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{width}: {view} no document overflow')
                    if width in [320,390,430,440,768,1440]:checks.screenshot(page,f'{width}-{view}.png')
                navigate(page,'bookings')
                expect(page.locator('.booking-list')).to_have_class('booking-list lab-compact')
                card=page.locator('.booking-card').first
                compact_height=card.bounding_box()['height']
                checks.check(compact_height<420,f'{width}: compact booking bounded height')
                more=card.locator('.booking-action-more>summary')
                expect(more.locator('span')).to_have_text('⋯')
                more_bounds=more.bounding_box();primary=card.locator('.primary-action').first.bounding_box()
                checks.check(more_bounds['width']>=48 and more_bounds['height']>=44 and primary['width']>=card.locator('.booking-actions').bounding_box()['width']-1,f'{width}: More has a separate touch target and the primary action has a full row')
                waiting=page.locator('.booking-card .status.waiting_payment').first
                if not waiting.count():waiting=page.locator('.booking-card[data-status="waiting_payment"] .status').first
                if not waiting.count():waiting=page.locator('.booking-card .status').filter(has_text='Очікує').first
                original=waiting.inner_text();waiting.evaluate("node=>node.textContent='Очікує передоплату'")
                fits=waiting.evaluate('''node=>{const range=document.createRange();range.selectNodeContents(node);const text=range.getBoundingClientRect(),box=node.getBoundingClientRect();return text.top>=box.top&&text.bottom<=box.bottom+1&&text.left>=box.left&&text.right<=box.right+1}''')
                checks.check(fits,f'{width}: full waiting-payment label fits its badge')
                waiting.evaluate('(node,value)=>node.textContent=value',original)
                if width<=900:
                    # Linux browsers do not expose an iPhone hardware safe area. Inject
                    # the inset token to verify geometry; this is not device acceptance.
                    for inset in [0,34]:
                        page.evaluate('(v)=>document.documentElement.style.setProperty("--pwa-safe-bottom",v+"px")',inset)
                        nav=page.locator('.mobile-nav').evaluate('''nav=>{
                            const rect=nav.getBoundingClientRect();
                            return {bottom:rect.bottom,height:rect.height,viewport:innerHeight,
                                buttons:[...nav.querySelectorAll(':scope>button')].map(button=>{
                                    const r=button.getBoundingClientRect();
                                    return {height:r.height,bottom:r.bottom};
                                })};
                        }''')
                        checks.check(abs(nav['bottom']-nav['viewport'])<=1,f'{width}: navigation reaches viewport bottom, simulated inset {inset}')
                        checks.check(abs(nav['height']-(82+inset))<=1,f'{width}: navigation paints home area exactly once, simulated inset {inset}')
                        checks.check(all(button['height']>=44 and button['bottom']<=nav['viewport']-inset+1 for button in nav['buttons']),f'{width}: touch controls clear simulated home area {inset}')
                        if width==440:checks.screenshot(page,f'iphone17-nav-simulated-inset-{inset}.png')
                    page.evaluate('document.documentElement.style.removeProperty("--pwa-safe-bottom")')
                card.locator('.booking-action-more>summary').click()
                if width<=900:cancel=page.locator('.native-v2-action-sheet button').filter(has_text='Скасувати').first
                else:cancel=card.locator('[data-action="cancel"]')
                expect(cancel).to_be_visible()
                page.once('dialog',lambda dialog:dialog.dismiss());cancel.click()
                checks.check(page.evaluate("VA_LAB.getState().bookings[0].status")== 'pending',f'{width}: More exposes cancellation; dismissed confirmation preserves booking')
                try:
                    card.locator('.lab-open-detail').click();expect(page.locator('.detail')).to_be_visible()
                except Exception:
                    # Preserve a failed gate instead of guessing from a timeout or
                    # retrying an action whose real cause has not been established.
                    diagnostics=page.evaluate('''()=>{
                        const button=document.querySelector('.booking-card .lab-open-detail');
                        const style=button&&getComputedStyle(button);
                        return {visibility:document.visibilityState,focus:document.hasFocus(),
                            activeElement:document.activeElement?.outerHTML,
                            viewport:{width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height},
                            button:button&&{rect:button.getBoundingClientRect().toJSON(),display:style.display,visibility:style.visibility,disabled:button.disabled},
                            menus:[...document.querySelectorAll('details[open]')].map(menu=>menu.outerHTML),
                            animations:document.getAnimations().map(animation=>({state:animation.playState,time:animation.currentTime})),
                            mainScroll:document.querySelector('.main')?.scrollTop};
                    }''')
                    (checks.artifacts/f'{width}-detail-failure.json').write_text(json.dumps(diagnostics,ensure_ascii=False,indent=2)+'\n')
                    checks.screenshot(page,f'{width}-detail-failure.png')
                    raise
                expect(page.locator('.lab-action-dock button')).to_be_visible()
                dock=page.locator('.lab-action-dock').bounding_box()
                checks.check(dock['y']+dock['height']<=page.viewport_size['height']+1,f'{width}: primary detail action stays within viewport')
                if width<=900:
                    expect(page.locator('.lab-ledger')).to_have_count(1)
                    expect(page.locator('.lab-ledger')).to_be_visible()
                    page.locator('.lab-ledger summary').click();expect(page.locator('.lab-ledger .charged')).to_be_visible()
                    page.locator('.lab-ledger summary').click()
                page.evaluate("window.__labIdle=0;window.__labObserver=new MutationObserver(records=>window.__labIdle+=records.length);__labObserver.observe(document.querySelector('#layer'),{subtree:true,childList:true})")
                page.wait_for_timeout(600)
                idle=page.evaluate('window.__labObserver.disconnect();window.__labIdle')
                checks.check(idle<30,f'{width}: detail DOM settles at idle ({idle} changes/600ms)')
                if width in [320,390,430,440,768,1440]:checks.screenshot(page,f'{width}-detail.png')
                page.locator('.detail .back').click();expect(page.locator('.detail')).not_to_be_attached()
                page.locator('#labListMode button').filter(has_text='Повністю').click()
                expect(card.locator('.booking-row-body')).to_be_visible()
                full_more=card.locator('.booking-action-more>summary').bounding_box()
                checks.check(full_more['width']>=44 and full_more['height']>=44 and not card.locator('.booking-action-more>summary>em').is_visible(),f'{width}: full mode retains an uncluttered accessible More control')
                full_height=card.bounding_box()['height'];density.append({'width':width,'compact_height':compact_height,'full_height':full_height})
                if width<=900:checks.check(compact_height<full_height,f'{width}: compact card reduces height ({compact_height:.0f} vs {full_height:.0f}px)')
                page.reload();page.wait_for_selector('.upcoming-row,.booking-card');navigate(page,'bookings')
                expect(page.locator('.booking-list')).not_to_have_class('booking-list lab-compact')
                page.locator('#labListMode button').filter(has_text='Стисло').click()
                checks.check(not external and not api_network,f'{width}: zero external/API network requests without mocked routing')
                checks.check(not errors,f'{width}: no uncaught JS errors: {errors}')
                if width==440:
                    page.set_viewport_size({'width':956,'height':440});navigate(page,'bookings')
                    page.locator('.booking-card .lab-open-detail').first.click()
                    expect(page.locator('.lab-action-dock button')).to_be_visible()
                    rect=page.locator('.lab-action-dock').bounding_box()
                    checks.check(rect['y']+rect['height']<=441,'iPhone landscape: detail primary action fits short viewport')
                    checks.screenshot(page,'iphone17-landscape-detail.png')
                    page.locator('.detail .back').click()
                    page.locator('#newBooking:visible,#mobileNewBooking:visible').first.click()
                    form=page.locator('#bookingForm');expect(form).to_be_visible()
                    checks.check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'iPhone landscape: booking form has no document overflow')
                    footer=form.locator('footer').bounding_box()
                    checks.check(footer['y']>=48 and footer['y']+footer['height']<=441,'iPhone landscape: booking footer clears LAB header and screen bottom')
                    checks.screenshot(page,'iphone17-landscape-form.png')
                    form.locator('[data-close]:visible').first.click()
        # Real clicks on the LAB adapter: rejected save keeps draft, retry persists, reload reads it.
        for width in ([440] if args.iphone_only else [390,440,1440]):
            context=context_for(width)
            page=context.new_page();page.goto(base+'/admin/bronuvannia/');page.wait_for_selector('.upcoming-row,.booking-card')
            page.locator('#mobileNewBooking' if width<901 else '#newBooking').click()
            form=page.locator('#bookingForm')
            form.locator('[name="startDate"]').fill(smoke.iso(10));form.locator('[name="returnDate"]').fill(smoke.iso(11))
            exercise_time_picker(page,form,checks,width)
            if width<901:form.locator('.mobile-booking-next').click()
            form.locator('[name="customerName"]').fill('LAB збереження')
            form.locator('[name="customerPhone"]').fill('+380000000099')
            if width<901:
                form.locator('.mobile-booking-next').click();form.locator('.mobile-booking-next').click()
            page.evaluate('window.VA_LAB.faults.write=true')
            form.locator('[type="submit"]').click()
            expect(form.locator('[type="submit"]')).to_be_enabled()
            expect(form.locator('[name="customerName"]')).to_have_value('LAB збереження')
            checks.check(page.evaluate("VA_LAB.getState().bookings.filter(b=>b.customer_name==='LAB збереження').length")==0,f'{width}: rejected save does not persist')
            page.evaluate('window.VA_LAB.faults.write=false')
            form.locator('[type="submit"]').click();expect(form).not_to_be_attached()
            page.reload();page.wait_for_selector('.upcoming-row,.booking-card');navigate(page,'bookings')
            card=page.locator('.booking-card').filter(has_text='LAB збереження');expect(card).to_have_count(1)
            expect(card).to_contain_text('LAB збереження')
            checks.check(page.evaluate("VA_LAB.getState().bookings.filter(b=>b.customer_name==='LAB збереження').length")==1,f'{width}: retry and reload preserve one saved booking')
            saved=page.evaluate("VA_LAB.getState().bookings.find(b=>b.customer_name==='LAB збереження')")
            checks.check(saved['extras']['pickup_time']=='10:30' and saved['extras']['return_time']=='21:00',f'{width}: selected pickup and return times persist through canonical save and reload')
            # Issue/return a seeded confirmed booking through canonical forms.
            card=page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000005"]')
            card.locator('[data-action="issue"]').click();form=page.locator('#issueForm')
            form.locator('[name="depositPaid"]').check()
            checks.screenshot(page,f'{width}-issue.png')
            form.locator('[type="submit"]').click();expect(form).not_to_be_attached()
            card.locator('[data-action="complete"]').click();form=page.locator('#financeForm')
            form.locator('[name="settlementCompleted"]').check();form.locator('[type="submit"]').click();expect(form).not_to_be_attached()
            page.reload();page.wait_for_selector('.upcoming-row,.booking-card')
            checks.check(page.evaluate("VA_LAB.getState().bookings.find(b=>b.id==='00000000-0000-4000-8000-000000000005').status")== 'completed',f'{width}: issue and settlement persist after reload')
            navigate(page,'settings');page.locator('[data-settings-tab="notifications"]').click()
            page.evaluate("()=>{window.__labPermissionCalls=0;if(window.Notification){const original=Notification.requestPermission;Notification.requestPermission=function(...args){window.__labPermissionCalls++;return original.apply(this,args)}}}")
            dialogs=[]
            page.once('dialog',lambda dialog:(dialogs.append(dialog.message),dialog.dismiss()))
            with page.expect_event('dialog') as blocked:
                page.locator('#notificationToggle').click()
            permission_calls=page.evaluate('window.__labPermissionCalls')
            checks.check('LAB:' in blocked.value.message and permission_calls==0,f'{width}: push action blocked before requesting OS permission')
            context.close()
        # Worker cache and browser-local data survive a short connection loss.
        context=browser.new_context(viewport={'width':430,'height':932})
        page=context.new_page();page.goto(base+'/admin/bronuvannia/');page.wait_for_selector('.upcoming-row,.booking-card')
        page.evaluate('navigator.serviceWorker.ready')
        page.reload();page.wait_for_function('()=>navigator.serviceWorker.controller!==null')
        checks.check(page.evaluate('(name)=>caches.keys().then(keys=>keys.includes(name))',cache_name),'LAB-specific service worker cache installed')
        # Playwright's Linux WebKit offline override rejects navigation internally before
        # its worker can respond. Drop real HTTP sockets there, preserving SW dispatch.
        # Chromium additionally exercises navigator.onLine=false via the browser setting.
        if args.browser=='webkit':transport['disconnect']=True
        else:context.set_offline(True)
        page.reload();page.wait_for_selector('.upcoming-row,.booking-card')
        checks.check(page.locator('.lab-banner').is_visible(),'Transport loss launch retains LAB identity and local records')
        page.locator('#mobileNewBooking').click();form=page.locator('#bookingForm')
        form.locator('[name=startDate]').fill(smoke.iso(8));form.locator('header [data-close]').click()
        expect(page.locator('#labLeaveDialog')).to_be_visible()
        page.locator('#labLeaveDialog [data-lab-keep]').click()
        expect(form.locator('[name=startDate]')).to_have_value(smoke.iso(8))
        form.locator('header [data-close]').click();page.locator('#labLeaveDialog [data-lab-discard]').click()
        expect(form).not_to_be_attached()
        checks.check(True,'Offline cached form safety retains the actual draft')
        transport['disconnect']=False;context.set_offline(False);page.reload();page.wait_for_selector('.upcoming-row,.booking-card')
        checks.check(page.evaluate('VA_LAB.getState().bookings.length')==12,'Reconnect keeps seeded browser-local state')
        context.close()
        browser.close()
    result={'passed':checks.passed,'failed':checks.failed,'density':density}
    checks.artifacts.mkdir(parents=True,exist_ok=True)
    (checks.artifacts/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False));return int(bool(checks.failed))


if __name__=='__main__':raise SystemExit(main())
