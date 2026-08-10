import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(https:\/\/vacleaner\.pp\.ua\/[^<]*)<\/loc>/g)].map(match=>match[1]);

for(const url of urls){
  const pathname=new URL(url).pathname;
  const rel=pathname==='/'?'index.html':`${pathname.replace(/^\//,'')}index.html`;
  const full=path.join(root,rel);
  if(!fs.existsSync(full))continue;
  let html=fs.readFileSync(full,'utf8');
  html=html
    .replace(/(<meta[^>]+property="og:url"[^>]+content=")[^"]*("[^>]*>)/i,`$1${url}$2`)
    .replace(/(<meta[^>]+content=")[^"]*("[^>]+property="og:url"[^>]*>)/i,`$1${url}$2`)
    .replace(/(\\"property\\":\\"og:url\\",\\"content\\":\\")[^"]*(\\")/g,`$1${url}$2`)
    .replace(/\/(favicon\.(?:ico|svg)|apple-touch-icon\.png)\?v=\d+/g,'/$1');
  fs.writeFileSync(full,html);
}

console.log(`Hardened public metadata for ${urls.length} sitemap routes.`);
