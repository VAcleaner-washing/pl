from pathlib import Path
import importlib.util, json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pwaqa', ROOT/'scripts/pwa_visual_qa.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
results=[]
with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**opts)
    try:
        for width,height in [(320,720),(390,844),(430,932)]:
            page=m.render_page(browser,width,height,standalone=True)
            page.wait_for_selector('.mobile-nav')
            def snap(label):
                return page.locator('.mobile-nav').evaluate("(el,label)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {label,top:r.top,bottom:r.bottom,height:r.height,position:s.position,cssBottom:s.bottom,display:s.display,visibility:s.visibility,opacity:s.opacity}}",label)
            before=snap('before')
            page.locator('.search input').focus(); page.wait_for_timeout(100)
            page.evaluate("document.documentElement.classList.add('keyboard-open');document.documentElement.style.setProperty('--keyboard-viewport-height','500px');document.documentElement.style.setProperty('--keyboard-viewport-top','0px')")
            page.wait_for_timeout(50)
            during=snap('during')
            page.evaluate("document.activeElement && document.activeElement.blur();document.documentElement.classList.remove('keyboard-open');document.documentElement.style.removeProperty('--keyboard-viewport-height');document.documentElement.style.removeProperty('--keyboard-viewport-top')")
            page.wait_for_timeout(100)
            after=snap('after')
            before_inset=max(0,height-before['bottom']); after_inset=max(0,height-after['bottom'])
            ok=(before['position']=='fixed' and during['position']=='fixed' and after['position']=='fixed'
                and 0<=before_inset<=12 and 0<=after_inset<=12
                and abs(after_inset-before_inset)<=1
                and during['display']!='none' and during['visibility']=='visible'
                and during['opacity']=='0' and during['top']>=height)
            results.append({'width':width,'height':height,'ok':ok,'before':before,'during':during,'after':after})
            page.close()
    finally:
        browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))
if not all(r['ok'] for r in results): raise SystemExit(1)
