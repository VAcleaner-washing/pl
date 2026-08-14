import fs from 'node:fs';

const config=JSON.parse(fs.readFileSync('config/vacleaner.json','utf8'));
const bookingHtml=fs.readFileSync('bronuvannia/index.html','utf8');
const bookingChunk=fs.readFileSync('_next/static/chunks/146ntlcv_t6~w-v4041.js','utf8');
const packageHtml=fs.readFileSync('komplekty/index.html','utf8');
const publicExperience=fs.readFileSync('assets/public-experience.js','utf8');
const publicQuiz=fs.readFileSync('assets/public-quiz.js','utf8');
const adminSource=fs.readFileSync('assets/admin-v250.js','utf8');
const failures=[];

const expected={
  puzzi_jimmy:'Глибоке очищення текстилю',
  puzzi_abir:'Текстиль + вікна',
  combo:'Текстиль + кухня та ванна',
  general:'Генеральне прибирання',
  ideal_windows:'Ідеальні вікна',
  elite:'HOME RESET'
};

const expectedAdminLabels={
  puzzi:'Kärcher Puzzi',
  puzzi_jimmy:'Puzzi + Jimmy',
  puzzi_abir:'Puzzi + робот',
  sc2:'Kärcher SC 2',
  abir:'Робот ABIR',
  combo:'Puzzi + SC 2',
  general:'Puzzi + SC 2 + Jimmy',
  ideal_windows:'SC 2 + робот',
  elite:'HOME RESET'
};

for(const [code,label] of Object.entries(expectedAdminLabels)){
  if(!adminSource.includes(`${code}:'${label}'`))failures.push(`${code}: short admin label is missing`);
}
if(!adminSource.includes('adminProductLabel(code,item.shortLabel||item.label)'))failures.push('admin booking selector does not use the short admin-only labels');

