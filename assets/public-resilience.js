(()=>{
'use strict';
const ROOT_SCOPE=`${location.origin}/`;
async function retireLegacyRootWorker(){
  if(!('serviceWorker' in navigator))return;
  try{
    const registrations=await navigator.serviceWorker.getRegistrations();
    const roots=registrations.filter(reg=>reg.scope===ROOT_SCOPE);
    await Promise.all(roots.map(async reg=>{try{await reg.update()}catch{};try{await reg.unregister()}catch{}}));
  }catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',retireLegacyRootWorker,{once:true});
else retireLegacyRootWorker();
window.addEventListener('pageshow',retireLegacyRootWorker);
navigator.serviceWorker?.addEventListener?.('message',event=>{
  if(event.data?.type!=='VACLEANER_ROOT_SW_RETIRED')return;
  document.documentElement.dataset.legacySwRetired='1';
});
})();
