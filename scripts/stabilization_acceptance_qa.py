#!/usr/bin/env python3
from pathlib import Path
import json, sys, copy
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).resolve().parent))
import pwa_visual_qa as base

ART=Path('stabilization-acceptance-results').resolve(); ART.mkdir(parents=True,exist_ok=True)
failed=[]; passed=0

def check(cond,label):
    global passed
    if cond:
        passed+=1; print('PASS:',label)
    else:
        failed.append(label); print('FAIL:',label)

def setup_fixture():
    b=base.BOOKINGS[4]
    b.update({
      'booking_code':'VAC-STAB-4244','product_code':'combo','product_label':'Puzzi + SC 2',
      'base_amount':1200,'delivery_amount':250,'extras_amount':0,'total_amount':1450,
      'deposit_amount':1500,'deposit_paid':True,'deposit_returned':True,'status':'completed',
      'fulfillment':'delivery','fulfillment_address':'Полтава, Бульвар Богдана Хмельницького 12а',
      'extras':{'selected_items':[],'base_before_discount':1200,'discount':{'percent':0,'amount':0,'source':'none'},'chemistry':{'used_packets':2,'story_mention':True,'free_packets':2,'paid_packets':0,'price_per_packet':50,'amount':0},'settlement':{'refund_amount':250,'due_amount':0,'completed':True}}
    })
    return b

def returned_card(page,b):
    returned=page.locator('.booking-toolbar button[data-filter="completed"]')
    if not returned.count(): returned=page.locator('.booking-toolbar button').filter(has_text='Повернені')
    if returned.count(): returned.first.click(); page.wait_for_timeout(100)
    card=page.locator(f'.booking-card[data-id="{b["id"]}"]')
    return card

def install_save_mock(page):
    page.evaluate('''(()=>{const prior=window.fetch;window.__lastStoryFinancePayload=null;window.fetch=async(url,options={})=>{let p={};try{p=options.body?JSON.parse(options.body):{}}catch{};if(String(url).includes('vacleaner-admin-bookings-v4')&&p.action==='save_finance'){window.__lastStoryFinancePayload=p;const x=window.__bookings.find(v=>v.id===p.bookingId);if(x){const choice=p.storyMention?p.storyGiftChoice:'';x.extras=x.extras||{};x.extras.gifts={...(x.extras.gifts||{}),story:p.storyMention?{mention:true,eligible:true,choice,scent:null}:null};x.extras.chemistry={...(x.extras.chemistry||{}),used_packets:Number(p.usedPackets||0),story_mention:choice==='chemistry2'};const used=Number(p.usedPackets||0),free=choice==='chemistry2'?Math.min(2,used):0,chem=(used-free)*50;x.extras.chemistry.free_packets=free;x.extras.chemistry.paid_packets=used-free;x.extras.chemistry.amount=chem;x.extras_amount=chem;x.total_amount=Number(x.base_amount||0)+Number(x.delivery_amount||0)+chem;const received=Number(x.prepayment_amount||200)+Number(x.deposit_amount||0);const refund=Math.max(0,received-x.total_amount);return {ok:true,status:200,json:async()=>({booking:x,finance:{refundAmount:refund,dueAmount:0,totalAmount:x.total_amount,receivedAmount:received}})};} }return prior(url,options);};})()''')

def modal_metrics(page):
    return page.locator('#financeForm').evaluate('''form=>{const q=s=>form.querySelector(s),r=e=>e.getBoundingClientRect(),labels=[...form.querySelectorAll('.return-story-options>label')],texts=[...form.querySelectorAll('.return-story-options b')];const card=form.closest('.modal-card'),layout=q('.modal-layout'),left=q('.modal-section'),fields=q('.fields'),gift=q('.return-story-bonus'),summary=q('.modal-summary'),footer=q('footer');const live=q('.modal-summary .live'),last=live?.lastElementChild;return{viewport:[innerWidth,innerHeight],card:r(card),layout:r(layout),left:r(left),fields:r(fields),gift:r(gift),summary:r(summary),summaryContentBottom:last?r(last).bottom:r(summary).bottom,footer:r(footer),labels:labels.map(r),textOverflow:texts.map(x=>x.scrollWidth>x.clientWidth+1),horizontal:card.scrollWidth-card.clientWidth,layoutHorizontal:layout.scrollWidth-layout.clientWidth}}''')

