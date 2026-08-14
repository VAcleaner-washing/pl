import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const sitemapPath=path.join(root,'sitemap.xml');
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
let sitemap=fs.readFileSync(sitemapPath,'utf8');
const urls=[...sitemap.matchAll(/<loc>(https:\/\/vacleaner\.pp\.ua\/[^<]*)<\/loc>/g)].map(match=>match[1]);

const attr=(html,name)=>{
  const first=html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"[^>]*>`,`i`));
  if(first)return first[1];
  return html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"[^>]*>`,`i`))?.[1]||'';
};
const setMeta=(html,key,value)=>{
  let next=html
    .replace(new RegExp(`(<meta[^>]+(?:name|property)="${key}"[^>]+content=")[^"]*("[^>]*>)`,`i`),`$1${value}$2`)
    .replace(new RegExp(`(<meta[^>]+content=")[^"]*("[^>]+(?:name|property)="${key}"[^>]*>)`,`i`),`$1${value}$2`);
  if(attr(next,key))return next;
  const attribute=key.startsWith('og:')?'property':'name';
  return next.replace('</head>',`<meta ${attribute}="${key}" content="${value}"></head>`);
};
const syncRscMetadata=(value,title,description,url)=>value
  .replace(/(\\?"property\\?":\\?"og:title\\?",\\?"content\\?":\\?")[^"]*(\\?")/g,`$1${title}$2`)
  .replace(/(\\?"property\\?":\\?"og:description\\?",\\?"content\\?":\\?")[^"]*(\\?")/g,`$1${description}$2`)
  .replace(/(\\?"property\\?":\\?"og:url\\?",\\?"content\\?":\\?")[^"]*(\\?")/g,`$1${url}$2`)
  .replace(/(\\?"name\\?":\\?"twitter:title\\?",\\?"content\\?":\\?")[^"]*(\\?")/g,`$1${title}$2`)
  .replace(/(\\?"name\\?":\\?"twitter:description\\?",\\?"content\\?":\\?")[^"]*(\\?")/g,`$1${description}$2`)
  .replace(/(\\?"name\\?":\\?"description\\?",\\?"content\\?":\\?")[^"]*(\\?")/g,`$1${description}$2`);

for(const url of urls){
  const pathname=new URL(url).pathname;
  const rel=pathname==='/'?'index.html':`${pathname.replace(/^\//,'')}index.html`;
  const full=path.join(root,rel);
  if(!fs.existsSync(full))continue;
  let html=fs.readFileSync(full,'utf8');
  const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]||'';
  const description=attr(html,'description');
  html=setMeta(setMeta(setMeta(setMeta(html,'og:title',title),'og:description',description),'twitter:title',title),'twitter:description',description)
    .replace(/(<meta[^>]+property="og:url"[^>]+content=")[^"]*("[^>]*>)/i,`$1${url}$2`)
    .replace(/(<meta[^>]+content=")[^"]*("[^>]+property="og:url"[^>]*>)/i,`$1${url}$2`)
    .replace(/\/(favicon\.(?:ico|svg)|apple-touch-icon\.png)\?v=\d+/g,'/$1');
  html=syncRscMetadata(html,title,description,url);
  fs.writeFileSync(full,html);

  const dir=path.dirname(full);
  for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.txt'))){
    const file=path.join(dir,name);
    let value=fs.readFileSync(file,'utf8');
    value=syncRscMetadata(value,title,description,url)
      .replace(/\/(favicon\.(?:ico|svg)|apple-touch-icon\.png)\?v=\d+/g,'/$1');
    fs.writeFileSync(file,value);
  }
}

sitemap=sitemap.replace(/<lastmod>[^<]+<\/lastmod>/g,`<lastmod>${release.releasedAt}</lastmod>`);
fs.writeFileSync(sitemapPath,sitemap);
console.log(`Hardened public metadata for ${urls.length} sitemap routes.`);
