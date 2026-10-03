import fs from 'node:fs';
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');
const release=JSON.parse(fs.readFileSync('release.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
let failed=0;
function ok(value,label){if(value)console.log('PASS:',label);else{failed++;console.error('FAIL:',label)}}
ok(pkg.version===release.version&&Number(release.build)>=4331,'package and release preserve v4.3.31+ baseline');
ok(Number(release.build)>=4331,'release preserves build 4331+');
ok(admin.includes("telegram:'Telegram'"),'booking source labels include Telegram');
ok(admin.includes("['telegram','Telegram']"),'booking source selector includes Telegram');
ok(admin.includes("if(key==='telegram')return'telegram'"),'analytics keeps Telegram as a dedicated source');
ok(admin.includes("telegram:'Telegram'"),'analytics exposes Telegram label');
ok(admin.includes("'website','instagram','telegram','phone','other','historical_import'"),'source-performance order includes Telegram');
ok(spec.includes('SRC-BOOK-001')&&spec.includes('Telegram'),'system spec protects Telegram booking source');
if(failed)process.exit(1);
console.log('v4.3.31 Telegram booking source regression: PASS');
