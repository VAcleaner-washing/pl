import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {campaignConversionMetrics as metrics, campaignQueryCoverage as coverage}
  from '../supabase/functions/vacleaner-admin-data-v1/campaign-metrics.mjs';

let passed = 0;
const check = (name, fn) => {fn(); passed++; console.log('PASS:', name);};
const phone = '+380000006101', other = '+380000006102';
const campaign = {id: 'campaign', campaign_type: 'product', starts_at: '2026-11-01T00:00:00Z', ends_at: '2026-12-01T00:00:00Z'};
const code = {id: 'code', campaign_id: campaign.id, active: true,
  created_at: '2026-11-01T00:00:00Z', expires_at: '2026-12-01T00:00:00Z'};
const dispatch = {id: 'dispatch', campaign_id: campaign.id, sent_at: '2026-11-10T10:00:00Z'};
const recipient = {dispatch_id: dispatch.id, customer_phone: phone, status: 'delivered'};
const use = {id: 'use', campaign_id: campaign.id, promo_code_id: code.id, customer_phone: phone, created_at: '2026-11-11T12:00:00Z'};
const fixture = overrides => ({codes: [code], dispatches: [dispatch], recipients: [recipient], redemptions: [use], ...overrides});

check('one recipient with two redemptions is one converted customer, without a clamp', () => {
  const result = metrics(campaign, fixture({redemptions: [use, {...use, id: 'second'}]}));
  assert.equal(result.conversion, 100); assert.equal(result.conversionUses, 1);
  assert.equal(result.smsUsedCount, 2); assert.equal(result.conversionBase, 1);
});
check('two recipients and one converted phone is fifty percent', () => {
  const result = metrics(campaign, fixture({recipients: [recipient, {...recipient, customer_phone: other}]}));
  assert.equal(result.conversion, 50); assert.equal(result.smsRecipientCount, 2);
});
check('use before its SMS is never attributed to that later dispatch', () => {
  const result = metrics(campaign, fixture({redemptions: [{...use, created_at: '2026-11-09T12:00:00Z'}]}));
  assert.equal(result.conversion, 0); assert.equal(result.smsUsedCount, 0);
});
check('an earlier valid send can establish attribution despite a later resend', () => {
  const result = metrics(campaign, fixture({dispatches: [dispatch, {...dispatch, id: 'later', sent_at: '2026-11-20T00:00:00Z'}],
    recipients: [recipient, {...recipient, dispatch_id: 'later'}]}));
  assert.equal(result.conversion, 100); assert.equal(result.conversionBase, 1);
});
check('a dispatch to a different campaign cannot establish causal credit', () => {
  const result = metrics(campaign, fixture({dispatches: [{...dispatch, campaign_id: 'other'}]}));
  assert.equal(result.conversion, null); assert.equal(result.conversionBase, 0);
});
for (const status of ['queued', 'failed', 'not_delivered']) check('recipient status excluded: ' + status, () => {
  const result = metrics(campaign, fixture({recipients: [{...recipient, status}]}));
  assert.equal(result.conversion, null); assert.equal(result.conversionBase, 0);
  assert.equal(result.conversionReason, 'no_eligible_recipients');
});
for (const status of ['submitted', 'sent', 'delivered']) check('existing eligible status retained: ' + status, () => {
  assert.equal(metrics(campaign, fixture({recipients: [{...recipient, status}]})).conversion, 100);
});
check('provider accepted status does not claim delivery or activate any code', () => {
  const data = fixture({recipients: [{...recipient, status: 'submitted'}]});
  const before = JSON.stringify(data); const result = metrics(campaign, data);
  assert.equal(result.conversionBasis, 'sms'); assert.equal(result.conversionTimeBasis, 'dispatch_sent_at');
  assert.equal(JSON.stringify(data), before); assert.equal(code.active, true);
});
for (const sent_at of [null, 'invalid', '2026-11-10T10:00:00']) check('unknown send time does not fall back: ' + sent_at, () => {
  const result = metrics(campaign, fixture({dispatches: [{...dispatch, sent_at, created_at: dispatch.sent_at}],
    recipients: [{...recipient, created_at: dispatch.sent_at, updated_at: dispatch.sent_at}]}));
  assert.equal(result.conversion, null); assert.equal(result.conversionUses, 0);
  assert.equal(result.conversionComplete, false); assert.equal(result.conversionUnknownRecipients, 1);
});
check('missing use time produces unknown conversion, not fabricated zero', () => {
  const result = metrics(campaign, fixture({redemptions: [{...use, created_at: null}]}));
  assert.equal(result.conversion, null); assert.equal(result.conversionUnknownUses, 1);
});
check('failed or draft SMS attempts suppress the assigned-code fallback', () => {
  const result = metrics(campaign, fixture({codes: [{...code, customer_phone: phone}],
    dispatches: [{...dispatch, status: 'failed', sent_at: null}], recipients: []}));
  assert.equal(result.conversionBasis, 'sms'); assert.equal(result.conversion, null);
  assert.equal(result.conversionBase, 0);
});
check('assigned fallback counts distinct phones and retains inactive historical codes', () => {
  const result = metrics(campaign, fixture({dispatches: [], recipients: [], codes: [
    {...code, customer_phone: phone, active: false}, {...code, id: 'duplicate', customer_phone: phone},
    {...code, id: 'other', customer_phone: other}], redemptions: [use, {...use, id: 'repeat'}]}));
  assert.equal(result.conversionBasis, 'codes'); assert.equal(result.conversionBase, 2);
  assert.equal(result.conversionUses, 1); assert.equal(result.conversion, 50);
});
check('redemption before personal assignment is not converted', () => {
  const result = metrics(campaign, fixture({dispatches: [], recipients: [],
    codes: [{...code, customer_phone: phone, created_at: '2026-11-20T00:00:00Z'}]}));
  assert.equal(result.conversion, 0);
});
check('unknown assignment timestamp is incomplete, not an assumed activation', () => {
  const result = metrics(campaign, fixture({dispatches: [], recipients: [],
    codes: [{...code, customer_phone: phone, created_at: null}]}));
  assert.equal(result.conversion, null); assert.equal(result.conversionTimeBasis, 'code_created_at');
});
check('end boundary is exclusive and campaign start is inclusive', () => {
  const result = metrics(campaign, fixture({dispatches: [], recipients: [],
    codes: [{...code, customer_phone: phone}], redemptions: [{...use, created_at: campaign.ends_at}]}));
  assert.equal(result.conversion, 0);
});
check('RETURN can convert after issuance closes within actual extended campaign/code expiry', () => {
  const returning = {...campaign, campaign_type: 'return', issuance_ends_at: '2026-11-02T00:00:00Z'};
  const result = metrics(returning, fixture());
  assert.equal(result.conversion, 100);
});
check('RETURN actual campaign end is still a redemption bound', () => {
  const returning = {...campaign, campaign_type: 'return', ends_at: '2026-11-02T00:00:00Z'};
  assert.equal(metrics(returning, fixture()).conversion, 0);
});
check('redemption at the actual campaign start and send time is included', () => {
  const result = metrics(campaign, fixture({dispatches: [{...dispatch, sent_at: campaign.starts_at}],
    redemptions: [{...use, created_at: campaign.starts_at}]}));
  assert.equal(result.conversion, 100);
});
check('code expiry is an exclusive bound without an invented day window', () => {
  const result = metrics(campaign, fixture({codes: [{...code, expires_at: use.created_at}]}));
  assert.equal(result.conversion, 0);
});
check('missing linked code is incomplete even when the phone matches', () => {
  const result = metrics(campaign, fixture({codes: []}));
  assert.equal(result.conversion, null); assert.equal(result.conversionUnknownUses, 1);
});
check('unrelated actual redemption does not inflate SMS conversion', () => {
  const result = metrics(campaign, fixture({redemptions: [use, {...use, id: 'organic', customer_phone: other}]}));
  assert.equal(result.conversionUses, 1); assert.equal(result.smsUsedCount, 1);
});
check('incomplete source rows keep known counts but suppress an exact lifetime percentage', () => {
  const result = metrics(campaign, fixture({coverageComplete: false}));
  assert.equal(result.conversion, null); assert.equal(result.conversionUses, 1);
  assert.equal(result.conversionBase, 1); assert.equal(result.conversionReason, 'incomplete_rows');
});
check('empty data has no invented denominator or percentage', () => {
  const result = metrics(campaign);
  assert.equal(result.conversion, null); assert.equal(result.conversionBase, 0);
});
check('phone normalization deduplicates the same eligible recipient', () => {
  const result = metrics(campaign, fixture({recipients: [recipient, {...recipient, customer_phone: '0000006101'}]}));
  assert.equal(result.conversionBase, 1);
});
check('row coverage detects server truncation below the requested limit', () => {
  assert.deepEqual(coverage([1, 2], 3), {loaded: 2, total: 3, complete: false});
  assert.equal(coverage([1], null).complete, false);
  assert.equal(coverage([], 0).complete, true);
});

