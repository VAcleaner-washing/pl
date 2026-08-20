import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});
const excludedTop=new Set(['.git','.github','.venv','.pw-browsers','config','scripts','supabase','dist','test-results','pwa-test-results','glass-test-results','density-test-results','final-desktop-test-results','final-desktop-audit','playwright-report','__pycache__','QA-EVIDENCE-v2.9.11.0']);
const excludedRoot=new Set(['package.json','requirements-ci.txt','manifest.webmanifest','favicon-16-preview.png','favicon-16x16.png','favicon-32x32.png','favicon-64x64.png']);
const excludedDeployPaths=new Set([
  'admin/bronuvannia-classic',
  'admin/bronuvannia-glass',
  'admin/manifest-classic.webmanifest',
  'admin/manifest-glass-test.webmanifest',
  '_next/static/nys-VNhc_I42iOGWHuZpG',
]);
function copy(src,dst,depth=0,relative=''){
 for(const entry of fs.readdirSync(src,{withFileTypes:true})){
   const rel=relative?`${relative}/${entry.name}`:entry.name;
   if(excludedDeployPaths.has(rel))continue;
   if(depth===0&&(excludedTop.has(entry.name)||entry.name.startsWith('test-results')||entry.name.startsWith('pwa-test-results')||entry.name.startsWith('density-test-results')||entry.name.startsWith('final-desktop-test-results')||entry.name==='final-desktop-audit'||entry.name.startsWith('playwright-report')||excludedRoot.has(entry.name)||entry.name.endsWith('.md')))continue;
   const from=path.join(src,entry.name),to=path.join(dst,entry.name);
   if(entry.isDirectory()){fs.mkdirSync(to,{recursive:true});copy(from,to,depth+1,rel)}
   else fs.copyFileSync(from,to);
 }
}
fs.mkdirSync(dist,{recursive:true});copy(root,dist);
const deployedRelease=path.join(dist,'release.json');
if(!fs.existsSync(deployedRelease))throw new Error('release.json must be included in Pages artifact');
const sourceRelease=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const distRelease=JSON.parse(fs.readFileSync(deployedRelease,'utf8'));
if(distRelease.version!==sourceRelease.version||String(distRelease.build)!==String(sourceRelease.build))throw new Error('Pages release.json does not match source release');
const files=[];const walk=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>e.isDirectory()?walk(path.join(d,e.name)):files.push(path.join(d,e.name)));walk(dist);
if(files.some(f=>/\.(?:ts|md|map)$/.test(f)))throw new Error('Development files leaked into Pages artifact');
for(const rel of excludedDeployPaths)if(fs.existsSync(path.join(dist,rel)))throw new Error(`Obsolete deploy path leaked into Pages artifact: ${rel}`);
for(const name of excludedRoot)if(fs.existsSync(path.join(dist,name)))throw new Error(`Development root file leaked into Pages artifact: ${name}`);
console.log(`Prepared Pages artifact: ${files.length} files, ${Math.round(files.reduce((n,f)=>n+fs.statSync(f).size,0)/1024)} KiB`);
