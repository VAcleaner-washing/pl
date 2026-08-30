import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const admin=read('assets/admin-v250.js');
const css=read('assets/admin-v250.css');
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const migration=read('supabase/migrations/20260830085000_vacleaner_address_detail_backfill_v429.sql');
const migration2=read('supabase/migrations/20260830091500_vacleaner_address_detail_backfill_v429_pass2.sql');
const pkg=JSON.parse(read('package.json'));
const rel=JSON.parse(read('release.json'));
const has=(source,token,message)=>assert.ok(source.includes(token),message);
const lacks=(source,token,message)=>assert.ok(!source.includes(token),message);

const atLeast=(actual,target)=>{const a=String(actual).split('.').map(Number),b=String(target).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true};
assert.equal(pkg.version,rel.version);
assert.ok(atLeast(rel.version,'4.2.29'));
assert.ok(Number(rel.build)>=4229);
has(spec,'NAV-004 — дочірня картка повертає в батьківський контекст','System Spec must lock parent navigation');
has(spec,'ADDR-014 — legacy backfill є production-міграцією','System Spec must lock production address backfill');
has(spec,'DEL-005 — останні 30 доставок з чесними знаменниками','System Spec must lock 30-delivery sample');

// Extract and execute the real parser so the exact production function is regression-tested.
const start=admin.indexOf('function deliveryAddressParts');
const end=admin.indexOf('function mergeDeliveryComment',start);
assert.ok(start>=0&&end>start,'deliveryAddressParts must exist');
const ctx={};
vm.createContext(ctx);
vm.runInContext(`${admin.slice(start,end)};this.deliveryAddressParts=deliveryAddressParts;`,ctx);
const split=v=>JSON.parse(JSON.stringify(ctx.deliveryAddressParts(v)));
assert.deepEqual(split("Полтава, Полтавська 3 · 3 підʼїзд"),{address:'Полтава, Полтавська 3',note:'3 підʼїзд'});
assert.deepEqual(split("Полтава, Полтавська 3 - 3 під'їзд"),{address:'Полтава, Полтавська 3',note:"3 під'їзд"});
assert.deepEqual(split('Бідного 16, 2п'),{address:'Бідного 16',note:'2п'});
assert.deepEqual(split("Вул. Баленка 2 підʼїзд 1"),{address:'Вул. Баленка 2',note:"підʼїзд 1"});
assert.deepEqual(split('Героїв АТО 116 корпус 1, під’їзд 2, домофон 58, 6 поверх'),{address:'Героїв АТО 116 корпус 1',note:'під’їзд 2, домофон 58, 6 поверх'});
assert.deepEqual(split('вул.Полтавська 1, 3 під’їзд, кв 135'),{address:'вул.Полтавська 1',note:'3 під’їзд, кв 135'});
assert.deepEqual(split("вул.Героїв України, 7, 3 під'їзд, кВ 100"),{address:'вул.Героїв України, 7',note:"3 під'їзд, кВ 100"});
assert.deepEqual(split("Перспективна 10, 1 підїзд.кв 55, 7 пов"),{address:'Перспективна 10',note:'1 підїзд.кв 55, 7 пов'});
assert.deepEqual(split('Історична доставка · адреса не збережена'),{address:'Історична доставка · адреса не збережена',note:''});

has(migration,'add column if not exists address_detail text','customer address detail column must be created');
has(migration,'add column if not exists fulfillment_address_detail text','booking address detail column must be created');
has(migration,'update public.vacleaner_customers','customer legacy addresses must be backfilled');
has(migration,'update public.vacleaner_bookings','booking legacy addresses must be backfilled');
lacks(migration,'va_home','migration must not touch VA HOME objects');
has(migration2,'update public.vacleaner_customers','pass2 must finish customer entrance cleanup');
has(migration2,'update public.vacleaner_bookings','pass2 must finish booking entrance cleanup');
lacks(migration2,'va_home','pass2 must not touch VA HOME objects');

has(admin,'function recentDeliverySample(limit=30','delivery sample default must be 30');
has(admin,'sample=recentDeliverySample(30,pricing)','profitability must request 30 delivery rows');
has(admin,'pricedCount:priced.length','price denominator must be explicit');
has(admin,'matchedCount:matched.length','price+route denominator must be explicit');
has(admin,'ціна відома для ${priceCoverage}','UI must state price coverage');
has(admin,'середнє по ${row.freshCount}','fuel UI must state trusted route denominator');
has(admin,'по ${row.matchedCount} ${ukCount(row.matchedCount','net UI must state matched denominator');

lacks(admin,"preferred==='instagram'&&!instagram",'preferred Instagram must not be demoted due to missing handle');
has(admin,"(instagram||preferred==='instagram')?{key:'instagram'",'Instagram CTA must exist when Instagram is preferred even without username');
has(admin,'class="referral-main-grid"','message and primary action must share the first referral screen');
has(css,'.referral-main-grid{display:grid','desktop referral layout must be explicit');
has(css,'.money-row>span,.balance>span,.live>div>span,.modal-summary .live>div>span{font-weight:420}','finance labels must stay regular, not bold');
has(css,'.balance.due>strong,.balance.refund>strong{font-weight:600}','finance amount may keep restrained emphasis');
has(css,'full admin typography audit: hierarchy without blanket bold','full admin typography audit override must exist');
has(css,'.badge,.status,.hero-status,.schedule-badge,.booking-deposit-state','status and schedule text must use restrained weights');
has(css,'.main h2{font-weight:620}','admin section headings must stay restrained');
has(spec,'700+ допускається тільки для декоративного символу/іконки','System Spec must lock the global admin typography ceiling');
has(spec,'`Повернено клієнту`, `Доплату отримано`) залишаються 420–480','System Spec must lock calm finance label typography');

has(admin,'let modalReturnAction=null','modal stack must retain parent return context');
has(admin,'function closeLayer(returnToParent=false)','closeLayer must distinguish user back from programmatic close');
has(admin,'closeLayer(true)','user close must return to parent context');
has(admin,"backLabel:'До картки клієнта'",'client child flows must expose back-to-client semantics');
has(admin,"backLabel:'До бронювання'",'booking -> client must expose back-to-booking semantics');
lacks(admin,"openForm(null,{prefillCustomer:client})",'dead legacy client->booking function call must be removed');

has(admin,"btn.textContent='Перевіряємо статус…'",'issue submit must refresh status before changing finance/state');
has(admin,"fresh?.status==='issued'",'stale issue modal must recognize an already-issued booking');
has(admin,"invalid_transition:'Статус бронювання вже змінився. Дані потрібно оновити.'",'raw invalid_transition must have a human label');
const adminBackend=read('supabase/functions/vacleaner-admin-bookings-v4/index.ts');
has(adminBackend,'nextStatus === "issued" && String(current.status || "") === "issued"','backend issue retry must be idempotent');
has(adminBackend,'alreadyApplied: true','backend must mark already-applied issue retry');
has(spec,'Повторний submit зі старої вкладки/модалки','System Spec must lock stale issue retry behavior');

console.log('v4.2.29 ADMIN CONTEXT + DATA contracts: PASS');
