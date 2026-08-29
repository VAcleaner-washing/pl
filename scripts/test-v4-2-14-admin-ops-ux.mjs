import fs from 'node:fs';
import pkg from '../package.json' with {type:'json'};
import rel from '../release.json' with {type:'json'};
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const pass=[];const fail=[];
const ok=(label,condition)=>{(condition?pass:fail).push(label);console.log(`${condition?'PASS':'FAIL'} ${label}`)};
const versionAtLeast=(actual,target)=>{const a=String(actual).split('.').map(Number),b=String(target).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const av=a[i]||0,bv=b[i]||0;if(av>bv)return true;if(av<bv)return false}return true};
ok('release metadata is coherent',pkg.version===rel.version&&versionAtLeast(rel.version,'4.2.14')&&Number(rel.build)>=4214);
ok('global admin search view exists',js.includes('renderGlobalSearch'));
ok('delivery profitability view exists',js.includes('deliveryProfitabilityMapMarkup'));
ok('equipment payback view exists',js.includes('equipmentPaybackMarkup'));
ok('weekly ops report exists',js.includes('weeklyOpsReportMarkup'));
ok('client next action exists',js.includes('clientNextBestActionMarkup'));
ok('city delivery fuel settings exist',js.includes('fuelCityVadym')&&js.includes('fuelCityAnna'));
ok('admin ops UX styles exist',css.includes('global-search-layout')&&css.includes('booking-margin-panel'));
if(fail.length){console.error(`\n${fail.length} checks failed.`);process.exit(1)}
console.log(`\n${pass.length} checks passed.`);
