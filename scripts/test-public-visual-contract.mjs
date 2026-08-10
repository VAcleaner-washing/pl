import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const read=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');
const routes=[
  '', 'tekhnika/karcher-puzzi-8-1','rishennia','rishennia/textile','rishennia/steam','rishennia/mattress','rishennia/windows',
  'komplekty','yak-tse-pratsiuie','vidhuky','pidbir','bronuvannia','faq','kontakty','umovy',
  'dostavka','pro-nas','blog','blog/yak-pochystyty-matrats-pislia-dytyny',
  'blog/yak-vyvesty-plyamu-z-dyvana','blog/skilky-sokhne-dyvan-pislia-chyshchennia',
  'polityka-konfidenciynosti'
];
const expectedNav=[
  ['Що почистити','/rishennia/'],['Комплекти','/komplekty/'],['Як це працює','/yak-tse-pratsiuie/'],
  ['Відгуки','/vidhuky/'],['Підбір','/pidbir/']
];
let passed=0;
const failed=[];
function check(ok,label){if(ok){passed++;console.log(`PASS: ${label}`)}else{failed.push(label);console.error(`FAIL: ${label}`)}}
function htmlFor(route){return read(route?`${route}/index.html`:'index.html')}
function navPairs(html){
  const m=html.match(/<nav[^>]*class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/i);
  if(!m)return [];
  return [...m[1].matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map(x=>[
    x[2].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(),x[1]
  ]);
}

for(const route of routes){
  const label=route?`/${route}/`:'/';
  const html=htmlFor(route);
  check((html.match(/class="site-header"/g)||[]).length===1,`${label} has exactly one global header`);
  check(JSON.stringify(navPairs(html))===JSON.stringify(expectedNav),`${label} uses the canonical desktop nav`);
  const headerCtaTag=(html.match(/<a[^>]*class="header-cta"[^>]*>/i)||html.match(/<a[^>]*href="\/bronuvannia\/"[^>]*class="header-cta"[^>]*>/i)||[''])[0];
  const expectedBookingHref=route==='tekhnika/karcher-puzzi-8-1'?'/bronuvannia/?product=puzzi':'/bronuvannia/';
  check(headerCtaTag.includes(`href="${expectedBookingHref}"`),`${label} header CTA points to the correct booking context`);
  check(!/(>\s*Процес\s*<|>\s*FAQ\s*<)/.test((html.match(/<nav[^>]*class="desktop-nav"[\s\S]*?<\/nav>/)||[''])[0]||''),`${label} has no stale header labels`);
  check(!html.includes('↗'),`${label} contains no browser/emoji external-arrow glyph`);
  check((html.match(/<footer[^>]*class="v4-footer"/g)||[]).length===1,`${label} has exactly one canonical footer`);
}

const experienceCss=read('assets/public-experience.css');
const siteCss=read('assets/site-v400.css');
const experienceJs=read('assets/public-experience.js');
const quizJs=read('assets/public-quiz.js');
const bookingSlots=read('assets/public-booking-slots.js');
const siteJs=read('assets/site-v400.js');
const generator=read('scripts/make_v400.py');

check(experienceCss.includes('html.vq-standalone-page.vq-ready .inner-hero'),'/pidbir/ hides fallback only after quiz readiness');
check(experienceCss.includes('html.vq-standalone-page.vq-ready body{overflow:hidden}'),'/pidbir/ locks page scroll only after quiz readiness');
check(quizJs.includes("document.documentElement.classList.add('vq-ready')"),'/pidbir/ marks quiz ready only after openQuiz');
check(experienceCss.includes('html.vx-booking-standalone-mobile main>.booking-form~*:not(.booking-mobile-summary){display:none}'),'mobile booking isolates the four-step wizard from footer/reviews');
check(/if\(index>=0&&prerequisite\)setMobileBookingStep\(index,\{scroll:true\}\)/.test(experienceJs) && experienceJs.includes("index===3&&liveButtons[2]?.classList.contains('is-complete')"),'mobile booking progress buttons switch only to unlocked steps');
check(bookingSlots.includes("'Залоговий платіж — після вибору дат'"),'mobile booking uses a short non-truncated deposit hint');
check(siteCss.includes('@media (min-width:901px) and (max-width:1180px)') && siteCss.includes('.inner-hero.v4-inner-hero'),'small-desktop editorial heroes have a dedicated safe grid');
check(/\.v4-service-grid\{[^}]*background:#f4efe8;[^}]*color:#111315/.test(siteCss),'light service cards explicitly restore dark text contrast');
check(!siteJs.includes('function patchNav('),'runtime no longer rewrites the global navigation after first paint');
check(!siteJs.includes('[120,500,1200,2400]'),'runtime no longer uses delayed header/footer patch timers');
check(!generator.includes('function patchNav('),'historical v4 generator cannot reintroduce runtime nav rewriting');
check(!generator.includes('[120,500,1200,2400]'),'historical v4 generator cannot reintroduce delayed patch timers');
check(!generator.includes('VA HOME ↗'),'historical v4 generator cannot reintroduce emoji arrow glyphs');
check(generator.includes('color:#111315') && generator.includes('small-desktop editorial hero safety'),'historical v4 generator preserves current public visual hardening');

const hydratedChunks=['_next/static/chunks/01pb0x0z72e50.js','_next/static/chunks/146ntlcv_t6~w-v4016.js','_next/static/chunks/0x2bx8kerxrmz.js'];
for(const chunk of hydratedChunks){
  const text=read(chunk);
  check(!text.includes('children:"Процес"') && !text.includes('children:"Рішення"') && !text.includes('children:"Умови сервісу"'),`${chunk} contains no stale hydrated footer labels`);
}

const publicFiles=routes.map(r=>r?`${r}/index.html`:'index.html');
const stalePrice=publicFiles.filter(f=>read(f).includes('350–3500 UAH'));
check(stalePrice.length===0,'public structured data no longer advertises the stale 350 UAH minimum');
const versionedFavicons=publicFiles.filter(f=>/(?:favicon\.(?:ico|svg)|apple-touch-icon\.png)\?v=/.test(read(f)));
check(versionedFavicons.length===0,'public favicon URLs are stable and unversioned');

const puzziHtml=read('tekhnika/karcher-puzzi-8-1/index.html');
const puzziCss=read('assets/puzzi-seo.css');
check(!puzziHtml.includes('"streetAddress"'),'Puzzi landing does not publish a fixed pickup address');
check(puzziHtml.includes('width="1086" height="1448"'),'Puzzi hero image reserves its intrinsic aspect ratio');
check((puzziHtml.match(/class="mobile-booking"/g)||[]).length===1 && puzziHtml.includes('<div class="mobile-booking"><a href="/bronuvannia/?product=puzzi">'),'Puzzi landing includes one product-aware mobile booking bar');
check(/\.puzzi-hero-visual img\{[^}]*inset:-1px;[^}]*width:calc\(100% \+ 2px\);[^}]*max-width:none;[^}]*height:calc\(100% \+ 2px\);[^}]*object-fit:cover/.test(puzziCss),'Puzzi hero image covers the complete bordered visual panel');

console.log(JSON.stringify({passed,failed,status:failed.length?'failed':'passed'}));
if(failed.length)process.exit(1);
