import fs from 'node:fs';
import vm from 'node:vm';

const read = (path) => fs.readFileSync(path, 'utf8');
const admin = read('assets/admin-v250.js');
const edge = read('supabase/functions/vacleaner-admin-bookings-v4/index.ts');
const deployEdge = read('supabase/functions/vacleaner-admin-bookings-v4/index.deploy.js');
const publicEdge = read('supabase/functions/vacleaner-booking-v5/index.ts');
const release = JSON.parse(read('release.json'));
const coreSource = read('assets/vacleaner-core.js');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(coreSource, context);
const core = context.window.VACLEANER_CORE;

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(
  release.version === '4.3.0' && Number(release.build) === 4300,
  'v4.3.12 change record preserves canonical 4.3.0/4300 package baseline'
);
check(
  admin.includes('type="time" name="${name}"') && admin.includes('step="60"'),
  'admin uses unrestricted exact clock controls'
);
check(
  admin.includes("function slotForTime(t){const s=getSlots();return t>=s.eveningStart?'evening':'morning'}"),
  'admin keeps current eveningStart tariff boundary'
);
check(
  admin.includes('data-logistics-value="delivery"') && admin.includes('data-logistics-value="pickup"'),
  'admin has independent outbound and return logistics choices'
);
check(
  admin.includes("deliveryOutboundMethod:fd.get('deliveryOutboundMethod')") &&
    admin.includes("deliveryReturnMethod:fd.get('deliveryReturnMethod')"),
  'admin submits two-leg logistics'
);
check(
  admin.includes('Math.round(roundTrip*legs/2)'),
  'one admin logistics leg charges half of round-trip quote'
);
check(
  admin.includes('deliveryTripMultiplierForBooking') && admin.includes('tripMultiplier=deliveryTripMultiplierForBooking(b)'),
  'delivery fuel analytics follow actual one/two-leg routing'
);
check(
  edge.includes('pickupTime >= slots.eveningStart ? "evening" : "morning"') &&
    edge.includes('returnTime >= slots.eveningStart ? "evening" : "morning"'),
  'backend derives tariff windows from arbitrary exact admin times'
);
check(
  !edge.includes('!inWindow(pickupTime, pickupWindow, slots) || !inWindow(returnTime, returnWindow, slots)'),
  'backend no longer rejects admin times outside public slot windows'
);
check(
  edge.includes('deliveryFactor = deliveryLegs / 2') &&
    edge.includes('automaticDeliveryAmount = Math.round((Number(autoDelivery.amount) || 0) * deliveryFactor)'),
  'backend charges 0/50/100 percent by delivery leg count'
);
check(
  edge.includes('trip_multiplier: deliveryLegs * 2'),
  'backend snapshots route multiplier 2 for one leg and 4 for two'
);
check(
  deployEdge.includes('pickupTime >= slots.eveningStart ? "evening" : "morning"') &&
    deployEdge.includes('returnTime >= slots.eveningStart ? "evening" : "morning"'),
  'deploy fallback derives the same arbitrary-time tariff windows'
);
check(
  deployEdge.includes('deliveryFactor = deliveryLegs / 2') &&
    deployEdge.includes('automaticDeliveryAmount = Math.round((Number(autoDelivery.amount) || 0) * deliveryFactor)'),
  'deploy fallback keeps the same 0/50/100 delivery pricing'
);
check(
  deployEdge.includes('trip_multiplier: deliveryLegs * 2') &&
    deployEdge.includes('outbound_method: outboundMethod') &&
    deployEdge.includes('return_method: returnMethod'),
  'deploy fallback persists the same logistics and mileage snapshot'
);
check(
  !publicEdge.includes('deliveryOutboundMethod') && !publicEdge.includes('deliveryReturnMethod'),
  'public booking backend remains on current logistics contract'
);
check(
  core.isWeekendTariffMoment('2026-09-06', 'morning') === true,
  'Sunday 14:00 mapped to morning remains weekend tariff'
);
check(
  core.isWeekendTariffMoment('2026-09-04', 'morning') === false &&
    core.isWeekendTariffMoment('2026-09-04', 'evening') === true,
  'weekday/Friday tariff keeps existing evening boundary behavior'
);

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error(` - ${label}`);
  process.exit(1);
}
console.log(`v4.3.12 admin time/logistics: ${checks.length}/${checks.length} PASS`);
