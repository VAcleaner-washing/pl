import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let failed=0,n=0;const ok=(name,cond)=>{n++;if(cond)console.log(`OK   ${name}`);else{failed++;console.error(`FAIL ${name}`)}};
const html=read('index.html'),css=read('assets/public-experience.css'),chunk=read('_next/static/chunks/01pb0x0z72e41.js');
const tariffs=[
  'Будні — 1 050 грн · вихідний — 1 150 грн · субота + неділя — 2 300 грн',
  'Будні — 1 300 грн · вихідний — 1 400 грн · субота + неділя — 2 200 грн',
  'Будні — 2 300 грн · вихідний — 2 500 грн · субота + неділя — 3 500 грн',
];
for(const tariff of tariffs){ok(`static home contains ${tariff}`,html.includes(tariff));ok(`hydrated home contains ${tariff}`,chunk.includes(tariff));}
ok('desktop home cards use a fixed shared title slot',css.includes('.home-v21 .v21-package-grid>article>h3{height:178px;min-height:178px}'));
ok('desktop home cards use a fixed shared description slot',css.includes('.home-v21 .v21-package-grid>article>p{height:90px;min-height:90px}'));
ok('tariff rows reserve equal visual depth',css.includes('.home-v21 .v21-package-grid>article>b{min-height:44px}'));
if(failed)process.exit(1);console.log(`v4.1.60 Home package rhythm: ${n}/${n} OK`);
