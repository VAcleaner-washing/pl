#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as pwa  # noqa: E402

class QA:
    def __init__(self, artifacts: Path):
        self.artifacts=artifacts; self.passed=0; self.failed=[]
    def check(self, cond, label):
        if cond: self.passed+=1; print('PASS:',label)
        else: self.failed.append(label); print('FAIL:',label)
    def shot(self,page,name):
        self.artifacts.mkdir(parents=True,exist_ok=True); page.screenshot(path=str(self.artifacts/name),full_page=True)

def cssnum(page, selector, prop):
    return float(page.locator(selector).evaluate(f"el=>parseFloat(getComputedStyle(el).{prop})"))

def suite(browser,qa,width,height,label):
    page=pwa.render_page(browser,width,height)
    try:
        page.locator('.pwa-update-later').click(); page.wait_for_timeout(40)
        top=page.locator('.topbar').bounding_box(); side=page.locator('.sidebar').bounding_box()
        qa.check(top and abs(top['height']-80)<=1, f'{label}: topbar is compact 80px')
        qa.check(side and abs(side['width']-236)<=1, f'{label}: sidebar is compact 236px')
        qa.check(14 <= cssnum(page,'body','fontSize') <= 15, f'{label}: body type stays readable')
        navh=page.locator('.nav button').first.bounding_box()['height']; qa.check(45<=navh<=47,f'{label}: navigation is dense without becoming tiny')
        qa.check(page.locator('.operation-card').first.bounding_box()['height'] <= 96, f'{label}: operation cards are compact')
        qa.check(pwa.no_overflow(page),f'{label}: shell has no horizontal overflow')
        page.locator('#newBooking').click(); page.wait_for_selector('#bookingForm')
        card=page.locator('.modal-card').bounding_box(); head=page.locator('#bookingForm>header h2').bounding_box();
        field=page.locator('#bookingForm .premium-control').first.bounding_box(); btn=page.locator('#bookingForm>footer .btn').last.bounding_box()
        qa.check(card and card['height']<=832 and card['y']>=13, f'{label}: new booking modal uses denser desktop geometry')
        qa.check(head and 27<=head['height']<=34, f'{label}: modal title is compact but prominent')
        qa.check(field and 47<=field['height']<=49, f'{label}: form controls are 48px density')
        qa.check(btn and btn['height']>=44, f'{label}: primary action stays at least 44px')
        qa.check(btn and btn['y']+btn['height']<=height-13, f'{label}: modal footer stays inside viewport')
        qa.check(pwa.no_overflow(page),f'{label}: new booking modal has no horizontal overflow')
        qa.shot(page,f'{label}-new-booking.png')
        page.locator('#bookingForm .close').click(); page.wait_for_timeout(30)
        # Issue modal
        target=pwa.BOOKINGS[2]['id']; page.locator(f'.booking-card[data-id="{target}"] [data-action="issue"]').click(); page.wait_for_selector('#issueForm')
        issue=page.locator('.modal-card').bounding_box(); issue_btn=page.locator('#issueForm>footer .btn').last.bounding_box()
        qa.check(issue and issue['height']<=682, f'{label}: issue modal is compact')
        qa.check(issue_btn and issue_btn['height']>=44, f'{label}: issue action stays 44px+')
        qa.check(pwa.no_overflow(page),f'{label}: issue modal has no horizontal overflow')
        qa.shot(page,f'{label}-issue.png')
        page.locator('#issueForm .close').click(); page.wait_for_timeout(30)
        # Finance modal
        target=pwa.BOOKINGS[3]['id']; page.locator(f'.booking-card[data-id="{target}"] [data-action="finance"]').click(); page.wait_for_selector('#financeForm')
        finance=page.locator('.modal-card').bounding_box(); finance_btn=page.locator('#financeForm>footer .btn').last.bounding_box()
        qa.check(finance and finance['height']<=702, f'{label}: finance modal is compact')
        qa.check(finance_btn and finance_btn['height']>=44, f'{label}: finance action stays 44px+')
        qa.check(pwa.no_overflow(page),f'{label}: finance modal has no horizontal overflow')
        qa.shot(page,f'{label}-finance.png')
    finally:
        page.close()

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--artifacts',default='density-test-results'); args=ap.parse_args()
    artifacts=Path(args.artifacts).resolve(); qa=QA(artifacts)
    with sync_playwright() as p:
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'); opts={'headless':True,'args':['--no-sandbox']}
        if executable: opts['executable_path']=executable
        elif Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
        browser=p.chromium.launch(**opts)
        try:
            suite(browser,qa,1440,1000,'desktop-1440')
            suite(browser,qa,1280,900,'desktop-1280')
            suite(browser,qa,1024,768,'desktop-1024')
        except Exception as exc:
            qa.failed.append(f'Unhandled density QA error: {exc}'); print('FAIL:',qa.failed[-1])
        finally: browser.close()
    result={'passed':qa.passed,'failed':qa.failed,'status':'passed' if not qa.failed else 'failed'}
    artifacts.mkdir(parents=True,exist_ok=True); (artifacts/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False)); return 0 if not qa.failed else 1
if __name__=='__main__': raise SystemExit(main())
