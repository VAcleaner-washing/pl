import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.resolve(process.argv[2]||path.join(root,'lab-test-results/dist'));
const source=path.join(root,'dist');
if(target===source||target===root||target.startsWith(source+path.sep))throw new Error('LAB output must be separate from the production artifact');
if(!fs.existsSync(path.join(source,'admin/bronuvannia/index.html')))throw new Error('Build the canonical Pages artifact first');
fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
for(const name of ['admin','assets','images','release.json']){
 const from=path.join(source,name);if(fs.existsSync(from))fs.cpSync(from,path.join(target,name),{recursive:true});
}
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
// Deterministic PNG lab mark, including Apple's PNG-only home-screen icon.
function labIcon(size){
 const pixels=Buffer.alloc(size*(size*4+1));
 const glyphs={V:['10001','10001','10001','10001','01010','01010','00100'],A:['01110','10001','10001','11111','10001','10001','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],B:['11110','10001','10001','11110','10001','10001','11110']};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const at=y*(size*4+1)+1+x*4;pixels.set([19,29,40,255],at)}
 for(const [label,top,unit,color] of [['VA',.18,.06,[243,205,117,255]],['LAB',.62,.04,[196,216,239,255]]]){
  const scale=Math.max(1,Math.floor(size*unit)),left=Math.floor((size-(label.length*6-1)*scale)/2),start=Math.floor(size*top);
  [...label].forEach((letter,index)=>glyphs[letter].forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==='1')for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=left+(index*6+x)*scale+sx,py=start+y*scale+sy;if(px<size&&py<size)pixels.set(color,py*(size*4+1)+1+px*4)}})));
 }
 const crc=buffer=>{let value=0xffffffff;for(const byte of buffer){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0)}return(value^0xffffffff)>>>0};
 const chunk=(name,data)=>{const type=Buffer.from(name),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([length,type,data,checksum])};
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
// Remove every known external origin/key from the generated test artifact, including
// endpoint constants in overlays. The checked-in production source stays unchanged.
for(const file of walk(target))if(/\.(?:js|html|css|json|webmanifest)$/.test(file)){
 let s=fs.readFileSync(file,'utf8');
 s=s.replace(/https:\/\/[a-z0-9]+\.supabase\.co/g,'/sandbox-api')
    .replace(/sb_publishable_[A-Za-z0-9_-]+/g,'lab-no-production-key')
    .replace(/https:\/\/vacleaner\.pp\.ua/g,'');
 fs.writeFileSync(file,s);
}
const pure=(rel,names)=>`(()=>{${read(rel).replace(/export function /g,'function ')};return {${names.join(',')}}})()`;
const bootstrap=`window.VA_LAB_CONFIG=${JSON.stringify(JSON.parse(read('config/vacleaner.json')))};\n`+
 `window.VA_LAB_PRICING=${pure('supabase/functions/vacleaner-admin-bookings-v4/pricing.mjs',['discountInfo'])};\n`+
 `window.VA_LAB_SETTLEMENT=${pure('supabase/functions/vacleaner-admin-bookings-v4/settlement.mjs',['settlementFromBooking','settlementConfirmation'])};\n`+read('sandbox/adapter.js');
