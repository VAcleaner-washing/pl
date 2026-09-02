import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();let passed=0;const failed=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));
const ok=(label,cond)=>{if(cond){passed++;console.log('PASS:',label)}else{failed.push(label);console.error('FAIL:',label)}};
const rel=JSON.parse(read('release.json')),pkg=JSON.parse(read('package.json'));
const semverAtLeast=(actual,floor)=>{const a=String(actual).split('.').map(Number),b=String(floor).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true};
ok('release keeps v4.2+ modular architecture baseline',semverAtLeast(rel.version,'4.2.0')&&Number(rel.build)>=4200&&pkg.version===rel.version);
const modules=['assets/public-shared.css','assets/public-booking.css','assets/public-guide.css','assets/public-home.css','assets/public-runtime-loader.js','assets/public-experience-runtime.js','assets/public-booking-route-loader.js','assets/site-attribution.js'];
for(const f of modules)ok(`${f} exists`,exists(f));
const limits={
 'assets/public-shared.css':24*1024,'assets/public-booking.css':30*1024,'assets/public-guide.css':38*1024,'assets/public-home.css':10*1024,
 'assets/public-runtime-loader.js':2*1024,'assets/public-experience-runtime.js':66*1024,'assets/public-booking-route-loader.js':2*1024,'assets/site-attribution.js':5*1024
};
for(const [f,max] of Object.entries(limits))ok(`${f} stays within ${Math.round(max/1024)} KiB`,fs.statSync(path.join(root,f)).size<=max);
const productionCss=['assets/public-shared.css','assets/public-booking.css','assets/public-guide.css','assets/public-home.css'];
const stripCssComments=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const importantCounts=Object.fromEntries(productionCss.map(f=>[f,(stripCssComments(read(f)).match(/!important/g)||[]).length]));
ok('booking/guide/home modules contain no !important',importantCounts['assets/public-booking.css']===0&&importantCounts['assets/public-guide.css']===0&&importantCounts['assets/public-home.css']===0);
ok('public !important debt is reduced to the ten mobile-shell overrides',importantCounts['assets/public-shared.css']<=10&&Object.values(importantCounts).reduce((a,b)=>a+b,0)<=10);
const loader=read('assets/public-runtime-loader.js'),bookingLoader=read('assets/public-booking-route-loader.js'),runtime=read('assets/public-experience-runtime.js'),buildScript=read('scripts/build-pages.mjs');
ok('runtime is route-aware instead of globally eager',loader.includes('needsRuntime=Boolean')&&loader.includes("load('/assets/public-experience-runtime.js'")&&loader.includes("document.querySelector('.booking-form')"));
ok('booking route loader inherits stamped build without hard-coded child versions',bookingLoader.includes("searchParams.get('v')")&&!/booking-(?:hardening|trust)-v\d+\.(?:css|js)\?v=\d+/.test(bookingLoader));
ok('runtime can boot safely when lazy-loaded after DOMContentLoaded',runtime.includes('const bootExperience=()=>')&&runtime.includes("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootExperience"));
ok('runtime no longer embeds historical booking hardening/trust loaders',!runtime.includes('v4.1.44 booking hardening route loader')&&!runtime.includes('v4.1.45 trust & rules route loader'));
ok('legacy monoliths are source-only and excluded from Pages artifact',buildScript.includes("'assets/public-experience.css'")&&buildScript.includes("'assets/public-experience.js'"));
const ignoredDirs=new Set(['dist','node_modules','.venv','.pw-browsers','.pages-artifact','test-results','playwright-report']);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{
 if(e.isDirectory()&&(ignoredDirs.has(e.name)||e.name.endsWith('-test-results')))return [];
 return e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)];
});
const htmlFiles=walk(root).filter(f=>f.endsWith('.html')&&!f.includes(`${path.sep}dist${path.sep}`));
const publicHtml=htmlFiles.filter(f=>{const rel=path.relative(root,f).replaceAll('\\','/');return !rel.startsWith('admin/')&&!/^google[^/]*\.html$/i.test(rel);});
const stale=publicHtml.filter(f=>/\/assets\/public-experience\.(?:css|js)(?:\?v=[^"']+)?/.test(fs.readFileSync(f,'utf8')));
ok('no public HTML route references legacy public-experience monoliths',stale.length===0);
const home=read('index.html'),booking=read('bronuvannia/index.html'),quiz=read('pidbir/index.html'),contacts=read('kontakty/index.html'),article=read('blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html');
ok('home gets shared + guide + home modules',home.includes('/assets/public-shared.css')&&home.includes('/assets/public-guide.css')&&home.includes('/assets/public-home.css'));
ok('booking gets shared + guide + booking modules and route loader',booking.includes('/assets/public-shared.css')&&booking.includes('/assets/public-guide.css')&&booking.includes('/assets/public-booking.css')&&booking.includes('/assets/public-runtime-loader.js'));
ok('standalone quiz gets guide styles but no booking/home module',quiz.includes('/assets/public-guide.css')&&!quiz.includes('/assets/public-booking.css')&&!quiz.includes('/assets/public-home.css'));
ok('simple contacts route stays on shared CSS only',contacts.includes('/assets/public-shared.css')&&!contacts.includes('/assets/public-booking.css')&&!contacts.includes('/assets/public-guide.css')&&!contacts.includes('/assets/public-home.css'));
ok('editorial article stays on shared CSS only',article.includes('/assets/public-shared.css')&&!article.includes('/assets/public-booking.css')&&!article.includes('/assets/public-home.css'));
ok('site attribution is public-wide while booking funnel analytics is booking-only',publicHtml.every(f=>fs.readFileSync(f,'utf8').includes('/assets/site-attribution.js'))&&booking.includes('/assets/booking-funnel-analytics.js')&&publicHtml.filter(f=>f!==path.join(root,'bronuvannia/index.html')).every(f=>!fs.readFileSync(f,'utf8').includes('/assets/booking-funnel-analytics.js')));

const canonicalDeliveryFaq='Так. Полтава, Розсошенці, Щербані та Горбанівка — 250 грн у два боки. Інше передмістя — від 350 грн; точну суму підтвердимо до передоплати.';
const fullDeliveryFaqSurfaces={
  home,
  homeHydrated:read('_next/static/chunks/01pb0x0z72e41.js'),
  faq:read('faq/index.html'),
  puzzi:read('tekhnika/karcher-puzzi-8-1/index.html'),
  sc2:read('tekhnika/karcher-sc-2-deluxe/index.html'),
  robot:read('tekhnika/robot-dlia-vikon-abir/index.html'),
};
ok('full delivery FAQ copy stays synchronized across home, FAQ and equipment pages',Object.values(fullDeliveryFaqSurfaces).every(value=>value.includes(canonicalDeliveryFaq)));
const deliveryPage=read('dostavka/index.html');
ok('delivery page carries the same suburb promise before prepayment',deliveryPage.includes('Полтава, Розсошенці, Щербані та Горбанівка — 250 грн у два боки')&&deliveryPage.includes('Інше передмістя — від 350 грн')&&deliveryPage.includes('Точну суму підтвердимо до передоплати'));
const staleFullDeliveryAnswers=[
  'Доставка в межах Полтави — 250 грн за привезення техніки до вас і повернення назад',
  'Доставка по Полтаві до вас і назад коштує 250 грн; також доступний самовивіз',
  'Доставка до вас і назад коштує 250 грн; також доступний самовивіз',
  'Актуальну вартість сайт показує під час оформлення',
];
ok('no full FAQ surface hides suburb pricing behind a Poltava-only answer',Object.values(fullDeliveryFaqSurfaces).every(value=>staleFullDeliveryAnswers.every(stale=>!value.includes(stale))));
const admin=read('admin/bronuvannia/index.html');
ok('admin remains isolated from all v4.2 public modules',!/(public-(?:shared|booking|guide|home)\.css|public-runtime-loader\.js|public-experience-runtime\.js|site-attribution\.js)/.test(admin));
console.log(JSON.stringify({passed,failed,status:failed.length?'failed':'passed',importantCounts},null,2));
process.exit(failed.length?1:0);
