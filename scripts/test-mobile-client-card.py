#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE_CSS = (ROOT / 'assets/admin-v250.css').read_text(encoding='utf-8') + '\n' + (ROOT / 'assets/admin-glass-test.css').read_text(encoding='utf-8')
NATIVE_CSS = BASE_CSS + '\n' + (ROOT / 'assets/admin-v430.css').read_text(encoding='utf-8') + '\n' + (ROOT / 'assets/admin-v4310.css').read_text(encoding='utf-8')
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
HTML = f'''<!doctype html><html class="glass-test"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{BASE_CSS}</style><style>body{{margin:0;background:#070b0e;color:#f4f1eb;padding:18px;font-family:Arial,sans-serif}}.client-card-grid{{display:block}}.modal-section{{margin-bottom:14px}}.fixture{{max-width:760px;margin:auto}}</style></head><body>{FIXTURE}</body></html>'''

EDIT_FIXTURE = '''
<form class="modal-form client-editor-form client-card-form client-card-v245" id="clientEditor">
  <div class="client-editor-scroll">
    <section class="modal-section client-contact-section client-contact-section-v245">
      <div class="client-section-head"><div><h3>Контакти</h3></div><button class="btn subtle client-contact-edit-toggle" type="button" id="clientContactEdit">Редагувати</button></div>
      <div class="client-contact-read">
        <div><span>Телефон</span><strong><a href="tel:+380994559791">+380 99 455 97 91</a></strong></div>
        <div><span>Основний канал</span><strong>Телефон</strong></div>
        <div class="wide"><span>Адреса доставки</span><strong>Полтава, вулиця Соборності, 43</strong><small>БЦ Панорама</small></div>
      </div>
      <div class="fields client-contact-edit-fields" hidden>
        <label class="field"><span>ПІБ</span><input name="customerName" value="Иванова Ольга Юріївна"></label>
        <label class="field"><span>Телефон</span><input name="customerPhone" value="+380994559791"></label>
        <label class="field"><span>Instagram</span><input name="customerInstagram" placeholder="@username"></label>
        <label class="field"><span>Telegram</span><input name="customerTelegram" placeholder="@username або номер"></label>
        <label class="field"><span>Основний канал</span><select name="preferredContact"><option>Телефон</option></select></label>
        <label class="field"><span>Адреса доставки</span><input name="customerAddress" value="Полтава, вулиця Соборності, 43"></label>
      </div>
    </section>
  </div>
</form>
<script>
  const form=document.getElementById('clientEditor');
  document.getElementById('clientContactEdit').addEventListener('click',event=>{
    const section=form.querySelector('.client-contact-section-v245');
    const fields=form.querySelector('.client-contact-edit-fields');
    const editing=!section.classList.contains('is-editing');
    section.classList.toggle('is-editing',editing);
    fields.hidden=!editing;
    event.currentTarget.textContent=editing?'Готово':'Редагувати';
  });
</script>
'''
EDIT_HTML = f'''<!doctype html><html class="glass-test native-test native-v2 native-v21 native-v22 native-v23 native-v24 native-v25 native-v26 native-v27 native-v28 v43-prod"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{NATIVE_CSS}</style><style>body{{margin:0;background:#070b0e;color:#f4f1eb;font-family:Arial,sans-serif}}#clientEditor{{position:relative!important;inset:auto!important;height:auto!important;min-height:100vh!important}}.client-editor-scroll{{height:auto!important;padding:16px!important}}</style></head><body>{EDIT_FIXTURE}</body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
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
        page.close()

        page = browser.new_page(viewport={'width': width, 'height': height})
        page.set_content(EDIT_HTML, wait_until='load')
        state = page.evaluate('''() => {
          const read=document.querySelector('.client-contact-read');
          const edit=document.querySelector('.client-contact-edit-fields');
          return {read:getComputedStyle(read).display,edit:getComputedStyle(edit).display,hidden:edit.hidden,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
        }''')
        assert state['read'] != 'none' and state['edit'] == 'none' and state['hidden'] is True, (width, 'initial', state)
        assert state['overflow'] == 0, (width, 'initial overflow', state)

        page.click('#clientContactEdit')
        state = page.evaluate('''() => {
          const read=document.querySelector('.client-contact-read');
          const edit=document.querySelector('.client-contact-edit-fields');
          const section=document.querySelector('.client-contact-section-v245');
          return {read:getComputedStyle(read).display,edit:getComputedStyle(edit).display,hidden:edit.hidden,editing:section.classList.contains('is-editing'),label:document.getElementById('clientContactEdit').textContent.trim(),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
        }''')
        assert state['read'] == 'none' and state['edit'] == 'grid' and state['hidden'] is False and state['editing'] is True, (width, 'edit', state)
        assert state['label'] == 'Готово' and state['overflow'] == 0, (width, 'edit label/overflow', state)

        page.click('#clientContactEdit')
        state = page.evaluate('''() => {
          const read=document.querySelector('.client-contact-read');
          const edit=document.querySelector('.client-contact-edit-fields');
          return {read:getComputedStyle(read).display,edit:getComputedStyle(edit).display,hidden:edit.hidden,label:document.getElementById('clientContactEdit').textContent.trim()};
        }''')
        assert state['read'] != 'none' and state['edit'] == 'none' and state['hidden'] is True, (width, 'done', state)
        assert state['label'] == 'Редагувати', (width, 'done label', state)
        passed += 1
        page.close()
    browser.close()
print(f'Mobile client card QA: {passed}/3 widths PASS; read/edit disclosure exclusive')
