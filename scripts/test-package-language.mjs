import fs from 'node:fs';

const config=JSON.parse(fs.readFileSync('config/vacleaner.json','utf8'));
const bookingHtml=fs.readFileSync('bronuvannia/index.html','utf8');
const bookingChunk=fs.readFileSync('_next/static/chunks/146ntlcv_t6~w-v4041.js','utf8');
const packageHtml=fs.readFileSync('komplekty/index.html','utf8');
const failures=[];

const expected={
  puzzi_jimmy:'Глибоке очищення текстилю',
  puzzi_abir:'Текстиль + вікна',
  combo:'Комбо',
  general:'Генеральне прибирання',
  ideal_windows:'Ідеальні вікна',
  elite:'HOME RESET'
};

for(const [code,label] of Object.entries(expected)){
  const product=config.catalog.products[code];
  if(product?.label!==label||product?.shortLabel!==label)failures.push(`${code}: canonical label mismatch`);
  if(!bookingChunk.includes(`label:"${label}"`))failures.push(`${code}: booking card label mismatch`);
  if(code!=='puzzi_abir'&&!bookingHtml.includes(`<strong>${label}</strong>`))failures.push(`${code}: server-rendered booking label mismatch`);
  if(code!=='puzzi_abir'&&!packageHtml.includes(`>${label}</h2>`))failures.push(`${code}: package page label mismatch`);
}

for(const [code,alias] of [
  ['puzzi_jimmy','Puzzi + Jimmy'],
  ['puzzi_abir','Puzzi + робот для вікон'],
  ['combo','Тариф «Комбо»'],
  ['general','Генеральне'],
  ['ideal_windows','Ідеальні вікна'],
  ['elite','Весь дім за один вікенд']
]){
  if(!config.catalog.products[code].aliases.includes(alias))failures.push(`${code}: legacy alias missing: ${alias}`);
}

if(bookingHtml.includes('<strong>Генеральне</strong>'))failures.push('booking still uses the incomplete “Генеральне” title');
if(bookingHtml.includes('<strong>Тариф «Комбо»</strong>'))failures.push('booking still uses the opaque “Тариф «Комбо»” title');
if(!bookingChunk.includes('detail:"Puzzi + SC 2 + Jimmy · текстиль, кухня, ванна, поверхні"'))failures.push('general-cleaning booking card lacks a plain-language scope');

if(failures.length){
  console.error(failures.map(item=>`FAIL: ${item}`).join('\n'));
  process.exit(1);
}

console.log('Package language contract: OK');
