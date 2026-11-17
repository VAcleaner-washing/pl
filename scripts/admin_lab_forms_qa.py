"""Real LAB controls and local state; no mocked routing or production connections."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import e2e_smoke as smoke
from admin_idle_qa import navigate
from admin_lab_qa import lab_server


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--artifacts',default='lab-test-results/forms')
    args=parser.parse_args();checks=smoke.Checks(Path(args.artifacts).resolve())
    with lab_server(smoke.PROJECT_ROOT/'lab-test-results/dist') as (base,_),sync_playwright() as pw:
        opts={'headless':True}
        if args.browser=='chromium':opts['args']=['--no-sandbox']
        if exe:=os.environ.get('PLAYWRIGHT_'+args.browser.upper()+'_EXECUTABLE'):opts['executable_path']=exe
        browser=getattr(pw,args.browser).launch(**opts)
        for width in [390,440,1440]:
            config={'viewport':{'width':width,'height':956}}
            if width==440:
                config={k:v for k,v in pw.devices['iPhone 17 Pro Max'].items() if k!='default_browser_type'}
                config['viewport']={'width':440,'height':956}
            context=browser.new_context(**config,service_workers='block')
            if width==440:context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
            page=context.new_page();errors=[];outside=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('request',lambda request:outside.append(request.url) if request.url.startswith('http') and not request.url.startswith(base) else None)
            page.goto(base+'/admin/bronuvannia/');page.wait_for_selector('.upcoming-row,.booking-card')
            expect(page.locator('html')).to_have_attribute('data-admin-lab','synthetic')
            checks.check('user-scalable' not in page.locator('meta[name=viewport]').get_attribute('content'),f'{width}: user zoom is permitted')
            def new_booking():
                page.locator('#mobileNewBooking' if width<=900 else '#newBooking').click()
                form=page.locator('#bookingForm');expect(form).to_be_visible();return form
            def discard():
                page.locator('#labLeaveDialog [data-lab-discard]').click();expect(page.locator('#labLeaveDialog')).not_to_be_attached()
            def keep():
                page.locator('#labLeaveDialog [data-lab-keep]').click();expect(page.locator('#labLeaveDialog')).not_to_be_attached()
            def close(form):form.locator('header [data-close]').click()

            form=new_booking();close(form);expect(form).not_to_be_attached()
            checks.check(page.locator('#labLeaveDialog').count()==0,f'{width}: unchanged form closes without confirmation')
            form=new_booking();form.locator('[name=startDate]').fill(smoke.iso(8));form.locator('[name=returnDate]').fill(smoke.iso(9))
            if width<=900:form.locator('.mobile-booking-next').click()
            form.locator('[name=customerName]').fill('R3 незбережений клієнт')
            close(form);expect(page.locator('#labLeaveDialog')).to_be_visible()
            checks.screenshot(page,f'{width}-dirty-confirmation.png')
            expect(page.locator('#labLeaveDialog [data-lab-keep]')).to_be_focused()
            page.keyboard.press('Escape');expect(page.locator('#labLeaveDialog')).not_to_be_attached()
            expect(form.locator('[name=customerName]')).to_have_value('R3 незбережений клієнт')
            page.keyboard.press('Escape');expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            if width>900:
                checks.check(page.evaluate("document.elementFromPoint(4,80).classList.contains('modal-backdrop')"),f'{width}: visible backdrop remains a real click target')
                page.mouse.click(4,80);expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            blocked=page.evaluate("()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented}")
            checks.check(blocked,f'{width}: unsaved draft requests an unload warning')
            checks.check(page.locator('#adminMount').evaluate('node=>node.inert'),f'{width}: modal background is inert')
            close(form);discard();expect(form).not_to_be_attached()
            checks.check(page.evaluate('VA_LAB.getState().bookings.length')==12,f'{width}: discarding a draft never creates a booking')
            checks.check(not page.locator('#adminMount').evaluate('node=>node.inert'),f'{width}: background is restored after close')
            checks.check(not page.evaluate("()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented}"),f'{width}: closed drafts leave no stale unload guard')

            # Existing booking form: a selected file alone is a dirty draft.
            navigate(page,'bookings');card=page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000001"]')
            card.locator('[data-action=edit]').click();form=page.locator('#bookingForm')
            if width<=900:
                form.locator('.mobile-booking-next').click();form.locator('.mobile-booking-next').click()
            file=form.locator('[data-document-file]')
            if file.count():
                file.set_input_files({'name':'lab-only.png','mimeType':'image/png','buffer':bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082')})
                close(form);expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
                checks.check(file.evaluate('node=>node.files.length')==1,f'{width}: cancelling close retains the selected synthetic file')
                close(form);discard()
            else:close(form)

            # Process has an unnamed editable message; it must also be protected.
            card.locator('[data-action=process]').click();form=page.locator('#processForm')
            form.locator('#confirmPreview').fill('R3 незбережений текст підтвердження')
            close(form);expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            expect(form.locator('#confirmPreview')).to_have_value('R3 незбережений текст підтвердження');close(form);discard()
            checks.check(True,f'{width}: unnamed confirmation message is protected')
            correction=page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000005"]')
            correction.locator('.booking-action-more>summary').click()
            if width<=900:expect(page.locator('.native-v2-action-sheet-layer')).to_be_visible()
            page.keyboard.press('Escape')
            if width<=900:expect(page.locator('.native-v2-action-sheet-layer')).not_to_be_attached()
            else:expect(correction.locator('.booking-action-more')).not_to_have_attribute('open','')
            expect(correction.locator('.booking-action-more>summary')).to_be_focused()
            checks.check(True,f'{width}: Escape closes More and returns focus')
            correction.locator('.booking-action-more>summary').click()
            if width<=900:page.locator('.native-v2-action-sheet button').filter(has_text='Виправити статус').click()
            else:correction.locator('[data-action=status]').click()
            form=page.locator('#statusCorrectForm');form.locator('[name=reason]').fill('R3 тестова причина')
            close(form);expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            expect(form.locator('[name=reason]')).to_have_value('R3 тестова причина');close(form);discard()
            expect(correction.locator('.booking-action-more>summary')).to_be_focused()
            checks.check(True,f'{width}: status correction draft never changes the booking without save')
            navigate(page,'campaigns')
            # A late initial-focus frame must not steal the first field input.
            # Hold only that real callback until focus reaches the name field.
            page.evaluate("""()=>{const raf=window.requestAnimationFrame.bind(window);let held;
              const onFocus=event=>{if(event.target.name==='name'&&held){const callback=held;held=null;
                queueMicrotask(()=>{callback(performance.now());window.requestAnimationFrame=raf;document.removeEventListener('focusin',onFocus,true)})}};
              window.requestAnimationFrame=callback=>{if(String(callback).includes('const first=focusable()[0]')){held=callback;return 0}return raf(callback)};
              document.addEventListener('focusin',onFocus,true)}""")
            page.locator('#newCampaign').click();form=page.locator('#campaignForm')
            form.locator('[name=name]').fill('R3 кампанія-чернетка')
            expect(form.locator('[name=name]')).to_have_value('R3 кампанія-чернетка')
            expect(form.locator('[name=name]')).to_be_focused()
            checks.check(True,f'{width}: deferred modal autofocus preserves actual input and focus')
            close(form);expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            expect(form.locator('[name=name]')).to_have_value('R3 кампанія-чернетка');close(form);discard()
            checks.check(page.evaluate('VA_LAB.getState().campaigns.length')==0,f'{width}: discarded campaign never persists or dispatches')
            # A navigation reset from the prior click may arrive after the next
            # action's pointerdown. Release the real timer at precisely that point.
            page.evaluate("""()=>{const timer=window.setTimeout.bind(window);let held=[];window.qaScrollResetTrace=[];
              const onDown=event=>{if(event.target.closest('[data-action=issue]')&&held.length){const callbacks=held;held=[];
                queueMicrotask(()=>{const before=document.querySelector('.main').scrollTop;callbacks.forEach(cb=>cb());
                  qaScrollResetTrace.push({before,after:document.querySelector('.main').scrollTop,count:callbacks.length});
                  window.setTimeout=timer;document.removeEventListener('pointerdown',onDown,true)})}};
              window.setTimeout=(callback,delay,...args)=>{if(delay===60&&String(callback).includes('main.scrollTop=0')){held.push(callback);return 0}return timer(callback,delay,...args)};
              document.addEventListener('pointerdown',onDown,true)}""")
            navigate(page,'bookings')

            # All common modal families retain the actual original field, without writes.
            for action,form_id,field_name,value in [
                ('issue','issueForm','depositAmount','1500'),
                ('complete','financeForm','used','3'),
                ('extend','extendRentalForm','returnDate',smoke.iso(4)),
            ]:
                row='000000000005' if action=='issue' else '000000000007'
                card=page.locator(f'.booking-card[data-id="00000000-0000-4000-8000-{row}"]')
                card.locator(f'[data-action="{action}"]').click();form=page.locator('#'+form_id)
                expect(form).to_be_visible()
                expect(form.locator('header small')).to_have_text('LAB-005' if action=='issue' else 'LAB-007')
                if action=='issue':
                    trace=page.evaluate('qaScrollResetTrace')
                    checks.check(bool(trace) and all(t['count']>0 and t['before']==t['after'] for t in trace) and (width>900 or trace[0]['before']>0),f'{width}: late navigation reset preserves scroll and the intended issue action')
                form.locator(f'[name="{field_name}"]').fill(value);close(form)
                expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
                expect(form.locator(f'[name="{field_name}"]')).to_have_value(value)
                close(form);discard();checks.check(True,f'{width}: {form_id} keeps and discards without saving')

            navigate(page,'clients');page.locator('.client-row-open .client-name').first.click()
            form=page.locator('#clientEditor');expect(form).to_be_visible();close(form);expect(form).not_to_be_attached()
            page.locator('.client-row-open .client-name').first.click();form=page.locator('#clientEditor')
            form.locator('#clientContactEdit').click();form.locator('[name=customerName]').fill('R3 редагування клієнта')
            close(form);expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            expect(form.locator('[name=customerName]')).to_have_value('R3 редагування клієнта');close(form);discard()
            checks.check(True,f'{width}: client read-only close is clean; edited contact is protected')

            navigate(page,'equipment');page.get_by_role('button',name='Редагувати ціни',exact=True).click();form=page.locator('#catalogForm')
            form.locator('[name=puzzi_weekday]').fill('701');close(form);expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            expect(form.locator('[name=puzzi_weekday]')).to_have_value('701');close(form);discard()
            checks.check(page.evaluate('VA_LAB.getState().settings.catalog.products.puzzi.weekday')==700,f'{width}: discarded catalog price never persists')

            # Failed, pending and successful expense saves use the real synthetic adapter.
            navigate(page,'finances');page.locator('#addExpense').click();form=page.locator('#expenseForm')
            form.locator('[type=submit]').click();invalid=form.locator('[aria-invalid=true]').first
            expect(invalid).to_be_visible();expect(form.locator('.lab-field-error').first).to_be_visible()
            checks.check(bool(invalid.get_attribute('aria-describedby')),f'{width}: invalid native fields have persistent accessible feedback')
            form.locator('[name=amount]').fill('123');form.locator('[name=note]').fill('R3 synthetic expense')
            # Hold the actual synthetic expense request until this test releases
            # it. A fixed 700ms delay could expire while WebKit scrolls/stabilizes
            # the close button, turning the pending-state check into a dirty-form
            # check. Keep both states and all their original assertions distinct.
            page.evaluate('''()=>{
              VA_LAB.faults.write=true;VA_LAB.faults.delay=0;
              const original=window.fetch.bind(window);let claimed=false,release;
              const gate=new Promise(resolve=>release=resolve);
              window.__qaExpenseRequestHeld=false;
              window.__qaReleaseExpense=()=>{release();window.fetch=original};
              window.fetch=async(input,options={})=>{
                let action;try{action=JSON.parse(options.body||'{}').action}catch{}
                if(!claimed&&String(input).includes('/sandbox-api/')&&action==='save_expense'){
                  claimed=true;window.__qaExpenseRequestHeld=true;await gate;
                }
                return original(input,options);
              };
            }''')
            form.locator('[type=submit]').click();expect(form).to_have_attribute('data-lab-saving','1')
            page.wait_for_function('window.__qaExpenseRequestHeld===true')
            checks.check(form.locator('[name=amount]').evaluate('node=>node.inert&&!node.disabled'),f'{width}: pending fields freeze without changing FormData inclusion')
            close(form);expect(page.locator('#labLeaveDialog')).not_to_be_attached();expect(form.locator('[data-lab-save-notice]')).to_be_visible()
            page.evaluate('window.__qaReleaseExpense()')
            expect(form.locator('[type=submit]')).to_be_enabled();expect(form).not_to_have_attribute('data-lab-saving','1')
            expect(form.locator('[name=amount]')).to_have_value('123')
            close(form);expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            form.locator('[data-lab-fault-recovery]').click()
            expect(form.locator('[name=amount]')).to_have_value('123')
            form.locator('[type=submit]').click();expect(form).not_to_be_attached()
            checks.check(page.evaluate("VA_LAB.getState().expenses.filter(e=>e.note==='R3 synthetic expense').length")==1,f'{width}: retry saves exactly one expense after rejection')

            navigate(page,'settings');page.locator('[data-settings-tab=delivery]').click();form=page.locator('#deliveryFeeForm')
            form.locator('[name=deliveryLocal]').fill('333')
            destination=page.locator('.nav [data-view=bookings]')
            if width<=900:destination=page.locator('.mobile-nav [data-mobile-view=bookings]')
            destination.click();expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            expect(form.locator('[name=deliveryLocal]')).to_have_value('333')
            page.evaluate('()=>{VA_LAB.faults.write=true}')
            form.locator('[type=submit]').click();expect(form.locator('[type=submit]')).to_be_enabled()
            destination.click();expect(page.locator('#labLeaveDialog')).to_be_visible();keep()
            page.evaluate('()=>{VA_LAB.faults.write=false}')
            form.locator('[type=submit]').click()
            page.wait_for_function("()=>JSON.parse(localStorage.getItem('vacleaner_delivery_pricing')).local===333")
            expect(form.locator('[type=submit]')).to_be_enabled();destination.click()
            page.wait_for_function("()=>document.documentElement.dataset.adminView==='bookings'")
            expect(page.locator('#labLeaveDialog')).not_to_be_attached()
            checks.check(True,f'{width}: failed settings stay dirty; acknowledged settings navigate without a false warning')

            # Native details controls participate in the existing keyboard focus cycle.
            page.locator('.booking-card .lab-open-detail').first.click();expect(page.locator('.detail')).to_be_visible()
            if width<=900:
                summary=page.locator('.lab-ledger summary');summary.focus();page.keyboard.press('Space')
                expect(page.locator('.lab-ledger')).to_have_attribute('open','')
                page.keyboard.press('Tab')
                checks.check(page.evaluate("document.activeElement.closest('.detail')!==null"),f'{width}: disclosure and Tab remain inside detail')
            page.keyboard.press('Escape');expect(page.locator('.detail')).not_to_be_attached()
            checks.check(True,f'{width}: Escape returns from a read-only detail')
            if width<=900:
                form=new_booking();form.locator('[name=startDate]').fill(smoke.iso(8));form.locator('[name=returnDate]').fill(smoke.iso(9));form.locator('.mobile-booking-next').click()
                field=form.locator('[name=customerName]');field.focus()
                page.evaluate("()=>{for(const [name,value] of Object.entries({height:570,offsetTop:0,scale:1}))Object.defineProperty(visualViewport,name,{configurable:true,get:()=>value});visualViewport.dispatchEvent(new Event('resize'))}")
                page.wait_for_function("()=>document.documentElement.classList.contains('keyboard-open')")
                footer=form.locator('footer').bounding_box();checks.check(footer['y']+footer['height']<=571,f'{width}: simulated keyboard viewport keeps form actions above 570px')
                checks.screenshot(page,f'{width}-keyboard-viewport.png')
                page.evaluate("()=>{document.activeElement.blur();for(const name of ['height','offsetTop','scale'])delete visualViewport[name];visualViewport.dispatchEvent(new Event('resize'))}")
                close(form);discard()
            for _ in range(6):form=new_booking();close(form);expect(form).not_to_be_attached()
            checks.check(page.locator('#labLeaveDialog').count()==0 and not page.locator('#adminMount').evaluate('node=>node.inert'),f'{width}: repeated modal lifecycle leaves no orphan dialog or inert background')
            checks.check(not errors and not outside,f'{width}: no runtime errors or external requests {errors} {outside}')
            context.close()
        browser.close()
    result={'browser':args.browser,'passed':checks.passed,'failed':checks.failed};checks.artifacts.mkdir(parents=True,exist_ok=True)
    (checks.artifacts/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False));return int(bool(checks.failed))


if __name__=='__main__':raise SystemExit(main())
