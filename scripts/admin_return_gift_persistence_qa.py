#!/usr/bin/env python3
from pathlib import Path
import json, os, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).resolve().parent))
import pwa_visual_qa as base

ART=Path('gift-persistence-test-results').resolve(); ART.mkdir(parents=True,exist_ok=True)
failed=[]; passed=0
def check(cond,label):
 global passed
 if cond: passed+=1; print('PASS:',label)
 else: failed.append(label); print('FAIL:',label)

# Exact user scenario: completed Puzzi+SC2, rental base >= 1000, two packets,
# legacy chemistry flag from the stale backend and no persisted gifts.story yet.
b=base.BOOKINGS[4]
b.update({
  'booking_code':'VAC-GIFT-PERSIST-001','product_code':'combo','product_label':'Puzzi + SC 2',
  'base_amount':1200,'delivery_amount':250,'extras_amount':0,'total_amount':1450,
  'deposit_amount':1500,'deposit_paid':True,'deposit_returned':True,'status':'completed',
  'fulfillment':'delivery','fulfillment_address':'Полтава, Бульвар Богдана Хмельницького 12а',
  'extras':{'selected_items':[],'base_before_discount':1200,'discount':{'percent':0,'amount':0,'source':'none'},'chemistry':{'used_packets':2,'story_mention':True,'free_packets':2,'paid_packets':0,'price_per_packet':50,'amount':0},'settlement':{'refund_amount':250,'due_amount':0,'completed':True}}
})

with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox']}
 if Path('/usr/bin/chromium').exists(): opts.update(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 browser=p.chromium.launch(**opts)
 page=base.render_page(browser,390,844,authenticated=True,standalone=True)
 try:
  if page.locator('.pwa-update-prompt').count(): page.locator('.pwa-update-later').click()
  base.open_mobile_view(page,'bookings')
  page.wait_for_timeout(80)
  returned=page.locator('.booking-toolbar button').filter(has_text='Повернені')
  if returned.count(): returned.click(); page.wait_for_timeout(80)
  card=page.locator(f'.booking-card[data-id="{b["id"]}"]')
  check(card.count()==1,'completed booking fixture is visible')
  # Exact delivery alignment from the user's screenshot.
  align=card.locator('.booking-delivery').evaluate('''el=>{const h=el.querySelector('.booking-delivery-head').getBoundingClientRect(),a=el.querySelector('.booking-delivery-amount').getBoundingClientRect(),addr=el.querySelector('.booking-delivery-address').getBoundingClientRect();return {headRight:h.right,amountRight:a.right,amountLeft:a.left,addressTop:addr.top,headBottom:h.bottom}}''')
  check(abs(align['headRight']-align['amountRight'])<2,'delivery 250 грн is physically right-aligned in admin card')
  check(align['addressTop']>=align['headBottom']-1,'delivery address is a separate row below amount')
  page.screenshot(path=str(ART/'mobile-390-delivery-aligned.png'),full_page=True)

  # Wrap mock backend so save_finance mutates the fixture exactly like v8 production source.
  page.evaluate('''(()=>{const prior=window.fetch;window.__lastStoryFinancePayload=null;window.fetch=async(url,options={})=>{let p={};try{p=options.body?JSON.parse(options.body):{}}catch{};if(String(url).includes('vacleaner-admin-bookings-v4')&&p.action==='save_finance'){window.__lastStoryFinancePayload=p;const x=window.__bookings.find(v=>v.id===p.bookingId);if(x){const choice=p.storyMention?p.storyGiftChoice:'';x.extras=x.extras||{};x.extras.gifts={...(x.extras.gifts||{}),story:p.storyMention?{mention:true,eligible:true,choice,scent:null}:null};x.extras.chemistry={...(x.extras.chemistry||{}),used_packets:Number(p.usedPackets||0),story_mention:choice==='chemistry2'};const used=Number(p.usedPackets||0),free=choice==='chemistry2'?Math.min(2,used):0,chem=(used-free)*50;x.extras.chemistry.free_packets=free;x.extras.chemistry.paid_packets=used-free;x.extras.chemistry.amount=chem;x.extras_amount=chem;x.total_amount=Number(x.base_amount||0)+Number(x.delivery_amount||0)+chem;const received=Number(x.prepayment_amount||200)+Number(x.deposit_amount||0);const refund=Math.max(0,received-x.total_amount);return {ok:true,status:200,json:async()=>({booking:x,finance:{refundAmount:refund,dueAmount:0,totalAmount:x.total_amount,receivedAmount:received}})};} }return prior(url,options);};})()''')

  card.locator('[data-action="finance"]').click()
  page.wait_for_selector('#financeForm')
  check(page.locator('input[name="storyGiftChoice"][value="chemistry2"]').is_checked(),'legacy chemistry state is initially represented honestly')
  page.locator('input[name="storyGiftChoice"][value="diffuser50"]').check()
  check(page.locator('input[name="storyGiftChoice"][value="diffuser50"]').is_checked(),'manager can select VA HOME diffuser')
  page.locator('#financeForm button[type="submit"]').click()
  page.wait_for_selector('#financeForm',state='detached')
  payload=page.evaluate('window.__lastStoryFinancePayload')
  check(payload and payload.get('storyMention') is True and payload.get('storyGiftChoice')=='diffuser50','save_finance payload carries explicit diffuser choice')

  # Reload happened after save; reopen and prove persisted server state rehydrates UI.
  page.wait_for_timeout(100)
  card=page.locator(f'.booking-card[data-id="{b["id"]}"]')
  card.locator('[data-action="finance"]').click(); page.wait_for_selector('#financeForm')
  check(page.locator('input[name="storyGiftChoice"][value="diffuser50"]').is_checked(),'saved diffuser reopens as selected')
  check(not page.locator('input[name="storyGiftChoice"][value="chemistry2"]').is_checked(),'chemistry option does not steal selection back')
  live=page.locator('#live').inner_text()
  check('100 грн' in live and '2 − 0 бонус' in live,'diffuser selection charges used chemistry instead of granting two free portions')
  page.screenshot(path=str(ART/'mobile-390-diffuser-persisted.png'),full_page=True)
 finally:
  browser.close()

result={'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'}
(ART/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
