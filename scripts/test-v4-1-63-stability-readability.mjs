import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let passed=0, failed=[];
function ok(label,cond){if(cond){passed++;console.log('OK ',label)}else{failed.push(label);console.log('FAIL',label)}}
const rel=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
ok('release is 4.1.63+', Number(rel.build)>=4163 && String(rel.version)===String(pkg.version));
const px=read('assets/public-experience.js');
ok('delivery normalizer excludes React booking summaries', px.includes("closest?.('.booking-summary,.booking-mobile-summary,.booking-choice-row')"));
const growth=read('scripts/growth_visual_qa.py'), content=read('scripts/content_v4148_visual_qa.py');
ok('growth QA distinguishes intentional horizontal scrollers', growth.includes('insideIntentionalScroller'));
ok('content QA distinguishes intentional horizontal scrollers', content.includes('insideIntentionalScroller'));
const editorial=[
 'blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html','blog/yak-pochystyty-dyvan-vdoma/index.html','blog/yak-pochystyty-matrats-pislia-dytyny/index.html','blog/yak-pochystyty-matrats-vdoma/index.html','blog/yak-pomyty-vikna-robotom/index.html','blog/yak-prybraty-zapakh-z-dyvana/index.html','blog/yak-vyvesty-plyamu-z-dyvana/index.html'
];
for(const file of editorial){const html=read(file);ok(`${file} uses four editorial chapters`, html.includes('data-editorial-structure="4163"') && (html.match(/class="v4-article-chapter"/g)||[]).length===4);ok(`${file} removes numbered H2 manual rhythm`, !/<h2[^>]*>\s*\d+\./i.test(html));}
const seo=read('assets/seo-v4147.css');
ok('article route recommendation has light surface and dark readable copy', seo.includes('.v4-article .seo-route-links') && seo.includes('color:#211d19') && seo.includes('font-size:13px'));
const css=read('assets/public-experience.css');
ok('booking conditions helper is 12px+', /\.booking-conditions-steps article small\{font-size:12px/.test(css));
ok('Puzzi instructional copy is 13px', css.includes('.puzzi-cleaning-steps p,.puzzi-term-grid p,.puzzi-steps p{font-size:13px'));
ok('booking mobile deposit is no longer 9px', /\.vx-mobile-deposit\{[^}]*font-size:11px/.test(css));
const bookingQA=read('scripts/public_booking_resilience_qa.py');
ok('browser QA protects package total from delivery rewrite', bookingQA.includes('Delivery normalizer overwrote mobile booking total'));
console.log(JSON.stringify({passed,failed,status:failed.length?'failed':'passed'}));
process.exit(failed.length?1:0);
