import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,value)=>fs.writeFileSync(path.join(root,file),value);
const existing=files=>files.filter(file=>fs.existsSync(path.join(root,file)));
const config=JSON.parse(read('config/vacleaner.json'));
const money=value=>new Intl.NumberFormat('uk-UA').format(Number(value)||0);
const textFiles=dir=>{
  const full=path.join(root,dir);
  if(!fs.existsSync(full))return[];
  return fs.readdirSync(full).filter(name=>name.endsWith('.txt')).map(name=>path.join(dir,name));
};

const publicTextFiles=()=>{
  const skip=new Set(['admin','supabase','scripts','.github','dist','test-results','pwa-test-results','density-test-results','final-desktop-test-results','__pycache__']);
  const out=[];
  const walk=(dir,rel='')=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(skip.has(entry.name))continue;
      const nextRel=rel?path.join(rel,entry.name):entry.name;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walk(full,nextRel);
      else if(/\.(?:html|txt|js)$/.test(entry.name))out.push(nextRel);
    }
  };
  walk(root);
  return out;
};
const apply=(files,replacements)=>{
  for(const file of existing(files)){
    let value=read(file);
    for(const [from,to] of replacements)value=value.split(from).join(to);
    write(file,value);
  }
};


// Shared public shell parity: the 30-second picker name must never fall back to the old footer label.
apply(publicTextFiles(),[
  ['<a href="/pidbir/">Підбір рішення</a>','<a href="/pidbir/">Підбір за 30 сек</a>'],
  ['children:"Підбір рішення"','children:"Підбір за 30 сек"'],
  ['children\":\"Підбір рішення\"','children\":\"Підбір за 30 сек\"'],
]);

const homeFiles=['index.html','_next/static/chunks/01pb0x0z72e41.js','index.txt','__next.__PAGE__.txt','__next._full.txt','__next._head.txt','__next._index.txt','__next._tree.txt'];
apply(homeFiles,[
  ['Засоби в комплекті','Засоби під задачу'],
  ['<a href="/pidbir/">Підбір</a>','<a href="/pidbir/">Підбір за 30 сек</a>'],
  ['children:"Підбір"','children:"Підбір за 30 сек"'],
  ['children\":\"Підбір\"','children\":\"Підбір за 30 сек\"'],
  ['<small>Для текстилю</small><h3>Puzzi + Jimmy</h3>','<small>Найчастіше обирають</small><h3>Глибоке очищення диванів і матраців</h3>'],
  ['<small>Генеральне прибирання</small><h3>Puzzi + SC 2 + Jimmy</h3>','<small>М’які меблі + тверді поверхні</small><h3>Генеральне прибирання</h3>'],
  ['<small>HOME RESET</small><h3>Увесь дім</h3>','<small>Повний цикл для дому</small><h3>HOME RESET</h3>'],
  ['<small>Генеральне</small>','<small>Генеральне прибирання</small>'],
  ['label:"Генеральне"','label:"Генеральне прибирання"'],
  ['Місце, де ви спите</small><h3>Матрац</h3>','Пилові кліщі й алергени</small><h3>Глибоке очищення матраца</h3>'],
  ['З Puzzi завжди видаємо 8 порцій хімії: після повернення оплачуєте лише використані по 50 грн','З Puzzi видаємо 8 запечатаних порцій хімії. Вони не входять у вартість оренди: після повернення оплачуєте лише використані по 50 грн'],
  ['Не знаєте, що підійде?','Кілька задач одразу?'],
  ['Опишіть задачу одним повідомленням — без бронювання й зобов’язань.','Відповідайте на кілька питань — підберемо техніку й комплект приблизно за 30 секунд.'],
  ['Запитати менеджера','Підібрати за 30 сек'],
]);

// The home choice helper used Telegram as its historical action. Keep the server HTML and hydrated chunk on the same /pidbir/ target.
{
  const file='index.html';
  let html=read(file);
  html=html.replace(/(<div class="v21-choice-help">[\s\S]*?<a )href="[^"]+" rel="noreferrer" target="_blank"/, '$1href="/pidbir/"');
  write(file,html);
}
{
  const file='_next/static/chunks/01pb0x0z72e41.js';
  let js=read(file);
  js=js.replace('(0,s.jsxs)("a",{href:r.telegram,target:"_blank",rel:"noreferrer",children:["Підібрати за 30 сек ",','(0,s.jsxs)("a",{href:"/pidbir/",children:["Підібрати за 30 сек ",');
  write(file,js);
}


