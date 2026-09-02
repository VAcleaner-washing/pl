import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
let passed=0, failed=[];
const ck=(ok,label)=>{ if(ok){passed++;console.log('PASS:',label)}else{failed.push(label);console.log('FAIL:',label)} };
const read=rel=>fs.readFileSync(path.join(ROOT,rel));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const normHtml=b=>Buffer.from(b.toString('utf8')
  .replace(/([?&]v=)\d+/g,'$1VERSION')
  .replace(/v4\.\d+\.\d+/g,'VERSION'));
const release=JSON.parse(read('release.json').toString('utf8'));
const isV43=String(release.version).startsWith('4.3.');
const groupHash=(paths, normalizer=null)=>{
  const h=crypto.createHash('sha256');
  for(const rel of [...paths].sort()){
    h.update(rel);h.update('\0');h.update(normalizer?normalizer(rel,read(rel)):read(rel));h.update('\0');
  }
  return h.digest('hex');
};

const adminHtml=['admin/bronuvannia/index.html','admin/bronuvannia.html'];
for(const rel of adminHtml){
  if(isV43&&rel==='admin/bronuvannia/index.html'){
    const html=read(rel).toString('utf8');
    ck(html.includes('/assets/admin-v250.js')&&html.includes('/assets/admin-v430.css')&&html.includes('/assets/admin-v430.js')&&html.includes('/admin/manifest.webmanifest'),`${rel} ships canonical v4.3 production shell`);
  }else{
    ck(sha(normHtml(read(rel)))==='614245a5f75df1ff5d8f46c644edb88dede4874af7ebf7b69653bef3ae22b164',`${rel} structure is frozen to v4.1.63 baseline`);
  }
}

const normAdmin=(rel,b)=>{
  let s=b.toString('utf8');
  if(rel==='admin/sw.js') s=s.replace(/vacleaner-manager-\d+/g,'vacleaner-manager-BUILD').replace(/\?v=\d+/g,'?v=BUILD');
  // v4.2.37 adds an interaction-only suffix. Freeze the approved pre-v4.2.37
  // Glass shell byte-for-byte while newer interaction contracts are guarded semantically.
  if(rel==='assets/admin-glass-test.css') s=s.split('\n/* v4.2.37 — calm desktop interaction system',1)[0];
  return Buffer.from(s);
};
const immutableAdmin={
  'admin/sw.js':'ecf0d734ec92d9d1351d0536d72d7c9b44af29605e39e066aaa1828cd53c5303',
  'assets/admin-glass-test.js':'d9a02ec1a58296d5f173569fef4c287ff4f0dc026b5badc4b7516e023d765311',
  'assets/admin-glass-test.css':'ba20eb945ef4228ec795aeaf2222b31a2b71708c124ba19cbc88d61b4288a355',
  'admin/manifest.webmanifest':'a1ee1460fd67706a4ce381f7671732bf17a3e371d7f29b3794dc1bdbf1050de4',
  'admin/icon-192.png':'44740c4d4f8690774448cbe89e8d7b7e717eac6057fab37a6eabb2e596c272ab',
  'admin/icon-512.png':'7abb5975add23bd9fc88d56d085a39767c008a8abb1c67673fca1d5540eb475f',
  'admin/apple-touch-icon.png':'9ea74896634aa7e5f077d9f6314cd3cd9c58d321ed4cb08818fcff3ca8a7dfb4',
  'admin/favicon.ico':'31df59c329529c4c1f7073abc511a65d252bf6f255a5547878d772c7cba33060'
};
for(const [rel,expected] of Object.entries(immutableAdmin)){
  const binary=/\.(?:png|ico)$/i.test(rel);
  if(isV43&&(rel==='admin/sw.js'||rel==='admin/manifest.webmanifest')){
    const body=read(rel).toString('utf8');
    ck(rel==='admin/sw.js'?body.includes('/assets/admin-v430.css')&&body.includes('/assets/admin-v430.js')&&body.includes("const FALLBACK='/admin/bronuvannia/'"):body.includes('"start_url": "/admin/bronuvannia/"')&&body.includes('"scope": "/admin/"'),`${rel} carries approved v4.3 production PWA contract`);
  }else{
    ck(sha(binary?read(rel):normAdmin(rel,read(rel)))===expected,`${rel} remains frozen to approved admin identity/shell baseline`);
  }
}

// v4.2.34 intentionally advances the approved glass CSS baseline for the edge-to-edge PWA shell.
// v4.2.32 typography and all prior semantic guards remain required.
// Keep semantic guards so updating the frozen CSS hash cannot silently remove the agreed UX.
const glassCss=read('assets/admin-glass-test.css').toString('utf8');
if(isV43){const v43=read('assets/admin-v430.css').toString('utf8');const v43js=read('assets/admin-v430.js').toString('utf8');ck(v43.includes('VAcleaner v4.3.0 FINAL PRODUCTION POLISH')&&v43.includes('grid-template-columns:repeat(5,minmax(0,1fr))'),'v4.3 production mobile visual overlay is present');ck(v43js.includes('openFilterSheet')&&v43js.includes('native-alert-button'),'v4.3 header filter and bell controls are wired');}
ck(/\.client-primary-actions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(glassCss),'approved client primary actions stay compact 2-column');
ck(/\.client-contact-actions\{grid-template-columns:repeat\(auto-fit,minmax\(92px,1fr\)\)/.test(glassCss),'approved client contact actions stay compact and responsive');
ck(/@media\s*\(max-width:\s*360px\)[\s\S]*?\.client-primary-actions\{grid-template-columns:minmax\(0,1fr\)\}/.test(glassCss),'320px fallback keeps client actions readable');
ck(glassCss.includes('finance readability — vehicle costs are structured metrics'),'approved finance vehicle readability baseline is preserved');
ck(/\.delivery-car-cost\{display:grid;grid-template-columns:minmax\(230px,1\.25fr\)/.test(glassCss),'finance vehicle row keeps stable wide-desktop columns');

for(const rel of adminHtml){
  const s=read(rel).toString('utf8');
  ck(!/public-(?:shared|booking|guide|home)\.css|public-runtime-loader\.js|site-attribution\.js/.test(s),`${rel} is isolated from new public v4.2 modules`);
}

const result={passed,failed,status:failed.length?'failed':'passed'};
console.log(JSON.stringify(result,null,2));
process.exit(failed.length?1:0);
