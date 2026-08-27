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
    ap=argparse.ArgumentParser(); ap.add_argument('--root',default='dist'); ap.add_argument('--artifacts',default='home-density-test-results'); args=ap.parse_args()
    root=Path(args.root).resolve(); artifacts=Path(args.artifacts); artifacts.mkdir(parents=True,exist_ok=True)
    passed=[]; failed=[]
    def check(cond: bool,name: str):
        (passed if cond else failed).append(name); print(('PASS' if cond else 'FAIL')+': '+name)
    with server(root) as base, sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':390,'height':844})
        page.route('**/*',lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
        page.goto(base+'/',wait_until='networkidle')
        height=page.evaluate('document.documentElement.scrollHeight')
        width=page.evaluate('document.documentElement.scrollWidth')
        check(width<=391,'390px homepage has no horizontal document overflow')
        check(9500<=height<=12500,f'390px homepage density stays in 9.5–12.5k px band (actual {height}px)')
        check(page.locator('.v21-solution').count()==4,'all four task solutions remain visible')
        check(page.locator('.v21-package-grid>article').count()==3,'all three package cards remain visible')
        check(page.locator('.v21-review-grid>article').count()==3,'all three process visuals remain available')
        review=page.locator('.v21-review-grid')
        check(review.evaluate('el=>el.scrollWidth>el.clientWidth+20'),'process visuals use intentional horizontal snap browsing')
        card=page.locator('.v21-review-grid>article').first.bounding_box()
        check(card is not None and 300<=card['width']<=330 and 390<=card['height']<=440,'process carousel keeps large editorial cards')
        task=page.locator('.v21-solution-image').first.bounding_box()
        check(task is not None and 230<=task['height']<=260,'task photography remains substantial but compact')
        founder=page.locator('.v21-anna-media').bounding_box()
        check(founder is not None and 325<=founder['height']<=355,'founder panel no longer consumes most of a phone screen')
        page.screenshot(path=str(artifacts/'home-390-density.png'),full_page=True)
        browser.close()
    result={'passed':len(passed),'failed':failed,'status':'failed' if failed else 'passed'}
    (artifacts/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))
    return 1 if failed else 0
if __name__=='__main__': raise SystemExit(main())
