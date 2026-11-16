import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/booking-hardening-v4144.js','utf8');
const line=name=>{const value=source.split('\n').find(row=>row.startsWith(`function ${name}(`));assert(value,`Actual ${name} function missing`);return value};
const restore=source.slice(source.indexOf('function restore(){'),source.indexOf('let saveTimer=0;'));
assert(restore.startsWith('function restore(){')&&restore.includes('const replay=()=>{'));
const bootstrap=source.split('\n').find(row=>row.startsWith('let restoring='));
const clone=value=>JSON.parse(JSON.stringify(value));
const saved={schema:2,savedAt:1000,product:'puzzi_jimmy',task:'mattress',fulfillment:'pickup',step:2,controls:{'date-0':{value:'2026-11-18'},phone:{value:'+380000000099'},comment:{value:'Retained draft'}}};
let passed=0;
function check(name,run){run();passed++;console.log('PASS '+name)}
function harness({draft=saved,preset=false}={}){
 let now=1000,id=0,current={schema:2,savedAt:1000,product:'',task:'',fulfillment:'',step:0,controls:{}};
 const storage=new Map(draft?[['draft',JSON.stringify(draft)]]:[]),timers=new Map(),writes=[];
 const products={matches:()=>current.product===saved.product,click:()=>{current.product=saved.product}};
 const choices=['pickup','delivery'].map(mode=>({textContent:mode==='pickup'?'Самовивіз':'Доставка',classList:{contains:()=>current.fulfillment===mode},click:()=>{current.fulfillment=mode}}));
 const context={KEY:'draft',TTL:3600000,Date:{now:()=>now},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>{writes.push(JSON.parse(value));storage.set(key,value)},removeItem:key=>storage.delete(key)},
  collect:()=>clone(current),hasExternalPreset:()=>preset,norm:value=>String(value||''),CSS:{escape:value=>value},
  $:selector=>selector.startsWith('#booking-products .booking-products button')?products:selector==='.booking-form'?{dataset:{}}:selector==='.booking-progress'?{insertAdjacentElement:()=>{}}:null,
  $$:()=>choices,applyControl:(key,value)=>{current.controls[key]=clone(value);return true},matchMedia:()=>({matches:true}),
  window:{__VAC_SMART_BOOKING_SET_TASK__:task=>{current.task=task},__VAC_BOOKING_SET_STEP__:step=>{current.step=step}},document:{createElement:()=>({remove:()=>{}})},
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id},clearTimeout:key=>timers.delete(key)};
 vm.createContext(context);vm.runInContext(`${bootstrap}\nlet saveTimer=0;\n${['save','read','scheduleSave','respectCurrentInteraction'].map(line).join('\n')}\n${restore}`,context);
 function advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn()}now=end}
 return{context,writes,storage,advance,current:()=>current,edit:value=>{current.controls.comment={value}}};
}

check('published62 counterexample overwrites a saved draft before delayed restoration',()=>{
 const h=harness();
 vm.runInContext('function save(){try{const d=collect();if(d)sessionStorage.setItem(KEY,JSON.stringify(d))}catch{}}\nfunction scheduleSave(){if(restoring)return;clearTimeout(saveTimer);saveTimer=setTimeout(save,180)}',h.context);
 h.context.scheduleSave();h.advance(180);assert.equal(h.writes.length,1);assert.equal(JSON.parse(h.storage.get('draft')).product,'');assert.equal(JSON.parse(h.storage.get('draft')).fulfillment,'');
});
check('initial DOM autosave and direct save cannot erase the existing draft',()=>{
 const h=harness();h.context.scheduleSave();h.context.save();h.advance(420);assert.equal(h.writes.length,0);assert.deepEqual(JSON.parse(h.storage.get('draft')),saved);
});
for(const mode of ['pickup','delivery'])check(`saved ${mode} restores before autosave resumes`,()=>{
 const h=harness({draft:{...saved,fulfillment:mode}});h.context.restore();h.context.scheduleSave();h.context.save();assert.equal(h.writes.length,0);h.advance(120);
 assert.equal(h.current().product,saved.product);assert.equal(h.current().fulfillment,mode);assert.deepEqual(h.current().controls,saved.controls);assert.equal(h.current().step,2);
 h.context.scheduleSave();h.advance(180);assert.equal(h.writes.length,1);assert.equal(h.writes[0].fulfillment,mode);assert.deepEqual(h.writes[0].controls,saved.controls);
});
check('a current trusted edit takes precedence over pending automatic restoration',()=>{
 const h=harness();h.edit('Current input');h.context.respectCurrentInteraction({isTrusted:true});h.context.restore();h.context.scheduleSave();h.advance(420);
 assert.equal(h.current().controls.comment.value,'Current input');assert.equal(h.writes.length,1);assert.equal(h.writes[0].controls.comment.value,'Current input');
});
check('a trusted edit during deferred field replay is never overwritten by the older draft',()=>{
 const h=harness();h.context.restore();h.edit('Typed while restoring');h.context.respectCurrentInteraction({isTrusted:true});h.context.scheduleSave();h.advance(420);
 assert.equal(h.current().controls.comment.value,'Typed while restoring');assert.equal(h.writes.length,1);assert.equal(h.writes[0].controls.comment.value,'Typed while restoring');
});
check('programmatic replay events do not cancel restoration',()=>{
 const h=harness();h.context.restore();h.context.respectCurrentInteraction({isTrusted:false});h.advance(120);assert.deepEqual(h.current().controls,saved.controls);assert.equal(h.current().fulfillment,'pickup');
});
for(const options of [{draft:null},{preset:true}])check(options.preset?'external preset priority remains intact':'a fresh form starts saving after the empty restoration check',()=>{
 const h=harness(options);h.context.restore();h.edit('New draft');h.context.scheduleSave();h.advance(180);assert.equal(h.writes.length,1);assert.equal(h.writes[0].product,'');assert.equal(h.writes[0].controls.comment.value,'New draft');
});
console.log(JSON.stringify({passed,failed:0,productionWrites:0}));
