import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('admin/bronuvannia/index.html');
const js = read('assets/admin-v4313.js');
const css = read('assets/admin-v4313.css');
const sw = read('admin/sw.js');

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(
  index.includes('/assets/admin-v4313.css?v=4313') && index.includes('/assets/admin-v4313.js?v=4313'),
  'admin loads v4.3.13 time UX assets'
);
check(
  js.includes('const STEP_MINUTES = 30') && js.includes('minute += STEP_MINUTES'),
  'custom admin picker uses a 30-minute step'
);
check(
  js.includes("input.type = 'hidden'") && js.includes("input.classList.add('admin-v4313-native-time')"),
  'native iOS time wheel is removed from the interactive control'
);
check(
  js.includes("input.dispatchEvent(new Event('change', {bubbles: true}))"),
  'custom selection still notifies existing booking business logic'
);
check(
  css.includes('.admin-v4313-time-trigger') && css.includes('.admin-v4313-time-grid') && css.includes('@media(max-width:520px)'),
  'custom picker has dedicated mobile touch geometry'
);
check(
  sw.includes("const CACHE='vacleaner-manager-4313'") && sw.includes('/assets/admin-v4313.js?v=4313') && sw.includes('/assets/admin-v4313.css?v=4313'),
  'installed PWA precaches v4.3.13 time UX assets'
);

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error(` - ${label}`);
  process.exit(1);
}
console.log(`v4.3.13 admin time UX: ${checks.length}/${checks.length} PASS`);
