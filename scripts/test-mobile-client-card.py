#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'assets/admin-v250.css').read_text(encoding='utf-8') + '\n' + (ROOT / 'assets/admin-glass-test.css').read_text(encoding='utf-8')
FIXTURE = '''
<div class="fixture">
  <section class="modal-section client-document-section">
    <div class="client-section-head"><div><small>02</small><h3>Документ</h3></div><span>перевірено</span></div>
    <div class="client-document-preview preview-unavailable">
      <div class="document-private-badge">Приватний документ</div>
      <img hidden alt="Фото документа клієнта">
      <div class="document-preview-meta">
        <div><b>IMG_2676.HEIC</b><span>Формат фото не підтримує попередній перегляд у цьому браузері — відкрийте файл кнопкою.</span></div>
        <a class="btn subtle" href="#">Відкрити фото</a>
      </div>
    </div>
  </section>
  <section class="modal-section client-history-section">
    <div class="client-section-head"><div><small>03</small><h3>Історія оренд</h3></div><span>2 записів</span></div>
    <div class="client-rental-history">
      <article><div><strong>Ідеальні вікна</strong><span>08.08.2026 · VAC-260808-02454</span></div><div><span class="status issued">Видано</span><b>2 100 грн</b></div></article>
      <article><div><strong>Kärcher Puzzi 8/1</strong><span>04.09.2024 · HIST-240904-7ED8C7</span></div><div><span class="status completed">Повернено</span><b>600 грн</b></div></article>
    </div>
  </section>
</div>
'''
HTML = f'''<!doctype html><html class="glass-test"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style><style>body{{margin:0;background:#070b0e;color:#f4f1eb;padding:18px;font-family:Arial,sans-serif}}.client-card-grid{{display:block}}.modal-section{{margin-bottom:14px}}.fixture{{max-width:760px;margin:auto}}</style></head><body>{FIXTURE}</body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    passed = 0
    for width, height in ((320, 760), (390, 844), (430, 900)):
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.set_content(HTML, wait_until='load')
        result = page.evaluate('''() => {
          const badge=document.querySelector('.document-private-badge');
          const meta=document.querySelector('.document-preview-meta');
          const button=document.querySelector('.document-preview-meta .btn');
          const statuses=[...document.querySelectorAll('.client-rental-history .status')];
          const cards=[...document.querySelectorAll('.client-rental-history article')];
          const r=e=>e.getBoundingClientRect();
          return {
            badgePosition:getComputedStyle(badge).position,
            badgeBottom:r(badge).bottom,
            metaTop:r(meta).top,
            buttonHeight:r(button).height,
            pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
            statuses:statuses.map(s=>({scrollWidth:s.scrollWidth,clientWidth:s.clientWidth,maxWidth:getComputedStyle(s).maxWidth,overflow:getComputedStyle(s).overflow})),
            cards:cards.map(c=>({scrollWidth:c.scrollWidth,clientWidth:c.clientWidth}))
          };
        }''')
        assert result['badgePosition'] == 'static', (width, result)
        assert result['badgeBottom'] <= result['metaTop'] + 0.5, (width, result)
        assert result['buttonHeight'] >= 47, (width, result)
        assert result['pageOverflow'] == 0, (width, result)
        assert all(x['scrollWidth'] <= x['clientWidth'] for x in result['cards']), (width, result)
        assert all(x['scrollWidth'] <= x['clientWidth'] and x['maxWidth'] == 'none' and x['overflow'] == 'visible' for x in result['statuses']), (width, result)
        passed += 1
        page.close()
    browser.close()
print(f'Mobile client card QA: {passed}/3 PASS')