original=copy.deepcopy(base.BOOKINGS[4])
try:
  b=setup_fixture()
  with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox']}
    if Path('/usr/bin/chromium').exists(): opts.update(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    browser=p.chromium.launch(**opts)

    # Desktop acceptance: exact user-reported return finance surface.
    page=base.render_page(browser,1440,900,authenticated=True,standalone=False)
    try:
      card=returned_card(page,b)
      check(card.count()==1,'desktop: completed booking fixture is visible')
      delivery=card.locator('.booking-delivery').evaluate('''el=>{const h=el.querySelector('.booking-delivery-head').getBoundingClientRect(),a=el.querySelector('.booking-delivery-amount').getBoundingClientRect(),addr=el.querySelector('.booking-delivery-address').getBoundingClientRect();return{headRight:h.right,amountRight:a.right,addressTop:addr.top,headBottom:h.bottom}}''')
      check(abs(delivery['headRight']-delivery['amountRight'])<2,'desktop: delivery amount is right-aligned on exact admin card')
      check(delivery['addressTop']>=delivery['headBottom']-1,'desktop: delivery address is a separate row')
      install_save_mock(page)
      card.locator('[data-action="finance"]').click(); page.wait_for_selector('#financeForm')
      m=modal_metrics(page)
      check(m['card']['width']>=1080,'desktop: return finance has a purpose-built wide workspace')
      check(abs(m['gift']['width']-m['fields']['width'])<2,'desktop: Story gift spans the full left data grid')
      check(len(m['labels'])==2 and min(x['width'] for x in m['labels'])>=220,'desktop: both gift choices have readable card width')
      check(not any(m['textOverflow']),'desktop: gift names are not clipped or squeezed')
      check(m['summary']['bottom']-m['summaryContentBottom']<28,'desktop: summary has no artificial empty height below content')
      check(m['horizontal']<=1 and m['layoutHorizontal']<=1,'desktop: finance modal has no horizontal overflow')
      check(m['footer']['bottom']<=m['viewport'][1]+1,'desktop: finance actions remain inside viewport')
      page.screenshot(path=str(ART/'desktop-1440-return-finance.png'),full_page=False)
      page.locator('input[name="storyGiftChoice"][value="diffuser50"]').check()
      page.locator('#financeForm button[type="submit"]').click(); page.wait_for_selector('#financeForm',state='detached')
      payload=page.evaluate('window.__lastStoryFinancePayload')
      check(payload and payload.get('storyMention') is True and payload.get('storyGiftChoice')=='diffuser50','desktop: save payload carries diffuser choice')
      page.wait_for_timeout(100); card=returned_card(page,b); card.locator('[data-action="finance"]').click(); page.wait_for_selector('#financeForm')
      check(page.locator('input[name="storyGiftChoice"][value="diffuser50"]').is_checked(),'desktop: saved diffuser survives close/reload/reopen')
      check('2 − 0 бонус' in page.locator('#live').inner_text(),'desktop: diffuser does not grant two free Puzzi portions')
      page.screenshot(path=str(ART/'desktop-1440-diffuser-persisted.png'),full_page=False)
    finally:
      page.close()

    # PWA acceptance: exact delivery card + return finance geometry.
    b=setup_fixture()
    page=base.render_page(browser,390,844,authenticated=True,standalone=True)
    try:
      if page.locator('.pwa-update-prompt').count(): page.locator('.pwa-update-later').click()
      base.open_mobile_view(page,'bookings'); page.wait_for_timeout(80)
      card=returned_card(page,b)
      check(card.count()==1,'mobile-390: completed booking fixture is visible')
      delivery=card.locator('.booking-delivery').evaluate('''el=>{const h=el.querySelector('.booking-delivery-head').getBoundingClientRect(),a=el.querySelector('.booking-delivery-amount').getBoundingClientRect(),addr=el.querySelector('.booking-delivery-address').getBoundingClientRect();return{headRight:h.right,amountRight:a.right,addressTop:addr.top,headBottom:h.bottom}}''')
      check(abs(delivery['headRight']-delivery['amountRight'])<2,'mobile-390: delivery 250 грн is physically right-aligned')
      check(delivery['addressTop']>=delivery['headBottom']-1,'mobile-390: delivery address remains below the amount row')
      actions=card.locator('.booking-actions').evaluate('''el=>{const b=[...el.querySelectorAll(':scope>.btn,:scope>details')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.getBoundingClientRect());return{width:el.getBoundingClientRect().width,boxes:b}}''')
      check(len(actions['boxes'])>=2,'mobile-390: booking card exposes its action row')
      install_save_mock(page)
      card.locator('[data-action="finance"]').click(); page.wait_for_selector('#financeForm')
      m=modal_metrics(page)
      check(abs(m['gift']['width']-m['fields']['width'])<2,'mobile-390: Story gift owns the full form width')
      check(len(m['labels'])==2 and all(x['width']>=280 for x in m['labels']),'mobile-390: gift choices stack into readable full-width cards')
      check(m['horizontal']<=1 and m['layoutHorizontal']<=1,'mobile-390: finance modal has no horizontal overflow')
      page.screenshot(path=str(ART/'mobile-390-return-finance.png'),full_page=False)
    finally:
      page.close()

    browser.close()
finally:
  base.BOOKINGS[4].clear(); base.BOOKINGS[4].update(original)

result={'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'}
(ART/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
