"""Real service-worker lifecycle against a local Pages server and isolated APIs."""
import argparse
import hashlib
import json
import os
import socket
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
    def translate_path(self, path):
        # Migration tests change only the served artifact, retaining the origin.
        self.directory = str(self.server.root)
        return super().translate_path(path)

    def transport_disconnected(self):
        if not self.server.disconnected:
            return False
        self.close_connection = True
        try:
            self.connection.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        self.connection.close()
        return True

    def fixture_api(self):
        if not self.path.startswith('/__api/'):
            return False
        self.server.api_calls.append(self.path)
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length)) if length else None
        self.server.api_actions.append({'path': self.path, 'method': self.command,
                                        'action': body.get('action') if isinstance(body, dict) else None})

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
        if self.transport_disconnected():
            return
        if not self.fixture_api():
            self.send_error(404)

    def do_GET(self):
        if self.transport_disconnected():
            return
        if urlsplit(self.path).path == '/__qa-bootstrap/':
            body = b'<!doctype html><title>PWA acceptance bootstrap</title>'
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
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
    server.disconnected = False
    server.reads = []
    server.api_calls = []
    server.api_actions = []
    server.api = api_handler(config)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server, f'http://127.0.0.1:{server.server_port}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


FETCH_PROXY = '''
      // API fixture responses come from real same-origin HTTP, never a remote API.
      const fixtureFetch=window.fetch.bind(window);
      window.fetch=(input,options)=>{
        const url=typeof input==='string'||input instanceof URL?String(input):input.url;
        const origin='https://yweluzclearwrazdkahu.supabase.co';
        if(url.startsWith(origin)){
          const next='/__api'+url.slice(origin.length);
          return fixtureFetch(input instanceof Request?new Request(next,input):next,options);
        }
        return fixtureFetch(input,options);
      };
'''


def block_external_requests(context, base, unexpected):
    def guard(route):
        if route.request.url.startswith(base + '/'):
            return route.continue_()
        unexpected.append(route.request.url)
        return route.abort()
    context.route('**/*', guard)


def context_options(width, devices=None):
    options = {'viewport': {'width': width, 'height': 1000}, 'service_workers': 'allow'}
    if width == 440 and devices:
        options.update({key: value for key, value in devices['iPhone 17 Pro Max'].items()
                        if key != 'default_browser_type'})
        options['viewport'] = {'width': 440, 'height': 956}
    return options


def set_transport(context, server, browser_name, disconnected):
    # Linux WebKit's offline override rejects navigation before worker dispatch.
    # Drop real HTTP sockets instead; API and shell requests both lose transport.
    if browser_name == 'webkit':
        server.disconnected = disconnected
    else:
        context.set_offline(disconnected)


def exercise(browser, server, base, config, checks, width, browser_name='chromium', devices=None):
    context = browser.new_context(**context_options(width, devices))
    context.add_init_script(FETCH_PROXY)
    if width == 440:
        context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
    unexpected = []
    block_external_requests(context, base, unexpected)
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    calls = server.api_calls
    page = context.new_page()
    errors = []
    diagnostics = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: diagnostics.append(message.text))
    page.on('requestfailed', lambda request: diagnostics.append(request.url + ': ' + str(request.failure)))
    label = str(width)
    try:
        # Seed only once so offline/reload assertions cannot pass by silently
        # recreating a session that the application lost.
        page.goto(base + '/__qa-bootstrap/')
        page.evaluate('()=>{' + smoke.session_script() + '}')
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
        set_transport(context, server, browser_name, True)
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
        set_transport(context, server, browser_name, False)
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
        set_transport(context, server, browser_name, True)
        page.reload(wait_until='domcontentloaded')
        expect(page.locator('#retryLoad')).to_be_visible()
        checks.check(page.evaluate("!!localStorage.getItem('vacleaner_session')"), label + ': offline preserves remembered session')
        checks.check(page.locator('.booking-card').count() == 0, label + ': offline never fabricates cached rentals')
        checks.screenshot(page, label + '-offline.png')
        set_transport(context, server, browser_name, False)
        # Online recovery may run automatically; click retry only if still needed.
        if page.locator('#retryLoad').is_visible():
            page.locator('#retryLoad').click()
        page.wait_for_function("() => document.querySelector('#view')?.getAttribute('aria-busy') !== 'true' && !document.querySelector('#retryLoad')")

        # A changed worker installs and waits; the active controller remains old.
        server.next_build = server.build + 1
        page.evaluate('navigator.serviceWorker.getRegistration().then(reg=>reg.update())')
        page.wait_for_function('async () => navigator.serviceWorker.getRegistration().then(reg=>!!reg.waiting)', timeout=30000)
        # Worker installation and the recovering page bootstrap settle independently.
        expect(page.locator('.pwa-update-prompt')).to_be_visible(timeout=30000)
        checks.check(page.evaluate('navigator.serviceWorker.getRegistration().then(reg=>reg.active !== reg.waiting && !!reg.waiting)'), label + ': update waits while current app remains active')
        # A real booking form hides the prompt and protects its inputs.
        mobile_new = page.locator('#mobileNewBooking')
        (mobile_new if mobile_new.is_visible() else page.locator('#newBooking')).click()
        expect(page.locator('#bookingForm')).to_be_visible()
        expect(page.locator('.pwa-update-prompt')).not_to_be_visible()
        checks.screenshot(page, label + '-update-during-form.png')
        page.keyboard.press('Escape')
        expect(page.locator('#bookingForm')).to_have_count(0)
        expect(page.locator('.pwa-update-prompt')).to_be_visible(timeout=30000)
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
        checks.check(not unexpected, label + ': no external request was forwarded ' + repr(unexpected))
        checks.artifacts.mkdir(parents=True, exist_ok=True)
        (checks.artifacts / (label + '-warm-requests.json')).write_text(json.dumps({'server': warm_reads, 'responses': assets, 'cache': cache_urls}, indent=2) + '\n')
    except Exception as error:
        checks.check(False, label + ': ' + str(error) + ' diagnostics=' + repr(diagnostics) + ' api=' + repr(calls[-20:]) + ' server=' + repr(server.reads[-40:]))
        checks.capture_failure(page, label)
    finally:
        server.next_build = None
        server.disconnected = False
        checks.artifacts.mkdir(parents=True, exist_ok=True)
        context.tracing.stop(path=str(checks.artifacts / (label + '-cache-trace.zip')))
        context.close()


