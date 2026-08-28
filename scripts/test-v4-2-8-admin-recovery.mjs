import fs from 'node:fs';
import assert from 'node:assert/strict';
const js=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const checks=[
  ["tracks confirmed data load", js.includes('dataLoaded:false') && js.includes('state.dataLoaded=true;state.lastSuccessfulLoadAt=Date.now();state.lastError=null')],
  ["error cannot turn into fake empty state", js.includes("if(state.lastError&&!state.dataLoaded){renderLoadError(state.lastError);return}")],
  ["live recovery starts before first network load", js.indexOf('shell();startLiveBookingSync();renderLoading();')>=0],
  ["failed first load is fully retried", js.includes("if(!state.dataLoaded){await loadGlobalSlots();await load();lastLiveBookingFingerprint=liveBookingFingerprint(state.bookings);renderAfterLiveSync();toast('Дані відновлено','success');return}")],
  ["live refresh preserves last good data on failure", js.includes('state.lastError=error;if(!state.dataLoaded)renderLoadError(error)')],
];
for(const [name,ok] of checks){assert.ok(ok,name);console.log('PASS',name)}
console.log(`Admin recovery ${checks.length}/${checks.length} PASS`);
