import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),release=JSON.parse(fs.readFileSync('release.json','utf8')),build=String(release.build);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>['.git','dist'].includes(entry.name)?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const files=walk(root),errors=[];
if(fs.existsSync(path.join(root,'sw.js')))errors.push('legacy public sw.js still exists');
if(fs.existsSync(path.join(root,'manifest.webmanifest')))errors.push('legacy public manifest still exists');
for(const file of files.filter(f=>f.endsWith('.html')||f.endsWith('.txt'))){
 const s=fs.readFileSync(file,'utf8'),rel=path.relative(root,file).replaceAll('\\','/');
 if(/codex-preview/.test(s))errors.push(`development metadata: ${rel}`);
 if(!rel.startsWith('admin/')&&/manifest\.webmanifest/.test(s))errors.push(`public PWA metadata: ${rel}`);
 if(rel.startsWith('admin/')&&/href(?:\":|=\")\?\/?manifest\.webmanifest/.test(s))errors.push(`admin uses root manifest: ${rel}`);
}
for(const file of files.filter(f=>f.endsWith('.js')&&!f.includes(`${path.sep}_next${path.sep}`))){try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'})}catch{errors.push(`JS syntax: ${path.relative(root,file)}`)}}
for(const file of files.filter(f=>f.endsWith('.html'))){
 const s=fs.readFileSync(file,'utf8'),rel=path.relative(root,file).replaceAll('\\','/');
 for(const m of s.matchAll(/\/assets\/(?:vacleaner-core|public-experience|public-catalog|public-booking-slots|admin-v250|public-fixes|mobile-home-fix)\.(?:js|css)\?v=([^"']+)/g))if(m[1]!==build)errors.push(`asset version ${m[1]} in ${rel}`);
 const hasCore=/vacleaner-core\.js/.test(s), needsCore=rel==='bronuvannia/index.html'||rel.startsWith('admin/');
 if(hasCore!==needsCore)errors.push(`shared core route mismatch: ${rel}`);
 if(rel!=='bronuvannia/index.html'&&/public-catalog\.js/.test(s))errors.push(`catalog runtime on ${rel}`);
}
const raw=fs.readFileSync(path.join(root,'config','vacleaner.json'),'utf8');
const expected=crypto.createHash('sha256').update(raw).digest('hex').slice(0,16);
const core=fs.readFileSync(path.join(root,'assets','vacleaner-core.js'),'utf8');
if(!core.includes(`SOURCE_HASH="${expected}"`))errors.push('browser config is stale');
for(const fn of ['vacleaner-settings','vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
 const shared=fs.readFileSync(path.join(root,'supabase','functions',fn,'config.ts'),'utf8');
 if(!shared.includes(`VACLEANER_SOURCE_HASH="${expected}"`))errors.push(`edge config stale: ${fn}`);
}
const sw=fs.readFileSync(path.join(root,'admin','sw.js'),'utf8');if(!sw.includes(`vacleaner-manager-${build}`))errors.push('service worker cache version mismatch');
const adminRuntime=fs.readFileSync(path.join(root,'assets','admin-v250.js'),'utf8');
const swRegistrationVersions=[...adminRuntime.matchAll(/\/admin\/sw\.js\?v=(\d+)/g)].map(match=>match[1]);
if(swRegistrationVersions.length!==1||swRegistrationVersions[0]!==build)errors.push(`service worker registration version mismatch: ${swRegistrationVersions.join(',')||'missing'}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Build ${release.version} passed ${files.length} file checks. Shared config ${expected}.`);
