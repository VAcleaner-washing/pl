import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const admin=read('assets/admin-v250.js');
const addr=read('assets/address-autocomplete.js');
const css=read('assets/admin-v250.css');
const dataFn=read('supabase/functions/vacleaner-admin-data-v1/index.ts');
const settingsFn=read('supabase/functions/vacleaner-settings/index.ts');
const campaigns=read('supabase/functions/vacleaner-campaigns-v1/index.ts');
const inventory=JSON.parse(read('supabase/production-inventory/edge-functions.json'));
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const has=(src,needle,msg)=>assert.ok(src.includes(needle),msg);
const lacks=(src,needle,msg)=>assert.ok(!src.includes(needle),msg);

// RETURN: delivered SMS is visible as pending, not auto-active, and deployed inventory matches the fixed source.
has(campaigns,'action==="pending_bonus"','campaign backend must expose pending SMS bonus');
has(campaigns,'action==="activate_bonus"','campaign backend must keep explicit manager activation');
has(admin,'Клієнт підтвердив SMS','booking UI must require explicit confirmation before activation');
const campaignInventory=inventory.functions.find(x=>x.slug==='vacleaner-campaigns-v1');
assert.equal(campaignInventory?.version,20,'production campaign inventory must record deployed v20 with pending_bonus');

// Admin delivery address: one editable address, no duplicate literal address in step 4, local address without city prefix stays local.
has(admin,'function deliverySettlementGuess','admin must classify legacy/street-only local addresses');
has(admin,"return{settlement:'Полтава',local:true,explicit:false}",'street/house-only address must safely resolve to Poltava local zone');
has(admin,'Адреса береться з кроку «Клієнт»','delivery step must reference the single address source instead of duplicating it');
lacks(admin,"deliveryAddressSummary.textContent=address||'Адресу вкажіть",'step 4 must not duplicate the full address string');
has(admin,'локальна зона','local delivery quote must expose the fixed local tariff state');

// Local route distance: fixed tariff does not mean zero route; exact historical routes may be backfilled.
has(addr,"ctx.input.dataset.vacAddressPricingDistanceKm='0'",'local pricing distance remains zero for tariff logic');
has(addr,"ctx.input.dataset.vacAddressRouteKm=String(routeKm)",'local route km must be stored separately for fuel analytics');
has(addr,'window.__VAC_ROUTE_FOR_ADDRESS__=resolveRouteForAddress','admin finance must be able to resolve exact historical routes');
has(addr,"item?.houseNumber&&!item?.approximateCoordinates",'historical backfill must refuse approximate street-only coordinates');
has(admin,'id="recalcDeliveryRoutes"','finance UI must expose controlled route backfill when distances are missing');
has(admin,"action:'save_delivery_route'",'route backfill must persist through authenticated admin API');
has(dataFn,'if(action==="save_delivery_route")','admin data backend must persist route snapshot');
has(dataFn,'route_backfilled_at','backfilled routes must be auditable');

// Finance visual hierarchy: keep outer sections, flatten nested tiles.
has(css,'v4.2.24 — finance/workflow visual cleanup','finance visual cleanup contract must be present');
has(css,'.equipment-payback-card .ops-mini-row{position:relative;display:grid','equipment payback rows must be flat compact rows');
has(css,'.delivery-fact-summary{display:grid','delivery metrics must use a compact summary strip');
has(css,'.delivery-car-costs{display:grid;gap:0;border:1px solid','delivery car comparison must be one grouped surface, not separate floating tiles');
has(spec,'UI-008 — finance surfaces','system spec must lock the flattened finance hierarchy');
has(spec,'DEL-011 — локальний маршрут теж зберігається','system spec must lock local route capture');
has(spec,'DEL-012 — backfill старих доставок','system spec must lock exact-only route backfill');


// Settings UX: one task at a time, with profitability kept in Finance.
has(admin,"const SETTINGS_TABS=['rental','delivery','equipment','notifications','system']",'settings must expose five task-focused tabs');
has(admin,'data-settings-panel="delivery"','delivery settings must own a focused panel');
has(admin,'data-settings-open-finances','delivery settings must link to factual delivery analytics instead of embedding them');
lacks(admin,'${deliveryEconomicsMarkup(deliveryPricing)}','settings must not embed profitability analytics inside the delivery form');
has(css,'.settings-tabs{display:flex','settings tabs must have a dedicated responsive rail');
has(css,'.settings-workspace{width:100%;min-width:0','settings active workspace must own the full content width');
has(css,'.finance-dashboard{align-items:start}','finance cards must not stretch into dead whitespace');
has(spec,'SET-003 — task-focused tabs','system spec must lock settings tab ownership');
has(spec,'SET-004 — compact settings surfaces','system spec must lock compact settings visual hierarchy');

// Equipment baseline persistence + keyboard UX regressions from production screenshots.
has(settingsFn,'body.equipmentBaselines !== undefined','settings backend must accept global equipment baselines');
has(admin,'data-equipment-total','equipment rows must expose a live total target');
has(admin,'syncEquipmentTotals','equipment total must recalculate while typing, before save');
has(admin,'data-equipment-fleet-total','equipment settings must show a live whole-fleet start value');
has(css,'.equipment-baseline-summary{display:grid','equipment settings must summarize fleet quantity and total before the rows');
has(admin,'settingsSaveErrorMessage','raw settings backend errors must be mapped for managers');
has(css,'html.keyboard-open .mobile-nav{opacity:0;visibility:hidden;pointer-events:none','PWA keyboard must move bottom navigation out of the working area');
has(spec,'SET-005 — equipment baseline persistence','system spec must lock equipment baseline persistence and keyboard behavior');

console.log('v4.2.24 FINANCE / DELIVERY / RETURN / SETTINGS UX contracts: PASS');
