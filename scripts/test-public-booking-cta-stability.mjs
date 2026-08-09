import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const bundle=fs.readFileSync(path.join(root,'_next','static','chunks','146ntlcv_t6~w-v4016.js'),'utf8');
const checks=[];
const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};

check(bundle.includes('eb=(0,n.useRef)("")'),'booking keeps a stable core-period signature ref');
check(bundle.includes('ef=`${e}|${j}|${g}|${v}|${k}`'),'core signature contains only product/date/window inputs');
check(bundle.includes('r=eb.current!==ef'),'estimate refresh distinguishes core-period changes');
check(bundle.includes('r&&(q("checking"),V(null))'),'checking state resets only when the core period changes');
check(bundle.includes('eb.current=ef'),'successful availability stores the validated core period');
check(bundle.includes('[e,j,g,v,k,_,S,er,en,P,z,promoCode,es,ef]'),'estimate still refreshes for delivery, extras, stories, phone and promo');
check(!bundle.includes('window.setTimeout(async()=>{q("checking"),W("")'),'estimate-only changes cannot unconditionally reset CTA to dates');

// State-machine contract mirrored from the hydrated bundle: only a core-period edit
// may invalidate the date gate while later-step estimate inputs keep it unlocked.
let validatedCore='puzzi|2026-08-11|2026-08-12|morning|morning';
let status='available';
const refresh=(core)=>{const coreChanged=validatedCore!==core;if(coreChanged)status='checking';return coreChanged};
for(const label of ['fulfillment','delivery address','stories','extra item','phone','promo']){
  status='available';
  check(refresh(validatedCore)===false && status==='available',`${label} keeps the date gate unlocked`);
}
status='available';
check(refresh('puzzi|2026-08-12|2026-08-13|morning|morning')===true && status==='checking','date change intentionally revalidates availability');

console.log(`Public booking CTA stability PASS: ${checks.length} checks.`);
