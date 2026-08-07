import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const admin=read('assets/admin-v250.js');
const css=read('assets/admin-v250.css');
const core=read('assets/vacleaner-core.js');
const publicExperience=read('assets/public-experience.js');
const publicSlots=read('assets/public-booking-slots.js');
const publicResilience=read('assets/public-resilience.js');
const rootRetireSw=read('sw.js');
const adminEdge=read('supabase/functions/vacleaner-admin-bookings-v3/index.ts');
const adminDataEdge=read('supabase/functions/vacleaner-admin-data-v1/index.ts');
const bookingEdge=read('supabase/functions/vacleaner-booking-v5/index.ts');
const settingsEdge=read('supabase/functions/vacleaner-settings/index.ts');
const pricing=read('supabase/functions/vacleaner-admin-bookings-v3/pricing.mjs');
const migration=read('supabase/migrations/20260807110000_vacleaner_slot_reservation_authority.sql');
const e2e=read('scripts/e2e_smoke.py');
const pwaQa=read('scripts/pwa_visual_qa.py');
let passed=0;
const ok=(value,label)=>{assert.ok(value,label);passed++};
const has=(text,token,label=token)=>ok(text.includes(token),label);
const lacks=(text,token,label=token)=>ok(!text.includes(token),label);

// One authoritative business core in browser + active Edge functions.
for(const token of ['isWeekendTariffMoment','paidDayMoments','isWeekendDeposit','rentalBase','periodsOverlap','slotIndex'])has(core,token,`shared core: ${token}`);
for(const [name,text] of [['admin',adminEdge],['public booking',bookingEdge]]){
  has(text,'rentalBase',`${name} uses shared rental tariff`);
  has(text,'isWeekendDeposit',`${name} uses shared deposit rule`);
  has(text,'slotIndex',`${name} uses shared half-day slots`);
}
lacks(adminEdge,'/functions/v1/vacleaner-admin-bookings-v2','admin v3 never delegates to v2');
lacks(adminEdge,'/functions/v1/vacleaner-admin-bookings"','admin v3 never delegates to legacy admin');
lacks(bookingEdge,'/functions/v1/vacleaner-booking-v4','booking v5 never delegates to v4');
lacks(bookingEdge,'/functions/v1/vacleaner-booking"','booking v5 never delegates to legacy booking');
has(adminEdge,'vacleaner_apply_reservation','admin reservations go through one SQL authority');
has(adminEdge,'import { discountInfo } from "./pricing.mjs"','admin pricing is isolated in a tested module');
has(pricing,"existingExtras?.discount?.source === 'manual'",'manual discount survives unrelated edits');
has(pricing,"Object.prototype.hasOwnProperty.call(body || {}, 'discount10')",'manual discount is changed only by explicit input');

// Reservation authority is half-open and checks capacity per slot under one lock.
has(migration,"pg_advisory_xact_lock(pg_catalog.hashtext('vacleaner-slot-reservation-v1'))",'reservation uses transaction lock');
has(migration,'for v_slot in select * from pg_catalog.generate_series(v_start_slot, v_end_slot - 1)','reservation checks every occupied slot');
has(migration,'vacleaner_slot_index(b.return_date,b.return_window) > v_slot','existing booking end is half-open');
has(migration,'v_reserved + v_resource.quantity > v_capacity','capacity enforced per slot');
has(migration,"if p_target_status <> 'pending' then",'pending requests never reserve inventory');
has(migration,"p_target_status = 'waiting_payment' and p_hold_expires_at is null",'waiting-payment reservations require a hold expiry');
has(migration,"return public.vacleaner_apply_reservation(",'confirmation reuses reservation authority');
has(adminEdge,'nextStatus === \"confirmed\" ? [\"pending\", \"waiting_payment\", \"confirmed\"] : [\"pending\", \"waiting_payment\"]','confirmed bookings cannot downgrade to waiting payment');
has(adminEdge,'if (![\"pending\", \"waiting_payment\", \"confirmed\"].includes(String(existing.status || \"\")))','editing is limited to pre-issue states');

