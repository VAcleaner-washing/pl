#!/usr/bin/env python3
from pathlib import Path
import re, json, sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ARTICLES=[
 'blog/yak-pochystyty-dyvan-vdoma/index.html',
 'blog/yak-prybraty-zapakh-z-dyvana/index.html',
 'blog/yak-pochystyty-matrats-vdoma/index.html',
 'blog/shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom/index.html',
 'blog/yak-pomyty-vikna-robotom/index.html',
]
EDITORIAL_ARTICLES=[
 'blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html',
 'blog/yak-pochystyty-dyvan-vdoma/index.html',
 'blog/yak-pochystyty-matrats-pislia-dytyny/index.html',
 'blog/yak-pochystyty-matrats-vdoma/index.html',
 'blog/yak-pomyty-vikna-robotom/index.html',
 'blog/yak-prybraty-zapakh-z-dyvana/index.html',
 'blog/yak-vyvesty-plyamu-z-dyvana/index.html',
]
RELATED=[
 'rishennia/textile/index.html','rishennia/mattress/index.html','rishennia/steam/index.html','rishennia/windows/index.html',
 'tekhnika/karcher-puzzi-8-1/index.html','tekhnika/karcher-sc-2-deluxe/index.html','tekhnika/robot-dlia-vikon-abir/index.html',
]
CSS='\n'.join((ROOT/p).read_text(encoding='utf-8') for p in ['_next/static/chunks/0-rnytzezgu81.css','assets/public-fixes.css','assets/public-experience.css','assets/site-v400.css','assets/puzzi-seo.css','assets/seo-v4147.css'] if (ROOT/p).exists())
passed=0;failed=[]
def check(cond,label):
 global passed
 if cond: passed+=1; print('PASS:',label)
 else: failed.append(label); print('FAIL:',label)
def doc(rel):
 html=(ROOT/rel).read_text(encoding='utf-8',errors='ignore')
 html=re.sub(r'<link[^>]+rel=["\']stylesheet["\'][^>]*>','',html,flags=re.I)
 html=re.sub(r'<script[^>]+src=["\'][^"\']+["\'][^>]*></script>','',html,flags=re.I)
 return html.replace('</head>',f'<style>{CSS}</style></head>')
def overflow(page):
 return page.evaluate("""()=>{
 const insideIntentionalScroller=el=>{for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const x=getComputedStyle(p).overflowX;if((x==='auto'||x==='scroll')&&p.scrollWidth>p.clientWidth+2)return true}return false};
 return {sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bad:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.position!=='fixed'&&!el.classList.contains('final-cta-orbit')&&!insideIntentionalScroller(el)&&r.width>1&&(r.right>innerWidth+2||r.left<-2)}).slice(0,12).map(el=>String(el.className||el.tagName))}
}""")
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
 try:
  for rel in ARTICLES+['blog/index.html']:
   for w,h in [(390,844),(1280,800)]:
    page=browser.new_page(viewport={'width':w,'height':h},is_mobile=w<=900)
    page.set_content(doc(rel),wait_until='domcontentloaded',timeout=15000);page.wait_for_timeout(30)
    ov=overflow(page);label=f'{rel} {w}px'
    check(ov['sw']<=ov['cw']+2 and not ov['bad'],f'{label}: no horizontal overflow')
    check(page.locator('h1').count()==1 and page.locator('h1').is_visible(),f'{label}: one visible H1')
    if rel!='blog/index.html':
     check(page.locator('.content-quick-answer').count()==1 and page.locator('.content-quick-answer').is_visible(),f'{label}: quick answer visible')
     check(page.locator('.content-article-links').count()==1,f'{label}: contextual route links exist')
    else:
     check(page.locator('.content-priority-grid>a').count()==6,f'{label}: six priority guides visible')
     check(page.locator('.content-support-grid>a').count()==2,f'{label}: supporting guides preserved')
    page.close()
  for rel in EDITORIAL_ARTICLES:
   for w,h in [(390,844),(1280,800)]:
    page=browser.new_page(viewport={'width':w,'height':h},is_mobile=w<=900)
    page.set_content(doc(rel),wait_until='domcontentloaded',timeout=15000);page.wait_for_timeout(30)
    label=f'{rel} {w}px';ov=overflow(page)
    check(ov['sw']<=ov['cw']+2 and not ov['bad'],f'{label}: editorial article creates no document overflow')
    check(page.locator('.v4-article[data-editorial-structure="4163"] .v4-article-chapter').count()==4,f'{label}: four editorial chapters replace numbered manual structure')
    headings=page.locator('.v4-article h2').all_inner_texts()
    check(not any(re.match(r'^\s*\d+\.',x or '') for x in headings),f'{label}: H2 headings do not use 1/2/3 manual numbering')
    check(page.locator('.v4-article-point h3').count()>=4,f'{label}: article detail is preserved inside editorial points')
    route=page.locator('.v4-article .seo-route-links')
    if route.count():
     strong=route.locator('strong')
     check(strong.is_visible(),f'{label}: route recommendation stays visible')
     color=strong.evaluate("el=>getComputedStyle(el).color")
     check(color in {'rgb(33, 29, 25)','rgb(40, 34, 28)','rgb(31, 28, 24)'},f'{label}: route recommendation has dark readable copy on light article surface')
    page.close()
  for rel in RELATED:
   for w,h in [(390,844),(1280,800)]:
    page=browser.new_page(viewport={'width':w,'height':h},is_mobile=w<=900)
    page.set_content(doc(rel),wait_until='domcontentloaded',timeout=15000);page.wait_for_timeout(30)
    ov=overflow(page);label=f'{rel} {w}px'
    check(ov['sw']<=ov['cw']+2 and not ov['bad'],f'{label}: related block creates no overflow')
    check(page.locator('.content-related-section').count()==1 and page.locator('.content-related-section').is_visible(),f'{label}: one related-content section visible')
    cards=page.locator('.content-related-grid>a').count()
    check(cards>=1 and cards<=3,f'{label}: related cards stay compact ({cards})')
    page.close()
 finally: browser.close()
print(json.dumps({'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'},ensure_ascii=False))
sys.exit(1 if failed else 0)
