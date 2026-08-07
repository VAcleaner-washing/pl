import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../admin/sw.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../admin/bronuvannia/index.html',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../admin/manifest.webmanifest',import.meta.url),'utf8'));
const release=JSON.parse(fs.readFileSync(new URL('../release.json',import.meta.url),'utf8'));
const build=String(release.build);

assert.equal(manifest.start_url,'/admin/bronuvannia/');
assert.equal(manifest.scope,'/admin/');
assert.equal(manifest.id,'/admin/');
assert.equal(manifest.display,'standalone');
assert.ok(manifest.display_override?.includes('standalone'));
assert.ok(html.includes('viewport-fit=cover'));
assert.ok(html.includes('apple-mobile-web-app-status-bar-style'));
assert.ok(html.includes('apple-mobile-web-app-title'));

assert.ok(sw.includes(`const CACHE='vacleaner-manager-${build}'`));
assert.ok(sw.includes("event.data?.type==='SKIP_WAITING'"));
assert.ok(!/addEventListener\('install'[\s\S]{0,260}skipWaiting/.test(sw),'install must not activate a new worker silently');
assert.ok(sw.includes("caches.match(FALLBACK)"),'navigation must have an offline fallback');
assert.ok(sw.includes("existing.navigate(target.href)"),'push must navigate an existing PWA window');
assert.ok(sw.includes("VACLEANER_OPEN_BOOKING"),'push must pass a booking deep link to the client');
assert.ok(sw.includes("target.searchParams.set('booking'"),'push URL must carry booking id');

for(const token of [
  "showPwaUpdatePrompt",
  "SKIP_WAITING",
  "controllerchange",
  "bookingIdFromUrl",
  "queueBookingDeepLink",
  "openPendingBooking",
  "VACLEANER_OPEN_BOOKING",
  "--pwa-viewport-height",
  "visualViewport",
]) assert.ok(runtime.includes(token),`PWA runtime token missing: ${token}`);
assert.ok(runtime.includes(`navigator.serviceWorker.register('/admin/sw.js?v=${build}'`));
assert.ok(runtime.includes("requestAnimationFrame(()=>openDetail(b))"));

assert.ok(runtime.includes('function modal(html){'),'modal shell helper must exist');
assert.ok(runtime.includes("$('.mobile-more-close')||$('.modal-close')"),'Escape must close the mobile More sheet cleanly');
assert.ok(runtime.includes("state.listScroll=$('.main')?.scrollTop||0"),'detail view must capture the PWA scroll container');
assert.ok(runtime.includes('void main.offsetHeight;main.scrollTop=restoreTop'),'detail view must restore the list after layout');

for(const token of [
  '--pwa-safe-top',
  '--pwa-safe-bottom',
  'calc(64px + var(--pwa-safe-top))',
  'calc(72px + var(--pwa-safe-bottom))',
  '.pwa-update-prompt',
  'var(--pwa-viewport-height,100dvh)',
]) assert.ok(css.includes(token),`PWA visual token missing: ${token}`);

console.log('PWA static tests passed: controlled update, deep link, safe areas and offline fallback.');
