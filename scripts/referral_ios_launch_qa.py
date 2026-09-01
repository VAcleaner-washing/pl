#!/usr/bin/env python3
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as fixture  # noqa:E402

checks=[]
def ck(label,cond):
    ok=bool(cond);checks.append((label,ok));print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-gpu'])
    page=fixture.render_page(browser,390,844,authenticated=True,standalone=True)
    try:
        if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click()
        page.evaluate("""()=>{
          Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',configurable:true});
          window.__externalLaunches=[];window.__windowOpens=[];
          HTMLAnchorElement.prototype.click=function(){window.__externalLaunches.push(this.href)};
          window.open=(...args)=>{window.__windowOpens.push(args);return null};
          const previous=window.fetch;
          window.fetch=async(url,options={})=>{
            let payload={};try{payload=options.body?JSON.parse(options.body):{}}catch{}
            if(payload.action==='referral_summary')return{ok:true,status:200,json:async()=>({referral:{code:'VA-TEST123',inviteCount:0,completedReferrals:0,earnedRewardAmount:0,activeRewardAmount:0,lastInvite:null,referrals:[],rewards:[],profile:{name:'Клієнт',preferred_contact:'instagram',instagram:'anna.home',telegram:'@client_test'}}})};
            return previous(url,options);
          };
        }""")
        fixture.open_mobile_view(page,'bookings')
        page.wait_for_timeout(80)
        # Returned/completed filter -> client card -> referral modal.
        chips=page.locator('.chip')
        ck('booking status chips are available',chips.count()>=6)
        if chips.count()>=6:
            chips.nth(5).click();page.wait_for_timeout(80)
            client_link=page.locator('.booking-card .booking-client-link').last
            ck('completed booking exposes client card link',client_link.count()==1)
            if client_link.count():
                client_link.click();page.wait_for_timeout(100)
                ck('client card opens',page.locator('#clientEditor').count()==1)
                benefits=page.locator('.client-benefits-section>summary')
                ck('client card exposes referral section',benefits.count()==1)
                if benefits.count():
                    benefits.click();page.wait_for_timeout(80)
                referral=page.locator('#clientOpenReferralDetails:visible')
                ck('client card exposes referral action inside benefits',referral.count()==1)
                if referral.count():
                    referral.click();page.wait_for_timeout(120)
                    send=page.locator('[data-referral-send="instagram"]')
                    ck('referral modal exposes Instagram send action',send.count()==1)
                    if send.count():
                        send.click();page.wait_for_timeout(80)
                        launches=page.evaluate('window.__externalLaunches.slice()')
                        opens=page.evaluate('window.__windowOpens.slice()')
                        ck('iOS standalone launches native Instagram scheme',any(x.startswith('instagram://user?username=anna.home') for x in launches))
                        ck('iOS standalone does not create a blank browser window',len(opens)==0)
                        ck('referral modal remains in the PWA after external launch',page.locator('.referral-share-modal').count()==1)
                        ck('return state is ready for explicit sent confirmation','Так, надіслано' in send.inner_text())
    finally:
        page.close();browser.close()

failed=[label for label,ok in checks if not ok]
if failed:
    print(f'Referral iOS launch QA failed: {len(failed)}')
    raise SystemExit(1)
print(f'Referral iOS launch QA: {len(checks)}/{len(checks)} PASS')
