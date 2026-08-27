(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/')return;
  const current=document.currentScript;
  const build=(()=>{try{return new URL(current?.src||location.href,location.href).searchParams.get('v')||'4149'}catch{return'4149'}})();
  let loading=null;
  function loadAsset(src,key,test){return new Promise((resolve,reject)=>{if(test())return resolve();const existing=document.querySelector(`script[data-vx-lazy-${key}],script[src*="${src}"]`);const done=()=>test()?resolve():reject(new Error(`${key} did not initialize`));if(existing){existing.addEventListener('load',done,{once:true});setTimeout(done,0);return}const script=document.createElement('script');script.src=`${src}?v=${encodeURIComponent(build)}`;script.defer=true;script.dataset[`vxLazy${key[0].toUpperCase()+key.slice(1)}`]='1';script.addEventListener('load',done,{once:true});script.addEventListener('error',()=>reject(new Error(`${key} failed to load`)),{once:true});document.head.appendChild(script)})}
  function loadQuiz(){
    if(window.__VAC_OPEN_SMART_GUIDE__)return Promise.resolve(window.__VAC_OPEN_SMART_GUIDE__);
    if(loading)return loading;
    loading=loadAsset('/assets/vacleaner-core.js','core',()=>Boolean(window.VACLEANER_CORE?.catalog)).then(()=>new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-vx-lazy-quiz],script[src*="/assets/public-quiz.js"]');
      const done=()=>{if(typeof window.__VAC_OPEN_SMART_GUIDE__==='function')resolve(window.__VAC_OPEN_SMART_GUIDE__);else reject(new Error('Smart Guide did not initialize'))};
      if(existing){existing.addEventListener('load',done,{once:true});setTimeout(done,0);return}
      const script=document.createElement('script');
      script.src=`/assets/public-quiz.js?v=${encodeURIComponent(build)}`;
      script.defer=true;script.dataset.vxLazyQuiz='1';script.addEventListener('load',done,{once:true});script.addEventListener('error',()=>reject(new Error('Smart Guide failed to load')),{once:true});
      document.head.appendChild(script);
    })).catch(error=>{loading=null;throw error});
    return loading;
  }
  function bind(link){
    if(!link||link.dataset.vxLazyQuizBound)return;
    link.dataset.vxLazyQuizBound='1';
    link.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();link.setAttribute('aria-busy','true');
      loadQuiz().then(open=>open()).catch(()=>{location.href='/pidbir/'}).finally(()=>link.removeAttribute('aria-busy'));
    });
  }
  function enhance(){
    const primary=document.querySelector('a.v21-secondary[href="/pidbir/"]')||document.querySelector('a[href="/pidbir/"]');
    bind(primary);
    document.querySelectorAll('a[href="#choose"]').forEach(a=>{a.href='/pidbir/'});
    const note=document.querySelector('.v21-action-note');if(note)note.textContent='Не знаєте, що обрати? Пройдіть короткий підбір — сайт сам запропонує техніку й засоби під вашу задачу.';
    return primary;
  }
  let repairTimer=0,observer=null;
  const boot=()=>enhance();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('load',()=>{boot();setTimeout(()=>observer?.disconnect(),2600)},{once:true});
  const root=document.querySelector('.home-v21')||document.body;
  observer=new MutationObserver(()=>{if(document.querySelector('a.v21-secondary[data-vx-lazy-quiz-bound="1"]'))return;clearTimeout(repairTimer);repairTimer=setTimeout(enhance,50)});
  observer.observe(root,{childList:true,subtree:true});
})();
