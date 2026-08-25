import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const runtime=read('assets/address-autocomplete.js');
const smoke=read('scripts/e2e_smoke.py');
const workflow=read('.github/workflows/pages.yml');
const pkg=JSON.parse(read('package.json'));
const rel=JSON.parse(read('release.json'));
let n=0;
function ok(name,cond){n++; if(!cond){console.error(`FAIL ${name}`);process.exitCode=1}else console.log(`OK   ${name}`)}
ok('release keeps v4.1.36+ entrance-delivery feature',pkg.version===rel.version&&Number(rel.build)>=4136);
ok('delivery detail says entrance / landmark',runtime.includes('Під’їзд / орієнтир')&&runtime.includes('зі сторони двору'));
ok('delivery note states to entrance',runtime.includes('Доставка техніки — до під’їзду.'));
ok('apartment and floor are not prompted',!runtime.includes('Під’їзд / квартира / поверх')&&!runtime.includes('кв. 24, 5 поверх'));
ok('selected address explains delivery model',runtime.includes('Доставка — до під’їзду. За потреби додайте орієнтир.'));
ok('browser smoke targets only base address input',smoke.includes(".booking-delivery-address input:not([data-vac-address-detail])"));
ok('browser smoke fills access note separately',smoke.includes("input[data-vac-address-detail]")&&smoke.includes("2 під’їзд, зі сторони двору"));
ok('CI runs address regressions before browser tests',workflow.includes('test:v4.1.34-address-assist')&&workflow.includes('test:v4.1.35-suburb-address')&&workflow.includes('test:v4.1.36-delivery-entrance'));
if(process.exitCode)process.exit(process.exitCode);
console.log(`v4.1.36 delivery entrance UX: ${n}/${n}`);
