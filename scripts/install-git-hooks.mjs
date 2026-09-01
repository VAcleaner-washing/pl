import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

if(!fs.existsSync('.git')){
  console.error('Git hooks can be installed only inside the checked-out VAcleaner repository.');
  process.exit(1);
}
fs.chmodSync('.githooks/pre-push',0o755);
execFileSync('git',['config','core.hooksPath','.githooks'],{stdio:'inherit'});
console.log('VAcleaner pre-push QA hook installed.');

