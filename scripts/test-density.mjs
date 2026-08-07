import fs from 'node:fs';
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const errors=[];
for(const token of [
  '/* v3.0.15 — desktop density pass.',
  ':root{--sidebar:236px;--topbar:80px}',
  '.modal-form>header h2{font-size:28px',
  '.premium-control select,.premium-control input{height:46px;font-size:15px}',
  '.btn{min-height:44px',
  '.new-btn{min-height:44px',
  '.top-logout{width:44px;height:44px',
  '.issue-quick button{min-height:44px',
  '.issue-form>footer .btn{min-height:44px',
  '.pwa-update-prompt button{min-height:44px',
  '.modal-card:has(.issue-form){width:min(1040px',
  '.modal-card:has(.finance-form){height:min(700px',
]) if(!css.includes(token))errors.push(`missing desktop density rule: ${token}`);
const density=css.slice(css.lastIndexOf('/* v3.0.15 — desktop density pass.'));
if(/@media\s*\(max-width\s*:\s*900px\)/.test(density))errors.push('desktop density block must not redefine mobile breakpoints');
if(!density.startsWith('/* v3.0.15')||!density.includes('@media (min-width:901px)'))errors.push('desktop density rules are not isolated to desktop');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Desktop density guard passed.');
