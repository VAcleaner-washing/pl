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
html='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="booking-page-active"><main><form class="booking-form" style="max-width:1500px;margin:20px auto;padding:20px"><section class="booking-step" id="booking-extras"><div class="booking-step-heading"><span>03</span><div><h2>Отримання та бонуси</h2><p>Реальний layout-контракт для Story/HOME RESET.</p></div></div><div class="booking-gift booking-home-reset-gift"><div class="booking-gift-copy"><small>Входить у HOME RESET</small><strong>Аромадифузор VA HOME у подарунок</strong><span>Оберіть аромат зараз або залиште вибір до підтвердження менеджером.</span><a class="booking-home-reset-scents-link" href="https://vahome.com.ua/catalog?collection=entry">Подивитись аромати VA HOME ↗</a></div><label class="booking-gift-select"><span>Аромат</span><select><option>Signature Relax</option><option>Обрати після підтвердження</option></select></label></div><div class="booking-gift booking-story-gift story-chem"><div class="booking-gift-copy"><small>Бонус за сторіс</small><strong>Подарунок за відмітку @vacleaner_washing.pl</strong><span>Орендуєте Puzzi — відмітьте нас у сторіс і 2 використані порції хімії будуть безкоштовними.</span></div><label class="booking-story-toggle is-selected"><input type="checkbox" checked><span><b>Відмічу VAcleaner у сторіс</b><small>Після публікації перші 2 використані порції хімії — безкоштовно.</small></span></label><div class="booking-gift-fixed"><b>2 порції хімії Puzzi безкоштовно</b><span>За перші 2 використані порції не платите. Кожна наступна — 50 грн.</span></div></div><div class="booking-gift booking-story-gift story-choice"><div class="booking-gift-copy"><small>Бонус за сторіс</small><strong>Подарунок за відмітку @vacleaner_washing.pl</strong><span>При оренді від 1 000 грн відмітьте нас у сторіс і оберіть подарунок.</span></div><label class="booking-story-toggle is-selected"><input type="checkbox" checked><span><b>Відмічу VAcleaner у сторіс</b><small>Оберіть: аромадифузор VA HOME 50 мл або 2 безкоштовні порції хімії Puzzi.</small></span></label><div class="booking-gift-options"><label class="is-selected"><input type="radio" checked><span><b>Аромадифузор VA HOME · 50 мл</b><small>Готовий подарунок для дому — аромат уже підібраний.</small></span></label><label><input type="radio"><span><b>2 порції хімії Puzzi безкоштовно</b><small>За перші 2 використані порції не платите. Кожна наступна — 50 грн.</small></span></label></div></div><div class="booking-gift booking-story-gift story-no-puzzi"><div class="booking-gift-copy"><small>Бонус за сторіс</small><strong>Подарунок за відмітку @vacleaner_washing.pl</strong><span>При оренді від 1 000 грн за відмітку в сторіс подаруємо аромадифузор VA HOME · 50 мл.</span></div><label class="booking-story-toggle is-selected"><input type="checkbox" checked><span><b>Відмічу VAcleaner у сторіс</b><small>Після відмітки отримаєте аромадифузор VA HOME · 50 мл у подарунок.</small></span></label><div class="booking-gift-fixed"><b>Аромадифузор VA HOME · 50 мл</b><span>Після відмітки в сторіс аромадифузор 50 мл — безкоштовно.</span></div></div></section></form></main></body></html>'''
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
   check(page.locator('.booking-chemistry').count()==0,f'{label}: redundant Puzzi chemistry explainer is absent')
   check(page.locator('.story-chem .booking-story-toggle').is_visible(),f'{label}: sub-1000 Puzzi Story reward is active chemistry-only')
   check(page.locator('.booking-gift').count()==4,f'{label}: HOME RESET, chemistry-only, 1000+ choice and no-Puzzi gift stay separate')
   heights=page.eval_on_selector_all('select, .booking-story-toggle','els=>els.map(e=>e.getBoundingClientRect().height)')
   check(all(v>=44 for v in heights),f'{label}: gift controls keep touch/readability height')
   if w<=620:
    boxes=page.eval_on_selector_all('.story-choice .booking-gift-options>label','els=>els.map(e=>e.getBoundingClientRect())')
    check(len(boxes)==2 and boxes[1]['y']>boxes[0]['y'],f'{label}: gift choices stack on mobile instead of squeezing text')
   else:
    check(page.locator('.story-choice .booking-gift-options').evaluate('el=>getComputedStyle(el).gridTemplateColumns').count('px')>=2,f'{label}: desktop gift choices use two readable columns')
   page.close()
 finally:browser.close()
print(json.dumps({'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'},ensure_ascii=False))
raise SystemExit(1 if failed else 0)
