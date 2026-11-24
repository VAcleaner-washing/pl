"""Temporary isolated G09 driver; canonical suite/assertions are unchanged.

Adapted from the accepted evidence-bundle probe. No app event cancellation,
forced clicks, timeout changes, CSS changes, production writes or deployment.
Controlled scenarios alter only diagnostic scheduling before the second click.
"""
import sys,json,pathlib,os,time
SOURCE=pathlib.Path(os.environ['G09_SOURCE']).resolve()
sys.path.insert(0,str(SOURCE/'scripts'))
from playwright.sync_api import Browser, BrowserContext, Page, Locator
import admin_release_candidate_qa as suite
OUT=pathlib.Path(sys.argv[1]).resolve(); OUT.mkdir(parents=True,exist_ok=True)
SCENARIO=os.environ.get('G09_SCENARIO','plain')
assert SCENARIO in ['plain','passive','active-toast','scroll-toast']
INSTRUMENTED=SCENARIO!='plain'
INIT=(pathlib.Path(__file__).with_name('g09_events.js')).read_text()
network=[]
new_context,context_close,page_reload,locator_click=Browser.new_context,BrowserContext.close,Page.reload,Locator.click
def dump(page,label):
    if INSTRUMENTED:
        (OUT/f'events-{label}.json').write_text(json.dumps(page.evaluate('window.__g09||[]'),ensure_ascii=False,indent=2))
def new(self,*a,**kw):
    c=new_context(self,*a,**kw)
    if INSTRUMENTED:c.add_init_script(INIT)
    def request(r):
        if '/functions/v1/vacleaner-settings' in r.url:
            network.append({'kind':'request','host_monotonic':time.monotonic(),'method':r.method,'payload':r.post_data_json,'timing':r.timing})
    def response(r):
        if '/functions/v1/vacleaner-settings' in r.url:
            network.append({'kind':'response','host_monotonic':time.monotonic(),'status':r.status,'method':r.request.method})
    if INSTRUMENTED:c.on('request',request);c.on('response',response)
    (OUT/'context.json').write_text(json.dumps({'scenario':SCENARIO,'instrumented':INSTRUMENTED,'webkit':c.browser.version,'context':kw},ensure_ascii=False,indent=2))
    return c
def close(self,*a,**kw):
    for i,p in enumerate(self.pages):
        try:dump(p,f'close-{i}')
        except Exception as e:(OUT/f'events-error-{i}.txt').write_text(str(e))
    if INSTRUMENTED:(OUT/'network.json').write_text(json.dumps(network,ensure_ascii=False,indent=2))
    return context_close(self,*a,**kw)
def reload(self,*a,**kw):
    dump(self,'before-reload')
    return page_reload(self,*a,**kw)
clicks=0
def click(self,*a,**kw):
    global clicks
    if '#equipmentBaselineForm' in self._impl_obj._selector and 'Зберегти вартість' in self._impl_obj._selector:
        clicks+=1
        if clicks==2 and SCENARIO in ['active-toast','scroll-toast']:
            # Defined diagnostic condition, within the original5s expectation budget.
            # No acceptance assertion is replaced and no timeout is increased.
            self.page.wait_for_function("()=>{const t=document.querySelector('.toast.show');return t&&getComputedStyle(t).opacity==='1'&&t.getAnimations().every(a=>a.playState==='finished')}",timeout=5000)
            if SCENARIO=='scroll-toast':
                self.page.evaluate("()=>{const m=document.querySelector('.main');m.scrollTop=Math.max(0,m.scrollTop-48)}")
    return locator_click(self,*a,**kw)
Browser.new_context=new
if INSTRUMENTED:BrowserContext.close=close;Page.reload=reload
if SCENARIO in ['active-toast','scroll-toast']:Locator.click=click
sys.argv=['admin_release_candidate_qa.py','--browser','webkit','--width','440','--artifacts',str(OUT)]
raise SystemExit(suite.main())
