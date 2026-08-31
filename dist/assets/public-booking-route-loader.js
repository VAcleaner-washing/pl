(()=>{
  'use strict';
  const current=document.currentScript?.src||'';
  const build=new URL(current||location.href,location.href).searchParams.get('v')||'4200';
  const ensureAsset=(kind,file)=>{
    if(kind==='css'){
      if(document.querySelector(`link[href*="${file}"]`))return;
      const link=document.createElement('link');link.rel='stylesheet';link.href=`/assets/${file}?v=${encodeURIComponent(build)}`;document.head.appendChild(link);return;
    }
    if(document.querySelector(`script[src*="${file}"]`))return;
    const script=document.createElement('script');script.src=`/assets/${file}?v=${encodeURIComponent(build)}`;script.defer=true;document.head.appendChild(script);
  };
  const load=()=>{
    if(!document.querySelector('.booking-form'))return;
    ensureAsset('css','booking-hardening-v4144.css');
    ensureAsset('js','booking-hardening-v4144.js');
    ensureAsset('css','booking-trust-v4145.css');
    ensureAsset('js','booking-trust-v4145.js');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
  new MutationObserver(()=>requestAnimationFrame(load)).observe(document.documentElement,{childList:true,subtree:true});
})();
