import fs from 'node:fs';
import assert from 'node:assert/strict';
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const glass=fs.readFileSync('assets/admin-glass-test.css','utf8');
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const gateway=fs.readFileSync('supabase/functions/vacleaner-admin-bookings-v4/index.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260830164500_vacleaner_referral_phone_check_v4234.sql','utf8');
const ok=(label,cond)=>assert.ok(cond,label);

ok('PWA main no longer ends above floating nav',!glass.includes('bottom:calc(var(--mobile-nav-shell) + 8px)'));
ok('PWA shell starts at physical top for scroll-under-search',glass.includes('html.glass-test.pwa-standalone .app:not(.no-global-search) .main')&&glass.includes('top:0;')&&glass.includes('padding-top:calc(var(--mobile-topbar) + var(--pwa-safe-top) + 18px)'));
ok('PWA shell remains edge-to-edge behind bottom nav',glass.includes('bottom:0;')&&glass.includes('padding-bottom:calc(108px + var(--pwa-safe-bottom))'));
ok('mobile settings time controls use equal two-column geometry',css.includes('.settings-slot-editor .slot-editor-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}'));
ok('referral confirmation has explicit unchecked and checked states',admin.includes("btn.textContent='□ Так, надіслано'")&&admin.includes("btn.textContent='✓ Надіслано'")&&admin.includes("aria-pressed"));
ok('referral journal write happens before profile state',gateway.indexOf('vacleaner_referral_messages").insert')<gateway.indexOf('await applyConfirmedState(now)'));
ok('deduped retry repairs profile state',gateway.includes('await applyConfirmedState(recentMessage.sent_at)'));
ok('referral phone migration avoids ambiguous backslash escaping',migration.includes("customer_phone ~ '^[+]380[0-9]{9}$'")&&!migration.includes("'^\\\\+380"));
console.log('v4.2.34 PWA + referral + slots regression contracts: PASS');
