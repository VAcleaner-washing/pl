import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const admin=read('assets/admin-v250.js');
const adminHtml=read('admin/bronuvannia/index.html');
const css=read('assets/admin-v250.css');
const core=read('assets/vacleaner-core.js');
const publicExperience=read('assets/public-experience.js');
const publicSlots=read('assets/public-booking-slots.js');
const publicResilience=read('assets/public-resilience.js');
const rootRetireSw=read('sw.js');
const adminEdge=read('supabase/functions/vacleaner-admin-bookings-v3/index.ts');
const statusEdge=read('supabase/functions/vacleaner-status-correction-v1/index.ts');
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
lacks(adminEdge,'action === "correct_status"','status correction lives only in the dedicated Edge');
has(statusEdge,'vacleaner_apply_reservation','status correction rechecks inventory through reservation authority');
has(statusEdge,'admin_users','status correction verifies the admin whitelist');
has(statusEdge,'edge:correct_status:','status correction writes an audit source');

lacks(adminEdge,'/functions/v1/vacleaner-admin-bookings"','admin v3 never delegates to legacy admin');
lacks(bookingEdge,'/functions/v1/vacleaner-booking-v4','booking v5 never delegates to v4');
lacks(bookingEdge,'/functions/v1/vacleaner-booking"','booking v5 never delegates to legacy booking');
has(adminEdge,'vacleaner_apply_reservation','admin reservations go through one SQL authority');
has(adminEdge,'import { discountInfo } from "./pricing.mjs"','admin pricing is isolated in a tested module');
has(pricing,"if(applied?.source==='manual')",'legacy applied manual discount survives unrelated edits');
has(pricing,"own(body,'manualDiscountType')||own(body,'manualDiscountValue')||own(body,'manualDiscountReason')",'manual discount is changed only by explicit structured input');
has(pricing,"existingExtras?.manual_discount",'manual 5/10/fixed request survives unrelated edits even when another discount wins');
has(adminEdge,'action === "save_finance"','return settlement has a dedicated finance mutation');
has(adminEdge,'manual_discount: discount.manualType === "none" ? null','return settlement persists manager manual discount request');
has(adminEdge,'base_amount: discount.baseAmount','return settlement persists the discounted rental base');

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
has(css,'.app{position:static;inset:auto;width:100%','mobile app wrapper stays out of the fixed viewport stack');
lacks(css,'.app{position:fixed;inset:0;width:100%;height:100dvh','mobile app shell is not over-constrained by 100dvh');
has(css,'.sidebar{display:none}','desktop sidebar is hidden on mobile');
has(css,'.mobile-nav{\n    position:fixed;z-index:100;right:0;bottom:0;left:0','dedicated mobile navigation is pinned directly to the viewport');
has(adminHtml,'<div id="adminMount"></div><nav class="mobile-nav"','mobile nav exists in initial HTML as a body-level sibling, like VA HOME');
lacks(admin,'<nav class="mobile-nav"','runtime never recreates the static mobile nav');
has(css,'html.keyboard-open .mobile-nav{opacity:0;visibility:visible;pointer-events:none','keyboard keeps the dedicated nav node but removes it from the visual working area while typing');
has(css,'html.keyboard-open .main{bottom:0;scroll-padding-bottom:24px}','keyboard gives the focused form the full visual viewport after nav is hidden');
lacks(css,'html.pwa-standalone .mobile-nav{position:relative','standalone grid override is absent');
lacks(css,'.app{position:fixed}\n  .topbar,.main{position:absolute}','stale v3.0.36 fixed-ancestor override is absent');
has(css,'.main{\n    position:fixed;top:calc(var(--mobile-topbar) + var(--pwa-safe-top))','main is an independent root-fixed scroll region like VA HOME');
has(css,'.booking-form{grid-template-rows:auto minmax(0,1fr) auto}','mobile booking has header-with-progress/scroll/footer rows');
has(css,'.booking-form>header .mobile-booking-progress{display:grid','mobile booking progress is integrated into the header');
has(css,'.date-control{position:relative;display:block;width:100%;height:52px','admin dates use one base geometry on desktop and PWA');
has(css,'.date-control .date-native{position:absolute;inset:0;z-index:3','native date input owns the whole date field hit area');
has(css,'.date-control .date-display{position:absolute;inset:0;z-index:2','date display is a noninteractive visual layer');
has(css,'.date-control .date-native::-webkit-calendar-picker-indicator{position:absolute;inset:0;width:100%;height:100%','calendar indicator covers the entire date field');
lacks(admin,'picker-trigger date-display','date field has no second interactive button layer');
has(admin,"classList.toggle('keyboard-open',keyboard)",'keyboard state is explicit');
has(admin,"let pwaKeyboardLatched=false",'keyboard close is latched until visual viewport actually restores');
has(admin,"if(reduced&&focused)pwaKeyboardLatched=true;else if(!reduced)pwaKeyboardLatched=false",'keyboard latch survives blur while iOS visual viewport is still reduced');
has(admin,"const keyboard=Boolean(reduced&&(focused||pwaKeyboardLatched))",'keyboard state cannot clear early on focusout');
lacks(admin,"visualViewport?.addEventListener('scroll'",'visual viewport scroll cannot move app shell');
has(admin,'focused=document.activeElement instanceof HTMLElement','keyboard mode is focus-gated during refresh');
lacks(admin,"scrollIntoView({block:'center'",'focus never forcibly centers the page');

