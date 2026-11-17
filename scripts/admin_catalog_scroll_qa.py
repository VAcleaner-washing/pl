"""Check that the real admin price editor can reach its final field above the pinned footer.

Read-only fixture: no network writes or production mutations.
"""
import argparse
import json
import traceback
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

import e2e_smoke as smoke
import admin_idle_qa as idle
from admin_entrypoint_finance_qa import pages_server


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--browser', choices=('webkit', 'chromium'), default='webkit')
    parser.add_argument('--artifacts', default='catalog-scroll-test-results')
    args = parser.parse_args()
    root, artifacts = Path(args.root).resolve(), Path(args.artifacts).resolve()
    artifacts.mkdir(parents=True, exist_ok=True)
    config = json.loads((smoke.PROJECT_ROOT/'config/vacleaner.json').read_text())
    results = []
    with pages_server(root) as base, sync_playwright() as pw:
        browser = getattr(pw, args.browser).launch(headless=True, **({'args': ['--no-sandbox']} if args.browser == 'chromium' else {}))
        for width, height in ((320, 720), (390, 844), (440, 956), (956, 440)):
            errors, forbidden = [], []
            device = {k: v for k, v in pw.devices['iPhone 17 Pro Max'].items() if k != 'default_browser_type'}
            device.update(viewport={'width': width, 'height': height}, service_workers='block', timezone_id='Europe/Kyiv')
            context = browser.new_context(**device)
            context.add_init_script(smoke.session_script() + "Object.defineProperty(navigator,'standalone',{value:true});")
            handler = idle.fixtures(config, 21, 7, forbidden)
            smoke.install_routes(context, base, handler)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            label = f'{args.browser}-{width}x{height}'
            try:
                page.goto(base+'/admin/bronuvannia/', wait_until='domcontentloaded')
                page.wait_for_selector('#view .booking-card,#view .upcoming-row')
                if width <= 900:
                    page.evaluate("document.documentElement.style.setProperty('--pwa-safe-top','59px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')")
                idle.navigate(page, 'equipment')
                page.locator('#editPrices').click()
                form = page.locator('#catalogForm')
                expect(form).to_be_visible()
                expect(form.locator('header .admin-screen-back')).to_be_visible()
                last = form.locator('[name=packet]')
                expect(last).to_have_count(1)
                scroll = form.locator(':scope > .catalog-scroll')
                before = scroll.evaluate('el=>({top:el.scrollTop,available:el.scrollHeight-el.clientHeight,overflow:getComputedStyle(el).overflowY})')
                assert before['available'] > 150, f'No internal overflow: {before}'
                assert before['overflow'] in ('scroll', 'auto'), before
                last.scroll_into_view_if_needed()
                geom = page.evaluate("""() => {
                  const scroll=document.querySelector('#catalogForm > .catalog-scroll');
                  const last=document.querySelector('#catalogForm [name=packet]');
                  const footer=document.querySelector('#catalogForm > footer');
                  const header=document.querySelector('#catalogForm > header');
                  const r=last.getBoundingClientRect(),f=footer.getBoundingClientRect(),h=header.getBoundingClientRect();
                  return {top:scroll.scrollTop,limit:scroll.scrollHeight-scroll.clientHeight,lastBottom:r.bottom,footerTop:f.top,lastTop:r.top,headerBottom:h.bottom,viewport:innerHeight};
                }""")
                assert geom['top'] > 0, geom
                assert geom['lastBottom'] <= geom['footerTop']-1, geom
                assert geom['lastTop'] >= geom['headerBottom']-1, geom
                last.focus()
                # iOS visual keyboard shrinks the viewport; contents must remain scrollable.
                page.set_viewport_size({'width': width, 'height': max(420, height-180)})
                last.scroll_into_view_if_needed()
                resized = page.evaluate("""() => {
                  const scroll=document.querySelector('#catalogForm > .catalog-scroll');
                  const r=document.querySelector('#catalogForm [name=packet]').getBoundingClientRect();
                  const f=document.querySelector('#catalogForm > footer').getBoundingClientRect();
                  return {canScroll:scroll.scrollHeight>scroll.clientHeight,visible:r.bottom<=f.top-1,position:scroll.scrollTop};
                }""")
                assert resized['canScroll'] and resized['visible'], resized
                assert not forbidden, forbidden
                assert not errors, errors
                page.screenshot(path=str(artifacts/f'{label}-last-field.png'))
                results.append({'case':label,'passed':True,'before':before,'after':geom,'keyboard':resized})
                print('PASS '+label+' price editor fully scrolls to final field, including resized viewport',flush=True)
            except Exception:
                details = traceback.format_exc()
                print('FAIL '+label+' '+details,flush=True)
                try:
                    page.screenshot(path=str(artifacts/f'{label}-failure.png'))
                except Exception:
                    pass
                results.append({'case':label,'passed':False,'error':details})
            finally:
                context.close()
        browser.close()
    (artifacts/'result.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    return int(any(not row['passed'] for row in results))


if __name__=='__main__':
    raise SystemExit(main())
