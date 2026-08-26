import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));
const seo=JSON.parse(read('config/seo-map.json'));
const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const sitemap=read('sitemap.xml');
const urls=[...sitemap.matchAll(/<loc>(https:\/\/vacleaner\.pp\.ua\/[^<]*)<\/loc>/g)].map(m=>m[1]);
const routes=urls.map(url=>new URL(url).pathname);
const attr=(html,name)=>html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`,`i`))?.[1]||html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"`,`i`))?.[1]||'';
const routeFile=route=>route==='/'?'index.html':`${route.replace(/^\//,'')}index.html`;
const schemaNodes=html=>{
  const out=[];
  for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    try{const data=JSON.parse(m[1]); const walk=x=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){out.push(x);Object.values(x).forEach(walk)}};walk(data);}catch{}
  }
  return out;
};
const hasType=(node,type)=>Array.isArray(node?.['@type'])?node['@type'].includes(type):node?.['@type']===type;
let n=0,failed=0;
const ok=(name,cond)=>{n++;if(cond)console.log(`OK   ${name}`);else{failed++;console.error(`FAIL ${name}`)}};

ok('release keeps v4.1.47+ SEO structure',pkg.version===release.version&&Number(release.build)>=4147);
ok('SEO map covers exactly the sitemap routes',routes.length===Object.keys(seo).length&&routes.every(route=>seo[route]));
const titles=[]; const descriptions=[];
for(const route of routes){
  const html=read(routeFile(route)), meta=seo[route];
  const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]||'';
  const description=attr(html,'description');
  titles.push(title);descriptions.push(description);
  ok(`${route} title follows intent map`,title===meta.title);
  ok(`${route} description follows intent map`,description===meta.description);
  ok(`${route} keeps useful title/description lengths`,title.length>=20&&title.length<=65&&description.length>=100&&description.length<=180);
  ok(`${route} loads quiet SEO UI helper`,html.includes(`/assets/seo-v4147.css?v=${release.build}`));
  const nodes=schemaNodes(html);
  const lb=nodes.find(node=>hasType(node,'LocalBusiness'));
  ok(`${route} LocalBusiness names core service area`,Boolean(lb&&Array.isArray(lb.areaServed)&&['Полтава','Розсошенці','Щербані','Горбанівка'].every(name=>lb.areaServed.some(place=>place?.name===name))));
  if(route!=='/')ok(`${route} has BreadcrumbList schema`,nodes.some(node=>hasType(node,'BreadcrumbList')));
}
ok('indexable titles are unique',new Set(titles).size===titles.length);
ok('indexable descriptions are unique',new Set(descriptions).size===descriptions.length);

const solutionExpectations={
  '/rishennia/textile/':'Як глибоко почистити диван і м’які меблі вдома',
  '/rishennia/mattress/':'Як глибоко почистити матрац вдома',
  '/rishennia/steam/':'Що можна чистити пароочисником вдома',
  '/rishennia/windows/':'Як помити вікна без зайвої ручної роботи',
};
for(const [route,h1] of Object.entries(solutionExpectations)){
  const html=read(routeFile(route));
  const rendered=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()||'';
  const nodes=schemaNodes(html), service=nodes.find(node=>hasType(node,'Service'));
  ok(`${route} owns task-intent H1`,rendered===h1);
  ok(`${route} does not masquerade as exact-model rental page`,!seo[route].title.startsWith('Оренда ')&&Boolean(service)&&!String(service.name||'').startsWith('Оренда '));
  ok(`${route} solution hero has intrinsic geometry and priority`,/class="product-image"[\s\S]{0,300}<img[^>]+width="1086"[^>]+height="1448"[^>]+fetchpriority="high"/i.test(html));
}
const puzzi=read('tekhnika/karcher-puzzi-8-1/index.html');
const sc2=read('tekhnika/karcher-sc-2-deluxe/index.html');
const abir=read('tekhnika/robot-dlia-vikon-abir/index.html');
ok('equipment pages keep exact commercial rental intent',[puzzi,sc2,abir].every(html=>(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').includes('Оренда')));

const home=read('index.html'),homeChunk=read('_next/static/chunks/01pb0x0z72e41.js');
ok('home communicates category and city before the brand hook',home.includes('<p class="v21-local-intent">Оренда професійної техніки для прибирання · Полтава</p>')&&homeChunk.includes('className:"v21-local-intent"'));
ok('home LCP image keeps fixed geometry',home.includes('src="/assets/cleaning-process-poster.webp"')&&home.includes('fetchpriority="high"')&&home.includes('width="1086"')&&home.includes('height="1448"')&&homeChunk.includes('width:1086,height:1448'));

ok('stain article links informational intent into solution and Puzzi',read('blog/yak-vyvesty-plyamu-z-dyvana/index.html').includes('href="/rishennia/textile/"')&&read('blog/yak-vyvesty-plyamu-z-dyvana/index.html').includes('href="/tekhnika/karcher-puzzi-8-1/"'));
ok('drying article links into textile solution',read('blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html').includes('class="seo-route-links"')&&read('blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html').includes('href="/rishennia/textile/"'));
ok('mattress article links into mattress solution and recommended bundle',read('blog/yak-pochystyty-matrats-pislia-dytyny/index.html').includes('href="/rishennia/mattress/"')&&read('blog/yak-pochystyty-matrats-pislia-dytyny/index.html').includes('product=puzzi_jimmy'));

for(const [file,target] of Object.entries({
  'karcher-sc2.html':'/tekhnika/karcher-sc-2-deluxe/',
  'abir-wd8.html':'/tekhnika/robot-dlia-vikon-abir/',
  'jimmy-jv35.html':'/rishennia/mattress/',
  'karcher-puzzi.html':'/tekhnika/karcher-puzzi-8-1/'
})){
  const html=exists(file)?read(file):'';
  ok(`${file} preserves legacy equity without stale copy`,Boolean(html)&&html.includes('noindex,follow')&&html.includes(`https://vacleaner.pp.ua${target}`)&&html.includes(`content="0;url=${target}"`)&&html.includes(`location.replace(${JSON.stringify(target)})`));
  ok(`${file} stays out of sitemap`,!sitemap.includes(`https://vacleaner.pp.ua/${file}`));
}
for(const file of ['404.html','404/index.html','_not-found/index.html']){
  const html=read(file);
  ok(`${file} stays noindex without canonicalizing to home`,/name="robots" content="noindex/i.test(html)&&!/<link[^>]+rel="canonical"/i.test(html)&&!/<meta[^>]+property="og:url"/i.test(html));
}
const lastmods=[...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m=>m[1]);
ok('sitemap lastmod values are valid route content dates',lastmods.length===routes.length&&lastmods.every(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&value<=release.releasedAt));
const hardener=read('scripts/harden-public-metadata.mjs');
ok('future deploys no longer rewrite every sitemap lastmod',hardener.includes('Preserve route-specific lastmod values')&&!hardener.includes('sitemap=sitemap.replace(/<lastmod>[^<]+'));
ok('admin and short internal bridges remain out of sitemap',!sitemap.includes('/admin/')&&!sitemap.includes('/b/')&&!sitemap.includes('/s/'));

if(failed)process.exit(1);
console.log(`v4.1.47 SEO + Local SEO: ${n}/${n} OK`);
