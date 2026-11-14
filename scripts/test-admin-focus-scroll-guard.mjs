import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const option = name => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const runtimePath = option('--runtime') || 'assets/admin-v250.js';
const source = fs.readFileSync(runtimePath, 'utf8');
const start = source.indexOf('function keepFocusedControlVisible(');
const end = source.indexOf('function removePwaUpdatePrompt(', start);
assert(start >= 0 && end > start, 'Actual focus/viewport implementation is present');
const mark = source.match(/const markUserAction=event=>\{[^\n]+?\};/)?.[0];
assert(mark, 'Actual trusted interaction counter is present');
const results = [];
function harness() {
  const callbacks = [], handlers = new Map(), calls = [], properties = new Map();
  let viewportSyncs = 0;
  class Element {
    constructor(name, top = -200) {this.name = name; this.top = top;}
    matches(selector) {return selector.includes('input');}
    getBoundingClientRect() {return {top:this.top,bottom:this.top+50};}
    closest() {return null;}
    scrollIntoView(options) {calls.push({name:this.name,options}); this.top = 120;}
  }
  const phone = new Element('phone'), last = new Element('last');
  const document = {activeElement:phone,
    documentElement:{classList:{remove() {}},style:{removeProperty(name) {properties.delete(name);}}},
    addEventListener(type, callback) {handlers.set(type, callback);},
  };
  const window = {innerHeight:640,visualViewport:{height:640,offsetTop:0,addEventListener() {}},
    matchMedia:() => ({matches:true}),addEventListener() {}};
  const context = vm.createContext({window,document,HTMLElement:Element,
    setTimeout:(callback,delay) => {callbacks.push({callback,delay});return callbacks.length;},
    syncDisplayMode() {},syncPwaViewport() {viewportSyncs++;},
  });
  vm.runInContext('let userActionVersion=0,pwaKeyboardLatched=false;' + mark + '\n' +
    source.slice(start, end) + ';initPwaViewport();globalThis.mark=markUserAction;', context);
  return {phone,last,document,calls,context,
    focus(target = phone) {document.activeElement=target;handlers.get('focusin')({target});},
    action(trusted = true) {context.mark({isTrusted:trusted});},
    finish() {for (const row of callbacks.splice(0)) if (row.delay===90) row.callback();},
    syncs:() => viewportSyncs,
  };
}
function check(name, run) {
  try {run();results.push({name,passed:true});console.log('PASS:',name);}
  catch (error) {results.push({name,passed:false,error:error.message});console.error('FAIL:',name,error.message);}
}
check('unchanged focused control is made visible after keyboard layout', () => {
  const h=harness();h.focus();h.finish();
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,'phone');
  assert.equal(h.calls[0].options.block,'nearest');assert.equal(h.syncs(),2);
});
for (const intent of ['wheel','pointerdown','keydown']) {
  check(`a newer trusted ${intent} intent prevents stale focus scrolling`, () => {
    const h=harness();h.focus();h.action();h.finish();
    assert.equal(h.calls.length,0,'The old focus callback must not override a later user action');
    assert.equal(h.syncs(),2,'Keyboard viewport measurements still update');
  });
}
check('untrusted programmatic events do not cancel keyboard focus assistance', () => {
  const h=harness();h.focus();h.action(false);h.finish();assert.equal(h.calls.length,1);
});
check('a different focused control prevents the old control from moving scroll', () => {
  const h=harness();h.focus();h.document.activeElement=h.last;h.finish();assert.equal(h.calls.length,0);
});
check('a control already visible needs no redundant scrolling', () => {
  const h=harness();h.phone.top=150;h.focus();h.finish();assert.equal(h.calls.length,0);
});
const report={runtime:runtimePath,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
if (option('--output')) fs.writeFileSync(option('--output'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed}));
if (report.failed) process.exitCode=1;
