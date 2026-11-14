import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Execute the shipped settings functions against replaceable DOM nodes. This
// checks retained listeners and actual cue/tab behavior without starting a browser.
const arg = name => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const runtimePath = arg('--runtime') || 'assets/admin-v250.js';
const runtime = fs.readFileSync(runtimePath, 'utf8');
const start = runtime.indexOf('function syncSettingsRailCue(') >= 0
  ? runtime.indexOf('function syncSettingsRailCue(') : runtime.indexOf('function bindSettingsTabs(');
const end = runtime.indexOf('function renderSettings(', start);
assert(start >= 0 && end > start, 'settings implementation exists');
const listeners = new Map(), frames = [], saved = new Map(), results = [], nodes = [];
let current, mobile = false;
const tabs = ['rental', 'delivery', 'equipment', 'notifications', 'system'];
function node(dataset = {}) {
  const classes = new Set(), attributes = new Map(), events = new Map();
  const result = {dataset, hidden:false, scrollWidth:600, clientWidth:300, scrollLeft:0, writes:0, scrolled:0,
    classList: {toggle(name, enabled) {result.writes++; if (enabled) classes.add(name); else classes.delete(name);},
      contains:name => classes.has(name)},
    setAttribute:(name, value) => attributes.set(name, value),
    getAttribute:name => attributes.get(name),
    scrollIntoView() {result.scrolled++;},
    addEventListener(type, callback) {if (!events.has(type)) events.set(type, new Set()); events.get(type).add(callback);},
    dispatch(type) {for (const callback of events.get(type) || []) callback();},
  };
  return result;
}
function replaceDOM() {
  current = {rail:node(), tabs:tabs.map(key => node({settingsTab:key})),
    panels:tabs.map(key => node({settingsPanel:key})), main:{scrollTop:150}};
  nodes.push(current);
  return current;
}
const context = vm.createContext({
  $: selector => selector === '.settings-tabs' ? current?.rail : selector === '.main' ? current?.main : null,
  $$: selector => selector === '[data-settings-tab]' ? current?.tabs || [] : current?.panels || [],
  SETTINGS_TABS:tabs, SETTINGS_TAB_KEY:'settings-tab', currentSettingsTab:() => saved.get('settings-tab') || 'rental',
  localStorage:{setItem:(key, value) => saved.set(key, value)},
  requestAnimationFrame:callback => frames.push(callback),
  window:{matchMedia:() => ({matches:mobile}), addEventListener(type, callback) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(callback);
  }},
});
vm.runInContext(runtime.slice(start, end) + ';globalThis.rebind=bindSettingsTabs;', context);
const flush = () => {while (frames.length) frames.shift()();};
const resize = () => {for (const callback of listeners.get('resize') || []) callback();};
function check(name, run) {
  try {run(); results.push({name, passed:true}); console.log('PASS:', name);}
  catch (error) {results.push({name, passed:false, error:error.message}); console.error('FAIL:', name, error.message);}
}
for (let i=0; i<20; i++) {replaceDOM(); context.rebind(); flush();}
check('20 settings renders keep exactly one global resize listener', () => assert.equal(listeners.get('resize')?.size, 1));
for (const row of nodes) row.rail.writes=0;
resize();
check('resize only updates the current settings rail once', () => {
  assert.equal(current.rail.writes, 2);
  assert.equal(nodes.slice(0, -1).reduce((sum, row) => sum + row.rail.writes, 0), 0);
});
check('left edge shows only the remaining-right cue', () => {
  assert.equal(current.rail.classList.contains('has-more-left'), false);
  assert.equal(current.rail.classList.contains('has-more-right'), true);
});
current.rail.scrollLeft=150; current.rail.dispatch('scroll');
check('middle scroll shows both overflow cues', () => {
  assert.equal(current.rail.classList.contains('has-more-left'), true);
  assert.equal(current.rail.classList.contains('has-more-right'), true);
});
current.rail.scrollLeft=300; resize();
check('right edge hides the right cue and keeps the left cue', () => {
  assert.equal(current.rail.classList.contains('has-more-left'), true);
  assert.equal(current.rail.classList.contains('has-more-right'), false);
});
current.rail.scrollLeft=0; current.rail.clientWidth=600; resize();
check('fully visible tabs have no overflow cue', () => {
  assert.equal(current.rail.classList.contains('has-more-left'), false);
  assert.equal(current.rail.classList.contains('has-more-right'), false);
});
current=null;
check('resize outside settings touches no detached node', () => {
  const before=nodes.reduce((sum,row) => sum+row.rail.writes,0); resize();
  assert.equal(nodes.reduce((sum,row) => sum+row.rail.writes,0),before);
});
replaceDOM(); mobile=true; context.rebind(); flush();
current.tabs[1].onclick(); flush();
check('tab switching keeps storage, selected semantics, panel visibility and mobile reveal', () => {
  assert.equal(saved.get('settings-tab'),'delivery');
  for (let i=0; i<tabs.length; i++) {
    assert.equal(current.tabs[i].getAttribute('aria-selected'), String(i===1));
    assert.equal(current.panels[i].hidden, i!==1);
  }
  assert.equal(current.main.scrollTop,0);
  assert.equal(current.tabs[1].scrolled,1);
});
replaceDOM(); context.rebind(); flush();
check('the next settings render restores the saved tab without another global listener', () => {
  assert.equal(current.tabs[1].getAttribute('aria-selected'),'true');
  assert.equal(current.panels[1].hidden,false);
  assert.equal(listeners.get('resize')?.size,1);
});
saved.set('settings-tab','obsolete'); replaceDOM(); context.rebind(); flush();
check('an obsolete saved tab falls back to rental', () => {
  assert.equal(saved.get('settings-tab'),'rental');
  assert.equal(current.tabs[0].getAttribute('aria-selected'),'true');
});
const report={runtime:runtimePath, renderedSettings:nodes.length, globalResizeListeners:listeners.get('resize')?.size || 0,
  passed:results.filter(row=>row.passed).length, failed:results.filter(row=>!row.passed).length, results};
if (arg('--output')) {const out=path.resolve(arg('--output')); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,failed:report.failed,globalResizeListeners:report.globalResizeListeners}));
if (report.failed) process.exitCode=1;
