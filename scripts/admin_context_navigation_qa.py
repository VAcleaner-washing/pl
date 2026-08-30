#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as fixture  # noqa:E402

checks=[]
def ck(label,cond):
    ok=bool(cond);checks.append((label,ok));print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as pw:
    opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**opts)
    page=fixture.render_page(browser,1440,900,authenticated=True,standalone=False)
    if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click()
    try:
        # Booking detail -> client card -> close/back -> same booking detail.
        booking=fixture.BOOKINGS[0]
        page.evaluate("id=>document.querySelector(`.booking-card[data-id=\"${id}\"]`)?.click()",booking['id']);page.wait_for_timeout(60)
        ck('booking detail opens',page.locator('.detail').count()==1 and booking['booking_code'] in page.locator('.detail').inner_text())
        page.locator('.detail [data-client-card]').click();page.wait_for_timeout(80)
        ck('client card opens from booking detail',page.locator('#clientEditor').count()==1)
        ck('client card exposes back-to-booking control','До бронювання' in page.locator('#clientEditor').inner_text())
        page.locator('#clientEditor .client-footer-close').click();page.wait_for_timeout(100)
        ck('closing client card returns to same booking detail',page.locator('.detail').count()==1 and booking['booking_code'] in page.locator('.detail').inner_text())

        # Detail -> client -> new booking -> close -> client card.
        page.locator('.detail [data-client-card]').click();page.wait_for_timeout(60)
        page.locator('#clientCreateBooking').click();page.wait_for_timeout(80)
        ck('new booking opens from client card',page.locator('#bookingForm').count()==1)
        page.locator('#bookingForm [data-close]').first.click();page.wait_for_timeout(100)
        ck('closing new booking returns to client card',page.locator('#clientEditor').count()==1)

        # Returned client -> referral -> back -> client card.
        page.locator('#clientEditor .client-footer-close').click();page.wait_for_timeout(80)
        if page.locator('.detail').count(): page.locator('.detail .back').click();page.wait_for_timeout(70)
        page.locator('.chip').nth(5).click();page.wait_for_timeout(60)
        page.locator('.booking-card').last.locator('.booking-client-link').click();page.wait_for_timeout(80)
        page.evaluate("""()=>{const previous=window.fetch;window.fetch=async(url,options={})=>{let payload={};try{payload=options.body?JSON.parse(options.body):{}}catch{}if(payload.action==='referral_summary')return{ok:true,status:200,json:async()=>({referral:{code:'VA-TEST123',inviteCount:0,completedReferrals:0,earnedRewardAmount:0,activeRewardAmount:0,lastInvite:null,referrals:[],rewards:[],profile:{name:'Клієнт',preferred_contact:'instagram',instagram:'client.test',telegram:'@client_test'}}})};if(payload.action==='referral_invite_sent')return{ok:true,status:200,json:async()=>({ok:true})};return previous(url,options)}}""")
        ck('returned client card opens',page.locator('#clientEditor').count()==1)
        ck('referral action exists for completed client',page.locator('#clientOpenReferral').count()==1)
        if page.locator('#clientOpenReferral').count():
            page.locator('#clientOpenReferral').click();page.wait_for_timeout(100)
            ck('referral modal opens',page.locator('.referral-share-modal').count()==1)
            ck('referral modal exposes parent back control',page.locator('[data-layer-back]').count()==1)
            if page.locator('[data-layer-back]').count(): page.locator('[data-layer-back]').click();page.wait_for_timeout(100)
            ck('referral back returns to client card',page.locator('#clientEditor').count()==1)
    finally:
        page.close();browser.close()

failed=[label for label,ok in checks if not ok]
if failed:
    print(f'Admin context navigation QA failed: {len(failed)}')
    raise SystemExit(1)
print(f'Admin context navigation QA: {len(checks)}/{len(checks)} PASS')
