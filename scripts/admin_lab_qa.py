"""Exercise the LAB artifact itself, with no API routes, sessions or fake server responses."""
import argparse
import json
import os
import socket
import threading
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
import e2e_smoke as smoke
from admin_idle_qa import navigate
from admin_entrypoint_finance_qa import PagesHandler


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
            page=context.new_page();errors=[];external=[];api_network=[]
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
            context.close()
        # Real clicks on the LAB adapter: rejected save keeps draft, retry persists, reload reads it.
        for width in ([440] if args.iphone_only else [390,440,1440]):
            context=context_for(width)
            page=context.new_page();page.goto(base+'/admin/bronuvannia/');page.wait_for_selector('.upcoming-row,.booking-card')
            page.locator('#mobileNewBooking' if width<901 else '#newBooking').click()
            form=page.locator('#bookingForm')
            form.locator('[name="startDate"]').fill(smoke.iso(10));form.locator('[name="returnDate"]').fill(smoke.iso(11))
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