// User-reported regressions are permanent gates.
has(admin,'function mergeCatalog(value)','catalog migration merges new defaults into old cache');
has(core,'"spot_lifter"','VA SPOT FIX is in shared catalog');
has(core,'"stain_exit"','VA STAIN OX is in shared catalog');
has(settingsEdge,'DEFAULT_CATALOG','settings normalizes against current catalog');
has(pwaQa,'VA SPOT FIX is present in chemistry pricing','VA SPOT FIX has visual regression coverage');
has(pwaQa,'VA STAIN OX is present in chemistry pricing','VA STAIN OX has visual regression coverage');
has(pwaQa,'bottom navigation does not walk during content scroll','bottom nav has position-invariance coverage');
has(pwaQa,'admin date control geometry is invariant after date selection','admin date has geometry-invariance coverage');
has(pwaQa,'Public: date geometry does not move after value selection','public date has geometry-invariance coverage');
has(pwaQa,'booking form shows exactly one mobile step','new booking is tested as a stepper');
has(pwaQa,'edit booking has a real internal vertical scroll region','edit booking scroll is runtime-gated');
has(pwaQa,'unavailable equipment shows the nearest compatible free window','public nearest availability is runtime-gated');
has(bookingEdge,'nextAvailable','public backend returns a nearest-compatible alternative');
has(publicSlots,'vx-nearest-availability','public UI renders nearest-compatible availability');
has(admin,'function isHistoricalPhone(value)','historical clients without real phones cannot crash the clients view');
has(admin,'function renderGlobalSearch(query)','global search is explicit and does not hijack a single legacy view');
has(admin,"search.placeholder=state.view==='clients'?'Пошук по всій адмінці",'client view advertises the new global search scope');
has(admin,'const dateFullNumeric=v=>','client list has a full numeric date formatter');
has(admin,'function openClientCard(client)','client rows open a full customer card');
has(admin,'data-client-open','every client row is clickable');
has(admin,'documentUploadHtml','new booking and customer card expose private document photo upload');
has(adminEdge,'if (action === "clients")','admin API exposes customer profiles');
has(adminEdge,'.order(\"start_at\", { ascending: false }).limit(1000)','historical import cannot push current bookings out of the admin list');
has(adminEdge,'if (action === "save_customer")','admin API persists customer-card edits');
has(admin,'vacleaner-admin-data-v1','client/profile reads use a dedicated non-financial endpoint');
has(adminDataEdge,'if(action==="list")','admin data endpoint loads complete booking history');
has(adminDataEdge,'.limit(1000)','admin data endpoint cannot truncate current bookings behind history import');
has(adminDataEdge,'if(action==="save_customer")','admin data endpoint persists customer card edits');
lacks(adminDataEdge,'base_amount','admin data endpoint never recalculates rental finance');
lacks(adminDataEdge,'deposit_amount','admin data endpoint never touches deposits');
has(css,'.catalog-toolbar,.analytics-toolbar{display:grid','320px equipment and analytics toolbars share mobile containment');

