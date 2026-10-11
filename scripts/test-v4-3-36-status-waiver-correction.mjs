import fs from 'node:fs';
import assert from 'node:assert/strict';

const status=fs.readFileSync('supabase/functions/vacleaner-status-correction-v1/index.ts','utf8');
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');

let pass=0;
const ok=(condition,label)=>{assert.ok(condition,label);pass++;console.log('PASS',label)};

ok(status.includes('const prepaymentSatisfied = current.prepayment_paid === true || currentExtras?.prepayment_waiver?.active === true'),'status correction accepts active prepayment waiver as payment prerequisite');
ok(status.includes('nextStatus === "confirmed" && !prepaymentSatisfied'),'confirmed correction uses normalized prepayment prerequisite');
ok(status.includes('nextStatus === "issued" && (!prepaymentSatisfied || current.deposit_paid !== true)'),'issued correction requires deposit plus paid-or-waived prepayment');
ok(status.includes('currentStatus === "completed" && nextStatus === "issued"'),'completed to issued rollback remains supported');
ok(status.includes('patch.deposit_returned = false')&&status.includes('patch.return_payment_paid = false'),'completed rollback reopens settlement without erasing finance history');
ok(admin.includes("err.message==='issue_payment_required'?'Для статусу «Видана» потрібен отриманий залоговий платіж і або передоплата, або оформлене звільнення від передоплати.'"),'raw issue_payment_required is translated for manager');
ok(admin.includes("err.message==='prepayment_required'?'Для статусу «Підтверджена» потрібна передоплата або оформлене звільнення від передоплати.'"),'raw prepayment_required is translated for manager');
ok(spec.includes('STATUS-CORR-002')&&spec.includes('prepayment_waiver'),'System Spec records waiver-aware status correction');

console.log(`v4.3.36 status waiver correction: ${pass}/${pass} OK`);
