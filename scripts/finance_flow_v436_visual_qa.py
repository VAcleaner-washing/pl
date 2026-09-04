from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
CSS_ROOT=DIST/'assets' if (DIST/'assets'/'admin-v436.css').exists() else ROOT/'assets'
OUT_MOBILE=ROOT/'pwa-test-results'
OUT_DESKTOP=ROOT/'final-desktop-test-results'
OUT_MOBILE.mkdir(exist_ok=True)
OUT_DESKTOP.mkdir(exist_ok=True)

css='\n'.join((CSS_ROOT/name).read_text(encoding='utf-8') for name in (
    'admin-v250.css','admin-glass-test.css','admin-v430.css','admin-v436.css'
))
markup='''
<div class="qa-finance-fixture">
  <article class="card booking-card booking-row">
    <div class="booking-row-body">
      <div class="booking-finance">
        <small>Фінанси</small>
        <strong class="booking-finance-expenses"><span>Разом витрати</span><b>1 650 грн</b></strong>
        <span class="booking-finance-received-summary"><span>Отримано</span><strong>2 200 грн</strong></span>
        <span>отримано 2 200 грн · передоплата + залоговий платіж</span>
        <em class="refund"><span>Попередньо повернути</span><strong>550 грн</strong></em>
        <span class="booking-deposit-state paid"><span>Залоговий платіж</span><strong>2 000 грн</strong><small>· отримано</small></span>
      </div>
    </div>
  </article>
  <form class="finance-form">
    <aside class="modal-summary">
      <h3>Фінансовий розрахунок</h3>
      <div class="live finance-flow-summary">
        <section class="finance-flow-group finance-flow-received">
          <div class="finance-flow-title"><span>Отримано</span></div>
          <div><span>Передоплата</span><strong>200 грн</strong></div>
          <div class="deposit-row"><span>Залог <small>Отримано</small></span><strong>2 000 грн</strong></div>
          <div class="received-total"><span>Разом отримано <small>Передоплата + залоговий платіж</small></span><strong>2 200 грн</strong></div>
        </section>
        <section class="finance-flow-group finance-flow-expenses">
          <div class="finance-flow-title"><span>Списується</span></div>
          <div><span>Оренда</span><strong>1 200 грн</strong></div>
          <div><span>Доставка</span><strong>250 грн</strong></div>
          <div class="finance-extra-row"><span>Додатково <small class="finance-extra-breakdown">Насадки 200 грн</small></span><strong>200 грн</strong></div>
          <div class="expenses-total"><span>Разом витрати</span><strong>1 650 грн</strong></div>
        </section>
        <section class="finance-flow-final balance refund"><span><small>Підсумок</small>До повернення клієнту</span><strong>550 грн</strong></section>
      </div>
    </aside>
  </form>
</div>
'''
html=f'''<!doctype html><html class="native-test native-v2 native-v21 native-v22 native-v23 native-v24 native-v25 native-v26 native-v27 native-v28 v43-prod"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}\nbody{{padding:20px!important;background:#070b0e!important}}.qa-finance-fixture{{max-width:780px;margin:auto}}.qa-finance-fixture>.booking-card{{max-width:760px}}.qa-finance-fixture .finance-form{{max-width:780px;margin-top:24px}}</style></head><body>{markup}</body></html>'''

checks=[]
def check(ok,label):
    checks.append((bool(ok),label))
    print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width,height in ((390,844),(1440,1000)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load')
        page.wait_for_timeout(40)
        mobile=width<=900
        summary=page.locator('.finance-flow-summary')
        summary_style=summary.evaluate("el=>{const s=getComputedStyle(el);return{border:s.borderTopWidth,bg:s.backgroundColor,radius:s.borderRadius,overflow:s.overflow}}")
        check(summary_style['border']=='0px',f'{width}: finance summary has no outer border')
        check(summary_style['bg'] in ('rgba(0, 0, 0, 0)','transparent'),f'{width}: finance summary has no nested card background')
        rows=page.locator('.finance-flow-group>div:not(.finance-flow-title)')
        axis=rows.evaluate_all("els=>els.map(el=>{const l=el.querySelector('span')?.getBoundingClientRect(),v=el.querySelector('strong')?.getBoundingClientRect();return l&&v?{lr:l.right,vl:v.left,vr:v.right}:null}).filter(Boolean)")
        check(bool(axis) and all(x['vl']>=x['lr']-1 for x in axis),f'{width}: finance labels and amounts keep separate axes')
        check(bool(axis) and max(x['vr'] for x in axis)-min(x['vr'] for x in axis)<=2,f'{width}: finance amounts align to one right edge')
        helper=page.locator('.deposit-row span>small')
        helper_style=helper.evaluate("el=>({display:getComputedStyle(el).display,top:el.getBoundingClientRect().top,parentTop:el.parentElement.getBoundingClientRect().top})")
        check(helper_style['display']=='block' and helper_style['top']>helper_style['parentTop'],f'{width}: deposit state sits below the deposit label')
        final_box=page.locator('.finance-flow-final').bounding_box()
        final_amount=page.locator('.finance-flow-final>strong').bounding_box()
        check(final_box is not None and final_amount is not None and final_amount['x']+final_amount['width']<=final_box['x']+final_box['width']+1,f'{width}: final result amount stays contained and right aligned')
        if mobile:
            deposit=page.locator('.booking-deposit-state')
            result=page.locator('.booking-finance>em.refund')
            dep_style=deposit.evaluate("el=>{const s=getComputedStyle(el);return{radius:s.borderRadius,bg:s.backgroundColor,shadow:s.boxShadow}}")
            result_style=result.evaluate("el=>{const s=getComputedStyle(el);return{radius:s.borderRadius,bg:s.backgroundColor,shadow:s.boxShadow}}")
            check(dep_style['radius']=='0px' and dep_style['bg'] in ('rgba(0, 0, 0, 0)','transparent') and dep_style['shadow']=='none','390: deposit is a finance row, not a blue inner card')
            check(result_style['radius']=='0px' and result_style['bg'] in ('rgba(0, 0, 0, 0)','transparent') and result_style['shadow']=='none','390: preliminary result is a finance row, not a second green inner card')
            dep=deposit.locator('strong').bounding_box();res=result.locator('strong').bounding_box();received=page.locator('.booking-finance-received-summary>strong').bounding_box()
            check(dep and res and received and max(dep['x']+dep['width'],res['x']+res['width'],received['x']+received['width'])-min(dep['x']+dep['width'],res['x']+res['width'],received['x']+received['width'])<=2,'390: received, deposit and preliminary result share one right money axis')
            page.screenshot(path=str(OUT_MOBILE/'mobile-390-finance-flow-v436.png'),full_page=True)
        else:
            page.screenshot(path=str(OUT_DESKTOP/'1440-finance-flow-v436.png'),full_page=True)
        page.close()
    browser.close()

failed=[label for ok,label in checks if not ok]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT_MOBILE/'finance-flow-v436-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
