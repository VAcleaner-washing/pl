#!/usr/bin/env python3
from pathlib import Path
import sys,json,os,argparse
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as pwa
from playwright.sync_api import sync_playwright

ALL_SIZES=[(320,800),(390,844),(430,932),(768,1024),(1024,768),(1280,900),(1650,760),(1920,1080)]
parser=argparse.ArgumentParser()
parser.add_argument('--group',choices=['all','mobile','desktop'],default='all')
args=parser.parse_args()
SIZES=ALL_SIZES if args.group=='all' else (ALL_SIZES[:4] if args.group=='mobile' else ALL_SIZES[4:])
passed=0;failed=[]
def ck(v,label):
 global passed
 if v: passed+=1; print('PASS:',label)
 else: failed.append(label); print('FAIL:',label)
def fs(page,sel): return float(page.locator(sel).first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'))
def disp(page,sel): return page.locator(sel).first.evaluate('e=>getComputedStyle(e).display')
def inside(page,sel):
 b=page.locator(sel).first.bounding_box();
 if not b:return False
 return b['x']>=-1 and b['y']>=-1 and b['x']+b['width']<=page.viewport_size['width']+1 and b['y']+b['height']<=page.viewport_size['height']+1

def open_campaigns(page,w):
 if w<=900:pwa.open_mobile_view(page,'campaigns')
 else:page.locator('.nav button[data-view="campaigns"]').click()
 page.wait_for_timeout(50)

def run(page,w,h):
 if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click();page.wait_for_timeout(15)
 open_campaigns(page,w)
 ck(pwa.no_overflow(page),f'{w}: campaigns has no horizontal overflow')
 ck(fs(page,'.campaign-main>strong')>=16,f'{w}: campaign name stays readable')
 ck(fs(page,'.campaign-type')>=(10 if w<=700 else 10.5),f'{w}: campaign type/status is not micro text')
 ck(fs(page,'.campaign-metrics small')>=10.5,f'{w}: campaign metric labels stay readable')
 page.locator('.campaign-more summary').first.click();page.wait_for_timeout(10)
 ck(inside(page,'.campaign-more-menu'),f'{w}: campaign ••• menu stays inside viewport')
 page.locator('.campaign-more summary').first.click()
 # New campaign modal: readable helper + footer visible, scrolling body handles short screens.
 page.locator('#newCampaign').click();page.wait_for_selector('#campaignForm')
 ck(pwa.no_overflow(page),f'{w}: new campaign modal has no horizontal overflow')
 ck(fs(page,'.campaign-code-field small')>=(10.5 if w<=700 else 11),f'{w}: new campaign helper text is readable')
 ck(inside(page,'#campaignForm>footer'),f'{w}: new campaign footer remains reachable')
 for kind in ['return','weekday','product','personal']:
  page.locator('#campaignForm select[name=campaignType]').select_option(kind);page.wait_for_timeout(5)
  ck(pwa.no_overflow(page),f'{w}: new campaign {kind} state has no horizontal overflow')
 page.locator('#campaignForm .close').click();page.wait_for_timeout(10)
 # Codes modal.
 page.locator('[data-campaign-codes]').first.click();page.wait_for_selector('.campaign-codes-modal')
 ck(pwa.no_overflow(page),f'{w}: campaign codes modal has no horizontal overflow')
 ck(fs(page,'.campaign-code-list span')>=(11.5 if w<=700 else 12),f'{w}: campaign code owner text is readable')
 if w>=901:
  card=page.locator('.modal-card').bounding_box();ck(card and card['height']<420,f'{w}: one-code modal fits content instead of creating a huge empty panel')
 if w in (390,1650):
  page.evaluate("()=>{const box=document.querySelector('.campaign-code-list'),row=box?.querySelector('div');if(row)while(box.querySelectorAll(':scope>div').length<60)box.append(row.cloneNode(true));}")
  box=page.locator('.campaign-code-list');ck(box.evaluate('e=>e.scrollHeight>e.clientHeight'),f'{w}: large promo-code list scrolls inside its own workspace')
  ck(inside(page,'.campaign-codes-modal>footer'),f'{w}: large promo-code list never hides modal actions')
 page.locator('.campaign-codes-modal .close').click();page.wait_for_timeout(10)
 # SMS all-base workflow ensures fixture has selectable recipients.
 page.locator('#smsCampaign').click();page.wait_for_selector('.sms-campaign-modal #smsAudienceList');page.wait_for_timeout(120)
 ck(pwa.no_overflow(page),f'{w}: SMS step 1 has no horizontal overflow')
 if w<=700:
  ck(disp(page,'.sms-stepper small')=='none',f'{w}: mobile stepper removes tiny redundant subtitles')
  ck(disp(page,'.sms-meta-item>small')=='none',f'{w}: mobile header removes tiny redundant meta labels')
  ck(fs(page,'.sms-audience-sort>span')>=9.5,f'{w}: mobile sorting label is readable')
  ck(fs(page,'.sms-selected-count')>=10,f'{w}: mobile selected-count label is readable')
  if w<=360:
   after=page.locator('.sms-stepper b').first.evaluate("e=>getComputedStyle(e,'::after').content")
   ck('Клієнти' in after,f'{w}: narrow stepper uses meaningful short label')
   ck(fs(page,'.sms-history-open')>=10,f'{w}: Journal action stays textual/readable')
 elif w<=900:
  ck(fs(page,'.sms-meta-item>small')>=9.5 and fs(page,'.sms-meta-item>b')>=11,f'{w}: tablet SMS header meta is readable')
 else:
  ck(fs(page,'.sms-meta-item>small')>=10 and fs(page,'.sms-meta-item>b')>=11.5,f'{w}: desktop SMS header meta is readable')
  ck(fs(page,'.sms-recipient-columns')>=11,f'{w}: SMS table headers match Clients-scale readability')
  ck(fs(page,'.sms-client-phone')>=13,f'{w}: SMS table values are not spreadsheet micro-text')
 inputs=page.locator('#smsAudienceList input[type=checkbox]:not(:disabled)')
 ck(inputs.count()>=2,f'{w}: SMS fixture exposes selectable explicit + legacy recipients')
 if inputs.count()>=2:
  inputs.first.click(force=True);inputs.nth(1).click(force=True);page.locator('#smsPrimary').click();page.wait_for_timeout(20)
  ck(pwa.no_overflow(page),f'{w}: SMS step 2 has no horizontal overflow')
  ck(fs(page,'.sms-message-editor textarea')>=13.5,f'{w}: SMS message editor text is readable')
  ck(fs(page,'.sms-preview-card p')>=12.5,f'{w}: SMS preview text is readable')
  ck(fs(page,'.sms-route-card b')>=13,f'{w}: route card title is readable')
  page.locator('input[name=smsRoute][value=international]').click(force=True);page.locator('#smsPrimary').click();page.wait_for_timeout(20)
  ck(pwa.no_overflow(page),f'{w}: SMS step 3 has no horizontal overflow')
  ck(fs(page,'.sms-review-card>small')>=(9.5 if w<=700 else 11),f'{w}: review KPI labels are readable')
  ck(fs(page,'.sms-review-card>span')>=(10.5 if w<=700 else 12),f'{w}: review KPI helper text is readable')
  ck(fs(page,'.sms-legacy-attestation small')>=(10.5 if w<=700 else 11.5),f'{w}: legacy attestation legal helper is readable')
  ck(fs(page,'.sms-preflight-state small')>=(10.5 if w<=700 else 11.5),f'{w}: preflight helper is readable')
  page.evaluate("()=>{const x=document.querySelector('.sms-preflight-state');x.className='sms-preflight-state error';x.querySelector('b').textContent='SendPulse не прийняв перевірку';x.querySelector('small').textContent='Довге пояснення провайдера не повинно ламати ширину або змушувати менеджера читати мікротекст навіть у помилковому стані.'}")
  ck(pwa.no_overflow(page),f'{w}: long preflight error remains contained and readable')
 # Journal must be a separate workspace.
 page.locator('#smsHistoryOpen').click();page.wait_for_timeout(15)
 page.evaluate("()=>{const b=document.querySelector('#smsHistory'),a=b?.querySelector('article');if(a)while(b.querySelectorAll('article').length<7)b.append(a.cloneNode(true));}")
 ck(disp(page,'.sms-stepper')=='none' and disp(page,'.sms-workspace-footer')=='none',f'{w}: journal has no dead workflow chrome')
 ck(pwa.no_overflow(page),f'{w}: 7-row SMS journal has no horizontal overflow')
 ck(fs(page,'.sms-history-campaign')>=(13 if w<=700 else 14.5),f'{w}: journal campaign title is readable')
 ck(fs(page,'.sms-history-date')>=(10.5 if w<=700 else 11.5),f'{w}: journal date meta is readable')
 ck(fs(page,'.sms-history-audience')>=(10.5 if w<=700 else 12),f'{w}: journal recipient count is readable')
 ck(fs(page,'.sms-dispatch-status')>=(10 if w<=700 else 10.5),f'{w}: journal status badge is readable')
 hb=page.locator('#smsHistoryOpen').bounding_box();cb=page.locator('.sms-workspace-header .close').bounding_box();ck(hb and cb and abs(hb['height']-cb['height'])<=2,f'{w}: Journal and close controls share one header geometry')
 if page.locator('[data-sms-details]').count():
  page.locator('[data-sms-details]').first.click();page.wait_for_selector('#smsHistoryDetail:not(.hidden)');page.wait_for_timeout(15)
  ck(pwa.no_overflow(page),f'{w}: SMS recipient drill-down has no horizontal overflow')
  ck(page.locator('#smsDispatchRecipients article').count()>=3,f'{w}: SMS recipient drill-down shows actual recipients')
  ck(fs(page,'.sms-dispatch-client b')>=(13 if w<=700 else 13.5),f'{w}: SMS recipient names remain readable')
  ck(page.locator('.sms-dispatch-promo code').count()>=1,f'{w}: SMS recipient drill-down exposes promo codes')
  page.locator('#smsDispatchBack').click();page.wait_for_timeout(10)

with sync_playwright() as pw:
 opts={'headless':True,'args':['--no-sandbox']};ex=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
 if ex:opts['executable_path']=ex
 elif Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
 browser=pw.chromium.launch(**opts)
 for w,h in SIZES:
  page=pwa.render_page(browser,w,h)
  try: run(page,w,h)
  except Exception as e: failed.append(f'{w}: unhandled {e}');print('FAIL:',failed[-1])
  finally: page.close()
 browser.close()
result={'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'}
print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(0 if not failed else 1)
