import fs from 'node:fs';
import vm from 'node:vm';
const read=f=>fs.readFileSync(f,'utf8');
const admin=read('assets/admin-v250.js');
const bridge=read('b/index.html');
const chunk=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
let pass=0,fail=0;const check=(ok,msg)=>{if(ok){pass++;console.log('PASS:',msg)}else{fail++;console.error('FAIL:',msg)}};
check(admin.includes("completedRentals=rentals.filter(x=>x.status==='completed')"),'client card stats use completed rentals only');
check(admin.includes('count:completedRentals.length'),'client card rental count excludes future/active bookings');
check(admin.includes('total:completedRentals.reduce'),'client card spent total excludes future/active bookings');
check(admin.includes("last:lastCompleted?.start_date||''"),'client card last rental comes from the latest completed rental');
check(admin.includes("if(b.status==='completed'){v.count++;v.total+=Number(b.total_amount||0);if(!v.last||b.start_date>v.last)v.last=b.start_date}"),'clients list KPIs count only completed rentals');
check(admin.includes('latestActivity:b.start_date||\'\''),'client identity can still follow the newest booking without corrupting last completed date');
check(!bridge.includes('http-equiv="refresh"'),'promo bridge has no fragment-dropping meta refresh race');
check(bridge.includes("params.set('promo',raw)"),'promo bridge converts fragment to query parameter');
check(bridge.includes("if(!raw.startsWith('VA-'))raw='VA-'+raw"),'promo bridge accepts both short and full promo fragments');
check(chunk.includes('hash&&code&&!code.startsWith("VA-")&&(code=`VA-${code}`)'),'booking page does not double-prefix full promo hashes');

const script=bridge.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
for(const fragment of ['#5AC12CB','#VA-5AC12CB']){
  const redirects=[];
  vm.runInNewContext(script,{URLSearchParams,decodeURIComponent,location:{search:'',hash:fragment,replace:url=>redirects.push(url)}});
  check(redirects[0]==='/bronuvannia/?promo=VA-5AC12CB',`promo bridge executes correctly for ${fragment}`);
}
console.log(JSON.stringify({passed:pass,failed:fail}));if(fail)process.exit(1);
