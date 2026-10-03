"""Reject runtime/hydration errors on the exported public routes, including slow JS."""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree

from playwright.sync_api import sync_playwright
from e2e_smoke import SUPABASE_HOST, make_api_handler, static_server

PROJECT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='hydration-test-results')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    artifacts = Path(args.artifacts).resolve()
    artifacts.mkdir(parents=True, exist_ok=True)
    routes = [urlparse(e.text).path for e in ElementTree.parse(root / 'sitemap.xml').iter()
              if e.tag.endswith('loc')]
    config = json.loads((PROJECT / 'config/vacleaner.json').read_text())
    results = []
    with static_server(root) as base, sync_playwright() as playwright:
        options = {'headless': True, 'args': ['--no-sandbox']}
        executable = os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if executable:
            options['executable_path'] = executable
        elif Path('/usr/bin/chromium').exists():
            options['executable_path'] = '/usr/bin/chromium'
        browser = playwright.chromium.launch(**options)
        for width, slow in [(1440, False), (390, False), (390, True)]:
            context = browser.new_context(viewport={'width': width, 'height': 844})
            api = make_api_handler(config)

            def route_handler(route):
                url = route.request.url
                if url.startswith(SUPABASE_HOST):
                    api(route)
                elif url.startswith(base):
                    if slow and any(chunk in url for chunk in ['01pb0x0z72e41.js', '146ntlcv_t6~w-v4041.js', '0x2bx8kerxrmz.js']):
                        time.sleep(0.4)
                    route.continue_()
                else:
                    route.abort()

            context.route('**/*', route_handler)
            page = context.new_page()
            for route in (routes if not slow else ['/', '/bronuvannia/', '/komplekty/', '/rishennia/textile/']):
                errors = []
                def on_error(error):
                    errors.append(str(error))
                page.on('pageerror', on_error)
                response = page.goto(base + route, wait_until='networkidle')
                if page.locator('script[src*="/assets/public-hydration.js"]').count():
                    page.wait_for_selector('html[data-vacleaner-hydrated="1"]', state='attached')
                if route == '/bronuvannia/':
                    page.wait_for_selector('.vx-smart-entry')
                    # Exercise React state after the DOM enhancements attach too.
                    page.locator('[data-vx-task="mattress"]').click()
                    page.locator('.booking-products button[data-product-code="puzzi_jimmy"]').click()
                page.wait_for_timeout(100)
                pending = page.locator('script[type="application/x-vacleaner-after-hydration"]').count()
                result = {'route': route, 'width': width, 'slowScripts': slow,
                          'status': response.status, 'errors': [str(e) for e in errors],
                          'pendingEnhancements': pending}
                result['passed'] = response.status == 200 and not errors and pending == 0
                results.append(result)
                page.remove_listener('pageerror', on_error)
                if not result['passed']:
                    page.screenshot(path=str(artifacts / f'failure-{len(results)}.png'))
                print(f"{'PASS' if result['passed'] else 'FAIL'} {width} slow={slow} {route}", flush=True)
            context.close()
        browser.close()
    summary = {'passed': sum(r['passed'] for r in results),
               'failed': [r for r in results if not r['passed']], 'results': results}
    (artifacts / 'result.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps({'passed': summary['passed'], 'failed': len(summary['failed'])}))
    return 1 if summary['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
