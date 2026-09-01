import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const files=fs.readdirSync('scripts')
  .filter(name=>/^test-v\d.+\.mjs$/.test(name))
  .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const failed=[];

for(const file of files){
  const target=path.join('scripts',file);
  process.stdout.write(`\n=== archived regression · ${file} ===\n`);
  const result=spawnSync(process.execPath,[target],{stdio:'inherit'});
  if(result.status!==0)failed.push({file,exitCode:result.status??1});
}

console.log(`\nLEGACY ARCHIVE ${files.length-failed.length}/${files.length} PASS`);
if(failed.length){
  for(const item of failed)console.error(`FAIL ${item.file} · exit ${item.exitCode}`);
  process.exit(1);
}

