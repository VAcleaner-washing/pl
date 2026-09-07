import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('admin/bronuvannia/index.html');
const js = read('assets/admin-v4314.js');
const css = read('assets/admin-v4314.css');
const sw = read('admin/sw.js');

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(/admin-v4314\.css\?v=\d+/.test(index) && /admin-v4314\.js\?v=\d+/.test(index), 'admin loads v4.3.14 time UX assets');
check(!index.includes('admin-v4313.css') && !index.includes('admin-v4313.js'), 'v4.3.13 in-form picker is no longer loaded');
check(js.includes('const STEP_MINUTES = 30') && js.includes('minute += STEP_MINUTES'), 'new choices remain 30-minute grid');
check(js.includes("input.type = 'hidden'") && js.includes('admin-v4314-native-time'), 'native iOS time wheel remains non-interactive');
check(js.includes('document.body.appendChild(overlay)') && js.includes('admin-v4314-time-sheet'), 'time choices live in a global sheet outside the booking form');
check(js.includes("active.input.dispatchEvent(new Event('change', {bubbles: true}))"), 'sheet selection preserves canonical business listeners');
check(css.includes('position:fixed') && css.includes('admin-v4314-time-overlay') && css.includes('grid-template-columns:repeat(3'), 'bottom sheet is fixed with three-column time grid');
check(css.includes('.admin-exact-time-picker .admin-time-tariff-hint') && css.includes('display:none!important'), 'verbose technical tariff hint is removed from visible form');
check(/vacleaner-manager-\d+/.test(sw) && /admin-v4314\.js\?v=\d+/.test(sw) && /admin-v4314\.css\?v=\d+/.test(sw), 'PWA cache includes v4.3.14 assets');

const failed = checks.filter(([ok]) => !ok);
if (failed.length) process.exit(1);
console.log(`v4.3.14 admin time bottom sheet: ${checks.length}/${checks.length} PASS`);
