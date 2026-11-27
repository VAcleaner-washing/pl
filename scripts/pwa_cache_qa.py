"""Real service-worker lifecycle against a local Pages server and isolated APIs."""
import argparse
import hashlib
import json
import os
import socket
import threading
from contextlib import contextmanager
from datetime import date, timedelta
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
                if self.server.defer_activation:
                    # Controlled waiting-worker fault, served only by this local
                    # fixture. The shipped worker/cache algorithm is unchanged.
                    original = "self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});"
                    assert text.count(original) == 1, 'worker activation fixture integration drift'
                    text = text.replace(original, '''let qaHoldActivation=true,qaActivationRequests=0;
self.addEventListener('message',event=>{
 if(event.data?.type==='QA_ACTIVATION_STATE')event.ports[0].postMessage({requests:qaActivationRequests,held:qaHoldActivation});
 if(event.data?.type==='QA_ALLOW_ACTIVATION')qaHoldActivation=false;
 if(event.data?.type==='QA_ACTIVATE_LATE'){qaHoldActivation=false;self.skipWaiting()}
 if(event.data?.type==='SKIP_WAITING'){qaActivationRequests++;if(!qaHoldActivation)self.skipWaiting()}
});''')
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
    server.defer_activation = False
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


WORKER_MONITOR_JS = r'''({phase,build})=>{
  const previous=window.__vacPwaWorkerMonitor;
  if(previous){previous.cancelled=true;cancelAnimationFrame(previous.frame)}
  const state={phase,build,pending:false,ready:false,error:null,last:null,cancelled:false,frame:null};
  window.__vacPwaWorkerMonitor=state;
  const describe=worker=>worker?{scriptURL:worker.scriptURL,state:worker.state}:null;
  const probe=async()=>{
    if(state.cancelled)return;
    state.pending=true;
    try{
      const registration=await navigator.serviceWorker.getRegistration('/admin/');
      const keys=await caches.keys(),key='vacleaner-manager-'+build;
      const urls=[...document.querySelectorAll('script[src^="/assets/"],link[href^="/assets/"]')].map(node=>node.src||node.href);
      const missing=[];
      if(keys.includes(key)){
        const cache=await caches.open(key);
        for(const url of urls)if(!await cache.match(url))missing.push(url);
      }else missing.push(...urls);
      const controller=describe(navigator.serviceWorker.controller),active=describe(registration?.active);
      const installing=describe(registration?.installing),waiting=describe(registration?.waiting);
      const olderCaches=keys.filter(value=>value.startsWith('vacleaner-manager-')&&value!==key);
      const scope=registration?.scope;
      const ownsController=Boolean(controller&&active&&scope===location.origin+'/admin/'&&controller.state==='activated'&&active.state==='activated'&&controller.scriptURL===active.scriptURL&&new URL(controller.scriptURL).origin===location.origin&&new URL(controller.scriptURL).pathname==='/admin/sw.js');
      const complete=ownsController&&keys.includes(key)&&olderCaches.length===0&&urls.length>=35&&missing.length===0&&urls.every(url=>new URL(url).search==='?v='+build);
      const ready=phase==='waiting'?waiting?.state==='installed':phase==='settled'?complete&&!installing&&!waiting:complete;
      const snapshot={phase,build,scope,controller,active,installing,waiting,cacheKeys:keys,olderCaches,requiredAssets:urls.length,missing,ready:Boolean(ready)};
      if(state.cancelled)return;
      state.last=snapshot;state.ready=snapshot.ready;
    }catch(error){if(!state.cancelled)state.error=String(error)}
    finally{state.pending=false}
    if(!state.cancelled&&!state.ready&&!state.error)state.frame=requestAnimationFrame(probe);
  };
  probe();
}'''

WORKER_FLAG_JS = r'''()=>{
  const state=window.__vacPwaWorkerMonitor;
  if(state?.error)throw new Error(state.error);
  return state?.ready===true;
}'''

RELOAD_JOURNAL_JS = r'''(()=>{
  addEventListener('beforeunload',()=>{
    const asset=document.querySelector('script[src^="/assets/"]')?.src;
    if(!asset)return;
    const key='vac_pwa_qa_reload_events';
    const events=JSON.parse(sessionStorage.getItem(key)||'[]');
    events.push({build:new URL(asset).searchParams.get('v'),
      controllerState:navigator.serviceWorker.controller?.state||null});
    sessionStorage.setItem(key,JSON.stringify(events));
  });
})();'''


