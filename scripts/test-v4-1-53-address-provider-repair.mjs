import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const edge=read('supabase/functions/vacleaner-address-v1/index.ts');
const config=JSON.parse(read('config/vacleaner.json'));
const address=read('assets/address-autocomplete.js');
const delivery=read('dostavka/index.html');
const workflow=read('.github/workflows/pages.yml');
const qaRunner=read('scripts/qa-full.mjs');
let checks=0,failed=0;
const ok=(name,condition)=>{checks++;if(condition)console.log('OK  ',name);else{failed++;console.error('FAIL',name)}};

ok('release keeps v4.1.53+ address repair',Number(release.build)>=4153&&pkg.version===release.version);
ok('Photon request no longer sends unsupported Ukrainian lang value',!edge.includes('url.searchParams.set("lang", "uk")'));
ok('address provider remains constrained to Ukraine and the service area',edge.includes('url.searchParams.set("countrycode", "UA")')&&edge.includes('url.searchParams.set("bbox", SERVICE_BBOX)'));
ok('Photon keeps native OSM names instead of forced transliteration',!edge.includes('"Accept-Language"'));
ok('real provider errors are still treated as degraded service',edge.includes('if (!response.ok) throw new Error("photon_failed")')&&edge.includes('providerDegraded'));
ok('established local settlements keep the 250 UAH tariff',['Полтава','Розсошенці','Щербані','Горбанівка'].every(name=>config.deliveryPricing.localSettlements.includes(name)));
ok('address client fallback keeps all four local settlements',address.includes("['Полтава','Розсошенці','Щербані','Горбанівка']"));
ok('public delivery copy separates local zone from other suburbs',delivery.includes('Полтава, Розсошенці, Щербані та Горбанівка — 250 грн')&&delivery.includes('Інше передмістя'));
ok('CI runs this regression',(workflow.includes('test:v4.1.53-address-provider-repair')||qaRunner.includes('test:v4.1.53-address-provider-repair')));

console.log(`v4.1.53 address provider repair: ${checks-failed}/${checks} OK`);
if(failed)process.exit(1);
