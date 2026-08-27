#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'assets/admin-v250.css').read_text(encoding='utf-8')
HTML=f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style><style>body{{margin:0;background:#070b0e;color:#f4f1eb;font-family:Arial,sans-serif}}#fixture{{padding:12px;max-width:880px;margin:auto}}.modal-card{{position:relative!important;inset:auto!important;width:100%!important;max-width:720px!important;height:min(780px,calc(100dvh - 24px))!important;margin:auto!important}}.layer{{position:static!important;padding:0!important}}</style></head><body><div id="fixture">
<section class="referral-expiry-alert"><button type="button"><span><b>Бонуси скоро спливають</b><small>2 бонусів · найближчий через 12 дн.</small></span><strong>−150 грн</strong><i>›</i></button></section>
<div class="layer"><div class="modal-card"><div class="modal-form referral-share-modal"><header><div><small>Приведи друга</small><h2>Анна Клієнт</h2><p>Персональний код безстроковий. Зароблений бонус −150 грн діє 150 днів.</p></div><button class="close">×</button></header><div style="overflow:auto;min-height:0"><div class="referral-share-card"><span>Код клієнта</span><strong>VA-A1B2C3D</strong><small>Друг −100 грн · клієнт −150 грн після завершення оренди друга</small></div><div class="referral-share-stats"><span>3 завершених рекомендацій</span><span>2 активних бонусів</span></div><div class="referral-message-preview">Дякуємо, що обираєте VAcleaner 🤍<br><br>Приведіть друга — бонус отримають обоє.<br>Ваш код: VA-A1B2C3D<br><br>Друг отримає −100 грн на першу оренду, а після завершення його оренди вам активується −150 грн на наступну.</div><div class="referral-expiry-list"><article><div><strong>Анна Клієнт</strong><span>+380951234567 · до 24.01.2027 · 12 дн.</span></div><b>−150 грн</b><div class="referral-send-actions"><button class="btn">Instagram</button><button class="btn">Telegram</button></div></article></div></div><footer><button class="btn">Закрити</button><button class="btn">Instagram · надіслати</button><button class="btn primary">Telegram · надіслати</button></footer></div></div></div>
<section class="form-section" style="margin-top:18px"><div class="fields customer-fields"><label class="field"><span>Телефон</span><input value="+380951234567"></label><label class="field"><span>ПІБ</span><input value="Анна Клієнт"></label><label class="field"><span>Telegram</span><input value="@client"></label><label class="field"><span>Instagram</span><input value="@client.insta"></label><label class="field"><span>Основний канал</span><select><option>Instagram</option></select></label><label class="field referral-code-field"><span>Код друга</span><input value="VA-A1B2C3D"><small class="field-help">Другу −100 грн на першу оренду.</small></label></div></section>
</div></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    passed=0
    for width,height in ((320,760),(390,844),(430,900),(768,1024)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(HTML,wait_until='load')
        result=page.evaluate('''() => {
          const all=[...document.querySelectorAll('#fixture *')].filter(e=>getComputedStyle(e).position!=='fixed');
          const bad=all.filter(e=>{const r=e.getBoundingClientRect();return r.width>1&&(r.right>innerWidth+2||r.left<-2)}).map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));
          const footer=[...document.querySelectorAll('.referral-share-modal>footer .btn')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,scroll:e.scrollWidth,client:e.clientWidth}));
          const code=document.querySelector('.referral-share-card strong');
          const alert=document.querySelector('.referral-expiry-alert button');
          const fields=[...document.querySelectorAll('.customer-fields input,.customer-fields select')].map(e=>({w:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth}));
          return {docOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,bad,footer,codeWidth:code.getBoundingClientRect().width,alertWidth:alert.getBoundingClientRect().width,fields};
        }''')
        assert result['docOverflow'] <= 0, (width,result)
        assert not result['bad'], (width,result['bad'][:8])
        assert result['codeWidth'] > 90, (width,result)
        assert result['alertWidth'] <= width-16, (width,result)
        assert all(x['h'] >= 40 and x['scroll'] <= x['client']+1 for x in result['footer']), (width,result)
        assert all(x['w'] > 80 and x['scroll'] <= x['client']+1 for x in result['fields']), (width,result)
        passed+=1
        page.close()
    browser.close()
print(f'Referral admin mobile QA: {passed}/4 PASS')
