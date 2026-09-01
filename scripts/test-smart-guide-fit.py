#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'assets/public-experience.css').read_text(encoding='utf-8')
CORE_JS=(ROOT/'assets/vacleaner-core.js').read_text(encoding='utf-8')
JS=(ROOT/'assets/public-quiz.js').read_text(encoding='utf-8').replace("const path=location.pathname.replace(/\\/+$/,'')||'/';","const path='/pidbir';")
HTML='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><header class="site-header" style="height:76px"></header><main><section class="inner-hero"></section></main></body></html>'''
SIZES=((1648,790),(1440,720),(1280,720),(1024,768),(768,720))
passed=0
failed=[]

def check(ok,label):
    global passed
    if ok:
        passed+=1;print('PASS:',label)
    else:
        failed.append(label);print('FAIL:',label)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    for w,h in SIZES:
        page=browser.new_page(viewport={'width':w,'height':h})
        page.set_content(HTML);page.add_style_tag(content=CSS);page.add_script_tag(content=CORE_JS);page.add_script_tag(content=JS)
        page.wait_for_selector('.vq-layer.is-open');page.wait_for_timeout(80)
        header=page.locator('.vq-dialog__header').evaluate("""el=>{const h=el.getBoundingClientRect(),back=el.querySelector('.vq-back').getBoundingClientRect(),progress=el.querySelector('.vq-progress').getBoundingClientRect(),close=el.querySelector('.vq-close').getBoundingClientRect(),meta=el.querySelector('.vq-progress__meta');return{h,back,progress,close,metaHeight:meta.getBoundingClientRect().height,metaScrollHeight:meta.scrollHeight}}""")
        check(header['progress']['left']>=header['back']['right']+8 and header['close']['left']>=header['progress']['right']+8 and header['progress']['width']>=header['h']['width']*.7,f'{w}x{h}: progress owns the center header track without close-button overlap')
        check(header['metaScrollHeight']<=header['metaHeight']+1 and header['metaHeight']<20,f'{w}x{h}: Початок · оберіть зони stays on one line')
        for step in range(3):
            body=page.locator('.vq-dialog__body').evaluate("el=>({h:el.clientHeight,sh:el.scrollHeight,st:el.scrollTop,ov:getComputedStyle(el).overflowY})")
            check(body['sh']<=body['h']+1 and body['st']==0,f'{w}x{h}: question step {step+1} fits without inner scroll')
            if step==0:
                page.get_by_role('button',name='Ванна кімната').click();page.wait_for_timeout(80)
            elif step==1:
                page.locator('.vq-option').first.click();page.wait_for_timeout(30)
                check(page.locator('.vq-dialog__body').evaluate('el=>el.scrollTop')==0,f'{w}x{h}: multi-select does not jump the body scroll')
                page.locator('.vq-next').click();page.wait_for_timeout(80)
        page.close()

    page=browser.new_page(viewport={'width':1440,'height':720})
    page.set_content(HTML);page.add_style_tag(content=CSS);page.add_script_tag(content=CORE_JS);page.add_script_tag(content=JS)
    page.wait_for_selector('.vq-layer.is-open');page.wait_for_timeout(80)
    page.get_by_role('button',name='Диван / крісла М’які меблі').click()
    page.locator('.vq-next').click();page.wait_for_timeout(80)
    page.get_by_role('button',name='Їжа, жир, косметика або невідома пляма Підберемо універсальний плямовивідник').click()
    page.locator('.vq-next').click();page.wait_for_timeout(80)
    add_button=page.locator('[data-result-extra="spot_lifter"]')
    page.locator('.vq-dialog__body').evaluate('el=>el.scrollTop=420')
    before=page.locator('.vq-dialog__body').evaluate('el=>el.scrollTop')
    add_button.click();page.wait_for_timeout(80)
    after=page.locator('.vq-dialog__body').evaluate('el=>el.scrollTop')
    check(abs(after-before)<=2,'result add button preserves the current inner scroll position')
    check(page.locator('[data-result-extra="spot_lifter"]').inner_text()=='Додано ✓','result add button confirms the selected extra')
    page.close()
    browser.close()
if failed:
    raise SystemExit(f'Smart Guide fit QA failed: {len(failed)}')
print(f'Smart Guide fit QA passed: {passed}/{passed}')
