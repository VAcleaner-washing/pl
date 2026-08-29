import fs from 'node:fs';
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const rel=JSON.parse(fs.readFileSync('release.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 ['release coherent',pkg.version===rel.version&&Number(rel.build)>=4212&&(()=>{const a=String(rel.version).split('.').map(Number),b='4.2.12'.split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true})()],
 ['single-channel UI avoids redundant chooser',admin.includes("sendChannels.length===1?'Надіслати повідомлення'")],
 ['Telegram CTA is human and transport-neutral',admin.includes('Надіслати в ${row.label}')&&!admin.includes("label:telegram?'Telegram':'Telegram · за номером'")],
 ['compact KPI summary replaces four zero cards',admin.includes('referral-summary-line')&&!admin.includes('referral-share-stats referral-share-stats-4')],
 ['empty referral history is one intentional state',admin.includes('Поки що рекомендацій немає')&&admin.includes('Коли друг використає код')],
 ['empty history sections are conditional',admin.includes('referrals.length?`<section class="referral-history-section"')&&admin.includes('rewards.length?`<section class="referral-history-section"')],
 ['main action explains automatic copy and confirmation',admin.includes('Текст скопіюється автоматично')&&admin.includes('підтвердьте її в адмінці')],
 ['two-step send confirmation remains',admin.includes("btn.textContent='Так, надіслано'")&&admin.includes('referral_mark_sent')],
 ['compact modal and empty state styling exist',css.includes('.referral-empty-state')&&css.includes('.referral-summary-line')&&css.includes('v4.2.12 · referral client hub UX polish')],
 ['mobile summary stays readable',css.includes('@media(max-width:430px)')&&css.includes('.referral-summary-line span{width:100%')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)bad++;}if(bad)process.exit(1);console.log(`Referral UX polish: ${checks.length}/${checks.length}`);
