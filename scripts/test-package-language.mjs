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
  puzzi_jimmy:'Глибоке очищення диванів і матраців',
  puzzi_abir:'Дивани + вікна',
  combo:'Дивани + кухня та ванна',
  general:'Генеральне прибирання',
  ideal_windows:'Ідеальні вікна',
  elite:'HOME RESET'
};

const unchangedCatalogLabels={
  puzzi_jimmy:'Глибоке очищення текстилю',
  puzzi_abir:'Текстиль + вікна',
  combo:'Текстиль + кухня та ванна'
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
  if(!bookingChunk.includes(`label:"${label}"`))failures.push(`${code}: booking card label mismatch`);
  if(!bookingHtml.includes(`<strong>${label}</strong>`))failures.push(`${code}: server-rendered booking label mismatch`);
  if(!packageHtml.includes(`>${label}</h2>`))failures.push(`${code}: package page label mismatch`);
}
for(const [code,label] of Object.entries(unchangedCatalogLabels)){
  const product=config.catalog.products[code];
  if(product?.label!==label||product?.shortLabel!==label)failures.push(`${code}: shared backend catalog label changed; public copy must stay isolated`);
}
if(!bookingHtml.includes('<strong>Kärcher Puzzi 8/1</strong>')||!bookingChunk.includes('label:"Kärcher Puzzi 8/1"'))failures.push('Puzzi public booking title is not the full Kärcher Puzzi 8/1 model');
if(!bookingHtml.includes('Очищення парою · кухня, ванна, плитка, шви'))failures.push('SC 2 public booking detail is not task-first');
if(!bookingHtml.includes('Миючий пилосос · дивани, матраци, килими'))failures.push('Puzzi public booking detail is not client-readable');

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


const homeHtml=fs.readFileSync('index.html','utf8');
const homeChunk=fs.readFileSync('_next/static/chunks/01pb0x0z72e41.js','utf8');
for(const label of ['Глибоке очищення диванів і матраців','Генеральне прибирання','HOME RESET']){
  if(!homeHtml.includes(`>${label}</h3>`))failures.push(`home package card missing client-facing title: ${label}`);
  if(!homeChunk.includes(`title:"${label}"`))failures.push(`hydrated home package card missing client-facing title: ${label}`);
}
for(const legacyTitle of ['<h3>Puzzi + Jimmy</h3>','<h3>Puzzi + SC 2 + Jimmy</h3>','<h3>Увесь дім</h3>'])if(homeHtml.includes(legacyTitle))failures.push(`home still exposes technical package title: ${legacyTitle}`);
if(!bookingChunk.includes('extraFitsProduct=')||!bookingChunk.includes('showAllExtras')||!bookingChunk.includes('Показати всі професійні засоби'))failures.push('booking relevant-chemistry progressive disclosure is missing');
if(!bookingChunk.includes('booking-summary-extras')||!bookingChunk.includes('T.length?`${u(ep)} грн`'))failures.push('booking extras summary is not driven by local selection');
if(!bookingChunk.includes('booking-conditions-steps')||!bookingChunk.includes('Докладніше про розрахунок'))failures.push('compact booking conditions are missing');
if(!bookingChunk.includes('Odour Zero · 250 мл')||!bookingChunk.includes('Для загальної нейтралізації запахів і одночасного очищення'))failures.push('Odour Zero public distinction is missing');
const publicPackageLabels=Object.values(expected);
const bookingPublicLabels=publicPackageLabels.filter(label=>bookingHtml.includes(`<strong>${label}</strong>`));
const packagePublicLabels=publicPackageLabels.filter(label=>packageHtml.includes(`>${label}</h2>`));
if(bookingPublicLabels.length!==publicPackageLabels.length)failures.push(`booking public package set mismatch: ${bookingPublicLabels.length}/${publicPackageLabels.length}`);
if(packagePublicLabels.length!==publicPackageLabels.length)failures.push(`package page public package set mismatch: ${packagePublicLabels.length}/${publicPackageLabels.length}`);
if(!packageHtml.includes('href="/bronuvannia?product=puzzi_abir"'))failures.push('package page is missing the textile + windows booking link');
if(!publicExperience.includes('syncPackageCatalog()'))failures.push('package page does not restore catalog parity after client-side navigation');
if(packageHtml.includes('>Комбо</h2>'))failures.push('package page still exposes the old “Комбо” title');
const packageRsc=fs.readFileSync('komplekty/__next._full.txt','utf8');
if(packageRsc.includes('[\"$\",\"article\",\"Комбо\",'))failures.push('package RSC still carries the legacy combo reconciliation key');
if(!publicExperience.includes('const PUBLIC_PRODUCT_LABELS={'))failures.push('public package labels are not pinned against legacy runtime labels');

if(bookingHtml.includes('<strong>Генеральне</strong>'))failures.push('booking still uses the incomplete “Генеральне” title');
if(bookingHtml.includes('<strong>Тариф «Комбо»</strong>'))failures.push('booking still uses the opaque “Тариф «Комбо»” title');
if(!bookingChunk.includes('code:"puzzi_abir"'))failures.push('hydrated booking is missing the quiz-recommended textile + windows package');
if(!packageHtml.includes('>Дивани + кухня та ванна</h2>'))failures.push('package-page server HTML does not use the final client-facing combo title');
if(!packageHtml.includes('>Глибоке очищення диванів і матраців</h2>')||!packageHtml.includes('Дивани й матраци · 2 етапи'))failures.push('deep-cleaning package does not use the final client-facing title and two-stage context');
if(!packageHtml.includes('Jimmy допомагає прибрати сухий пил, пилових кліщів і пов’язані з ними алергени; Puzzi промиває м’які меблі та матраци'))failures.push('general-cleaning package does not explain the role of each machine');
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
if(!bookingChunk.includes('detail:"Puzzi + SC 2 + Jimmy · пил, алергени, м’які меблі, кухня та ванна"'))failures.push('general-cleaning booking card lacks the final plain-language scope');

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
