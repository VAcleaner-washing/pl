import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),release=JSON.parse(fs.readFileSync('release.json','utf8')),build=String(release.build);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>['.git','dist'].includes(entry.name)?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const files=walk(root),errors=[];
// Never ship one-off historical import payloads or customer PII in the GitHub release.
for(const rel of ['scripts/historical-bookings.parsed.json','scripts/historical-import-db.json','scripts/historical-import-plan.json']){
  if(fs.existsSync(path.join(root,rel)))errors.push(`Private historical import payload must not ship: ${rel}`);
}

const rootSwPath=path.join(root,'sw.js');
if(!fs.existsSync(rootSwPath))errors.push('root service-worker retirement sentinel is missing');
else{const rootSw=fs.readFileSync(rootSwPath,'utf8');if(!rootSw.includes('VACLEANER_ROOT_SW_RETIRE'))errors.push('root sw.js must be retirement-only');if(/caches\.(?:open|match)/.test(rootSw))errors.push('root retirement worker must never cache public pages');}
if(fs.existsSync(path.join(root,'manifest.webmanifest')))errors.push('legacy public manifest still exists');
for(const file of files.filter(f=>f.endsWith('.html')||f.endsWith('.txt'))){
 const s=fs.readFileSync(file,'utf8'),rel=path.relative(root,file).replaceAll('\\','/');
 if(/codex-preview/.test(s))errors.push(`development metadata: ${rel}`);
 if(!rel.startsWith('admin/')&&/manifest\.webmanifest/.test(s))errors.push(`public PWA metadata: ${rel}`);
 if(rel.startsWith('admin/')&&/href(?:\":|=\")\?\/?manifest\.webmanifest/.test(s))errors.push(`admin uses root manifest: ${rel}`);
}
for(const file of files.filter(f=>f.endsWith('.js')&&!f.includes(`${path.sep}_next${path.sep}`))){try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'})}catch{errors.push(`JS syntax: ${path.relative(root,file)}`)}}
for(const file of files.filter(f=>f.endsWith('.html'))){
 const s=fs.readFileSync(file,'utf8'),rel=path.relative(root,file).replaceAll('\\','/');
 for(const m of s.matchAll(/\/assets\/(?:vacleaner-core|public-experience|public-catalog|public-booking-slots|public-resilience|admin-v250|public-fixes|mobile-home-fix)\.(?:js|css)\?v=([^"']+)/g))if(m[1]!==build)errors.push(`asset version ${m[1]} in ${rel}`);
 const hasCore=/vacleaner-core\.js/.test(s), needsCore=rel==='bronuvannia/index.html'||rel.startsWith('admin/');
 if(hasCore!==needsCore)errors.push(`shared core route mismatch: ${rel}`);
 if(rel!=='bronuvannia/index.html'&&/public-catalog\.js/.test(s))errors.push(`catalog runtime on ${rel}`);
}
const raw=fs.readFileSync(path.join(root,'config','vacleaner.json'),'utf8');
const expected=crypto.createHash('sha256').update(raw).digest('hex').slice(0,16);
const core=fs.readFileSync(path.join(root,'assets','vacleaner-core.js'),'utf8');
if(!core.includes(`SOURCE_HASH="${expected}"`))errors.push('browser config is stale');
for(const fn of ['vacleaner-settings','vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
 const shared=fs.readFileSync(path.join(root,'supabase','functions',fn,'config.ts'),'utf8');
 if(!shared.includes(`VACLEANER_SOURCE_HASH="${expected}"`))errors.push(`edge config stale: ${fn}`);
}
if(!fs.existsSync(path.join(root,'supabase','functions','vacleaner-admin-data-v1','index.ts')))errors.push('admin data Edge source is missing');
if(!fs.existsSync(path.join(root,'supabase','functions','vacleaner-reminders-v1','index.ts')))errors.push('server reminder Edge source is missing');
const sw=fs.readFileSync(path.join(root,'admin','sw.js'),'utf8');if(!sw.includes(`vacleaner-manager-${build}`))errors.push('service worker cache version mismatch');
const adminSw=fs.readFileSync(path.join(root,'admin','sw.js'),'utf8');

if(!adminSw.includes("if(data.title==='Нове бронювання VAcleaner')return"))errors.push('legacy technical booking push is not suppressed in the PWA service worker');
const adminRuntime=fs.readFileSync(path.join(root,'assets','admin-v250.js'),'utf8');
const pwaVisualQa=fs.readFileSync(path.join(root,'scripts','pwa_visual_qa.py'),'utf8');

const e2eSmoke=fs.readFileSync(path.join(root,'scripts','e2e_smoke.py'),'utf8');
for(const token of ['def normalized_text(', 'def select_uses_dark_theme(', 'hero_limit = min(700', '#bookingForm header [data-close]', 'Saturday morning to Sunday morning keeps 1000 UAH deposit', 'Saturday evening to Sunday evening keeps 1000 UAH deposit', 'Friday evening to Sunday morning uses 2000 UAH weekend deposit', 'Friday evening to Sunday evening uses 2000 UAH weekend deposit', 'Saturday morning to Monday morning uses 2000 UAH weekend deposit'])if(!e2eSmoke.includes(token))errors.push(`E2E CI hardening missing: ${token}`);
if(e2eSmoke.includes('page.locator("[data-close]").click()'))errors.push('E2E uses ambiguous generic data-close click');
if(/visualViewport\?\.addEventListener\('scroll'/.test(adminRuntime))errors.push('iPhone viewport must not resync on visualViewport scroll');
for(const token of ["classList.toggle('keyboard-open'","keepFocusedControlVisible(target)","--keyboard-viewport-height","--keyboard-viewport-top"])if(!adminRuntime.includes(token))errors.push(`iPhone keyboard runtime hardening missing: ${token}`);
if(adminRuntime.includes("visualViewport?.addEventListener('scroll'"))errors.push('visualViewport scroll listener must not move the app shell');
if(!adminRuntime.includes('focused=document.activeElement instanceof HTMLElement'))errors.push('keyboard viewport mode must require a focused editable control');
const swRegistrationVersions=[...adminRuntime.matchAll(/\/admin\/sw\.js\?v=(\d+)/g)].map(match=>match[1]);
if(swRegistrationVersions.length!==1||swRegistrationVersions[0]!==build)errors.push(`service worker registration version mismatch: ${swRegistrationVersions.join(',')||'missing'}`);

const publicBooking=fs.readFileSync(path.join(root,'assets','public-booking-slots.js'),'utf8');
if(/availability-card[\s\S]{0,500}\.innerHTML\s*=/.test(publicBooking)||/card\.innerHTML\s*=/.test(publicBooking))errors.push('nearest availability must never rewrite React-owned availability-card DOM');
for(const token of ["vx-nearest-availability-panel","card.insertAdjacentElement('afterend',panel)","button.onclick=()=>applySuggestedPeriod(next)"])if(!publicBooking.includes(token))errors.push(`public nearest-availability safe sibling missing: ${token}`);
const publicResilience=fs.readFileSync(path.join(root,'assets','public-resilience.js'),'utf8');

const publicExperience=fs.readFileSync(path.join(root,'assets','public-experience.js'),'utf8');
const bookingHtml=fs.readFileSync(path.join(root,'bronuvannia','index.html'),'utf8');
const adminHtml=fs.readFileSync(path.join(root,'admin','bronuvannia','index.html'),'utf8');
const adminEdge=fs.readFileSync(path.join(root,'supabase','functions','vacleaner-admin-bookings-v3','index.ts'),'utf8');
const settlementModule=fs.readFileSync(path.join(root,'supabase','functions','vacleaner-admin-bookings-v3','settlement.mjs'),'utf8');
const publicReactBundle=fs.readFileSync(path.join(root,'_next','static','chunks','146ntlcv_t6~w.js'),'utf8');
const bookingEdgeV5=fs.readFileSync(path.join(root,'supabase','functions','vacleaner-booking-v5','index.ts'),'utf8');
execFileSync(process.execPath,[path.join(root,'scripts','test-finance.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-deposit-policy.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-stabilization.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-session.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-ux.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-density.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-final-desktop.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-pwa.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-css-architecture.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-operational-health.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-retention.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','check-backend-inventory.mjs')],{stdio:'pipe'});
try{execFileSync('python',['-m','py_compile',path.join(root,'scripts','e2e_smoke.py')],{stdio:'pipe'})}catch{errors.push('Playwright Python source does not compile')}
try{execFileSync('python',['-m','py_compile',path.join(root,'scripts','public_booking_resilience_qa.py')],{stdio:'pipe'})}catch{errors.push('public booking resilience source does not compile')}
const workflow=fs.readFileSync(path.join(root,'.github','workflows','pages.yml'),'utf8');
const playwrightInstall=workflow.indexOf('python -m playwright install --with-deps chromium');
const playwrightRun=workflow.indexOf('npm run test:e2e');
const publicBookingRun=workflow.indexOf('npm run test:public-booking');
const pagesUpload=workflow.indexOf('actions/upload-pages-artifact@v3');
if(playwrightInstall<0||playwrightRun<0||publicBookingRun<0||pagesUpload<0||!(playwrightInstall<playwrightRun&&playwrightRun<publicBookingRun&&publicBookingRun<pagesUpload))errors.push('GitHub Pages deploy is not gated by installed Playwright and public booking resilience QA in the correct order');
if(!workflow.includes('python -m py_compile scripts/e2e_smoke.py'))errors.push('GitHub workflow does not validate browser test source');
if(!workflow.includes('python -m py_compile scripts/public_booking_resilience_qa.py'))errors.push('GitHub workflow does not validate public booking resilience test source');
if(!workflow.includes('npm run test:retention'))errors.push('GitHub workflow does not gate retention rules');
if(!workflow.includes('npm run test:public-booking'))errors.push('GitHub workflow does not gate public booking resilience');
const ciRequirements=fs.readFileSync(path.join(root,'requirements-ci.txt'),'utf8');
if(!/^playwright==\d+\.\d+\.\d+$/m.test(ciRequirements))errors.push('Playwright CI dependency is not pinned');
for(const token of ["reg.scope===ROOT_SCOPE","reg.update()","reg.unregister()"])if(!publicResilience.includes(token))errors.push(`public legacy-SW retirement missing: ${token}`);
if(!bookingHtml.includes(`/assets/public-resilience.js?v=${build}`))errors.push('booking page does not load public resilience runtime');
const businessCopy=[publicBooking,publicExperience,bookingHtml,adminRuntime].join('\n');
const publicExperienceCss=fs.readFileSync(path.join(root,'assets','public-experience.css'),'utf8');
const adminCss=fs.readFileSync(path.join(root,'assets','admin-v250.css'),'utf8');
for(const token of ['.auth-card .field input{font-size:16px}','html.keyboard-open .auth','.app{position:fixed;inset:0;width:auto;height:auto'])if(!adminCss.includes(token))errors.push(`iPhone/mobile CSS hardening missing: ${token}`);
if(adminCss.includes('--pwa-viewport-height')||adminCss.includes('--pwa-viewport-top'))errors.push('legacy app-shell visualViewport CSS variables remain');
if(adminCss.includes('.app{position:fixed;inset:0;width:100%;height:100dvh'))errors.push('mobile app shell is over-constrained by 100dvh');
if(!adminCss.includes('.app{position:fixed}')||!adminCss.includes('height:100lvh')||!adminCss.includes('html.pwa-standalone .sidebar{position:relative'))errors.push('installed PWA must use the stable intrinsic three-row large-viewport shell');
for(const token of ['iPhone inputs are at least 16px and cannot trigger Safari auto-zoom','outer viewport is locked instead of rubber-band scrolling','keyboard focus does not pan the page shell'])if(!pwaVisualQa.includes(token))errors.push(`iPhone PWA regression test missing: ${token}`);
for(const token of ['lockCalendarScroll','unlockCalendarScroll','root.style.paddingRight'])if(!publicExperience.includes(token))errors.push(`calendar layout lock missing: ${token}`);
if(!publicExperienceCss.includes('html{scrollbar-gutter:stable;}'))errors.push('public stable scrollbar gutter missing');
for(const token of ['color-scheme:dark','appearance:none','input[type="checkbox"]:checked','.switch:has(input:checked)','.field select option'])if(!adminCss.includes(token))errors.push(`admin controls visual missing: ${token}`);
const requiredCopy=[
 'Передоплата 200 грн вноситься після підтвердження заявки, закріплює дату та входить у фінальний взаєморозрахунок.',
 'Новий клієнт надсилає документ менеджеру приватно.',
 'Сплачується під час отримання техніки.',
 'Що потрібно для оформлення',
 'Залоговий платіж',
];
for(const phrase of requiredCopy)if(!businessCopy.includes(phrase))errors.push(`required booking copy missing: ${phrase}`);
for(const phrase of ['базова сума, фактичну фіксує менеджер','Базова сума; фактичну менеджер фіксує при видачі','залог повертається окремо','оплата оренди при видачі','входить у суму оренди','входить у вартість оренди','Поворотний залог'])if(businessCopy.toLowerCase().includes(phrase.toLowerCase()))errors.push(`forbidden financial copy: ${phrase}`);
if(!bookingHtml.includes('7:00–9:30')||!bookingHtml.includes('17:30–20:00'))errors.push('public fallback slots are stale');
if(!adminHtml.includes('Content-Security-Policy'))errors.push('admin CSP is missing');
if(!adminRuntime.includes("SESSION_IDLE_MS=30*24*60*60*1000"))errors.push('trusted-device session expiry is missing');
if(!adminRuntime.includes('primary=state.rememberSession?localStorage:sessionStorage')||!adminRuntime.includes('primary.setItem(SESSION_KEY'))errors.push('persistent/session-only storage modes are incomplete');
if(!adminRuntime.includes('name=\"remember\"')||!adminRuntime.includes('Запам’ятати цей пристрій'))errors.push('trusted-device login option is missing');
if(!adminRuntime.includes('saveSession(d,sessionPersistent())'))errors.push('refreshed token does not preserve session mode');
if(!adminRuntime.includes('safeMarkup(markup)')||!adminRuntime.includes('const escapeHtml='))errors.push('admin output hardening is missing');
if(!adminRuntime.includes('Math.min(8,packetValue()')||!adminRuntime.includes('const value=Math.min(8,digits(form.used))'))errors.push('chemistry packet UI is not limited to 8');
if(adminRuntime.includes('refundAmount:result.refund')||adminRuntime.includes('dueAmount:result.due'))errors.push('client still submits calculated refund or due');
if(!adminRuntime.includes('settlementConfirmed:true')||!adminRuntime.includes('refundPaid:Number(finalFinance.refundAmount||0)>0')||!adminRuntime.includes('duePaid:Number(finalFinance.dueAmount||0)>0'))errors.push('settlement confirmations are incomplete');
if(/refund_amount\s*:\s*cleanInt\(body\.refundAmount|due_amount\s*:\s*cleanInt\(body\.dueAmount/.test(adminEdge))errors.push('edge function stores client refund or due directly');
for(const token of ['settlementConfirmation(body, finance)','status: "completed"','cleanInt(body.usedPackets, packetLimit)'])if(!adminEdge.includes(token))errors.push(`edge settlement guard missing: ${token}`);
for(const token of ['export function settlementFromBooking','export function selectedExtrasAmount','export function settlementConfirmation','Math.min(2, usedPackets)','legacyRefund !== finance.refundAmount','settlement_mismatch'])if(!settlementModule.includes(token))errors.push(`settlement module guard missing: ${token}`);

if(!publicReactBundle.includes('code:"carp_deta"')||!publicReactBundle.includes('Плямовивідник Carp-Deta 30 мл'))errors.push('Carp-Deta is missing from the hydrated public booking bundle');
if(!bookingEdgeV5.includes('selected_items: selected.items.map')||!bookingEdgeV5.includes('db.from("vacleaner_booking_resources").insert(resources)'))errors.push('booking v5 does not persist extras/resources directly');
if(!adminEdge.includes('normalizeSelectedExtras(body.selectedExtras')||!adminEdge.includes('extras_amount: selected.amount'))errors.push('admin v3 does not persist selected extras independently of admin v2');
for(const file of files.filter(f=>f.endsWith('.html'))){
 const rel=path.relative(root,file).replaceAll('\\','/'),html=fs.readFileSync(file,'utf8');
 for(const match of html.matchAll(/(?:src|href)=["'](\/(?:assets|admin)\/[^"'?#]+)[^"']*["']/g)){
  const local=path.join(root,match[1].replace(/^\//,''));
  if(!fs.existsSync(local))errors.push(`missing local reference ${match[1]} in ${rel}`);
 }
}
if(!e2eSmoke.includes('Selecting equipment does not auto-select dates')||!e2eSmoke.includes('Deposit stays unknown until dates are selected'))errors.push('date/deposit preselection regression test missing');
if(publicReactBundle.includes('b(c(t)),f(c(d(t,1)))'))errors.push('booking page silently preselects dates');
if(!publicExperience.includes('if(!dates.start||!dates.finish)return 0'))errors.push('public deposit must stay unknown until both dates are selected');
for(const fn of ['vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
 const cfg=fs.readFileSync(path.join(root,'supabase','functions',fn,'config.ts'),'utf8');
 if(!cfg.includes('export function rentalDays')||!cfg.includes('export function isWeekendDeposit'))errors.push(`${fn} does not share paid-day weekend deposit policy`);
}
if(!bookingEdgeV5.includes('depositAmount(productCode, startDate, returnDate, pickupWindow, returnWindow'))errors.push('booking v5 deposit does not include pickup/return windows');
if(!adminEdge.includes('calculateDeposit(productCode, period.startDate, period.returnDate, period.pickupWindow, period.returnWindow'))errors.push('admin v3 deposit does not include pickup/return windows');
if(e2eSmoke.includes('Weekend deposit updates to 2000 UAH'))errors.push('stale Saturday→Sunday 2000 UAH E2E rule still present');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Build ${release.version} passed ${files.length} file checks. Shared config ${expected}.`);