has(css,'.analytics-funnel-row>div:first-child{grid-template-columns:minmax(0,1fr) auto;gap:5px 8px}','mobile cumulative funnel keeps labels and values inside the card');
has(pwaQa,'cumulative analytics funnel contains its own content','analytics cumulative funnel has direct geometry coverage');
has(pwaQa,'five cumulative funnel stages stay inside the panel','analytics cumulative funnel keeps all five workflow stages visible');
has(pwaQa,'returned historical booking shows mapped premium nozzles','returned historical extras have runtime coverage');
has(admin,'function isHistoricalBooking(b)','historical booking presentation is explicit');
has(admin,'у складі історичної суми','historical extras never invent a current price');
has(bookingEdge,'db.from("vacleaner_customers").select("phone")','public booking syncs the customer registry');
has(bookingEdge,'db.from("vacleaner_customers").insert','new public clients are persisted');
has(bookingEdge,'db.from("vacleaner_customers").update(profilePatch)','repeat public clients update only safe profile fields');

has(pwaQa,'settings uses five task-focused tabs','mobile settings tab architecture is gated');
has(pwaQa,'workspace uses mobile width without clipping','every active settings workspace is geometry-gated');
has(e2e,'Selecting equipment does not auto-select dates','hidden auto-dates are forbidden');
has(e2e,'ThreadingHTTPServer((\"127.0.0.1\", 0)','browser E2E uses an isolated local HTTP origin instead of blocked synthetic DNS');
has(admin,'https://t.me/+${phone}','Telegram opens the customer chat by phone without a long draft payload');
lacks(admin,'t.me/share/url','Telegram no longer uses the share endpoint for client contact');
has(admin,"const ADMIN_ALIAS_KEY='vac_admin_alias'",'second admin login alias is explicitly tracked');
has(admin,"login==='vacleaner'||login==='annanevidoma'",'vacleaner and annanevidoma share the requested credential');
has(admin,"['equipment','Техніка',ico.tech]",'mobile More includes equipment');
has(admin,'data-mobile-logout','mobile More exposes a dedicated account logout action');
has(admin,"/auth/v1/logout?scope=local",'logout revokes only the current device session');
has(admin,"finally{clearSession();location.reload()}",'logout always clears the local remembered session and returns to login');
has(admin,'adminAlias:currentAdminAlias()','push subscription sync preserves the selected admin alias after re-login');
has(css,'.mobile-more-logout{width:100%','mobile logout is a full-width secondary action inside More');
has(adminHtml,'data-mobile-view="bookings"','dedicated mobile nav has its own primary-view buttons in initial HTML');
has(admin,"const initialAdminView=typeof window!=='undefined'&&window.matchMedia('(max-width: 900px)').matches?'upcoming':'bookings'",'mobile admin starts on Upcoming while desktop keeps Bookings');
has(css,'@media(max-width:767px){\n  .booking-card .booking-row-body{grid-template-columns:minmax(0,1fr)}','phone-only booking card override uses one full-width content column');
has(css,'.booking-card .booking-person,.booking-card .booking-delivery{grid-column:1/-1;border-right:0;border-bottom:1px solid var(--line)}','client and handoff remain separate full-width mobile rows');
has(css,'.booking-card .booking-delivery span{display:block','mobile handoff details remain visible');
has(css,'@media(max-width:900px){','tablet/mobile density contract remains isolated from desktop');
has(adminHtml,'data-mobile-view="upcoming" class="active"','initial mobile HTML highlights Upcoming');
has(adminHtml,'<span>Найближчі</span></button><button data-mobile-view="bookings"','mobile nav order begins Upcoming then Bookings');
has(admin,'comparisonLabel=previous?`проти ${analyticsRangeLabel(previous)}`','analytics comparison exposes the concrete previous date range');
has(admin,"nav('analytics','Аналітика',ico.chart)",'analytics remains an explicit navigation destination');
has(admin,"const MOBILE_MORE_VIEWS=['equipment','clients','campaigns','finances','analytics','chemistry','settings']",'More active-state mapping includes finances, analytics and all secondary views');
has(admin,'MOBILE_MORE_VIEWS.includes(state.view)','More active state uses the shared secondary-view mapping');
has(adminHtml,'id="mobileNewBooking"','mobile navigation has a dedicated centered New action in initial HTML');
has(pwaQa,'analytics activates More without a second visible active item','analytics correctly maps to More without double highlighting');