for(const [code,label] of Object.entries(expected)){
  const product=config.catalog.products[code];
  if(product?.label!==label||product?.shortLabel!==label)failures.push(`${code}: canonical label mismatch`);
  if(!bookingChunk.includes(`label:"${label}"`))failures.push(`${code}: booking card label mismatch`);
  if(!bookingHtml.includes(`<strong>${label}</strong>`))failures.push(`${code}: server-rendered booking label mismatch`);
  if(!packageHtml.includes(`>${label}</h2>`))failures.push(`${code}: package page label mismatch`);
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


const publicPackageLabels=Object.values(expected);
const bookingPublicLabels=publicPackageLabels.filter(label=>bookingHtml.includes(`<strong>${label}</strong>`));
const packagePublicLabels=publicPackageLabels.filter(label=>packageHtml.includes(`>${label}</h2>`));
if(bookingPublicLabels.length!==publicPackageLabels.length)failures.push(`booking public package set mismatch: ${bookingPublicLabels.length}/${publicPackageLabels.length}`);
if(packagePublicLabels.length!==publicPackageLabels.length)failures.push(`package page public package set mismatch: ${packagePublicLabels.length}/${publicPackageLabels.length}`);
if(!packageHtml.includes('href="/bronuvannia?product=puzzi_abir"'))failures.push('package page is missing the textile + windows booking link');
if(!publicExperience.includes('syncPackageCatalog()'))failures.push('package page does not restore catalog parity after client-side navigation');
if(packageHtml.includes('>Комбо</h2>'))failures.push('package page still exposes the old “Комбо” title');

if(bookingHtml.includes('<strong>Генеральне</strong>'))failures.push('booking still uses the incomplete “Генеральне” title');
if(bookingHtml.includes('<strong>Тариф «Комбо»</strong>'))failures.push('booking still uses the opaque “Тариф «Комбо»” title');
if(!bookingChunk.includes('code:"puzzi_abir"'))failures.push('hydrated booking is missing the quiz-recommended textile + windows package');
if(!packageHtml.includes('>Текстиль + кухня та ванна</h2>'))failures.push('package-page server HTML does not use the plain-language combo title');
if(!packageHtml.includes('>Глибоке очищення текстилю</h2>')||!packageHtml.includes('Матрац і текстиль · 2 етапи'))failures.push('textile package page does not keep the clear canonical title and two-stage context');
if(!packageHtml.includes('Jimmy допомагає прибрати сухий пил, пилових кліщів і пов’язані з ними алергени; Puzzi промиває текстиль'))failures.push('general-cleaning package does not explain the role of each machine');
if(!packageHtml.includes('Пилові кліщі й пов’язані алергени')||!packageHtml.includes('UV-світло й нагрівання до 60 °C'))failures.push('Jimmy positioning does not explain the client problem and the treatment method');
if(!packageHtml.includes('Пилові кліщі й пов’язані алергени')||!packageHtml.includes('Вібраційна щітка, UV-світло й нагрівання до 60 °C'))failures.push('package cards do not make Jimmy benefits visible');
if(!publicQuiz.includes('Пил, шерсть, пилові кліщі чи алергени')||!publicQuiz.includes('UV-світло й нагрівання до 60 °C'))failures.push('quiz does not trigger Jimmy for dust-mite and allergen concerns');
for(const [file,content] of [
  ['home server HTML',fs.readFileSync('index.html','utf8')],
  ['home hydrated chunk',fs.readFileSync('_next/static/chunks/01pb0x0z72e41.js','utf8')],
  ['package server HTML',packageHtml],
  ['package RSC',fs.readFileSync('komplekty/__next._full.txt','utf8')],
  ['solutions server HTML',fs.readFileSync('rishennia/index.html','utf8')],
  ['mattress server HTML',fs.readFileSync('rishennia/mattress/index.html','utf8')],
  ['booking server HTML',bookingHtml],
  ['booking hydrated chunk',bookingChunk]
]){
  if(!/пилов(?:і|их|ими) кліщ/i.test(content)||!/алерген/i.test(content))failures.push(`${file}: Jimmy dust-mite/allergen message is missing`);
}
for(const stale of [
  'Jimmy вибиває та збирає сухий пил і алергенні частинки',
  'Вібраційна щітка вибиває сухий пил, шерсть і алергенні частинки',
  'Puzzi + SC 2 + Jimmy · текстиль, кухня, ванна, поверхні'
]){
  const publicCopy=[bookingHtml,bookingChunk,packageHtml,publicExperience,publicQuiz,fs.readFileSync('index.html','utf8'),fs.readFileSync('rishennia/index.html','utf8'),fs.readFileSync('rishennia/mattress/index.html','utf8')].join('\n');
  if(publicCopy.includes(stale))failures.push(`stale Jimmy copy remains: ${stale}`);
}
if(!fs.readFileSync('rishennia/index.html','utf8').includes('1 050 грн')||fs.readFileSync('rishennia/index.html','utf8').includes('350 грн'))failures.push('Jimmy public solution price must represent the required Puzzi + Jimmy package');
if(!publicExperience.includes('syncBookingCatalog()'))failures.push('booking does not synchronize canonical catalog titles at runtime');
if(!bookingChunk.includes('detail:"Puzzi + SC 2 + Jimmy · пилові кліщі й алергени, текстиль, кухня та ванна"'))failures.push('general-cleaning booking card lacks a plain-language scope');

if(config.catalog.extras.neutralix.label!=='Neutralix · 250 мл'||config.catalog.extras.neutralix.price!==200)failures.push('Neutralix must remain 250 ml / 200 UAH');
if(!publicExperience.includes('Залоговий платіж'))failures.push('approved “Залоговий платіж” wording is missing');
const puzziLanding=fs.readFileSync('tekhnika/karcher-puzzi-8-1/index.html','utf8');
if(!puzziLanding.includes('8 запечатаних порцій')||!puzziLanding.includes('не входять у вартість оренди'))failures.push('Puzzi chemistry payment is not explicit in initial HTML');
if(publicExperience.includes('function syncPublicCopy'))failures.push('runtime static-copy patch must not return');
if(!publicQuiz.includes("const SPOT_FIX_USE='Не розбавляйте."))failures.push('VA SPOT FIX instruction does not say to use it undiluted');
if(!publicQuiz.includes('Потім промокніть — не тріть — чистою сухою білою тканиною'))failures.push('VA SPOT FIX instruction does not distinguish blotting from rubbing');
if(!publicQuiz.includes('Завершіть промиванням водою або очищенням усієї поверхні миючим засобом'))failures.push('VA SPOT FIX instruction is missing the rinse/full-cleaning step');
if(!publicQuiz.includes("const STAIN_OX_USE='Не розбавляйте."))failures.push('VA STAIN OX instruction does not say to use it undiluted');
if(!publicQuiz.includes('Якщо на тканину перейшов колір матеріалу — засіб не використовуйте'))failures.push('VA STAIN OX instruction is missing the dye-transfer stop rule');
if(!publicQuiz.includes('залиште діяти до 15 хвилин')||!publicQuiz.includes('Кислотний засіб, pH 3,5'))failures.push('VA STAIN OX dwell time or pH warning is missing');

if(failures.length){
  console.error(failures.map(item=>`FAIL: ${item}`).join('\n'));
  process.exit(1);
}

console.log('Package language contract: OK');
