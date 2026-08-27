import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const write=(rel,value)=>fs.writeFileSync(path.join(root,rel),value);
const existing=rel=>fs.existsSync(path.join(root,rel));
const apply=(files,replacements)=>{
  for(const file of files.filter(existing)){
    let value=read(file);
    for(const [from,to] of replacements)value=value.split(from).join(to);
    write(file,value);
  }
};
const walkText=(dir=root)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  if(['.git','dist','test-results','pwa-test-results','density-test-results','final-desktop-test-results','__pycache__'].includes(entry.name))return [];
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walkText(full):/\.(?:html|txt)$/.test(entry.name)?[path.relative(root,full).replaceAll('\\','/')]:[];
});

const compactDelivery='Передоплата 200 грн — після підтвердження · доставка по Полтаві — 250 грн · самовивіз у Полтаві';
const publicText=walkText();
const hydratedChunks=[
  '_next/static/chunks/01pb0x0z72e41.js',
  '_next/static/chunks/0x2bx8kerxrmz.js',
  '_next/static/chunks/146ntlcv_t6~w-v4041.js',
];

// Compact CTA copy: show the main Poltava tariff only. Suburb details live where they are actionable.
apply([...publicText,...hydratedChunks],[
  ['Передоплата 200 грн — після підтвердження · доставка — 250 грн / від 350 грн · самовивіз у Полтаві',compactDelivery],
  ['Передоплата 200 грн — після підтвердження · доставка — 250 грн у базовій зоні; інші адреси розраховуємо автоматично · самовивіз у Полтаві',compactDelivery],
  ['Передплата 200 грн входить у погоджену суму · доставка до вас і назад — 250 грн · самовивіз у Полтаві',compactDelivery],
  ['Передоплата 200 грн · доставка 250 грн · залог рахується окремо','Передоплата 200 грн · доставка по Полтаві 250 грн · залог рахується окремо'],
  ['до вас і назад · Полтава 250 грн · передмістя 350 грн','до вас і назад · Полтава 250 грн'],
]);

const deliverySeoOld='Доставка VAcleaner: Полтава, Розсошенці, Щербані й Горбанівка — 250 грн. За межі локальної зони: до 10 км — 350 грн, далі +15 грн/км; понад 30 км — за погодженням.';
const deliverySeoNew='Доставка VAcleaner: Полтава, Розсошенці, Щербані й Горбанівка — 250 грн. Інше передмістя — від 350 грн; точну суму підтверджуємо до передоплати.';
apply(['config/seo-map.json','dostavka/index.html'],[[deliverySeoOld,deliverySeoNew]]);

// Dedicated delivery information: concise, non-technical, with suburbs separated from the main tariff.
apply(['dostavka/index.html'],[[
  'Полтава, Розсошенці, Щербані та Горбанівка — 250 грн. Інше передмістя: до 10 км за межами локальної зони — 350 грн, далі +15 грн за кожен додатковий км. Понад 30 км — за погодженням. Тариф включає доставку техніки до вас і її повернення назад. За межами зони вартість погоджуємо до передоплати.',
  'Полтава, Розсошенці, Щербані та Горбанівка — 250 грн у два боки. Інше передмістя — від 350 грн. Точну суму підтвердимо до передоплати.'
]]);

const faqFiles=['faq/index.html','faq/index.txt','faq/__next.faq.__PAGE__.txt','faq/__next._full.txt'];
apply(faqFiles,[[
  'Так. Полтава, Розсошенці, Щербані та Горбанівка — 250 грн за доставку до вас і повернення техніки назад. Інше передмістя: до 10 км за межами локальної зони — 350 грн, далі +15 грн за кожен додатковий км. Понад 30 км — вартість погоджуємо до передоплати.',
  'Так. Полтава, Розсошенці, Щербані та Горбанівка — 250 грн у два боки. Інше передмістя — від 350 грн; точну суму підтвердимо до передоплати.'
]]);

const termsFiles=['umovy/index.html','umovy/index.txt','umovy/__next.umovy.__PAGE__.txt','umovy/__next._full.txt'];
apply(termsFiles,[[
  'Самовивіз у Полтаві: точне місце отримання менеджер повідомить під час опрацювання заявки. Доставка до вас і назад: Полтава, Розсошенці, Щербані та Горбанівка — 250 грн; інше передмістя до 10 км за межами локальної зони — 350 грн, далі +15 грн за кожен додатковий км. Понад 30 км — вартість погоджуємо до передоплати.',
  'Самовивіз у Полтаві: точне місце отримання менеджер повідомить під час опрацювання заявки. Доставка до вас і назад: Полтава, Розсошенці, Щербані та Горбанівка — 250 грн. Інше передмістя — від 350 грн; точну суму підтвердимо до передоплати.'
]]);

