import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const configPath=path.join(root,'config','vacleaner.json');
const raw=fs.readFileSync(configPath,'utf8');
const config=JSON.parse(raw);
const hash=crypto.createHash('sha256').update(raw).digest('hex').slice(0,16);
const compact=JSON.stringify(config);
const browser=`(()=>{'use strict';const VERSION=${JSON.stringify(String(release.version))};const SOURCE_HASH=${JSON.stringify(hash)};const config=${compact};const {images,catalog,depositRules,slots}=config;const {products,extras}=catalog;const productAliases={};Object.entries(products).forEach(([code,item])=>[item.label,item.shortLabel,...(item.aliases||[])].filter(Boolean).forEach(label=>{productAliases[label]=code}));const extraAliases={};Object.entries(extras).forEach(([code,item])=>[item.label,...(item.aliases||[])].filter(Boolean).forEach(label=>{extraAliases[label]=code}));const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));const productMeta=code=>products[code]||null;const productImages=code=>(productMeta(code)?.imageKeys||['puzzi']).map(key=>images[key]).filter(Boolean);const depositGroup=code=>productMeta(String(code||''))?.depositGroup||'oneUnit';window.VACLEANER_CORE=Object.freeze({VERSION,version:VERSION,SOURCE_HASH,sourceHash:SOURCE_HASH,config,images,products,extras,catalog,depositRules,slots,productAliases,extraAliases,clone,productMeta,productImages,depositGroup});})();\n`;
fs.writeFileSync(path.join(root,'assets','vacleaner-core.js'),browser);
const shared=`// GENERATED from config/vacleaner.json. Do not edit by hand.\nexport const VACLEANER_RELEASE_VERSION=${JSON.stringify(String(release.version))};\nexport const VACLEANER_SOURCE_HASH=${JSON.stringify(hash)};\nexport const VACLEANER_CONFIG=${JSON.stringify(config)} as const;\nexport const DEFAULT_SLOTS=structuredClone(VACLEANER_CONFIG.slots);\nexport const DEFAULT_DEPOSIT_RULES=structuredClone(VACLEANER_CONFIG.depositRules);\nexport const DEFAULT_CATALOG=structuredClone(VACLEANER_CONFIG.catalog);\n`;
for(const name of ['vacleaner-settings','vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
 const dir=path.join(root,'supabase','functions',name);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'config.ts'),shared);
}
console.log(`Generated shared VAcleaner config ${hash}`);
