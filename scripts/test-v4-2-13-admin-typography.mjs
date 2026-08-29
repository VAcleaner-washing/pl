import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const css=read('assets/admin-v250.css');
const pkg=JSON.parse(read('package.json'));
const rel=JSON.parse(read('release.json'));
let passed=0,failed=0;
function ok(name,cond){if(cond){passed++;console.log(`PASS: ${name}`)}else{failed++;console.error(`FAIL: ${name}`)}}
ok('release metadata is coherent',pkg.version===rel.version&&rel.version==='4.2.13'&&Number(rel.build)===4213);
ok('admin typography polish layer exists',css.includes('v4.2.13 — admin typography polish'));
ok('navigation uses lighter weight',css.includes('.nav button{font-weight:480}'));
ok('ordinary buttons are not bold',css.includes('button,.btn,.new-btn,.chip{font-weight:520}'));
ok('content strong text is restrained',css.includes('#view strong,#view b,')&&css.includes('.modal-card strong,.modal-card b{font-weight:580}'));
ok('finance row itself is regular weight',css.includes('.expense-row{font-weight:400}'));
ok('expense category is medium rather than heavy',css.includes('.expense-kind b{font-weight:580}'));
ok('expense amount has controlled emphasis',css.includes('.expense-row>strong{')&&css.includes('font-weight:620;'));
ok('expense amount cannot wrap currency to another line',css.includes('white-space:nowrap;')&&css.includes('word-break:keep-all;'));
ok('mobile expense amount preserves one-line money',css.includes('.expense-row>strong{white-space:nowrap;min-width:max-content}'));
console.log(JSON.stringify({passed,failed,status:failed?'failed':'passed'}));
if(failed)process.exit(1);