def wait_worker_state(page, phase, build):
    # Playwright's waitForFunction tests predicate truthiness before awaiting its
    # result. An async predicate therefore accepts Promise<false> immediately.
    # Run the awaited probe separately and poll only this synchronous bool flag.
    page.evaluate(WORKER_MONITOR_JS, {'phase': phase, 'build': build})
    try:
        page.wait_for_function(WORKER_FLAG_JS, timeout=30000)
        return page.evaluate('()=>window.__vacPwaWorkerMonitor.last')
    except Exception as error:
        try:
            snapshot = page.evaluate('()=>window.__vacPwaWorkerMonitor.last')
        except Exception as diagnostic_error:
            snapshot = {'diagnosticError': str(diagnostic_error)}
        raise RuntimeError('Worker readiness deadline: ' + json.dumps(snapshot)) from error
    finally:
        try:
            page.evaluate('()=>{const state=window.__vacPwaWorkerMonitor;if(state){state.cancelled=true;cancelAnimationFrame(state.frame)}}')
        except Exception:
            pass


def verify_visible_version(page, checks, label, version, build):
    trigger = page.locator('.mobile-nav .more-nav')
    if not trigger.is_visible():
        return  # Desktop sidebar has no mobile More sheet.
    trigger.click()
    item = page.locator('.mobile-more-menu .pwa-app-version')
    expect(item).to_have_count(1)
    item.scroll_into_view_if_needed()
    expect(item).to_be_visible()
    expect(item).to_have_text(f'Версія {version} · build {build}')
    expect(item).to_have_attribute('data-pwa-version', str(version))
    expect(item).to_have_attribute('data-pwa-build', str(build))
    box = item.bounding_box()
    nav = page.locator('.mobile-nav').bounding_box()
    checks.check(box['x'] >= 0 and box['x'] + box['width'] <= page.viewport_size['width'] + 1 and box['y'] >= 0 and box['y'] + box['height'] <= nav['y'] + 1 and item.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)>=12'),
                 label + ': one readable running version/build in More, clear of navigation')
    checks.screenshot(page, label + '-version.png')
    trigger.click()
    expect(page.locator('.mobile-more-menu')).to_have_count(0)


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
        wait_worker_state(page, 'ready', server.build)
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
        checks.check(len(server_assets) >= 35 and set(r['url'].split('://', 1)[-1].split('/', 1)[-1] for r in assets).issubset(set(x.lstrip('/') for x in server_assets)), label + ': warm versioned assets refresh through network while remaining worker-served ' + repr(server_assets))
        checks.check(any(r.startswith('/admin/bronuvannia/') for r in warm_reads), label + ': HTML still fetched from server')
        checks.check(len(calls) >= api_before + 6, label + ': settings and business data still read from API')
        cache_urls = page.evaluate('''async()=>{const keys=await caches.keys();const result=[];for(const key of keys)for(const request of await(await caches.open(key)).keys())result.push(request.url);return result}''')
        checks.check(not any('/functions/' in url or '/auth/' in url for url in cache_urls), label + ': no API/Auth response in Cache Storage')
        checks.check(smoke.no_horizontal_overflow(page), label + ': no overflow')
        checks.check(page.locator('#view .booking-card,#view .upcoming-row').count() >= 2, label + ': real fixture rentals rendered')
        version = json.loads((server.root / 'release.json').read_text())['version']
        verify_visible_version(page, checks, label + '-online', version, server.build)
        checks.screenshot(page, label + '-warm.png')

        # Offline app shell must load; business data must fail explicitly.
        set_transport(context, server, browser_name, True)
        page.reload(wait_until='domcontentloaded')
        expect(page.locator('#retryLoad')).to_be_visible()
        checks.check(page.evaluate("!!localStorage.getItem('vacleaner_session')"), label + ': offline preserves remembered session')
        checks.check(page.locator('.booking-card').count() == 0, label + ': offline never fabricates cached rentals')
        verify_visible_version(page, checks, label + '-offline', version, server.build)
        checks.screenshot(page, label + '-offline.png')
        set_transport(context, server, browser_name, False)
        # Online recovery may run automatically; click retry only if still needed.
        if page.locator('#retryLoad').is_visible():
            page.locator('#retryLoad').click()
        page.wait_for_function("() => document.querySelector('#view')?.getAttribute('aria-busy') !== 'true' && !document.querySelector('#retryLoad')")

        # A changed worker installs and waits; the active controller remains old.
        server.next_build = server.build + 1
        page.evaluate('navigator.serviceWorker.getRegistration().then(reg=>reg.update())')
        wait_worker_state(page, 'waiting', server.next_build)
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
        wait_worker_state(page, 'waiting', server.next_build)
        expect(page.locator('.pwa-update-now')).to_be_visible(timeout=30000)
        with page.expect_navigation(wait_until='domcontentloaded'):
            page.locator('.pwa-update-now').click()
        wait_worker_state(page, 'settled', server.next_build)
        verify_visible_version(page, checks, label + '-updated', version, server.next_build)
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
    context.add_init_script(RELOAD_JOURNAL_JS)
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
        readiness = wait_worker_state(page, 'ready', build)
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
        worker_reads.append({'build': build, 'httpWorkerSha256': actual_hash, 'expectedWorkerSha256': expected_hash, 'readiness': readiness})
        checks.screenshot(page, label + '-build-' + str(build) + '.png')

    def transition(target, build):
        server.root = target
        server.build = build
        page.evaluate('navigator.serviceWorker.getRegistration("/admin/").then(registration=>registration.update())')
        wait_worker_state(page, 'waiting', build)
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
        reloads = page.evaluate("JSON.parse(sessionStorage.getItem('vac_pwa_qa_reload_events')||'[]')")
        candidate_reloads = [entry for entry in reloads if entry['build'] == str(candidate_build)]
        checks.check(bool(candidate_reloads) and all(entry['controllerState'] == 'activated' for entry in candidate_reloads),
                     label + ': outgoing candidate reload waits for activated controller ' + repr(candidate_reloads))
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
        try:
            reloads = page.evaluate("JSON.parse(sessionStorage.getItem('vac_pwa_qa_reload_events')||'[]')")
        except Exception as error:
            reloads = {'captureError': str(error)}
        (checks.artifacts / (label + '-reloads.json')).write_text(json.dumps(reloads, indent=2) + '\n')
        context.tracing.stop(path=str(checks.artifacts / (label + '-trace.zip')))
        context.close()


