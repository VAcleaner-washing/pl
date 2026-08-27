import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,...rel.split('/')),'utf8');
const text=html=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();
const wordCount=html=>(text((html.match(/<article\b[^>]*>[\s\S]*?<\/article>/i)||[html])[0]).match(/[A-Za-zА-Яа-яІіЇїЄєҐґ0-9’'-]+/g)||[]).length;

const sc2=read('tekhnika/karcher-sc-2-deluxe/index.html');
const abir=read('tekhnika/robot-dlia-vikon-abir/index.html');
const sitemap=read('sitemap.xml');
for(const [name,html,url,product,price] of [
  ['SC2',sc2,'https://vacleaner.pp.ua/tekhnika/karcher-sc-2-deluxe/','sc2','500'],
  ['ABIR',abir,'https://vacleaner.pp.ua/tekhnika/robot-dlia-vikon-abir/','abir','800'],
]){
  assert.ok(html.includes(`<link rel="canonical" href="${url}"`)||html.includes(`href="${url}" rel="canonical"`),`${name} canonical missing`);
  assert.ok(html.includes('"@type":"Service"')&&html.includes('"@type":"Offer"'),`${name} Service/Offer schema missing`);
  assert.ok(html.includes(`product=${product}`),`${name} booking CTA must preserve product context`);
  assert.ok(html.includes(price),`${name} entry price missing`);
  assert.ok(html.includes('08:00–10:00')&&html.includes('17:30–20:00'),`${name} correct issue windows missing`);
  assert.ok(sitemap.includes(url),`${name} URL missing from sitemap`);
}


const processPage=read('yak-tse-pratsiuie/index.html');
assert.ok(processPage.includes('data-vx-process-smart-guide="1"'),'how-it-works page must expose Smart Guide inside the service flow');
assert.ok(processPage.includes('Підбір за 30 секунд')&&processPage.includes('href="/pidbir/"'),'how-it-works Smart Guide bridge must clearly link to /pidbir/');
assert.ok(processPage.includes('техніку, комплект і потрібні засоби'),'how-it-works Smart Guide bridge must explain what the picker actually does');

const reviews=read('vidhuky/index.html');
assert.ok(reviews.includes('370+')&&reviews.includes('290+'),'reviews page must expose durable real social-proof counts');
assert.ok(reviews.includes('живі відгуки')||reviews.includes('Живі відгуки'),'reviews page must point to real live review evidence');
assert.ok(!/<title>Реальні відгуки клієнтів/i.test(reviews),'reviews title must not promise fabricated quote content');
assert.ok(reviews.includes('https://www.instagram.com/vacleaner_washing.pl/'),'reviews page Instagram evidence CTA missing');

const booking=read('bronuvannia/index.html');
assert.ok(booking.includes('За потреби додайте засоби для плям, запахів або інших поверхонь.'),'booking optional chemistry intro must be plain-language');
assert.ok(booking.includes('Вони оплачуються окремо й залишаються у вас.'),'booking optional chemistry payment rule missing');
for(const stale of ['Ранок · 7:00–9:30','07:00–09:30'])assert.ok(!booking.includes(stale),`stale public slot copy remains: ${stale}`);
assert.ok(booking.includes('Ранок · 08:00–10:00'),'server-rendered booking must expose current morning slot');
const bookingBundle=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
assert.ok(bookingBundle.includes('За потреби додайте засоби для плям, запахів або інших поверхонь.'),'hydrated booking bundle must preserve plain-language extras intro');
assert.ok(bookingBundle.includes('Ранок · 08:00–10:00')&&!bookingBundle.includes('Ранок · 7:00–9:30'),'hydrated booking bundle must preserve current morning slot');

for(const rel of [
  'blog/yak-vyvesty-plyamu-z-dyvana/index.html',
  'blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html',
  'blog/yak-pochystyty-matrats-pislia-dytyny/index.html',
]){
  const html=read(rel),count=wordCount(html);
  assert.ok(count>=600,`${rel} is still thin (${count} words; expected >=600)`);
  assert.ok(html.includes('2026-08-26'),`${rel} dateModified must reflect the v4.1.48 internal-link refresh`);
}

const stain=read('blog/yak-vyvesty-plyamu-z-dyvana/index.html');
assert.ok(stain.includes('VA STAIN OX')&&stain.includes('червоного вина')&&stain.includes('ягід'),'stain guide must preserve corrected STAIN OX positioning in plain language');

console.log('Growth content, honest proof, booking chemistry clarity and new equipment SEO pages passed.');
