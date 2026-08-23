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

const reviews=read('vidhuky/index.html');
assert.ok(reviews.includes('370+')&&reviews.includes('290+'),'reviews page must expose durable real social-proof counts');
assert.ok(reviews.includes('живі відгуки')||reviews.includes('Живі відгуки'),'reviews page must point to real live review evidence');
assert.ok(!/<title>Реальні відгуки клієнтів/i.test(reviews),'reviews title must not promise fabricated quote content');
assert.ok(reviews.includes('https://www.instagram.com/vacleaner_washing.pl/'),'reviews page Instagram evidence CTA missing');

const booking=read('bronuvannia/index.html');
assert.ok(booking.includes('Базові порції для Puzzi видаємо окремо й рахуємо після повернення.'),'booking must distinguish consumable Puzzi portions from optional purchased chemistry');
assert.ok(booking.includes('додаткові засоби під конкретні плями, запахи й поверхні'),'booking optional-chemistry explanation missing');
for(const stale of ['Ранок · 7:00–9:30','07:00–09:30'])assert.ok(!booking.includes(stale),`stale public slot copy remains: ${stale}`);
assert.ok(booking.includes('Ранок · 08:00–10:00'),'server-rendered booking must expose current morning slot');
const bookingBundle=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
assert.ok(bookingBundle.includes('Базові порції для Puzzi видаємо окремо й рахуємо після повернення.'),'hydrated booking bundle must preserve chemistry distinction');
assert.ok(bookingBundle.includes('Ранок · 08:00–10:00')&&!bookingBundle.includes('Ранок · 7:00–9:30'),'hydrated booking bundle must preserve current morning slot');

for(const rel of [
  'blog/yak-vyvesty-plyamu-z-dyvana/index.html',
  'blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html',
  'blog/yak-pochystyty-matrats-pislia-dytyny/index.html',
]){
  const html=read(rel),count=wordCount(html);
  assert.ok(count>=600,`${rel} is still thin (${count} words; expected >=600)`);
  assert.ok(html.includes('2026-08-23'),`${rel} dateModified was not refreshed`);
}

const stain=read('blog/yak-vyvesty-plyamu-z-dyvana/index.html');
assert.ok(/натуральн(?:ого|их) фруктов/i.test(stain)&&stain.includes('окиснюваль'),'stain guide must preserve corrected STAIN OX positioning');

console.log('Growth content, honest proof, booking chemistry clarity and new equipment SEO pages passed.');
