#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'assets/admin-v250.css').read_text(encoding='utf-8')
HTML=f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style><style>
body{{margin:0;background:#070b0e;color:#f4f1eb;font-family:Arial,sans-serif}}#fixture{{padding:12px;max-width:920px;margin:auto;box-sizing:border-box}}.modal-card{{position:relative!important;inset:auto!important;width:100%!important;max-width:760px!important;height:min(820px,calc(100dvh - 24px))!important;margin:auto!important}}.layer{{position:static!important;padding:0!important}}.analytics-grid{{display:grid;grid-template-columns:1fr!important;margin-top:18px}}
</style></head><body><div id="fixture">
<section class="referral-expiry-alert"><button type="button"><span><b>Бонуси скоро спливають</b><small>2 бонуси · найближчий через 12 дн.</small></span><strong>−150 грн</strong><i>›</i></button></section>
<div class="layer"><div class="modal-card"><div class="modal-form referral-share-modal">
<header><div><small>Приведи друга</small><h2>Анна Клієнт</h2><p>Персональний код безстроковий. Зароблений бонус −150 грн діє 150 днів.</p></div><button class="close">×</button></header>
<div class="referral-share-scroll">
<div class="referral-send-status sent"><i>✓</i><div><b>Надіслано 28.08 · Instagram</b><span>Фіксуємо тільки фактичне надсилання.</span></div></div>
<div class="referral-share-card referral-code-card"><div><span>Персональний код</span><strong>VA-A1B2C3D</strong><small>Безстроковий · можна передавати кільком друзям</small></div><button class="btn referral-copy-code">Скопіювати</button></div>
<div class="referral-summary-line"><span><b>3</b> рекомендації</span><i>·</i><span><b>450 грн</b> зароблено</span><i>·</i><span><b>300 грн</b> доступно</span></div>
<div class="referral-action-panel"><div><small>Надіслати програму</small><strong>Основний канал — Instagram</strong><span>Основний канал виділено. Текст скопіюється автоматично; після фактичної відправки підтвердьте її в адмінці.</span></div><div class="referral-primary-actions"><button class="btn primary">Надіслати в Instagram</button><button class="btn">Надіслати в Telegram</button></div></div>
<section class="referral-history-section"><div class="referral-history-head"><div><small>Рекомендації</small><h3>Хто скористався кодом</h3></div><strong>3</strong></div><div class="referral-history-list"><div class="referral-history-row"><div><strong>Олена Тест</strong><span>Бронювання VA-1234 · 25.08</span></div><div><b>800 грн</b><em class="referral-state completed">Завершено</em></div></div><div class="referral-history-row"><div><strong>Іван Тест</strong><span>Бронювання VA-5678 · 28.08</span></div><div><b>700 грн</b><em class="referral-state pending">Очікує</em></div></div></div></section>
<section class="referral-history-section"><div class="referral-history-head"><div><small>Бонуси</small><h3>Бонуси клієнта</h3></div><strong>2 активні</strong></div><div class="referral-history-list"><div class="referral-history-row"><div><strong>−150 грн за Олену Тест</strong><span>до 24.01.2027 · 149 дн.</span></div><div><b>150 грн</b><em class="referral-state active">Активний</em></div></div></div></section>
<section class="referral-message-card"><div class="referral-message-head"><div><small>Готовий текст</small><strong>Повідомлення клієнту</strong></div><button class="btn referral-copy-text">Скопіювати текст</button></div><div class="referral-message-preview">Дякуємо, що обираєте VAcleaner 🤍<br><br>Приведіть друга — бонус отримають обоє.</div></section>
</div><footer><button class="btn">Закрити</button><button class="btn">Контакти клієнта</button></footer></div></div></div>
<div class="analytics-grid"><article class="card analytics-panel referral-analytics-panel"><div class="analytics-panel-head"><div><h3>Приведи друга</h3><p>Когорта клієнтів, яким програму надіслали у вибраний період.</p></div><strong>22,9%</strong></div><div class="referral-analytics-kpis"><div><span>Повідомили клієнтів</span><strong>48</strong><small>54 підтверджених надсилань</small></div><div><span>Привели друга</span><strong>11</strong><small>22,9% від повідомлених</small></div><div><span>Referral-бронювання</span><strong>11</strong><small>9 завершено</small></div><div><span>Referral-виручка</span><strong>8 400 грн</strong><small>фактична сума завершених оренд</small></div></div><div class="referral-funnel"><div><span>Надіслали програму</span><strong>48</strong></div><i>→</i><div><span>Привели друга</span><strong>11</strong></div><i>→</i><div><span>Бронювання</span><strong>11</strong></div><i>→</i><div><span>Завершено</span><strong>9</strong></div></div><div class="referral-economics-grid"><div><span>Знижки друзям</span><strong>−900 грн</strong><small>у завершених referral-орендах</small></div><div><span>Бонусів нараховано</span><strong>1 350 грн</strong><small>ще не означає витрату</small></div><div><span>Бонусів використано</span><strong>600 грн</strong><small>фактично використаних</small></div><div><span>До бронювання</span><strong>6 дн.</strong><small>12 без результату 30+ днів</small></div></div><div class="referral-analytics-split"><section><div class="referral-mini-head"><small>Канали</small><h4>Де краще конвертує</h4></div><div class="referral-channel-grid"><div class="referral-channel-card"><div><span>Instagram</span><strong>25%</strong></div><small>40 клієнтів · 44 надсилання</small><div><b>10</b> бронювань · <b>8</b> завершено</div></div><div class="referral-channel-card"><div><span>Telegram</span><strong>12%</strong></div><small>8 клієнтів · 10 надсилань</small><div><b>1</b> бронювання · <b>1</b> завершено</div></div></div></section><section><div class="referral-mini-head"><small>ТОП клієнтів</small><h4>Хто реально приводить друзів</h4></div><div class="referral-top-list"><div class="referral-top-row"><span><i>1</i><b>Анна Клієнт</b><small>3 заверш. · 3 брон.</small></span><strong>2 400 грн</strong><em>+450 грн бонусів</em></div></div></section></div></article></div>
</div></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    passed=0
    for width,height in ((320,760),(390,844),(430,900),(768,1024),(1280,900)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(HTML,wait_until='load')
        result=page.evaluate('''() => {
          const all=[...document.querySelectorAll('#fixture *')].filter(e=>getComputedStyle(e).position!=='fixed');
          const bad=all.filter(e=>{const r=e.getBoundingClientRect();return r.width>1&&(r.right>innerWidth+2||r.left<-2)}).map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));
          const buttons=[...document.querySelectorAll('.referral-share-modal .btn')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,scroll:e.scrollWidth,client:e.clientWidth}));
          const code=document.querySelector('.referral-code-card strong');
          const alert=document.querySelector('.referral-expiry-alert button');
          const funnel=document.querySelector('.referral-funnel');
          const analytics=document.querySelector('.referral-analytics-panel');
          return {docOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,bad,buttons,codeWidth:code.getBoundingClientRect().width,alertWidth:alert.getBoundingClientRect().width,funnelWidth:funnel.getBoundingClientRect().width,analyticsWidth:analytics.getBoundingClientRect().width};
        }''')
        assert result['docOverflow'] <= 0, (width,result)
        assert not result['bad'], (width,result['bad'][:8])
        assert result['codeWidth'] > 90, (width,result)
        assert result['alertWidth'] <= width-16, (width,result)
        assert result['analyticsWidth'] <= width-16, (width,result)
        assert result['funnelWidth'] <= width-16, (width,result)
        assert all(x['h'] >= 38 and x['scroll'] <= x['client']+1 for x in result['buttons']), (width,result)
        passed+=1
        page.close()
    browser.close()
print(f'Referral admin + analytics responsive QA: {passed}/5 PASS')
