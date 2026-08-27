import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const write=(rel,value)=>fs.writeFileSync(path.join(root,rel),value);

// Keep the manual-address fallback explicit after older release normalizers run.
{
  const rel='assets/public-booking-slots.js';
  let js=read(rel)
    .replace("return {amount:0,zone:'agreement',pending:false,quoteRequired:true,settlement,distanceKm:Number.isFinite(distance)?distance:null};","return {amount:0,zone:'manual',pending:false,quoteRequired:true,settlement,distanceKm:Number.isFinite(distance)?distance:null};")
    .replace("const label=quote.quoteRequired?'тариф підтвердить менеджер':quote.pending?'розрахуємо за адресою':formatMoney(quote.amount);",`const fallbackTariffs=\`Полтава \${formatMoney(deliveryPricing.local)} · передмістя \${formatMoney(deliveryPricing.baseOutside)}\`;
  const manualQuote=quote.quoteRequired&&quote.zone==='manual';
  const label=manualQuote||quote.pending?fallbackTariffs:quote.quoteRequired?'тариф підтвердить менеджер':formatMoney(quote.amount);`);
  if(!js.includes("quote.zone==='manual'")||!js.includes('Полтава ${formatMoney(deliveryPricing.local)} · передмістя'))throw new Error('Manual address fallback runtime is missing');
  write(rel,js);
}

{
  const rel='assets/address-autocomplete.js';
  let js=read(rel)
    .replace('Пошук адрес тимчасово недоступний. Введіть адресу повністю — менеджер перевірить її до передоплати.','Пошук адрес тимчасово недоступний. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.')
    .replace('Не знайшли точний збіг. Перевірте назву вулиці й номер або введіть адресу повністю.','Точного збігу немає. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.')
    .replace("setStatus(ctx,'manual','Введіть адресу вручну.',false)","setStatus(ctx,'manual','Введіть адресу вручну. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.',false)")
    .replace("setStatus(ctx,'manual','Адреса введена вручну.',false)","setStatus(ctx,'manual','Адреса введена вручну. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.',false)");
  if(!js.includes('Точного збігу немає. Полтава — 250 грн, передмістя — 350 грн.'))throw new Error('Manual address status copy is missing');
  write(rel,js);
}

// Initial HTML/RSC and hydrated component must use the same neutral delivery label.
for(const rel of ['bronuvannia/index.html','bronuvannia/index.txt','_next/static/chunks/146ntlcv_t6~w-v4041.js']){
  let value=read(rel);
  value=value.split('Доставка по Полтаві').join('Доставка');
  value=value.split('до вас і назад · 250 грн').join('до вас і назад · Полтава 250 грн · передмістя 350 грн');
  write(rel,value);
}

console.log('Applied v4.1.52 manual-address delivery fallback.');
