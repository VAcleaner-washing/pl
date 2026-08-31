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
    return page.locator('.analytics-periods').evaluate("""el=>{const cr=el.getBoundingClientRect(),cs=getComputedStyle(el),pr=el.parentElement?.getBoundingClientRect();const buttons=[...el.querySelectorAll('.chip')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent.trim(),x:r.x-cr.x,w:r.width,h:r.height,r:s.borderRadius,b:s.borderWidth,bg:s.backgroundImage||s.backgroundColor,fw:s.fontWeight,fs:s.fontSize,color:s.color,active:e.classList.contains('active')}});return {w:cr.width,x:cr.x,parentW:pr?.width||0,fill:pr?.width?cr.width/pr.width:1,display:cs.display,columns:cs.gridTemplateColumns,gap:parseFloat(cs.columnGap||cs.gap||'0')||0,buttons}}""")
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
        ck(f'{w}: analytics shows 5 period buttons',len(a['buttons'])==5)
        ck(f'{w}: analytics buttons >=44px',all(x['h']>=43.5 for x in a['buttons']))
        ck(f'{w}: analytics no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'))
        page.evaluate("()=>document.querySelector('[data-view=\"finances\"]')?.click()")
        page.wait_for_timeout(80)
        f=metrics(page)
        ck(f'{w}: finance shows 5 period buttons',len(f['buttons'])==5)
        ck(f'{w}: finance buttons >=44px',all(x['h']>=43.5 for x in f['buttons']))
        ck(f'{w}: finance no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'))
        if len(a['buttons'])==len(f['buttons'])==5:
            ab,fb=a['buttons'],f['buttons']
            ck(f'{w}: labels identical',[x['text'] for x in ab]==[x['text'] for x in fb])
            ck(f'{w}: button heights identical',max(abs(ab[i]['h']-fb[i]['h']) for i in range(5))<1.1)
            ck(f'{w}: button widths identical',max(abs(ab[i]['w']-fb[i]['w']) for i in range(5))<1.1)
            ck(f'{w}: relative x positions identical',max(abs(ab[i]['x']-fb[i]['x']) for i in range(5))<1.1)
            ck(f'{w}: period container widths identical',abs(a['w']-f['w'])<1.1)
            ck(f'{w}: grid columns identical',a['columns']==f['columns'])
            ck(f'{w}: gaps identical',abs(a['gap']-f['gap'])<0.6)
            ck(f'{w}: radii identical',all(ab[i]['r']==fb[i]['r'] for i in range(5)))
            ck(f'{w}: font sizes identical',all(ab[i]['fs']==fb[i]['fs'] for i in range(5)))
            ck(f'{w}: borders identical',all(ab[i]['b']==fb[i]['b'] for i in range(5)))
            ck(f'{w}: backgrounds identical',all(ab[i]['bg']==fb[i]['bg'] for i in range(5)))
            ck(f'{w}: active state identical',all(ab[i]['active']==fb[i]['active'] for i in range(5)))
            if w<=900:
                ck(f'{w}: analytics fills its mobile control row',a['fill']>=.98)
                ck(f'{w}: finance fills its mobile control row',f['fill']>=.98)
        page.close()
    browser.close()
failed=[x for x,ok in checks if not ok]
if failed:
    print('FAILED:',failed); raise SystemExit(1)
print(f'Admin control consistency QA: {len(checks)}/{len(checks)} PASS')
