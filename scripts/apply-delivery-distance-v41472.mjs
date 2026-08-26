import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const skip=new Set(['.git','dist','node_modules','scripts','supabase','config','admin','test-results','pwa-test-results','density-test-results','final-desktop-test-results']);
const files=[];
function walk(dir,rel=''){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(skip.has(entry.name))continue;
    const next=rel?`${rel}/${entry.name}`:entry.name;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,next);
    else if(/\.(?:html|txt|js)$/.test(entry.name))files.push(full);
  }
}
walk(root);

const replacements=[
  ['Інше передмістя в межах робочої зони до 30 км від Полтави — 350 грн. За межами зони вартість погоджуємо до передоплати.','За межі Полтави: до 10 км — 350 грн, далі +15 грн за кожен додатковий км. Понад 30 км — вартість погоджуємо до передоплати.'],
  ['інше передмістя в межах робочої зони до 30 км від Полтави — 350 грн. Для адреси за межами зони вартість погоджуємо до передоплати.','за межі Полтави: до 10 км — 350 грн, далі +15 грн за кожен додатковий км. Понад 30 км — вартість погоджуємо до передоплати.'],
  ['інше передмістя до 30 км від Полтави — 350 грн.','за межі Полтави: до 10 км — 350 грн, далі +15 грн/км; понад 30 км — за погодженням.'],
  ['Інше передмістя в межах робочої зони до 30 км від Полтави — 350 грн.','За межі Полтави: до 10 км — 350 грн, далі +15 грн за кожен додатковий км. Понад 30 км — за погодженням.'],
  ['доставка до вас і назад — 250/350 грн','доставка — 250 грн / від 350 грн'],
  ['доставка 250/350 грн','доставка 250 грн / від 350 грн'],
  ['Доставка 250/350 грн','Доставка 250 грн / від 350 грн'],
  ['інше передмістя в зоні доставки','адреси за межами Полтави'],
  ['Інше передмістя в зоні доставки','Адреси за межами Полтави'],
];
let changed=0;
for(const file of files){
  let value=fs.readFileSync(file,'utf8'),next=value;
  for(const [from,to] of replacements)next=next.split(from).join(to);
  if(next!==value){fs.writeFileSync(file,next);changed++;}
}
console.log(`Applied v4.1.47.2 distance-delivery copy to ${changed} public files.`);
