import fs from 'node:fs';

// v4.3.16 narrows only the selectable clock range. The v4.3.15 compact
// bottom-sheet surface remains the active UX contract, now driven by v4316 JS.
const read = path => fs.readFileSync(path, 'utf8');
const index = read('admin/bronuvannia/index.html');
const js = read('assets/admin-v4316.js');
const css = read('assets/admin-v4315.css');
const sw = read('admin/sw.js');

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(/admin-v4315\.css\?v=\d+/.test(index) && /admin-v4316\.js\?v=\d+/.test(index), 'admin preserves v4.3.15 compact CSS with current v4.3.16 time controller');
check(!index.includes('admin-v4314.css') && !index.includes('admin-v4314.js') && !index.includes('admin-v4315.js'), 'superseded time controllers are not loaded');
check(js.includes('const STEP_MINUTES = 30') && js.includes('total += STEP_MINUTES'), 'admin time choices remain on 30-minute grid');
check(js.includes("input.type = 'hidden'") && js.includes('admin-v4315-native-time'), 'native iOS time wheel remains non-interactive');
check(js.includes("'Час повернення'") && js.includes("'Час видачі'") && !js.includes('Крок 30 хв'), 'sheet header is compact and context-only');
check(js.includes('function centerSelected()') && js.includes('scroll.scrollTop = Math.max(0, target)'), 'selected time is explicitly centered inside sheet scroller');
check(js.includes("active.input.dispatchEvent(new Event('change', {bubbles: true}))"), 'time selection preserves canonical booking listeners');
check(css.includes('height:min(54dvh,500px)') && css.includes('grid-template-rows:auto minmax(0,1fr)'), 'sheet is capped near half-screen with fixed header and scroll body');
check(css.includes('.admin-v4315-time-scroll') && css.includes('overflow-y:auto') && css.includes('grid-template-columns:repeat(3'), 'only time body scrolls and mobile grid stays three columns');
check(/vacleaner-manager-\d+/.test(sw) && /admin-v4316\.js\?v=\d+/.test(sw) && /admin-v4315\.css\?v=\d+/.test(sw), 'PWA cache preserves compact sheet CSS with current v4.3.16 controller');

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error(` - ${label}`);
  process.exit(1);
}
console.log(`v4.3.15 compact admin time sheet preserved under v4.3.16: ${checks.length}/${checks.length} PASS`);