// Execute the real HTTP handler. The only substitute is Supabase read I/O;
// authentication branches, cohort queries, enrichment and response are shipped code.
const handlerPath = process.argv.find(value => value.startsWith('--handler-source='))?.slice(17)
  || 'supabase/functions/vacleaner-admin-data-v1/index.ts';
function endpointFixture({serverCap = Infinity, exactCounts = true, changes = {}} = {}) {
  const tables = {
    admin_users: [{user_id: 'manager-a'}, {user_id: 'manager-b'}],
    vacleaner_campaigns: [{...campaign, status: 'active'}],
    vacleaner_promo_codes: [{...code, code: 'QA-ONLY', customer_phone: null}],
    vacleaner_promo_redemptions: [{...use, booking_id: 'one', discount_amount: 100},
      {...use, id: 'second', booking_id: 'two', discount_amount: 100}],
    vacleaner_sms_dispatches: [dispatch], vacleaner_sms_dispatch_recipients: [recipient],
    vacleaner_bookings: [{id: 'one', total_amount: 700, status: 'completed'},
      {id: 'two', total_amount: 900, status: 'issued'}],
    ...changes,
  };
  const before = JSON.stringify(tables), queries = [];
  const db = {auth: {getUser: async token => ({data: {user: token === 'invalid' ? null :
    {id: token, user_metadata: {role: 'admin', is_admin: true}}}, error: null})},
    from(table) {
      assert(table in tables, 'unexpected table ' + table);
      const filters = []; let options = {}, requested = Infinity, one = false;
      const query = {
        select(columns, selectOptions = {}) {options = selectOptions; queries.push({table, columns, count: options.count}); return query;},
        eq(key, value) {filters.push(row => row[key] === value); return query;},
        not(key, operator, value) {assert.equal(operator, 'is'); filters.push(row => (row[key] ?? null) !== value); return query;},
        in(key, values) {filters.push(row => values.includes(row[key])); return query;},
        order() {return query;}, limit(value) {requested = value; return query;},
        maybeSingle() {one = true; return query;},
        then(resolve, reject) {
          const all = tables[table].filter(row => filters.every(filter => filter(row)));
          const data = structuredClone(all.slice(0, Math.min(requested, serverCap)));
          return Promise.resolve({data: one ? data[0] || null : data, error: null,
            count: exactCounts && options.count === 'exact' ? all.length : null}).then(resolve, reject);
        },
      };
      return query;
    },
  };
  let serve;
  const source = stripTypeScriptTypes(fs.readFileSync(handlerPath, 'utf8'), {mode: 'transform'})
    .replace(/^import[^\n]+\n/gm, '');
  vm.runInNewContext(source, {campaignConversionMetrics: metrics, campaignQueryCoverage: coverage,
    createClient: () => db, Response, Request, URL, Map, Set, structuredClone,
    console: {error() {}}, fetch() {throw Error('outbound network forbidden');},
    Deno: {env: {get: key => key === 'SUPABASE_URL' ? 'https://stage.invalid' : 'test-only'}, serve: fn => {serve = fn;}},
  });
  return {queries, async request(token = 'manager-a') {
    const response = await serve(new Request('https://stage.invalid/functions/v1/vacleaner-admin-data-v1', {
      method: 'POST', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})},
      body: JSON.stringify({action: 'campaigns'}),
    }));
    assert.equal(JSON.stringify(tables), before, 'report request must not mutate source facts');
    return {status: response.status, body: await response.json()};
  }};
}
let failed = 0;
async function checkAsync(name, fn) {
  try {await fn(); passed++; console.log('PASS:', name);}
  catch (error) {failed++; console.error('FAIL:', name, error.message);}
}
for (const [token, expected] of [[null, 401], ['invalid', 401], ['outsider', 403]]) {
  await checkAsync('HTTP auth remains enforced for ' + token, async () => {
    assert.equal((await endpointFixture().request(token)).status, expected);
  });
}
for (const manager of ['manager-a', 'manager-b']) await checkAsync('HTTP both authorized managers retain access: ' + manager, async () => {
  assert.equal((await endpointFixture().request(manager)).status, 200);
});
await checkAsync('HTTP distinct conversion fixes200percent while amounts/counts remain unchanged', async () => {
  const {status, body} = await endpointFixture().request();
  assert.equal(status, 200); const row = body.campaigns[0];
  assert.equal(row.usedCount, 2); assert.equal(row.completedUses, 1);
  assert.equal(row.revenue, 700); assert.equal(row.discountGiven, 200);
  assert.equal(row.conversionUses, 1); assert.equal(row.conversion, 100);
  assert.equal(row.smsUsedCount, 2); assert.equal(row.metricsCoverage.complete, true);
});
await checkAsync('HTTP selects the real dispatch send timestamp before temporal attribution', async () => {
  const endpoint = endpointFixture({changes: {vacleaner_promo_redemptions: [{...use,
    created_at: '2026-11-09T00:00:00Z', booking_id: 'one', discount_amount: 100}]}});
  const {body} = await endpoint.request();
  assert.equal(body.campaigns[0].usedCount, 1); assert.equal(body.campaigns[0].revenue, 700);
  assert.equal(body.campaigns[0].conversion, 0);
  assert(endpoint.queries.find(query => query.table === 'vacleaner_sms_dispatches').columns.includes('sent_at'));
});
await checkAsync('HTTP missing historical send timestamps are unknown rather than assigned-code fallback', async () => {
  const {body} = await endpointFixture({changes: {vacleaner_sms_dispatches: [{...dispatch, sent_at: null}]}}).request();
  const row = body.campaigns[0];
  assert.equal(row.conversion, null); assert.equal(row.conversionBasis, 'sms');
  assert.equal(row.conversionReason, 'missing_timestamps');
});
await checkAsync('HTTP lower server cap is detected with exact count, not requestedlimit', async () => {
  const endpoint = endpointFixture({serverCap: 1}); const {body} = await endpoint.request();
  assert.equal(body.campaigns[0].conversion, null);
  assert.equal(body.campaigns[0].conversionReason, 'incomplete_rows');
  assert.equal(body.coverage.redemptions.loaded, 1); assert.equal(body.coverage.redemptions.total, 2);
  assert.equal(body.coverage.complete, false);
  for (const table of ['vacleaner_campaigns', 'vacleaner_promo_codes', 'vacleaner_promo_redemptions',
    'vacleaner_sms_dispatches', 'vacleaner_sms_dispatch_recipients', 'vacleaner_bookings']) {
    assert.equal(endpoint.queries.find(query => query.table === table).count, 'exact', table);
  }
});
await checkAsync('HTTP unavailable exact count is reported conservatively', async () => {
  const {body} = await endpointFixture({exactCounts: false}).request();
  assert.equal(body.campaigns[0].conversion, null); assert.equal(body.coverage.complete, false);
});
console.log(JSON.stringify({mode: 'campaign-distinct-customer-and-temporal-attribution', handlerPath, passed, failed}));
if (failed) process.exitCode = 1;
