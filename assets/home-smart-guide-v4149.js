(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/')return;
  const current=document.currentScript;
  const build=(()=>{try{return new URL(current?.src||location.href,location.href).searchParams.get('v')||'4149'}catch{return'4149'}})();
  let loading=null;
  function loadQuiz(){
    if(window.__VAC_OPEN_SMART_GUIDE__)return Promise.resolve(window.__VAC_OPEN_SMART_GUIDE__);
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-vx-lazy-quiz],script[src*="/assets/public-quiz.js"]');
      const done=()=>{if(typeof window.__VAC_OPEN_SMART_GUIDE__==='function')resolve(window.__VAC_OPEN_SMART_GUIDE__);else reject(new Error('Smart Guide did not initialize'))};
      if(existing){existing.addEventListener('load',done,{once:true});setTimeout(done,0);return}
      const script=document.createElement('script');
      script.src=`/assets/public-quiz.js?v=${encodeURIComponent(build)}`;
      script.defer=true;script.dataset.vxLazyQuiz='1';script.addEventListener('load',done,{once:true});script.addEventListener('error',()=>reject(new Error('Smart Guide failed to load')),{once:true});
      document.head.appendChild(script);
    }).catch(error=>{loading=null;throw error});
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
  function inject(){
    const old=document.querySelector('[data-vq-guide]');if(old){bind(old.querySelector('.vq-guide__button'));return old}
    const target=document.querySelector('.v21-choose');if(!target)return null;
    const section=document.createElement('section');section.className='vq-guide';section.dataset.vqGuide='1';
    section.innerHTML='<div class="vq-guide__media"><img src="/assets/quiz-cleaning-guide-v4058.webp" alt="Домашнє прибирання з технікою VAcleaner" loading="lazy"><span>Підбір за 30 секунд</span></div><div class="vq-guide__copy"><p>VAcleaner · smart guide</p><h2>Не знаєте, що саме потрібно для прибирання?</h2><p>Відповідайте на кілька коротких запитань: що хочете почистити, які є плями чи запахи та з якого матеріалу поверхня. За відповідями ми підберемо техніку й лише ті засоби, які справді потрібні.</p><div class="vq-guide__chips"><span>Обираєте з готових варіантів</span><span>Отримуєте пояснення до кожного засобу</span><span>Зайву або небезпечну хімію не радимо</span></div><a href="/pidbir/" class="vq-guide__button">Підібрати рішення →</a><small>Зазвичай 3–4 короткі кроки · без реєстрації</small></div>';
    target.insertAdjacentElement('beforebegin',section);bind(section.querySelector('.vq-guide__button'));
    document.querySelectorAll('a[href="#choose"]').forEach(a=>{a.href='/pidbir/'});
    const note=document.querySelector('.v21-action-note');if(note)note.textContent='Не знаєте, що обрати? Пройдіть короткий підбір — сайт сам запропонує техніку й засоби під вашу задачу.';
    return section;
  }
  let repairTimer=0,observer=null;
  const boot=()=>inject();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('load',()=>{boot();setTimeout(()=>observer?.disconnect(),2600)},{once:true});
  const root=document.querySelector('.home-v21')||document.body;
  observer=new MutationObserver(()=>{if(document.querySelector('[data-vq-guide]'))return;clearTimeout(repairTimer);repairTimer=setTimeout(inject,50)});
  observer.observe(root,{childList:true,subtree:true});
})();
