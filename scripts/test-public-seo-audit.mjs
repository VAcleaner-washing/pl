import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(https:\/\/vacleaner\.pp\.ua\/[^<]*)<\/loc>/g)].map(match=>match[1]);
const failures=[];
let passed=0;
const check=(ok,message)=>{if(ok){passed++;console.log(`PASS: ${message}`)}else{failures.push(message);console.error(`FAIL: ${message}`)}};
const attr=(html,name)=>{
  const first=html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"[^>]*>`,`i`));
  if(first)return first[1];
  return html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"[^>]*>`,`i`))?.[1]||'';
};

for(const url of urls){
  const pathname=new URL(url).pathname;
  const rel=pathname==='/'?'index.html':`${pathname.replace(/^\//,'')}index.html`;
  const full=path.join(root,rel);
  check(fs.existsSync(full),`${pathname} has a deployable HTML file`);
  if(!fs.existsSync(full))continue;
  const html=fs.readFileSync(full,'utf8');
  const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]||'';
  const description=attr(html,'description');
  const canonical=html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"|<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i);
  const canonicalUrl=canonical?.[1]||canonical?.[2]||'';
  check(Boolean(title),`${pathname} has a title`);
  check(title.length>=20&&title.length<=65,`${pathname} has a concise page title`);
  check(description.length>=100&&description.length<=180,`${pathname} has a useful meta description`);
  check(canonicalUrl===url,`${pathname} canonical matches sitemap URL`);
  check(attr(html,'og:url')===url,`${pathname} Open Graph URL matches canonical`);
  check(attr(html,'og:title')===title,`${pathname} Open Graph title matches the page`);
  check(attr(html,'og:description')===description,`${pathname} Open Graph description matches the page`);
  check(attr(html,'twitter:title')===title,`${pathname} Twitter title matches the page`);
  check(attr(html,'twitter:description')===description,`${pathname} Twitter description matches the page`);
  check((html.match(/<h1(?:\s|>)/gi)||[]).length===1,`${pathname} has one rendered H1`);
  check(!/(?:favicon\.(?:ico|svg)|apple-touch-icon\.png)\?v=/.test(html),`${pathname} uses stable favicon URLs`);
  check(!/<img(?![^>]*\balt=)[^>]*>/i.test(html),`${pathname} images have alt text`);
}

const lastmods=[...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(match=>match[1]);
check(lastmods.length===urls.length&&lastmods.every(value=>value===release.releasedAt),'sitemap lastmod matches the current release date');

const localAssetRefs=new Set();
for(const url of urls){
  const pathname=new URL(url).pathname;
  const rel=pathname==='/'?'index.html':`${pathname.replace(/^\//,'')}index.html`;
  const full=path.join(root,rel);if(!fs.existsSync(full))continue;
  const html=fs.readFileSync(full,'utf8');
  for(const match of html.matchAll(/(?:href|src|content)="(?:https:\/\/vacleaner\.pp\.ua)?(\/[^"?#]+\.(?:png|jpe?g|webp|ico))[^"']*"/gi))localAssetRefs.add(match[1]);
}
for(const ref of [...localAssetRefs].sort())check(fs.existsSync(path.join(root,ref.replace(/^\//,''))),`referenced local media exists: ${ref}`);

const puzzi=fs.readFileSync(path.join(root,'tekhnika/karcher-puzzi-8-1/index.html'),'utf8');
const puzziCss=fs.readFileSync(path.join(root,'assets/puzzi-seo.css'),'utf8');
check(!puzzi.includes('"streetAddress"'),'Puzzi JSON-LD does not expose a fixed pickup address');
check(puzzi.includes('href="/bronuvannia/?product=puzzi"'),'Puzzi landing preserves product context in booking CTAs');
check(puzzi.includes('width="1086" height="1448"'),'Puzzi hero image has intrinsic dimensions');
check(/\.puzzi-hero-visual img\{[^}]*object-fit:cover/.test(puzziCss),'Puzzi hero image fills its frame without distortion');
check((puzzi.match(/class="mobile-booking"/g)||[]).length===1,'Puzzi landing exposes one mobile booking bar');
check(!/8 порцій хімії|хім(?:ія|ії)[^<"]{0,80}входить у комплект/i.test(puzzi),'Puzzi landing never presents paid chemistry as included');
check(puzzi.includes('8 запечатаних порцій')&&puzzi.includes('не входять у вартість оренди'),'Puzzi landing explains packet payment before booking');
check(!/доставка[^<"]{0,80}250 грн/i.test(puzzi.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i)?.[0]||''),'Puzzi structured data does not freeze the admin-controlled delivery fee');

console.log(JSON.stringify({passed,failed:failures.length,failures},null,2));
if(failures.length)process.exit(1);
