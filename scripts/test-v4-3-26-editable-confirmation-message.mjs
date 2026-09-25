import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const admin=read('assets/admin-v250.js');
const css=read('assets/admin-v4326.css');
const html=read('admin/bronuvannia/index.html');
const sw=read('admin/sw.js');
const pkg=JSON.parse(read('package.json'));
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const ok=(value,label)=>{if(!value)throw new Error(label);console.log('PASS:',label)};

ok(admin.includes('<textarea class="confirm-preview confirm-message-textarea"'),'process modal renders the confirmation message as a textarea');
ok(admin.includes('name="confirmationMessage"'),'editable message has an explicit form field name');
ok(admin.includes("confirmationMessageDirty=false"),'runtime tracks whether the manager manually edited the message');
ok(admin.includes("preview.value=confirmationMessage(b,form)"),'generated template still seeds the editable message');
ok(admin.includes("if(force||!confirmationMessageDirty)"),'automatic regeneration never overwrites a manager edit');
ok(admin.includes("resetConfirmMessage?.addEventListener('click'"),'manager can restore the generated template');
ok(admin.includes("navigator.clipboard.writeText(String(preview?.value||confirmationMessage(b,form)))"),'copy action uses the edited text');
ok(admin.includes("Редагування змінює лише текст для відправки"),'UI explains that message edits do not mutate booking data');
ok(/class="[^"]*\bv4326\b/.test(html),'admin enables v4.3.26 presentation layer');
ok(/\/assets\/admin-v4326\.css\?v=(4326|43\d+)/.test(html),'admin loads v4.3.26 CSS');
ok(/vacleaner-manager-(4326|43\d+)/.test(sw),'service-worker cache follows source or stamped namespace');
ok(/\/assets\/admin-v4326\.css\?v=(4326|43\d+)/.test(sw),'service worker precaches v4.3.26 CSS');
ok(css.includes('.confirm-preview.confirm-message-textarea'),'editable message has dedicated textarea styling');
ok(css.includes('min-height:360px'),'mobile editor keeps a comfortable editing height');
ok(pkg.scripts['test:pwa-static'].includes('test-v4-3-26-editable-confirmation-message.mjs'),'static aggregate includes v4.3.26 regression');
ok(pkg.scripts['test:admin-booking-flex'].includes('admin_booking_v4326_confirmation_message_qa.py'),'browser aggregate includes v4.3.26 message QA');
ok(spec.includes('Change record — v4.3.26 EDITABLE CONFIRMATION MESSAGE'),'System Spec records v4.3.26');
console.log('v4.3.26 editable confirmation message static gate: PASS');
