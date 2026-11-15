import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const source=fs.readFileSync('assets/admin-v250.js','utf8');
const names=['liveBookingFingerprint','liveBookingSessionKey','liveBookingLayerContext','liveBookingContextCurrent','clearLiveDetailNotice','showLiveDetailNotice','refreshLiveBookingDetail','syncBookingsLive'];
const actual=name=>{const value=source.split('\n').find(line=>line.startsWith(`function ${name}(`)||line.startsWith(`async function ${name}(`));assert(value,`actual ${name}`);return value};
const checks=[];
async function check(name,test){try{await test();checks.push({name,passed:true});console.log('PASS:',name)}catch(error){checks.push({name,passed:false,error:error.stack});console.error('FAIL:',name,error.message)}}
function harness({layerKind='detail',deferred=false}={}){
 let layerType=layerKind,resolveRead,rejectRead,session={user:{id:'synthetic-manager-a'},access_token:'synthetic-access'},reply,bodyActionSheet=false;
 const calls=[],frames=[],renders=[],opened=[],warnings=[];
 const pending=new Promise((resolve,reject)=>{resolveRead=resolve;rejectRead=reject});
 const booking={id:'00000000-0000-4000-8000-000000000062',status:'issued',total_amount:700,deposit_amount:1000,deposit_paid:true,customer_name:'Synthetic customer',extras:{}};
 const context={};
 class Node{
  constructor(tag='DIV',classes=''){this.tagName=tag;this.id='';this.dataset={};this.disabled=false;this.isConnected=true;this.children=[];this.listeners=new Map();this.scrollTop=0;this.scrollLeft=0;this.textContent='';this.attributes={};const set=new Set(classes.split(' ').filter(Boolean));this.classList={contains:n=>set.has(n),add:n=>set.add(n),toggle:(n,value)=>{if(value??!set.has(n))set.add(n);else set.delete(n)},[Symbol.iterator]:()=>set[Symbol.iterator]()};this.className=classes}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node)}}
  remove(){this.isConnected=false;if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(node=>node!==this)}
  setAttribute(name,value){this.attributes[name]=value}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn)}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn)}
  contains(node){return node===this||this.children.some(child=>child.contains(node))}
  focus(){context.document.activeElement=this}
  querySelector(selector){return this.one?.(selector)??null}
  querySelectorAll(selector){return this.all?.(selector)??[]}
 }
 const makeDetail=()=>{
  const root=new Node('DIV','detail'),head=new Node('DIV','detail-top'),shell=new Node('DIV','detail-shell'),grid=new Node('DIV','detail-grid'),back=new Node('BUTTON','back'),action=new Node('BUTTON','btn primary-action'),alreadyDisabled=new Node('BUTTON','btn'),dock=new Node('BUTTON','btn'),ledger=new Node('DETAILS','lab-ledger'),summary=new Node('SUMMARY'),history=new Node('BUTTON','v4321-history-row'),contact=new Node('A');
  action.dataset.action='complete';alreadyDisabled.dataset.action='cancel';alreadyDisabled.disabled=true;action.textContent='Прийняти повернення';back.textContent='До списку';summary.textContent='Склад розрахунку';contact.textContent='Контакт';ledger.open=false;ledger.append(summary);head.append(back);shell.append(grid,action,alreadyDisabled,ledger,history,contact);root.append(head,shell,dock);
  root.one=selector=>({'form,dialog[open],.modal,[aria-busy="true"]':root.busy?new Node():null,'.detail-top':head,'.detail-shell':shell,'.detail-grid':grid,'.back':back,'.v4321-history-row':history}[selector]??null);
  root.all=selector=>({'[data-action],.lab-action-dock button':[action,alreadyDisabled,dock],details:[ledger],'button,a[href],summary,[tabindex]':[back,action,alreadyDisabled,dock,summary,history,contact]}[selector]??[]);
  ledger.one=selector=>selector==='summary'?summary:null;
  return{root,head,shell,grid,back,action,alreadyDisabled,dock,ledger,summary,history,contact};
 };
 let detail=makeDetail();const layer=new Node();
 function setLayer(kind){layerType=kind;layer.children=kind==='empty'?[]:kind==='detail'?[detail.root]:[new Node()];layer.one=selector=>selector===':scope>.detail'&&kind==='detail'?detail.root:null}
 setLayer(layerKind);reply={bookings:[{...booking}],expenses:[]};
 const state={dataLoaded:true,bookings:[booking],expenses:[],calendar:[],view:'bookings',detail:layerKind==='detail'?booking:null,listScroll:404,lastError:null};
 Object.assign(context,{state,document:{visibilityState:'visible',activeElement:detail.action,createElement:tag=>new Node(tag.toUpperCase())},navigator:{onLine:true},console:{warn:(...args)=>warnings.push(args)},requestAnimationFrame:fn=>frames.push(fn),
  initialDataLoadPromise:null,fullDataRefreshPromise:null,liveBookingSyncBusy:false,lastLiveBookingFingerprint:'',detailRestoreVersion:1,userActionVersion:0,detailReturnFocus:new Node('BUTTON'),detailReturnClient:{name:'Parent client'},detailReturnClientOptions:{backLabel:'Parent'},detailReturnSearch:{query:'retained'},
  getSession:()=>session,$:selector=>selector==='#layer'?layer:selector==='.native-v2-action-sheet-layer'&&bodyActionSheet?{}:null,invokeData:async payload=>{calls.push(payload);if(deferred)return pending;return reply},invoke:async()=>({days:[]}),todayIso:()=>'',recalcCalendarSlots:days=>days,
  renderAfterLiveSync:()=>renders.push('main'),renderBadges:()=>{},renderLoadError:()=>renders.push('error'),toast:()=>{},loadStartupData:async()=>{state.dataLoaded=true},
  openDetail:(next,options)=>{opened.push({booking:next,options});detail.root.isConnected=false;detail=makeDetail();setLayer('detail');state.detail=next;state.listScroll=0;context.detailRestoreVersion++},
 });
 vm.createContext(context);vm.runInContext('const liveDetailNotices=new WeakMap();\n'+names.map(actual).join('\n'),context);
 context.lastLiveBookingFingerprint=context.liveBookingFingerprint(state.bookings);
 return{context,state,calls,renders,opened,warnings,layer,get detail(){return detail},booking,run:options=>context.syncBookingsLive(options),setLayer,bodyActionSheet(value){bodyActionSheet=value},reply(value){reply=value},resolve(value){resolveRead(value)},reject(error=new Error('synthetic read unavailable')){rejectRead(error)},session(value){session=value},replaceDetail(next={...booking}){detail.root.isConnected=false;detail=makeDetail();state.detail=next;context.detailRestoreVersion++;setLayer('detail')},flush(){while(frames.length){const frame=frames.splice(0);frame.forEach(fn=>fn())}}};
}

