"""Actual fleet UI against isolated API fixtures; no production reads or writes."""
import argparse
import copy
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import e2e_smoke as smoke
import admin_idle_qa as idle
from admin_entrypoint_finance_qa import pages_server


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--root',required=True)
    p.add_argument('--browser',choices=['chromium','webkit'],required=True)
    p.add_argument('--artifacts',required=True)
    args=p.parse_args();out=Path(args.artifacts);out.mkdir(parents=True,exist_ok=True)
    results=[];config=json.loads((smoke.PROJECT_ROOT/'config/vacleaner.json').read_text())
    with pages_server(Path(args.root).resolve()) as base,sync_playwright() as pw:
        browser=getattr(pw,args.browser).launch(headless=True,**({'args':['--no-sandbox']} if args.browser=='chromium' else {}))
        for width in [320,440,1440]:
            forbidden=[];errors=[];calls=[];fail_next=[False];lost_add=[True];fail_read=[False]
            model={'inventory':[{'resource_code':'jimmy','label':'Jimmy','capacity':1,'active':True}],
                   'units':[{'id':'11111111-1111-4111-8111-111111111111','resource_code':'jimmy','unit_number':1,'status':'ready','note':''},
                            {'id':'22222222-2222-4222-8222-222222222222','resource_code':'jimmy','unit_number':2,'status':'repair','note':'Synthetic repair'}],
                   'issued':{'jimmy':1}}
            fallback=idle.fixtures(config,21,7,forbidden)
            def route(r):
                if '/vacleaner-equipment-admin-v1' not in r.request.url:return fallback(r)
                body=r.request.post_data_json or {};calls.append(body)
                data=copy.deepcopy(model);status=200
                if body.get('action')=='list' and fail_read[0]:
                    fail_read[0]=False;data={'error':'equipment_read_failed'};status=503
                elif body.get('action')=='add_unit':
                    if not any(u['id']==body['requestId'] for u in model['units']):
                        model['units'].append({'id':body['requestId'],'resource_code':'jimmy','unit_number':3,'status':'ready','note':'Synthetic add'})
                        model['inventory'][0]['capacity']+=1
                    data={'result':{'changed':True}}
                    if lost_add[0]:
                        lost_add[0]=False;fail_read[0]=True
                        return r.abort('failed')
                elif body.get('action')=='set_status':
                    if fail_next[0]:data={'error':'equipment_reserved_overlap'};status=409;fail_next[0]=False
                    else:
                        unit=next(u for u in model['units'] if u['id']==body['unitId'])
                        unit['status']=body['status'];model['inventory'][0]['capacity']=sum(u['status']=='ready' for u in model['units']);data={'result':{'changed':True}}
                elif body.get('action')!='list':forbidden.append(body);status=409;data={'error':'qa_write_forbidden'}
                r.fulfill(status=status,content_type='application/json',body=json.dumps(data),headers={'Access-Control-Allow-Origin':'*'})
            context=browser.new_context(viewport={'width':width,'height':956},service_workers='block',timezone_id='Europe/Kyiv')
            context.add_init_script(smoke.session_script())
            smoke.install_routes(context,base,route)
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept('Synthetic repair') if d.type=='prompt' else d.accept())
            try:
                page.goto(base+'/admin/bronuvannia/');page.wait_for_selector('.booking-card,.upcoming-row')
                idle.navigate(page,'equipment')
                # The equipment workspace opens on the fleet tab for new users.
                page.locator('[data-eq-tab=fleet]').click()
                expect(page.locator('#equipmentFleetHost')).to_be_visible()
                expect(page.locator('.equipment-fleet-unit')).to_have_count(2)
                expect(page.locator('#equipmentPricingHost')).to_be_hidden();expect(page.locator('#editPrices')).to_be_hidden()
                expect(page.locator('.equipment-fleet-availability')).to_have_text('Немає вільних')
                page.locator('[data-eq-tab=finance]').click()
                expect(page.locator('#equipmentFleetHost')).to_be_hidden();expect(page.locator('#equipmentFinanceHost')).to_be_visible()
                page.locator('[data-eq-tab=fleet]').click()
                ready=page.locator('[data-eq-unit="11111111-1111-4111-8111-111111111111"]')
                fail_next[0]=True;ready.select_option('repair')
                expect(ready).to_have_value('ready')
                assert model['inventory'][0]['capacity']==1
                repair=page.locator('[data-eq-unit="22222222-2222-4222-8222-222222222222"]')
                repair.select_option('ready');expect(repair).to_have_value('ready')
                expect(page.locator('.equipment-fleet-availability')).to_have_text('Вільно 1')
                page.locator('[data-eq-add=jimmy]').click()
                expect(page.locator('#fleetRetry')).to_be_visible()
                page.locator('#fleetRetry').click()
                expect(page.locator('.equipment-fleet-unit')).to_have_count(3)
                page.locator('[data-eq-add=jimmy]').click()
                page.wait_for_function("()=>localStorage.getItem('vac_equipment_add_request_jimmy')===null")
                expect(page.locator('.equipment-fleet-unit')).to_have_count(3)
                adds=[x for x in calls if x['action']=='add_unit']
                assert len(adds)==2 and adds[0]['requestId']==adds[1]['requestId'],adds
                assert model['inventory'][0]['capacity']==3
                idle.navigate(page,'bookings')
                model['issued']['jimmy']=2
                idle.navigate(page,'equipment')
                expect(page.locator('.equipment-fleet-availability')).to_have_text('Вільно 1')
                page.reload();page.wait_for_selector('.booking-card,.upcoming-row')
                idle.navigate(page,'equipment');page.wait_for_selector('.equipment-fleet-unit')
                expect(repair).to_have_value('ready')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'horizontal overflow'
                assert not forbidden,forbidden
                assert not errors,errors
                assert [x['action'] for x in calls].count('set_status')==2,calls
                page.screenshot(path=str(out/f'{args.browser}-{width}-fleet.png'))
                results.append({'width':width,'passed':True,'requests':len(calls),'productionWrites':0})
                print(f'PASS {args.browser}/{width}: tabs, conflicts, save/reload, lost add response plus failed refresh and idempotent retry',flush=True)
            except Exception as error:
                page.screenshot(path=str(out/f'{args.browser}-{width}-failure.png'))
                results.append({'width':width,'passed':False,'error':str(error)})
                raise
            finally:
                (out/'result.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
                context.close()
        browser.close()


if __name__=='__main__':main()
