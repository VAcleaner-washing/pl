import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real worker readiness predicate with a deterministic lifecycle.
// No production code or browser timeout is modified by this regression fixture.
const source = fs.readFileSync('scripts/pwa_cache_qa.py', 'utf8');
const match = /WORKER_MONITOR_JS = r'''([\s\S]*?)'''/.exec(source);
assert.ok(match, 'worker monitor fixture must find its implementation');
const worker = state => ({scriptURL: 'http://localhost/admin/sw.js?v=4367', state});
const active = worker('activating');
const cacheUrls = Array.from({length: 35}, (_, i) => 'http://localhost/assets/asset' + i + '?v=4367');
const frames = [];
const registration = {scope: 'http://localhost/admin/', active, installing: null, waiting: null};
const context = {
  window: {}, location: {origin: 'http://localhost'}, URL,
  navigator: {serviceWorker: {controller: active, getRegistration: async () => registration}},
  caches: {keys: async () => ['vacleaner-manager-4367'], open: async () => ({match: async url => cacheUrls.includes(url)})},
  document: {querySelectorAll: () => cacheUrls.map(src => ({src}))},
  requestAnimationFrame: cb => {frames.push(cb); return frames.length;},
  cancelAnimationFrame: () => {},
};
vm.runInNewContext('(' + match[1] + ')', context)({phase: 'ready', build: 4367});
const settle = async () => {for (let i=0; i<8; i++) await Promise.resolve();};
await settle();
assert.equal(context.window.__vacPwaWorkerMonitor.ready, false, 'activating is not activated');
assert.ok(frames.length, 'monitor must retry a transitional worker state');
active.state = 'activated';
frames.shift()();
await settle();
assert.equal(context.window.__vacPwaWorkerMonitor.ready, true, 'eventual activation is accepted');
console.log('Worker activation lifecycle regression fixture passed');
