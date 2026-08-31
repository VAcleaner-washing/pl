import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const release=JSON.parse(fs.readFileSync('release.json','utf8'));
const nav=fs.readFileSync('scripts/admin_context_navigation_qa.py','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');
const mig=fs.readFileSync('supabase/migrations/20260830_vacleaner_historical_delivery_250_backfill.sql','utf8');
const checks=[];
const ck=(name,cond)=>{checks.push([name,Boolean(cond)]);console.log(`${cond?'PASS':'FAIL'}: ${name}`)};
ck('v4.2.38 release coherent',pkg.version==='4.2.38'&&release.version==='4.2.38'&&Number(release.build)===4238);
ck('context QA waits for detail shell teardown',nav.includes("page.wait_for_selector('.detail-shell',state='detached',timeout=2500)"));
ck('context QA targets completed filter semantically',nav.includes(".chip[data-filter=\"completed\"]"));
ck('context QA no longer uses positional completed chip',!nav.includes("page.locator('.chip').nth(5)"));
ck('context QA explicitly protects pointer plane',nav.includes('booking detail fully leaves pointer plane before list interaction'));
ck('historical delivery backfill is limited to HIST completed delivery rows',mig.includes("booking_code like 'HIST-%'")&&mig.includes("status = 'completed'")&&mig.includes("fulfillment = 'delivery'"));
ck('historical delivery backfill only fills missing price',mig.includes('coalesce(delivery_amount, 0) = 0')&&mig.includes('delivery_amount = 250'));
ck('system spec records v4.2.38 change',spec.includes('Change record — v4.2.38')&&spec.includes('29/30 matched price + road-route records'));
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error(`v4.2.38 CI context stability failed: ${failed.length}`);process.exit(1)}
console.log(`v4.2.38 CI context stability: ${checks.length}/${checks.length} PASS`);