const packageFiles=['komplekty/index.html','_next/static/chunks/09z99witl-xo-v4041.js',...textFiles('komplekty')];
apply(packageFiles,[
  ['Глибоке очищення текстилю','Глибоке очищення диванів і матраців'],
  ['Текстиль + вікна','Дивани + вікна'],
  ['Текстиль + кухня та ванна','Дивани + кухня та ванна'],
  ['Матрац і текстиль · 2 етапи','Дивани й матраци · 2 етапи'],
  ['Текстиль + скло','Дивани + вікна'],
  ['Текстиль + тверді поверхні','М’які меблі + тверді поверхні'],
  ['Puzzi після цього глибоко промиває текстиль.','Puzzi після цього глибоко промиває дивани, матраци та м’які меблі.'],
  ['Puzzi промиває текстиль, а SC 2','Puzzi промиває м’які меблі та матраци, а SC 2'],
  ['Puzzi: текстиль і матраци','Puzzi: м’які меблі й матраци'],
  ['Puzzi — текстиль, SC 2','Puzzi — м’які меблі й матраци, SC 2'],
  ['Jimmy + Puzzi: матраци й текстиль','Jimmy + Puzzi: матраци й м’які меблі'],
  ['Дві основні задачі','Найчастіше обирають'],
  ['<h2>Комбо</h2>','<h2>Дивани + кухня та ванна</h2>'],
  ['"children":"Комбо"','"children":"Дивани + кухня та ванна"'],
  ['children\\\":\\\"Комбо\\\"','children\\\":\\\"Текстиль + кухня та ванна\\\"'],
  ['children:"Комбо"','children:"Дивани + кухня та ванна"'],
  ['["combo","Комбо"]','["combo","Дивани + кухня та ванна"]'],
  ['["$","article","Комбо",','["$","article","Дивани + кухня та ванна",'],
  ['[\\"$\\",\\"article\\",\\"Комбо\\",','[\\"$\\",\\"article\\",\\"Текстиль + кухня та ванна\\",'],
  ['Текстиль, кухня та ванна одним бронюванням.','Puzzi глибоко промиває дивани й матраци, а SC 2 працює з кухнею, ванною, плиткою та швами.'],
  ['Повний день','Текстиль + тверді поверхні'],
  ['Вікна, дзеркала, плитка та гладкі поверхні без зайвої ручної роботи.','Скло, рами, кути й стики — одним комплектом техніки.'],
  ['Приклад маршруту','Орієнтовний маршрут'],
]);



// Public package catalog parity: keep /komplekty/ and /bronuvannia/ on the same
// client-facing package names/set, while admin keeps its own short operational labels.
const publicPackageCodes=['puzzi_jimmy','puzzi_abir','combo','general','ideal_windows','elite'];
const textileWindows=config.catalog.products.puzzi_abir;
const textileWindowsCard=`<article class="package-card package-card-large"><p class="package-eyebrow">Дивани + вікна</p><h2>Дивани + вікна</h2><p class="package-items">Puzzi + робот для вікон</p><p class="package-purpose">Puzzi глибоко промиває дивани й матраци, а робот працює зі склом і дзеркалами.</p><ul><li>Дивани, матраци й крісла</li><li>Вікна й дзеркала</li><li>Гладкі скляні поверхні</li></ul><div class="package-price"><strong>${money(textileWindows.weekday)} грн</strong><span>будні / доба</span></div><p class="package-value">Будні — ${money(textileWindows.weekday)} грн · вихідний — ${money(textileWindows.weekend)} грн</p><a class="package-link" href="/bronuvannia?product=puzzi_abir">Перевірити вільну дату <svg aria-hidden="true" class="icon-arrow" focusable="false" viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"></path></svg></a></article>`;
const textileWindowsBooking=`<button aria-pressed="false" class="" type="button"><strong>Дивани + вікна</strong><span>Puzzi + робот для вікон · м’які меблі, матраци, вікна й дзеркала</span><small>Будні · ${money(textileWindows.weekday)} грн  |  1 вихідний · ${money(textileWindows.weekend)} грн</small></button>`;

