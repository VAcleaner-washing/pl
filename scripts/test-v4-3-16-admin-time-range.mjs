import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('admin/bronuvannia/index.html');
const js = read('assets/admin-v4316.js');
const sw = read('admin/sw.js');

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(/admin-v4316\.js\?v=\d+/.test(index), 'admin loads v4.3.16 time-range asset');
check(js.includes('const START_MINUTES = 7 * 60') && js.includes('const END_MINUTES = 21 * 60'), 'admin selectable range is 07:00–21:00');
check(js.includes('for (let total = START_MINUTES; total <= END_MINUTES; total += STEP_MINUTES)'), 'range remains inclusive with 30-minute step');
check(js.includes('admin-v4315-current-off-grid') && js.includes('Поточний час · ${time}'), 'legacy saved time outside current picker range remains representable');
check(!js.includes('for (let hour = 0; hour < 24'), 'all-day 00:00–23:30 grid is no longer generated');
check(/vacleaner-manager-\d+/.test(sw) && /admin-v4316\.js\?v=\d+/.test(sw), 'PWA cache includes v4.3.16 time-range asset');

const failed = checks.filter(([ok]) => !ok);
if (failed.length) process.exit(1);
console.log(`v4.3.16 admin time range: ${checks.length}/${checks.length} PASS`);