def verify_stable_tree(root):
    manifest = json.loads((smoke.PROJECT_ROOT / 'docs/stable-4346-manifest.json').read_text())
    release = json.loads((root / 'release.json').read_text())
    if manifest['commit'] != '15bf61dc4da4cf63405a25887353e6ec7178dce8' or release['build'] != 4346:
        raise ValueError('The exact verified stable46 artifact is required')
    actual = {str(file.relative_to(root)).replace('\\', '/'): hashlib.sha256(file.read_bytes()).hexdigest()
              for file in root.rglob('*') if file.is_file()}
    if actual != manifest['files']:
        raise ValueError('Stable46 artifact differs from its immutable270-file manifest')
    return {'commit': manifest['commit'], 'files': len(actual), 'allFileHashesMatch': True}


def exercise_release_migration(browser, server, base, candidate_root, stable_root, checks, width, devices=None):
    candidate_build = json.loads((candidate_root / 'release.json').read_text())['build']
    context = browser.new_context(**context_options(width, devices))
    context.add_init_script(FETCH_PROXY)
    if width == 440:
        context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
    unexpected, errors = [], []
    block_external_requests(context, base, unexpected)
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    label = str(width) + '-46-candidate-46'
    api_start = len(server.api_actions)
    worker_reads = []

    def ready(build, operations):
        expect(page.locator('#pageTitle')).to_be_visible()
        expect(page.locator('#view .booking-card,#view .upcoming-row').first).to_be_visible()
        page.wait_for_function('''async build=>{
          const registration=await navigator.serviceWorker.getRegistration('/admin/');
          return !!navigator.serviceWorker.controller&&registration?.active?.state==='activated'&&
            (await caches.keys()).includes('vacleaner-manager-'+build);
        }''', arg=build)
        snapshot = page.evaluate('''async()=>{
          const urls=[...document.querySelectorAll('script[src^="/assets/"],link[href^="/assets/"]')].map(node=>node.src||node.href);
          const cacheUrls=[];for(const key of await caches.keys())for(const request of await(await caches.open(key)).keys())cacheUrls.push(request.url);
          const current=await caches.open('vacleaner-manager-'+new URL(urls[0]).searchParams.get('v'));
          const missing=[];for(const url of urls)if(!await current.match(url))missing.push(url);
          const session=JSON.parse(localStorage.getItem('vacleaner_session')||'null');
          return {operations:document.documentElement.dataset.adminUi==='operations',urls,cacheUrls,missing,
            session:{access:session?.access_token,refresh:session?.refresh_token,user:session?.user?.id},
            persistent:localStorage.getItem('vacleaner_session_persistent'),sentinel:localStorage.getItem('pwa_migration_sentinel')};
        }''')
        checks.check(snapshot['operations'] == operations and all(urlsplit(url).query == 'v=' + str(build) for url in snapshot['urls']),
                     label + ': exact HTML/runtime build and UI identity ' + str(build))
        checks.check(not snapshot['missing'], label + ': every actual HTML asset is precached for ' + str(build) + repr(snapshot['missing']))
        checks.check(snapshot['session'] == expected_session and snapshot['persistent'] == '1' and snapshot['sentinel'] == 'preserve-through-upgrade-and-rollback',
                     label + ': original Auth and local state survive ' + str(build))
        checks.check(not any('/__api/' in url or '/functions/' in url or '/auth/' in url for url in snapshot['cacheUrls']),
                     label + ': no business/Auth response is cached at ' + str(build))
        body = page.evaluate("async()=>await(await fetch('/admin/sw.js?migration-readback='+Date.now(),{cache:'no-store'})).text()")
        actual_hash = hashlib.sha256(body.encode()).hexdigest()
        expected_hash = hashlib.sha256((server.root / 'admin/sw.js').read_bytes()).hexdigest()
        checks.check(actual_hash == expected_hash, label + ': HTTP serves exact reviewed worker bytes ' + str(build))
        worker_reads.append({'build': build, 'httpWorkerSha256': actual_hash, 'expectedWorkerSha256': expected_hash})
        checks.screenshot(page, label + '-build-' + str(build) + '.png')

    def transition(target, build):
        server.root = target
        server.build = build
        page.evaluate('navigator.serviceWorker.getRegistration("/admin/").then(registration=>registration.update())')
        page.wait_for_function('async()=>!!(await navigator.serviceWorker.getRegistration("/admin/"))?.waiting')
        expect(page.locator('.pwa-update-prompt')).to_be_visible()
        checks.check(True, label + ': actual worker ' + str(build) + ' waits for explicit activation')
        mobile = page.locator('#mobileNewBooking')
        (mobile if mobile.is_visible() else page.locator('#newBooking')).click()
        form = page.locator('#bookingForm')
        expect(form).to_be_visible()
        date = form.locator('[name=startDate]')
        date.fill(smoke.iso(4))
        expect(date).to_have_value(smoke.iso(4))
        expect(page.locator('.pwa-update-prompt')).not_to_be_visible()
        checks.check(True, label + ': waiting update preserves a real draft before ' + str(build))
        page.keyboard.press('Escape')
        if page.locator('#labLeaveDialog').is_visible():
            page.locator('#labLeaveDialog [data-lab-keep]').click()
            expect(date).to_have_value(smoke.iso(4))
            page.keyboard.press('Escape')
            page.locator('#labLeaveDialog [data-lab-discard]').click()
        expect(form).not_to_be_attached()
        expect(page.locator('.pwa-update-now')).to_be_visible()
        with page.expect_navigation(wait_until='domcontentloaded'):
            page.locator('.pwa-update-now').click()
        ready(build, build != 4346)

    try:
        server.root = stable_root
        server.build = 4346
        # Seed once on a same-origin inert document. No init script reseeds Auth
        # during reloads: losing the real session would therefore fail the test.
        page.goto(base + '/__qa-bootstrap/')
        page.evaluate('()=>{' + smoke.session_script() +
                      "localStorage.setItem('pwa_migration_sentinel','preserve-through-upgrade-and-rollback');}")
        expected_session = page.evaluate("()=>{const s=JSON.parse(localStorage.getItem('vacleaner_session'));return{access:s.access_token,refresh:s.refresh_token,user:s.user.id}}")
        page.goto(base + '/admin/bronuvannia/')
        ready(4346, False)
        transition(candidate_root, candidate_build)
        transition(stable_root, 4346)
        checks.check(not errors, label + ': no uncaught errors during real upgrade/rollback ' + repr(errors))
        checks.check(not unexpected, label + ': no external request forwarded ' + repr(unexpected))
        reads = {'list', 'clients', 'campaigns', 'calendar', 'referrals_expiring', 'referral_analytics', 'lookup_customer', 'pending_bonus', 'health', 'audit_log'}
        calls = server.api_actions[api_start:]
        writes = [call for call in calls if call['method'] == 'POST' and call['action'] not in reads]
        checks.check(not writes, label + ': no booking/customer/finance mutation requested ' + repr(writes))
    except Exception as error:
        checks.check(False, label + ': ' + str(error))
        checks.capture_failure(page, label)
    finally:
        server.root = candidate_root
        server.build = candidate_build
        server.next_build = None
        server.disconnected = False
        checks.artifacts.mkdir(parents=True, exist_ok=True)
        (checks.artifacts / (label + '-workers.json')).write_text(json.dumps(worker_reads, indent=2) + '\n')
        context.tracing.stop(path=str(checks.artifacts / (label + '-trace.zip')))
        context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='pwa-test-results/cache')
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    parser.add_argument('--width', type=int, choices=[390, 440, 1440])
    parser.add_argument('--stable-root', help='Exact stable46 artifact for same-origin upgrade/rollback acceptance')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    candidate_root = Path(args.root).resolve()
    stable_root = Path(args.stable_root).resolve() if args.stable_root else None
    stable = verify_stable_tree(stable_root) if stable_root else None
    widths = [args.width] if args.width else [390, 1440]
    with worker_server(candidate_root, config) as (server, base), sync_playwright() as playwright:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        executable = os.environ.get('PLAYWRIGHT_' + args.browser.upper() + '_EXECUTABLE')
        if executable:
            options['executable_path'] = executable
        browser = getattr(playwright, args.browser).launch(**options)
        for width in widths:
            exercise(browser, server, base, config, checks, width, args.browser, playwright.devices)
            if stable_root:
                exercise_release_migration(browser, server, base, candidate_root, stable_root, checks, width, playwright.devices)
        browser.close()
    result = {'browser': args.browser, 'widths': widths, 'passed': checks.passed, 'failed': checks.failed,
              'stableArtifact': stable, 'productionWrites': 0, 'physicalDevice': False,
              'network': 'API fixtures served on the same local HTTP origin; external page requests aborted'}
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    (checks.artifacts / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