// Mobile/PWA layout has one normal <=900 shell contract; standalone only specializes it.
ok((css.match(/@media \(max-width:900px\)\{/g)||[]).length===1,'exactly one primary <=900 mobile layout contract');
has(css,'.app{position:fixed;inset:0;width:auto;height:auto','mobile app shell fills the fixed viewport by physical insets');
lacks(css,'.app{position:fixed;inset:0;width:100%;height:100dvh','mobile app shell is not over-constrained by 100dvh');
has(css,'.sidebar{\n    position:fixed;right:0;bottom:0;left:0;top:auto','bottom navigation is physically pinned');
has(css,'.main{\n    position:fixed!important;top:calc(var(--mobile-topbar) + var(--pwa-safe-top))','main is the sole scroll region');
has(css,'.booking-form{grid-template-rows:auto auto minmax(0,1fr) auto!important}','mobile booking has header/progress/scroll/footer rows');
has(css,'.date-control{position:relative;display:block!important;width:100%;height:50px','admin dates use fixed geometry');
has(admin,"classList.toggle('keyboard-open',keyboard)",'keyboard state is explicit');
lacks(admin,"visualViewport?.addEventListener('scroll'",'visual viewport scroll cannot move app shell');
lacks(admin,"scrollIntoView({block:'center'",'focus never forcibly centers the page');

// User-reported regressions are permanent gates.
has(admin,'function mergeCatalog(value)','catalog migration merges new defaults into old cache');
has(core,'"carp_deta"','Carp-Deta is in shared catalog');
has(settingsEdge,'DEFAULT_CATALOG','settings normalizes against current catalog');
has(pwaQa,'Carp-Deta is present in chemistry pricing','Carp-Deta has visual regression coverage');
has(pwaQa,'bottom navigation does not walk during content scroll','bottom nav has position-invariance coverage');
has(pwaQa,'admin date control geometry is invariant after date selection','admin date has geometry-invariance coverage');
has(pwaQa,'Public: date geometry does not move after value selection','public date has geometry-invariance coverage');
has(pwaQa,'booking form shows exactly one mobile step','new booking is tested as a stepper');
has(pwaQa,'edit booking has a real internal vertical scroll region','edit booking scroll is runtime-gated');
has(pwaQa,'unavailable equipment shows the nearest compatible free window','public nearest availability is runtime-gated');
has(bookingEdge,'nextAvailable','public backend returns a nearest-compatible alternative');
has(publicSlots,'vx-nearest-availability','public UI renders nearest-compatible availability');
has(admin,'function isHistoricalPhone(value)','historical clients without real phones cannot crash the clients view');
has(admin,"!['bookings','clients'].includes(state.view)",'client search stays in the clients view');
has(admin,'const dateFullNumeric=v=>','client list has a full numeric date formatter');
has(admin,'function openClientEditor(client)','client cards have an editor');
has(adminEdge,'if (action === "clients")','admin API exposes customer profiles');
has(adminEdge,'.order(\"start_at\", { ascending: false }).limit(1000)','historical import cannot push current bookings out of the admin list');
has(adminEdge,'if (action === "save_customer")','admin API persists customer-card edits');
has(admin,'vacleaner-admin-data-v1','client/profile reads use a dedicated non-financial endpoint');
has(adminDataEdge,'if(action==="list")','admin data endpoint loads complete booking history');
has(adminDataEdge,'.limit(1000)','admin data endpoint cannot truncate current bookings behind history import');
has(adminDataEdge,'if(action==="save_customer")','admin data endpoint persists customer card edits');
lacks(adminDataEdge,'base_amount','admin data endpoint never recalculates rental finance');
lacks(adminDataEdge,'deposit_amount','admin data endpoint never touches deposits');
has(css,'.catalog-toolbar,.analytics-toolbar{display:grid!important','320px equipment and analytics toolbars share mobile containment');

has(css,'.status-dashboard{grid-template-columns:minmax(0,1fr)}','320px analytics statuses collapse to one column');
has(pwaQa,'analytics status dashboard contains its own content','analytics status dashboard has direct geometry coverage');
has(pwaQa,'returned historical booking shows mapped premium nozzles','returned historical extras have runtime coverage');
has(admin,'function isHistoricalBooking(b)','historical booking presentation is explicit');
has(admin,'у складі історичної суми','historical extras never invent a current price');
has(bookingEdge,'db.from("vacleaner_customers").select("phone")','public booking syncs the customer registry');
has(bookingEdge,'db.from("vacleaner_customers").insert','new public clients are persisted');
has(bookingEdge,'db.from("vacleaner_customers").update(profilePatch)','repeat public clients update only safe profile fields');

has(pwaQa,'settings cards use full mobile width','mobile settings full-width is gated');
has(e2e,'Selecting equipment does not auto-select dates','hidden auto-dates are forbidden');
has(e2e,'base = \"http://127.0.0.1:4173\"','browser E2E uses a local origin instead of blocked synthetic DNS');
has(admin,'https://t.me/+${phone}?text=${draft}','Telegram opens the customer chat by phone when username is absent');
lacks(admin,'https://t.me/share/url?url=&text=','Telegram share fallback never sends an empty required URL');
has(admin,"state.filter==='completed'",'returned bookings have an explicit date sort');
has(admin,"state.filter=b.dataset.filter;renderBookings();resetViewScroll()",'booking filter changes reset the main scroll owner');


// Public site must actively retire legacy root-scoped PWA workers. Only /admin/ remains a PWA.
has(rootRetireSw,'VACLEANER_ROOT_SW_RETIRE','root /sw.js is a retirement sentinel');
lacks(rootRetireSw,'caches.open','root retirement worker never creates public caches');
has(rootRetireSw,'self.registration.unregister()','root retirement worker unregisters itself');
has(publicResilience,'reg.scope===ROOT_SCOPE','public pages target only the legacy root scope');
has(publicResilience,'reg.update()','public pages ask stale root workers to update immediately');
has(publicResilience,'reg.unregister()','public pages unregister stale root workers');
lacks(publicResilience,"'/admin/'",'public cleanup never unregisters the admin PWA by path');

// Public UI must consume the same deposit classification.
for(const text of [publicExperience,publicSlots])has(text,'isWeekendDeposit?.','public deposit reads shared policy');

console.log(`Stabilization contract passed ${passed} assertions.`);
