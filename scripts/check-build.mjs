import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),release=JSON.parse(fs.readFileSync('release.json','utf8')),build=String(release.build);
const ignoredDirs=new Set(['.git','.venv','.pw-browsers','dist','test-results','pwa-test-results','density-test-results','final-desktop-test-results','final-desktop-audit','playwright-report','__pycache__']);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>ignoredDirs.has(entry.name)?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const files=walk(root),errors=[];
const retiredChunkNames=['146ntlcv_t6~w-v4016.js','01pb0x0z72e50.js','09z99witl-xo-.js'];
for(const file of files.filter(f=>/\.(?:html|txt|mjs|js|py)$/.test(f)&&!f.endsWith(`${path.sep}scripts${path.sep}check-build.mjs`))){
 const source=fs.readFileSync(file,'utf8');
 for(const stale of retiredChunkNames)if(source.includes(stale))errors.push(`stale cacheable chunk reference ${stale}: ${path.relative(root,file)}`);
}
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
 let inlineIndex=0;
 for(const match of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  inlineIndex+=1;
  const attrs=match[1]||'',code=(match[2]||'').trim();
  if(!code||/\bsrc\s*=/.test(attrs)||/\btype\s*=\s*["']application\/(?:ld\+json|json)["']/i.test(attrs))continue;
  try{new vm.Script(code,{filename:`${rel}#inline-${inlineIndex}`});}
  catch(error){errors.push(`inline JS syntax: ${rel}#${inlineIndex}: ${error.message}`);}
 }
 for(const m of s.matchAll(/\/assets\/(?:vacleaner-core|public-experience|public-catalog|public-booking-slots|public-resilience|admin-v250|public-fixes|mobile-home-fix|site-v400)\.(?:js|css)\?v=([^"']+)/g))if(m[1]!==build)errors.push(`asset version ${m[1]} in ${rel}`);
 const hasCore=/vacleaner-core\.js/.test(s), needsCore=rel==='bronuvannia/index.html'||rel==='pidbir/index.html'||rel.startsWith('admin/');
 if(hasCore!==needsCore)errors.push(`shared core route mismatch: ${rel}`);
 if(rel!=='bronuvannia/index.html'&&/public-catalog\.js/.test(s))errors.push(`catalog runtime on ${rel}`);
}
// Puzzi SEO landing / Search Console / favicon contract (v4.0.19).
const puzziSeoPath=path.join(root,'tekhnika','karcher-puzzi-8-1','index.html');
if(!fs.existsSync(puzziSeoPath))errors.push('Puzzi SEO landing is missing');
else{
 const seo=fs.readFileSync(puzziSeoPath,'utf8');
 for(const token of ['<title>Оренда миючого пилососа Kärcher Puzzi 8/1 у Полтаві | VAcleaner</title>','rel="canonical" href="https://vacleaner.pp.ua/tekhnika/karcher-puzzi-8-1/"','"@type":"Service"','"@type":"FAQPage"','"@type":"BreadcrumbList"','700 грн','800 грн','8 порцій','Залоговий платіж','/bronuvannia/?product=puzzi','/rishennia/textile/','width="1086" height="1448"','class="puzzi-cleaning-process"','Сухе прибирання','Розчин і плями','Промивання','Збір вологи','Сушіння й догляд'])if(!seo.includes(token))errors.push(`Puzzi SEO landing contract missing: ${token}`);
 if((seo.match(/class="mobile-booking"/g)||[]).length!==1)errors.push('Puzzi landing must include exactly one mobile booking bar');
 if(seo.includes('"streetAddress"'))errors.push('Puzzi landing must not publish a fixed pickup address');
}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
if(!sitemap.includes('https://vacleaner.pp.ua/tekhnika/karcher-puzzi-8-1/'))errors.push('Puzzi SEO landing missing from sitemap');
const googleVerify=path.join(root,'google23d85db681a5b7ee.html');
if(!fs.existsSync(googleVerify)||fs.readFileSync(googleVerify,'utf8').trim()!=='google-site-verification: google23d85db681a5b7ee.html')errors.push('Google site verification file missing or invalid');
for(const file of files.filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(file,'utf8');if(/(?:favicon\.(?:ico|svg)|apple-touch-icon\.png)\?v=/.test(html))errors.push(`versioned favicon URL: ${path.relative(root,file)}`)}
const siteRuntime=fs.readFileSync(path.join(root,'assets','site-v400.js'),'utf8');
if(!siteRuntime.includes("'/tekhnika/karcher-puzzi-8-1/'")||!siteRuntime.includes('v4-inline-tech-link'))errors.push('textile → Puzzi contextual internal link is missing');
for(const token of ['Позначка означає: відгук пов’язаний із фактичним бронюванням VAcleaner.','contextualPickerBridges','mobileStickyCta'])if(!siteRuntime.includes(token))errors.push(`public UX bridge missing: ${token}`);
if(siteRuntime.includes('v4-booking-picker-hint'))errors.push('duplicate booking picker hint must not be injected; public-quiz already owns this entry point');
if(siteRuntime.includes("if(path==='/'){"))errors.push('duplicate home picker bridge must not be injected; the home Smart Guide already owns this flow');
const homeSmartGuide=fs.readFileSync(path.join(root,'assets','home-smart-guide-v4149.js'),'utf8');
if(homeSmartGuide.includes("section.className='vq-guide'")||homeSmartGuide.includes("insertAdjacentElement('beforebegin'"))errors.push('home Smart Guide must not inject a second full picker section above task solutions');
if(!homeSmartGuide.includes('a.v21-secondary[href=\"/pidbir/\"]')||!homeSmartGuide.includes('data-vx-lazy-quiz'))errors.push('home Smart Guide must enhance the existing picker CTA without duplicating content');
const homePickerChunk=fs.readFileSync(path.join(root,'_next','static','chunks','01pb0x0z72e41.js'),'utf8');
for(const token of ['Не знаєте, що підійде?','Опишіть задачу одним повідомленням — без бронювання й зобов’язань.','Запитати менеджера'])if(!homePickerChunk.includes(token))errors.push(`home non-duplicate helper parity missing: ${token}`);
for(const token of ['Кілька задач одразу?','Підібрати за 30 сек'])if(homePickerChunk.includes(token))errors.push(`duplicate home picker copy leaked into hydrated chunk: ${token}`);
const bookingGuide=fs.readFileSync(path.join(root,'assets','booking-hardening-v4144.js'),'utf8');
for(const token of ['Що плануєте почистити?','Пройти точний підбір за 30 секунд →','Врахуємо тип забруднення, плями, запах і кількість зон.'])if(!bookingGuide.includes(token))errors.push(`booking task/quiz positioning missing: ${token}`);
const bookingEntry=fs.readFileSync(path.join(root,'assets','booking-entry-v4149.js'),'utf8');
if(bookingEntry.includes('function injectHelp')||bookingEntry.includes("box.className='vq-booking-help'"))errors.push('legacy duplicate quiz banner is still injected above booking task choice');
const solutionsPicker=fs.readFileSync(path.join(root,'rishennia','__next.rishennia.__PAGE__.txt'),'utf8');
for(const token of ['Кілька задач одразу?','Підібрати за 30 сек','/pidbir/'])if(!solutionsPicker.includes(token))errors.push(`solutions picker server parity missing: ${token}`);
const siteV400Css=fs.readFileSync(path.join(root,'assets','site-v400.css'),'utf8');
for(const token of ['html.v4-mobile-cta-visible .mobile-booking','grid-template-columns:minmax(0,2.15fr) minmax(92px,.85fr)','v4-review-proof__mark'])if(!siteV400Css.includes(token))errors.push(`public UX CSS missing: ${token}`);


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
if(!fs.existsSync(path.join(root,'supabase','functions','vacleaner-status-correction-v1','index.ts')))errors.push('status correction Edge source is missing');
if(!fs.existsSync(path.join(root,'supabase','functions','vacleaner-customer-documents-v1','index.ts')))errors.push('customer documents Edge source is missing');
const sw=fs.readFileSync(path.join(root,'admin','sw.js'),'utf8');if(!sw.includes(`vacleaner-manager-${build}`))errors.push('service worker cache version mismatch');
const adminSw=fs.readFileSync(path.join(root,'admin','sw.js'),'utf8');

if(!adminSw.includes("if(data.title==='Нове бронювання VAcleaner')return"))errors.push('legacy technical booking push is not suppressed in the PWA service worker');
const adminRuntime=fs.readFileSync(path.join(root,'assets','admin-v250.js'),'utf8');
const pwaVisualQa=fs.readFileSync(path.join(root,'scripts','pwa_visual_qa.py'),'utf8');

const e2eSmoke=fs.readFileSync(path.join(root,'scripts','e2e_smoke.py'),'utf8');
for(const token of ['def normalized_text(', 'def choose_booking_slot(', 'def select_uses_dark_theme(', 'class QuietStaticHandler(', 'def static_server(', 'ThreadingHTTPServer', 'checks.capture_failure(page, "public-desktop-failure", runtime_events)', 'page.on("pageerror"', 'page.on("requestfailed"', 'hero_limit = min(760, viewport_height * 0.90)', '#bookingForm header [data-close]', 'Saturday morning to Sunday morning keeps 1000 UAH deposit', 'Saturday evening to Sunday evening keeps 1000 UAH deposit', 'Friday evening to Sunday morning uses 2000 UAH weekend deposit', 'Friday evening to Sunday evening uses 2000 UAH weekend deposit', 'Saturday morning to Monday morning uses 2000 UAH weekend deposit'])if(!e2eSmoke.includes(token))errors.push(`E2E CI hardening missing: ${token}`);
if(e2eSmoke.includes('page.locator("[data-close]").click()'))errors.push('E2E uses ambiguous generic data-close click');
if(e2eSmoke.includes('.select_option('))errors.push('E2E must drive the customer-visible booking slot cards instead of hidden native selects');

if(/visualViewport\?\.addEventListener\('scroll'/.test(adminRuntime))errors.push('iPhone viewport must not resync on visualViewport scroll');
for(const token of ["classList.toggle('keyboard-open'","keepFocusedControlVisible(target)","--keyboard-viewport-height","--keyboard-viewport-top","let pwaKeyboardLatched=false","if(reduced&&focused)pwaKeyboardLatched=true;else if(!reduced)pwaKeyboardLatched=false","const keyboard=Boolean(reduced&&(focused||pwaKeyboardLatched))"])if(!adminRuntime.includes(token))errors.push(`iPhone keyboard runtime hardening missing: ${token}`);
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
if(!bookingHtml.includes('<script id="vac-gtm-bootstrap">')||!bookingHtml.includes('googletagmanager.com/gtm.js?id=')||!bookingHtml.includes("window,document,'script','dataLayer','GTM-KC8FF7FB'"))errors.push('direct /bronuvannia/ load must contain an executable GTM-KC8FF7FB bootstrap');
if(!bookingHtml.includes('if(w.__VAC_GTM_LOADED__)return;w.__VAC_GTM_LOADED__=true'))errors.push('booking GTM bootstrap must guard against duplicate hydration load');
const adminHtml=fs.readFileSync(path.join(root,'admin','bronuvannia','index.html'),'utf8');
const classicAdminPath=path.join(root,'admin','bronuvannia-classic','index.html');
if(!adminHtml.includes('class="glass-test"')||!adminHtml.includes('/assets/admin-glass-test.css')||!adminHtml.includes('/assets/admin-glass-test.js'))errors.push('primary admin route must ship Liquid Glass UI');
if(!fs.existsSync(classicAdminPath))errors.push('classic reserve admin route is missing');
else{const classicAdminHtml=fs.readFileSync(classicAdminPath,'utf8');if(classicAdminHtml.includes('admin-glass-test.css')||classicAdminHtml.includes('class="glass-test"'))errors.push('classic reserve must remain isolated from Liquid Glass');}
const adminManifest=JSON.parse(fs.readFileSync(path.join(root,'admin','manifest.webmanifest'),'utf8'));
if(adminManifest.start_url!=='/admin/bronuvannia/'||adminManifest.id!=='/admin/')errors.push('primary PWA manifest must open Liquid Glass admin route');
const classicManifestPath=path.join(root,'admin','manifest-classic.webmanifest');
if(!fs.existsSync(classicManifestPath))errors.push('classic reserve manifest is missing');
else if(JSON.parse(fs.readFileSync(classicManifestPath,'utf8')).start_url!=='/admin/bronuvannia-classic/')errors.push('classic reserve manifest start_url is invalid');
const adminEdge=fs.readFileSync(path.join(root,'supabase','functions','vacleaner-admin-bookings-v3','index.ts'),'utf8');
const statusEdge=fs.readFileSync(path.join(root,'supabase','functions','vacleaner-status-correction-v1','index.ts'),'utf8');
const settlementModule=fs.readFileSync(path.join(root,'supabase','functions','vacleaner-admin-bookings-v3','settlement.mjs'),'utf8');
const publicReactBundle=fs.readFileSync(path.join(root,'_next','static','chunks','146ntlcv_t6~w-v4041.js'),'utf8');
const publicChunkDir=path.join(root,'_next','static','chunks');
const publicChunkCorpus=fs.readdirSync(publicChunkDir).filter(name=>name.endsWith('.js')).map(name=>fs.readFileSync(path.join(publicChunkDir,name),'utf8')).join('\n');
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
execFileSync(process.execPath,[path.join(root,'scripts','test-analytics-decision.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-growth-content.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-financial-control.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-package-language.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-v4-1-60-home-package-rhythm.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-retention.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','test-smart-guide-logic.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'scripts','check-backend-inventory.mjs')],{stdio:'pipe'});
try{execFileSync('python',['-m','py_compile',path.join(root,'scripts','e2e_smoke.py')],{stdio:'pipe'})}catch{errors.push('Playwright Python source does not compile')}
try{execFileSync('python',['-m','py_compile',path.join(root,'scripts','public_booking_resilience_qa.py')],{stdio:'pipe'})}catch{errors.push('public booking resilience source does not compile')}
const workflow=fs.readFileSync(path.join(root,'.github','workflows','pages.yml'),'utf8');
const playwrightInstall=workflow.indexOf('python -m playwright install --with-deps chromium');
const playwrightRun=workflow.indexOf('npm run test:e2e');
const publicBookingRun=workflow.indexOf('npm run test:public-booking');
const pagesUpload=workflow.indexOf('actions/upload-pages-artifact@v3');
const hasSplitGates=/^\s*validate:/m.test(workflow)&&/^\s*browser:/m.test(workflow)&&workflow.includes('needs: validate')&&workflow.includes('needs: [validate, browser]');
const hasAggregateGate=workflow.includes('continue-on-error: true')&&workflow.includes('Browser QA aggregate gate');
if(playwrightInstall<0||playwrightRun<0||publicBookingRun<0||pagesUpload<0||!hasSplitGates||!hasAggregateGate)errors.push('GitHub Pages deploy is not gated by split static/browser QA with an aggregate browser failure gate');
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
if(/html\.keyboard-open \.modal-card\{[^}]*height:var\(--keyboard-viewport-height/.test(adminCss))errors.push('mobile modal geometry must not be resized by visualViewport keyboard state');
for(const token of ['.auth-card .field input{font-size:16px}','html.keyboard-open .auth','.app{position:static;inset:auto;width:100%','.mobile-nav{\n    position:fixed;z-index:100;right:0;bottom:0;left:0'])if(!adminCss.includes(token))errors.push(`iPhone/mobile CSS hardening missing: ${token}`);
if(adminCss.includes('--pwa-viewport-height')||adminCss.includes('--pwa-viewport-top'))errors.push('legacy app-shell visualViewport CSS variables remain');
if(adminCss.includes('.app{position:fixed;inset:0;width:100%;height:100dvh'))errors.push('mobile app shell is over-constrained by 100dvh');
if(!adminCss.includes('.sidebar{display:none}')||!adminCss.includes('.mobile-nav{\n    position:fixed;z-index:100;right:0;bottom:0;left:0')||adminCss.includes('html.pwa-standalone .mobile-nav{position:relative'))errors.push('mobile bottom navigation must be a dedicated root-fixed element, separate from the desktop sidebar');
if(!adminCss.includes('html.keyboard-open .mobile-nav{opacity:0;visibility:hidden;pointer-events:none')||!adminCss.includes('html.keyboard-open .main{bottom:0;scroll-padding-bottom:24px}'))errors.push('keyboard-safe mobile contract missing: existing bottom nav must be hidden out of the working viewport while main gets the freed space');
if(!adminCss.includes('.mobile-nav svg{width:19px;height:19px')||!adminCss.includes('fill:none;stroke:currentColor'))errors.push('mobile bottom-nav icons must inherit currentColor and never render as black fills');
if(!adminCss.includes('.mobile-more-menu{position:fixed')||adminRuntime.includes('mobile-more-backdrop'))errors.push('mobile More menu must use the compact VA HOME-style popover, not a fullscreen backdrop sheet');
if(adminCss.includes('html{width:100%;height:100%;overflow:hidden;scrollbar-gutter:auto;overscroll-behavior:none}'))errors.push('mobile dashboard html root must not be overflow-locked');
if(!adminCss.includes('html{width:100%;height:100%;min-height:100%;overflow-x:clip;overflow-y:visible')||!adminCss.includes('body{position:static;inset:auto;width:100%;height:100%;min-height:100%;overflow:visible'))errors.push('mobile root viewport contract is missing');
if(!adminRuntime.includes("classList.toggle('pwa-browser',!standalone)")||!adminCss.includes('html.pwa-browser,html.pwa-browser body{height:100dvh;min-height:0;max-height:100dvh;overflow:hidden}')||!adminCss.includes('html.pwa-browser #adminMount,html.pwa-browser .app{height:100%;min-height:0;max-height:100%;overflow:hidden}'))errors.push('mobile Safari browser-mode root lock is missing or not isolated from standalone PWA');
if(!adminHtml.includes('apple-mobile-web-app-capable')||!adminHtml.includes('apple-mobile-web-app-status-bar-style\" content=\"black\"')||adminHtml.includes('black-translucent'))errors.push('admin standalone iOS metadata must use opaque black status-bar mode, not black-translucent');
if(!publicExperienceCss.includes('.final-cta-orbit{pointer-events:none}'))errors.push('decorative public CTA orbits must not intercept clicks');
if(!publicExperienceCss.includes('body:has(.mobile-menu.is-open) .mobile-booking{display:none}'))errors.push('public sticky CTA must hide while mobile navigation is open');
if(!businessCopy.includes('У подарунок — будь-який аромадифузор VA HOME з колекції Entry'))errors.push('HOME RESET Entry diffuser gift copy is missing');
if(!publicExperience.includes('HOME_RESET_GIFT_URL')||!publicExperience.includes('enhanceHomeResetGift'))errors.push('HOME RESET gift is not hydration-safe');
if(!publicExperience.includes("HOME_RESET_GIFT_URL='https://vahome.com.ua/catalog?collection=entry'"))errors.push('HOME RESET gift must preserve the VA HOME Entry collection deep-link');
if(!publicExperience.includes('enhanceCarePolicy')||!publicExperience.includes('За 300 оренд нам ще не доводилося штрафувати клієнтів за техніку.'))errors.push('Public equipment care / responsibility FAQ policy is missing');
if(!publicExperience.includes('Чистота після використання')||!publicExperience.includes('Природний знос або технічна несправність'))errors.push('Public return cleanliness and non-fault malfunction guidance is missing');
if(!publicExperienceCss.includes('.vx-care-policy{')||!publicExperienceCss.includes('.vx-care-policy__grid{display:grid'))errors.push('Public care policy visual is missing');
if(!publicExperienceCss.includes('.home-v21 .v21-package-grid h3{')||!publicExperienceCss.includes('min-height:2em'))errors.push('Home package cards must reserve a shared two-line desktop title zone');
if(!publicExperienceCss.includes('.package-page-grid .package-price{justify-content:center;text-align:center}'))errors.push('Package page prices must be horizontally centered');
if(!adminCss.includes('.calendar-grid{grid-template-columns:repeat(3,minmax(0,1fr))}'))errors.push('Desktop calendar grid must use minmax(0,1fr) containment');
if(!adminCss.includes('.day-card .day-labels,.day-card .day-row{grid-template-columns:minmax(76px,1.15fr) repeat(2,minmax(0,1fr));width:100%;min-width:0}'))errors.push('Desktop calendar rows must use shrinkable slot columns');

if(!publicExperienceCss.includes('@media(min-width:1051px){')||!publicExperienceCss.includes('.package-page-grid .package-card-large h2{min-height:2em}'))errors.push('Desktop package cards must reserve a shared two-line title zone so all following sections align');
if(!publicExperienceCss.includes('.package-card.featured .vx-home-reset-gift{position:absolute'))errors.push('HOME RESET gift must have a dedicated non-overlapping featured-card layout');

if(!publicExperience.includes('Фінальний штрих — аромадифузор VA HOME · Entry у подарунок'))errors.push('HOME RESET real-plan finale must mention the VA HOME diffuser gift');
if(!publicExperienceCss.includes('.vx-proof__actions .vx-proof__cta{-webkit-appearance:none;appearance:none')||!publicExperienceCss.includes('-webkit-text-fill-color:#15110c'))errors.push('Instagram review collection CTA must not fall back to Safari browser-blue styling');
if(!publicReactBundle.includes('event:"generate_lead"')||!publicReactBundle.includes('currency:"UAH"')||!publicReactBundle.includes('s.dataLayer=s.dataLayer||[]')||!publicReactBundle.includes('value:Number(leadValue||0)')||!publicReactBundle.includes('leadValue=n?.estimate?.totalAmount??K?.totalAmount??0'))errors.push('successful public booking must initialize dataLayer and push GA4 generate_lead with backend UAH value after backend success');
if(publicReactBundle.includes('booking_request_created'))errors.push('legacy booking_request_created event remains instead of recommended generate_lead');
if(!publicReactBundle.includes('contact_click')||!publicReactBundle.includes('contact_method:i||void 0'))errors.push('booking bundle Instagram/Telegram/phone clicks must push normalized contact_click events');
if(/contact_(?:instagram|telegram|phone)/.test(publicChunkCorpus))errors.push('legacy per-channel contact events remain in public Next chunks; use contact_click + contact_method');
if((publicChunkCorpus.match(/contact_click/g)||[]).length<3)errors.push('contact_click normalization is missing from one or more public Next click-tracking bundles');
if(!publicExperience.includes('normalizeLegacyContactEvents')||!publicExperience.includes("LEGACY_CONTACT_EVENTS={contact_instagram:'instagram',contact_telegram:'telegram',contact_phone:'phone'}")||!publicExperience.includes("event:'contact_click',contact_method:item.contact_method||method"))errors.push('cache-safe legacy contact event normalizer is missing from public runtime');
if(!publicExperience.includes("event:'booking_started'")||!publicExperience.includes('bindBookingAnalytics'))errors.push('public booking_started instrumentation is missing');
if(!publicExperience.includes('setMobileBookingStep(index,{scroll:true})')||!publicExperience.includes('setMobileBookingStep(target,{scroll:true})'))errors.push('mobile booking step changes must restore the form to the fixed-header-safe position');
if(!publicExperienceCss.includes('.booking-form .booking-step{scroll-margin-top:112px}'))errors.push('public booking anchors need fixed-header scroll margin');
const faqHtml=fs.readFileSync(path.join(root,'faq','index.html'),'utf8');
const packagesHtml=fs.readFileSync(path.join(root,'komplekty','index.html'),'utf8');
for(const rel of ['index.html','bronuvannia/index.html','faq/index.html','komplekty/index.html','kontakty/index.html','umovy/index.html','vidhuky/index.html','yak-tse-pratsiuie/index.html','rishennia/index.html','rishennia/textile/index.html','rishennia/mattress/index.html','rishennia/steam/index.html','rishennia/windows/index.html','tekhnika/karcher-puzzi-8-1/index.html','tekhnika/karcher-sc-2-deluxe/index.html','tekhnika/robot-dlia-vikon-abir/index.html']){
 const html=fs.readFileSync(path.join(root,...rel.split('/')),'utf8');
 for(const token of ['"@type":"PostalAddress"','"addressLocality":"Полтава"','"areaServed"','"openingHoursSpecification"','"logo":"https://vacleaner.pp.ua/apple-touch-icon.png"','"image":"https://vacleaner.pp.ua/assets/og-home.png"'])if(!html.includes(token))errors.push(`LocalBusiness SEO field missing in ${rel}: ${token}`);
 if(html.includes('\"streetAddress\":\"вул. Європейська, 146Е\"')||html.includes('\"@type\":\"GeoCoordinates\"'))errors.push(`Variable pickup point must not be published as permanent LocalBusiness address/geo in ${rel}`);
}
if(!faqHtml.includes('"@type":"FAQPage"')||((faqHtml.match(/"@type":"Question"/g)||[]).length<15))errors.push('FAQ page must expose FAQPage JSON-LD for all visible questions');
for(const rel of ['rishennia/textile/index.html','rishennia/mattress/index.html','rishennia/steam/index.html','rishennia/windows/index.html']){
 const html=fs.readFileSync(path.join(root,...rel.split('/')),'utf8');
 if(!html.includes('"@type":"Service"')||!html.includes('"@type":"Offer"')||!html.includes('"priceCurrency":"UAH"'))errors.push(`Service/Offer JSON-LD missing in ${rel}`);
}
if(!packagesHtml.includes('"@type":"Service"')||!packagesHtml.includes('"@type":"OfferCatalog"')||((packagesHtml.match(/"@type":"Offer"/g)||[]).length<5))errors.push('package page must expose Service + OfferCatalog JSON-LD');

for(const rel of ['tekhnika/karcher-sc-2-deluxe/index.html','tekhnika/robot-dlia-vikon-abir/index.html']){
 const html=fs.readFileSync(path.join(root,...rel.split('/')),'utf8');
 for(const token of ['<main class="puzzi-seo-page">','class="puzzi-breadcrumb"','class="puzzi-price"','class="puzzi-glow"','class="puzzi-float p1"','class="puzzi-zone-grid"','class="puzzi-cleaning-steps"','class="puzzi-term-grid"'])if(!html.includes(token))errors.push(`equipment page must reuse the Puzzi visual contract in ${rel}: ${token}`);
 for(const legacy of ['puzzi-breadcrumbs','puzzi-price-row','puzzi-prepay-note','puzzi-visual-label','puzzi-use-grid','puzzi-process-list','puzzi-terms-grid'])if(html.includes(legacy))errors.push(`stale one-off equipment markup remains in ${rel}: ${legacy}`);
}

if(!adminRuntime.includes('vacleaner-status-correction-v1')||!adminRuntime.includes('Виправити статус')||!adminRuntime.includes('invokeStatus({bookingId:b.id,status:target,reason})'))errors.push('admin status correction UI/endpoint binding is missing');
if(!statusEdge.includes('edge:correct_status:')||!statusEdge.includes('vacleaner_apply_reservation')||!statusEdge.includes('admin_users'))errors.push('dedicated server-side controlled status correction is missing');
if(adminEdge.includes('action === "correct_status"'))errors.push('status correction logic is duplicated inside vacleaner-admin-bookings-v3');
if(/\["pending", "waiting_payment", "confirmed", "issued", "completed"\]\.includes\(nextStatus\)/.test(statusEdge))errors.push('manual status correction must never target completed; use settlement flow');
if(!adminCss.includes('--pwa-safe-bottom:env(safe-area-inset-bottom,0px)')||adminCss.includes('--pwa-safe-bottom-raw')||adminCss.includes('min(var(--pwa-safe-bottom-raw),34px)'))errors.push('admin PWA must use the native safe-area contract without the failed v3.0.54 clamp');
if(!adminHtml.includes('<div id="adminMount"></div><nav class="mobile-nav"'))errors.push('mobile navigation must exist in initial admin HTML before JS paint');
if(adminRuntime.includes('<nav class="mobile-nav"'))errors.push('runtime must not recreate the static mobile navigation');
if(adminCss.includes('.app{position:fixed}\n  .topbar,.main{position:absolute}'))errors.push('stale fixed-app mobile override remains');
for(const token of ['iPhone inputs are at least 16px and cannot trigger Safari auto-zoom','outer viewport is locked instead of rubber-band scrolling','keyboard focus does not pan the page shell','opening More temporarily makes More the only active bottom-nav item','Mobile Safari tab: root cannot scroll into blank space'])if(!pwaVisualQa.includes(token))errors.push(`iPhone PWA/mobile regression test missing: ${token}`);
if(!pwaVisualQa.includes('page.wait_for_selector(".upcoming-scope" if width <= 900 else ".booking-list")'))errors.push('PWA visual QA must wait for Upcoming on mobile and Bookings on desktop');
for(const token of ['lockCalendarScroll','unlockCalendarScroll','root.style.paddingRight'])if(!publicExperience.includes(token))errors.push(`calendar layout lock missing: ${token}`);
if(!publicExperienceCss.includes('html{scrollbar-gutter:stable;}'))errors.push('public stable scrollbar gutter missing');
for(const token of ['color-scheme:dark','appearance:none','input[type="checkbox"]:checked','.switch:has(input:checked)','.field select option'])if(!adminCss.includes(token))errors.push(`admin controls visual missing: ${token}`);
for(const token of ['data-discount-choice="p5"','data-discount-choice="p10"','data-discount-choice="fixed"','manualDiscountType','manualDiscountValue','manualDiscountReason',"discountEditorHtml(manualInitial,'return')"])if(!adminRuntime.includes(token))errors.push(`manual discount UX missing: ${token}`);
if(adminRuntime.includes('name="discount10"'))errors.push('legacy browser/switch-only 10% discount control remains in admin UI');
if(adminRuntime.includes('name="applyLoyalty"')||!adminRuntime.includes('class="loyalty-auto-card"'))errors.push('loyalty must be automatic in admin; manager toggle must not disable the earned tier');
if(!adminCss.includes('.discount-choice button,.discount-reason-chips button{-webkit-appearance:none;appearance:none')||!adminCss.includes('.discount-fixed-row input{-webkit-appearance:none;appearance:none')||!adminCss.includes('.discount-reason>input{-webkit-appearance:none;appearance:none'))errors.push('manual discount controls must use custom non-browser visuals');
if(!adminCss.includes('.finance-form .modal-layout{scrollbar-color:')||!adminCss.includes('.finance-form .modal-layout::-webkit-scrollbar-thumb'))errors.push('desktop finance modal custom scrollbar styling is missing');
if(!adminCss.includes('/* v3.0.64 — discount editor stays inside the one mobile shell contract. */'))errors.push('manual discount mobile UX must remain inside the single primary <=900px shell contract');
if(!publicExperience.includes('Програма лояльності')||!publicExperience.includes('0–2 завершені оренди')||!publicExperience.includes('після 3 завершених оренд')||!publicExperience.includes('після 6 завершених оренд'))errors.push('public loyalty program copy is missing or ambiguous');
if(!adminEdge.includes('action === "save_finance"')||!adminEdge.includes('manual_discount: discount.manualType === "none" ? null')||!adminEdge.includes('base_amount: discount.baseAmount'))errors.push('return settlement must support and persist manual discount changes');
const requiredCopy=[
 'Передплата 200 грн вноситься тільки після підтвердження заявки, закріплює дату та входить у загальну вартість.',
 'Новий клієнт надсилає документ менеджеру приватно.',
 'Сплачуєте при отриманні. Після розрахунку повертаємо залишок.',
 'Що потрібно для оформлення',
 'Залоговий платіж',
];
for(const phrase of requiredCopy)if(!businessCopy.includes(phrase))errors.push(`required booking copy missing: ${phrase}`);
for(const phrase of ['базова сума, фактичну фіксує менеджер','Базова сума; фактичну менеджер фіксує при видачі','залог повертається окремо','оплата оренди при видачі','входить у суму оренди','Поворотний залог'])if(businessCopy.toLowerCase().includes(phrase.toLowerCase()))errors.push(`forbidden financial copy: ${phrase}`);
if(!bookingHtml.includes('08:00–10:00')||!bookingHtml.includes('17:30–20:00')||bookingHtml.includes('7:00–9:30')||bookingHtml.includes('07:00–09:30'))errors.push('public fallback slots are stale');
if(!adminHtml.includes('Content-Security-Policy'))errors.push('admin CSP is missing');
if(!adminRuntime.includes("SESSION_IDLE_MS=30*24*60*60*1000"))errors.push('trusted-device session expiry is missing');
if(!adminRuntime.includes('primary=state.rememberSession?localStorage:sessionStorage')||!adminRuntime.includes('primary.setItem(SESSION_KEY'))errors.push('persistent/session-only storage modes are incomplete');
if(!adminRuntime.includes('name=\"remember\"')||!adminRuntime.includes('Запам’ятати цей пристрій'))errors.push('trusted-device login option is missing');
if(!adminRuntime.includes('saveSession(d,sessionPersistent())'))errors.push('refreshed token does not preserve session mode');
if(!adminRuntime.includes('safeMarkup(markup)')||!adminRuntime.includes('const escapeHtml='))errors.push('admin output hardening is missing');
for(const token of ['DOCUMENT_API','documentUploadHtml','openClientCard','clientRentalHistory',"documentRequest('upload'",'data-client-open'])if(!adminRuntime.includes(token))errors.push(`customer document/client card UX missing: ${token}`);
const documentEdge=fs.readFileSync(path.join(root,'supabase','functions','vacleaner-customer-documents-v1','index.ts'),'utf8');
for(const token of ['vacleaner-client-documents','admin_users','createSignedUrl','createBucket','public: false','MAX_FILE_SIZE'])if(!documentEdge.includes(token))errors.push(`private customer document security missing: ${token}`);
const customerDocumentMigration=fs.readFileSync(path.join(root,'supabase','migrations','20260808221500_vacleaner_customer_document_photos.sql'),'utf8');
for(const token of ['document_photo_path','document_photo_name','document_photo_mime','document_photo_uploaded_at'])if(!customerDocumentMigration.includes(token))errors.push(`customer document migration missing: ${token}`);
if(!adminRuntime.includes('Math.min(8,packetValue()')||!adminRuntime.includes('const value=Math.min(8,digits(form.used))'))errors.push('chemistry packet UI is not limited to 8');
if(adminRuntime.includes('refundAmount:result.refund')||adminRuntime.includes('dueAmount:result.due'))errors.push('client still submits calculated refund or due');
if(!adminRuntime.includes('settlementConfirmed:true')||!adminRuntime.includes('refundPaid:Number(finalFinance.refundAmount||0)>0')||!adminRuntime.includes('duePaid:Number(finalFinance.dueAmount||0)>0'))errors.push('settlement confirmations are incomplete');
if(/refund_amount\s*:\s*cleanInt\(body\.refundAmount|due_amount\s*:\s*cleanInt\(body\.dueAmount/.test(adminEdge))errors.push('edge function stores client refund or due directly');
for(const token of ['settlementConfirmation(body, finance)','status: "completed"','cleanInt(body.usedPackets, packetLimit)'])if(!adminEdge.includes(token))errors.push(`edge settlement guard missing: ${token}`);
for(const token of ['export function settlementFromBooking','export function selectedExtrasAmount','export function settlementConfirmation','Math.min(2, usedPackets)','legacyRefund !== finance.refundAmount','settlement_mismatch'])if(!settlementModule.includes(token))errors.push(`settlement module guard missing: ${token}`);

for(const token of ['code:"spot_lifter"','VA SPOT FIX · 50 мл','code:"stain_exit"','VA STAIN OX · 30 мл'])if(!publicReactBundle.includes(token))errors.push(`stain-care product is missing from the hydrated public booking bundle: ${token}`);
if(publicReactBundle.includes('code:"carp_deta"')||bookingHtml.includes('Carp-Deta'))errors.push('legacy Carp-Deta remains in the public booking experience');
if(!bookingEdgeV5.includes('selected_items: selected.items.map')||!bookingEdgeV5.includes('db.from("vacleaner_booking_resources").insert(resources)'))errors.push('booking v5 does not persist extras/resources directly');
if(!adminEdge.includes('normalizeSelectedExtras(body.selectedExtras')||!adminEdge.includes('extras_amount: selectedAmount'))errors.push('admin v3 does not persist selected extras independently of admin v2');
for(const token of ['payment_mode: "upfront"','selected_items: selectedItems','const selectedAmount = selected.amount'])if(!adminEdge.includes(token))errors.push(`immediate extra-sale settlement guard missing: ${token}`);
for(const token of ['on_open','openedExtraCodes','Пломбу відкрито','Оплата лише при відкритті пломби'])if(adminEdge.includes(token)||adminRuntime.includes(token)||publicExperience.includes(token)||publicReactBundle.includes(token)||bookingHtml.includes(token))errors.push(`obsolete sealed-extra logic remains: ${token}`);
for(const file of files.filter(f=>f.endsWith('.html'))){
 const rel=path.relative(root,file).replaceAll('\\','/'),html=fs.readFileSync(file,'utf8');
 for(const match of html.matchAll(/(?:src|href)=["'](\/(?:assets|admin)\/[^"'?#]+)[^"']*["']/g)){
  const local=path.join(root,match[1].replace(/^\//,''));
  if(!fs.existsSync(local))errors.push(`missing local reference ${match[1]} in ${rel}`);
 }
}
if(!e2eSmoke.includes('Selecting equipment does not auto-select dates')||!e2eSmoke.includes('Deposit stays unknown until dates are selected'))errors.push('date/deposit preselection regression test missing');
for(const token of ['Mobile CTA advances equipment → date','Delivery choice never regresses CTA to date during estimate refresh','Stories checkbox never regresses CTA to date','Extra-item checkbox never regresses CTA to date','Phone entry never regresses CTA to date','Promo entry never regresses CTA to date','Completed contacts expose final submit CTA'])if(!e2eSmoke.includes(token))errors.push(`public booking CTA browser regression missing: ${token}`);
if(publicReactBundle.includes('b(c(t)),f(c(d(t,1)))'))errors.push('booking page silently preselects dates');
if(publicReactBundle.includes('[_,C]=(0,n.useState)("pickup")'))errors.push('public booking must not preselect pickup before step 3');
if(!publicReactBundle.includes('[_,C]=(0,n.useState)("")'))errors.push('public booking fulfillment must start unselected');
if(!publicReactBundle.includes('{label:"До отримання",target:"booking-extras"}'))errors.push('mobile booking CTA must route date → fulfillment before contacts');
for(const token of ['eb=(0,n.useRef)("")','ef=`${e}|${j}|${g}|${v}|${k}`','r=eb.current!==ef','r&&(q("checking"),V(null))','eb.current=ef'])if(!publicReactBundle.includes(token))errors.push(`public booking CTA stability guard missing: ${token}`);
if(publicReactBundle.includes('window.setTimeout(async()=>{q("checking"),W("")'))errors.push('public booking still resets availability to checking on every estimate-only change');
if(!publicReactBundle.includes('className:el&&eo?"is-complete":el&&ei?"is-current":"",onClick:()=>ed("booking-contact")'))errors.push('step 4 progress state must depend on completed fulfillment');
for(const token of ["label.includes('До отримання')","index===3&&liveButtons[2]?.classList.contains('is-complete')","target===3&&liveButtons[2]?.classList.contains('is-complete')"])if(!publicExperience.includes(token))errors.push(`mobile booking step-order guard missing: ${token}`);
if(!publicReactBundle.includes('if(!ei)return void W("Оберіть спосіб отримання.")'))errors.push('public booking submit must reject missing fulfillment');
if(!publicReactBundle.includes('disabled:J||"available"!==B||!D||!ei'))errors.push('public booking desktop submit must stay disabled until fulfillment is chosen');
for(const token of ['body.fulfillment === "delivery" ? "delivery" : body.fulfillment === "pickup" ? "pickup" : ""','!fulfillment || body.privacyAccepted !== true'])if(!bookingEdgeV5.includes(token))errors.push(`booking v5 explicit fulfillment guard missing: ${token}`);
if(!publicExperience.includes('if(!dates.start||!dates.finish)return 0'))errors.push('public deposit must stay unknown until both dates are selected');
for(const fn of ['vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
 const cfg=fs.readFileSync(path.join(root,'supabase','functions',fn,'config.ts'),'utf8');
 if(!cfg.includes('export function rentalDays')||!cfg.includes('export function isWeekendDeposit'))errors.push(`${fn} does not share paid-day weekend deposit policy`);
}
if(!bookingEdgeV5.includes('depositAmount(productCode, startDate, returnDate, pickupWindow, returnWindow'))errors.push('booking v5 deposit does not include pickup/return windows');
if(!adminEdge.includes('calculateDeposit(productCode, period.startDate, period.returnDate, period.pickupWindow, period.returnWindow'))errors.push('admin v3 deposit does not include pickup/return windows');
if(e2eSmoke.includes('Weekend deposit updates to 2000 UAH'))errors.push('stale Saturday→Sunday 2000 UAH E2E rule still present');

// Public chemistry is a presentation contract independent of legacy aliases and backend catalog text.
{
  const booking=fs.readFileSync(path.join(root,'bronuvannia','index.html'),'utf8');
  const react=publicReactBundle;
  const quiz=fs.readFileSync(path.join(root,'assets','public-quiz.js'),'utf8');
  const required=[
    'Професійні засоби',
    'За потреби додайте засоби для плям, запахів або інших поверхонь.',
    'Вони оплачуються окремо й залишаються у вас.',
    'VA SPOT FIX · 50 мл',
    'VA STAIN OX · 30 мл',
    'Shower Care · 250 мл',
    'Soft Degreaser · 250 мл',
    'Grill Force · 250 мл',
    'Scalex Pro · 250 мл',
    'Eco Clean · 250 мл',
    'Glass Perfect Care · 250 мл'
  ];
  for(const token of required){
    if(!booking.includes(token))errors.push(`public booking chemistry copy missing from server HTML: ${token}`);
    if(!react.includes(token))errors.push(`public booking chemistry copy missing from hydrated bundle: ${token}`);
  }
  for(const legacy of ['label:"Універсальний плямовивідник · 50 мл"','label:"Плямовивідник від кави, вина та ягід · 30 мл"']){
    if(react.includes(legacy))errors.push(`legacy chemistry title can flash during hydration: ${legacy}`);
  }
  if(!quiz.includes('<h3>VA SPOT FIX</h3>')||!quiz.includes('<h3>VA STAIN OX</h3>'))errors.push('Smart Guide stain-care cards do not use VA product names as the primary heading');
  if(!react.includes('(T.includes(e.code)?"is-selected ":"")+("spot_lifter"===e.code||"stain_exit"===e.code?"is-va-stain-care":"")'))errors.push('hydrated booking can drop the VA spot-care class when a checkbox is selected');
  const fixes=fs.readFileSync(path.join(root,'assets','public-fixes.css'),'utf8');
  if(!fixes.includes('label.is-va-stain-care.is-selected'))errors.push('selected VA spot-care cards do not have an explicit branded selected-state style');
  const catalog=fs.readFileSync(path.join(root,'assets','public-catalog.js'),'utf8');
  if(!catalog.includes("input.closest('.booking-extras')")||!catalog.includes('requestAnimationFrame(()=>apply(activeCatalog))'))errors.push('public catalog does not restore branded chemistry presentation after React checkbox rerender');
  const expectedChunk=`/_next/static/chunks/146ntlcv_t6~w-v4041.js?v=${release.build}`;
  for(const rel of ['bronuvannia/index.html','bronuvannia/index.txt','bronuvannia/__next.bronuvannia.__PAGE__.txt','bronuvannia/__next._full.txt']){
    const body=fs.readFileSync(path.join(root,rel),'utf8');
    if(!body.includes(expectedChunk))errors.push(`booking React chunk is not cache-busted in ${rel}`);
  }
}

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Build ${release.version} passed ${files.length} file checks. Shared config ${expected}.`);
