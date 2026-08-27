#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, threading
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from playwright.sync_api import sync_playwright

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, _format: str, *_args: Any) -> None: return
    def end_headers(self) -> None:
        self.send_header('Cache-Control','no-store'); super().end_headers()

@contextmanager
def server(root: Path):
    httpd=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
    thread=threading.Thread(target=httpd.serve_forever,daemon=True); thread.start()
    try: yield f'http://127.0.0.1:{httpd.server_port}'
    finally:
        httpd.shutdown(); httpd.server_close(); thread.join(timeout=5)

def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument('--root',default='dist'); ap.add_argument('--artifacts',default='equipment-density-test-results'); args=ap.parse_args()
    root=Path(args.root).resolve(); artifacts=Path(args.artifacts); artifacts.mkdir(parents=True,exist_ok=True)
    passed=[]; failed=[]
    def check(cond: bool,name: str):
        (passed if cond else failed).append(name); print(('PASS' if cond else 'FAIL')+': '+name)
    with server(root) as base, sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':390,'height':844})
        page.route('**/*',lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
        page.goto(base+'/tekhnika/karcher-puzzi-8-1/',wait_until='networkidle')
        height=page.evaluate('document.documentElement.scrollHeight'); width=page.evaluate('document.documentElement.scrollWidth')
        check(width<=391,'390px Puzzi page has no horizontal document overflow')
        check(9000<=height<=11500,f'390px Puzzi density stays in 9–11.5k px band (actual {height}px)')
        check(page.locator('.puzzi-zone-grid article').count()==4,'all four Puzzi use-case cards remain visible')
        check(page.locator('.puzzi-cleaning-steps article').count()==5,'all five cleaning steps remain visible')
        check(page.locator('.puzzi-term-grid article').count()==4,'all four rental-term cards remain visible')
        check(page.locator('.puzzi-steps article').count()==4,'all four rental-flow steps remain visible')
        check(page.locator('.puzzi-proof-grid a').count()==3,'all three proof visuals remain visible')
        for selector,label in [('.puzzi-zone-grid','task zones'),('.puzzi-cleaning-steps','cleaning steps'),('.puzzi-proof-grid','proof visuals')]:
            check(page.locator(selector).evaluate('el=>el.scrollWidth>el.clientWidth+80'),f'{label} use intentional horizontal snap browsing')
        first_zone=page.locator('.puzzi-zone-grid article').first.bounding_box()
        check(first_zone is not None and 275<=first_zone['width']<=310 and 205<=first_zone['height']<=235,'Puzzi task carousel keeps readable editorial cards')
        proof=page.locator('.puzzi-proof-grid a').first.bounding_box()
        check(proof is not None and 320<=proof['height']<=340,'proof photography stays substantial after density pass')
        page.screenshot(path=str(artifacts/'puzzi-390-density.png'),full_page=True)

        for slug,name in [('/tekhnika/karcher-sc-2-deluxe/','SC 2'),('/tekhnika/robot-dlia-vikon-abir/','window robot')]:
            page.goto(base+slug,wait_until='networkidle')
            h=page.evaluate('document.documentElement.scrollHeight'); w=page.evaluate('document.documentElement.scrollWidth')
            check(w<=391,f'390px {name} page has no horizontal document overflow')
            check(h<=11500,f'390px {name} page remains reasonably dense (actual {h}px)')
        browser.close()
    result={'passed':len(passed),'failed':failed,'status':'failed' if failed else 'passed'}
    (artifacts/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))
    return 1 if failed else 0
if __name__=='__main__': raise SystemExit(main())
