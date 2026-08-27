import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const admin=read('assets/admin-v250.js');
const css=read('assets/admin-v250.css');
const campaigns=read('supabase/functions/vacleaner-campaigns-v1/index.ts');
const adminData=read('supabase/functions/vacleaner-admin-data-v1/index.ts');
const promo=read('supabase/functions/vacleaner-booking-promo-v1/index.ts');
const adminBookings=read('supabase/functions/vacleaner-admin-bookings-v3/index.ts');
const generator=read('scripts/generate-config.mjs');
const syncCopy=read('scripts/sync-static-copy.mjs');
const stamp=read('scripts/stamp-build.mjs');
const configRaw=read('config/vacleaner.json');
const sourceHash=crypto.createHash('sha256').update(configRaw).digest('hex').slice(0,16);

const checks=[];
const check=(label,condition)=>checks.push([label,Boolean(condition)]);

// RETURN/reactivation safety: a fresh pending request is already an active client.
check('analytics sleeping-client exclusion includes pending', admin.includes("['pending','waiting_payment','confirmed','issued'].includes(b.status)"));
check('campaign SMS audience excludes pending bookings', /\.in\("status",\["pending","waiting_payment","confirmed","issued"\]\)/.test(campaigns));
check('admin-data reactivation audience excludes pending bookings', /\.in\("status",\["pending","waiting_payment","confirmed","issued"\]\)/.test(adminData));
check('booking promo blocks pending active booking', promo.includes('["pending","waiting_payment","confirmed","issued"].includes(String(x.status))'));
check('admin phone promo blocks pending active booking', adminBookings.includes('["pending", "waiting_payment", "confirmed", "issued"].includes(String(row.status))'));

// Actual completion date must win over the planned return date in both analytics and promo history.
check('analytics uses completed_at before return_date', admin.includes("String(b?.completed_at||'')")&&admin.includes("b?.return_date||b?.start_date"));
for(const [name,src] of [['campaigns',campaigns],['admin data',adminData],['booking promo',promo],['admin bookings',adminBookings]]){
  check(`${name} selects completed_at`,src.includes('completed_at'));
  check(`${name} prefers completed_at for last completed rental`,/completed_at\s*\|\|[^\n;]{0,80}return_date/.test(src));
}

// Decision analytics truthfulness.
check('revenue breakdown exposes reconciliation adjustment', /adjustment\s*:\s*0/.test(admin)&&admin.includes('revenue.adjustment'));
check('revenue mismatch is not silently pushed into rental', !/rows\.rental\s*\+=\s*difference/.test(admin));
check('UI exposes unreconciled finance data', admin.includes('Неузгоджено в даних')&&css.includes('.analytics-reconcile-warning'));
check('issue-day demand separates committed and potential statuses', admin.includes("new Set(['confirmed','issued','completed'])")&&admin.includes("new Set(['pending','waiting_payment'])"));
check('issue-day demand is based on start_date inside selected period', admin.includes('startDateInBounds')&&admin.includes("b?.start_date"));
check('funnel conversion uses resolved outcomes', admin.includes('resolved=completed+lost')&&admin.includes('completed/resolved*100'));
check('funnel explicitly shows active and lost bookings', admin.includes('analytics-funnel-resolution')&&admin.includes('В роботі')&&admin.includes('Втрачено'));
check('source performance exposes completion rate', admin.includes('completionRate')&&admin.includes('% завершено'));
check('reactivation panels disclose today scope', admin.includes('станом на сьогодні')||admin.includes('Станом на сьогодні'));

// Booking task-first UX is intentionally preserved; this release must not regress it.
const bookingHardening=read('assets/booking-hardening-v4144.js');
for(const token of ['Що плануєте почистити?','Диван / крісла','Матрац / ліжко','Кухня / ванна','Вікна / дзеркала','Кілька зон / весь дім','Я знаю, яку техніку хочу','Пройти точний підбір за 30 секунд']){
  check(`booking smart entry preserved: ${token}`, bookingHardening.includes(token));
}

// One source of truth: config hash must be propagated to browser and backend generated configs.
check('config generator reads the canonical config/vacleaner.json', generator.includes("path.join(root,'config','vacleaner.json')"));
check('browser core carries current config source hash', read('assets/vacleaner-core.js').includes(sourceHash));
for(const name of ['vacleaner-settings','vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
  check(`${name} generated config carries current source hash`,read(`supabase/functions/${name}/config.ts`).includes(sourceHash));
}


// Release stability: do not replay historical one-off patches on top of the latest baseline.
for(const legacy of ['apply-content-v4148.mjs','apply-seo-v4147.mjs','apply-performance-v4149.mjs','apply-v4150-full-qa.mjs','apply-v4152-manual-address-fallback.mjs','apply-v4153-address-provider-repair.mjs','apply-v4155-clear-advice.mjs','apply-v4156-price-rhythm-delivery-copy.mjs']){
  check(`stamp no longer replays historical patch: ${legacy}`,!stamp.includes(`'scripts','${legacy}'`));
}
for(const deterministic of ['sync-static-copy.mjs','harden-public-metadata.mjs','generate-config.mjs','apply-delivery-settings.mjs']){
  check(`stamp keeps deterministic normalizer: ${deterministic}`,stamp.includes(`'scripts','${deterministic}'`));
}
check('stamp retires historical per-km delivery patch',!stamp.includes("'scripts','apply-delivery-distance-v41472.mjs'")&&fs.existsSync(path.join(root,'scripts','apply-delivery-distance-v41472.mjs')));

// Static-copy normalization must no longer roll final SEO descriptions backwards before later patches repair them.
const finalDescriptions={
  'index.html':'Оренда професійної техніки для прибирання у Полтаві: Kärcher Puzzi, SC 2, Jimmy та робот для вікон, підбір, інструктаж і підтримка.',
  'vidhuky/index.html':'Як проходить оренда VAcleaner у Полтаві: реальні кадри процесу, завершені оренди та оригінальні відгуки клієнтів у Instagram Highlights.',
  'umovy/index.html':'Умови оренди VAcleaner: підтвердження заявки, передоплата 200 грн, скасування за 3 доби, залог, видача, користування, повернення та фінальний розрахунок.',
  'rishennia/textile/index.html':'Як глибоко почистити диван і м’які меблі вдома: підготовка, локальні плями, контроль вологи та промивання текстилю Kärcher Puzzi.',
  'rishennia/steam/index.html':'Що можна чистити пароочисником удома: кухня, ванна, плитка та шви, де пара доречна, де потрібна обережність і як працювати з Kärcher SC 2.',
  'rishennia/windows/index.html':'Як спростити миття звичайних і панорамних вікон: підготовка скла, безпечний запуск, страхування та робота з роботом ABIR WD8.',
};
for(const [file,description] of Object.entries(finalDescriptions)){
  check(`final description present in ${file}`,read(file).includes(description));
  check(`sync-static-copy preserves final description for ${file}`,syncCopy.includes(description));
}

let passed=0;
for(const [label,ok] of checks){assert.ok(ok,label);passed+=1;console.log('PASS:',label)}
console.log(JSON.stringify({passed,failed:0}));
