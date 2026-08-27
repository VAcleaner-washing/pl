import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let checks=0,failed=0;
const ok=(name,value)=>{checks++;if(!value){failed++;console.error(`FAIL ${name}`)}};

const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const articleFiles=fs.readdirSync(path.join(root,'blog'),{withFileTypes:true})
  .filter(entry=>entry.isDirectory())
  .map(entry=>path.join('blog',entry.name,'index.html'))
  .filter(rel=>fs.existsSync(path.join(root,rel)));
const articles=articleFiles.map(read).join('\n');
const banned=[
  'екстрактор','екстрагу','екстракція','rinse','spotter','wick-back','окиснювальн',
  'стійкість барвника','контролюючи освітлення','контролюйте освітлення','контактний час',
  'робочий розчин','первинний відбір','відбір вологи','промивальні проходи','термошок',
  'термостійк','механічного етапу','сервісними діями','суспензі','епідерміс',
  'перезволож','композитна роликова','кант','робочого розчину','відбор','локальн',
  'нейтралізатор','екстракцією','температуростійк','зчеплен'
];

const versionAtLeast=(value,min)=>value.split('.').map(Number).reduce((n,x,i)=>n+(x||0)*[1e6,1e3,1][i],0)>=min.split('.').map(Number).reduce((n,x,i)=>n+(x||0)*[1e6,1e3,1][i],0);
ok('release is coherent',versionAtLeast(release.version,'4.1.55')&&Number(release.build)>=4155&&pkg.version===release.version);
ok('all public advice articles are covered',articleFiles.length===8);
for(const term of banned)ok(`advice avoids jargon: ${term}`,!articles.toLowerCase().includes(term.toLowerCase()));
ok('SPOT FIX names Puzzi in plain language',articles.includes('промийте це місце чистою водою за допомогою Kärcher Puzzi'));
ok('STAIN OX explains visible result plainly',articles.includes('стежте, як пляма світлішає'));
ok('Puzzi steps explain water collection plainly',articles.includes('подаючи воду й одразу збираючи її Puzzi'));
ok('spot rinsing is explained as an action',articles.includes('Налийте в Puzzi чисту воду, промийте лише оброблене місце й одразу зберіть воду.'));
ok('no broken transformed phrase remains',!articles.includes('кількість засобу плямовивідник')&&!articles.includes('чистою водою або чистою водою'));
const adviceBlocks=[...articles.matchAll(/<(p|h2|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map(match=>match[2].replace(/<[^>]*>/g,' '));
ok('no accidental repeated words remain',adviceBlocks.every(text=>!/(\p{L}{3,})\s+\1/iu.test(text)));

const css=read('assets/booking-hardening-v4144.css');
ok('booking guide has explicit readable heading color',css.includes('#booking-products .vx-smart-entry__guide strong{color:#17191b}'));
ok('booking guide has explicit readable supporting color',css.includes('#booking-products .vx-smart-entry__guide small{color:#625b52}'));
ok('booking guide link has dark gold contrast',css.includes('#booking-products .vx-smart-entry__guide>a{color:#885313}'));

const workflow=read('.github/workflows/pages.yml');
ok('CI runs clear-advice regression',workflow.includes('test:v4.1.55-clear-advice'));

if(failed){console.error(`v4.1.55 clear advice: ${checks-failed}/${checks} OK`);process.exit(1)}
console.log(`v4.1.55 clear advice: ${checks}/${checks} OK`);
