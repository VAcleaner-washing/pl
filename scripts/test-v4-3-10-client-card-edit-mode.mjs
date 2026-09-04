import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../admin/bronuvannia/index.html');
const nativeCss=read('../assets/admin-v430.css');
const fixCss=read('../assets/admin-v4310.css');
const runtime=read('../assets/admin-v250.js');
const spec=read('../docs/VAcleaner-SYSTEM-SPEC.md');

assert.ok(nativeCss.includes('html.native-test .fields{display:grid!important'), 'fixture must retain the broad Native fields rule that caused the regression');
assert.ok(html.includes('/assets/admin-v4310.css?'), 'production admin must load v4.3.10 client-card fix');
assert.ok(html.indexOf('/assets/admin-v4310.css?') > html.indexOf('/assets/admin-v430.css?'), 'v4.3.10 fix must load after the Native layer');
assert.match(fixCss,/client-contact-edit-fields\[hidden\]\s*\{\s*display:none!important;/, 'hidden edit fields must defeat the broad Native .fields override');
assert.match(fixCss,/client-contact-section-v245\.is-editing \.client-contact-read\s*\{\s*display:none!important;/, 'read summary must disappear during editing');
assert.match(fixCss,/client-contact-section-v245\.is-editing \.client-contact-edit-fields\s*\{[\s\S]*display:grid!important;/, 'edit fields must appear only in edit mode');
assert.ok(runtime.includes("fields.hidden=!editing"), 'canonical edit toggle must remain the owner of disclosure state');
assert.ok(runtime.includes("e.currentTarget.textContent=editing?'Готово':'Редагувати'"), 'edit toggle copy must remain explicit');
assert.ok(spec.includes('v4.3.10 CLIENT CARD EDIT DISCLOSURE'), 'System Spec must record the client-card regression repair');

console.log('v4.3.10 client-card edit disclosure: PASS');
