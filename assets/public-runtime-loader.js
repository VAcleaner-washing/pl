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
  const load=(src,key)=>{
    if(document.querySelector(`script[data-vx-module="${key}"]`))return;
    const script=document.createElement('script');
    script.src=`${src}?v=${encodeURIComponent(build)}`;
    script.defer=true;script.dataset.vxModule=key;document.head.appendChild(script);
  };
  load('/assets/public-experience-runtime.js','experience-runtime');
  if(document.querySelector('.booking-form'))load('/assets/public-booking-route-loader.js','booking-route');
})();