has(admin,"['completed','finished'].includes(state.filter)",'returned and finished bookings have an explicit completion-time sort');
has(admin,"['finished','Завершені оренди']",'finished rentals have a dedicated booking filter');
has(admin,"state.filter=b.dataset.filter;renderBookings();resetViewScroll()",'booking filter changes reset the main scroll owner');
has(css,'html,body,.app{height:100dvh;min-height:0;overflow:hidden}','desktop shell locks body scrolling');
has(css,'.main{position:fixed;top:var(--topbar);right:0;bottom:0;left:var(--sidebar)','desktop main starts below the fixed topbar');
has(css,'overflow-anchor:none','scroll anchoring cannot resurrect a previous view position');
has(pwaQa,'scrollbar starts below the fixed topbar instead of hiding underneath it','desktop scrollbar/topbar geometry is runtime-gated');
has(pwaQa,'single-equipment photography is vertically centered on the machine','single equipment crop is runtime-gated');
has(css,'.flow-compact{display:grid;grid-template-columns:minmax(0,1fr)','mobile booking progress becomes one clean stacked section');
has(pwaQa,'all booking-progress stages fit without smashed labels','booking progress has direct mobile geometry coverage');
has(pwaQa,'detail back row stays sticky during long booking scroll','mobile detail keeps the back-to-bookings control visible while scrolling');
has(pwaQa,'booking-detail photography never overlaps rental dates','detail hero media/date separation is runtime-gated');
has(pwaQa,'search clears when manager changes tabs','global search leakage across tabs is runtime-gated');
has(pwaQa,'tapping the date field reaches the native calendar input','admin mobile calendar tap target is runtime-gated');
has(pwaQa,'summary starts after the data card and never overlaps it','issue/return summary overlap is runtime-gated');
has(pwaQa,'status filters pin directly below the hero/topbar after scroll','booking status filters have sticky runtime coverage');
has(pwaQa,"redundant 'Крок 1 з 4' strip is not rendered between blocks",'booking step label cannot return as an interstitial strip');
has(admin,'id=\"saveProcess\"','processing modal has a separate save action');
has(admin,"status:'waiting_payment'",'saving initial processing moves a new request into waiting-for-payment');
has(admin,"status:'confirmed'",'confirmation remains a separate explicit transition');
has(admin,"processNote.includes('З клієнтом зв’язались')",'saved client-contact state is restored from the server-side booking note');
has(admin,"processNote.includes('Умови оренди та сума залогового платежу надіслані')",'saved conditions-sent state is restored from the server-side booking note');
has(admin,'function utilizationFor(bounds)','analytics calculates utilization from occupied half-day slots');
has(admin,'function repeatMetrics(bounds)','analytics distinguishes new and repeat completed rentals');
has(admin,"if(String(b?.status||'')==='completed'&&completedAt)",'analytics period prefers actual completed_at for completed rentals');
has(admin,"const rentalDate=String(b?.return_date||b?.start_date||'')",'analytics keeps planned rental date as fallback when completed_at is absent');
has(admin,'Сплячі 180+ днів','sleeping client segment is visible');
has(admin,'id="clientSegment"','clients can be filtered by repeat/sleeping segment');
has(admin,'SLEEPING_CUSTOMER_DAYS=180','sleeping customer threshold is six months / 180 days');
has(admin,'Стан production','settings exposes live production health');
has(adminDataEdge,'if(action==="health")','admin data endpoint exposes operational health');


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


lacks(css,'html{width:100%;height:100%;overflow:hidden;scrollbar-gutter:auto;overscroll-behavior:none}','mobile dashboard html root is not overflow-locked');
has(css,'html{width:100%;height:100%;min-height:100%;overflow-x:clip;overflow-y:visible','mobile dashboard html root stays available to WebKit');
has(css,'body{position:static;inset:auto;width:100%;height:100%;min-height:100%;overflow:visible','mobile dashboard body root stays available to WebKit');
has(css,'.mobile-nav{\n    position:fixed;z-index:100;right:0;bottom:0;left:0','mobile nav keeps a root fixed bottom anchor');
console.log(`Stabilization contract passed ${passed} assertions.`);
