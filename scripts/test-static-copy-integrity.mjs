import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const failures=[];
const must=(condition,message)=>{if(!condition)failures.push(message)};
const absent=(content,needle,where)=>must(!content.includes(needle),`${where}: stale copy “${needle}”`);

const core=JSON.parse(read('config/vacleaner.json'));
const experience=read('assets/public-experience.js');
const bookingHtml=read('bronuvannia/index.html');
const bookingChunk=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
const bookingRsc=read('bronuvannia/__next._full.txt');
const packageHtml=read('komplekty/index.html');
const packageChunk=read('_next/static/chunks/09z99witl-xo-v4041.js');
const packageRsc=read('komplekty/__next._full.txt');
const homeHtml=read('index.html');
const homeChunk=read('_next/static/chunks/01pb0x0z72e41.js');

for(const [where,content] of [
  ['booking HTML',bookingHtml],['booking hydrated JS',bookingChunk],['booking RSC',bookingRsc],
  ['packages HTML',packageHtml],['packages hydrated JS',packageChunk],['packages RSC',packageRsc],
  ['home HTML',homeHtml],['home hydrated JS',homeChunk],
]){
  for(const stale of ['Засоби в комплекті','8 порцій хімії','Дві основні задачі','Скло без драбини','07:00–09:30','Ранок · 7:00–9:00'])absent(content,stale,where);
}

for(const content of [bookingHtml,bookingChunk]){
  absent(content,'<strong>Комбо</strong>','booking');
  absent(content,'label:"Комбо"','booking');
  must(content.includes('Текстиль + кухня та ванна'),'booking: canonical combo title is missing');
}
for(const content of [packageHtml,packageRsc]){
  absent(content,'<h2>Комбо</h2>','packages');
  absent(content,'[\"$\",\"article\",\"Комбо\",','packages RSC key');
  absent(content,'[\\\"$\\\",\\\"article\\\",\\\"Комбо\\\",','packages embedded RSC key');
  must(content.includes('Текстиль + кухня та ванна'),'packages: canonical combo title is missing');
}
absent(packageChunk,'children\\\":\\\"Комбо\\\"','packages hydrated JS');
must(packageChunk.includes('Текстиль + кухня та ванна'),'packages hydrated JS: canonical combo title is missing');

for(const content of [bookingHtml,bookingChunk]){
  must(content.includes('Текстиль + вікна'),'booking: textile + windows package is missing');
}
must(packageHtml.includes('>Текстиль + вікна</h2>'),'packages: textile + windows card is missing');
must(packageHtml.includes('href="/bronuvannia?product=puzzi_abir"'),'packages: textile + windows booking link is missing');
must(experience.includes('syncPackageCatalog()'),'packages: runtime catalog parity guard is missing');
must(experience.includes('const PUBLIC_PRODUCT_LABELS={'),'packages: public labels must be pinned independently from mutable catalog aliases');
must(experience.includes('if(combo)setTextIfChanged(combo.querySelector(\'h2\'),PUBLIC_PRODUCT_LABELS.combo)'),'packages: runtime must never restore a legacy combo display name');
absent(packageHtml,'"name":"Комбо · Puzzi + SC 2"','packages structured data');
must(packageHtml.includes('"name":"Текстиль + кухня та ванна · Puzzi + SC 2"'),'packages structured data: canonical combo offer is missing');
must(packageHtml.includes('"name":"Текстиль + вікна · Puzzi + робот для вікон"'),'packages structured data: textile + windows offer is missing');

for(const content of [homeHtml,homeChunk]){
  absent(content,'<small>Генеральне</small>','home');
  absent(content,'label:"Генеральне"','home');
}

const expectedHeadings={
  textile:'Глибоке промивання текстилю з контрольованою вологою',
  steam:'Чистіші кухня й ванна без десятка засобів',
  windows:'Чисті вікна з меншим обсягом ручної роботи',
  mattress:'Чистіший матрац у два послідовні етапи',
};
for(const [slug,heading] of Object.entries(expectedHeadings)){
  const page=read(`rishennia/${slug}/index.html`);
  must(page.includes(heading),`${slug}: correct result heading is missing`);
  for(const [otherSlug,otherHeading] of Object.entries(expectedHeadings))if(otherSlug!==slug)absent(page,otherHeading,slug);
}

must(JSON.stringify(core.slots)===JSON.stringify({morningStart:'08:00',morningEnd:'10:00',eveningStart:'17:30',eveningEnd:'20:00'}),'central booking slots changed unexpectedly');
for(const file of ['assets/admin-v250.js','assets/public-booking-slots.js','supabase/functions/vacleaner-push/index.ts','supabase/functions/vacleaner-reminders-v1/index.ts']){
  const content=read(file);
  absent(content,"'07:00'",file);absent(content,'"07:00"',file);absent(content,"'09:30'",file);absent(content,'"09:30"',file);
}

must(!experience.includes('syncPublicCopy'),'runtime static-copy rewriting returned');
for(const marker of ['syncBookingCatalog()','syncDeliveryFee()','syncPublicSettings()','vacleaner-settings'])must(experience.includes(marker),`dynamic admin-controlled behavior is missing: ${marker}`);

if(failures.length){
  console.error(failures.map(item=>`FAIL: ${item}`).join('\n'));
  process.exit(1);
}
console.log('Static copy and dynamic-settings boundary: OK');
