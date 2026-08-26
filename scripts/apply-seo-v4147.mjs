import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const seoMap=JSON.parse(fs.readFileSync(path.join(root,'config/seo-map.json'),'utf8'));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const write=(rel,value)=>fs.writeFileSync(path.join(root,rel),value);
const exists=rel=>fs.existsSync(path.join(root,rel));
const routeFile=route=>route==='/'?'index.html':`${route.replace(/^\//,'')}index.html`;
const routeTextFiles=route=>{
  const html=routeFile(route), dir=path.dirname(path.join(root,html));
  if(!fs.existsSync(dir))return[];
  return fs.readdirSync(dir).filter(name=>name.endsWith('.txt')).map(name=>path.relative(root,path.join(dir,name)).replaceAll('\\','/'));
};
const jsonString=value=>JSON.stringify(String(value)).slice(1,-1);

function setTitle(html,title){
  return /<title>[^<]*<\/title>/i.test(html)?html.replace(/<title>[^<]*<\/title>/i,`<title>${title}</title>`):html.replace('</head>',`<title>${title}</title></head>`);
}
function metaContent(html,key){
  const a=html.match(new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]+content="([^"]*)"[^>]*>`,`i`));
  if(a)return a[1];
  return html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${key}"[^>]*>`,`i`))?.[1]||'';
}
function setMeta(html,key,value){
  let next=html
    .replace(new RegExp(`(<meta[^>]+(?:name|property)="${key}"[^>]+content=")[^"]*("[^>]*>)`,`i`),`$1${value}$2`)
    .replace(new RegExp(`(<meta[^>]+content=")[^"]*("[^>]+(?:name|property)="${key}"[^>]*>)`,`i`),`$1${value}$2`);
  if(metaContent(next,key))return next;
  return next.replace('</head>',`<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${value}"></head>`);
}
function setCanonical(html,url){
  if(/<link[^>]+rel="canonical"/i.test(html))return html
    .replace(/(<link[^>]+rel="canonical"[^>]+href=")[^"]*("[^>]*>)/i,`$1${url}$2`)
    .replace(/(<link[^>]+href=")[^"]*("[^>]+rel="canonical"[^>]*>)/i,`$1${url}$2`);
  return html.replace('</head>',`<link rel="canonical" href="${url}"></head>`);
}
const areaServed=[
  {'@type':'City','name':'Полтава'},
  {'@type':'Place','name':'Розсошенці'},
  {'@type':'Place','name':'Щербані'},
  {'@type':'Place','name':'Горбанівка'},
  {'@type':'AdministrativeArea','name':'Полтавський район, Полтавська область'},
];
const crumbMap={
  '/pidbir/':['Підбір за 30 сек'],
  '/tekhnika/karcher-puzzi-8-1/':['Kärcher Puzzi 8/1'],
  '/tekhnika/karcher-sc-2-deluxe/':['Kärcher SC 2 Deluxe'],
  '/tekhnika/robot-dlia-vikon-abir/':['Робот для вікон ABIR WD8'],
  '/rishennia/':['Рішення'],
  '/rishennia/textile/':['Рішення','Диван і м’які меблі'],
  '/rishennia/mattress/':['Рішення','Матрац'],
  '/rishennia/steam/':['Рішення','Кухня і ванна'],
  '/rishennia/windows/':['Рішення','Вікна'],
  '/komplekty/':['Комплекти'],
  '/bronuvannia/':['Бронювання'],
  '/vidhuky/':['Відгуки'],
  '/yak-tse-pratsiuie/':['Як це працює'],
  '/pro-nas/':['Про VAcleaner'],
  '/dostavka/':['Доставка й оплата'],
  '/faq/':['FAQ'],
  '/umovy/':['Умови оренди'],
  '/kontakty/':['Контакти'],
  '/blog/':['Поради'],
  '/blog/yak-vyvesty-plyamu-z-dyvana/':['Поради','Пляма на дивані'],
  '/blog/skilky-sokhne-dyvan-pislia-chyshchennia/':['Поради','Скільки сохне диван'],
  '/blog/yak-pochystyty-matrats-pislia-dytyny/':['Поради','Матрац після дитини'],
  '/polityka-konfidenciynosti/':['Конфіденційність'],
};
const urlForCrumb=(route,index,names)=>{
  if(names[0]==='Рішення')return index===0?'https://vacleaner.pp.ua/rishennia/':`https://vacleaner.pp.ua${route}`;
  if(names[0]==='Поради')return index===0?'https://vacleaner.pp.ua/blog/':`https://vacleaner.pp.ua${route}`;
  return `https://vacleaner.pp.ua${route}`;
};
function breadcrumbSchema(route){
  const names=crumbMap[route]||[];
  const items=[{'@type':'ListItem',position:1,name:'Головна',item:'https://vacleaner.pp.ua/'}];
  names.forEach((name,index)=>items.push({'@type':'ListItem',position:index+2,name,item:urlForCrumb(route,index,names)}));
  return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items};
}
function typeIncludes(value,type){return Array.isArray(value)?value.includes(type):value===type;}
function walkSchema(node,fn){
  if(Array.isArray(node)){node.forEach(value=>walkSchema(value,fn));return;}
  if(!node||typeof node!=='object')return;
  fn(node);
  Object.values(node).forEach(value=>walkSchema(value,fn));
}
const solutionSchema={
  '/rishennia/textile/':{
    name:'Самостійне глибоке очищення дивана і м’яких меблів',
    serviceType:'Рішення для самостійного глибокого очищення дивана й м’яких меблів'
  },
  '/rishennia/mattress/':{
    name:'Глибоке очищення матраца вдома · Puzzi + Jimmy',
    serviceType:'Рішення для самостійного глибокого очищення матраца'
  },
  '/rishennia/steam/':{
    name:'Очищення кухні й ванної пароочисником',
    serviceType:'Рішення для очищення твердих поверхонь парою'
  },
  '/rishennia/windows/':{
    name:'Миття вікон роботом ABIR WD8',
    serviceType:'Рішення для самостійного миття вікон і скла'
  }
};
function patchSchemas(html,route,description){
  let hasBreadcrumb=false;
  html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(full,text)=>{
    try{
      const data=JSON.parse(text);
      walkSchema(data,node=>{
        if(typeIncludes(node['@type'],'BreadcrumbList'))hasBreadcrumb=true;
        if(typeIncludes(node['@type'],'LocalBusiness'))node.areaServed=structuredClone(areaServed);
        if(typeIncludes(node['@type'],'Service')){
          node.areaServed=structuredClone(areaServed);
          if(solutionSchema[route]){
            node.name=solutionSchema[route].name;
            node.serviceType=solutionSchema[route].serviceType;
            node.description=description;
          }
        }
        if(node.eligibleRegion)node.eligibleRegion=structuredClone(areaServed);
      });
      return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
    }catch{return full;}
  });
  if(route!=='/'&&!hasBreadcrumb&&crumbMap[route]){
    const script=`<script type="application/ld+json">${JSON.stringify(breadcrumbSchema(route))}</script>`;
    html=html.replace('</head>',`${script}</head>`);
  }
  return html;
}
function addSeoCss(html){
  if(html.includes('/assets/seo-v4147.css'))return html;
  return html.replace('</head>','<link rel="stylesheet" href="/assets/seo-v4147.css?v=4147"></head>');
}

// One SEO map is authoritative for every indexable route.
for(const [route,meta] of Object.entries(seoMap)){
  const file=routeFile(route);
  if(!exists(file))throw new Error(`SEO route missing deployable HTML: ${route}`);
  let html=read(file);
  const canonical=`https://vacleaner.pp.ua${route}`;
  html=setTitle(html,meta.title);
  html=setMeta(html,'description',meta.description);
  html=setCanonical(html,canonical);
  html=patchSchemas(html,route,meta.description);
  html=addSeoCss(html);
  write(file,html);
}

// Separate task-intent landing pages from exact-model rental pages.
const h1Replacements={
  '/rishennia/textile/':['Диван, матрац, крісла','Як глибоко почистити диван і м’які меблі вдома'],
  '/rishennia/mattress/':['Глибоке очищення матраца','Як глибоко почистити матрац вдома'],
  '/rishennia/steam/':['Кухня, ванна, плитка','Що можна чистити пароочисником вдома'],
  '/rishennia/windows/':['Менше ручної роботи зі склом','Як помити вікна без зайвої ручної роботи'],
};
for(const [route,[from,to]] of Object.entries(h1Replacements)){
  for(const file of [routeFile(route),...routeTextFiles(route)]){
    if(!exists(file))continue;
    const value=read(file);
    if(value.includes(from))write(file,value.split(from).join(to));
  }
  if(!read(routeFile(route)).includes(to))throw new Error(`Task-intent H1 was not applied for ${route}`);
}

// Make local intent explicit in the first screen without replacing the existing brand hook.
{
  const localIntent='Оренда професійної техніки для прибирання · Полтава';
  let html=read('index.html');
  if(!html.includes('class="v21-local-intent"'))html=html.replace('<div class="v21-hero-copy"><p class="v21-kicker">',`<div class="v21-hero-copy"><p class="v21-local-intent">${localIntent}</p><p class="v21-kicker">`);
  write('index.html',html);
  const chunk='_next/static/chunks/01pb0x0z72e41.js';
  let js=read(chunk);
  if(!js.includes('className:"v21-local-intent"')){
    const from='(0,s.jsxs)("div",{className:"v21-hero-copy",children:[(0,s.jsxs)("p",{className:"v21-kicker"';
    const to=`(0,s.jsxs)("div",{className:"v21-hero-copy",children:[(0,s.jsx)("p",{className:"v21-local-intent",children:"${localIntent}"}),(0,s.jsxs)("p",{className:"v21-kicker"`;
    if(!js.includes(from))throw new Error('Cannot locate home hero JSX for local intent');
    js=js.replace(from,to);
  }
  const imgFrom='src:"/assets/cleaning-process-poster.webp",alt:"VAcleaner доставляє готовий комплект для прибирання",fetchPriority:"high"';
  const imgTo='src:"/assets/cleaning-process-poster.webp",alt:"VAcleaner доставляє готовий комплект для прибирання",fetchPriority:"high",width:1086,height:1448,decoding:"async"';
  if(js.includes(imgFrom))js=js.replace(imgFrom,imgTo);
  write(chunk,js);
  let html2=read('index.html');
  html2=html2.replace(/<img([^>]+src="\/assets\/cleaning-process-poster\.webp"[^>]*)>/i,(full,attrs)=>{
    let next=attrs;
    if(!/\bwidth=/.test(next))next+=' width="1086"';
    if(!/\bheight=/.test(next))next+=' height="1448"';
    if(!/\bdecoding=/.test(next))next+=' decoding="async"';
    return `<img${next}>`;
  });
  write('index.html',html2);
}

// Stabilize intrinsic geometry for the four task-solution hero images in static HTML and RSC.
const heroImages={
  '/rishennia/textile/':['/assets/puzzi.webp','Kärcher Puzzi 8/1'],
  '/rishennia/mattress/':['/assets/jimmy.webp','Jimmy JV35'],
  '/rishennia/steam/':['/assets/sc2.webp','Kärcher SC 2 Deluxe'],
  '/rishennia/windows/':['/assets/abir.webp','Робот для вікон · ABIR WD8'],
};
for(const [route,[src,alt]] of Object.entries(heroImages)){
  const htmlFile=routeFile(route);
  let html=read(htmlFile);
  html=html.replace(new RegExp(`<img([^>]+src="${src.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*)>`,'i'),(full,attrs)=>{
    let next=attrs;
    if(!/\bwidth=/.test(next))next+=' width="1086"';
    if(!/\bheight=/.test(next))next+=' height="1448"';
    if(!/\bfetchpriority=/.test(next))next+=' fetchpriority="high"';
    if(!/\bdecoding=/.test(next))next+=' decoding="async"';
    return `<img${next}>`;
  });
  write(htmlFile,html);
  const plain=`{"src":"${src}","alt":"${alt}"}`;
  const enhanced=`{"src":"${src}","alt":"${alt}","width":1086,"height":1448,"fetchPriority":"high","decoding":"async"}`;
  for(const file of routeTextFiles(route))if(exists(file))write(file,read(file).split(plain).join(enhanced));
}

// Strengthen cluster links at the point where informational intent turns commercial.
const articleLinks={
  'blog/yak-vyvesty-plyamu-z-dyvana/index.html':{
    marker:'<div class="v4-article-cta">',
    html:'<aside class="seo-route-links" aria-label="Наступний крок"><small>Далі за задачею</small><strong>Від плями — до повного очищення дивана</strong><div><a href="/rishennia/textile/">Рішення для дивана →</a><a href="/tekhnika/karcher-puzzi-8-1/">Оренда Kärcher Puzzi →</a></div></aside>'
  },
  'blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html':{
    marker:'<div class="v4-article-cta">',
    html:'<aside class="seo-route-links" aria-label="Наступний крок"><small>Перед бронюванням</small><strong>Подивіться повний сценарій очищення дивана</strong><div><a href="/rishennia/textile/">Рішення для дивана →</a><a href="/tekhnika/karcher-puzzi-8-1/">Kärcher Puzzi 8/1 →</a></div></aside>'
  },
  'blog/yak-pochystyty-matrats-pislia-dytyny/index.html':{
    marker:'<div class="v4-article-cta">',
    html:'<aside class="seo-route-links" aria-label="Наступний крок"><small>Далі за задачею</small><strong>Для матраца рекомендуємо послідовність сухий етап → промивання</strong><div><a href="/rishennia/mattress/">Рішення для матраца →</a><a href="/bronuvannia/?product=puzzi_jimmy">Перевірити Puzzi + Jimmy →</a></div></aside>'
  }
};
for(const [file,block] of Object.entries(articleLinks)){
  let html=read(file);
  if(!html.includes('class="seo-route-links"')){
    const at=html.lastIndexOf(block.marker);
    if(at<0)throw new Error(`Cannot locate article CTA in ${file}`);
    html=html.slice(0,at)+block.html+html.slice(at);
  }
  write(file,html);
}

// GitHub Pages cannot emit 301s, so preserve known indexed legacy URLs as zero-delay
// canonical redirect documents rather than letting old false prices/claims remain discoverable.
const legacyRedirects={
  'karcher-sc2.html':'/tekhnika/karcher-sc-2-deluxe/',
  'abir-wd8.html':'/tekhnika/robot-dlia-vikon-abir/',
  'jimmy-jv35.html':'/rishennia/mattress/',
  'karcher-puzzi.html':'/tekhnika/karcher-puzzi-8-1/'
};
for(const [file,target] of Object.entries(legacyRedirects)){
  const absolute=`https://vacleaner.pp.ua${target}`;
  const html=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сторінку перенесено — VAcleaner</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${absolute}"><meta http-equiv="refresh" content="0;url=${target}"><script>location.replace(${JSON.stringify(target)});</script></head><body><p>Сторінку перенесено. <a href="${target}">Відкрити актуальну сторінку VAcleaner</a>.</p></body></html>`;
  write(file,html);
}

// A 404 is already noindex; canonicalizing it to home sends a misleading consolidation signal.
for(const file of ['404.html','404/index.html','_not-found/index.html']){
  if(!exists(file))continue;
  let html=read(file);
  html=html.replace(/<link[^>]+rel="canonical"[^>]*>/gi,'').replace(/<link[^>]+href="[^"]+"[^>]+rel="canonical"[^>]*>/gi,'');
  html=html.replace(/<meta[^>]+property="og:url"[^>]*>/gi,'').replace(/<meta[^>]+content="[^"]*"[^>]+property="og:url"[^>]*>/gi,'');
  write(file,html);
}

console.log(`Applied v4.1.47 SEO map to ${Object.keys(seoMap).length} indexable routes.`);
