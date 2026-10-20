import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

// The snapshot is exported by the authenticated Supabase get_edge_function
// connector. This check performs no network calls and never deploys anything.
export function compareBackendSnapshot(snapshot,{root=process.cwd(),slug='vacleaner-admin-bookings-v4',now=Date.now()}={}){
  const errors=[];
  if(snapshot.projectRef!=='yweluzclearwrazdkahu')errors.push('wrong Supabase project');
  if(!snapshot.capturedAt||!Number.isFinite(Date.parse(snapshot.capturedAt)))errors.push('snapshot capture time missing');
  else if(now-Date.parse(snapshot.capturedAt)>60*60*1000||Date.parse(snapshot.capturedAt)>now+5*60*1000)errors.push('snapshot is not fresh (maximum age: 60 minutes)');
  const fn=snapshot.functions?.find(row=>row.slug===slug);
  if(!fn)return[...errors,`missing live function: ${slug}`];
  if(fn.status!=='ACTIVE')errors.push(`${slug}: status is ${fn.status}`);
  if(fn.verify_jwt!==false)errors.push(`${slug}: unexpected gateway JWT setting`);
  const files=Array.isArray(fn.files)?fn.files:[];
  const index=files.find(row=>row.name==='index.ts');
  if(!index)errors.push(`${slug}: entrypoint missing`);
  // Follow only local imports, including imports of shared modules. An omitted
  // dependency must fail, rather than silently checking the entrypoint alone.
  const pending=['index.ts'],checked=new Set();
  while(pending.length){
    const name=pending.pop();if(checked.has(name))continue;checked.add(name);
    const file=files.find(row=>row.name===name);
    if(!file||typeof file.content!=='string'){errors.push(`${slug}/${name}: live file missing`);continue}
    if(name.startsWith('../')||path.posix.isAbsolute(name)){errors.push('unsafe snapshot path');continue}
    const local=path.join(root,'supabase','functions',slug,name);
    if(!fs.existsSync(local)){errors.push(`${slug}/${name}: repository file missing`);continue}
    if(sha(file.content)!==sha(fs.readFileSync(local)))errors.push(`${slug}/${name}: source hash differs`);
    for(const match of file.content.matchAll(/(?:from\s*|import\s*)["'](\.\.?\/[^"']+)["']/g)){
      const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1]));
      if(dependency.startsWith('../')){errors.push(`${slug}: dependency escapes function bundle`);continue}
      pending.push(dependency);
    }
  }
  return errors;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const file=process.argv.find(value=>value.startsWith('--snapshot='))?.slice(11);
  const slug=process.argv.find(value=>value.startsWith('--slug='))?.slice(7);
  if(!file){console.error('Usage: node scripts/check-backend-live.mjs --snapshot=/path/to/connector-export.json [--slug=vacleaner-admin-bookings-v4]');process.exit(2)}
  const snapshot=JSON.parse(fs.readFileSync(file,'utf8'));
  const errors=compareBackendSnapshot(snapshot,{slug});
  if(errors.length){for(const error of errors)console.error(`DRIFT ${error}`);process.exitCode=1}
  else console.log(`LIVE BACKEND MATCH · ${slug||'vacleaner-admin-bookings-v4'} · observed ${snapshot.capturedAt}`);
}
