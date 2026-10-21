"""Measure real shipped startup with delayed, isolated API reads; never live writes."""
import argparse
import json
import os
import statistics
from pathlib import Path

from playwright.sync_api import sync_playwright
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import api_handler, pages_server


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='pwa-test-results/startup')
    parser.add_argument('--baseline', action='store_true')
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    samples = []
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as playwright:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        executable = os.environ.get(f'PLAYWRIGHT_{args.browser.upper()}_EXECUTABLE')
        if executable:
            options['executable_path'] = executable
        browser = getattr(playwright, args.browser).launch(**options)
        for width in [390, 1440]:
            for iteration in range(3):
                context = browser.new_context(viewport={'width': width, 'height': 1000}, service_workers='block')
                context.add_init_script(smoke.session_script() + r'''
                  const originalFetch=window.fetch.bind(window);
                  window.__startup={calls:[],ready:null,settingsResolved:false};
                  window.fetch=async function(input,options){
                    const url=String(input),settings=url.includes('/vacleaner-settings'),
                      business=/vacleaner-admin-(data|bookings)/.test(url);
                    if(!settings&&!business)return originalFetch(input,options);
                    const started=performance.now();
                    window.__startup.started??=started;
                    window.__startup.calls.push({settings,action:options?.body?JSON.parse(options.body).action:'settings',started,beforeSettings:!window.__startup.settingsResolved});
                    // Reproduce focus/pageshow while the first data load is outstanding.
                    if(window.__startup.calls.length===1)setTimeout(()=>{
                      window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'));
                    },100);
                    const [response]=await Promise.all([originalFetch(input,options),new Promise(resolve=>setTimeout(resolve,settings?500:800))]);
                    if(settings)window.__startup.settingsResolved=true;
                    return response;
                  };
                  new MutationObserver(()=>{
                    if(window.__startup.ready===null&&document.querySelector('#view .booking-card,#view .upcoming-row'))
                      window.__startup.ready=performance.now();
                  }).observe(document,{subtree:true,childList:true});
                ''')
                smoke.install_routes(context, base, api_handler(config))
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + '/admin/bronuvannia/#bookings', wait_until='domcontentloaded')
                page.wait_for_selector('#pageTitle')
                page.wait_for_selector('#view .booking-card,#view .upcoming-row')
                page.wait_for_function('() => window.__startup.ready !== null')
                page.wait_for_timeout(300)
                metrics = page.evaluate('window.__startup')
                metrics.update(width=width, iteration=iteration, data_ms=round(metrics['ready']-metrics['started']))
                samples.append(metrics)
                label = f'{width}/{iteration}'
                if not args.baseline:
                    protected = [x for x in metrics['calls'] if not x['settings']]
                    settings = [x for x in metrics['calls'] if x['settings']]
                    checks.check(len(protected) == 5 and len(settings) == 1, label + ': one coherent read despite focus/pageshow ' + repr(metrics['calls']))
                    checks.check(all(x['beforeSettings'] for x in protected), label + ': all business reads start before settings finishes')
                    checks.check(smoke.no_horizontal_overflow(page), label + ': no overflow')
                    checks.check(not errors, label + ': no runtime errors ' + repr(errors))
                    # A genuine subsequent focus must still refresh from the API.
                    page.evaluate("window.dispatchEvent(new Event('focus'))")
                    page.wait_for_function('() => window.__startup.calls.length === 7')
                    page.wait_for_timeout(900)
                    checks.check(page.evaluate('window.__startup.calls.length') == 7, label + ': subsequent focus sends one live read')
                if iteration == 0:
                    checks.screenshot(page, f'{width}-bookings.png')
                context.close()
        browser.close()
    result = {'browser': args.browser, 'baseline': args.baseline, 'median_data_ms': statistics.median(s['data_ms'] for s in samples), 'samples': samples, 'passed': checks.passed, 'failed': checks.failed}
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    (checks.artifacts / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: value for key, value in result.items() if key != 'samples'}))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
