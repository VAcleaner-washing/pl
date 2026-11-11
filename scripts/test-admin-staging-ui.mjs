import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const root = process.cwd();
const target = path.join(root, 'staging-ui-test-results/dist');
const built = spawnSync(process.execPath, ['scripts/build-admin-staging-ui.mjs'], {encoding: 'utf8'});
assert.equal(built.status, 0, built.stderr);
const config = JSON.parse(fs.readFileSync('staging/hosted-r4-client.json', 'utf8'));
const boundary = fs.readFileSync('staging/ui/boundary.js', 'utf8');
let passed = 0;
const check = (name, fn) => {fn(); passed++; console.log('PASS:', name);};
class MemoryStorage {
  entries = new Map();
  getItem(key) { return this.entries.get(String(key)) ?? null; }
  setItem(key, value) { this.entries.set(String(key), String(value)); }
  removeItem(key) { this.entries.delete(String(key)); }
  key(index) { return [...this.entries.keys()][index] ?? null; }
  get length() { return this.entries.size; }
}
function install(policy = true, overrides = {}) {
  const calls = [], local = new MemoryStorage(), session = new MemoryStorage();
  const window = {VA_STAGE_CONFIG: {...config, ...overrides}, localStorage: local, sessionStorage: session,
    open: () => null, fetch: async (input, options) => {
      calls.push({url: typeof input === 'string' ? input : input.url, options});
      return new Response(JSON.stringify(String(input).includes('/auth/v1/settings') ? {disable_signup: policy} : {ok: true}), {status: 200});
    }};
  const document = {documentElement: {dataset: {}}, addEventListener() {}};
  vm.runInNewContext(boundary, {window, document, location: {origin: 'https://stage.test', href: 'https://stage.test/r4/admin/bronuvannia/'},
    URL, Response, console, alert() {}});
  return {window, document, calls, local, session};
}
check('production project refused before the first fetch', () => assert.throws(() => install(true,
  {projectRef: 'yweluzclearwrazdkahu', origin: 'https://yweluzclearwrazdkahu.supabase.co'}), /STAGING_TARGET_MISMATCH/));
