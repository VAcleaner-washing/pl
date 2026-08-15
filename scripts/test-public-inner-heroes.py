#!/usr/bin/env python3
from pathlib import Path
import re, json, sys
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ROUTES=['rishennia','komplekty','yak-tse-pratsiuie','vidhuky','faq','umovy','pro-nas','blog','dostavka','polityka-konfidenciynosti','pidbir']
BASE=(ROOT/'_next/static/chunks/0-rnytzezgu81.css').read_text(encoding='utf-8')
SITE=(ROOT/'assets/site-v400.css').read_text(encoding='utf-8')
EXPERIENCE=(ROOT/'assets/public-experience.css').read_text(encoding='utf-8')
passed=0; failed=[]

def check(ok,label):
    global passed
    if ok:
        passed+=1; print('PASS:',label)
    else:
        failed.append(label); print('FAIL:',label)

def inline_doc(route):
    html=(ROOT/route/'index.html').read_text(encoding='utf-8',errors='ignore')
    html=re.sub(r'<link[^>]+rel=["\']stylesheet["\'][^>]*>','',html,flags=re.I)
    html=re.sub(r'<script[^>]+src=["\'][^"\']+["\'][^>]*></script>','',html,flags=re.I)
    return html.replace('</head>',f'<style>{BASE}\n{EXPERIENCE}\n{SITE}</style></head>')

with sync_playwright() as pw:
    browser=pw.chromium.launch(
        headless=True,
        args=['--no-sandbox'],
        executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,
    )
    try:
        # DOM contract first: every editorial hero is exactly
        # [heading wrapper, supporting copy]. Keep this inside Playwright so CI
        # needs no parser dependency beyond the already-required browser QA.
        for route in ROUTES:
            page=browser.new_page(viewport={'width':1280,'height':800})
            page.set_content(inline_doc(route),wait_until='domcontentloaded',timeout=15000)
            dom=page.evaluate("""()=>{
                const hero=document.querySelector('section.inner-hero');
                if(!hero)return{hero:false};
                const kids=[...hero.children];
                return{
                    hero:true,
                    tags:kids.map(x=>x.tagName),
                    hasH1:Boolean(kids[0]?.querySelector('h1')),
                    hasEyebrow:Boolean(kids[0]?.querySelector('.eyebrow'))
                };
            }""")
            check(dom['hero'],f'/{route}/ has an inner hero')
            if dom['hero']:
                check(dom['tags']==['DIV','P'],f'/{route}/ hero uses [heading wrapper + supporting copy] grid contract')
                check(dom['hasH1'] and dom['hasEyebrow'],f'/{route}/ keeps eyebrow and H1 in the left grid cell')
            page.close()

        for width,height in [(1650,960),(1280,800),(1024,768),(430,932),(390,844)]:
            for route in ROUTES:
                page=browser.new_page(viewport={'width':width,'height':height})
                page.set_content(inline_doc(route),wait_until='domcontentloaded',timeout=15000)
                metrics=page.evaluate("""()=>{
                    const hero=document.querySelector('.inner-hero'),
                          h1=hero?.querySelector('h1'),
                          copy=[...hero.children].find(x=>x.tagName==='P');
                    const rr=x=>{const r=x?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}:null};
                    return{docW:document.documentElement.scrollWidth,viewW:innerWidth,hero:rr(hero),h1:rr(h1),copy:rr(copy)};
                }""")
                check(metrics['docW']<=metrics['viewW']+1,f'{width}px /{route}/ has no horizontal page overflow')
                h1=metrics['h1']; copy=metrics['copy']; hero=metrics['hero']
                check(h1 and h1['x']>=-1 and h1['right']<=width+1,f'{width}px /{route}/ H1 remains inside viewport')
                check(copy and copy['x']>=-1 and copy['right']<=width+1,f'{width}px /{route}/ supporting copy remains inside viewport')
                check(hero and hero['h']<=560,f'{width}px /{route}/ hero is compact enough to expose following content')
                if route in ('polityka-konfidenciynosti','umovy') and width>=901:
                    check(hero and hero['h']<=410,f'{width}px /{route}/ legal hero uses compact desktop treatment')
                page.close()
    finally:
        browser.close()

print(json.dumps({'passed':passed,'failed':failed,'status':'passed' if not failed else 'failed'},ensure_ascii=False))
sys.exit(1 if failed else 0)
