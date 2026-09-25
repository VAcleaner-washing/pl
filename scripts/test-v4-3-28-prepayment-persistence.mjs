import fs from 'node:fs';

const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const sw=fs.readFileSync('admin/sw.js','utf8');
const ok=(value,label)=>{if(!value)throw new Error(label);console.log('PASS:',label)};

ok(admin.includes("saveBtn.textContent=paid?'Зберегти й підтвердити':'Зберегти зміни'"), 'save action clearly changes meaning once 200 UAH is marked received');
ok(admin.includes("if(state.prepaymentPaid)await invoke({action:'update',bookingId:b.id,status:'confirmed'"), 'saving a received 200 UAH moves the booking to confirmed');
ok(admin.includes("else if(b.status==='pending')await invoke({action:'update',bookingId:b.id,status:'waiting_payment'"), 'unpaid processing still moves a new request to waiting payment');
ok(admin.includes("'Бронювання підтверджено · 200 грн збережено · ⚠ документи ще потрібно отримати'"), 'paid confirmation keeps the pending-document reminder');
ok(admin.includes("'Бронювання підтверджено · 200 грн збережено'"), 'paid confirmation reports persisted prepayment');
ok(admin.includes("if(requirePayment&&!state.prepaymentPaid){toast('Підтвердіть отримання 200 грн');return false}"), 'explicit confirm action still requires the 200 UAH checkbox');
ok(sw.includes("const CACHE='vacleaner-manager-4328';"), 'PWA cache is bumped so the hotfix reaches installed admin apps');

console.log('v4.3.28 prepayment persistence static gate: PASS');
