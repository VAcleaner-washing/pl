"""Exercise audit fixes on the shipped artifact with isolated API fixtures."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import e2e_smoke as smoke
import admin_idle_qa as idle
from admin_entrypoint_finance_qa import pages_server


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--artifacts',default='pwa-test-results/audit-r1')
    args=parser.parse_args()
    checks=smoke.Checks(Path(args.artifacts).resolve())
    config=json.loads((smoke.PROJECT_ROOT/'config/vacleaner.json').read_text())
    with pages_server(smoke.PROJECT_ROOT/'dist') as base,sync_playwright() as pw:
        options={'headless':True}
        if args.browser=='chromium':options['args']=['--no-sandbox']
        if exe:=os.environ.get('PLAYWRIGHT_'+args.browser.upper()+'_EXECUTABLE'):options['executable_path']=exe
        browser=getattr(pw,args.browser).launch(**options)
        for width in [390,1440]:
            context=browser.new_context(viewport={'width':width,'height':900},service_workers='block')
            context.add_init_script(smoke.session_script())
            context.add_init_script('''window.__auditListeners=[];const auditAdd=EventTarget.prototype.addEventListener;
              EventTarget.prototype.addEventListener=function(type,listener,options){
                if((this===document&&type==='vacleaner:address-selected')||(typeof MediaQueryList!=='undefined'&&this instanceof MediaQueryList&&type==='change'))window.__auditListeners.push({signal:options?.signal});
                return auditAdd.call(this,type,listener,options)
              };''')
            forbidden=[]
            api=idle.fixtures(config,21,7,forbidden)
            flags={'read_fail':False,'campaign_fail':True,'settings_fail':True,'creates':0,'settings_writes':0,'settlements':0,'finance':0}
            extra=[]
            def handle(route):
                request=route.request
                payload=request.post_data_json if request.post_data else {}
                action=(payload or {}).get('action')
                body=None;status=200
                if '/vacleaner-settings' in request.url and request.method=='POST':
                    flags['settings_writes']+=1
                    if flags['settings_fail']:body={'error':'service_error'};status=500
                    else:body=payload
                elif action=='campaigns' and flags['campaign_fail']:body={'error':'service_error'};status=503
                elif action=='list' and flags['read_fail']:body={'error':'service_error'};status=503
                elif action=='list' and extra:body={'bookings':api.bookings+extra,'expenses':[]}
                elif action=='create':
                    flags['creates']+=1
                    row=smoke.booking('00000000-0000-4000-8000-000000000099','VAC-SAVED','pending',2,3)
                    row.update(customer_name=payload['customerName'],customer_phone=payload['customerPhone'])
                    extra.append(row);flags['read_fail']=True;body={'booking':row}
                elif action=='save_finance':
                    flags['finance']+=1
                    row=next(row for row in api.bookings if row['id']==payload['bookingId'])
                    body={'booking':row,'finance':{'refundAmount':500,'dueAmount':0}}
                elif action=='save_deposit_return':
                    flags['settlements']+=1
                    if flags['settlements']==1:body={'error':'service_error'};status=503
                    else:
                        row=next(row for row in api.bookings if row['id']==payload['bookingId'])
                        row.update(status='completed',deposit_returned=True)
                        flags['read_fail']=True
                        body={'booking':row,'finance':{'refundAmount':500,'dueAmount':0}}
                elif action=='status':body={'attachedPromo':None,'availablePromo':None}
                elif action=='pending_bonus':body={'pendingPromo':None}
                if body is None:api(route)
                else:route.fulfill(status=status,content_type='application/json',body=json.dumps(body))
            smoke.install_routes(context,base,handle)
            page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(base+'/admin/bronuvannia/');page.wait_for_selector('#view .booking-card,#view .upcoming-row')
            idle.navigate(page,'campaigns')
            expect(page.locator('[data-retry-module="campaigns"]')).to_be_visible()
            expect(page.locator('[data-campaigns-unavailable]')).to_be_visible()
            expect(page.locator('.campaign-summary')).to_have_count(0)
            expect(page.locator('#view')).not_to_contain_text('Кампаній ще немає')
            checks.screenshot(page,f'{width}-campaign-read-error.png')
            flags['campaign_fail']=False;page.locator('[data-retry-module="campaigns"]').click()
            expect(page.locator('[data-retry-module="campaigns"]')).not_to_be_attached()
            checks.check(True,f'{width}: failed optional read is distinct from successful empty and can retry')

            idle.navigate(page,'settings');page.locator('[data-settings-tab="equipment"]').click()
            form=page.locator('#equipmentBaselineForm');form.locator('[name="puzziUnitCost"]').fill('99999')
            prior=page.evaluate("localStorage.getItem('vacleaner_equipment_baselines')")
            form.locator('[type="submit"]').click();page.wait_for_function('()=>document.querySelector("#equipmentBaselineForm [type=submit]").disabled===false')
            checks.check(page.evaluate("localStorage.getItem('vacleaner_equipment_baselines')")==prior,f'{width}: failed settings save keeps confirmed cache')
            expect(form.locator('[name="puzziUnitCost"]')).to_have_value('99999')
            checks.screenshot(page,f'{width}-settings-save-rejected.png')
            flags['settings_fail']=False;form.locator('[type="submit"]').click()
            page.wait_for_function("()=>JSON.parse(localStorage.getItem('vacleaner_equipment_baselines'))?.puzzi?.unitCost===99999")
            checks.check(flags['settings_writes']==2,f'{width}: settings draft retries explicitly and saves server response')

            page.evaluate(r'''()=>{const original=window.fetch;window.__auditLookups=[];window.fetch=async(url,options={})=>{
              let payload={};try{payload=JSON.parse(options.body||'{}')}catch{}
              if(payload.action==='lookup_customer'){
                const phone=payload.phone;window.__auditLookups.push(phone);
                await new Promise(resolve=>setTimeout(resolve,phone.endsWith('1111111')?900:40));
                return new Response(JSON.stringify({customer:{phone,name:phone.endsWith('1111111')?'Клієнт A':'Клієнт Б',completedOrders:0,loyalty:{level:'Start',percent:0},documentNumber:'',hasDocumentPhoto:true}}),{status:200,headers:{'content-type':'application/json'}})
              }return original(url,options)
            }}''')
            new_button=page.locator('#mobileNewBooking' if width<901 else '#newBooking')
            new_button.click();form=page.locator('#bookingForm')
            form.locator('[name="startDate"]').fill(smoke.iso(2));form.locator('[name="returnDate"]').fill(smoke.iso(3))
            if width<901:form.locator('.mobile-booking-next').click()
            form.locator('[name="customerPhone"]').fill('+380951111111')
            page.wait_for_function("()=>window.__auditLookups.includes('+380951111111')")
            form.locator('[name="customerPhone"]').fill('+380952222222')
            page.wait_for_function("()=>window.__auditLookups.includes('+380952222222')")
            expect(form.locator('[name="customerName"]')).to_have_value('Клієнт Б')
            page.wait_for_timeout(950)
            expect(form.locator('[name="customerName"]')).to_have_value('Клієнт Б')
            checks.check(True,f'{width}: late lookup A never overwrites current client B')
            if width<901:
                form.locator('.mobile-booking-next').click();form.locator('.mobile-booking-next').click()
            form.locator('[type="submit"]').click()
            expect(page.locator('#bookingForm')).not_to_be_attached()
            expect(page.locator('#mutationReadNotice')).to_be_visible()
            checks.screenshot(page,f'{width}-saved-read-recovery.png')
            checks.check(flags['creates']==1,f'{width}: committed booking is not replayed after refresh failure')
            idle.navigate(page,'bookings')
            expect(page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000099"]')).to_contain_text('Клієнт Б')
            page.locator('#mutationReadNotice button').click()
            expect(page.locator('#mutationReadNotice button')).to_be_enabled()
            checks.check(True,f'{width}: a failed read retry remains usable')
            flags['read_fail']=False;page.locator('#mutationReadNotice button').click()
            expect(page.locator('#mutationReadNotice')).not_to_be_attached()
            checks.check(flags['creates']==1,f'{width}: recovery retries reads only')
            # A separate immediate referral action must not discard unrelated edits.
            card=page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000004"]')
            card.locator('[data-action="edit"]').click();form=page.locator('#bookingForm')
            if width<901:form.locator('.mobile-booking-next').click()
            form.locator('[name="customerName"]').fill('Незбережене ім’я')
            form.locator('[name="referralCode"]').fill('VA-AUDIT001')
            form.locator('#applyBookingReferral').click()
            expect(page.locator('.toast').last).to_contain_text('Спочатку збережіть інші зміни')
            expect(form.locator('[name="customerName"]')).to_have_value('Незбережене ім’я')
            checks.check(True,f'{width}: immediate referral action preserves unrelated draft')
            form.locator('[data-close]:visible').first.click()
            # First settlement write commits; second fails. No automatic write replay.
            issued=page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000005"]')
            issued.locator('[data-action="complete"]').click();form=page.locator('#financeForm')
            form.locator('[name="settlementCompleted"]').check()
            form.locator('[type="submit"]').click()
            expect(form.locator('[data-settlement-recovery]')).to_be_visible()
            checks.screenshot(page,f'{width}-partial-settlement.png')
            checks.check(flags['finance']==1 and flags['settlements']==1,f'{width}: partial settlement remains explicit without automatic replay')
            form.locator('[type="submit"]').click()
            expect(page.locator('#financeForm')).not_to_be_attached()
            expect(page.locator('#mutationReadNotice')).to_be_visible()
            checks.check(flags['settlements']==2,f'{width}: settlement retries only after an explicit second confirmation')
            # Completed is the authoritative response even if the refresh now fails.
            if width<901:
                page.locator('.native-search-options').click()
                page.locator('.native-v2-sheet-action').filter(has_text='Повернені').click()
            else:page.locator('.booking-toolbar [data-filter="completed"]').click()
            expect(page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000005"]')).to_contain_text('Повернена')
            flags['read_fail']=False;page.locator('#mutationReadNotice button').click()
            expect(page.locator('#mutationReadNotice')).not_to_be_attached()
            active_listeners=lambda:page.evaluate('window.__auditListeners.filter(row=>!row.signal?.aborted).length')
            before=active_listeners()
            for _ in range(10):
                new_button.click();page.locator('#bookingForm [data-close]:visible').first.click()
            checks.check(active_listeners()==before,f'{width}: repeated form open/close disposes address and media listeners')
            checks.check(not errors and not forbidden,f'{width}: no runtime errors or unintended writes {errors} {forbidden}')
            checks.screenshot(page,f'audit-r1-{width}.png')
            context.close()
        browser.close()
    result={'passed':checks.passed,'failed':checks.failed}
    checks.artifacts.mkdir(parents=True,exist_ok=True)
    (checks.artifacts/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False));return int(bool(checks.failed))


if __name__=='__main__':raise SystemExit(main())
