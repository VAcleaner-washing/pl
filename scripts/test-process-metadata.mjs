import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const admin=read('assets/admin-v250.js');
const edgeTs=read('supabase/functions/vacleaner-admin-bookings-v3/index.ts');
const edgeDeploy=read('supabase/functions/vacleaner-admin-bookings-v3/index.deploy.js');
const reminders=read('supabase/functions/vacleaner-reminders-v1/index.ts');
const worker=read('admin/sw.js');
const bookingPush=read('supabase/functions/vacleaner-booking-v5/index.ts');

const checks=[];
const check=(condition,label)=>{if(!condition)throw new Error(`FAIL: ${label}`);checks.push(label)};

check(admin.includes('const LEGACY_WORKFLOW_NOTES=new Set(['),'frontend has a dedicated legacy workflow-note filter');
check(admin.includes("const PROCESS_MARKER_PREFIX='[[VAC_PROCESS:'"),'frontend defines a hidden compatibility process marker');
check(admin.includes('function processMetaFromNote(value)'),'frontend can recover process state from compatibility marker');
check(admin.includes('function cleanManagerNote(value)'),'frontend cleans workflow metadata before display/edit');
check(admin.includes('!x.startsWith(PROCESS_MARKER_PREFIX)'),'hidden process marker is never exposed as manager note text');
check(!admin.includes('const noteFor=state=>'),'processing no longer serializes human workflow sentences into admin_note');
check(admin.includes("processMetaFor=state=>({contacted:state.contacted,confirmation_sent:state.confirmationSent,documents_required:state.documentsRequired,identity_verified:state.fd.get('identityVerified')==='on'"),'processing state is built as structured metadata');
check(admin.includes("customer_kind:state.documentsRequired?'new':(customerProfile?.isRepeatCustomer?'repeat':'known')"),'customer kind is mutually exclusive');
check(admin.includes('processing:processMetaFor(state),adminNote:adminNoteFor(state)'),'processing edit sends structured metadata plus backward-compatible hidden marker');
check(admin.includes("adminNoteFor=state=>[managerNote,processMarker(processMetaFor(state))].filter(Boolean).join('\\n')"),'process save preserves human note and stores only hidden machine state beside it');
check(admin.includes('<h3>Коментар клієнта</h3>')&&admin.includes('<h3>Примітка менеджера</h3>'),'client comment and manager note are separate UI concepts');
check(!admin.includes("b.customer_comment||b.admin_note||'Коментаря немає'"),'booking detail never falls back from client comment to admin workflow text');
check(admin.includes('adminNote:cleanManagerNote(b.admin_note)'),'regular editor starts from a cleaned manager note');
check(admin.includes("adminNote:b?managerNotePayload(fd.get('adminNote'),b):fd.get('adminNote')"),'regular booking save preserves hidden process state without exposing it');
check(admin.includes("adminNote:managerNotePayload(b.admin_note,b)"),'status-only updates preserve hidden process state');

for(const [name,source] of [['edge source',edgeTs],['edge deploy',edgeDeploy]]){
  check(source.includes('const cleanAdminNote ='),`${name} strips legacy workflow lines from admin_note`);
  check(source.includes('!line.startsWith("[[VAC_PROCESS:")'),`${name} strips hidden compatibility marker before database storage`);
  check(source.includes('const requestedProcessing = body.processing'),`${name} accepts structured processing metadata`);
  check(/\.\.\.\s*\(\s*processing\s*\?\s*\{\s*processing\s*\}\s*:\s*\{\s*\}\s*\)/.test(source)||/\.\.\.\s*processing\s*\?\s*\{\s*processing\s*\}\s*:\s*\{\s*\}/.test(source),`${name} persists processing inside extras`);
  check(source.includes('admin_note: cleanAdminNote(body.adminNote, 800) || null'),`${name} refuses to re-store workflow text/marker during create/edit`);
}

check(reminders.includes('title: `Нове бронювання · ${compactProductLabel(booking.product_label)}`'),'new-booking push uses concise Ukrainian title');
check(reminders.includes('${booking.customer_name || "Клієнт"}\\n${shortDate(booking.start_date)} ${pickupTime} → ${shortDate(booking.return_date)} ${returnTime} · ${money(booking.total_amount)} грн\\nПотрібне підтвердження'),'new-booking push body is compact and structured');
check(!`${reminders}\n${worker}\n${bookingPush}`.includes('from VAcleaner'),'VAcleaner push payload contains no literal "from VAcleaner" copy');
check(worker.includes("if(data.title==='Нове бронювання VAcleaner')return"),'legacy duplicate public-booking push remains suppressed');

console.log(`Process metadata / push copy PASS: ${checks.length} checks.`);
