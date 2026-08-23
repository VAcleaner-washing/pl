#!/usr/bin/env python3
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
CSS='\n'.join((ROOT/p).read_text(encoding='utf-8') for p in ['_next/static/chunks/0-rnytzezgu81.css','assets/public-fixes.css','assets/public-experience.css','assets/site-v400.css'] if (ROOT/p).exists())
VIEWS=[(320,844),(390,844),(430,932),(768,1024),(1024,768),(1280,800),(1650,760),(1920,1080)]
failed=[];passed=0
def check(cond,label):
 global passed
 if cond: passed+=1;print('PASS:',label)
 else: failed.append(label);print('FAIL:',label)
html='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="booking-page-active"><main><form class="booking-form" style="max-width:1500px;margin:20px auto;padding:20px"><section class="booking-step" id="booking-extras"><div class="booking-step-heading"><span>03</span><div><h2>Отримання та бонуси</h2><p>Реальний layout-контракт для Puzzi/HOME RESET.</p></div></div><div class="booking-chemistry"><div><strong>Хімія для Puzzi · 8 запечатаних порцій</strong><span>Завжди видаємо всі 8 порцій. Після повернення оплачуєте лише використані — 50 грн за порцію; невикористані повертаються разом із технікою.</span></div></div><div class="booking-gift booking-home-reset-gift"><div class="booking-gift-copy"><small>Входить у HOME RESET</small><strong>Аромадифузор VA HOME у подарунок</strong><span>Оберіть аромат зараз або залиште вибір до підтвердження менеджером.</span></div><label class="booking-gift-select"><span>Аромат</span><select><option>Signature Relax</option><option>Обрати після підтвердження</option></select></label></div><div class="booking-gift booking-story-gift"><div class="booking-gift-copy"><small>Бонус за сторіс</small><strong>Подарунок за відмітку @vacleaner_washing.pl</strong><span>Для оренди техніки від 1 000 грн.</span></div><label class="booking-story-toggle is-selected"><input type="checkbox" checked><span><b>Відмічу VAcleaner у сторіс</b><small>Оберіть один із двох подарунків.</small></span></label><div class="booking-gift-options"><label class="is-selected"><input type="radio" checked><span><b>VA HOME · 50 мл</b><small>Аромадифузор у подарунок. Аромат можна обрати нижче.</small></span></label><label><input type="radio"><span><b>2 порції хімії Puzzi</b><small>Дві використані порції не оплачуються; кожна наступна — 50 грн.</small></span></label></div><label class="booking-gift-select"><span>Аромат дифузора</span><select><option>Wild Berry Way</option></select></label></div></section></form></main></body></html>'''
with sync_playwright() as p:
 opts={'headless':True}
 if Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
 browser=p.chromium.launch(**opts)
 try:
  for w,h in VIEWS:
   page=browser.new_page(viewport={'width':w,'height':h},is_mobile=w<=900)
   page.set_content(html,wait_until='domcontentloaded');page.add_style_tag(content=CSS);page.wait_for_timeout(40)
   label=f'{w}x{h}'
   ov=page.evaluate('()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bad:[...document.querySelectorAll("body *")].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.position!=="fixed"&&r.width>1&&(r.right>innerWidth+2||r.left<-2)}).slice(0,8).map(el=>el.className||el.tagName)})')
   check(ov['sw']<=ov['cw']+2 and not ov['bad'],f'{label}: gift flow has no horizontal/outside-viewport overflow')
   check(page.locator('.booking-chemistry').is_visible(),f'{label}: Puzzi chemistry remains visibly separate from gifts')
   check(page.locator('.booking-gift').count()==2,f'{label}: HOME RESET and story gift are separate blocks')
   heights=page.eval_on_selector_all('select, .booking-story-toggle','els=>els.map(e=>e.getBoundingClientRect().height)')
   check(all(v>=44 for v in heights),f'{label}: gift controls keep touch/readability height')
   if w<=620:
    boxes=page.eval_on_selector_all('.booking-gift-options>label','els=>els.map(e=>e.getBoundingClientRect())')
    check(len(boxes)==2 and boxes[1]['y']>boxes[0]['y'],f'{label}: gift choices stack on mobile instead of squeezing text')
   else:
    check(page.locator('.booking-gift-options').evaluate('el=>getComputedStyle(el).gridTemplateColumns').count('px')>=2,f'{label}: desktop gift choices use two readable columns')
   page.close()
 finally:browser.close()
print(json.dumps({'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'},ensure_ascii=False))
raise SystemExit(1 if failed else 0)
