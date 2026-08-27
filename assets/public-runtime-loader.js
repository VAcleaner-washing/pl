(()=>{
  'use strict';
  const current=document.currentScript?.src||'';
  const build=new URL(current||location.href,location.href).searchParams.get('v')||'4200';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const needsRuntime=Boolean(
    document.querySelector('.booking-form,.v21-package-grid,.package-page-grid,.faq-list.faq-list-large,.terms-grid,.process-page,.puzzi-term-grid') ||
    path==='/dostavka'
  );
  if(!needsRuntime)return;
  const load=(src,key,ready)=>new Promise((resolve,reject)=>{
    if(ready?.())return resolve();
    const existing=document.querySelector(`script[data-vx-module=\"${key}\"],script[src^=\"${src}\"]`);
    if(existing){
      if(ready?.())return resolve();
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=`${src}?v=${encodeURIComponent(build)}`;
    script.async=false;script.dataset.vxModule=key;
    script.addEventListener('load',resolve,{once:true});
    script.addEventListener('error',reject,{once:true});
    document.head.appendChild(script);
  });
  load('/assets/vacleaner-core.js','core',()=>Boolean(window.VACLEANER_CORE?.catalog))
    .then(()=>load('/assets/public-experience-runtime.js','experience-runtime'))
    .then(()=>{if(document.querySelector('.booking-form'))return load('/assets/public-booking-route-loader.js','booking-route')})
    .catch(error=>console.error('VAcleaner public runtime failed to load',error));
})();
