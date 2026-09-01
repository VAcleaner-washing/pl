import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

const suites=JSON.parse(fs.readFileSync('config/qa-suites.json','utf8')).currentContracts||[];
const failed=[];

for(const contract of suites){
  process.stdout.write(`\n--- current contract · ${contract.domain} ---\n`);
  const result=spawnSync(process.execPath,[contract.file],{stdio:'inherit'});
  if(result.status!==0)failed.push({domain:contract.domain,file:contract.file,exitCode:result.status??1});
}

console.log(`\nCURRENT CONTRACTS ${suites.length-failed.length}/${suites.length} PASS`);
if(failed.length){
  for(const item of failed)console.error(`FAIL ${item.domain} · ${item.file} · exit ${item.exitCode}`);
  process.exit(1);
}