fs.writeFileSync(path.join(target,'assets/admin-lab-bootstrap.js'),bootstrap);
fs.copyFileSync(path.join(root,'sandbox/ui.js'),path.join(target,'assets/admin-lab-ui.js'));
fs.copyFileSync(path.join(root,'sandbox/ui.css'),path.join(target,'assets/admin-lab.css'));
fs.copyFileSync(path.join(root,'sandbox/forms.js'),path.join(target,'assets/admin-lab-forms.js'));
fs.copyFileSync(path.join(root,'sandbox/forms.css'),path.join(target,'assets/admin-lab-forms.css'));
let html=fs.readFileSync(path.join(target,'admin/bronuvannia/index.html'),'utf8');
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; worker-src 'self'; manifest-src 'self'";
html=html.replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi,'')
 .replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="robots" content="noindex,nofollow">`)
 .replace('<title>','<title>LAB · ')
 .replace(/,maximum-scale=1,user-scalable=no/g,'')
 .replace(/(<meta[^>]*name="apple-mobile-web-app-title"[^>]*content=")[^"]*/,'$1VA LAB')
 .replace('</head>',`<link rel="stylesheet" href="/assets/admin-lab.css?v=${release.build}"><link rel="stylesheet" href="/assets/admin-lab-forms.css?v=${release.build}"></head>`)
 .replace('<body>',`<body><script src="/assets/admin-lab-bootstrap.js?v=${release.build}"></script>`)
 .replace('</body>',`<script defer src="/assets/admin-lab-ui.js?v=${release.build}"></script><script defer src="/assets/admin-lab-forms.js?v=${release.build}"></script></body>`);
for(const rel of ['admin/bronuvannia/index.html','admin/bronuvannia.html'])fs.writeFileSync(path.join(target,rel),html);
fs.writeFileSync(path.join(target,'index.html'),`<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=/admin/bronuvannia/"><title>VAcleaner LAB</title><a href="/admin/bronuvannia/">Відкрити пісочницю</a></html>`);
const manifestFile=path.join(target,'admin/manifest.webmanifest');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
Object.assign(manifest,{id:'/admin/lab/',name:'VAcleaner LAB · тестові дані',short_name:'VA LAB',description:'Ізольована пісочниця. Тільки тестові дані.'});
manifest.icons=[192,512].map(size=>({src:`/admin/icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'}));
for(const size of [192,512])fs.writeFileSync(path.join(target,`admin/icon-${size}.png`),labIcon(size));
fs.writeFileSync(path.join(target,'admin/apple-touch-icon.png'),labIcon(180));
for(const size of [192,512])fs.writeFileSync(path.join(target,`admin/lab-icon-${size}.svg`),`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 192 192"><rect width="192" height="192" rx="42" fill="#131d28"/><text x="96" y="90" font-family="Arial,sans-serif" font-size="50" font-weight="700" fill="#f3cd75" text-anchor="middle">VA</text><text x="96" y="140" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#c4d8ef" text-anchor="middle">LAB</text></svg>`);
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
const swFile=path.join(target,'admin/sw.js');let sw=fs.readFileSync(swFile,'utf8').replaceAll('vacleaner-manager-','vacleaner-lab-');
sw=sw.replace('const CORE=[',`const CORE=['/assets/admin-lab-forms.js?v=${release.build}','/assets/admin-lab-forms.css?v=${release.build}','/assets/admin-lab-bootstrap.js?v=${release.build}','/assets/admin-lab-ui.js?v=${release.build}','/assets/admin-lab.css?v=${release.build}','/admin/lab-icon-192.svg','/admin/lab-icon-512.svg',`)
 .replace("keys.filter(key=>key!==CACHE)","keys.filter(key=>key.startsWith('vacleaner-lab-')&&key!==CACHE)");
fs.writeFileSync(swFile,sw);
const headers=`/*\n  Content-Security-Policy: ${csp}\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Permissions-Policy: geolocation=(), camera=(), microphone=()\n/admin/sw.js\n  Cache-Control: no-cache\n`;
fs.writeFileSync(path.join(target,'_headers'),headers);
fs.writeFileSync(path.join(target,'lab-release.json'),JSON.stringify({mode:'isolated-synthetic',version:release.version,build:release.build,stable:{version:'4.3.46',build:4346,commit:'15bf61dc4da4cf63405a25887353e6ec7178dce8',url:'https://vacleaner.pp.ua/admin/bronuvannia/'}} ,null,2)+'\n');
for(const file of walk(target))if(/\.(?:js|html|css|json|webmanifest)$/.test(file)&&/supabase\.co|sb_publishable_/.test(fs.readFileSync(file,'utf8')))throw new Error(`Production endpoint/key leaked: ${file}`);
console.log(`Prepared isolated synthetic LAB ${release.version}/${release.build}: ${target}`);
