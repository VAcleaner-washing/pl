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
const groupHash=(paths, normalizer=null)=>{
  const h=crypto.createHash('sha256');
  for(const rel of [...paths].sort()){
    h.update(rel);h.update('\0');h.update(normalizer?normalizer(rel,read(rel)):read(rel));h.update('\0');
  }
  return h.digest('hex');
};

const adminHtml=['admin/bronuvannia/index.html','admin/bronuvannia.html'];
for(const rel of adminHtml){
  ck(sha(normHtml(read(rel)))==='614245a5f75df1ff5d8f46c644edb88dede4874af7ebf7b69653bef3ae22b164',`${rel} structure is frozen to v4.1.63 baseline`);
}

const normAdmin=(rel,b)=>{
  let s=b.toString('utf8');
  if(rel==='admin/sw.js') s=s.replace(/vacleaner-manager-\d+/g,'vacleaner-manager-BUILD').replace(/\?v=\d+/g,'?v=BUILD');
  return Buffer.from(s);
};
const immutableAdmin={
  'admin/sw.js':'ecf0d734ec92d9d1351d0536d72d7c9b44af29605e39e066aaa1828cd53c5303',
  'assets/admin-glass-test.js':'d9a02ec1a58296d5f173569fef4c287ff4f0dc026b5badc4b7516e023d765311',
  'assets/admin-glass-test.css':'50ad109a3764a4b7b4f65cc410144446a55fb2f24171cab205c94223530ebb68',
  'admin/manifest.webmanifest':'a1ee1460fd67706a4ce381f7671732bf17a3e371d7f29b3794dc1bdbf1050de4',
  'admin/icon-192.png':'44740c4d4f8690774448cbe89e8d7b7e717eac6057fab37a6eabb2e596c272ab',
  'admin/icon-512.png':'7abb5975add23bd9fc88d56d085a39767c008a8abb1c67673fca1d5540eb475f',
  'admin/apple-touch-icon.png':'9ea74896634aa7e5f077d9f6314cd3cd9c58d321ed4cb08818fcff3ca8a7dfb4',
  'admin/favicon.ico':'31df59c329529c4c1f7073abc511a65d252bf6f255a5547878d772c7cba33060'
};
for(const [rel,expected] of Object.entries(immutableAdmin)){const binary=/\.(?:png|ico)$/i.test(rel);ck(sha(binary?read(rel):normAdmin(rel,read(rel)))===expected,`${rel} remains frozen to approved admin identity/shell baseline`)};

// v4.2.22 intentionally advances only the approved client-card/PWA responsive baseline.
// Keep semantic guards so updating the frozen CSS hash cannot silently remove the agreed UX.
const glassCss=read('assets/admin-glass-test.css').toString('utf8');
ck(/\.client-primary-actions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(glassCss),'approved client primary actions stay compact 2-column');
ck(/\.client-contact-actions\{grid-template-columns:repeat\(auto-fit,minmax\(92px,1fr\)\)/.test(glassCss),'approved client contact actions stay compact and responsive');
ck(/@media\s*\(max-width:\s*360px\)[\s\S]*?\.client-primary-actions\{grid-template-columns:minmax\(0,1fr\)\}/.test(glassCss),'320px fallback keeps client actions readable');

for(const rel of adminHtml){
  const s=read(rel).toString('utf8');
  ck(!/public-(?:shared|booking|guide|home)\.css|public-runtime-loader\.js|site-attribution\.js/.test(s),`${rel} is isolated from new public v4.2 modules`);
}

const result={passed,failed,status:failed.length?'failed':'passed'};
console.log(JSON.stringify(result,null,2));
process.exit(failed.length?1:0);