{
  const file='komplekty/index.html';
  let html=read(file);
  if(!html.includes('href="/bronuvannia?product=puzzi_abir"')){
    const anchor='<article class="package-card package-card-large"><p class="package-eyebrow">Найчастіше обирають</p><h2>Дивани + кухня та ванна</h2>';
    const at=html.indexOf(anchor);
    if(at<0)throw new Error('Cannot locate combo card while adding public textile + windows package');
    html=html.slice(0,at)+textileWindowsCard+html.slice(at);
  }
  html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(full,jsonText)=>{
    try{
      const data=JSON.parse(jsonText);
      const nodes=Array.isArray(data?.['@graph'])?data['@graph']:[data];
      const service=nodes.find(node=>node?.hasOfferCatalog?.itemListElement);
      if(!service)return full;
      const offers=service.hasOfferCatalog.itemListElement;
      const byUrl=new Map(offers.map(offer=>[offer.url,offer]));
      const canonical=[
        ['puzzi_jimmy','Глибоке очищення диванів і матраців · Puzzi + Jimmy'],
        ['puzzi_abir','Дивани + вікна · Puzzi + робот для вікон'],
        ['combo','Дивани + кухня та ванна · Puzzi + SC 2'],
        ['general','Генеральне прибирання · Puzzi + SC 2 + Jimmy'],
        ['ideal_windows','Ідеальні вікна · SC 2 + робот для вікон'],
        ['elite','HOME RESET · повний комплект'],
      ];
      service.hasOfferCatalog.itemListElement=canonical.map(([code,name])=>{
        const product=config.catalog.products[code];
        const url=`https://vacleaner.pp.ua/bronuvannia?product=${code}`;
        return {...(byUrl.get(url)||{}),'@type':'Offer',name,price:String(product.weekday),priceCurrency:'UAH',url,seller:{'@id':'https://vacleaner.pp.ua/#business'}};
      });
      return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
    }catch{return full;}
  });
  write(file,html);
}

{
  const file='bronuvannia/index.html';
  let html=read(file);
  if(!html.includes('<strong>Текстиль + вікна</strong>')&&!html.includes('<strong>Дивани + вікна</strong>')){
    const strong='<strong>Робот для вікон</strong>';
    const strongAt=html.indexOf(strong);
    const end=strongAt<0?-1:html.indexOf('</button>',strongAt);
    if(end<0)throw new Error('Cannot locate window robot booking card while adding textile + windows package');
    const after=end+'</button>'.length;
    html=html.slice(0,after)+textileWindowsBooking+html.slice(after);
  }
  write(file,html);
}

const solutionsFiles=['rishennia/index.html',...textFiles('rishennia')];
apply(solutionsFiles,[
  ['Скло без драбини','Менше ручної роботи зі склом'],
  ['Не знаєте, що підійде?','Кілька задач одразу?'],
  ['Надішліть фото або коротко опишіть задачу — ми зберемо рішення.','Відповідайте на кілька питань — підберемо техніку й комплект під усі зони.'],
  ['href="/kontakty">Як зв’язатися ','href="/pidbir/">Підібрати за 30 сек '],
  ['href":"/kontakty","children":["Як зв’язатися ','href":"/pidbir/","children":["Підібрати за 30 сек '],
  ['href":"/kontakty","children":["Як зв’язатися ','href":"/pidbir/","children":["Підібрати за 30 сек '],
]);

const solutionPages={
  textile:{
    heading:'Глибоке промивання текстилю з контрольованою вологою',
    description:'Диван, матрац і крісла: Kärcher Puzzi 8/1, насадка, запечатані порції хімії з оплатою лише за використані, інструктаж і підтримка VAcleaner.',
  },
  steam:{
    heading:'Чистіші кухня й ванна без десятка засобів',
    description:'Кухня, ванна й плитка: підготовлений Kärcher SC 2 Deluxe, потрібні насадки, безпечний інструктаж і підтримка VAcleaner у Полтаві.',
  },
  windows:{
    heading:'Чисті вікна з меншим обсягом ручної роботи',
    description:'Робот ABIR WD8 для звичайних і панорамних вікон: перевірена техніка, серветки, мийний засіб, інструктаж і підтримка VAcleaner.',
  },
};
for(const [slug,page] of Object.entries(solutionPages)){
  const files=[`rishennia/${slug}/index.html`,...textFiles(`rishennia/${slug}`)];
  const replacements=[
    ['Чистіший матрац у два послідовні етапи',page.heading],
  ];
  if(slug==='textile')replacements.push(
    ['Готове рішення для домашньої хімчистки текстилю. Ми готуємо чисту й перевірену техніку, потрібну насадку, вісім порцій професійного засобу та пояснюємо послідовність роботи.','Готове рішення для глибокого промивання текстилю: чиста техніка, потрібна насадка, вісім запечатаних порцій засобу з оплатою лише за використані та зрозуміла послідовність роботи.'],
    ['8 порцій професійної хімії · оплата лише за використані','8 запечатаних порцій · 50 грн лише за використану'],
  );
  if(slug==='windows')replacements.push(
    ['Скло без драбини', 'Менше ручної роботи зі склом'],
    ['Потрібне рішення «Менше ручної роботи зі склом»?','Потрібне рішення для вікон і дзеркал?'],
  );
  apply(files,replacements);
  const htmlFile=`rishennia/${slug}/index.html`;
  if(fs.existsSync(path.join(root,htmlFile))){
    let html=read(htmlFile).replace(/(<meta[^>]+name="description"[^>]+content=")[^"]*(")/i,`$1${page.description}$2`).replace(/(<meta[^>]+content=")[^"]*("[^>]+name="description"[^>]*>)/i,`$1${page.description}$2`);
    write(htmlFile,html);
  }
}

