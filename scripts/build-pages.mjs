import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});
const excludedTop=new Set(['.git','.github','config','scripts','supabase','dist','test-results','playwright-report','QA-EVIDENCE-v2.9.11.0']);
const excludedRoot=new Set(['package.json','release.json','manifest.webmanifest','sw.js']);
function copy(src,dst,depth=0){
 for(const entry of fs.readdirSync(src,{withFileTypes:true})){
   if(depth===0&&(excludedTop.has(entry.name)||entry.name.startsWith('test-results')||entry.name.startsWith('playwright-report')||excludedRoot.has(entry.name)||entry.name.endsWith('.md')))continue;
   const from=path.join(src,entry.name),to=path.join(dst,entry.name);
   if(entry.isDirectory()){fs.mkdirSync(to,{recursive:true});copy(from,to,depth+1)}
   else fs.copyFileSync(from,to);
 }
}
fs.mkdirSync(dist,{recursive:true});copy(root,dist);
const files=[];const walk=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>e.isDirectory()?walk(path.join(d,e.name)):files.push(path.join(d,e.name)));walk(dist);
if(files.some(f=>/\.(?:ts|md|map)$/.test(f)))throw new Error('Development files leaked into Pages artifact');
console.log(`Prepared Pages artifact: ${files.length} files, ${Math.round(files.reduce((n,f)=>n+fs.statSync(f).size,0)/1024)} KiB`);
