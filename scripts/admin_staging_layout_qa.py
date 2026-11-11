"""Render the generated R4 entrypoint after real UI login with synthetic HTTP fixtures.

No external request is forwarded; this verifies layout, not live persistence or iOS zoom.
Run in the existing remote CI browser environment, not a substitute Sites preview.
"""
import argparse,datetime,json,shutil,tempfile
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
from admin_entrypoint_finance_qa import pages_server

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--browser',choices=['chromium','webkit'],required=True)
    parser.add_argument('--artifacts',required=True);args=parser.parse_args()
    out=Path(args.artifacts);out.mkdir(parents=True,exist_ok=True)
    fixture=json.loads((ROOT/'staging/fixtures/mobile-layout.json').read_text())
    config=json.loads((ROOT/'staging/hosted-r4-client.json').read_text())
    assert fixture['mode']=='synthetic-stage-layout-fixture'
    results=[];requests=[];unexpected=[]
    def check(name,passed,**evidence):
        results.append({'name':name,'passed':bool(passed),**evidence})
        print(('PASS' if passed else 'FAIL')+': '+name,flush=True)
    def api(route,stable=False):
        request=route.request;url=urlsplit(request.url)
        if url.hostname in ('127.0.0.1','localhost'):return route.continue_()
        expected_origin='https://yweluzclearwrazdkahu.supabase.co' if stable else config['origin']
        if url.scheme+'://'+url.netloc!=expected_origin:
            unexpected.append({'path':url.path,'method':request.method});return route.abort()
        headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'}
        if request.method=='OPTIONS':return route.fulfill(status=204,headers=headers)
        payload=request.post_data_json if request.method=='POST' else {}
        payload=payload or {};action=payload.get('action');requests.append({'path':url.path,'action':action})
        if url.path=='/auth/v1/settings':body={'disable_signup':True}
        elif url.path=='/auth/v1/token':
            assert payload.get('email')==('vahome.aroma@gmail.com' if stable else 'manager-a@vacleaner-r4.invalid')
            body={'access_token':'r4-layout-fixture-token','refresh_token':'r4-layout-fixture-refresh',
                  'expires_in':3600,'token_type':'bearer','user':{'id':'00000000-0000-4000-8000-000000000061','email':'manager-a@vacleaner-r4.invalid'}}
        elif url.path.endswith('/vacleaner-settings'):body=fixture['settings']
        elif action=='list':body={'bookings':fixture['bookings'],'expenses':[]}
        elif action=='clients':body={'customers':[]}
        elif action=='campaigns':body={'campaigns':[]}
        elif action=='calendar':body={'days':[]}
        elif action=='audit_log':body={'entries':[]}
        elif action=='referrals_expiring':body={'rewards':[]}
        elif action=='referral_analytics':body={'messages':[],'uses':[],'rewards':[],'customers':[],'bookings':[]}
        elif action=='health':body={'reservation':{'healthy':True},'push':{'healthy':False,'configReady':False,'activeSubscriptions':0}}
        elif action=='lookup_customer':body={'customer':None}
        else:
            unexpected.append({'path':url.path,'action':action});return route.abort()
        return route.fulfill(status=200,headers=headers,content_type='application/json',body=json.dumps(body))
    def geometry(page,selectors):
        return page.evaluate('''selectors=>({
          viewport:{innerWidth,clientWidth:document.documentElement.clientWidth,visualWidth:visualViewport.width,scale:visualViewport.scale,offsetLeft:visualViewport.offsetLeft},
          items:selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length).map(el=>{
            const r=el.getBoundingClientRect(),s=getComputedStyle(el);
            return{selector,left:r.left,right:r.right,width:r.width,height:r.height,bottom:r.bottom,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,fontSize:s.fontSize,whiteSpace:s.whiteSpace,overflowX:s.overflowX,text:el.textContent.trim().slice(0,100)}
          }))})''',selectors)
    def compare_navigation(page,reference_page,width):
        reference_page.set_viewport_size({'width':width,'height':956})
        selectors=['.mobile-nav','.mobile-nav>button','.mobile-nav>button>svg','.mobile-nav>button>span','.mobile-nav>button>i','.mobile-nav .badge']
        captures=[]
        for view in ['upcoming','calendar','more']:
            for surface in [reference_page,page]:
                if view=='more':
                    surface.locator('.mobile-nav .more-nav').click()
                    expect(surface.locator('.mobile-more-menu')).to_be_visible()
                else:
                    surface.locator(f'.mobile-nav [data-mobile-view={view}]').click()
                    expect(surface.locator('#pageTitle')).to_have_text('Календар' if view=='calendar' else 'Найближчі')
            for inset in [0,21,34]:
                for surface in [reference_page,page]:
                    surface.evaluate("inset=>document.documentElement.style.setProperty('--pwa-safe-bottom',inset+'px')",inset)
                    surface.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()))')
                    # Measure the final component state, not two differently
                    # timed frames of the inherited More transform transition.
                    surface.evaluate('''async()=>{
                      const nav=document.querySelector('.mobile-nav');nav.getBoundingClientRect();
                      await Promise.all(nav.getAnimations({subtree:true})
                        .filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime))
                        .map(a=>a.finished.catch(()=>{})));
                    }''')
                expected=geometry(reference_page,selectors);actual=geometry(page,selectors)
                differences=[]
                if len(expected['items'])!=len(actual['items']):differences.append({'differentElementCount':[len(expected['items']),len(actual['items'])]})
                for old,new in zip(expected['items'],actual['items']):
                    delta={key:round(new[key]-old[key],3) for key in ['left','right','width','height','bottom'] if abs(new[key]-old[key])>1}
                    if old['selector']!=new['selector'] or old['fontSize']!=new['fontSize'] or delta:
                        differences.append({'selector':new['selector'],'text':new['text'],'delta':delta,'fontSizes':[old['fontSize'],new['fontSize']]})
                check(f'{width}/{view}/inset{inset}: navigation controls, glyphs, labels and badge match immutable46',not differences,differences=differences)
                targets=[item for item in actual['items'] if item['selector']=='.mobile-nav>button']
                check(f'{width}/{view}/inset{inset}: five touch targets retain at least 44px',len(targets)==5 and all(item['width']>=44 and item['height']>=44 and item['bottom']<=956 for item in targets))
                captures.append({'view':view,'inset':inset,'reference':expected,'stage':actual})
                if inset==34:
                    reference_page.screenshot(path=str(out/f'{width}-nav-{view}-stable46.png'))
                    page.screenshot(path=str(out/f'{width}-nav-{view}-stage.png'))
            if view=='more':
                for surface in [reference_page,page]:
                    surface.locator('.mobile-nav .more-nav').click()
                    expect(surface.locator('.mobile-more-menu')).to_have_count(0)
        for surface in [reference_page,page]:
            surface.locator('.mobile-nav [data-mobile-view=upcoming]').click()
            expect(surface.locator('.upcoming-row.native-v25-upcoming').first).to_be_visible()
        (out/f'{width}-navigation-reference.json').write_text(json.dumps(captures,indent=2,ensure_ascii=False)+'\n')
    with tempfile.TemporaryDirectory(prefix='r4-layout-',dir=ROOT/'staging-ui-test-results') as temp:
        reference=ROOT/'stable-reference-test-results/source/dist'
        assert reference.exists(),'Immutable 46 reference Pages artifact is required'
        shutil.copytree(reference,Path(temp),dirs_exist_ok=True)
        shutil.copytree(ROOT/'staging-ui-test-results/dist',Path(temp)/'r4')
        with pages_server(Path(temp)) as base,sync_playwright() as pw:
            opts={'headless':True}
            if args.browser=='chromium':opts['args']=['--no-sandbox']
            browser=getattr(pw,args.browser).launch(**opts)
            browser.on('disconnected',lambda:print('BROWSER_DISCONNECTED',flush=True))
            device={k:v for k,v in pw.devices['iPhone 17 Pro Max'].items() if k!='default_browser_type'}
            device['viewport']={'width':440,'height':956}
            ref=browser.new_context(**device,service_workers='block',timezone_id='Europe/Kyiv')
            ref.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
            ref.route('**/*',lambda route:api(route,True));reference_page=ref.new_page()
            reference_page.clock.set_fixed_time(datetime.datetime.fromisoformat(fixture['fixedTime']))
            reference_page.goto(base+'/admin/bronuvannia/')
            reference_page.locator('#authForm input[name=login]').fill('vacleaner')
            reference_page.locator('#authForm input[name=password]').fill('r4-layout-fixture-password')
            reference_page.locator('#authForm button[type=submit]').click()
            expect(reference_page.locator('.upcoming-row').first).to_be_visible()
            reference_page.evaluate("document.documentElement.style.setProperty('--pwa-safe-bottom','34px')")
            nav_reference=geometry(reference_page,['.mobile-nav','.mobile-nav button','.mobile-new-nav i','.mobile-new-nav span'])
            (out/'stable46-nav-geometry.json').write_text(json.dumps(nav_reference,indent=2)+'\n')
            reference_page.screenshot(path=str(out/'stable46-upcoming.png'),full_page=True)
            reference_height=reference_page.locator('.mobile-nav').bounding_box()['height']
            check('immutable 46 reference has the expected 82px total navigation',abs(reference_height-82)<=1,height=reference_height)
            for width in [320,390,440,768,1440]:
                options={k:v for k,v in pw.devices['iPhone 17 Pro Max'].items() if k!='default_browser_type'} if width<=440 else {}
                options.update(viewport={'width':width,'height':956},service_workers='block',timezone_id='Europe/Kyiv')
                context=browser.new_context(**options);context.route('**/*',lambda route:api(route))
                if width<=440:context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
                page=context.new_page();errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('crash',lambda:print('PAGE_CRASH',flush=True))
                page.clock.set_fixed_time(datetime.datetime.fromisoformat(fixture['fixedTime']))
                page.goto(base+'/r4/admin/bronuvannia/')
                expect(page.locator('#authForm')).to_be_visible()
                auth_fonts=page.locator('#authForm input:not([type=checkbox])').evaluate_all('els=>els.map(el=>parseFloat(getComputedStyle(el).fontSize))')
                if width<=900:check(f'{width}: login controls avoid iOS small-input zoom',all(x>=16 for x in auth_fonts),fonts=auth_fonts)
                page.locator('#authForm input[name=login]').fill('manager-a')
                page.locator('#authForm input[name=password]').fill('r4-layout-fixture-password')
                page.locator('#authForm button[type=submit]').click()
                expect(page.locator('#view')).to_be_visible()
                if width>900:page.locator('.nav [data-view=upcoming]').click()
                expect(page.locator('.upcoming-row').first).to_be_visible()
                if width<=900:expect(page.locator('.upcoming-row.native-v25-upcoming').first).to_be_visible()
                page.evaluate('document.fonts.ready')
                scope=page.locator('.search input').first
                expect(scope).to_be_visible();scope.focus()
                font=scope.evaluate('el=>parseFloat(getComputedStyle(el).fontSize)')
                if width<=900:check(f'{width}: search avoids iOS small-input zoom',font>=16,fontSize=font)
                scope.blur()
                if width<=440:
                    page.evaluate("document.documentElement.style.setProperty('--pwa-safe-bottom','34px')")
                    nav=page.locator('.mobile-nav').bounding_box()
                    controls=page.locator('.mobile-nav button').evaluate_all('els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}})')
                    check(f'{width}: navigation matches stable46 total height with one home inset',abs(nav['height']-reference_height)<=1 and abs(nav['y']+nav['height']-956)<=1,height=nav['height'],reference=reference_height)
                    # The former 34px exclusion also rejects immutable46's 56px
                    # targets (bottom 936 at height 956). Record that assumption
                    # explicitly; verify actual controls/glyphs against the same
                    # stable reference instead of equating shell height with UI.
                    check(f'{width}: five touch targets retain at least 44px within viewport',len(controls)==5 and all(c['width']>=44 and c['height']>=44 and c['bottom']<=956 for c in controls),controls=controls,formerWholeInsetExclusion=all(c['bottom']<=956-34+1 for c in controls))
                    compare_navigation(page,reference_page,width)
                upcoming=geometry(page,['.lab-banner','.lab-banner>div','.lab-banner button','.lab-banner a','.main','.upcoming-row','.upcoming-main','.upcoming-title h3','.upcoming-title .status','.upcoming-client-info strong','.upcoming-actions .btn'])
                (out/f'{width}-upcoming-geometry.json').write_text(json.dumps(upcoming,indent=2,ensure_ascii=False)+'\n')
                page.screenshot(path=str(out/f'{width}-upcoming.png'),full_page=True)
                if width<=900:
                    bad=[x for x in upcoming['items'] if x['left'] < -1 or x['right']>width+1 or x['scrollWidth']>x['clientWidth']+1]
                    check(f'{width}: header/cards/actions fit their actual scroll owners',not bad,overflow=bad)
                issued=next(b for b in fixture['bookings'] if b['status']=='issued')
                page.locator(f'.upcoming-row[data-id="{issued["id"]}"] [data-up=open]').click()
                expect(page.locator('.detail')).to_be_visible()
                if width<=900:expect(page.locator('.v4321-detail-ready')).to_be_visible()
                expect(page.locator('.lab-action-dock')).to_be_visible()
                detail=geometry(page,['.detail','.detail-shell','.detail-top','.detail-top-meta','.native-detail-code','.native-detail-card','.native-detail-info-row','.native-detail-info-row strong','.v4321-finance-card','.v4321-finance-summary','.v4321-finance-balance','.lab-action-dock','.lab-action-dock button'])
                (out/f'{width}-detail-geometry.json').write_text(json.dumps(detail,indent=2,ensure_ascii=False)+'\n')
                page.screenshot(path=str(out/f'{width}-detail.png'),full_page=True)
                if width<=900:
                    bad=[x for x in detail['items'] if x['left'] < -1 or x['right']>width+1 or x['scrollWidth']>x['clientWidth']+1]
                    check(f'{width}: detail fields/finance/actions remain fully readable',not bad,overflow=bad)
                check(f'{width}: no uncaught application error',not errors,errors=errors)
                context.close()
            ref.close();browser.close()
    check('no unexpected external or mutation request',not unexpected,requests=unexpected)
    summary={'browser':args.browser,'passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results),'checks':results,
             'network':'all remote calls fulfilled from synthetic fixture; none forwarded','physicalIphoneZoom':'not emulated','requests':requests}
    (out/'result.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'browser':args.browser,'passed':summary['passed'],'failed':summary['failed']}))
    return int(bool(summary['failed']))

if __name__=='__main__':raise SystemExit(main())
