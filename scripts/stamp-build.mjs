import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
execFileSync(process.execPath,[path.join(root,'scripts','sync-static-copy.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','apply-content-v4148.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','apply-seo-v4147.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','harden-public-metadata.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','generate-config.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','apply-delivery-settings.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','apply-delivery-distance-v41472.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','apply-performance-v4149.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','apply-v4150-full-qa.mjs')],{stdio:'inherit'});
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const version=String(release.version), build=String(release.build||version.replace(/\D/g,''));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>['.git','dist'].includes(entry.name)?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
for(const file of walk(root).filter(f=>f.endsWith('.html'))){
  let s=fs.readFileSync(file,'utf8');
  s=s.replace(/(\/assets\/(?:vacleaner-core|public-experience|public-catalog|public-booking-slots|public-resilience|public-quiz|admin-v250|admin-glass-test|address-autocomplete|public-fixes|mobile-home-fix|site-v400|puzzi-seo|booking-trust-v4145|booking-funnel-analytics|seo-v4147|home-smart-guide-v4149|booking-entry-v4149|booking-hardening-v4144)\.(?:js|css))\?v=[^"']+/g,`$1?v=${build}`);
  const rel=path.relative(root,file).replaceAll('\\','/');
  if(!rel.startsWith('admin/')&&!s.includes('/assets/booking-funnel-analytics.js'))s=s.replace('</body>',`<script defer src="/assets/booking-funnel-analytics.js?v=${build}"></script></body>`);
  fs.writeFileSync(file,s);
}
// Patched Next chunks keep historical filenames in this static export. Version every HTML/RSC
// reference so returning browsers cannot hydrate fresh server HTML with stale public components.
const versionedNextChunks=[
  '146ntlcv_t6~w-v4041.js', // booking
  '01pb0x0z72e41.js',       // custom home page
  '0x2bx8kerxrmz.js',       // shared public header/footer
];
for(const file of walk(root).filter(f=>f.endsWith('.html')||f.endsWith('.txt'))){
  let s=fs.readFileSync(file,'utf8');
  for(const chunk of versionedNextChunks){
    const escaped=chunk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    s=s.replace(new RegExp(`(\\/_next\\/static\\/chunks\\/${escaped})(?:\\?v=\\d+)?`,'g'),`$1?v=${build}`);
  }
  fs.writeFileSync(file,s);
}
const adminSw=path.join(root,'admin','sw.js');
let sw=fs.readFileSync(adminSw,'utf8').replace(/vacleaner-manager-\d+/g,`vacleaner-manager-${build}`).replace(/\?v=\d+/g,`?v=${build}`);
fs.writeFileSync(adminSw,sw);
const adminRuntime=path.join(root,'assets','admin-v250.js');
let runtime=fs.readFileSync(adminRuntime,'utf8').replace(/const PWA_BUILD='\d+'/,`const PWA_BUILD='${build}'`).replace(/(\/admin\/sw\.js)\?v=\d+/g,`$1?v=${build}`);
fs.writeFileSync(adminRuntime,runtime);
console.log(`Stamped VAcleaner ${version} (${build})`);