const mattressFiles=['rishennia/mattress/index.html',...textFiles('rishennia/mattress')];
apply(mattressFiles,[
  ['Jimmy JV35 — глибоке очищення матраців у Полтаві','Puzzi + Jimmy — глибоке очищення матраців у Полтаві'],
]);

const faqFiles=['faq/index.html',...textFiles('faq')];
apply(faqFiles,[
  ['З Puzzi завжди видаємо 8 порцій хімії: після повернення оплачуєте лише використані по 50 грн','З Puzzi видаємо 8 запечатаних порцій хімії. Вони не входять у вартість оренди: після повернення оплачуєте лише використані по 50 грн'],
  ['З Puzzi завжди видаємо 8 порцій професійного засобу. Після повернення оплачуєте лише використані по 50 грн','З Puzzi видаємо 8 запечатаних порцій професійного засобу. Вони не входять у вартість оренди: після повернення оплачуєте лише використані по 50 грн'],
]);

const bookingFiles=['bronuvannia/index.html','_next/static/chunks/146ntlcv_t6~w-v4041.js',...textFiles('bronuvannia')];
apply(bookingFiles,[
  ['<strong>Kärcher Puzzi</strong>','<strong>Kärcher Puzzi 8/1</strong>'],
  ['label:"Kärcher Puzzi"','label:"Kärcher Puzzi 8/1"'],
  ['children":"Kärcher Puzzi"','children":"Kärcher Puzzi 8/1"'],
  ['children\":\"Kärcher Puzzi\"','children\":\"Kärcher Puzzi 8/1\"'],
  ['Текстиль · 8 запечатаних порцій, оплата лише за використані','Миючий пилосос · дивани, матраци, килими'],
  ['Глибоке очищення текстилю','Глибоке очищення диванів і матраців'],
  ['Puzzi + Jimmy · сухий пил, пилові кліщі й алергени в матрацах та м’яких меблях','Puzzi + Jimmy · сухий пил, пилові кліщі й алергени + глибоке промивання'],
  ['Кухня, ванна, плитка','Очищення парою · кухня, ванна, плитка, шви'],
  ['Вікна, дзеркала, гладкі поверхні','Вікна, дзеркала, скляні поверхні'],
  ['Текстиль + вікна','Дивани + вікна'],
  ['Puzzi + робот для вікон · текстиль, скло, дзеркала','Puzzi + робот для вікон · м’які меблі, матраци, вікна й дзеркала'],
  ['Текстиль + кухня та ванна','Дивани + кухня та ванна'],
  ['Puzzi + SC 2 · дивани, кухня, ванна','Puzzi + SC 2 · м’які меблі, кухня, ванна, плитка та шви'],
  ['Puzzi + SC 2 + Jimmy · пилові кліщі й алергени, текстиль, кухня та ванна','Puzzi + SC 2 + Jimmy · пил, алергени, м’які меблі, кухня та ванна'],
  ['SC 2 + робот для вікон · рами, скло, плитка','SC 2 + робот для вікон · скло, рами, кути, стики та дзеркала'],
  ['Повний комплект для дому · текстиль, кухня, ванна, вікна','Уся техніка · повний цикл прибирання дому'],
  ['Уся техніка · текстиль, кухня, ванна та вікна','Уся техніка · повний цикл прибирання дому'],
  ['<strong>Комбо</strong>','<strong>Текстиль + кухня та ванна</strong>'],
  ['label:"Комбо"','label:"Текстиль + кухня та ванна"'],
  ['Текстиль · 8 порцій хімії видаємо в комплекті','Текстиль · 8 запечатаних порцій, оплата лише за використані'],
  ['Хімія для Puzzi · 8 порцій','Хімія для Puzzi · 8 запечатаних порцій'],
  ['<h3>Додати до замовлення</h3>','<h3>Професійні засоби</h3>'],
  ['Засоби купуються окремо. Якщо додали засіб до бронювання — його вартість одразу входить у замовлення.','Підберіть під конкретне забруднення · засоби купуються окремо й залишаються у вас.'],
  ['Засоби купуються окремо й залишаються у вас.','Підберіть під конкретне забруднення · засоби купуються окремо й залишаються у вас.'],
  ['Універсальний плямовивідник · 50 мл','VA SPOT FIX · 50 мл'],
  ['VA SPOT FIX — для плям від їжі, жиру, косметики та забруднень невідомого походження.','Універсальний плямовивідник для локальної обробки свіжих і змішаних забруднень. Жирні сліди · їжа · косметика · побутові плями.'],
  ['Плямовивідник від кави, вина та ягід · 30 мл','VA STAIN OX · 30 мл'],
  ['VA STAIN OX — для старих слідів від кави, чаю, вина, ягід і соків','Для стійких плям від напоїв і харчових продуктів. Кава · чай · червоне вино · соки · ягоди.'],
  ['<b>Shower Care</b><small>Вапняний і мильний наліт у душі та ванній</small>','<b>Shower Care · 250 мл</b><small>Мильний і вапняний наліт у душовій, ванній та на сантехніці.</small>'],
  ['label:"Shower Care",detail:"Вапняний і мильний наліт у душі та ванній"','label:"Shower Care · 250 мл",detail:"Мильний і вапняний наліт у душовій, ванній та на сантехніці."'],
  ['<b>Soft Degreaser</b><small>Непригорілий жир і кухонний бруд</small>','<b>Soft Degreaser · 250 мл</b><small>Жирові забруднення на кухонних і твердих поверхнях.</small>'],
  ['label:"Soft Degreaser",detail:"Непригорілий жир і кухонний бруд"','label:"Soft Degreaser · 250 мл",detail:"Жирові забруднення на кухонних і твердих поверхнях."'],
  ['<b>Grill Force</b><small>Нагар і пригорілий жир у духовках та грилях</small>','<b>Grill Force · 250 мл</b><small>Нагар і стійкий пригорілий жир у духовках, на грилях і решітках.</small>'],
  ['label:"Grill Force",detail:"Нагар і пригорілий жир у духовках та грилях"','label:"Grill Force · 250 мл",detail:"Нагар і стійкий пригорілий жир у духовках, на грилях і решітках."'],
  ['<b>Scalex Pro</b><small>Іржа, водний наліт і вапняні відкладення</small>','<b>Scalex Pro · 250 мл</b><small>Водний камінь, іржа та стійкі мінеральні відкладення.</small>'],
  ['label:"Scalex Pro",detail:"Іржа, водний наліт і вапняні відкладення"','label:"Scalex Pro · 250 мл",detail:"Водний камінь, іржа та стійкі мінеральні відкладення."'],
  ['<b>Eco Clean</b><small>Щоденний бруд на сталі, склі, пластику й кераміці</small>','<b>Eco Clean · 250 мл</b><small>Щоденні забруднення на сталі, склі, пластику та кераміці.</small>'],
  ['label:"Eco Clean",detail:"Щоденний бруд на сталі, склі, пластику й кераміці"','label:"Eco Clean · 250 мл",detail:"Щоденні забруднення на сталі, склі, пластику та кераміці."'],
  ['<b>Glass Perfect Care</b><small>Скло, дзеркала й глянець без розводів</small>','<b>Glass Perfect Care · 250 мл</b><small>Скло, дзеркала та глянцеві поверхні без розводів.</small>'],
  ['label:"Glass Perfect Care",detail:"Скло, дзеркала й глянець без розводів"','label:"Glass Perfect Care · 250 мл",detail:"Скло, дзеркала та глянцеві поверхні без розводів."'],
  ['Ранок · 7:00–9:00','Ранок · 08:00–10:00'],
  ['Вечір · 18:00–20:00','Вечір · 17:30–20:00'],
]);

