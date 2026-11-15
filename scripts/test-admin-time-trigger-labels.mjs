import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/admin-v4316.js','utf8');
const between=(start,end)=>{
  const from=source.indexOf(start),to=source.indexOf(end,from+start.length);
  assert(from>=0&&to>from,'Time-picker function boundaries must exist');
  return source.slice(from,to);
};
const code=`const TIME_RE=/^([01]\\d|2[0-3]):([0-5]\\d)$/;
${between('  function validTime(', '  function minutesOf(')}
${between('  function contextTitle(', '  function hideLegacyTimeUI(')}
${between('  function updateTrigger(', '  function makeOption(')}
globalThis.update=updateTrigger;`;
const scope={};vm.runInNewContext(code,scope);
let passed=0;
function sample(name,value,expectedName,update=scope.update){
  const attributes={},visible={textContent:''},input={name,value};
  const trigger={querySelector:()=>visible,setAttribute:(key,text)=>attributes[key]=text};
  update(input,trigger);
  assert.equal(attributes['aria-label'],expectedName);
  assert.equal(input.value,value,'Naming a proxy must not alter the saved/input time');
  passed++;
  return {input,trigger,attributes,visible};
}
sample('pickupTime','08:00','Час видачі, 08:00');
sample('returnTime','08:00','Час повернення, 08:00');
const changed=sample('pickupTime','08:00','Час видачі, 08:00');
changed.input.value='21:00';scope.update(changed.input,changed.trigger);
assert.equal(changed.attributes['aria-label'],'Час видачі, 21:00');
assert.equal(changed.visible.textContent,'21:00');passed++;
sample('returnTime','22:45','Час повернення, 22:45');
sample('pickupTime','','Час видачі, 08:00');
sample('returnTime','25:00','Час повернення, 08:00');
// Original control names were only visible values; this counterexample remains
// self-contained if old feature branches or git objects are later removed.
const originalBody=`  function updateTrigger(input, trigger) {
    const value = validTime(input.value) ? input.value : '08:00';
    const valueNode = trigger.querySelector('.admin-v4315-time-value');
    if (valueNode) valueNode.textContent = value;
  }

`;
const oldScope={};vm.runInNewContext(code.replace(between('  function updateTrigger(', '  function makeOption('),originalBody),oldScope);
assert.throws(()=>sample('pickupTime','08:00','Час видачі, 08:00',oldScope.update),assert.AssertionError);passed++;
console.log(`Contextual time trigger labels: ${passed}/${passed} PASS (original bare-value name rejected).`);
