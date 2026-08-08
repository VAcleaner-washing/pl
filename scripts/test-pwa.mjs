import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../admin/sw.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');
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
ok(html.includes('maximum-scale=1,user-scalable=no'),'admin viewport blocks accidental page zoom');
ok(html.includes('apple-mobile-web-app-status-bar-style\" content=\"black\"')&&!html.includes('black-translucent'),'Apple PWA uses opaque black status-bar mode; black-translucent is rejected');
ok(html.includes('apple-mobile-web-app-title'),'Apple PWA title exists');

ok(sw.includes(`const CACHE='vacleaner-manager-${build}'`),'service-worker cache matches build');
ok(sw.includes("event.data?.type==='SKIP_WAITING'"),'worker supports controlled activation');
ok(!/addEventListener\('install'[\s\S]{0,260}skipWaiting/.test(sw),'install never silently activates a new worker');
ok(sw.includes("caches.match(FALLBACK)"),'navigation has offline shell fallback');
ok(sw.includes("existing.navigate(target.href)"),'push navigates an existing PWA window');
ok(sw.includes("VACLEANER_OPEN_BOOKING"),'push passes booking deep-link message');
ok(sw.includes("target.searchParams.set('booking'"),'push URL carries booking id');

for(const token of [
  'showPwaUpdatePrompt','SKIP_WAITING','controllerchange','bookingIdFromUrl','queueBookingDeepLink','openPendingBooking','VACLEANER_OPEN_BOOKING','visualViewport',"classList.toggle('keyboard-open',keyboard)","let pwaKeyboardLatched=false","const keyboard=Boolean(reduced&&(focused||pwaKeyboardLatched))",
]) ok(runtime.includes(token),`PWA runtime token: ${token}`);
ok(!runtime.includes("visualViewport?.addEventListener('scroll'"),'visual viewport scroll cannot move shell');
ok(runtime.includes('focused=document.activeElement instanceof HTMLElement'),'keyboard viewport mode requires an actually focused editable control');
ok(runtime.includes(`navigator.serviceWorker.register('/admin/sw.js?v=${build}'`),'service-worker registration matches build');
ok(runtime.includes("requestAnimationFrame(()=>openDetail(b))"),'deep-link opens booking after render');
ok(runtime.includes('function modal(html){'),'modal shell helper exists');
ok(runtime.includes("$('.mobile-more-close')||$('.modal-close')"),'Escape closes mobile More sheet cleanly');
ok(runtime.includes("state.listScroll=$('.main')?.scrollTop||0"),'detail captures main scroll container');
ok(runtime.includes('void main.offsetHeight;main.scrollTop=restoreTop'),'detail restores list position after layout');

ok(runtime.includes('function syncDisplayMode()')&&runtime.includes('pwa-standalone'),'standalone PWA is detected separately from Safari');
ok(runtime.includes('function lockStandaloneZoom()')&&runtime.includes("e.touches?.length>1"),'standalone PWA blocks pinch zoom without changing public pages');
ok(runtime.includes('data-client-card')&&runtime.includes('openBookingClient'),'booking and upcoming client blocks open the client card');
ok(runtime.includes('mobile-booking-search-collapsed')&&css.includes('.app.mobile-booking-search-collapsed .topbar'),'booking search collapses while mobile list scrolls');
ok(html.includes('<div id="adminMount"></div><nav class="mobile-nav"'),'mobile navigation exists in initial HTML before JS paint, matching VA HOME');
ok(!runtime.includes('<nav class="mobile-nav"'),'runtime never recreates the static mobile navigation');
ok(css.includes('.sidebar{display:none}'),'desktop sidebar is hidden rather than transformed on mobile');
ok(css.includes('.mobile-nav{\n    position:fixed;z-index:100;right:0;bottom:0;left:0'),'dedicated mobile navigation is fixed directly to the viewport');
ok(css.includes('.app{position:static;inset:auto;width:100%'),'mobile app wrapper is not a fixed ancestor of bottom navigation');
ok(css.includes('.main{\n    position:fixed;top:calc(var(--mobile-topbar) + var(--pwa-safe-top))'),'mobile main is independently fixed like VA HOME');
ok(!css.includes('grid-template-rows:calc(var(--mobile-topbar) + var(--pwa-safe-top)) minmax(0,1fr) var(--mobile-nav-shell)'),'standalone PWA does not override the proven fixed mobile nav contract');
ok(runtime.includes('client-mobile-stats')&&css.includes('.client-mobile-stats'),'mobile client cards expose rental count and spend');

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
console.log(`PWA static tests passed ${passed} assertions.`);
