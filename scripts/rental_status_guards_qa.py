"""Shipped admin issue-rejection UX; all API/Auth I/O is isolated."""
import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import pages_server

parser=argparse.ArgumentParser();parser.add_argument('--root',default='dist');parser.add_argument('--artifacts',default='pwa-test-results/status-guards');args=parser.parse_args()
checks=smoke.Checks(Path(args.artifacts).resolve())
config=json.loads((smoke.PROJECT_ROOT/'config/vacleaner.json').read_text())
with pages_server(Path(args.root).resolve()) as base,sync_playwright() as pw:
    options={'headless':True,'args':['--no-sandbox']}
    if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'):options['executable_path']=os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
    browser=pw.chromium.launch(**options)
    for width in [320,390,1440]:
        context=browser.new_context(viewport={'width':width,'height':900},service_workers='block')
        context.add_init_script(smoke.session_script());fallback=smoke.make_api_handler(config);attempts=[]
        def api(route):
            payload=route.request.post_data_json if route.request.method=='POST' else {}
            if '/functions/v1/vacleaner-admin-bookings-v4' in route.request.url and payload.get('action')=='update':
                attempts.append(payload);route.fulfill(status=409,content_type='application/json',body='{"error":"issue_payment_required"}');return
            fallback(route)
        smoke.install_routes(context,base,api);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            page.goto(base+'/admin/bronuvannia/',wait_until='networkidle')
            nav=page.locator('.mobile-nav button[data-mobile-view="bookings"]')
            if nav.is_visible():nav.click()
            card=page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000003"]')
            card.locator('[data-action="issue"]').click();form=page.locator('#issueForm')
            form.locator('[name="depositPaid"]').check()
            if page.locator('.toast').count():expect(page.locator('.toast').last).not_to_be_visible(timeout=6000)
            form.locator('[type="submit"]').click()
            expect(page.locator('.toast').last).to_contain_text('Для видачі потрібен отриманий залоговий платіж')
            checks.check(form.is_visible(),f'{width}: rejected issue keeps form open')
            checks.check(form.locator('[type="submit"]').is_enabled(),f'{width}: manager can retry after rejection')
            checks.check(len(attempts)==1 and attempts[0]['status']=='issued',f'{width}: rejected mutation is not automatically replayed')
            checks.check('issue_payment_required' not in page.locator('.toast').last.inner_text(),f'{width}: technical code is translated')
            checks.check(smoke.no_horizontal_overflow(page),f'{width}: no horizontal overflow')
            checks.check(not errors,f'{width}: no runtime errors {errors}')
            checks.screenshot(page,f'issue-rejected-{width}.png')
        finally:context.close()
    browser.close()
result={'passed':checks.passed,'failed':checks.failed};checks.artifacts.mkdir(parents=True,exist_ok=True);(checks.artifacts/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));raise SystemExit(bool(checks.failed))
