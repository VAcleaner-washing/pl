import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const buildContracts=JSON.parse(fs.readFileSync(path.join(root,'config','qa-build-contracts.json'),'utf8'));
// v4.1.57: the latest checked-in static export is now the canonical public baseline.
// Historical one-off patch scripts remain in /scripts for audit/regression tests,
// but are no longer replayed on every release. Only deterministic normalizers and
// config-driven generators run here, preventing old patches from rewriting newer copy.
execFileSync(process.execPath,[path.join(root,'scripts','sync-static-copy.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','harden-public-metadata.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','generate-config.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','apply-delivery-settings.mjs')],{stdio:'inherit'});
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const version=String(release.version), build=String(release.build||version.replace(/\D/g,''));
const ignoredDirs=new Set(['.git','dist','node_modules','.pages-artifact','.pw-browsers','.venv','__pycache__','test-results','pwa-test-results','density-test-results','final-desktop-test-results','playwright-report']);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>ignoredDirs.has(entry.name)||entry.name.endsWith('-results')||entry.name.endsWith('-test-results')||entry.name.startsWith('tmp-')?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
for(const file of walk(root).filter(f=>f.endsWith('.html'))){
  let s=fs.readFileSync(file,'utf8');
  // Every local JS/CSS asset follows one generic cache-bust rule. New assets do
  // not need to be added to a hand-maintained regex before they can ship safely.
  s=s.replace(/(\/assets\/[^"'?#]+\.(?:js|css))(?:\?[^"']*)?/g,`$1?v=${build}`);
  const rel=path.relative(root,file).replaceAll('\\','/');
  if(!rel.startsWith('admin/')){
    // v4.2.0 production uses route-aware modular runtime; legacy monoliths remain source-only for regression tests.
    s=s.replace(/<link[^>]+href=["']\/assets\/public-experience\.css(?:\?v=[^"']+)?["'][^>]*>/g,'');
    s=s.replace(/<script[^>]+src=["']\/assets\/public-experience\.js(?:\?v=[^"']+)?["'][^>]*><\/script>/g,'');
    s=s.replace(/<script[^>]+src=["']\/assets\/site-attribution\.js\?v=[^"']+["'][^>]*><\/script>/g,'');
    s=s.replace(/<script[^>]+src=["']\/assets\/booking-funnel-analytics\.js\?v=[^"']+["'][^>]*><\/script>/g,'');
    if(s.includes('</body>')){
      const analytics=`<script defer src="/assets/site-attribution.js?v=${build}"></script>${rel==='bronuvannia/index.html'?`<script defer src="/assets/booking-funnel-analytics.js?v=${build}"></script>`:''}`;
      s=s.replace('</body>',`${analytics}</body>`);
    }
  }
  fs.writeFileSync(file,s);
}
// Patched Next chunks keep historical filenames in this static export. Version every HTML/RSC
// reference so returning browsers cannot hydrate fresh server HTML with stale public components.
const versionedNextChunks=buildContracts.cacheBustedNextChunks.map(item=>item.file);
for(const file of walk(root).filter(f=>f.endsWith('.html')||f.endsWith('.txt'))){
  let s=fs.readFileSync(file,'utf8');
  for(const chunk of versionedNextChunks){
    const escaped=chunk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    s=s.replace(new RegExp(`(\\/_next\\/static\\/chunks\\/${escaped})(?:\\?v=\\d+)?`,'g'),`$1?v=${build}`);
  }
  fs.writeFileSync(file,s);
}
// v4.2.0 route loaders inherit the stamped build from their own cache-busted URL; no hard-coded child asset versions remain.

const adminSw=path.join(root,'admin','sw.js');
let sw=fs.readFileSync(adminSw,'utf8').replace(/vacleaner-manager-\d+/g,`vacleaner-manager-${build}`).replace(/\?v=\d+/g,`?v=${build}`);
fs.writeFileSync(adminSw,sw);
const adminRuntime=path.join(root,'assets','admin-v250.js');
let runtime=fs.readFileSync(adminRuntime,'utf8').replace(/const PWA_BUILD='\d+'/,`const PWA_BUILD='${build}'`).replace(/(\/admin\/sw\.js)\?v=\d+/g,`$1?v=${build}`);
fs.writeFileSync(adminRuntime,runtime);
console.log(`Stamped VAcleaner ${version} (${build})`);
