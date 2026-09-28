from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'assets'/'admin-v4321.css').read_text(encoding='utf-8')+'\n'+(ROOT/'assets'/'admin-v4330.css').read_text(encoding='utf-8')
JS=(ROOT/'assets'/'admin-v4330.js').read_text(encoding='utf-8')
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)
HTML='''<!doctype html><html class="v43-prod v4321 v4330"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<div class="detail v4321-detail-ready" style="max-width:420px;margin:20px auto">
<section class="native-detail-card" data-status="confirmed">
  <div class="native-detail-info-row v4321-chevron-row"><i>▣</i><div><small>Техніка</small><strong>HOME RESET</strong></div></div>
  <div class="native-detail-info-row v4321-chevron-row"><i>▣</i><div><small>Техніка</small><strong>Kärcher Puzzi 8/1</strong></div></div>
</section>
</div></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width in (390,430):
        page=browser.new_page(viewport={'width':width,'height':844})
        page.set_content(HTML)
        page.add_style_tag(content=CSS)
        page.add_script_tag(content=JS)
        row=page.locator('[data-v4330-home-reset="1"]')
        row.wait_for()
        assert row.get_attribute('role')=='button'
        assert row.get_attribute('aria-expanded')=='false'
        assert 'показати склад' in row.locator('.v4330-home-reset-hint').inner_text()
        row.click()
        assert row.get_attribute('aria-expanded')=='true'
        panel=row.locator('.v4330-home-reset-kit')
        assert panel.is_visible()
        text=panel.inner_text()
        for expected in ('Kärcher Puzzi 8/1','Kärcher SC 2 Deluxe','Jimmy JV35','ABIR WD8'):
            assert expected in text
        box=panel.bounding_box()
        assert box and box['x']>=0 and box['x']+box['width']<=width+0.5
        row.focus()
        row.press('Space')
        assert row.get_attribute('aria-expanded')=='false'
        assert not panel.is_visible()
        regular=page.locator('.native-detail-info-row').nth(1)
        assert regular.get_attribute('data-v4330-home-reset') is None
        page.screenshot(path=str(OUT/f'v4330-home-reset-{width}.png'),full_page=True)
        page.close()
    browser.close()
print('PASS: v4.3.30 HOME RESET equipment disclosure')
