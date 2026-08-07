import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const important=css=>(css.match(/!important/g)||[]).length;
const adminCss=read('../assets/admin-v250.css');
const adminCount=important(adminCss);
assert.ok(adminCount<=5,`admin CSS specificity budget exceeded: ${adminCount} !important declarations (max 5)`);
assert.equal((adminCss.match(/@media \(max-width:900px\)\{/g)||[]).length,1,'mobile shell must remain one primary <=900px contract');
assert.ok(adminCss.includes('.hidden{display: none !important;}'),'the only expected admin utility override is .hidden');

// Existing public-site debt is frozen so future UI repairs cannot silently add more cascade overrides.
const authoredBudgets=[
  ['../assets/public-experience.css',71],
  ['../assets/public-fixes.css',16],
  ['../assets/mobile-home-fix.css',4],
];
for(const [path,budget] of authoredBudgets){const n=important(read(path));assert.ok(n<=budget,`${path} specificity budget exceeded: ${n} !important declarations (max ${budget})`)}
console.log(`CSS architecture passed: admin ${adminCount} !important declaration(s), authored public override budgets frozen.`);
