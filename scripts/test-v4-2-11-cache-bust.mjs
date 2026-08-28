import fs from 'node:fs';
const rel=JSON.parse(fs.readFileSync('release.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const sw=fs.readFileSync('admin/sw.js','utf8');
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const b=String(rel.build);
const checks=[
 ['release/package coherent',pkg.version===rel.version&&Number(rel.build)>=4211],
 ['admin service worker cache bumped',sw.includes('vacleaner-manager-'+b)],
 ['admin runtime PWA build bumped',admin.includes(`PWA_BUILD='${b}'`)],
 ['admin HTML asset query bumped',html.includes(`/assets/admin-v250.js?v=${b}`)],
 ['Telegram phone fallback is digit-normalized',admin.includes("const telegramByPhone=/^380\\d{9}$/.test(cleanPhone(phone))")],
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)bad++;}if(bad)process.exit(1);console.log(`v4.2.11 cache bust: ${checks.length}/${checks.length}`);
