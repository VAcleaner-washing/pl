import fs from 'node:fs';
const css=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const glass=fs.readFileSync(new URL('../assets/admin-glass-test.css',import.meta.url),'utf8');
const tail=css.slice(css.lastIndexOf('v4.2.32 — FULL ADMIN TYPOGRAPHY AUDIT'));
const must=[
  ['default strong/b is 560','.app :is(strong,b),.modal-card :is(strong,b),#layer :is(strong,b){font-weight:560}'],
  ['status is 500','.badge,.status,.hero-status,.schedule-badge'],
  ['field labels are 500','.field span,.field>span,.group-label'],
  ['secondary buttons are 500','button,.btn,.new-btn,.chip,.nav button,.mobile-nav button{font-weight:500}'],
  ['primary buttons are 560','.btn.primary,.btn.green,.new-btn{font-weight:560}'],
  ['booking settlement label is 460','.booking-finance em>span{font-weight:460}'],
  ['booking settlement amount is 590','.booking-finance em>strong{font-weight:590}'],
  ['deposit label is 460','.booking-deposit-state>span,.booking-deposit-state>small{font-weight:460}'],
  ['deposit amount is 590','.booking-deposit-state>strong{font-weight:590}'],
  ['client tier is explicit','.client-tier-level'],
  ['client field label is explicit','.client-contact-section .field>span'],
];
let pass=0;
for(const [name,needle] of must){if(!tail.includes(needle))throw new Error(`Missing typography contract: ${name}`);pass++;}
for(const bad of ['font-weight:750','font-weight:800','font-weight:850','font-weight:900']){
  if(tail.includes(bad))throw new Error(`v4.2.32 final typography override reintroduced ${bad}`);
  pass++;
}
if(!js.includes('class="client-tier-meta"')||!js.includes('class="client-tier-level'))throw new Error('Client loyalty meta is still one undifferentiated line');pass++;
if(!js.includes('<em class="${settlement.className}"><span>${h(settlement.shortLabel||settlement.label)}</span><strong>${h(settlement.amountLabel)}</strong></em>'))throw new Error('Settlement pill does not separate label and amount');pass++;
if(!js.includes('<span>Залоговий платіж</span><strong>${money(f.securityDeposit)}</strong><small>· ${depositState}</small>'))throw new Error('Deposit pill does not separate label/value/state');pass++;

const glassTail=glass.slice(glass.lastIndexOf('v4.2.32 — final glass-layer typography alignment'));
const glassMust=[
  ['glass client actions are 500','html.glass-test .glass-client-actions a,\nhtml.glass-test .glass-client-actions button{font-weight:500}'],
  ['glass client contact is 500','html.glass-test .client-contact-action,'],
  ['glass client contact meta is 480','html.glass-test .client-contact-action small{font-weight:480}'],
  ['glass day labels are 500','html.glass-test .day-labels{font-weight:500}'],
  ['glass time active is 560','html.glass-test .booking-form .time-chip.active{font-weight:560}'],
  ['glass settings actions are 560','html.glass-test .settings-actions .btn{font-weight:560}'],
  ['glass vehicle identity is 580','html.glass-test .delivery-car-identity b{font-weight:580}'],
  ['glass vehicle metric is 600','html.glass-test .delivery-car-metric strong{font-weight:600}'],
];
for(const [name,needle] of glassMust){if(!glassTail.includes(needle))throw new Error(`Missing glass typography contract: ${name}`);pass++;}
for(const bad of ['font-weight:650','font-weight:660','font-weight:700','font-weight:750','font-weight:800','font-weight:850','font-weight:900']){
  if(glassTail.includes(bad))throw new Error(`v4.2.32 glass final override reintroduced ${bad}`);
  pass++;
}
console.log(`v4.2.32 admin typography contract: ${pass}/${pass} PASS`);
