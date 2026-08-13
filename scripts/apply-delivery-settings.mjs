import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const adminPath=path.join(root,'assets','admin-v250.js');
let admin=fs.readFileSync(adminPath,'utf8');
const once=(from,to,label)=>{
  if(!admin.includes(from)){
    if(admin.includes(to))return;
    throw new Error(`Delivery settings marker not found: ${label}`);
  }
  admin=admin.replace(from,to);
};

once(
  "function renderSettings(){const s=getSlots(),d=getDepositRules(),n=notificationState(),status=",
  "function renderSettings(){const s=getSlots(),d=getDepositRules(),deliveryFee=getDeliveryFee(),n=notificationState(),status=",
  'settings state',
);
once(
  "$('#view').innerHTML=`<div class=\"settings-grid\"><form class=\"card settings-card\" id=\"slotsForm\">",
  "$('#view').innerHTML=`<div class=\"settings-grid\"><form class=\"card settings-card delivery-settings-card\" id=\"deliveryFeeForm\"><div class=\"settings-head\"><div><h2>Доставка по Полтаві</h2><p>Єдина ціна для сайту, квізу, бронювання та нових замовлень в адмінці.</p></div><span class=\"deposit-settings-badge\">До вас і назад</span></div><label class=\"deposit-rule-field\"><span>Вартість доставки</span><div><input name=\"deliveryFee\" inputmode=\"numeric\" value=\"${deliveryFee}\" aria-label=\"Вартість доставки, гривень\"><em>грн</em></div></label><p class=\"settings-hint\">Після збереження нова сума з’явиться на публічних сторінках після оновлення. Старі бронювання не змінюються.</p><div class=\"settings-actions\"><button class=\"btn primary\" type=\"submit\">Зберегти доставку</button></div></form><form class=\"card settings-card\" id=\"slotsForm\">",
  'delivery form',
);
once(
  "</article></div>`;const form=$('#slotsForm');bindTimeDropdowns(form);",
  "</article></div>`;const deliveryForm=$('#deliveryFeeForm');deliveryForm.onsubmit=async e=>{e.preventDefault();const fee=Math.max(0,Number(String(new FormData(deliveryForm).get('deliveryFee')||'').replace(/\\D/g,''))||0),btn=deliveryForm.querySelector('[type=submit]');btn.disabled=true;try{await saveGlobalDeliveryFee(fee);toast('Доставку збережено для сайту й нових бронювань')}catch(err){toast(err.message)}finally{btn.disabled=false}};const form=$('#slotsForm');bindTimeDropdowns(form);",
  'delivery handler',
);
admin=admin.replaceAll('Доставка · 250 грн','Доставка · ${getDeliveryFee()} грн');
fs.writeFileSync(adminPath,admin);

const deliveryPage=path.join(root,'dostavka','index.html');
let deliveryHtml=fs.readFileSync(deliveryPage,'utf8');
if(!deliveryHtml.includes('/assets/public-experience.js')){
  deliveryHtml=deliveryHtml.replace(
    '<script defer="" src="/assets/site-v400.js',
    '<script defer="" src="/assets/public-experience.js?v=4042"></script><script defer="" src="/assets/site-v400.js',
  );
  fs.writeFileSync(deliveryPage,deliveryHtml);
}

console.log('Applied editable delivery settings to admin runtime.');
