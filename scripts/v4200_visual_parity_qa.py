from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json, os
ROOT=Path(__file__).resolve().parents[1]
PAGES=[
 'index.html','bronuvannia/index.html','pidbir/index.html','komplekty/index.html','kontakty/index.html','dostavka/index.html','faq/index.html',
 'tekhnika/karcher-puzzi-8-1/index.html','tekhnika/karcher-sc-2-deluxe/index.html','tekhnika/robot-dlia-vikon-abir/index.html',
 'rishennia/textile/index.html','blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html'
]
EXTRA_MOBILE={'index.html','bronuvannia/index.html','pidbir/index.html'}
SCRIPT_RE=re.compile(r'<script\b[^>]*>[\s\S]*?</script>',re.I)
LINK_RE=re.compile(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>',re.I)
MOD_RE=re.compile(r'<link\b[^>]*href=["\']/assets/public-(?:shared|booking|guide|home)\.css(?:\?[^"\']*)?["\'][^>]*>',re.I)
def inline(html):
 def repl(m):
  tag=m.group(0); hm=re.search(r'href=["\']([^"\']+)',tag,re.I)
  if not hm:return ''
  href=hm.group(1).split('?')[0]
  if href.startswith('/'):
   fp=ROOT/href.lstrip('/')
   if fp.exists(): return '<style>'+fp.read_text(encoding='utf8',errors='ignore').replace('</style>','<\\/style>')+'</style>'
  return ''
 return LINK_RE.sub(repl,html)
def doc(rel,legacy=False):
 html=(ROOT/rel).read_text(encoding='utf8',errors='ignore')
 html=SCRIPT_RE.sub('',html)
 if legacy:
  inserted=False
  def legacy_repl(m):
   nonlocal inserted
   if inserted:return ''
   inserted=True
   return '<link rel="stylesheet" href="/assets/public-experience.css?v=4163"/>'
  html=MOD_RE.sub(legacy_repl,html)
 return inline(html)
def snapshot(page):
 return page.evaluate("""()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,els:[...document.body.querySelectorAll('*')].filter(el=>!['SCRIPT','STYLE','LINK','META','NOSCRIPT'].includes(el.tagName)).map((el,i)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{i,tag:el.tagName,cls:typeof el.className==='string'?el.className:'',id:el.id||'',x:r.x,y:r.y,w:r.width,h:r.height,fs:parseFloat(s.fontSize)||0,d:s.display,v:(r.width||r.height)&&s.display!=='none'&&s.visibility!=='hidden'}})})""")
def compare(a,b):
 if a['sw']!=b['sw'] or a['cw']!=b['cw'] or abs(a['sh']-b['sh'])>1.5:return False,'document geometry differs'
 if len(a['els'])!=len(b['els']):return False,'DOM element count differs'
 for x,y in zip(a['els'],b['els']):
  if (x['tag'],x['cls'],x['id'])!=(y['tag'],y['cls'],y['id']):return False,f"DOM identity differs at {x['i']}"
  if not(x['v'] or y['v']):continue
  delta=max(abs(x[k]-y[k]) for k in ['x','y','w','h'])
  if delta>1.5 or abs(x['fs']-y['fs'])>.2 or x['d']!=y['d']:
   return False,f"{x['tag']}.{x['cls']} geometry/font differs by {delta:.2f}px"
 return True,''
def main():
 passed=0;failed=[]
 with sync_playwright() as p:
  opts={'headless':True,'args':['--no-sandbox']}
  executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
  if executable:opts['executable_path']=executable
  elif Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
  browser=p.chromium.launch(**opts)
  try:
   for rel in PAGES:
    widths=[390,1280]+([320,430] if rel in EXTRA_MOBILE else [])
    for width in widths:
     height=844 if width<700 else 800
     snaps=[]
     for legacy in (True,False):
      page=browser.new_page(viewport={'width':width,'height':height},is_mobile=width<700)
      page.set_content(doc(rel,legacy),wait_until='domcontentloaded');page.wait_for_timeout(20)
      snaps.append(snapshot(page));page.close()
     good,reason=compare(*snaps)
     label=f'{rel} {width}px modular CSS matches v4.1.63 compatibility baseline'
     if good:passed+=1;print('PASS:',label)
     else:failed.append(f'{label}: {reason}');print('FAIL:',failed[-1])
  finally:browser.close()
 print(json.dumps({'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'},ensure_ascii=False))
 return 0 if not failed else 1
if __name__=='__main__':raise SystemExit(main())
