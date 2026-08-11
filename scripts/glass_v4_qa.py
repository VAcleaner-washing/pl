#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
import importlib.util, os, sys
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pwaqa',ROOT/'scripts/pwa_visual_qa.py')
mod=importlib.util.module_from_spec(spec);sys.modules['pwaqa']=mod;spec.loader.exec_module(mod)
CSS=(ROOT/'assets/admin-glass-test.css').read_text(encoding='utf-8')
JS=(ROOT/'assets/admin-glass-test.js').read_text(encoding='utf-8')
fail=[]
def check(c,label):
 print(('PASS' if c else 'FAIL')+': '+label)
 if not c: fail.append(label)
with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox']}
 executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
 if executable: opts['executable_path']=executable
 elif Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
 browser=p.chromium.launch(**opts)
 for w in (320,390,430):
  page=mod.render_page(browser,w,844,authenticated=True,standalone=True)
  page.evaluate("document.documentElement.classList.add('glass-test');document.documentElement.style.setProperty('--pwa-safe-top','47px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')")
  page.add_style_tag(content=CSS);page.add_script_tag(content=JS);page.wait_for_timeout(120)
  if page.locator('.pwa-update-prompt').count():page.locator('.pwa-update-later').click()
  mod.open_mobile_view(page,'bookings');page.wait_for_timeout(100)
  card=page.locator('.booking-row').first
  rail=card.evaluate("el=>({w:getComputedStyle(el,'::before').width,bg:getComputedStyle(el,'::before').backgroundImage})")
  check(rail['w']=='4px',f'{w}: booking cards have 4px semantic status rail')
  check(mod.no_overflow(page),f'{w}: bookings V4 no overflow')
  page.locator('.booking-card [data-client-card]').first.evaluate('el=>el.click()');page.wait_for_selector('#clientEditor');page.wait_for_timeout(80)
  check(page.locator('.glass-client-actions').count()==1,f'{w}: client card has glass quick-action bar')
  check(page.locator('.glass-client-actions a').count()>=1 and page.locator('.glass-client-actions button').count()==1,f'{w}: client quick actions expose contact + new rental')
  check(mod.no_overflow(page),f'{w}: client card no horizontal overflow')
  if w==390: page.screenshot(path=str(ROOT/'glass-test-results/client-card-glass-v4-390.png'),full_page=True)
  page.locator('#clientEditor [data-close]').first.click();page.wait_for_timeout(50)
  page.locator('#mobileNewBooking').click();page.wait_for_selector('#bookingForm');page.wait_for_timeout(80)
  check(page.locator('#bookingForm .mobile-booking-progress span').count()==4,f'{w}: new booking keeps four explicit steps')
  check(mod.no_overflow(page),f'{w}: new booking glass sheet no horizontal overflow')
  modal_box=page.locator('.modal-card:has(#bookingForm)').bounding_box()
  check(modal_box is not None and modal_box['x']>=0 and modal_box['x']+modal_box['width']<=w+1,f'{w}: booking sheet stays inside viewport')
  if w==390: page.screenshot(path=str(ROOT/'glass-test-results/new-booking-glass-v4-390.png'),full_page=True)
  page.locator('#bookingForm [data-close]').first.click();page.wait_for_timeout(50)
  mod.open_mobile_view(page,'upcoming');page.wait_for_timeout(80)
  check(page.locator('.upcoming-row [data-client-card]').count()==0,f'{w}: upcoming customer is not directly clickable')
  check(page.locator('.upcoming-row .upcoming-client-info a[href^="tel:"]').count()>=1,f'{w}: upcoming phone remains callable')
  page.locator('.upcoming-row .upcoming-client-info strong').first.click();page.wait_for_timeout(30)
  check(page.locator('#clientEditor').count()==0 and page.locator('.detail').count()==0,f'{w}: customer name tap stays on Upcoming')
  mod.open_mobile_view(page,'calendar');page.wait_for_timeout(80)
  check(page.locator('.calendar-grid .slot').count()>0,f'{w}: calendar slots rendered')
  check(mod.no_overflow(page),f'{w}: calendar V4 no overflow')
  mod.open_mobile_view(page,'analytics');page.wait_for_timeout(80)
  toolbar=page.locator('.analytics-toolbar').first
  material=toolbar.evaluate("el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,img:s.backgroundImage,border:s.borderTopWidth,shadow:s.boxShadow}}")
  check(material['bg']=='rgba(0, 0, 0, 0)' and material['img']=='none',f'{w}: analytics toolbar has no inherited opaque strip')
  check(material['border']=='0px' and material['shadow']=='none',f'{w}: analytics toolbar has no inherited border or shadow')
  check(page.locator('.analytics-periods .chip').count()==5,f'{w}: five analytics period controls remain visible')
  page.locator('[data-analytics-period=\"month\"]').click()
  check(page.locator('#analyticsMonthPicker').count()==1,f'{w}: premium month picker trigger appears')
  check(page.locator('#analyticsMonth').count()==0,f'{w}: native month select is removed')
  check(page.locator('.analytics-calendar-picker').count()==1,f'{w}: calendar period picker appears')
  check(mod.no_overflow(page),f'{w}: analytics toolbar fix keeps viewport stable')
  if w==390: page.screenshot(path=str(ROOT/'glass-test-results/analytics-toolbar-fix-390.png'),full_page=True)
  page.close()
 # Desktop client-card regression: the quick actions used to inherit no desktop styles
 # because their V4 rules lived only inside max-width:900px.
 for w,h in ((1648,927),(1440,900),(1280,800),(1024,768)):
  page=mod.render_page(browser,w,h,authenticated=True,standalone=False)
  page.evaluate("document.documentElement.classList.add('glass-test')")
  page.add_style_tag(content=CSS);page.add_script_tag(content=JS);page.wait_for_timeout(120)
  if page.locator('.pwa-update-prompt').count():page.locator('.pwa-update-later').click()
  page.locator('.nav button[data-view="clients"]').click();page.wait_for_timeout(90)
  page.locator('.client-row .client-open-indicator').first.click();page.wait_for_selector('#clientEditor');page.wait_for_timeout(100)
  actions=page.locator('.glass-client-actions')
  action_box=actions.bounding_box()
  display=actions.evaluate("el=>getComputedStyle(el).display")
  check(display=='grid' and action_box is not None and action_box['height']<=44,f'{w}: desktop client quick actions are a compact grid, not a raw stacked block')
  header_box=page.locator('#clientEditor>header').bounding_box()
  check(header_box is not None and header_box['height']<190,f'{w}: desktop client header cannot balloon from unstyled quick actions')
  card_box=page.locator('.modal-card:has(.client-card-form)').bounding_box()
  check(card_box is not None and card_box['x']>=12 and card_box['x']+card_box['width']<=w-12,f'{w}: desktop client card uses the viewport without clipping')
  # Force the same no-preview state seen with HEIC/browser decode failures and verify
  # that the fallback remains a deliberate desktop card instead of overlapping controls.
  preview=page.locator('#clientDocumentPreview')
  preview.evaluate("""el=>{el.className='client-document-preview preview-unavailable';el.innerHTML='<div class=\"document-private-badge\">Приватний документ</div><img hidden alt=\"Фото документа клієнта\"><div class=\"document-preview-meta\"><div><b>MG_5195.jpeg</b><span>Формат фото не підтримує попередній перегляд у цьому браузері — відкрийте файл кнопкою.</span></div><a class=\"btn subtle\" href=\"#\">Відкрити фото</a></div>'}""")
  badge_box=preview.locator('.document-private-badge').bounding_box()
  meta_box=preview.locator('.document-preview-meta').bounding_box()
  open_box=preview.locator('.document-preview-meta .btn').bounding_box()
  decoration=preview.locator('.document-preview-meta .btn').evaluate("el=>getComputedStyle(el).textDecorationLine")
  check(badge_box is not None and meta_box is not None and badge_box['y']+badge_box['height']<=meta_box['y']+1,f'{w}: desktop private-document badge stays above fallback content without overlap')
  check(open_box is not None and open_box['height']>=42 and open_box['width']>=130,f'{w}: desktop open-document action has a deliberate button geometry')
  check(decoration=='none',f'{w}: desktop open-document action does not fall back to browser underline styling')
  if w>=1280:
   columns=page.locator('.client-card-grid').evaluate("el=>getComputedStyle(el).gridTemplateColumns.split(' ').length")
   check(columns==3,f'{w}: wide desktop client card uses contacts, document and rental history side by side')
  else:
   check(page.locator('.client-card-grid').evaluate("el=>getComputedStyle(el).gridTemplateColumns.split(' ').length")==2,f'{w}: compact desktop client card falls back to two columns')
  check(mod.no_overflow(page),f'{w}: desktop client card creates no horizontal overflow')
  if w==1440: page.screenshot(path=str(ROOT/'glass-test-results/client-card-glass-v4-desktop-1440.png'),full_page=True)
  page.close()
 browser.close()
if fail:
 print('Glass V4 QA failed:',len(fail));raise SystemExit(1)
print('Glass V4 QA passed')