const legacyAdminChunk=['_next/static/chunks/09z99witl-xo-v4041.js'];
apply(legacyAdminChunk,[
  ['07:00–09:30','08:00–10:00'],
  ['"07:00"','"08:00"'],
  ['"09:30"','"10:00"'],
]);

const puzzi='tekhnika/karcher-puzzi-8-1/index.html';
apply([puzzi],[
  ['Оренда Kärcher Puzzi 8/1 у Полтаві від 700 грн/доба. 8 порцій хімії, інструктаж, доставка 250 грн і онлайн-перевірка вільної дати.','Оренда Kärcher Puzzi 8/1 у Полтаві від 700 грн/доба. Запечатані порції хімії з оплатою лише за використані, інструктаж і онлайн-перевірка дати.'],
  ['Професійний миючий пилосос для диванів, матраців, килимів і салону авто. Від 700 грн/доба.','Kärcher Puzzi 8/1 для диванів, матраців і текстилю: від 700 грн/доба, інструктаж, підтримка та онлайн-перевірка дати.'],
  ['Від 700 грн/доба · 8 порцій хімії · доставка · онлайн-бронювання','Від 700 грн/доба · хімія за фактом використання · онлайн-бронювання'],
  ['Чистий і перевірений Kärcher Puzzi 8/1, насадка для меблів, 8 порцій професійної хімії, короткий інструктаж і підтримка під час роботи.','Чистий Kärcher Puzzi 8/1, насадка, 8 запечатаних порцій хімії з оплатою лише за використані, короткий інструктаж і підтримка під час роботи.'],
  ['Видаємо 8 порцій. Після повернення оплачуєте лише використані','Видаємо 8 запечатаних порцій, які не входять у вартість оренди. Після повернення оплачуєте лише використані'],
  ['Так. Доставка техніки до вас і повернення назад коштує 250 грн. Також доступний самовивіз у Полтаві.','Так. Доступні доставка техніки до вас і назад та самовивіз у Полтаві. Актуальну вартість сайт показує під час оформлення.'],
  ['<small>У комплекті</small><strong>8 порцій хімії</strong>','<small>Видаємо запечатаними</small><strong>8 порцій · оплата за використані</strong>'],
  ['<strong>8 порцій</strong><p>видаємо з Puzzi</p>','<strong>8 порцій</strong><p>50 грн лише за використану</p>'],
  ['Ранок 07:00–09:30 · вечір 17:30–20:00. Вільність перевіряється онлайн перед бронюванням.','Ранок 08:00–10:00 · вечір 17:30–20:00. Доступність техніки перевіряється онлайн перед бронюванням.'],
  ['Рахуємо використану хімію, extras та робимо фінальний взаєморозрахунок із залогом.','Рахуємо використану хімію й додаткові засоби та робимо фінальний взаєморозрахунок із залогом.'],
  ['Перевірте вільність техніки онлайн. Система одразу покаже тариф, отримання та суму до оформлення.','Перевірте доступність техніки онлайн. Система одразу покаже тариф, отримання та суму до оформлення.'],
]);

