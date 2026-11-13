"""Render the generated R4 entrypoint after real UI login with synthetic HTTP fixtures.

No external request is forwarded; this verifies layout, not live persistence or iOS zoom.
Run in the existing remote CI browser environment, not a substitute Sites preview.
"""
import argparse,datetime,json,shutil,tempfile
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect,TimeoutError as PlaywrightTimeout
from admin_entrypoint_finance_qa import pages_server

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--browser',choices=['chromium','webkit'],required=True)
    parser.add_argument('--artifacts',required=True)
    parser.add_argument('--width',type=int,choices=[320,390,440,768,1440]);args=parser.parse_args()
    out=Path(args.artifacts);out.mkdir(parents=True,exist_ok=True)
    fixture=json.loads((ROOT/'staging/fixtures/mobile-layout.json').read_text())
    config=json.loads((ROOT/'staging/hosted-r4-client.json').read_text())
    assert fixture['mode']=='synthetic-stage-layout-fixture'
    # Complete/cancelled examples are isolated copies used only by HTTP fixtures.
    issued_fixture=next(b for b in fixture['bookings'] if b['status']=='issued')
    for suffix,status in [('5901','completed'),('5902','cancelled')]:
        row=json.loads(json.dumps(issued_fixture));row.update(id='00000000-0000-4000-8000-00000000'+suffix,status=status,customer_name='R4 ACTIONS QA · '+status)
        if status=='completed':row['completed_at']=fixture['fixedTime']
        fixture['bookings'].append(row)
    calendar_start=datetime.datetime.fromisoformat(fixture['fixedTime']).date()
    calendar_days=[{'date':(calendar_start+datetime.timedelta(days=i)).isoformat(),
                    'resources':{key:{'label':key,'capacity':2,'morning':2,'evening':2} for key in ['abir','jimmy','puzzi','sc2']}} for i in range(14)]
    results=[];requests=[];unexpected=[]
    def resource_snapshot():
        values={}
        for name in ['memory.current','memory.peak','memory.events']:
            try:values[name]=(Path('/sys/fs/cgroup')/name).read_text().strip()
            except OSError:values[name]='unavailable'
        return values
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
        elif action=='calendar':body={'days':calendar_days}
        elif action=='audit_log':body={'entries':[]}
        elif action=='referrals_expiring':body={'rewards':[]}
        elif action=='referral_analytics':body={'messages':[],'uses':[],'rewards':[],'customers':[],'bookings':[]}
        elif action=='health':body={'reservation':{'healthy':True},'push':{'healthy':False,'configReady':False,'activeSubscriptions':0}}
        elif action=='lookup_customer':body={'customer':None}
        elif action=='pending_bonus':body={'bonus':None}
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
    def scroll_contract(page,scroll_selector,header_selector,footer_selector):
        return page.evaluate('''([scrollSelector,headerSelector,footerSelector])=>{
          const scroll=document.querySelector(scrollSelector),head=document.querySelector(headerSelector),foot=document.querySelector(footerSelector);
          const rect=el=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
          return{scroll:rect(scroll),header:rect(head),footer:rect(foot),scrollTop:scroll.scrollTop,scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight};
        }''',[scroll_selector,header_selector,footer_selector])
    def clear_hit(locator,before_measure=None):
        # Trial performs the browser's normal visibility/stability/hit checks
        # without activating a control. A raw immediate scroll sample raced the
        # canonical wizard/view scroll reset and recorded off-viewport points.
        locator.click(trial=True)
        if before_measure:
            before_measure()
        return locator.evaluate('''el=>{const r=el.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,hit=document.elementFromPoint(x,y);return{clear:hit===el||el.contains(hit),x,y,hit:hit?.className}}''')
    def exercise_scroll_surfaces(page,width):
        page.evaluate("()=>{const s=document.documentElement.style;s.setProperty('--pwa-safe-top','59px');s.setProperty('--pwa-safe-bottom','34px');s.setProperty('--lab-bar','107px')}")
        # Find the real owner rather than assuming .detail itself still scrolls.
        owner=page.locator('.detail').evaluate('''detail=>{
          const shell=detail.querySelector('.detail-shell');
          return ['auto','scroll'].includes(getComputedStyle(shell).overflowY)&&shell.scrollHeight>shell.clientHeight?'.detail-shell':'.detail';
        }''')
        captures=[]
        for position in ['top','middle','bottom']:
            page.locator(owner).evaluate("(el,where)=>el.scrollTo({top:where==='top'?0:where==='bottom'?el.scrollHeight:Math.min(300,el.scrollHeight-el.clientHeight),behavior:'instant'})",position)
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()))')
            contract=scroll_contract(page,owner,'.detail-top','.lab-action-dock');captures.append({'position':position,**contract})
            check(f'{width}/detail/{position}: scrollport excludes the full header and action dock',contract['scroll']['top']>=contract['header']['bottom']-1 and contract['scroll']['bottom']<=contract['footer']['top']+1,geometry=contract)
            page.screenshot(path=str(out/f'{width}-detail-scroll-{position}.png'))
        tail=page.locator('.detail-shell [data-action]:visible').last
        hit=clear_hit(tail);check(f'{width}: last detail action is reachable above the dock',hit['clear'],hit=hit)
        page.screenshot(path=str(out/f'{width}-detail-tail-action.png'))
        (out/f'{width}-detail-scroll-geometry.json').write_text(json.dumps(captures,indent=2)+'\n')
        page.set_viewport_size({'width':1024,'height':956})
        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        restored=page.locator('.detail-top').evaluate("el=>Boolean(el.closest('.detail-shell'))")
        check(f'{width}: desktop resize restores the original detail header parent',restored)
        page.set_viewport_size({'width':width,'height':956})
        before_resize=page.evaluate("()=>({innerWidth,clientWidth:document.documentElement.clientWidth,visualWidth:visualViewport.width,scale:visualViewport.scale,mobile:matchMedia('(max-width:900px)').matches,classes:document.querySelector('.detail').className,headerParent:document.querySelector('.detail-top').parentElement.className})")
        # Resize delivery is asynchronous in WebKit. Wait for the actual
        # header projection, rather than treating two rAFs as its completion.
        # Baseline records a failed condition and continues collecting evidence.
        try:
            page.wait_for_function("()=>document.querySelector('.detail-top')?.parentElement===document.querySelector('.detail')")
        except PlaywrightTimeout:pass
        contract=scroll_contract(page,owner,'.detail-top','.lab-action-dock')
        after_resize=page.evaluate("()=>({innerWidth,clientWidth:document.documentElement.clientWidth,visualWidth:visualViewport.width,scale:visualViewport.scale,mobile:matchMedia('(max-width:900px)').matches,classes:document.querySelector('.detail').className,headerParent:document.querySelector('.detail-top').parentElement.className})")
        check(f'{width}: returning to mobile restores bounded detail scroll',contract['scroll']['top']>=contract['header']['bottom']-1 and contract['scroll']['bottom']<=contract['footer']['top']+1,geometry=contract,before=before_resize,after=after_resize)
        page.locator('.detail .back').click();expect(page.locator('.detail')).to_have_count(0)
        page.locator('.mobile-nav [data-mobile-view=calendar]').click()
        expect(page.locator('.day-card')).to_have_count(14)
        slot=page.locator('.day-card').last.locator('[data-calendar-slot]:not(:disabled)').last
        hit=clear_hit(slot);check(f'{width}: last calendar slot is reachable above navigation',hit['clear'],hit=hit)
        calendar=scroll_contract(page,'.main','.lab-banner','.mobile-nav')
        check(f'{width}: calendar scrollport excludes banner and bottom navigation',calendar['scroll']['top']>=calendar['header']['bottom']-1 and calendar['scroll']['bottom']<=calendar['footer']['top']+1,geometry=calendar)
        page.screenshot(path=str(out/f'{width}-calendar-last-slot.png'))
        selected_date=slot.get_attribute('data-date');slot.click()
        form=page.locator('#bookingForm');expect(form).to_be_visible();expect(form.locator('[name=startDate]')).to_have_value(selected_date)
        for step in range(1,5):
            expect(form).to_have_attribute('data-mobile-step',str(step))
            contract=scroll_contract(page,'.booking-form-scroll','#bookingForm>header','#bookingForm>footer')
            check(f'{width}/booking/step{step}: fields scroll between header and footer',contract['scroll']['top']>=contract['header']['bottom']-1 and contract['scroll']['bottom']<=contract['footer']['top']+1,geometry=contract)
            tail=form.locator(f'[data-mobile-step="{step}"] :is(input:not([type=hidden]),select,textarea,button):visible').last
            hit=clear_hit(tail);check(f'{width}/booking/step{step}: last control is not covered',hit['clear'],hit=hit)
            page.screenshot(path=str(out/f'{width}-booking-step{step}-tail.png'))
            if step==2:
                # Hold only the real delayed keyboard-focus callback. Release it
                # after a newer trusted scroll gesture and the normal trial
                # action, reproducing the old focus/scroll race deterministically.
                page.evaluate('''()=>{
                  const timer=window.setTimeout.bind(window),pending=[];
                  window.__qaReleaseOldFocus=()=>{window.setTimeout=timer;
                    const count=pending.length;pending.splice(0).forEach(callback=>callback());return count;};
                  window.setTimeout=(callback,delay,...args)=>{
                    if(delay===90&&String(callback).includes('keepFocusedControlVisible')){pending.push(callback);return 0}
                    return timer(callback,delay,...args);
                  };
                }''')
                form.locator('[name=customerName]').fill('R4 SCROLL QA · синтетичний')
                form.locator('[name=customerPhone]').fill('+380000009958')
                page.set_viewport_size({'width':width,'height':640})
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                short=scroll_contract(page,'.booking-form-scroll','#bookingForm>header','#bookingForm>footer')
                check(f'{width}: shorter viewport retains separate field/footer rows',short['scroll']['top']>=short['header']['bottom']-1 and short['scroll']['bottom']<=short['footer']['top']+1 and short['footer']['bottom']<=641,geometry=short)
                # Mobile WebKit does not implement the wheel protocol. Exercise
                # another real trusted action while the same phone stays focused;
                # clear_hit still performs the original reachability measurement.
                event_type='keydown' if args.browser=='webkit' else 'wheel'
                page.evaluate('''type=>{window.__qaTrustedIntent=null;
                  document.addEventListener(type,event=>{window.__qaTrustedIntent={trusted:event.isTrusted,type:event.type}}, {once:true});}''',event_type)
                if args.browser=='webkit':page.keyboard.press('PageDown')
                else:
                    page.locator('.booking-form-scroll').hover()
                    page.mouse.wheel(0,1200)
                page.wait_for_function('()=>window.__qaTrustedIntent!==null')
                intent=page.evaluate('window.__qaTrustedIntent')
                check(f'{width}: focus regression uses a trusted user action',bool(intent) and intent['trusted'] and intent['type']==event_type,intent=intent)
                check(f'{width}: phone remains focused during newer user intent',form.locator('[name=customerPhone]').evaluate('element=>document.activeElement===element'))
                released=[]
                hit=clear_hit(tail,lambda:released.append(page.evaluate('window.__qaReleaseOldFocus()')))
                check(f'{width}: delayed phone focus remains exercised after newer user intent',bool(released) and released[0]>0,heldCallbacks=released)
                check(f'{width}: last customer control stays reachable in shorter viewport',hit['clear'],hit=hit)
                page.screenshot(path=str(out/f'{width}-booking-short-viewport.png'))
                page.set_viewport_size({'width':width,'height':956})
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            if step<4:form.locator('.mobile-booking-next').click()
        form.locator('header [data-close]').click()
        if page.locator('#labLeaveDialog').count():page.locator('#labLeaveDialog [data-lab-discard]').click()
        expect(form).to_have_count(0)
        check(f'{width}: discarding the form returns to a readable calendar',page.locator('.day-card').count()==14)
    def exercise_booking_actions(page,width):
        if page.locator('.detail').count():page.locator('.detail .back').click()
        page.locator('.mobile-nav [data-mobile-view=bookings]' if width<=900 else '.nav [data-view=bookings]').click()
        expect(page.locator('#labListMode')).to_be_visible()
        action_sets={'pending':['process','edit','cancel'],'waiting_payment':['process','edit','status','cancel'],
                     'confirmed':['issue','edit','status','cancel'],'issued':['complete','finance','extend','status','cancel'],
                     'completed':['finance','referral','status'],'cancelled':['status']}
        def choose_filter(key):
            if width<=900:
                page.locator('.native-search-options').click()
                sheet=page.locator('.v43-filter-sheet');expect(sheet).to_be_visible()
                sheet.locator('.native-v2-sheet-action').filter(has_text={'all':'Усі','completed':'Повернені','cancelled':'Скасовані'}[key]).click()
                expect(sheet).to_have_count(0)
            else:page.locator(f'.booking-toolbar [data-filter="{key}"]').click()
            expect(page.locator('#labListMode')).to_be_visible()
        for compact in [False,True]:
            mode='compact' if compact else 'full'
            choose_filter('all');current_filter='all'
            page.locator(f'#labListMode [data-compact="{str(compact).lower()}"]').click()
            for row in fixture['bookings']:
                target_filter=row['status'] if row['status'] in ['completed','cancelled'] else 'all'
                if target_filter!=current_filter:choose_filter(target_filter);current_filter=target_filter
                status=row['status'];card=page.locator(f'.booking-card[data-id="{row["id"]}"]')
                expect(card.locator('.lab-open-detail')).to_be_visible()
                if width<=900:expect(card).to_have_attribute('data-v22-status',status)
                actions=card.locator('.booking-actions');details=actions.locator('.lab-open-detail');more=actions.locator('>.booking-action-more')
                details.click(trial=True)
                measured=actions.evaluate('''el=>{
                  const box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth,text:n.textContent.trim()}};
                  const style=getComputedStyle(el);
                  return{owner:{...box(el),contentWidth:el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)},controls:[...el.querySelectorAll(':scope>.btn,:scope>.booking-action-more>summary')].filter(n=>n.getClientRects().length).map(box),details:box(el.querySelector('.lab-open-detail')),more:el.querySelector(':scope>.booking-action-more')?box(el.querySelector(':scope>.booking-action-more>summary')):null};
                }''')
                controls=measured['controls'];bad=[c for c in controls if c['width']<44 or c['height']<44 or c['scrollWidth']>c['clientWidth']+1 or c['x']<measured['owner']['x']-1 or c['right']>measured['owner']['right']+1]
                check(f'{width}/{mode}/{status}: every card button has readable text and a 44px target',not bad,controls=controls,invalid=bad)
                if width<=900:
                    d=measured['details'];m=measured['more']
                    aligned=(abs(d['y']-m['y'])<=1 and abs(d['width']-m['width'])<=1) if m else abs(d['width']-measured['owner']['contentWidth'])<=1
                    check(f'{width}/{mode}/{status}: Details has a full utility row or an equal More partner',aligned,geometry=measured)
                actual=actions.locator('[data-action]').evaluate_all('els=>els.map(el=>el.dataset.action)')
                check(f'{width}/{mode}/{status}: all canonical business actions remain available',set(actual)==set(action_sets[status]),actions=actual)
                page.screenshot(path=str(out/f'{width}-{mode}-{status}-card-actions.png'))
                code=card.locator('.booking-identity small').inner_text().strip()
                details.click();expect(page.locator('.detail')).to_be_visible();expect(page.locator('.detail')).to_contain_text(code)
                page.locator('.detail .back').click();expect(page.locator('.detail')).to_have_count(0)
                check(f'{width}/{mode}/{status}: Details opens the corresponding booking and returns',True)
                if more.count():
                    summary=more.locator('summary');summary.click()
                    if width<=900:
                        sheet=page.locator('.native-v2-action-sheet-layer');expect(sheet).to_be_visible()
                        target=sheet.locator('button').filter(has_text='Виправити статус' if status!='pending' else 'Скасувати').first
                    else:
                        expect(more).to_have_attribute('open','');target=more.locator('.booking-action-more-items [data-action]').first
                    reachable=True
                    try:target.click(trial=True,timeout=5000)
                    except PlaywrightTimeout:reachable=False
                    check(f'{width}/{mode}/{status}: More opens reachable canonical actions',reachable)
                    page.screenshot(path=str(out/f'{width}-{mode}-{status}-more-menu.png'))
                    page.keyboard.press('Escape')
                    if width<=900:expect(page.locator('.native-v2-action-sheet-layer')).to_have_count(0)
                    else:expect(more).not_to_have_attribute('open','')
                    expect(summary).to_be_focused()
                    if width<=900:check(f'{width}/{mode}/{status}: More has a visible label', 'Ще' in summary.inner_text())
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
            for width in ([args.width] if args.width else [320,390,440,768,1440]):
                print(json.dumps({'width':width,'phase':'before_context','resources':resource_snapshot()}),flush=True)
                options={k:v for k,v in pw.devices['iPhone 17 Pro Max'].items() if k!='default_browser_type'} if width<=440 else {}
                options.update(viewport={'width':width,'height':956},service_workers='block',timezone_id='Europe/Kyiv')
                context=browser.new_context(**options);context.route('**/*',lambda route:api(route))
                if width<=440:context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
                page=context.new_page();errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('crash',lambda:print('PAGE_CRASH '+json.dumps({'width':width,'resources':resource_snapshot()}),flush=True))
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
                    exercise_scroll_surfaces(page,width)
                exercise_booking_actions(page,width)
                check(f'{width}: no uncaught application error',not errors,errors=errors)
                context.close()
            ref.close();browser.close()
    check('no unexpected external or mutation request',not unexpected,requests=unexpected)
    summary={'browser':args.browser,'width':args.width or 'session','passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results),'checks':results,
             'network':'all remote calls fulfilled from synthetic fixture; none forwarded','physicalIphoneZoom':'not emulated','requests':requests}
    (out/'result.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'browser':args.browser,'passed':summary['passed'],'failed':summary['failed']}))
    return int(bool(summary['failed']))

if __name__=='__main__':raise SystemExit(main())
