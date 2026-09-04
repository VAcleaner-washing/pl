import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const html = read('admin/bronuvannia/index.html');
const css = read('assets/admin-v438.css');
const js = read('assets/admin-v438.js');
const admin = read('assets/admin-v250.js');
const spec = read('docs/VAcleaner-SYSTEM-SPEC.md');
let pass = 0;
const check = (ok, label) => {
  if (!ok) throw new Error(`FAIL: ${label}`);
  pass += 1;
  console.log(`PASS: ${label}`);
};

check(html.includes('/assets/admin-v438.css?') && html.includes('/assets/admin-v438.js?'), 'admin loads v4.3.8 SMS hardening assets');
check(html.indexOf('admin-v438.css') > html.indexOf('admin-v437.css') && html.indexOf('admin-v438.js') > html.indexOf('admin-v437.js'), 'v4.3.8 overrides load after prior approved layers');
check(css.includes('.modal-card:has(.sms-campaign-modal)') && css.includes('height:100dvh!important') && css.includes('min-height:100dvh!important'), 'mobile SMS modal explicitly occupies the full dynamic viewport');
check(css.includes('.sms-campaign-modal.history-mode #smsHistory') && css.includes('flex:1 1 auto!important') && css.includes('max-height:none!important') && css.includes('overflow-y:auto!important'), 'journal list reclaims footer space and remains scrollable');
check(js.includes('VACLEANER_SMS_TRANSPORT_TEXT') && js.includes('1F000') && js.includes('1FAFF'), 'SMS transport layer removes supplementary pictographs before send');
check(js.includes("field.id!=='smsMessage'") && js.includes("dispatchEvent(new Event('input'"), 'transport normalization is scoped to SMS composer and refreshes preview/counters');
check(admin.includes('давно не освіжали дім? 😊'), 'legacy RETURN template still exposes the provider-broken emoji for runtime normalization coverage');
check(spec.includes('# 66. Change record — v4.3.8 SMS JOURNAL + TRANSPORT HARDENING'), 'System Spec records v4.3.8 SMS hardening');

console.log(`v4.3.8 SMS hardening static QA passed: ${pass}`);
