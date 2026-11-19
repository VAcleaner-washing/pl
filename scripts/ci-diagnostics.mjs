import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const suites = JSON.parse(fs.readFileSync(path.join(root, 'config/qa-suites.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');

const normalize = command => String(command).replace(/\s+/g, ' ').trim();
const groups = ['static', 'browser'];
const rows = groups.flatMap(group => (suites[group] || []).map((name, index) => ({
  group, index: index + 1, name, command: normalize(pkg.scripts[name] || ''),
  owner: name.replace(/^test:/, '').split('-')[0] || 'unassigned'
})));
const missing = rows.filter(row => !row.command);
const byCommand = new Map();
for (const row of rows) {
  if (!row.command) continue;
  const entries = byCommand.get(row.command) || [];
  entries.push({group: row.group, name: row.name});
  byCommand.set(row.command, entries);
}
const identicalCommands = [...byCommand.entries()]
  .filter(([, entries]) => entries.length > 1)
  .map(([command, entries]) => ({command, entries}));
const standaloneBrowserSmoke = /npm run test:auth-recovery-browser/.test(workflow);
const canonicalBrowserIncludesSmoke = (suites.browser || []).includes('test:auth-recovery-browser');
const report = {
  generatedAt: new Date().toISOString(),
  source: 'repository configuration; no tests executed',
  counts: Object.fromEntries(groups.map(group => [group, rows.filter(row => row.group === group).length])),
  missingScripts: missing.map(({group, name}) => ({group, name})),
  identicalCommands,
  potentialDuplicateRuns: [{
    name: 'test:auth-recovery-browser',
    standaloneWorkflowStep: standaloneBrowserSmoke,
    canonicalBrowserSuite: canonicalBrowserIncludesSmoke,
    note: 'Inspect test setup and arguments before changing CI; this is not proof of equivalent coverage.'
  }],
  ownership: Object.fromEntries([...new Set(rows.map(row => row.owner))].sort().map(owner =>
    [owner, rows.filter(row => row.owner === owner).map(({group, name}) => ({group, name}))])),
  suites: rows
};
const output = process.argv.includes('--json') ? JSON.stringify(report, null, 2) :
  [
    'VAcleaner CI diagnostic inventory (read-only)',
    ...groups.map(group => `${group}: ${report.counts[group]} suites`),
    `Missing package scripts: ${missing.length}`,
    `Identical suite commands: ${identicalCommands.length} groups`,
    `Session recovery appears in standalone workflow: ${standaloneBrowserSmoke}`,
    `Session recovery appears in canonical browser: ${canonicalBrowserIncludesSmoke}`,
    'Run with --json for complete ownership and duplication evidence.'
  ].join('\n');
process.stdout.write(output + '\n');
if (missing.length) process.exitCode = 1;
