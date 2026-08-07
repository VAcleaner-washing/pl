import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
execFileSync(process.execPath,[path.join(root,'scripts','generate-config.mjs')],{stdio:'inherit'});
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const version=String(release.version), build=String(release.build||version.replace(/\D/g,''));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>['.git','dist'].includes(entry.name)?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
for(const file of walk(root).filter(f=>f.endsWith('.html'))){
  let s=fs.readFileSync(file,'utf8');
  s=s.replace(/(\/assets\/(?:vacleaner-core|public-experience|public-catalog|public-booking-slots|public-resilience|admin-v250|public-fixes|mobile-home-fix)\.(?:js|css))\?v=[^"']+/g,`$1?v=${build}`);
  fs.writeFileSync(file,s);
}
const adminSw=path.join(root,'admin','sw.js');
let sw=fs.readFileSync(adminSw,'utf8').replace(/vacleaner-manager-\d+/g,`vacleaner-manager-${build}`).replace(/\?v=\d+/g,`?v=${build}`);
fs.writeFileSync(adminSw,sw);
const adminRuntime=path.join(root,'assets','admin-v250.js');
let runtime=fs.readFileSync(adminRuntime,'utf8').replace(/const PWA_BUILD='\d+'/,`const PWA_BUILD='${build}'`).replace(/(\/admin\/sw\.js)\?v=\d+/g,`$1?v=${build}`);
fs.writeFileSync(adminRuntime,runtime);
console.log(`Stamped VAcleaner ${version} (${build})`);