const stage = install();
await stage.window.VA_STAGE.readiness;
check('hosted mode is explicitly staging', () => assert.equal(stage.document.documentElement.dataset.adminLab, 'staging'));
check('storage does not import LAB or production sessions', () => {
  stage.local.setItem('vacleaner_session', 'lab-session');
  stage.local.setItem('vacleaner_catalog', 'lab-catalog');
  assert.equal(stage.window.VA_STAGE_STORAGE.local.getItem('vacleaner_session'), null);
  stage.window.VA_STAGE_STORAGE.local.setItem('vacleaner_session', 'stage-session');
  assert.equal(stage.local.getItem('vacleaner_session'), 'lab-session');
  assert.equal(stage.window.VA_STAGE_STORAGE.local.getItem('vacleaner_session'), 'stage-session');
});
check('storage clear and enumeration are limited to exact stage prefix', () => {
  assert.equal(stage.window.VA_STAGE_STORAGE.local.length, 1);
  assert.equal(stage.window.VA_STAGE_STORAGE.local.key(0), 'vacleaner_session');
  stage.window.VA_STAGE_STORAGE.local.clear();
  assert.equal(stage.local.getItem('vacleaner_session'), 'lab-session');
  assert.equal(stage.local.getItem('vacleaner_catalog'), 'lab-catalog');
  assert.equal(stage.window.VA_STAGE_STORAGE.local.length, 0);
});
for (const name of config.functions) {
  const response = await stage.window.fetch(`${config.origin}/functions/v1/${name}`, {method: 'POST', body: '{}'});
  check(`canonical stage transport permitted: ${name}`, () => assert.equal(response.status, 200));
}
const previousCalls = stage.calls.length;
const blocked = [
  'https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-admin-bookings-v4',
  'https://example.invalid/sms', 'https://stage.test/admin/bronuvannia/',
  ...['vacleaner-push', 'vacleaner-sms-v2', 'vacleaner-reminders-v1', 'vacleaner-campaigns-v1', 'vacleaner-address-v1']
    .map(name => `${config.origin}/functions/v1/${name}`),
  ...['signup', 'invite', 'recover', 'admin/users', 'verify', 'settings'].map(name => `${config.origin}/auth/v1/${name}`),
  `${config.origin}/rest/v1/vacleaner_bookings`,
];
for (const url of blocked) {
  const response = await stage.window.fetch(url, {method: 'POST'});
  const body = await response.json();
  check(`blocked without network: ${new URL(url).hostname}${new URL(url).pathname}`, () => {
    assert.equal(response.status, 503); assert.equal(body.delivered, false); assert.equal(stage.calls.length, previousCalls);
  });
}
await stage.window.fetch(`${config.origin}/auth/v1/token?grant_type=password`, {method: 'POST', body: '{}'});
check('password login uses stage transport with redirects refused', () => assert.equal(stage.calls.at(-1).options.redirect, 'error'));
await stage.window.fetch(`${config.origin}/auth/v1/token?grant_type=refresh_token`, {method: 'POST', body: '{}'});
check('session refresh remains available', () => assert(stage.calls.at(-1).url.includes('refresh_token')));
const closed = install(false);
await assert.rejects(closed.window.VA_STAGE.readiness, /signup_policy_not_verified/);
await assert.rejects(closed.window.fetch(`${config.origin}/functions/v1/vacleaner-admin-bookings-v4`, {method: 'POST'}), /тестовий вхід закрито/);
check('unverified signup policy blocks requests before any business call', () => assert.equal(closed.calls.length, 1));
const read = rel => fs.readFileSync(path.join(target, rel), 'utf8');
const html = read('admin/bronuvannia/index.html');
check('network/storage boundary loads before canonical application scripts', () => {
  assert(html.indexOf('admin-staging-bootstrap.js') < html.indexOf('src="/r4/assets/vacleaner-core.js'));
  assert(html.includes(`connect-src 'self' ${config.origin}`));
  assert(!html.includes('admin-lab-bootstrap.js'));
});
check('R4 mobile constraints are release-addressed and retained by the offline shell', () => {
  const build=JSON.parse(fs.readFileSync('release.json','utf8')).build;
  assert(html.includes(`/r4/assets/admin-staging-mobile.css?v=${build}`));
  assert(read('admin/sw.js').includes(`/r4/assets/admin-staging-mobile.css?v=${build}`));
  assert(html.indexOf('admin-staging-mobile.css')>html.indexOf('admin-lab-forms.css'));
  assert(!/overflow-x:\s*hidden|user-scalable|maximum-scale/.test(read('assets/admin-staging-mobile.css')));
});
const runtime = read('assets/admin-v250.js');
check('generated runtime uses test accounts and all storage goes through the stage wrapper', () => {
  assert(runtime.includes('manager-a@vacleaner-r4.invalid')); assert(runtime.includes('Вхід у тестову R4'));
  assert(!/\b(?:localStorage|sessionStorage)\b/.test(runtime));
  assert(runtime.includes('vacleaner_website')); // business attribution labels are unchanged
  assert(!runtime.includes('.unregister()'));
});
check('manager B keeps the correct displayed actor for alias and direct synthetic email login', () => {
  const expression = runtime.match(/window\.VA_STAGE_STORAGE\.local\.setItem\(ADMIN_ALIAS_KEY,([^;]+)\);saveSession/)?.[1];
  assert(expression, 'Generated actor binding must exist');
  for (const [loginAlias, expected] of [['manager-a','vacleaner'], ['manager-b','annanevidoma'],
    ['manager-a@vacleaner-r4.invalid','vacleaner'], ['manager-b@vacleaner-r4.invalid','annanevidoma']]) {
    assert.equal(vm.runInNewContext(expression, {loginAlias}), expected);
  }
});
const sw = read('admin/sw.js');
check('service worker scope and cache eviction cannot touch LAB caches', () => {
  assert(sw.includes("url.pathname.startsWith('/r4/')"));
  assert(sw.includes("key.startsWith('vacleaner-stage-r4-')&&key!==CACHE"));
  assert(!sw.includes("addEventListener('push'"));
  assert(sw.includes('admin-staging-bootstrap.js') && sw.includes('admin-lab-forms.js'));
});
const manifest = JSON.parse(read('admin/manifest.webmanifest'));
check('installed stage identity and scope are separate', () => {
  assert.equal(manifest.id, '/r4/admin/staging/'); assert.equal(manifest.scope, '/r4/admin/');
  assert.equal(manifest.short_name, 'VA R4'); assert(manifest.start_url.startsWith('/r4/admin/'));
});
check('stage and Apple home-screen icons differ from production icons', () => {
  for (const rel of ['admin/icon-192.png', 'admin/icon-512.png', 'admin/apple-touch-icon.png']) {
    const icon = fs.readFileSync(path.join(target, rel));
    assert(icon.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
    assert(!icon.equals(fs.readFileSync(path.join(root, 'dist', rel))));
  }
});
check('presentation layer enables hosted mode without synthetic reset or fake responses', () => {
  assert(read('assets/admin-lab-ui.js').includes("const hosted=document.documentElement.dataset.adminLab==='staging'"));
  assert(read('assets/admin-lab-ui.js').includes('if(!hosted){'));
  assert(!read('assets/admin-staging-bootstrap.js').includes('window.VA_LAB='));
});
for (const [rel] of Object.entries(JSON.parse(fs.readFileSync('staging-ui-test-results/artifact.json', 'utf8')).hashes)) {
  if (/\.(?:js|html|json|webmanifest)$/.test(rel)) assert(!/yweluzclearwrazdkahu|vahome\.aroma@gmail\.com|sb_secret_/.test(read(rel)), rel);
}
console.log(JSON.stringify({mode: 'stage-ui-boundary-and-artifact', passed, connectedBrowser: 'not_run'}));
