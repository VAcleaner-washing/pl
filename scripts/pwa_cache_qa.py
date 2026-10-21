"""Real service-worker lifecycle against a local Pages server and isolated APIs."""
import argparse
import json
import os
import threading
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import PagesHandler, api_handler


class WorkerHandler(PagesHandler):
    def fixture_api(self):
        if not self.path.startswith('/__api/'):
            return False
        self.server.api_calls.append(self.path)
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length)) if length else None

        def fulfill(status=200, content_type='application/json', body='', **_kwargs):
            encoded = body.encode()
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        self.server.api(SimpleNamespace(request=SimpleNamespace(url=smoke.SUPABASE_HOST + self.path[len('/__api'):], post_data_json=body, post_data=json.dumps(body) if body else None), fulfill=fulfill))
        return True

    def do_POST(self):
        if not self.fixture_api():
            self.send_error(404)

    def do_GET(self):
        if self.fixture_api():
            return
        self.server.reads.append(self.path)
        path = urlsplit(self.path).path
        # Serve a coherent future HTML/runtime/worker fixture without live deploys.
        candidate = self.server.root / path.lstrip('/')
        if path.rstrip('/') == '/admin/bronuvannia':
            candidate = self.server.root / 'admin/bronuvannia/index.html'
        if self.server.next_build and candidate.is_file() and candidate.suffix in {'.html', '.js', '.css'}:
            text = candidate.read_text()
            if path == '/admin/sw.js':
                text = text.replace(str(self.server.build), str(self.server.next_build))
            else:
                text = text.replace('?v=' + str(self.server.build), '?v=' + str(self.server.next_build)).replace("PWA_BUILD='" + str(self.server.build) + "'", "PWA_BUILD='" + str(self.server.next_build) + "'")
            body = text.encode()
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(str(candidate)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


@contextmanager
def worker_server(root, config):
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(WorkerHandler, directory=str(root)))
    server.root = root
    server.build = json.loads((root / 'release.json').read_text())['build']
    server.next_build = None
    server.reads = []
    server.api_calls = []
    server.api = api_handler(config)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server, f'http://127.0.0.1:{server.server_port}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def exercise(browser, server, base, config, checks, width):
    context = browser.new_context(viewport={'width': width, 'height': 1000}, service_workers='allow')
    context.add_init_script(smoke.session_script() + '''
      // Serve isolated API fixtures over real local HTTP, without browser routing.
      const fixtureFetch=window.fetch.bind(window);
      window.fetch=(input,options)=>{
        const url=String(input),origin='https://yweluzclearwrazdkahu.supabase.co';
        return fixtureFetch(url.startsWith(origin)?'/__api'+url.slice(origin.length):input,options);
      };
    ''')
    calls = server.api_calls
    page = context.new_page()
    errors = []
    diagnostics = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: diagnostics.append(message.text))
    page.on('requestfailed', lambda request: diagnostics.append(request.url + ': ' + str(request.failure)))
    label = str(width)
    try:
        page.goto(base + '/admin/bronuvannia/', wait_until='domcontentloaded')
        page.wait_for_selector('#pageTitle')
        page.wait_for_function('async () => !!(await navigator.serviceWorker.getRegistration())?.active')
        page.wait_for_function('() => !!navigator.serviceWorker.controller')
        coverage = page.evaluate('''async()=>{
          const required=[...document.querySelectorAll('script[src^="/assets/"],link[href^="/assets/"]')].map(el=>el.src||el.href);
          const cache=await caches.open('vacleaner-manager-'+new URL(required[0]).searchParams.get('v'));
          const missing=[];for(const url of required)if(!await cache.match(url))missing.push(url);
          return {count:required.length,missing};
        }''')
        checks.check(coverage['count'] >= 35 and not coverage['missing'], label + ': first install precaches all shipped JS/CSS ' + repr(coverage))
        # Test the first offline launch before any controlled online reload can prime caches.
        context.set_offline(True)
        first_offline = []
        def offline_response(response):
            if '/assets/' in response.url:
                first_offline.append({'status': response.status, 'worker': response.from_service_worker})
        page.on('response', offline_response)
        page.reload(wait_until='load')
        expect(page.locator('#retryLoad')).to_be_visible()
        checks.check(len(first_offline) >= 35 and all(r['status'] == 200 and r['worker'] for r in first_offline), label + ': first offline launch serves every JS/CSS successfully')
        checks.check(page.evaluate("!!localStorage.getItem('vacleaner_session')"), label + ': first offline launch preserves session')
        checks.screenshot(page, label + '-first-offline.png')
        page.remove_listener('response', offline_response)
        context.set_offline(False)
        page.reload(wait_until='load')
        page.wait_for_function("() => document.querySelector('#view')?.getAttribute('aria-busy') !== 'true'")
        page.wait_for_timeout(300)
        before = len(server.reads)
        api_before = len(calls)
        responses = []
        page.on('response', lambda response: responses.append({'url': response.url, 'worker': response.from_service_worker}))
        page.reload(wait_until='load')
        page.wait_for_function("() => document.querySelector('#view')?.getAttribute('aria-busy') !== 'true'")
        page.wait_for_timeout(300)
        warm_reads = server.reads[before:]
        assets = [r for r in responses if '/assets/' in r['url'] and ('?v=' + str(server.build)) in r['url']]
        server_assets = [r for r in warm_reads if r.startswith('/assets/') and ('?v=' + str(server.build)) in r]
        checks.check(len(assets) >= 35 and all(r['worker'] for r in assets), label + ': all 35 shipped JS/CSS are worker-served')
        checks.check(not server_assets, label + ': warm versioned assets require zero server GETs ' + repr(server_assets))
        checks.check(any(r.startswith('/admin/bronuvannia/') for r in warm_reads), label + ': HTML still fetched from server')
        checks.check(len(calls) >= api_before + 6, label + ': settings and business data still read from API')
        cache_urls = page.evaluate('''async()=>{const keys=await caches.keys();const result=[];for(const key of keys)for(const request of await(await caches.open(key)).keys())result.push(request.url);return result}''')
        checks.check(not any('/functions/' in url or '/auth/' in url for url in cache_urls), label + ': no API/Auth response in Cache Storage')
        checks.check(smoke.no_horizontal_overflow(page), label + ': no overflow')
        checks.check(page.locator('#view .booking-card,#view .upcoming-row').count() >= 2, label + ': real fixture rentals rendered')
        checks.screenshot(page, label + '-warm.png')

        # Offline app shell must load; business data must fail explicitly.
        context.set_offline(True)
        page.reload(wait_until='domcontentloaded')
        expect(page.locator('#retryLoad')).to_be_visible()
        checks.check(page.evaluate("!!localStorage.getItem('vacleaner_session')"), label + ': offline preserves remembered session')
        checks.check(page.locator('.booking-card').count() == 0, label + ': offline never fabricates cached rentals')
        checks.screenshot(page, label + '-offline.png')
        context.set_offline(False)
        # Online recovery may run automatically; click retry only if still needed.
        if page.locator('#retryLoad').is_visible():
            page.locator('#retryLoad').click()
        page.wait_for_function("() => document.querySelector('#view')?.getAttribute('aria-busy') !== 'true' && !document.querySelector('#retryLoad')")

        # A changed worker installs and waits; the active controller remains old.
        server.next_build = server.build + 1
        page.evaluate('navigator.serviceWorker.getRegistration().then(reg=>reg.update())')
        page.wait_for_function('async () => navigator.serviceWorker.getRegistration().then(reg=>!!reg.waiting)', timeout=30000)
        expect(page.locator('.pwa-update-prompt')).to_be_visible()
        checks.check(page.evaluate('navigator.serviceWorker.getRegistration().then(reg=>reg.active !== reg.waiting && !!reg.waiting)'), label + ': update waits while current app remains active')
        # A real booking form hides the prompt and protects its inputs.
        mobile_new = page.locator('#mobileNewBooking')
        (mobile_new if mobile_new.is_visible() else page.locator('#newBooking')).click()
        expect(page.locator('#bookingForm')).to_be_visible()
        expect(page.locator('.pwa-update-prompt')).not_to_be_visible()
        checks.screenshot(page, label + '-update-during-form.png')
        page.keyboard.press('Escape')
        expect(page.locator('#bookingForm')).to_have_count(0)
        expect(page.locator('.pwa-update-prompt')).to_be_visible()
        page.locator('.pwa-update-later').click()
        checks.check(page.evaluate('navigator.serviceWorker.getRegistration().then(reg=>!!reg.waiting)'), label + ': Later retains waiting worker')
        # Reopen the existing prompt via a page reload, then explicitly accept.
        page.evaluate("sessionStorage.removeItem('vac_pwa_update_later')")
        page.reload(wait_until='load')
        page.wait_for_function('async () => !!(await navigator.serviceWorker.getRegistration())?.waiting')
        expect(page.locator('.pwa-update-now')).to_be_visible(timeout=30000)
        with page.expect_navigation(wait_until='domcontentloaded'):
            page.locator('.pwa-update-now').click()
        page.wait_for_function('async () => navigator.serviceWorker.getRegistration().then(reg=>!reg.waiting && reg.active?.state === "activated")')
        checks.check(True, label + ': explicit update activates and reloads')
        checks.check(page.evaluate('''build=>[...document.querySelectorAll('script[src^="/assets/"],link[href^="/assets/"]')].every(el=>new URL(el.src||el.href).searchParams.get('v')===String(build))''', server.next_build), label + ': updated HTML references only the next build')
        checks.check(not errors, label + ': no runtime errors ' + repr(errors))
        checks.artifacts.mkdir(parents=True, exist_ok=True)
        (checks.artifacts / (label + '-warm-requests.json')).write_text(json.dumps({'server': warm_reads, 'responses': assets, 'cache': cache_urls}, indent=2) + '\n')
    except Exception as error:
        checks.check(False, label + ': ' + str(error) + ' diagnostics=' + repr(diagnostics) + ' api=' + repr(calls[-20:]) + ' server=' + repr(server.reads[-40:]))
        checks.capture_failure(page, label)
    finally:
        server.next_build = None
        context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='pwa-test-results/cache')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    with worker_server(Path(args.root).resolve(), config) as (server, base), sync_playwright() as playwright:
        options = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'):
            options['executable_path'] = os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
        browser = playwright.chromium.launch(**options)
        for width in [390, 1440]:
            exercise(browser, server, base, config, checks, width)
        browser.close()
    result = {'passed': checks.passed, 'failed': checks.failed}
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    (checks.artifacts / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
