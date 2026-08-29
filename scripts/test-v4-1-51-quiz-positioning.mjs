import fs from 'node:fs';
const read=file=>fs.readFileSync(file,'utf8');
const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const hardening=read('assets/booking-hardening-v4144.js');
const css=read('assets/booking-hardening-v4144.css');
const entry=read('assets/booking-entry-v4149.js');
const fullQuiz=read('assets/public-quiz.js');
const workflow=read('.github/workflows/pages.yml');
const qaRunner=read('scripts/qa-full.mjs');
let passed=0;
const ok=(name,condition)=>{if(!condition){console.error(`FAIL ${name}`);process.exitCode=1}else{passed++;console.log(`OK   ${name}`)}};

ok('release keeps v4.1.51 positioning',pkg.version===release.version&&Number(release.build)>=4151);
ok('booking frames the first action as a task choice',hardening.includes('<small>Оберіть задачу</small>')&&hardening.includes('<h3>Що плануєте почистити?</h3>'));
ok('task choice promises filtering instead of personalized selection',hardening.includes('Один клік — покажемо відповідну техніку та комплекти.'));
ok('quiz has a separate precision promise',hardening.includes('Не впевнені, який комплект потрібен?')&&hardening.includes('Врахуємо тип забруднення, плями, запах і кількість зон.')&&hardening.includes('Пройти точний підбір за 30 секунд →'));
ok('old competing mini-quiz language is gone',!hardening.includes('Швидший вибір')&&!hardening.includes('Що саме хочете прибрати?')&&!hardening.includes('Не впевнені? Підбір за 30 секунд'));
ok('duplicate banner is removed instead of injected',entry.includes('function removeLegacyHelp')&&!entry.includes('function injectHelp')&&!entry.includes("box.className='vq-booking-help'"));
ok('full quiz runtime also removes a cached legacy banner',fullQuiz.includes('function removeBookingEscape')&&!fullQuiz.includes('function injectBookingEscape'));
ok('booking step intro hides while task choice is visible',hardening.includes('if(stepHeading)stepHeading.hidden=true')&&hardening.includes('if(stepHeading)stepHeading.hidden=false'));
ok('quiz distinction has a responsive visual separator',css.includes('.vx-smart-entry__guide{display:flex')&&css.includes('border-top:1px solid')&&css.includes('.vx-smart-entry__guide>a'));
ok('CI runs quiz positioning regression',(workflow.includes('test:v4.1.51-quiz-positioning')||qaRunner.includes('test:v4.1.51-quiz-positioning')));

if(process.exitCode)process.exit(process.exitCode);
console.log(`v4.1.51 quiz positioning: ${passed}/${passed} OK`);
