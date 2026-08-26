import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const semverParts=v=>String(v||'').split('.').map(x=>Number(x)||0);
const versionAtLeast=(v,min)=>{const a=semverParts(v),b=semverParts(min);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true};
const routes=['index.html','dostavka/index.html','faq/index.html','tekhnika/karcher-puzzi-8-1/index.html','rishennia/textile/index.html'];
let n=0, failed=0;
function ok(name,cond){n++;if(cond)console.log(`OK   ${name}`);else{failed++;console.error(`FAIL ${name}`)}}
function schemas(html){return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{try{return [JSON.parse(m[1])]}catch{return []}})}
function walk(node,out=[]){if(Array.isArray(node)){for(const x of node)walk(x,out);return out}if(!node||typeof node!=='object')return out;out.push(node);for(const v of Object.values(node))walk(v,out);return out}
ok('patch release is coherent',pkg.version===release.version&&versionAtLeast(release.version,'4.1.47.1'));
for(const file of routes){
  const html=read(file),nodes=schemas(html).flatMap(x=>walk(x));
  const local=nodes.find(x=>x['@type']==='LocalBusiness');
  if(local){
    const area=Array.isArray(local.areaServed)?local.areaServed:[];
    ok(`${file} keeps explicit 250 UAH settlements`,['Полтава','Розсошенці','Щербані','Горбанівка'].every(name=>area.some(x=>x?.name===name)));
    ok(`${file} widens Local SEO entity to Poltava district`,area.some(x=>x?.['@type']==='AdministrativeArea'&&x?.name==='Полтавський район, Полтавська область'));
  }
  for(const service of nodes.filter(x=>x['@type']==='Service')){
    const area=Array.isArray(service.areaServed)?service.areaServed:[];
    ok(`${file} Service schema inherits wider service area`,area.some(x=>x?.name==='Полтавський район, Полтавська область'));
  }
}
const delivery=read('dostavka/index.html'), faq=read('faq/index.html');
ok('delivery page states 250 tier',delivery.includes('Полтава, Розсошенці, Щербані та Горбанівка — 250 грн'));
ok('delivery page keeps distance tariff after local tier',delivery.includes('до 10 км')&&delivery.includes('+15 грн'));
ok('FAQ states distance pricing outside Poltava',faq.includes('до 10 км')&&faq.includes('+15 грн'));
ok('outside-zone pricing remains agreement based',delivery.includes('Понад 30 км')&&delivery.includes('погодж')&&faq.includes('Понад 30 км')&&faq.includes('погодж'));
ok('no suburb doorway pages were introduced',!fs.existsSync('orenda-puzzi-rozsoshentsi')&&!fs.existsSync('orenda-puzzi-shcherbani')&&!fs.existsSync('orenda-puzzi-horbanivka'));
if(failed)process.exit(1);
console.log(`v4.1.47.1 local area patch: ${n}/${n} OK`);