// Booking: Poltava is the main visible tariff; suburb pricing is explained next to the address field.
{
  const file='assets/public-booking-slots.js';
  let s=read(file);
  s=s.replace('const fallbackTariffs=`Полтава ${formatMoney(deliveryPricing.local)} · передмістя ${formatMoney(deliveryPricing.baseOutside)}`;','const fallbackTariffs=`Полтава ${formatMoney(deliveryPricing.local)}`;');
  s=s.replace(
    '?`Адресу не вдалося розпізнати автоматично. Полтава — ${formatMoney(deliveryPricing.local)}, передмістя — ${formatMoney(deliveryPricing.baseOutside)}. Менеджер підтвердить тариф до передоплати.`',
    '?`Не вдалося точно визначити адресу. Полтава, Розсошенці, Щербані та Горбанівка — ${formatMoney(deliveryPricing.local)}. Інше передмістя — від ${formatMoney(deliveryPricing.baseOutside)}. Менеджер підтвердить суму до передоплати.`'
  );
  s=s.replace(
    '?`Полтава — ${formatMoney(deliveryPricing.local)}, передмістя — ${formatMoney(deliveryPricing.baseOutside)}. Введіть вулицю й номер будинку — точну суму порахуємо автоматично.`',
    '?`Полтава — ${formatMoney(deliveryPricing.local)}. Розсошенці, Щербані та Горбанівка — теж ${formatMoney(deliveryPricing.local)}. Інше передмістя — від ${formatMoney(deliveryPricing.baseOutside)}; точну суму порахуємо за адресою.`'
  );
  s=s.replace(
    '?`${formatMoney(quote.amount)} · ${quote.distanceKm.toFixed(1).replace(\'.\',\',\')} км за межами Полтави. Базові ${deliveryPricing.includedKm} км — ${formatMoney(deliveryPricing.baseOutside)}, далі +${deliveryPricing.perKm} грн/км.`',
    '?`Доставка за цією адресою — ${formatMoney(quote.amount)}. Сума вже врахована у бронюванні.`'
  );
  s=s.replace(
    "if(strong)setTextIfChanged(strong,manualQuote?`${formatMoney(deliveryPricing.local)} або ${formatMoney(deliveryPricing.baseOutside)}`:quote.quoteRequired?'за погодженням':quote.pending?`${formatMoney(deliveryPricing.local)} або ${formatMoney(deliveryPricing.baseOutside)}`:formatMoney(quote.amount));",
    "if(strong)setTextIfChanged(strong,manualQuote?'після підтвердження':quote.quoteRequired?'за погодженням':quote.pending?formatMoney(deliveryPricing.local):formatMoney(quote.amount));"
  );
  s=s.replace(
    "setTextIfChanged(note,manualQuote?`Адресу не розпізнано автоматично. Менеджер підтвердить тариф: Полтава — ${formatMoney(deliveryPricing.local)} або передмістя — ${formatMoney(deliveryPricing.baseOutside)}.`:'Вартість бронювання зараз показана без доставки. Тариф підтвердить менеджер до передоплати.');",
    "setTextIfChanged(note,manualQuote?'Адресу не розпізнано автоматично. Менеджер підтвердить вартість доставки до передоплати.':'Вартість бронювання зараз показана без доставки. Тариф підтвердить менеджер до передоплати.');"
  );
  s=s.replace(
    "if(isDelivery)setTextIfChanged(note,manualQuote?`Доставка: ${formatMoney(deliveryPricing.local)} або ${formatMoney(deliveryPricing.baseOutside)} · підтвердить менеджер`:quote.quoteRequired?'Доставка — після підтвердження адреси':quote.pending?`Доставка: ${formatMoney(deliveryPricing.local)} або ${formatMoney(deliveryPricing.baseOutside)}`:`Доставка: ${formatMoney(quote.amount)}${quote.distanceKm>deliveryPricing.includedKm?` · ${quote.distanceKm.toFixed(1).replace('.',',')} км`:''}`);",
    "if(isDelivery)setTextIfChanged(note,manualQuote?'Доставка — суму підтвердить менеджер':quote.quoteRequired?'Доставка — після підтвердження адреси':quote.pending?`Доставка по Полтаві: ${formatMoney(deliveryPricing.local)}`:`Доставка: ${formatMoney(quote.amount)}`);"
  );
  write(file,s);
}

// Address search failures should not repeat two tariffs. The address hint already explains the suburb rule.
{
  const file='assets/address-autocomplete.js';
  let s=read(file);
  s=s.replaceAll('Пошук адрес тимчасово недоступний. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.','Пошук адрес тимчасово недоступний. Введіть адресу вручну — менеджер перевірить її до передоплати.');
  s=s.replaceAll('Точного збігу немає. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.','Точного збігу немає. Введіть адресу вручну — менеджер перевірить її до передоплати.');
  s=s.replaceAll('Введіть адресу вручну. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.','Введіть адресу вручну — менеджер перевірить її до передоплати.');
  s=s.replaceAll('Адреса введена вручну. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.','Адреса введена вручну. Менеджер перевірить її й підтвердить вартість доставки до передоплати.');
  write(file,s);
}

// Home package cards: reserve equal title/copy space on desktop; the existing auto-margin keeps the CTA baseline shared.
{
  const file='assets/public-experience.css';
  let css=read(file);
  const marker='/* v4.1.56 home package price baseline + delivery-copy cleanup */';
  if(!css.includes(marker))css+=`
${marker}
@media(min-width:901px){
  .home-v21 .v21-package-grid>article>h3{min-height:clamp(150px,10.5vw,172px)}
  .home-v21 .v21-package-grid>article>p{min-height:90px}
  .home-v21 .v21-package-grid>article>strong{margin-top:0}
  .home-v21 .v21-package-grid>article>.vx-home-reset-gift{margin:18px 0 14px}
  .home-v21 .v21-package-grid>article>a[href*="bronuvannia"]{margin-top:auto}
}
@media(min-width:1280px){
  .home-v21 .v21-package-grid>article>p{min-height:70px}
}
`;
  write(file,css);
}

console.log('Applied v4.1.56: aligned home package prices and simplified delivery wording');
