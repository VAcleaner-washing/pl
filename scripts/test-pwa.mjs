import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../admin/sw.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../admin/bronuvannia/index.html',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../admin/manifest.webmanifest',import.meta.url),'utf8'));
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
ok(html.includes('apple-mobile-web-app-status-bar-style'),'Apple status-bar metadata exists');
ok(html.includes('apple-mobile-web-app-title'),'Apple PWA title exists');

ok(sw.includes(`const CACHE='vacleaner-manager-${build}'`),'service-worker cache matches build');
ok(sw.includes("event.data?.type==='SKIP_WAITING'"),'worker supports controlled activation');
ok(!/addEventListener\('install'[\s\S]{0,260}skipWaiting/.test(sw),'install never silently activates a new worker');
ok(sw.includes("caches.match(FALLBACK)"),'navigation has offline shell fallback');
ok(sw.includes("existing.navigate(target.href)"),'push navigates an existing PWA window');
ok(sw.includes("VACLEANER_OPEN_BOOKING"),'push passes booking deep-link message');
ok(sw.includes("target.searchParams.set('booking'"),'push URL carries booking id');

for(const token of [
  'showPwaUpdatePrompt','SKIP_WAITING','controllerchange','bookingIdFromUrl','queueBookingDeepLink','openPendingBooking','VACLEANER_OPEN_BOOKING','visualViewport',"classList.toggle('keyboard-open',keyboard)",
]) ok(runtime.includes(token),`PWA runtime token: ${token}`);
ok(!runtime.includes("visualViewport?.addEventListener('scroll'"),'visual viewport scroll cannot move shell');
ok(runtime.includes(`navigator.serviceWorker.register('/admin/sw.js?v=${build}'`),'service-worker registration matches build');
ok(runtime.includes("requestAnimationFrame(()=>openDetail(b))"),'deep-link opens booking after render');
ok(runtime.includes('function modal(html){'),'modal shell helper exists');
ok(runtime.includes("$('.mobile-more-close')||$('.modal-close')"),'Escape closes mobile More sheet cleanly');
ok(runtime.includes("state.listScroll=$('.main')?.scrollTop||0"),'detail captures main scroll container');
ok(runtime.includes('void main.offsetHeight;main.scrollTop=restoreTop'),'detail restores list position after layout');

for(const token of [
  '--pwa-safe-top','--pwa-safe-bottom','--mobile-topbar:64px','--mobile-nav:62px',
  '.app{position:fixed;inset:0;width:100%;height:100dvh',
  'bottom:calc(var(--mobile-nav) + var(--pwa-safe-bottom))',
  '.pwa-update-prompt','--keyboard-viewport-height','--keyboard-viewport-top',
]) ok(css.includes(token),`PWA visual token: ${token}`);
ok(!css.includes('--pwa-viewport-height'),'legacy app-shell viewport variable is gone');
ok(!css.includes('--pwa-viewport-top'),'legacy app-shell viewport top variable is gone');

console.log(`PWA static tests passed ${passed} assertions.`);
