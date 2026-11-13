import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const candidateRoot=path.join(root,'release-candidate-test-results');
const release=JSON.parse(fs.readFileSync('release.json','utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const hashTree=dir=>Object.fromEntries(files(dir).map(file=>[path.relative(dir,file),sha(fs.readFileSync(file))]));
const run=(...args)=>spawnSync(process.execPath,['scripts/build-admin-release-candidate.mjs',...args],{cwd:root,encoding:'utf8'});
const results=[];
function check(name,fn){fn();results.push({name,passed:true});console.log('PASS:',name)}
if(!fs.existsSync('dist/admin/bronuvannia/index.html')){
  const build=spawnSync(process.execPath,['scripts/build-pages.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
}
const before=hashTree('dist');
const built=run();assert.equal(built.status,0,built.stderr||built.stdout);
const manifest=JSON.parse(fs.readFileSync(path.join(candidateRoot,'manifest.json'),'utf8'));
const out=manifest.output;
const read=rel=>fs.readFileSync(path.join(out,rel),'utf8');
const html=read('admin/bronuvannia/index.html');
const ui=read('assets/admin-operations-ui.js'),forms=read('assets/admin-operations-forms.js'),css=read('assets/admin-operations.css');

check('builder performs no network or publication and records exact current release',()=>{
  assert.equal(manifest.mode,'normal-path-release-candidate');
  assert.equal(manifest.release.version,release.version);assert.equal(manifest.release.build,release.build);
  assert.equal(manifest.network,'No network requests or publication performed by this builder');
});
check('the canonical full-site artifact remains byte-identical',()=>assert.deepEqual(hashTree('dist'),before));
check('every canonical route remains in the candidate without removing functionality',()=>{
  const after=hashTree(out);for(const name of Object.keys(before))assert(name in after,name);
  for(const [name,digest] of Object.entries(before))if(!manifest.changedCanonicalFiles.includes(name))assert.equal(after[name],digest,name);
  assert.equal(manifest.unchangedCanonicalFiles,Object.keys(before).length-3);
});
check('all canonical business JavaScript, API, Auth and storage code is untouched',()=>{
  for(const [name,digest] of Object.entries(before))if(name.endsWith('.js')&&name!=='admin/sw.js')assert.equal(sha(fs.readFileSync(path.join(out,name))),digest,name);
  assert(read('assets/admin-v250.js').includes("localStorage"));
  assert(!read('assets/admin-v250.js').includes('VA_STAGE_STORAGE'));
});
check('normal admin entrypoints use one operational UI marker and normal asset URLs',()=>{
  assert(html.includes('<html data-admin-ui="operations"'));
  assert.equal(read('admin/bronuvannia.html'),html);
  for(const asset of manifest.addedAssets)assert(html.includes('/'+asset+'?v='+release.build),asset);
  assert(!/\/r4\/|data-admin-lab|admin-lab-|admin-staging-|Перевіряємо тестовий доступ|Тестові дані/.test(html));
});
check('all referenced local script and CSS assets exist',()=>{
  for(const match of html.matchAll(/(?:src|href)=["'](\/assets\/[^"'?#]+\.(?:js|css))(?:\?[^"']*)?["']/g))assert(fs.existsSync(path.join(out,match[1])),match[1]);
});
check('no stage identity, stage account, bypass or secret material is shipped',()=>{
  for(const file of files(out).filter(file=>/\.(?:js|css|html|json|webmanifest|svg)$/.test(file))){
    // The canonical public SDK contains the literal validator prefix
    // "sb_secret_"; detect actual key material rather than that SDK constant.
    assert(!/jdthhqxzfpvosfdxwfem|vacleaner-r4\.invalid|VA_STAGE|VA_LAB|OAI-Sites-Authorization|siwc_bypass|sb_secret_[A-Za-z0-9_-]{12,}/.test(fs.readFileSync(file,'utf8')),path.relative(out,file));
  }
});
check('compiled presentation has no test banner, tools, readiness or transport owner',()=>{
  assert(!/\bbanner\b|\bpanel\b|adminLab|VA_STAGE|VA_LAB|window\.fetch|\.faults|labToolsPanel|labReadError/.test(ui));
  assert(ui.includes("card.querySelector('.booking-row-head').click()"));
  assert(ui.includes('button.onclick=()=>primary.click()'));
  assert(ui.includes('vacleaner_admin_compact_v1'));
  assert(!ui.includes('vacleaner_lab_compact'));
  new vm.Script(ui);
});
check('compiled form policy retains pending, dirty, acknowledgement and unload guards',()=>{
  for(const marker of ['const records=new WeakMap()','const dirty=form=>','const busy=form=>',"window.addEventListener('beforeunload'","document.addEventListener('vacleaner:form-saved'",'value.submitted=false;value.clicked=null;hydrate()','field.inert=true','field.inert=false','Збереження триває.','Залишити незбережені зміни?'])assert(forms.includes(marker),marker);
  assert(!/VA_LAB|VA_STAGE|adminLab|fault-recovery|Вимкнути тестові помилки|vacleaner:lab-conditions/.test(forms));
  new vm.Script(forms);
});
check('normal CSS contains no banner or reserved banner gap',()=>{
  assert(css.includes('html[data-admin-ui="operations"]'));
  assert(!/data-admin-lab|\.lab-banner|\.lab-tools|--lab-bar|--admin-ui-bar|48px\s*\+\s*env\(safe-area-inset-top/.test(css));
  assert(!/html\[data-admin-ui="operations"\]\s+\.(?:topbar|sidebar)\s*\{/.test(css));
  assert(!/html\[data-admin-ui="operations"\]\s+\.main\s*\{\s*top:/.test(css));
});
check('normal component rows own the safe area without hiding controls',()=>{
  assert(css.includes('.operations-detail-layout>.detail-top{padding-top:calc(10px + var(--pwa-safe-top,0px))'));
  assert(css.includes('#bookingForm>header{padding-top:calc(14px + var(--pwa-safe-top,0px))'));
  assert(css.includes('grid-template-rows:auto minmax(0,1fr) auto'));
  assert(css.includes('[data-operations-secondary="1"]'));
  assert(css.includes('[data-operations-more="false"]'));
});
check('service worker identity, fallback, scope and canonical fetch logic remain normal',()=>{
  const sw=read('admin/sw.js'),original=fs.readFileSync('dist/admin/sw.js','utf8');
  assert.equal(sw.replace(/^const CORE=.*;$/m,''),original.replace(/^const CORE=.*;$/m,''));
  assert(sw.includes('vacleaner-manager-'+release.build));
  assert(!/vacleaner-stage|vacleaner-lab|\/r4\//.test(sw));
  assert.equal(read('admin/manifest.webmanifest'),fs.readFileSync('dist/admin/manifest.webmanifest','utf8'));
  new vm.Script(sw);
});
check('offline precache includes every added presentation and form asset exactly once',()=>{
  const core=read('admin/sw.js').match(/^const CORE=(.*);$/m)?.[1];assert(core);
  for(const asset of manifest.addedAssets){const url='/'+asset+'?v='+release.build;assert.equal(core.split(url).length-1,1,url)}
});
check('candidate output matches all recorded artifact hashes',()=>assert.deepEqual(hashTree(out),manifest.hashes));
const repeated=run();assert.equal(repeated.status,0,repeated.stderr||repeated.stdout);
check('rebuilding identical inputs produces identical served bytes',()=>assert.deepEqual(hashTree(out),manifest.hashes));

const negative=path.join(candidateRoot,'negative-inputs');
fs.mkdirSync(negative,{recursive:true});
try{
  const stale=path.join(negative,'stale');fs.mkdirSync(stale,{recursive:true});
  fs.writeFileSync(path.join(stale,'release.json'),JSON.stringify({...release,build:release.build-1}));
  const staleResult=run('--source',stale,'--output',path.join(candidateRoot,'rejected-stale'));
  check('stale canonical release is refused before any output write',()=>{assert.equal(staleResult.status,1);assert.match(staleResult.stderr,/stale/);assert(!fs.existsSync(path.join(candidateRoot,'rejected-stale')))});
  const stage=path.join(negative,'stage');fs.mkdirSync(path.join(stage,'admin/bronuvannia'),{recursive:true});
  fs.writeFileSync(path.join(stage,'release.json'),JSON.stringify(release));
  fs.writeFileSync(path.join(stage,'admin/bronuvannia/index.html'),'<html data-admin-lab="staging"><script src="/r4/assets/test.js"></script></html>');
  const stageResult=run('--source',stage,'--output',path.join(candidateRoot,'rejected-stage'));
  check('a staged artifact cannot be repackaged into a production candidate',()=>{assert.equal(stageResult.status,1);assert.match(stageResult.stderr,/fresh canonical normal shell/);assert(!fs.existsSync(path.join(candidateRoot,'rejected-stage')))});
  const doubled=run('--source',out,'--output',path.join(candidateRoot,'rejected-double'));
  check('an already enhanced shell is refused rather than double-binding UI handlers',()=>{assert.equal(doubled.status,1);assert.match(doubled.stderr,/already enriched/);assert(!fs.existsSync(path.join(candidateRoot,'rejected-double')))});
  const overwrite=run('--output',path.join(root,'dist'));
  check('the builder refuses to overwrite the canonical or production build directory',()=>{assert.equal(overwrite.status,1);assert.match(overwrite.stderr,/Candidate output must be separate/);assert.deepEqual(hashTree('dist'),before)});
}finally{fs.rmSync(negative,{recursive:true,force:true})}
const summary={mode:'normal-release-candidate-boundary',passed:results.length,failed:0,
  browser:'not_run_here; use the remote-CI candidate acceptance script',productionDeployed:false,checks:results};
fs.writeFileSync(path.join(candidateRoot,'static-result.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({passed:summary.passed,failed:0,productionDeployed:false}));
