import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const sw=read('admin/sw.js');
const booking=read('supabase/functions/vacleaner-booking-v5/index.ts');
const reminders=read('supabase/functions/vacleaner-reminders-v1/index.ts');
const pkg=JSON.parse(read('package.json'));
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const ok=(value,label)=>{if(!value)throw new Error(label);console.log('PASS:',label)};

ok(/vacleaner-manager-(4325|4300)/.test(sw),'service worker cache follows v4.3.25 source or stamped build');
ok(!sw.includes("if(data.title==='Нове бронювання VAcleaner')return"),'service worker no longer drops immediate public-booking pushes');
ok(sw.includes("self.registration.showNotification"),'service worker still renders push notifications');
ok(booking.includes('const eventKey = `public:new:${booking.id}`'),'public booking direct push uses canonical event key');
ok(booking.includes('title: "Нове бронювання VAcleaner"'),'public booking sends an immediate new-booking payload');
ok(booking.includes('await finishDispatch(db, eventKey, delivered > 0)'),'public booking marks dispatch delivered only after a provider send succeeds');
ok(reminders.includes('sendClaimedToManagers(db, `public:new:${booking.id}`'),'reminder fallback uses the same event key for deduplication');
ok(reminders.includes('alreadyDelivered'),'reminder fallback recognizes already-delivered direct pushes');
ok(pkg.scripts['test:pwa-static'].includes('test-v4-3-25-public-booking-push.mjs'),'canonical static QA includes v4.3.25 push regression');
ok(spec.includes('Change record — v4.3.25 PUBLIC BOOKING PUSH DELIVERY'),'System Spec records v4.3.25 push fix');
console.log('v4.3.25 public booking push regression: PASS');
