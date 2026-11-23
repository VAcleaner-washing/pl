"""QA-branch-only observation/control; never production release acceptance."""
import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import Browser, BrowserContext
import pwa_cache_qa


OBSERVE = r'''(() => {
  const key='vac_worker_lifecycle_diagnostic';
  const sw=navigator.serviceWorker;
  if(!sw)return;
  const describe=worker=>worker?{state:worker.state,scriptURL:worker.scriptURL}:null;
  const record=kind=>{
    try{
      const events=JSON.parse(sessionStorage.getItem(key)||'[]');
      const asset=document.querySelector('script[src^="/assets/"]')?.src||document.querySelector('link[href^="/assets/"]')?.href;
      events.push({kind,at:Date.now(),path:location.pathname,documentBuild:asset?new URL(asset).searchParams.get('v'):null,controller:describe(sw.controller)});
      sessionStorage.setItem(key,JSON.stringify(events.slice(-300)));
    }catch{}
  };
  window.__recordWorkerDiagnostic=record;
  const watched=new WeakSet();
  const watch=worker=>{
    if(!worker||watched.has(worker))return;
    watched.add(worker);
    worker.addEventListener('statechange',()=>record('worker-state:'+worker.state));
  };
  sw.addEventListener('controllerchange',()=>{watch(sw.controller);record('controllerchange')});
  sw.getRegistration('/admin/').then(reg=>{
    if(!reg)return;
    watch(reg.active);watch(reg.waiting);watch(reg.installing);
    reg.addEventListener('updatefound',()=>{watch(reg.installing);record('updatefound')});
  }).catch(()=>{});
  addEventListener('beforeunload',()=>record('beforeunload'));
  addEventListener('pagehide',()=>record('pagehide'));
  addEventListener('DOMContentLoaded',()=>record('DOMContentLoaded'));
  record('document-start');
})();'''

DEFER = r'''(() => {
  const sw=navigator.serviceWorker;
  if(!sw)return;
  const add=sw.addEventListener.bind(sw),remove=sw.removeEventListener.bind(sw);
  const callbacks=new WeakMap();
  sw.addEventListener=function(type,callback,options){
    if(type!=='controllerchange'||!callback)return add(type,callback,options);
    let wrapped=callbacks.get(callback);
    if(!wrapped){
      wrapped=function(event){
        const worker=sw.controller;
        const invoke=()=>{
          window.__recordWorkerDiagnostic?.('control-delivered-controllerchange');
          if(typeof callback==='function')callback.call(sw,event);else callback.handleEvent(event);
        };
        if(!worker||worker.state==='activated'){invoke();return}
        window.__recordWorkerDiagnostic?.('control-deferred-controllerchange:'+worker.state);
        const changed=()=>{
          if(worker.state!=='activated')return;
          worker.removeEventListener('statechange',changed);invoke();
        };
        worker.addEventListener('statechange',changed);changed();
      };
      callbacks.set(callback,wrapped);
    }
    return add(type,wrapped,options);
  };
  sw.removeEventListener=function(type,callback,options){
    return remove(type,type==='controllerchange'&&callback?callbacks.get(callback)||callback:callback,options);
  };
})();'''


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--mode',choices=['observe','defer'],required=True)
    parser.add_argument('--artifacts',required=True)
    args,forwarded=parser.parse_known_args()
    output=Path(args.artifacts)
    original_new=Browser.new_context
    original_close=BrowserContext.close
    sequence=0

    def new_context(browser,*positional,**options):
        context=original_new(browser,*positional,**options)
        context.add_init_script(OBSERVE+('\n'+DEFER if args.mode=='defer' else ''))
        return context

    def close(context,*positional,**options):
        nonlocal sequence
        sequence+=1
        snapshots=[]
        for page in context.pages:
            try:
                snapshots.append(page.evaluate("""()=>({
                  events:JSON.parse(sessionStorage.getItem('vac_worker_lifecycle_diagnostic')||'[]'),
                  readiness:window.__vacPwaWorkerMonitor?.last||null
                })"""))
            except Exception as error:snapshots.append({'captureError':str(error)})
        output.mkdir(parents=True,exist_ok=True)
        (output/f'lifecycle-{sequence}.json').write_text(json.dumps({
            'diagnosticOnly':True,'releaseAcceptance':False,'mode':args.mode,
            'clientEventTimingChanged':args.mode=='defer','pages':snapshots,
        },indent=2)+'\n')
        return original_close(context,*positional,**options)

    Browser.new_context=new_context
    BrowserContext.close=close
    sys.argv=['pwa_cache_qa.py',*forwarded,'--artifacts',args.artifacts]
    return pwa_cache_qa.main()


if __name__=='__main__':
    raise SystemExit(main())