const descriptions={
  'index.html':'Оренда техніки для самостійного прибирання у Полтаві: Kärcher Puzzi, SC 2, Jimmy та робот для вікон, засоби, інструктаж і підтримка.',
  'rishennia/index.html':'Оберіть, що хочете почистити: диван, матрац, кухню, ванну або вікна. VAcleaner підбере техніку, засоби та зрозумілий план прибирання.',
  'vidhuky/index.html':'Реальні відгуки клієнтів VAcleaner у Полтаві про оренду техніки, доставку, інструктаж, підтримку та результат самостійного прибирання.',
  'umovy/index.html':'Умови бронювання, передплати, отримання, користування та повернення техніки VAcleaner у Полтаві, включно із залоговим платежем і фінальним розрахунком.',
  'kontakty/index.html':'Контакти VAcleaner у Полтаві: телефон, Instagram і Telegram для підбору техніки, перевірки вільної дати, доставки або самовивозу.',
};
for(const [file,description] of Object.entries(descriptions)){
  if(!fs.existsSync(path.join(root,file)))continue;
  let html=read(file)
    .replace(/(<meta[^>]+name="description"[^>]+content=")[^"]*(")/i,`$1${description}$2`)
    .replace(/(<meta[^>]+content=")[^"]*("[^>]+name="description"[^>]*>)/i,`$1${description}$2`);
  write(file,html);
}

apply(['blog/yak-pochystyty-matrats-pislia-dytyny/index.html',...textFiles('blog/yak-pochystyty-matrats-pislia-dytyny')],[
  ['Як почистити матрац після дитини — пляма та запах сечі | VAcleaner','Як почистити матрац після дитини: пляма й запах | VAcleaner'],
]);

console.log('Synchronized static public copy across HTML, RSC and hydrated chunks.');