await check('immutable published61 counterexample never reads with the same read-only detail open',async()=>{const h=harness(),fixture=fs.readFileSync('scripts/fixtures/live-booking-sync-before-detail-refresh.js','utf8'),original=fixture.split('\n').find(line=>line.startsWith('async function syncBookingsLive('));assert.equal(createHash('sha256').update(original).digest('hex'),'76e67b657256f81942b1c10fff50b98057fc4a185cd4a6fe2119e4c47ef3fde0');vm.runInContext(fixture,h.context);h.reply({bookings:[{...h.booking,status:'completed',total_amount:1777}],expenses:[]});await h.run();assert.equal(h.calls.length,0);assert.equal(h.state.detail.status,'issued');assert.equal(h.state.detail.total_amount,700);assert.equal(h.opened.length,0)});
await check('read-only detail receives authoritative peer status and financial changes',async()=>{const h=harness();h.reply({bookings:[{...h.booking,status:'completed',total_amount:1777}],expenses:[]});await h.run();assert.equal(h.calls.length,1);assert.equal(h.state.detail.status,'completed');assert.equal(h.state.detail.total_amount,1777);assert.equal(h.opened.length,1);h.flush()});
await check('background list retains ordinary live refresh',async()=>{const h=harness({layerKind:'empty'});h.reply({bookings:[{...h.booking,status:'confirmed'}],expenses:[]});await h.run();assert.equal(h.calls.length,1);assert.equal(h.renders.length,1);assert.equal(h.opened.length,0)});
await check('unchanged detail keeps the existing DOM and focus',async()=>{const h=harness(),root=h.detail.root;await h.run();assert.equal(h.calls.length,1);assert.equal(h.detail.root,root);assert.equal(h.opened.length,0)});
await check('unrelated booking changes refresh the list without recreating current detail',async()=>{const h=harness();h.reply({bookings:[h.booking,{id:'other',status:'pending'}],expenses:[]});await h.run();assert.equal(h.renders.length,1);assert.equal(h.opened.length,0)});
await check('changed detail fields refresh even when the compact list fingerprint is unchanged',async()=>{const h=harness();h.reply({bookings:[{...h.booking,customer_name:'Peer corrected customer'}],expenses:[]});await h.run();assert.equal(h.opened.length,1);assert.equal(h.state.detail.customer_name,'Peer corrected customer')});
for(const layerKind of ['form','inner-dialog'])await check(`${layerKind} is protected from ordinary and forced live reads`,async()=>{const h=harness({layerKind});await h.run();await h.run({force:true});assert.equal(h.calls.length,0)});
await check('busy detail does not begin a live read',async()=>{const h=harness();h.detail.root.busy=true;await h.run();assert.equal(h.calls.length,0)});
await check('body-mounted action sheet protects its captured detail buttons until dismissal',async()=>{const h=harness(),original=h.detail.root;h.bodyActionSheet(true);h.reply({bookings:[{...h.booking,status:'completed'}],expenses:[]});await h.run();await h.run({force:true});assert.equal(h.calls.length,0);assert.equal(h.detail.root,original);h.bodyActionSheet(false);await h.run();assert.equal(h.calls.length,1);assert.equal(h.state.detail.status,'completed');assert.equal(h.opened.length,1)});
await check('body-mounted action sheet opened during a read prevents replacing its captured controls',async()=>{const h=harness({deferred:true}),original=h.detail.root,running=h.run();h.bodyActionSheet(true);h.resolve({bookings:[{...h.booking,status:'completed'}],expenses:[]});await running;assert.equal(h.detail.root,original);assert.equal(h.state.detail.status,'issued');assert.equal(h.opened.length,0);assert.equal(h.context.liveBookingSyncBusy,false)});
for(const [name,change] of [
 ['form opens',h=>h.setLayer('form')],['different booking opens',h=>h.replaceDetail({...h.booking,id:'other-booking'})],['same booking reopens',h=>h.replaceDetail()],['detail closes',h=>h.setLayer('empty')],['manager logs out',h=>h.session(null)],['manager session changes',h=>h.session({user:{id:'other-manager'},access_token:'other-access'})],['document becomes hidden',h=>{h.context.document.visibilityState='hidden'}],
])await check(`late response is ignored after ${name}`,async()=>{const h=harness({deferred:true}),original=h.state.bookings;const running=h.run();change(h);h.resolve({bookings:[{...h.booking,status:'completed'}],expenses:[]});await running;assert.equal(h.state.bookings,original);assert.equal(h.opened.length,0);assert.equal(h.renders.length,0);assert.equal(h.context.liveBookingSyncBusy,false)});
await check('read error visibly blocks only mutation controls and retry restores prior states',async()=>{
 const h=harness({deferred:true}),d=h.detail;const running=h.run();h.reject();await running;
 assert.equal(d.root.dataset.liveDetailStale,'true');assert.equal(d.action.disabled,true);assert.equal(d.dock.disabled,true);assert.equal(d.alreadyDisabled.disabled,true);assert.equal(d.back.disabled,false);assert.equal(d.history.disabled,false);assert.equal(d.contact.disabled,false);assert.equal(d.ledger.disabled,false);
 const notice=d.head.children.find(node=>node.dataset.liveDetailNotice==='');assert(notice);assert.match(notice.children[0].textContent,/застарілими/);assert.equal(notice.attributes.role,'status');assert.equal(notice.children[1].textContent,'Перевірити ще раз');
 h.context.invokeData=async payload=>{h.calls.push(payload);return{bookings:[{...h.booking}],expenses:[]}};await notice.children[1].onclick();
 assert.equal(d.root.dataset.liveDetailStale,undefined);assert.equal(d.action.disabled,false);assert.equal(d.dock.disabled,false);assert.equal(d.alreadyDisabled.disabled,true);assert.equal(notice.isConnected,false);assert.equal(h.state.lastError,null);
});
await check('missing booking gets an honest non-deletion notice and blocks stale actions',async()=>{const h=harness();h.reply({bookings:[],expenses:[]});await h.run();assert.equal(h.detail.root.dataset.liveDetailStale,'true');assert.equal(h.detail.action.disabled,true);const notice=h.detail.head.children.find(n=>n.dataset.liveDetailNotice==='');assert.match(notice.children[0].textContent,/відсутнє в отриманому списку/);assert.equal(h.state.detail.id,h.booking.id)});
await check('returning booking clears missing-record warning on the next successful read',async()=>{const h=harness();h.reply({bookings:[],expenses:[]});await h.run();h.reply({bookings:[{...h.booking}],expenses:[]});await h.run();assert.equal(h.detail.root.dataset.liveDetailStale,undefined);assert.equal(h.detail.action.disabled,false)});
await check('in-flight sync remains single-flight',async()=>{const h=harness({deferred:true}),running=h.run();await h.run({force:true});assert.equal(h.calls.length,1);h.resolve({bookings:[h.booking],expenses:[]});await running;assert.equal(h.context.liveBookingSyncBusy,false)});
await check('legitimate access-token rotation for the same manager does not discard fresh resume data',async()=>{const h=harness({deferred:true}),running=h.run();h.session({user:{id:'synthetic-manager-a'},access_token:'rotated-synthetic-access'});h.resolve({bookings:[{...h.booking,total_amount:1777}],expenses:[]});await running;assert.equal(h.state.detail.total_amount,1777);assert.equal(h.opened.length,1)});
for(const [name,change] of [['offline',h=>{h.context.navigator.onLine=false}],['hidden',h=>{h.context.document.visibilityState='hidden'}],['signed out',h=>h.session(null)]])await check(`${name} does not read`,async()=>{const h=harness();change(h);await h.run();assert.equal(h.calls.length,0)});
await check('refresh preserves scroll, focused action, disclosures and parent-return context after layout frames',async()=>{
 const h=harness(),old=h.detail;old.root.scrollTop=12;old.shell.scrollTop=420;old.grid.scrollLeft=7;old.ledger.open=true;old.root.classList.add('v4321-history-open');h.context.document.activeElement=old.action;
 h.reply({bookings:[{...h.booking,total_amount:1200}],expenses:[]});await h.run();assert.equal(h.state.listScroll,404);h.flush();const current=h.detail;
 assert.equal(current.root.scrollTop,12);assert.equal(current.shell.scrollTop,420);assert.equal(current.grid.scrollLeft,7);assert.equal(current.ledger.open,true);assert.equal(current.root.classList.contains('v4321-history-open'),true);assert.equal(current.history.attributes['aria-expanded'],'true');assert.equal(h.context.document.activeElement,current.action);assert.equal(h.opened[0].options.returnClient.name,'Parent client');assert.equal(h.opened[0].options.returnSearch.query,'retained');
});
await check('queued restoration never moves focus or scroll after a newer user action',async()=>{const h=harness();h.detail.shell.scrollTop=420;h.reply({bookings:[{...h.booking,total_amount:1200}],expenses:[]});await h.run();h.context.userActionVersion++;h.detail.shell.scrollTop=18;h.context.document.activeElement=h.detail.contact;h.flush();assert.equal(h.detail.shell.scrollTop,18);assert.equal(h.context.document.activeElement,h.detail.contact)});
await check('content position transfers when refreshed status changes the mobile scroll owner',async()=>{const h=harness();h.detail.shell.scrollTop=420;h.reply({bookings:[{...h.booking,status:'completed'}],expenses:[]});await h.run();h.detail.root.scrollHeight=1500;h.detail.root.clientHeight=956;h.detail.shell.scrollHeight=1000;h.detail.shell.clientHeight=1000;h.flush();assert.equal(h.detail.root.scrollTop,420)});
await check('queued restoration never applies to another opened form',async()=>{const h=harness();h.detail.shell.scrollTop=420;h.reply({bookings:[{...h.booking,total_amount:1200}],expenses:[]});await h.run();h.detail.root.isConnected=false;h.setLayer('form');h.flush();assert.equal(h.detail.shell.scrollTop,0)});

const report={scope:'Actual shipped live-sync/refresh functions with isolated reads and DOM model; no external API or business writes',passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks};
const output=process.argv.find(arg=>arg.startsWith('--output='))?.slice('--output='.length);if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
