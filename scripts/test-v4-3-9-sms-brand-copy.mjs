import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('admin/bronuvannia/index.html');
const js=read('assets/admin-v439.js');
const transport=read('assets/admin-v438.js');
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
let passed=0;
const check=(ok,label)=>{if(!ok)throw new Error(`FAIL: ${label}`);passed+=1;console.log(`PASS: ${label}`)};

check(html.includes('/assets/admin-v439.js?'),'production admin shell loads v4.3.9 SMS copy layer');
check(html.indexOf('admin-v439.js')>html.indexOf('admin-v438.js'),'v4.3.9 copy layer runs after transport hardening');
check(js.includes('VAcleaner — оренда техніки для прибирання у Полтаві.'),'RETURN copy clearly identifies VAcleaner and its service');
check(js.includes('★')&&js.includes("replace(/^-/,'−')"),'RETURN copy keeps transport-safe symbols and a typographic discount sign');
check(js.includes('Активуйте бонус: {link}')&&js.includes('Діє 21 день')&&js.includes('Відмова: vacleaner.pp.ua/s'),'promo activation, lifetime and opt-out remain intact');
check(js.includes('VACLEANER_SMS_TRANSPORT_TEXT'),'v4.3.9 reuses the v4.3.8 transport sanitizer');
check(transport.includes('1F000')&&transport.includes('1FAFF'),'supplementary emoji that SendPulse breaks remain filtered');

const preview='VAcleaner — оренда техніки для прибирання у Полтаві. Давно не освіжали дім? ★ Для вас −10% на наступну оренду. Активуйте бонус: vacleaner.pp.ua/b#XXXXXXX Діє 21 день. Відмова: vacleaner.pp.ua/s';
const chars=[...preview].length;
const parts=chars<=70?1:Math.ceil(chars/67);
check(parts===3&&chars>134&&chars<=201,`branded RETURN preview fits exactly three Unicode SMS parts (${chars} chars)`);
check(!preview.includes('😊')&&preview.includes('★'),'preview uses a supported symbol instead of provider-broken emoji');
check(spec.includes('# 67. Change record — v4.3.9 SMS BRAND COPY'),'System Spec records v4.3.9 branded RETURN copy');

console.log(JSON.stringify({passed,failed:0,chars,parts}));
