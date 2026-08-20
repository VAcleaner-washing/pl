import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const admin=read('assets/admin-v250.js');
const reminders=read('supabase/functions/vacleaner-reminders-v1/index.ts');
const push=read('supabase/functions/vacleaner-push/index.ts');
const booking=read('supabase/functions/vacleaner-booking-v5/index.ts');
const config=JSON.parse(read('config/vacleaner.json'));
let passed=0; const ok=(cond,label)=>{if(!cond)throw new Error(`FAIL: ${label}`);passed++};
const expected={puzzi:'Kärcher Puzzi',puzzi_jimmy:'Puzzi + Jimmy',puzzi_abir:'Puzzi + робот',sc2:'Kärcher SC 2',abir:'Робот ABIR',combo:'Puzzi + SC 2',general:'Puzzi + SC 2 + Jimmy',ideal_windows:'SC 2 + робот',elite:'HOME RESET'};
for(const [code,label] of Object.entries(expected))ok(admin.includes(`${code}:'${label}'`)||admin.includes(`${code}:\"${label}\"`),`admin map keeps ${code} -> ${label}`);
ok(admin.includes("function adminProductLabel(code,fallback='')"),'admin has a single product-label resolver');
ok(admin.includes('item?.label,item?.shortLabel,...(item?.aliases||[]),ADMIN_PRODUCT_LABELS[candidate]'),'resolver can infer internal names from old/public stored labels');
for(const token of [
  '<h3>${h(adminProductLabel(b.product_code,b.product_label))}</h3>',
  '<h1>${h(adminProductLabel(b.product_code,b.product_label))}</h1>',
  '<strong>${h(adminProductLabel(b.product_code,b.product_label))}</strong></div><div><small>Клієнт</small>',
  'rentals.map(b=>`<article><div><strong>${h(adminProductLabel(b.product_code,b.product_label||b.product_code||\'Оренда\'))}</strong>',
  'adminProductLabel(code,item.label||code)',
  'adminProductLabel(k,x.label)',
  "adminProductLabel('',customer.lastProduct)",
]) ok(admin.includes(token),`internal admin surface uses resolved product label: ${token.slice(0,42)}`);
ok(admin.includes('function analyticsProductIdentity(b)')&&admin.includes('label:adminProductLabel(code,catalog[code].label||raw||code)'),'analytics uses internal product labels');
// Customer-facing outbound copy intentionally stays understandable/public.
ok(admin.includes('`Оренда🚀: ${b.product_label}`'),'Telegram customer copy keeps the customer-facing label');
ok(admin.includes('`Вітаю! Вашу заявку на ${b.product_label} отримано ✅'),'booking confirmation to customer keeps the customer-facing label');
for(const [name,source] of [['reminders',reminders],['peer push',push],['public booking manager push',booking]]){
  ok(source.includes('ADMIN_PRODUCT_LABELS'),`${name} has the internal product map`);
  ok(source.includes('adminProductLabel'),`${name} resolves manager-facing product names`);
  ok(source.includes('combo: "Puzzi + SC 2"'),`${name} maps combo to Puzzi + SC 2`);
}
ok(reminders.includes('select("id,status,product_code,product_label'),'reminders fetch product_code for reliable mapping');
ok(push.includes('select("id,status,product_code,product_label'),'peer push fetches product_code for reliable mapping');
ok(reminders.includes('slots?.morningStart || "08:00"')&&reminders.includes('slots?.morningEnd || "10:00"'),'reminder fallbacks preserve approved morning slot');
ok(push.includes('kind === "pickup" ? "08:00" : "10:00"')&&push.includes('kind === "pickup" ? "17:30" : "20:00"'),'peer push fallbacks preserve approved slot windows');
// Public catalog remains public/customer-facing, not rewritten to admin names.
ok(config.catalog.products.combo.label==='Текстиль + кухня та ванна','public combo label remains client-facing');
ok(config.catalog.products.general.label==='Генеральне прибирання','public general label remains client-facing');
console.log(`Admin product labels PASS: ${passed} checks.`);
