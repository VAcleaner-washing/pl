/* LAB only. Loaded synchronously before every production admin script. */
(()=>{'use strict';
const config=window.VA_LAB_CONFIG,KEY='vacleaner_lab_state_v1',nativeFetch=window.fetch.bind(window);
const now=()=>new Date().toISOString(),iso=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA')},copy=v=>structuredClone(v);
const session=()=>({access_token:'lab-synthetic-session',refresh_token:'lab-synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+86400,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000099'}});
document.documentElement.dataset.adminLab='synthetic';
for(const [key,value] of Object.entries({vacleaner_session:JSON.stringify(session()),vacleaner_session_persistent:'1',vacleaner_session_seen:String(Date.now())}))localStorage.setItem(key,value);
function seed(){
 const statuses=['pending','waiting_payment','confirmed','issued','completed','cancelled'];
 const bookings=statuses.flatMap((status,i)=>[0,1].map(j=>{
  const product_code=j?'sc2':'puzzi',start=i===3?-1:i===4?-7:i+j*2,finish=start+1,product=config.catalog.products[product_code];
  return{id:`00000000-0000-4000-8000-${String(i*2+j+1).padStart(12,'0')}`,booking_code:`LAB-${String(i*2+j+1).padStart(3,'0')}`,product_code,product_label:product.label,start_date:iso(start),return_date:iso(finish),start_at:iso(start)+'T08:00:00.000Z',end_at:iso(finish)+'T10:00:00.000Z',pickup_window:'morning',return_window:'morning',rental_days:1,fulfillment:'pickup',fulfillment_address:'Тестова адреса · Полтава',customer_name:`Демо клієнт ${i*2+j+1}`,customer_phone:`+38000000${String(i*2+j+1).padStart(4,'0')}`,customer_comment:i===0?'Тестовий коментар: почистити диван':'',source:i===0?'':j?'telegram':'instagram',extras:{selected_items:[],chemistry:{used_packets:0,story_mention:false},processing:{documents_required:false,identity_verified:false},pickup_time:'08:00',return_time:'10:00'},base_amount:Number(product.weekday),extras_amount:0,delivery_amount:0,total_amount:Number(product.weekday),prepayment_amount:200,prepayment_paid:!['pending','waiting_payment','cancelled'].includes(status),deposit_amount:1000,deposit_paid:['issued','completed'].includes(status),deposit_returned:status==='completed',status,admin_note:'Синтетичний запис. Не є реальною орендою.',created_at:iso(-9)+'T10:00:00.000Z',updated_at:now(),completed_at:status==='completed'?iso(-6)+'T10:00:00.000Z':null,vacleaner_booking_resources:Object.entries(product.resources||{}).map(([resource_code,quantity])=>({resource_code,quantity}))};
 }));
 return{schema:1,bookings,customers:bookings.map(b=>({phone:b.customer_phone,name:b.customer_name,address:'Полтава · тестова адреса',document_type:'',document_number:''})),expenses:[{id:'lab-expense-1',spent_on:iso(-1),category:'fuel',cost_type:'operating',amount:300,vendor:'Демо',note:'Тестова витрата',archived:false}],campaigns:[],audit:[],settings:copy(config)};
}
let db;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');db=saved?.schema===1?saved:seed()}catch{db=seed()}
function persist(next){localStorage.setItem(KEY,JSON.stringify(next));db=next}
persist(db);
const finance=b=>window.VA_LAB_SETTLEMENT.settlementFromBooking(b,db.settings.catalog,config.catalog);
const failure=(message,status=409)=>({status,body:{error:message}});
const ok=body=>({status:200,body});
function price(row,body){
 const core=window.VACLEANER_CORE,product=db.settings.catalog.products[row.product_code];
 const raw=core.rentalBase(product,row.start_date,row.return_date,row.pickup_window,row.return_window),discount=window.VA_LAB_PRICING.discountInfo(body,raw,row.extras);
 row.base_amount=discount.baseAmount;row.extras.base_before_discount=raw;
 row.extras.discount={...discount,primary_source:discount.primarySource};
 row.extras.manual_discount=discount.manualType==='none'?null:{type:discount.manualType,value:discount.manualValue,reason:discount.manualReason};
 const f=finance(row);row.extras_amount=f.totalExtras;row.total_amount=f.totalAmount;return f;
}
function calendar(body){
 const days=[];for(let i=0;i<Math.min(Number(body.days)||14,90);i++){
  const date=new Date((body.from||iso(0))+'T12:00:00');date.setDate(date.getDate()+i);
  days.push({date:date.toLocaleDateString('en-CA'),resources:Object.fromEntries(['puzzi','sc2','jimmy','abir'].map(code=>[code,{label:code,capacity:2,morning:2,evening:2}]))});
 }return days;
}
function route(url,body,method,next){
 const action=body.action||'',path=url.pathname;
 if(path.includes('/auth/v1/'))return ok(session());
 if(path.endsWith('/vacleaner-settings')){
  if(method==='POST')Object.assign(next.settings,body);
  return ok(next.settings);
 }
 if(action==='list')return ok({bookings:next.bookings,expenses:next.expenses});
 if(action==='clients')return ok({customers:next.customers});
 if(action==='calendar')return ok({days:calendar(body)});
 if(action==='campaigns')return ok({campaigns:next.campaigns});
 if(action==='referrals_expiring')return ok({rewards:[]});
 if(action==='referral_analytics')return ok({messages:[],uses:[],rewards:[],customers:[],bookings:[]});
 if(action==='referral_summary')return ok({referral:null});
 if(action==='pending_bonus')return ok({pendingPromo:null});
 if(action==='status'&&path.includes('booking-promo'))return ok({attachedPromo:null,availablePromo:null});
 if(action==='customer_sms_history')return ok({consent:'unknown',history:[]});
 if(action==='sms_dispatches')return ok({dispatches:[]});
 if(action==='sms_status')return ok({configured:false,sandbox:true});
 if(action==='health')return failure('LAB: production health не перевіряється');
 if(action==='audit_log')return ok({entries:next.audit.filter(e=>e.booking_id===body.bookingId).slice().reverse()});
 if(action==='lookup_customer'){
  const profile=next.customers.find(c=>c.phone===body.phone),orders=next.bookings.filter(b=>b.customer_phone===body.phone&&b.status==='completed').length;
  return ok({customer:profile?{...profile,completedOrders:orders,loyalty:{level:'Start',percent:0},hasDocumentPhoto:false}:null});
 }
 if(path.includes('customer-documents')){
  if(method==='GET')return ok({document:null});
  return failure('LAB: реальні документи не завантажуються. Використайте сценарій без документів.');
 }
 if(action==='save_customer'){
  const i=next.customers.findIndex(c=>c.phone===body.originalPhone),customer={phone:body.customerPhone,name:body.customerName,instagram:body.customerInstagram,telegram:body.customerTelegram,address:body.address||'',document_number:body.documentNumber||''};
  if(i>=0)next.customers[i]={...next.customers[i],...customer};else next.customers.push(customer);
  return ok({customer});
 }
 if(action==='save_expense'){
  const row={id:body.expenseId||crypto.randomUUID(),spent_on:body.spentOn,category:body.category,amount:Math.max(0,Number(body.amount)||0),cost_type:body.costType||'operating',vendor:body.vendor,note:body.note,archived:false};
  const i=next.expenses.findIndex(e=>e.id===row.id);if(i>=0)next.expenses[i]=row;else next.expenses.push(row);return ok({expense:row});
 }
 if(action==='archive_expense'){const row=next.expenses.find(e=>e.id===body.expenseId);if(row)row.archived=true;return ok({success:true})}
 const row=next.bookings.find(b=>b.id===body.bookingId);
 if(['create','edit'].includes(action)){
  if(body.referralCode||body.promoCode)return failure('LAB: перевірка реферального коду й промокоду потребує окремого staging API');
  if(action==='edit'&&!row)return failure('invalid_booking',404);
  const prior=next.bookings.find(b=>body.clientRequestId&&b.client_request_id===body.clientRequestId);if(action==='create'&&prior)return ok({booking:prior,idempotent:true});
  const product=next.settings.catalog.products[body.productCode];if(!product)return failure('invalid_product');
  const days=window.VACLEANER_CORE.rentalDays(body.startDate,body.returnDate,body.pickupWindow,body.returnWindow);
  if(!days||days>14)return failure('invalid_dates');
  if(!String(body.customerName||'').trim()||!/^\+380\d{9}$/.test(body.customerPhone))return failure('invalid_customer_data');
  const current=row||{id:body.clientRequestId||crypto.randomUUID(),client_request_id:body.clientRequestId,booking_code:`LAB-${String(next.bookings.length+1).padStart(3,'0')}`,status:'pending',created_at:now(),deposit_paid:false,deposit_returned:false,prepayment_amount:200,extras:{chemistry:{used_packets:0,story_mention:false}}};
  Object.assign(current,{product_code:body.productCode,product_label:product.label,start_date:body.startDate,return_date:body.returnDate,pickup_window:body.pickupWindow,return_window:body.returnWindow,rental_days:days,customer_name:body.customerName,customer_phone:body.customerPhone,customer_telegram:body.customerTelegram,customer_instagram:body.customerInstagram,customer_comment:body.customerComment,source:body.source||'instagram',admin_note:body.adminNote||'',fulfillment:body.fulfillment||'pickup',fulfillment_address:body.deliveryAddress||'Полтава · тестова адреса',prepayment_paid:body.prepaymentPaid===true||current.prepayment_paid===true,delivery_amount:body.fulfillment==='delivery'?Math.max(0,Number(body.deliveryAmountOverride)||config.deliveryFee):0,updated_at:now(),vacleaner_booking_resources:Object.entries(product.resources||{}).map(([resource_code,quantity])=>({resource_code,quantity}))});
  current.start_at=body.startDate+'T'+(body.pickupTime||'08:00')+':00.000Z';current.end_at=body.returnDate+'T'+(body.returnTime||'10:00')+':00.000Z';
  const core=window.VACLEANER_CORE,group=core.depositGroup(body.productCode),rules=next.settings.depositRules[group]||next.settings.depositRules.oneUnit;
  if(!row||!['waiting_payment','confirmed','issued','completed'].includes(row.status))current.deposit_amount=rules[core.isWeekendDeposit(body.startDate,body.returnDate,body.pickupWindow,body.returnWindow)?'weekend':'day'];
  Object.assign(current.extras,{pickup_time:body.pickupTime||'08:00',return_time:body.returnTime||'10:00',processing:body.processing||current.extras.processing,selected_items:(body.selectedExtras||[]).map(code=>({code,...next.settings.catalog.extras[code],payment_mode:'upfront'}))});
  price(current,body);if(!row)next.bookings.unshift(current);
  if(!next.customers.some(c=>c.phone===current.customer_phone))next.customers.push({phone:current.customer_phone,name:current.customer_name});
  return ok({booking:current});
 }
 if(path.includes('extend-rental')){
  if(!row||row.status!=='issued')return failure('extension_only_for_issued');
  if(body.returnDate+'T'+body.returnTime<=row.return_date+'T'+row.extras.return_time)return failure('invalid_extension');
  const prior=row.base_amount;row.return_date=body.returnDate;row.return_window=body.returnWindow;row.extras.return_time=body.returnTime;row.end_at=body.returnDate+'T'+body.returnTime+':00.000Z';row.rental_days=window.VACLEANER_CORE.rentalDays(row.start_date,row.return_date,row.pickup_window,row.return_window);price(row,{});
  return ok({booking:row,extension:{addedRentalAmount:row.base_amount-prior}});
 }
 if(action==='update'){
  if(!row)return failure('invalid_booking',404);
  const allowed={pending:['waiting_payment','confirmed','cancelled'],waiting_payment:['confirmed','cancelled'],confirmed:['issued','cancelled'],issued:['cancelled'],completed:[],cancelled:[]};
  if(!allowed[row.status]?.includes(body.status))return failure('invalid_transition');
  if(body.status==='confirmed'&&!row.prepayment_paid&&!row.extras?.prepayment_waiver?.confirmed)return failure('prepayment_not_confirmed');
  if(body.status==='issued'&&!row.deposit_paid)return failure('deposit_not_confirmed');
  row.status=body.status;row.admin_note=body.adminNote||row.admin_note;row.updated_at=now();return ok({booking:row});
 }
 if(action==='save_finance'){
  if(!row)return failure('invalid_booking',404);
  if(Number(body.manualChargeAmount)>0&&!String(body.manualChargeReason||'').trim())return failure('manual_charge_reason_required');
  row.deposit_amount=Math.max(0,Math.min(100000,Number(body.depositAmount??row.deposit_amount)||0));row.deposit_paid=body.depositPaid===true||row.deposit_paid===true;
  const hasPuzzi=Number(next.settings.catalog.products[row.product_code]?.resources?.puzzi)>0,raw=row.extras.base_before_discount??row.base_amount,eligible=hasPuzzi||raw>=1000;
  const choice=body.storyMention&&eligible?(row.product_code==='elite'?'chemistry2':hasPuzzi&&raw<1000?'chemistry2':body.storyGiftChoice||'diffuser50'):'';
  row.extras.chemistry={used_packets:hasPuzzi?Math.max(0,Math.min(100,Math.floor(Number(body.usedPackets)||0))):0,story_mention:choice==='chemistry2'};
  row.extras.gifts={...row.extras.gifts,story:choice?{mention:true,eligible:true,choice}:null};
  row.extras.manual_charge=Number(body.manualChargeAmount)>0?{amount:Number(body.manualChargeAmount),reason:body.manualChargeReason}:null;
  const discount=window.VA_LAB_PRICING.discountInfo(body,raw,row.extras);row.base_amount=discount.baseAmount;row.extras.discount={...discount,primary_source:discount.primarySource};row.extras.manual_discount=discount.manualType==='none'?null:{type:discount.manualType,value:discount.manualValue,reason:discount.manualReason};
  const f=finance(row);row.total_amount=f.totalAmount;row.extras_amount=f.totalExtras;row.extras.settlement={model:'prepayment_plus_deposit',completed:false};return ok({booking:row,finance:f});
 }
 if(action==='save_deposit_return'){
  if(!row||row.status!=='issued')return failure('settlement_only_for_issued');
  const f=finance(row),confirmation=window.VA_LAB_SETTLEMENT.settlementConfirmation(body,f);if(!confirmation.ok)return failure(confirmation.error);
  row.deposit_returned=true;row.status='completed';row.completed_at=now();row.extras.settlement={model:'prepayment_plus_deposit',received_amount:f.receivedAmount,expenses_amount:f.totalAmount,refund_amount:f.refundAmount,due_amount:f.dueAmount,refund_paid:confirmation.refundPaid,due_paid:confirmation.duePaid,completed:true,completed_at:now()};return ok({booking:row,finance:f});
 }
 return failure('LAB: ця дія ще не симулюється. Дані не змінено.');
}
const faults={delay:0,read:false,write:false};
window.VA_LAB=Object.freeze({getState:()=>copy(db),faults,reset:()=>{persist(seed());for(const key of Object.keys(localStorage))if(key.startsWith('vacleaner_')&&key!==KEY)localStorage.removeItem(key);location.reload()},export:()=>JSON.stringify({environment:'synthetic-lab',...db},null,2)});
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.origin),method=String(options.method||input?.method||'GET').toUpperCase();
 if(url.origin!==location.origin)throw new TypeError('LAB: external network blocked');
 if(!url.pathname.startsWith('/sandbox-api/')){
  if(!['GET','HEAD'].includes(method))throw new TypeError('LAB: non-simulated write blocked');
  return nativeFetch(input,options);
 }
 if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
 if(faults.delay)await new Promise(resolve=>setTimeout(resolve,faults.delay));
 if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
 let body={};try{body=typeof options.body==='string'?JSON.parse(options.body):{}}catch{return new Response('{"error":"invalid_json"}',{status:400})}
 const read=['list','clients','calendar','campaigns','lookup_customer','referral_summary','referral_analytics','referrals_expiring','audit_log','status','pending_bonus','customer_sms_history','sms_dispatches','sms_status','health'].includes(body.action)||method==='GET';
 if(read&&faults.read||!read&&faults.write)return new Response('{"error":"service_error"}',{status:503,headers:{'content-type':'application/json'}});
 const next=copy(db),result=route(url,body,method,next);
 if(result.status<300&&!read){
  if(body.bookingId)next.audit.push({id:crypto.randomUUID(),booking_id:body.bookingId,action:'lab:'+body.action,created_at:now(),actor:'LAB'});
  // Persist atomically before reporting success. Quota errors are surfaced to the form.
  try{persist(next)}catch{return new Response('{"error":"LAB: локальне сховище заповнене. Зміни не збережено."}',{status:507,headers:{'content-type':'application/json'}})}
 }
 return new Response(JSON.stringify(result.body),{status:result.status,headers:{'content-type':'application/json','cache-control':'no-store','x-vacleaner-environment':'synthetic-lab'}});
};
// Block external navigation/communication even when inherited handlers use window.open.
const nativeOpen=window.open.bind(window);
window.open=(url,...args)=>{const target=new URL(String(url||''),location.href);if(target.origin!==location.origin){alert('LAB: зовнішню дію заблоковано. Повідомлення й дзвінки не виконуються.');return null}return nativeOpen(url,...args)};
document.addEventListener('click',event=>{if(event.target.closest('#notificationToggle,#notificationTest,#pushDeviceSave,#sendInstagram,#sendTelegram,[data-referral-send],[data-client-instagram]')){event.preventDefault();event.stopImmediatePropagation();alert('LAB: сповіщення й зовнішні контакти заблоковано. Нічого не надсилається.');return}const link=event.target.closest('a[href]');if(!link||link.dataset.labStable!==undefined||link.dataset.labDownload!==undefined)return;const url=new URL(link.href,location.href);if(url.origin!==location.origin||!['http:','https:'].includes(url.protocol)){event.preventDefault();event.stopImmediatePropagation();alert('LAB: зовнішню дію заблоковано. Використовуються лише тестові дані.')}},true);
})();
