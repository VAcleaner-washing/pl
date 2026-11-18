import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

const mode=(process.argv[2]||'full').replace(/^--mode=/,'');
const startedAt=new Date().toISOString();
const results=[];
let blockedBy=null;
const suites=JSON.parse(fs.readFileSync('config/qa-suites.json','utf8'));
const packageScripts=JSON.parse(fs.readFileSync('package.json','utf8')).scripts||{};

if(!['static','browser','full'].includes(mode)){
  console.error(`Unknown QA mode: ${mode}`);
  process.exit(2);
}
for(const group of ['static','browser']){
  if(!Array.isArray(suites[group]))throw new Error(`config/qa-suites.json: ${group} must be an array`);
  for(const script of suites[group])if(!packageScripts[script])throw new Error(`Unknown npm script in ${group} QA suite: ${script}`);
}

function run(label,args){
  const t0=Date.now();
  process.stdout.write(`\n=== ${label} ===\n`);
  const result=spawnSync(args[0],args.slice(1),{stdio:'inherit',shell:process.platform==='win32'});
  const ok=result.status===0;
  results.push({name:label,status:ok?'success':'failure',exitCode:result.status??1,durationMs:Date.now()-t0});
  if(!ok && !blockedBy)blockedBy=label;
  return ok;
}
function npm(script){return run(script,['npm','run',script])}

if(mode==='static'||mode==='full'){
  if(npm('stamp')){
    for(const script of suites.static){
      if(!npm(script))break;
    }
    if(!blockedBy)npm('build');
  }
}
if((mode==='browser'||mode==='full')&&!blockedBy){
  if(npm('verify:artifact')){
    for(const script of suites.browser){
      if(!npm(script))break;
    }
  }
}

const failed=results.filter(item=>item.status!=='success');
const summary={
  mode,
  startedAt,
  finishedAt:new Date().toISOString(),
  total:results.length,
  passed:results.length-failed.length,
  failed:failed.length,
  blockedBy,
  skipped: blockedBy ? 'Remaining suites skipped after first failing prerequisite' : null,
  results
};
fs.writeFileSync('qa-release-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('\n=== QA SUMMARY ===');
for(const result of results)console.log(`${result.status==='success'?'PASS':'FAIL'}  ${result.name}`);
console.log(`TOTAL ${summary.total} · PASS ${summary.passed} · FAIL ${summary.failed}`);
if(blockedBy)console.error(`QA BLOCKED BY: ${blockedBy}; remaining suites were not executed`);
if(failed.length){
  console.error('FULL QA NOT GREEN');
  process.exit(1);
}
console.log('FULL QA GREEN');
