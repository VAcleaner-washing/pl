#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'assets/admin-v250.css').read_text(encoding='utf-8')
MESSAGE='''Дякуємо, що обираєте VAcleaner 🤍<br><br>Приведіть друга — бонус отримають обоє.<br>Ваш код: VA-AEBC060<br><br>Друг отримає −100 грн на першу оренду, а після завершення його оренди вам активується −150 грн на наступну.<br><br>Кожен зароблений бонус −150 грн діє 150 днів з моменту активації.'''
HTML=f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style></head><body>
<div class="modal"><button class="modal-backdrop"></button><div class="modal-card"><div class="modal-form referral-share-modal">
<header><div><small>Приведи друга</small><h2>Клименко Катерина</h2><p>Друг отримує −100 грн на першу оренду, клієнт — −150 грн після її завершення.</p></div><button class="close">×</button></header>
<div class="referral-share-scroll">
<div class="referral-send-status pending"><i>!</i><div><b>Ще не надсилали</b><span>Надішліть персональний код клієнту. Текст повідомлення скопіюється автоматично.</span></div></div>
<div class="referral-share-card referral-code-card"><div><span>Персональний код</span><strong>VA-AEBC060</strong><small>Безстроковий · можна передавати кільком друзям</small></div><button class="btn referral-copy-code">Скопіювати</button></div>
<div class="referral-summary-line"><span><b>0</b> рекомендацій</span><i>·</i><span><b>0 грн</b> зароблено</span><i>·</i><span><b>0 грн</b> доступно</span></div>
<div class="referral-main-grid"><div class="referral-main-left"><section class="referral-action-panel"><div><small>Надіслати програму</small><strong>Основний канал — Instagram</strong><span>Основний канал виділено. Текст скопіюється автоматично; після фактичної відправки підтвердьте її в адмінці.</span></div><div class="referral-action-status pending" id="referralActionStatus"><i>○</i><span><b>Ще не надіслано</b><small>Після відкриття каналу підтвердьте фактичну відправку.</small></span></div><div class="referral-primary-actions"><button class="btn primary" data-channel="instagram">Надіслати в Instagram</button><button class="btn" data-channel="telegram">Надіслати в Telegram</button></div></section></div>
<section class="referral-message-card"><div class="referral-message-head"><div><small>Готовий текст</small><strong>Повідомлення клієнту</strong></div><button class="btn referral-copy-text">Скопіювати текст</button></div><div class="referral-message-preview">{MESSAGE}</div></section></div>
<section class="referral-empty-state"><i>↗</i><div><strong>Поки що рекомендацій немає</strong><span>Коли друг використає код, тут з’явиться його бронювання, статус і бонус клієнта.</span></div></section>
</div><footer><button class="btn">Контакти клієнта</button><button class="btn primary">Готово</button></footer>
</div></div></div></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    passed=0
    for width,height in ((320,760),(390,844),(430,900),(1024,768),(1280,800),(1440,900),(1648,960)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(HTML,wait_until='load')
        result=page.evaluate('''() => {
          const card=document.querySelector('.modal-card');
          const form=document.querySelector('.referral-share-modal');
          const message=document.querySelector('.referral-message-card');
          const preview=document.querySelector('.referral-message-preview');
          const insta=document.querySelector('[data-channel="instagram"]');
          const tg=document.querySelector('[data-channel="telegram"]');
          const empty=document.querySelector('.referral-empty-state');
          const scroll=document.querySelector('.referral-share-scroll');
          const actionStatus=document.querySelector('#referralActionStatus');
          const asr=actionStatus.getBoundingClientRect();
          const cr=card.getBoundingClientRect(), fr=form.getBoundingClientRect(), mr=message.getBoundingClientRect(), er=empty.getBoundingClientRect(), sr=scroll.getBoundingClientRect();
          return {
            sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
            cardW:cr.width,formW:fr.width,deadRight:Math.max(0,cr.right-fr.right),
            messageVisible:mr.width>100&&mr.height>0&&getComputedStyle(message).display!=='none',
            previewChars:preview.innerText.trim().length,
            messageBeforeHistory:mr.top<er.top,
            messageInInitialScrollViewport:mr.top>=sr.top-1 && mr.top<sr.bottom-24,
            instaPrimary:insta.classList.contains('primary'),
            instaVisible:insta.getBoundingClientRect().width>0,
            tgVisible:tg.getBoundingClientRect().width>0,
            bodyOverflow:document.body.scrollWidth-document.body.clientWidth,
            actionStatusText:actionStatus.innerText.trim(),actionStatusVisible:asr.width>100&&asr.height>30
          };
        }''')
        assert result['sw'] <= result['cw']+1 and result['bodyOverflow'] <= 1, (width,result)
        assert result['messageVisible'] and result['previewChars'] > 120 and result['messageBeforeHistory'] and result['messageInInitialScrollViewport'], (width,result)
        assert result['instaPrimary'] and result['instaVisible'] and result['tgVisible'], (width,result)
        assert result['actionStatusVisible'] and 'Ще не надіслано' in result['actionStatusText'], (width,result)
        if width>900:
            assert result['cardW'] <= 982 and abs(result['cardW']-result['formW']) <= 2 and result['deadRight'] <= 2, (width,result)
        passed += 1
        page.close()
    browser.close()
print(f'Referral modal visual QA: {passed}/7 PASS')
