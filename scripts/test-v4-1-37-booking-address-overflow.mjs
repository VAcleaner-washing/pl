import fs from 'node:fs';
const css=fs.readFileSync('assets/admin-v250.css','utf8');
let n=0;
const ok=(label,cond)=>{if(!cond){console.error('FAIL:',label);process.exitCode=1}else{n++;console.log('PASS:',label)}};
ok('booking delivery route is constrained',css.includes('.booking-delivery .delivery-route-link{min-width:0;max-width:100%;overflow:hidden}'));
ok('booking delivery address span is a sized block',css.includes('.booking-delivery .delivery-route-link>span{display:block;width:100%;max-width:100%;min-width:0;'));
ok('long booking address uses ellipsis instead of intrinsic overflow',css.includes('overflow:hidden;text-overflow:ellipsis;white-space:nowrap;overflow-wrap:normal'));
if(process.exitCode)process.exit(process.exitCode);
console.log(`v4.1.37 booking address overflow: ${n}/${n}`);
