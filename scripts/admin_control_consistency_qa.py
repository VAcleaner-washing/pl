#!/usr/bin/env python3
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as fixture
checks=[]
def ck(label,cond):
    ok=bool(cond); checks.append((label,ok)); print(('PASS' if ok else 'FAIL')+': '+label)

def metrics(page):
    return page.locator('.analytics-periods .chip').evaluate_all("""els=>els.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent.trim(),x:r.x,w:r.width,h:r.height,r:s.borderRadius,b:s.borderWidth,bg:s.backgroundImage||s.backgroundColor,fw:s.fontWeight}})""")
with sync_playwright() as pw:
    opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**opts)
    for w,h in [(390,844),(430,932),(1024,768),(1280,800),(1440,900)]:
        page=fixture.render_page(browser,w,h,authenticated=True,standalone=w<=900)
        page.set_default_timeout(5000)
        if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click()
        page.evaluate("()=>window.renderAnalytics&&window.renderAnalytics()") if False else None
        # navigate by sidebar/mobile state through app API when available
        page.evaluate("()=>document.querySelector('[data-view=\"analytics\"]')?.click()")
        page.wait_for_timeout(80)
        a=metrics(page)
        ck(f'{w}: analytics shows 5 period buttons',len(a)==5)
        ck(f'{w}: analytics buttons >=44px',all(x['h']>=43.5 for x in a))
        ck(f'{w}: analytics no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'))
        page.evaluate("()=>document.querySelector('[data-view=\"finances\"]')?.click()")
        page.wait_for_timeout(80)
        f=metrics(page)
        ck(f'{w}: finance shows 5 period buttons',len(f)==5)
        ck(f'{w}: finance buttons >=44px',all(x['h']>=43.5 for x in f))
        ck(f'{w}: finance no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'))
        if len(a)==len(f)==5:
            ck(f'{w}: labels identical',[x['text'] for x in a]==[x['text'] for x in f])
            ck(f'{w}: button heights identical',max(abs(a[i]['h']-f[i]['h']) for i in range(5))<1.1)
            ck(f'{w}: radii identical',all(a[i]['r']==f[i]['r'] for i in range(5)))
            if w<=900:
                ck(f'{w}: button widths identical',max(abs(a[i]['w']-f[i]['w']) for i in range(5))<1.1)
                ck(f'{w}: button x positions identical',max(abs(a[i]['x']-f[i]['x']) for i in range(5))<1.1)
                aw=page.locator('.analytics-periods').evaluate('e=>e.getBoundingClientRect().width')
                fw=page.locator('.finance-period-row .analytics-periods').evaluate('e=>e.getBoundingClientRect().width') if page.locator('.finance-period-row .analytics-periods').count() else 0
                # At this point page is Finance; compare finance control width to viewport content width.
                vw=page.evaluate('document.documentElement.clientWidth')
                ck(f'{w}: finance period grid uses at least 90% of viewport content width',fw>=vw*0.9)
        page.close()
    browser.close()
failed=[x for x,ok in checks if not ok]
if failed:
    print('FAILED:',failed); raise SystemExit(1)
print(f'Admin control consistency QA: {len(checks)}/{len(checks)} PASS')
