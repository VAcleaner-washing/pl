import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('staging/ui/boundary.js', 'utf8');
const config = JSON.parse(fs.readFileSync('staging/hosted-r4-client.json', 'utf8'));
const origin = 'https://stage.test';
const endpoint = `${config.origin}/functions/v1/${config.functions[0]}`;
const deferred = () => {let resolve; const promise = new Promise(yes => {resolve = yes;}); return {promise, resolve};};
let passed = 0;
async function check(name, run) {await run(); passed++; console.log('PASS:', name);}
function harness(initial = 'offline', overrides = {}) {
  let policy = initial, gate = null;
  const calls = [], events = [];
  const storage = {length: 0, key() {return null;}, getItem() {return null;}, setItem() {}, removeItem() {}};
  const window = {
    VA_STAGE_CONFIG: {...config, ...overrides}, localStorage: storage, sessionStorage: storage, open() {},
    dispatchEvent(event) {events.push({name: event.type, ...event.detail});},
    async fetch(input, options) {
      const url = String(input); calls.push({url, options});
      if (url.endsWith('/auth/v1/settings')) {
        if (gate) await gate.promise;
        if (policy === 'offline') throw new TypeError('network offline');
        if (policy === 'http-error') return new Response('{}', {status: 503});
        if (policy === 'malformed') return new Response('invalid json');
        return new Response(JSON.stringify({disable_signup: policy}));
      }
      return new Response(JSON.stringify({ok: true}));
    },
  };
  const document = {documentElement: {dataset: {}}, addEventListener() {}};
  class TestCustomEvent {constructor(type, options) {this.type = type; this.detail = options.detail;}}
  vm.runInNewContext(source, {window, document, URL, Response, CustomEvent: TestCustomEvent,
    location: {origin, href: origin + '/r4/admin/bronuvannia/'}, alert() {}});
  return {window, calls, events, set policy(value) {policy = value;}, set gate(value) {gate = value;},
    settings: () => calls.filter(call => call.url.endsWith('/auth/v1/settings')),
    business: () => calls.filter(call => call.url.includes('/functions/v1/')),
    request: () => window.fetch(endpoint, {method: 'POST', body: '{}'}),
  };
}

await check('an offline launch recovers on a later request after the network returns', async () => {
  const h = harness();
  await assert.rejects(h.window.VA_STAGE.readiness, /network offline/);
  assert.equal(h.business().length, 0);
  h.policy = true;
  assert.equal((await h.request()).status, 200);
  assert.equal(h.settings().length, 2);
  assert.equal(h.business().length, 1);
  assert.deepEqual(h.events.map(event => event.ready), [false, true]);
  assert.equal(await h.window.VA_STAGE.readiness, true);
});

await check('overlapping initial and retry requests share their policy check', async () => {
  const h = harness(false), firstGate = deferred();
  h.gate = firstGate;
  const first = Promise.allSettled(Array.from({length: 6}, h.request));
  await Promise.resolve();
  assert.equal(h.settings().length, 1);
  assert.equal(h.business().length, 0);
  firstGate.resolve();
  assert((await first).every(result => result.status === 'rejected'));
  assert.equal(h.business().length, 0);
  const secondGate = deferred(); h.gate = secondGate; h.policy = true;
  const second = Promise.all(Array.from({length: 6}, h.request));
  await Promise.resolve();
  assert.equal(h.settings().length, 2);
  assert.equal(h.business().length, 0);
  secondGate.resolve();
  assert((await second).every(result => result.status === 200));
  assert.equal(h.business().length, 6);
});

for (const policy of [false, undefined, 'true', 'http-error', 'malformed', 'offline']) {
  await check(`failed or nonboolean policy stays closed across retries: ${String(policy)}`, async () => {
    const h = harness(); h.policy = policy;
    await assert.rejects(h.window.VA_STAGE.readiness);
    await assert.rejects(h.request(), /тестовий вхід закрито/);
    assert.equal(h.settings().length, 2);
    assert.equal(h.business().length, 0);
    h.policy = true;
    assert.equal((await h.request()).status, 200);
    assert.equal(h.settings().length, 3);
  });
}

await check('blocked destinations and integration calls cannot trigger a retry or reach the network', async () => {
  const h = harness(); await assert.rejects(h.window.VA_STAGE.readiness);
  const urls = [
    'https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-admin-bookings-v4',
    `${config.origin}/functions/v1/vacleaner-sms-v2`, `${config.origin}/auth/v1/signup`,
    `${config.origin}/rest/v1/vacleaner_bookings`, 'https://example.invalid/dispatch', origin + '/admin/bronuvannia/',
  ];
  for (const url of urls) {
    const response = await h.window.fetch(url, {method: 'POST'});
    assert.equal(response.status, 503); assert.equal((await response.json()).delivered, false);
  }
  assert.equal(h.calls.length, 1);
});

await check('policy checks use no-store and reject redirects; success avoids redundant settings fetches', async () => {
  const h = harness(true); await h.window.VA_STAGE.readiness;
  await h.request(); await h.request();
  assert.equal(h.settings().length, 1);
  const settings = h.settings()[0];
  assert.equal(settings.url, config.origin + '/auth/v1/settings');
  assert.equal(settings.options.cache, 'no-store');
  assert.equal(settings.options.redirect, 'error');
  assert.equal(settings.options.headers.apikey, config.publicKey);
  assert.deepEqual(h.events.map(event => event.ready), [true]);
});

await check('production target is rejected synchronously before any fetch', async () => {
  assert.throws(() => harness(true, {projectRef: 'yweluzclearwrazdkahu',
    origin: 'https://yweluzclearwrazdkahu.supabase.co'}), /STAGING_TARGET_MISMATCH/);
});

await check('a launch failure without a readiness subscriber produces no unhandled rejection', async () => {
  const rejections = [];
  const listener = reason => rejections.push(reason);
  process.on('unhandledRejection', listener);
  try {
    harness('offline');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(rejections, []);
  } finally {process.off('unhandledRejection', listener);}
});

console.log(JSON.stringify({mode: 'r4-readiness-network-recovery', passed}));
