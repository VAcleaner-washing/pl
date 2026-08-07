import fs from 'node:fs';
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const errors=[];
for(const token of [
  '/* v3.0.16 — final desktop visual audit.',
  '.settings-grid,.settings-grid>*{min-width:0}',
  '@media (min-width:901px) and (max-width:1100px)',
  'grid-template-areas:"deposits" "slots" "notifications" "finance"',
  '.window-choice input{width:1px!important;height:1px!important',
  '.analytics-toolbar h2{font-size:24px',
]) if(!css.includes(token))errors.push(`missing final desktop visual rule: ${token}`);
if(!js.includes('<h2>Показники</h2><p>За вибраний період.'))errors.push('analytics still repeats the page title');
if(js.includes('<div class="analytics-toolbar"><div><h2>Аналітика</h2>'))errors.push('duplicate analytics heading returned');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Final desktop visual guard passed.');
