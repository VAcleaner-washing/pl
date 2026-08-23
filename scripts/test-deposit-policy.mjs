import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const code=fs.readFileSync(path.join(root,'assets','vacleaner-core.js'),'utf8');
const sandbox={window:{},structuredClone:globalThis.structuredClone};
vm.runInNewContext(code,sandbox,{filename:'vacleaner-core.js'});
const core=sandbox.window.VACLEANER_CORE;
if(!core)throw new Error('VACLEANER_CORE missing');
let passed=0;
const eq=(actual,expected,label)=>{if(actual!==expected)throw new Error(`${label}: expected ${expected}, got ${actual}`);passed++};

// Deposit is based on paid days, not simply whether Saturday/Sunday appears between dates.
const depositCases=[
  ['Saturday morning → Sunday morning','2026-08-08','2026-08-09','morning','morning',1,false],
  ['Saturday evening → Sunday evening','2026-08-08','2026-08-09','evening','evening',1,false],
  ['Friday evening → Sunday morning','2026-08-07','2026-08-09','evening','morning',2,true],
  ['Friday evening → Sunday evening','2026-08-07','2026-08-09','evening','evening',2,true],
  ['Saturday morning → Monday morning','2026-08-08','2026-08-10','morning','morning',2,true],
  ['Monday morning → Wednesday morning','2026-08-10','2026-08-12','morning','morning',2,false],
];
for(const [label,start,finish,pickup,returned,expectedDays,expectedWeekend] of depositCases){
  eq(core.rentalDays(start,finish,pickup,returned),expectedDays,`${label} paid days`);
  eq(core.isWeekendDeposit(start,finish,pickup,returned),expectedWeekend,`${label} deposit class`);
}

// Rental tariff boundary: Friday evening starts weekend pricing; Sunday evening starts weekday pricing.
const tariffMoments=[
  ['Friday morning','2026-08-07','morning',false],
  ['Friday evening','2026-08-07','evening',true],
  ['Saturday morning','2026-08-08','morning',true],
  ['Saturday evening','2026-08-08','evening',true],
  ['Sunday morning','2026-08-09','morning',true],
  ['Sunday evening','2026-08-09','evening',false],
  ['Monday morning','2026-08-10','morning',false],
];
for(const [label,date,window,weekend] of tariffMoments)eq(core.isWeekendTariffMoment(date,window),weekend,`${label} tariff class`);

const sc2=core.products.sc2;
eq(core.rentalBase(sc2,'2026-08-07','2026-08-08','morning','morning'),500,'Friday morning one-day SC2 uses weekday price');
eq(core.rentalBase(sc2,'2026-08-07','2026-08-08','evening','evening'),600,'Friday evening one-day SC2 uses weekend price');
eq(core.rentalBase(sc2,'2026-08-08','2026-08-09','morning','morning'),600,'Saturday morning one-day SC2 uses weekend price');
eq(core.rentalBase(sc2,'2026-08-09','2026-08-10','morning','morning'),600,'Sunday morning one-day SC2 uses weekend price');
eq(core.rentalBase(sc2,'2026-08-09','2026-08-10','evening','evening'),500,'Sunday evening one-day SC2 uses weekday price');

// Half-open slot overlap: same-slot return releases inventory for same-slot pickup.
eq(core.periodsOverlap('2026-08-07','2026-08-08','morning','morning','2026-08-08','2026-08-09','morning','morning'),false,'Morning return releases morning pickup');
eq(core.periodsOverlap('2026-08-07','2026-08-08','evening','evening','2026-08-08','2026-08-09','evening','evening'),false,'Evening return releases evening pickup');
eq(core.periodsOverlap('2026-08-07','2026-08-08','morning','evening','2026-08-08','2026-08-09','morning','morning'),true,'Evening return still occupies same-day morning');

const groups={oneUnit:[1000,2000],twoUnits:[1500,3000],general:[2000,3000],elite:[3000,4000]};
for(const [group,[dayAmount,weekendAmount]] of Object.entries(groups)){
  const rule=core.depositRules[group];
  eq(Number(rule.day),dayAmount,`${group} day deposit`);
  eq(Number(rule.weekend),weekendAmount,`${group} weekend deposit`);
  eq(Number(core.isWeekendDeposit('2026-08-08','2026-08-09','morning','morning')?rule.weekend:rule.day),dayAmount,`${group} one-day weekend deposit`);
  eq(Number(core.isWeekendDeposit('2026-08-07','2026-08-09','evening','morning')?rule.weekend:rule.day),weekendAmount,`${group} paid weekend deposit`);
}

// Full-weekend bundle tariffs remain special only for two paid weekend-classified days.
const combo=core.products.combo;
eq(core.rentalBase(combo,'2026-08-08','2026-08-10','morning','morning'),1800,'Combo Saturday morning → Monday morning uses full-weekend bundle');
eq(core.rentalBase(combo,'2026-08-07','2026-08-09','evening','morning'),1800,'Combo Friday evening → Sunday morning uses full-weekend bundle');
eq(core.rentalBase(combo,'2026-08-09','2026-08-11','evening','evening'),2000,'Combo Sunday evening → Tuesday evening uses two weekday days');

// Public booking deposit rendering must resolve products by stable identity, not marketing copy.
// This guards against a client-facing rename (e.g. “Дивани + кухня та ванна”) silently turning 1 500 грн into “—”.
const publicSlots=fs.readFileSync(path.join(root,'assets','public-booking-slots.js'),'utf8');
const publicExperience=fs.readFileSync(path.join(root,'assets','public-experience.js'),'utf8');
const ok=(condition,label)=>{if(!condition)throw new Error(label);passed++;};
ok(/dataset\?\.productCode/.test(publicSlots),'public-booking-slots resolves selected product by data-product-code');
ok(/dataset\?\.productCode/.test(publicExperience),'public-experience resolves selected product by data-product-code');
for(const [code,product] of Object.entries(core.products)) eq(core.depositGroup(code),product.depositGroup||'oneUnit',`${code} deposit group comes from catalog config`);
ok(!/\['puzzi_jimmy','puzzi_abir','combo','ideal_windows'\]\.includes\(code\)/.test(publicSlots),'public booking has no hardcoded twoUnits product list');
ok(!/\['puzzi_jimmy','puzzi_abir','combo','ideal_windows'\]\.includes\(code\)/.test(publicExperience),'public experience has no hardcoded twoUnits product list');
ok(publicSlots.includes("window.VACLEANER_CORE?.depositGroup?.(code)"),'public booking resolves deposit group through config-backed core');
ok(publicExperience.includes("CORE?.depositGroup?.(code)"),'public experience resolves deposit group through config-backed core');
eq(core.products.combo.label,'Дивани + кухня та ванна','combo canonical catalog label');


console.log(`Rental/deposit/slot policy passed ${passed} assertions.`);
