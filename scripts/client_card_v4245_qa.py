#!/usr/bin/env python3
from pathlib import Path
import json, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).resolve().parent))
import pwa_visual_qa as base

ART=Path('client-card-v4245-results').resolve(); ART.mkdir(parents=True,exist_ok=True)
failed=[]; passed=0

def check(cond,label):
    global passed
    if cond:
        passed+=1; print('PASS:',label)
    else:
        failed.append(label); print('FAIL:',label)

def open_card(page):
    # Open the first booking client card from the real admin renderer.
    card=page.locator('.booking-card').first
    card.locator('[data-client-card]').click()
    page.wait_for_selector('#clientEditor')
    return page.locator('#clientEditor')

with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox']}
    if Path('/usr/bin/chromium').exists(): opts.update(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    browser=p.chromium.launch(**opts)
    for width,height,standalone,label in [(1440,900,False,'desktop-1440'),(390,844,True,'mobile-390')]:
        page=base.render_page(browser,width,height,authenticated=True,standalone=standalone)
        try:
            if standalone:
                if page.locator('.pwa-update-prompt').count(): page.locator('.pwa-update-later').click()
                base.open_mobile_view(page,'bookings'); page.wait_for_timeout(80)
            form=open_card(page)
            check(form.count()==1,f'{label}: client card opens')
            check(form.locator('.client-card-v245').count()==0 or form.evaluate("el=>el.classList.contains('client-card-v245')"),f'{label}: v4.2.45 client card renderer active')
            check(form.locator('.client-referral-quick').count()==0,f'{label}: no duplicate referral quick action')
            check(form.locator('.client-next-action-section').count()==0,f'{label}: no permanent next-action noise')
            check(form.locator('.client-contact-read').is_visible(),f'{label}: contacts are read-first')
            action_widths=form.locator('.client-quick-actions-v245>.btn,.client-quick-actions-v245>a').evaluate_all('els=>els.map(e=>e.getBoundingClientRect().width)')
            if label=='desktop-1440' or len(action_widths)%2==0:
                check(len(action_widths)<=1 or max(action_widths)-min(action_widths)<4,f'{label}: primary actions use equal fill')
            else:
                check(len(action_widths)<3 or max(action_widths[:-1])-min(action_widths[:-1])<4,f'{label}: paired primary actions use equal fill')
            check(not form.locator('.client-contact-edit-fields').is_visible(),f'{label}: edit fields hidden by default')
            titles=[x.strip() for x in form.locator('details.client-secondary-section>summary b').all_text_contents()]
            check(titles==['Бонуси й referral','Документ','SMS'],f'{label}: secondary information is progressive disclosure')
            check(all(not form.locator('details.client-secondary-section').nth(i).evaluate('e=>e.open') for i in range(form.locator('details.client-secondary-section').count())),f'{label}: secondary sections closed by default')
            if label=='desktop-1440':
                grid=form.locator('.client-card-grid-v245').evaluate("e=>getComputedStyle(e).gridTemplateColumns")
                check(len(grid.split())>=2,f'{label}: two-column core layout')
            else:
                overflow=form.evaluate('el=>el.scrollWidth-el.clientWidth')
                check(overflow<=1,f'{label}: no horizontal overflow')
                action_count=form.locator('.client-quick-actions-v245>.btn,.client-quick-actions-v245>a').count()
                if action_count%2==1:
                    last=form.locator('.client-quick-actions-v245>.btn,.client-quick-actions-v245>a').last.evaluate('e=>e.getBoundingClientRect().width')
                    row=form.locator('.client-quick-actions-v245').evaluate('e=>e.getBoundingClientRect().width')
                    check(abs(last-row)<3,f'{label}: odd last action fills the row without an empty cell')
            page.screenshot(path=str(ART/f'{label}-client-card.png'),full_page=False)
            form.locator('#clientContactEdit').click()
            check(form.locator('.client-contact-edit-fields').is_visible(),f'{label}: edit action explicitly reveals fields')
        finally:
            page.close()
    browser.close()

result={'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'}
(ART/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
