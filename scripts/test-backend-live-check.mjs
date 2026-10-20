import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compareBackendSnapshot} from './check-backend-live.mjs';

const slug='vacleaner-admin-bookings-v4';
const files=['index.ts','config.ts','settlement.mjs','pricing.mjs','referral.ts'].map(name=>({name,content:fs.readFileSync(`supabase/functions/${slug}/${name}`,'utf8')}));
const snapshot={projectRef:'yweluzclearwrazdkahu',capturedAt:new Date().toISOString(),functions:[{slug,status:'ACTIVE',verify_jwt:false,files}]};
assert.deepEqual(compareBackendSnapshot(snapshot),[]);
const changed=structuredClone(snapshot);changed.functions[0].files.find(x=>x.name==='index.ts').content+='\n// different deployment';
assert.ok(compareBackendSnapshot(changed).some(x=>x.includes('index.ts: source hash differs')));
const missing=structuredClone(snapshot);missing.functions[0].files=files.filter(x=>x.name!=='settlement.mjs');
assert.ok(compareBackendSnapshot(missing).some(x=>x.includes('settlement.mjs: live file missing')));
const dependent=structuredClone(snapshot);dependent.functions[0].files.find(x=>x.name==='pricing.mjs').content+='\n// stale dependency';
assert.ok(compareBackendSnapshot(dependent).some(x=>x.includes('pricing.mjs: source hash differs')));
const wrongProject=structuredClone(snapshot);wrongProject.projectRef='different';assert.ok(compareBackendSnapshot(wrongProject).includes('wrong Supabase project'));
const wrongJwt=structuredClone(snapshot);wrongJwt.functions[0].verify_jwt=true;assert.ok(compareBackendSnapshot(wrongJwt).some(x=>x.includes('JWT')));
const stale=structuredClone(snapshot);stale.capturedAt='2000-01-01T00:00:00Z';assert.ok(compareBackendSnapshot(stale).some(x=>x.includes('not fresh')));
console.log('PASS backend drift verification: match, source drift, missing dependency, dependency drift, wrong project, JWT drift, stale snapshot');
