import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../admin/sw.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');
const nativeRuntime=fs.readFileSync(new URL('../assets/admin-v430.js',import.meta.url),'utf8');
const nativeCss=fs.readFileSync(new URL('../assets/admin-v430.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../admin/bronuvannia/index.html',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../admin/manifest.webmanifest',import.meta.url),'utf8'));
const rootRetireSw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const publicResilience=fs.readFileSync(new URL('../assets/public-resilience.js',import.meta.url),'utf8');
const release=JSON.parse(fs.readFileSync(new URL('../release.json',import.meta.url),'utf8'));
const build=String(release.build);
let passed=0;
const ok=(value,label)=>{assert.ok(value,label);passed++};

assert.equal(manifest.start_url,'/admin/bronuvannia/'); passed++;
assert.equal(manifest.scope,'/admin/'); passed++;
assert.equal(manifest.id,'/admin/'); passed++;
assert.equal(manifest.display,'standalone'); passed++;
ok(manifest.display_override?.includes('standalone'),'manifest keeps standalone override');
ok(html.includes('viewport-fit=cover'),'admin viewport includes safe areas');
ok(html.includes('user-scalable=no')&&html.includes('maximum-scale=1'),'admin viewport intentionally keeps the mobile UI at a fixed scale');
ok(html.includes('apple-mobile-web-app-status-bar-style\" content=\"black\"')&&!html.includes('black-translucent'),'Apple PWA uses opaque black status-bar mode; black-translucent is rejected');
ok(html.includes('apple-mobile-web-app-title'),'Apple PWA title exists');

ok(sw.includes(`const CACHE='vacleaner-manager-${build}'`),'service-worker cache matches build');
ok(sw.includes("event.data?.type==='SKIP_WAITING'"),'worker supports controlled activation');
ok(!/addEventListener\('install'[\s\S]{0,260}skipWaiting/.test(sw),'install never silently activates a new worker');
ok(sw.includes("caches.match(FALLBACK)"),'navigation has offline shell fallback');
ok(sw.includes("existing.navigate(target.href)"),'push navigates an existing PWA window');
ok(sw.includes("VACLEANER_OPEN_BOOKING"),'push passes booking deep-link message');
ok(sw.includes("target.searchParams.set('booking'"),'push URL carries booking id');

ok(sw.includes("'/admin/icon-192.png'")&&sw.includes("'/admin/icon-512.png'")&&!sw.includes("'/icon-192.png'"),'admin service worker caches only admin PWA icons');
ok(sw.includes("icon:'/admin/icon-192.png'")&&sw.includes("badge:'/admin/icon-192.png'"),'push notifications use the admin icon');
ok(runtime.includes("icon:'/admin/icon-192.png',badge:'/admin/icon-192.png'"),'local admin notifications use the admin icon');

for(const token of [
  'showPwaUpdatePrompt','SKIP_WAITING','controllerchange','bookingIdFromUrl','queueBookingDeepLink','openPendingBooking','VACLEANER_OPEN_BOOKING','visualViewport',"classList.toggle('keyboard-open',keyboard)","let pwaKeyboardLatched=false","const keyboard=Boolean(reduced&&(focused||pwaKeyboardLatched))",
]) ok(runtime.includes(token),`PWA runtime token: ${token}`);
ok(!runtime.includes("visualViewport?.addEventListener('scroll'"),'visual viewport scroll cannot move shell');
ok(runtime.includes('focused=document.activeElement instanceof HTMLElement'),'keyboard viewport mode requires an actually focused editable control');
ok(runtime.includes(`navigator.serviceWorker.register('/admin/sw.js?v=${build}'`),'service-worker registration matches build');
ok(runtime.includes("requestAnimationFrame(()=>openDetail(b))"),'deep-link opens booking after render');
ok(runtime.includes('function modal(html,options={}){'),'modal shell helper exists with optional return context');
ok(runtime.includes("$('.mobile-more-close')||$('.modal-close')"),'Escape closes mobile More sheet cleanly');
ok(runtime.includes('data-mobile-logout'),'mobile More contains the logout action');
ok(runtime.includes("/auth/v1/logout?scope=local"),'PWA logout is isolated to the current device session');
ok(runtime.includes("const logout=$('.top-logout');if(logout)logout.onclick=()=>logoutCurrentDevice(logout)"),'desktop logout uses the same server-revoking flow as mobile logout');
ok(css.includes('.mobile-more-logout{width:100%'),'mobile logout has an explicit contained visual contract');
ok(runtime.includes("state.listScroll=$('.main')?.scrollTop||0"),'detail captures main scroll container');
ok(runtime.includes('void main.offsetHeight;main.scrollTop=restoreTop'),'detail restores list position after layout');

ok(runtime.includes('const LIVE_BOOKING_SYNC_MS=15000'),'operational bookings/expenses auto-refresh every 15 seconds');
ok(runtime.includes('async function refreshAllData({notify=true}={})')&&runtime.includes('window.VACLEANER_REFRESH_DATA=()=>refreshAllData({notify:true})'),'runtime exposes an explicit full manual data refresh');
ok(runtime.includes("invokeData({action:'clients'})")&&runtime.includes("invokeData({action:'campaigns'})"),'full refresh includes clients and campaigns, not only bookings');
ok(nativeRuntime.includes("className='native-data-refresh'")&&nativeRuntime.includes("Автоматично кожні 15 с"),'mobile More exposes the manual refresh control and explains auto-refresh');
ok(nativeCss.includes('v4.3.3 — manual full data refresh')&&nativeCss.includes('.native-data-refresh'),'manual refresh has an explicit contained mobile visual contract');
ok(runtime.includes('function syncDisplayMode()')&&runtime.includes('pwa-standalone'),'standalone PWA is detected separately from Safari');
ok(runtime.includes('lockStandaloneZoom')&&runtime.includes("e.touches?.length>1"),'standalone PWA intentionally blocks pinch zoom to keep the manager UI static');
ok(runtime.includes('booking-client-link')&&runtime.includes('openBookingClient'),'booking client block opens the client card');
ok(runtime.includes('upcoming-client-info')&&!runtime.includes('upcoming-client-link\" data-client-card'),'upcoming keeps customer identity informational while phone remains actionable');
ok(css.includes('.upcoming-client-info{display:flex;flex-direction:column;align-items:flex-start'),'upcoming phone is structurally placed below the customer name');
ok(!runtime.includes('mobile-booking-search-collapsed')&&!css.includes('.app.mobile-booking-search-collapsed'),'booking search never changes shell geometry while mobile list scrolls');
ok(!runtime.includes('syncMobileBookingSearch')&&!runtime.includes('scrollTop>72'),'booking search has no scroll-driven hide threshold on iPhone');
ok(css.includes('v3.0.75 — keep booking search geometry stable on iOS'),'mobile contract documents the stable booking-search shell');
ok(html.includes('<div id="adminMount"></div><nav class="mobile-nav"'),'mobile navigation exists in initial HTML before JS paint, matching VA HOME');
ok(!runtime.includes('<nav class="mobile-nav"'),'runtime never recreates the static mobile navigation');
ok(css.includes('.sidebar{display:none}'),'desktop sidebar is hidden rather than transformed on mobile');
ok(css.includes('.mobile-nav{\n    position:fixed;z-index:100;right:0;bottom:0;left:0'),'dedicated mobile navigation is fixed directly to the viewport');
ok(css.includes('.app{position:static;inset:auto;width:100%'),'mobile app wrapper is not a fixed ancestor of bottom navigation');
ok(css.includes('.main{\n    position:fixed;top:calc(var(--mobile-topbar) + var(--pwa-safe-top))'),'mobile main is independently fixed like VA HOME');
ok(!css.includes('grid-template-rows:calc(var(--mobile-topbar) + var(--pwa-safe-top)) minmax(0,1fr) var(--mobile-nav-shell)'),'standalone PWA does not override the proven fixed mobile nav contract');
ok(runtime.includes('client-mobile-stats')&&css.includes('.client-mobile-stats'),'mobile client cards expose rental count and spend');
ok(runtime.includes('const LIVE_BOOKING_SYNC_MS=15000'),'admin live data sync polls every 15 seconds');
ok(runtime.includes("document.addEventListener('visibilitychange',syncNow)")&&runtime.includes("window.addEventListener('focus',syncNow)")&&runtime.includes("window.addEventListener('pageshow',syncNow)"),'admin refreshes live data when the app becomes active again');
ok(runtime.includes('window.VACLEANER_REFRESH_DATA=()=>refreshAllData({notify:true})'),'manual full-data refresh hook is exposed for the native mobile layer');
ok(nativeRuntime.includes("className='native-data-refresh'")&&nativeRuntime.includes('Оновити дані')&&nativeRuntime.includes('Автоматично кожні 15 с'),'mobile More exposes an explicit data refresh action with truthful auto-sync copy');
ok(nativeCss.includes('v4.3.3 — explicit manual data refresh in mobile More')&&nativeCss.includes('.native-data-refresh'),'manual data refresh has a production mobile visual contract');

ok(runtime.includes('booking-finance-expenses')&&runtime.includes('Разом витрати')&&runtime.includes('booking-finance-received-summary')&&runtime.includes('<span>Отримано</span><strong>'),'booking cards explain expenses and received totals instead of showing an ambiguous finance amount');
ok(runtime.includes('finance-flow-received')&&runtime.includes('finance-flow-expenses')&&runtime.includes('<small>Підсумок</small>')&&runtime.includes('До повернення клієнту'),'preliminary settlement is grouped into received, deducted and explicit final result');
ok(!runtime.includes('Попередній взаєморозрахунок при поверненні'),'preliminary finance modal no longer renders a second duplicated settlement result');
ok(nativeCss.includes('v4.3.4 — finance clarity + one-scroll SMS audience workflow')&&nativeCss.includes('.finance-flow-final')&&nativeCss.includes('.sms-recipient-step.active'),'v4.3.4 mobile finance and SMS scroll contract is present');
ok(nativeCss.includes('v4.3.5 — finance summary cleanup')&&nativeCss.includes('grid-row:2!important')&&nativeCss.includes('grid-row:3!important'),'v4.3.5 locks booking finance rows against overlap');
ok(nativeCss.includes('overflow:visible!important')&&nativeCss.includes('SMS recipients: Audience controls, counters and clients move as one scroll surface'),'mobile SMS audience removes nested list scrolling');


for(const token of [
  '--pwa-safe-top','--pwa-safe-bottom','--mobile-topbar:64px','--mobile-nav:66px',
  '.app{position:static;inset:auto;width:100%',
  '--mobile-nav-shell:calc(var(--mobile-nav) + var(--pwa-safe-bottom))',
  '.pwa-update-prompt','--keyboard-viewport-height','--keyboard-viewport-top',
]) ok(css.includes(token),`PWA visual token: ${token}`);
ok(!css.includes('.app{position:fixed;inset:0;width:100%;height:100dvh'),'app shell avoids iOS standalone 100dvh bottom gaps');
ok(!css.includes('--pwa-viewport-height'),'legacy app-shell viewport variable is gone');
ok(!css.includes('--pwa-viewport-top'),'legacy app-shell viewport top variable is gone');


ok(rootRetireSw.includes('VACLEANER_ROOT_SW_RETIRE'),'legacy root worker is retirement-only');
ok(rootRetireSw.includes('self.registration.unregister()'),'legacy root worker unregisters itself');
ok(!rootRetireSw.includes('caches.open'),'root worker never adds a public cache');
ok(publicResilience.includes('reg.scope===ROOT_SCOPE'),'public runtime targets only root-scope legacy workers');
ok(publicResilience.includes('reg.unregister()'),'public runtime removes stale root workers');


ok(!css.includes('html.pwa-standalone .mobile-nav{position:relative'),'installed PWA has no standalone grid override for bottom navigation');
ok(css.includes('--pwa-safe-bottom:env(safe-area-inset-bottom,0px)')&&!css.includes('--pwa-safe-bottom-raw'),'native iOS safe-area is used without the failed v3.0.54 clamp');
ok(!css.includes('.app{position:fixed}\n  .topbar,.main{position:absolute}'),'stale v3.0.36 fixed-ancestor override is gone');
ok(runtime.includes("document.documentElement.classList.add('pwa-update-transition')"),'PWA update hides the outgoing mobile chrome before controller reload');
ok(runtime.includes('PWA_UPDATE_FALLBACK_MS=8000'),'PWA update has a bounded iOS fallback instead of an endless loading state');
ok(runtime.includes("worker.state==='activated'"),'PWA update reloads when the waiting worker activates even if controllerchange is missed');
ok(runtime.includes('window.setTimeout(reloadPwaAfterUpdate,PWA_UPDATE_FALLBACK_MS)'),'PWA update forces a recovery reload after the activation timeout');
ok(runtime.includes('later.disabled=true;now.disabled=true'),'PWA update prevents duplicate activation taps');
console.log(`PWA static tests passed ${passed} assertions.`);