def activation_state(page):
    page.evaluate('''async()=>{
      const registration=await navigator.serviceWorker.getRegistration('/admin/');
      if(!registration?.waiting)throw Error('controlled waiting worker missing');
      window.__qaActivationReply=null;const channel=new MessageChannel();
      channel.port1.onmessage=event=>{window.__qaActivationReply=event.data;channel.port1.close()};
      registration.waiting.postMessage({type:'QA_ACTIVATION_STATE'},[channel.port2]);
    }''')
    page.wait_for_function('()=>window.__qaActivationReply!==null')
    return page.evaluate('()=>window.__qaActivationReply')


def exercise_update_recovery(browser, server, base, checks, width, devices=None):
    """Actual native worker withholding SKIP_WAITING; all APIs stay local."""
    context = browser.new_context(**context_options(width, devices))
    context.add_init_script(FETCH_PROXY)
    context.add_init_script(RELOAD_JOURNAL_JS)
    unexpected, errors, navigations = [], [], []
    block_external_requests(context, base, unexpected)
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('framenavigated', lambda frame: navigations.append(frame.url) if frame == page.main_frame else None)
    label = f'{width}-update-recovery'
    starting_actions = len(server.api_actions)
    try:
        page.goto(base + '/__qa-bootstrap/')
        page.evaluate('()=>{' + smoke.session_script() + '}')
        page.goto(base + '/admin/bronuvannia/')
        page.wait_for_selector('.booking-card,.upcoming-row')
        wait_worker_state(page, 'ready', server.build)
        server.defer_activation = True
        server.next_build = server.build + 1
        page.evaluate("navigator.serviceWorker.getRegistration('/admin/').then(reg=>reg.update())")
        wait_worker_state(page, 'waiting', server.next_build)
        expect(page.locator('.pwa-update-now')).to_be_visible()
        before = len(navigations)
        attempts_before = page.evaluate("JSON.parse(sessionStorage.getItem('vac_pwa_qa_reload_events')||'[]').length")
        page.locator('.pwa-update-now').dblclick()
        expect(page.locator('#layer form')).to_have_count(0)
        checks.check(True, label + ': pending panel shields underlying actions from the second click')
        page.wait_for_function("()=>document.querySelector('.pwa-update-now')?.disabled===false && [...document.querySelectorAll('.toast')].some(n=>n.textContent.includes('Оновлення не завершено'))")
        assert len(navigations) == before, 'activation timeout caused unconfirmed navigation'
        assert page.evaluate("JSON.parse(sessionStorage.getItem('vac_pwa_qa_reload_events')||'[]').length") == attempts_before, 'beforeunload blocked an unconfirmed reload attempt'
        held = activation_state(page)
        assert held == {'requests': 1, 'held': True}, held
        checks.check(True, label + ': actual waiting worker ignores activation; timeout does not reload and rapid taps dispatch once')
        page.locator('.pwa-update-later').click()
        expect(page.locator('.pwa-update-prompt')).to_have_count(0)
        assert activation_state(page)['held']
        checks.check(True, label + ': Later still dismisses without activating the waiting worker')
        # Explicitly reopen the deferred prompt, as in the existing upgrade test.
        page.evaluate("sessionStorage.removeItem('vac_pwa_update_later')")
        page.reload()
        expect(page.locator('.pwa-update-now')).to_be_visible()
        page.evaluate("navigator.serviceWorker.getRegistration('/admin/').then(reg=>reg.waiting.postMessage({type:'QA_ALLOW_ACTIVATION'}))")
        with page.expect_navigation(wait_until='domcontentloaded'):
            page.locator('.pwa-update-now').click()
        wait_worker_state(page, 'settled', server.next_build)
        checks.check(True, label + ': explicit retry activates the actual target controller and reads back the next build')

        # A second native update activates only after the timeout and an edited
        # booking form has opened; that late event must not discard the draft.
        server.next_build = server.build + 2
        page.evaluate("navigator.serviceWorker.getRegistration('/admin/').then(reg=>reg.update())")
        wait_worker_state(page, 'waiting', server.next_build)
        expect(page.locator('.pwa-update-now')).to_be_visible()
        before = len(navigations)
        attempts_before = page.evaluate("JSON.parse(sessionStorage.getItem('vac_pwa_qa_reload_events')||'[]').length")
        page.locator('.pwa-update-now').click()
        page.wait_for_function("()=>document.querySelector('.pwa-update-now')?.disabled===false && [...document.querySelectorAll('.toast')].some(n=>n.textContent.includes('Оновлення не завершено'))")
        assert len(navigations) == before
        mobile_new = page.locator('#mobileNewBooking')
        (mobile_new if mobile_new.is_visible() else page.locator('#newBooking')).click()
        form = page.locator('#bookingForm')
        expect(form).to_be_visible()
        start_date = form.locator('[name=startDate]')
        initial_date = start_date.input_value()
        edited_date = ((date.fromisoformat(initial_date) if initial_date else date.today()) + timedelta(days=1)).isoformat()
        start_date.fill(edited_date)
        retained_form = form.element_handle()
        page.evaluate('''async()=>{
          const reg=await navigator.serviceWorker.getRegistration('/admin/');
          window.__qaLateTarget=reg.waiting;reg.waiting.postMessage({type:'QA_ACTIVATE_LATE'});
        }''')
        page.wait_for_function("()=>window.__qaLateTarget?.state==='activated' && navigator.serviceWorker.controller===window.__qaLateTarget")
        assert len(navigations) == before, 'late activation discarded the active document'
        assert page.evaluate("JSON.parse(sessionStorage.getItem('vac_pwa_qa_reload_events')||'[]').length") == attempts_before, 'dirty-form protection masked a late reload attempt'
        assert retained_form.evaluate('form=>form.isConnected')
        expect(start_date).to_have_value(edited_date)
        checks.check(True, label + ': late native activation preserves the original edited booking form')
        form.locator('header [data-close]').click()
        if page.locator('#labLeaveDialog').count():
            page.locator('#labLeaveDialog [data-lab-discard]').click()
        expect(form).to_have_count(0)
        expect(page.locator('.pwa-update-now')).to_be_visible()
        with page.expect_navigation(wait_until='domcontentloaded'):
            page.locator('.pwa-update-now').click()
        wait_worker_state(page, 'settled', server.next_build)
        checks.check(True, label + ': an already-activated target still needs explicit acceptance before reload')
        allowed = {None, 'list', 'calendar', 'clients', 'campaigns', 'referrals_expiring', 'referral_analytics', 'lookup_customer', 'audit_log', 'health'}
        assert all(call['action'] in allowed for call in server.api_actions[starting_actions:]), server.api_actions[starting_actions:]
        assert not errors and not unexpected, (errors, unexpected)
        checks.check(True, label + ': no business mutation, external request or runtime error')
        checks.screenshot(page, label + '-complete.png')
    except Exception as error:
        checks.check(False, label + ': ' + str(error))
        checks.capture_failure(page, label)
    finally:
        server.next_build = None
        server.defer_activation = False
        checks.artifacts.mkdir(parents=True, exist_ok=True)
        (checks.artifacts / (label + '-navigation.json')).write_text(json.dumps(navigations, indent=2))
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
            exercise_update_recovery(browser, server, base, checks, width, playwright.devices)
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
