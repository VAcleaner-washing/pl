import fs from 'node:fs';
const file = process.argv[2] || 'qa-release-summary.json';
if (!fs.existsSync(file)) {
  console.error('QA timing report missing: ' + file);
  process.exit(2);
}
let report;
try { report = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch { console.error('Invalid QA timing JSON: ' + file); process.exit(2); }
if (!Array.isArray(report.results) || report.results.some(r => typeof r.name !== 'string' || !Number.isFinite(r.durationMs) || r.durationMs < 0)) {
  console.error('Invalid QA timing result schema'); process.exit(2);
}
const rows = [...report.results].sort((a, b) => b.durationMs - a.durationMs);
const total = rows.reduce((sum, r) => sum + r.durationMs, 0);
const top = rows.slice(0, 10).map(r => ({suite:r.name,seconds:Math.round(r.durationMs / 1000),status:r.status}));
const output = {mode:report.mode,executed:rows.length,totalSeconds:Math.round(total / 1000),blockedBy:report.blockedBy || null,slowest:top, note:'Measured executed suites only; excludes runner provisioning and other workflow jobs.'};
if (process.argv.includes('--json')) console.log(JSON.stringify(output, null, 2));
else {
  console.log('VAcleaner QA timing baseline: ' + output.mode + ' / ' + output.executed + ' executed suites / ' + output.totalSeconds + ' s');
  for (const r of top) console.log(r.seconds + ' s  ' + r.status + '  ' + r.suite);
  if (output.blockedBy) console.log('Stopped by: ' + output.blockedBy);
}
