import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const admin=read('assets/admin-v250.js');
const css=read('assets/admin-v250.css');
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const pkg=JSON.parse(read('package.json'));
const rel=JSON.parse(read('release.json'));
const has=(source,token,message)=>assert.ok(source.includes(token),message);
const lacks=(source,token,message)=>assert.ok(!source.includes(token),message);

assert.equal(pkg.version,'4.2.28','package version must be v4.2.28');
assert.equal(rel.version,'4.2.28','release version must be v4.2.28');
assert.equal(Number(rel.build),4228,'release build must be 4228');
has(spec,'REF-009 — referral modal communication UX','System Spec must define the referral modal communication UX contract');
has(spec,'Change record — v4.2.28','System Spec must include the v4.2.28 change record');

has(admin,'function referralCurrentContactProfile(phone,source={},backendProfile={})','referral modal must reconcile current CRM contact data');
has(admin,"const live=(state.customers||[]).find(item=>normalizePhone(item?.phone)===phone)||{}",'current customer directory profile must outrank stale booking data');
has(admin,"const instagram=pick(live.instagram,backendProfile?.instagram,source?.customer_instagram,source?.instagram)",'Instagram must be read from the current customer profile before fallbacks');
has(admin,"const primaryChannel=sendChannels.find(row=>row.preferred)?.label||sendChannels[0]?.label||''",'preferred contact must drive the primary referral CTA');
has(admin,'Основний канал — ${primaryChannel}','modal must explain the primary contact channel when more than one exists');
has(admin,'class="referral-message-card"','referral message must be rendered as an always-visible card');
lacks(admin,'<details class="referral-message-details" open>','referral message must not be hidden in a details control');

has(css,'.modal-card:has(.referral-share-modal){width:min(860px','referral dialog parent must shrink to the referral content width');
has(css,'.referral-share-modal{width:100%;height:100%;max-height:none}','referral form must fill the dialog without a dead right column');
has(css,'.referral-message-card{overflow:hidden','always-visible message card styling must exist');
has(css,'.referral-message-card .referral-message-preview{margin:0','message preview must use the full message card width');

console.log('v4.2.28 REFERRAL MODAL contracts: PASS');
