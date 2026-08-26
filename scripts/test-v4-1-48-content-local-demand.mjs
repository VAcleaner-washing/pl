import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));
const release=JSON.parse(read('release.json'));
const seo=JSON.parse(read('config/seo-map.json'));
const sitemap=read('sitemap.xml');
let n=0,failed=0;
const ok=(name,cond)=>{n++;if(cond)console.log(`OK   ${name}`);else{failed++;console.error(`FAIL ${name}`)}};
const strip=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim();
const schemaNodes=html=>{const out=[];for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){try{const data=JSON.parse(m[1]);const walk=x=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){out.push(x);Object.values(x).forEach(walk)}};walk(data)}catch{}}return out};
const hasType=(n,t)=>Array.isArray(n?.['@type'])?n['@type'].includes(t):n?.['@type']===t;
const priority=[
  'yak-pochystyty-dyvan-vdoma',
  'skilky-sokhne-dyvan-pislia-chyshchennia',
  'yak-prybraty-zapakh-z-dyvana',
  'yak-pochystyty-matrats-vdoma',
  'shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom',
  'yak-pomyty-vikna-robotom',
];
const newlyGenerated=priority.filter(x=>x!=='skilky-sokhne-dyvan-pislia-chyshchennia');
ok('release keeps v4.1.48+ content cluster',Number(release.build)>=4148);
for(const slug of newlyGenerated){
  const file=`blog/${slug}/index.html`,route=`/blog/${slug}/`;
  ok(`${slug} exists`,exists(file));
  if(!exists(file))continue;
  const html=read(file),articleHtml=html.match(/<article class=\"v4-article content-article\">([\s\S]*?)<\/article>/)?.[1]||'',text=strip(articleHtml),nodes=schemaNodes(html);
  ok(`${slug} owns SEO map entry`,Boolean(seo[route]));
  ok(`${slug} is indexable in sitemap`,sitemap.includes(`https://vacleaner.pp.ua${route}`));
  ok(`${slug} has canonical`,html.includes(`href="https://vacleaner.pp.ua${route}" rel="canonical"`)||html.includes(`rel="canonical" href="https://vacleaner.pp.ua${route}"`));
  ok(`${slug} has article social type`,html.includes('property="og:type"')&&html.includes('content="article"'));
  ok(`${slug} has BlogPosting`,nodes.some(node=>hasType(node,'BlogPosting')));
  ok(`${slug} has breadcrumb schema`,nodes.some(node=>hasType(node,'BreadcrumbList')));
  ok(`${slug} has LocalBusiness`,nodes.some(node=>hasType(node,'LocalBusiness')));
  ok(`${slug} starts with quick answer`,html.includes('class="content-quick-answer"'));
  ok(`${slug} has useful depth`,(articleHtml.match(/<h2>/g)||[]).length>=6&&text.split(/\s+/).length>=450);
  ok(`${slug} has contextual next-step links`,html.includes('class="seo-route-links content-article-links"'));
  ok(`${slug} has one booking/picker CTA`,/class="button button-gold" href="\/(?:bronuvannia|pidbir)/.test(html));
}
const index=read('blog/index.html');
for(const slug of priority)ok(`blog index features ${slug}`,index.includes(`/blog/${slug}/`));
for(const slug of ['yak-vyvesty-plyamu-z-dyvana','yak-pochystyty-matrats-pislia-dytyny'])ok(`blog index preserves supporting ${slug}`,index.includes(`/blog/${slug}/`));
ok('blog index visibly separates priority and supporting clusters',index.includes('6 гайдів під найчастіші домашні задачі.')&&index.includes('Точкові ситуації'));

const related={
  'rishennia/textile/index.html':['yak-pochystyty-dyvan-vdoma','yak-prybraty-zapakh-z-dyvana','skilky-sokhne-dyvan-pislia-chyshchennia'],
  'rishennia/mattress/index.html':['yak-pochystyty-matrats-vdoma','yak-pochystyty-matrats-pislia-dytyny'],
  'rishennia/steam/index.html':['shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom'],
  'rishennia/windows/index.html':['yak-pomyty-vikna-robotom'],
  'tekhnika/karcher-puzzi-8-1/index.html':['yak-pochystyty-dyvan-vdoma','yak-prybraty-zapakh-z-dyvana'],
  'tekhnika/karcher-sc-2-deluxe/index.html':['shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom'],
  'tekhnika/robot-dlia-vikon-abir/index.html':['yak-pomyty-vikna-robotom'],
};
for(const [file,slugs] of Object.entries(related)){
  const html=read(file);
  ok(`${file} has one related-content block`,(html.match(/data-content-v4148="1"/g)||[]).length===1);
  for(const slug of slugs)ok(`${file} links ${slug}`,html.includes(`/blog/${slug}/`));
}
for(const file of ['blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html','blog/yak-vyvesty-plyamu-z-dyvana/index.html','blog/yak-pochystyty-matrats-pislia-dytyny/index.html']){
  const html=read(file);
  ok(`${file} has supporting crosslinks`,html.includes('class="content-inline-related" data-content-v4148="1"'));
}
ok('content cluster CSS exists',read('assets/seo-v4147.css').includes('CONTENT_V4148_START')&&read('assets/seo-v4147.css').includes('.content-related-grid'));
ok('no suburb doorway content pages were created',!fs.readdirSync(path.join(root,'blog')).some(name=>/(rozsosh|shcherb|horban|teres|suprun)/i.test(name)));
ok('content generator is wired into stamp',read('scripts/stamp-build.mjs').includes("apply-content-v4148.mjs"));

if(failed)process.exit(1);
console.log(`v4.1.48 Content & Local Demand: ${n}/${n} OK`);
