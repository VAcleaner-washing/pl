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
  'assets/admin-glass-test.js':'70615a96504dd0e3bd9cee771044b2c531ce895144099617eed0936ba40a8ecf',
  'assets/admin-glass-test.css':'928c3e2837d0f03698b76bd801b5aff53c3254ee7a4cf5ffa7c9bf58d63a3bab',
  'admin/manifest.webmanifest':'a1ee1460fd67706a4ce381f7671732bf17a3e371d7f29b3794dc1bdbf1050de4',
  'admin/icon-192.png':'44740c4d4f8690774448cbe89e8d7b7e717eac6057fab37a6eabb2e596c272ab',
  'admin/icon-512.png':'7abb5975add23bd9fc88d56d085a39767c008a8abb1c67673fca1d5540eb475f',
  'admin/apple-touch-icon.png':'9ea74896634aa7e5f077d9f6314cd3cd9c58d321ed4cb08818fcff3ca8a7dfb4',
  'admin/favicon.ico':'31df59c329529c4c1f7073abc511a65d252bf6f255a5547878d772c7cba33060'
};
for(const [rel,expected] of Object.entries(immutableAdmin)){const binary=/\.(?:png|ico)$/i.test(rel);ck(sha(binary?read(rel):normAdmin(rel,read(rel)))===expected,`${rel} remains frozen to green v4.1.63 identity/shell baseline`)};

for(const rel of adminHtml){
  const s=read(rel).toString('utf8');
  ck(!/public-(?:shared|booking|guide|home)\.css|public-runtime-loader\.js|site-attribution\.js/.test(s),`${rel} is isolated from new public v4.2 modules`);
}

const result={passed,failed,status:failed.length?'failed':'passed'};
console.log(JSON.stringify(result,null,2));
process.exit(failed.length?1:0);
