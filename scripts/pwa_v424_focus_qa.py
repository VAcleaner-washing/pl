from pathlib import Path
import importlib.util, json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pwaqa', ROOT/'scripts/pwa_visual_qa.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
checks=[]
def ck(name, cond):
    checks.append((name,bool(cond)))
    print(('PASS' if cond else 'FAIL')+': '+name)
with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**opts)
    try:
        page=m.render_page(browser,390,844,standalone=True)
        page.wait_for_selector('.mobile-nav')
        m.dismiss_update(page, type('Q',(object,),{'check':lambda *a,**k:None})())
        page.locator('#mobileNewBooking:visible').click(); page.wait_for_selector('#bookingForm')
        page.locator('#bookingForm input[name="startDate"]').evaluate("el=>{el.value='2026-09-01';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}")
        page.wait_for_timeout(80); page.locator('.mobile-booking-next').click(); page.wait_for_timeout(60)
        phone=page.locator('#bookingForm input[name="customerPhone"]'); phone.fill('0661301450'); phone.evaluate("el=>el.dispatchEvent(new Event('input',{bubbles:true}))"); page.wait_for_timeout(850)
        ck('repeat customer resolves', page.locator('#bookingForm input[name="customerName"]').input_value()=='КЛИМЕНКО КАТЕРИНА')
        lookup=page.locator('#customerLookup').inner_text().upper(); ck('pending RETURN is visible', 'SMS-БОНУС RETURN' in lookup and '−10%' in lookup)
        toggle=page.locator('#customerLookup input[data-activate-pending-promo]'); ck('RETURN requires explicit checkbox', toggle.count()==1 and not toggle.is_checked())
        address=page.locator('#bookingForm input[name="deliveryAddress"]').input_value(); detail=page.locator('#bookingForm [data-vac-address-detail]').input_value()
        ck('clean address restored', address=='Юрія Тимошенка 8'); ck('entrance restored separately', detail=='7 під’їзд')
        toggle.click(); page.wait_for_timeout(500)
        page.locator('.mobile-booking-next').click(); page.wait_for_timeout(50); page.locator('.mobile-booking-next').click(); page.wait_for_timeout(100)
        fulfillment=page.locator('#bookingForm select[name="fulfillment"]'); fulfillment.select_option('delivery'); page.wait_for_timeout(120)
        summary=page.locator('#bookingDeliveryAddressSummary').inner_text(); route_aria=page.locator('#bookingDeliveryRoute').get_attribute('aria-label') or ''; route_href=page.locator('#bookingDeliveryRoute').get_attribute('href') or ''; tariff=page.locator('#bookingForm input[name="deliveryAmountOverride"]').input_value().strip()
        ck('step 4 does not print address twice', summary=='Адреса береться з кроку «Клієнт»' and page.locator('#bookingForm [name="deliveryAddress"]:visible').count()==0)
        ck('route reuses clean customer address', 'Юрія Тимошенка 8' in route_aria and ('maps' in route_href.lower() or 'google' in route_href.lower()))
        ck('local tariff is 250', tariff=='250')
        page.close()
    finally:
        browser.close()
failed=[n for n,ok in checks if not ok]
print(json.dumps({'passed':sum(ok for _,ok in checks),'failed':failed},ensure_ascii=False))
raise SystemExit(1 if failed else 0)
