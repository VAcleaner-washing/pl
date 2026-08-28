import fs from 'node:fs';
const s=fs.readFileSync('assets/admin-v250.js','utf8');
const checks=[
  ['phone is recognized as Telegram fallback', s.includes("const telegramByPhone=/^\\+380\\d{9}$/.test(phone)")],
  ['Telegram channel exists without username', s.includes("(telegram||telegramByPhone)?{key:'telegram'")],
  ['fallback label explains phone mode', s.includes("Telegram · за номером")],
  ['sender still passes customer phone', s.includes("telegramContactLink({customer_phone:phone,customer_telegram:telegram})")],
  ['PWA build bumped', s.includes("PWA_BUILD='4210'")],
];
let bad=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)bad++;}
if(bad)process.exit(1);
console.log(`Referral Telegram phone fallback: ${checks.length}/${checks.length}`);
