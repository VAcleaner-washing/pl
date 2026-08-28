(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/bronuvannia')return;
  const QUIZ_PROMO='PIDBIR5';
  const EXTRA_LABELS={
    neutralix:'Neutralix',odour_zero:'Odour Zero',spot_lifter:'VA SPOT FIX',stain_exit:'VA STAIN OX',
    shower_care:'Shower Care',scalex_pro:'Scalex Pro',eco_clean:'Eco Clean',soft_degreaser:'Soft Degreaser',
    grill_force:'Grill Force',glass_perfect:'Glass Perfect Care',premium_nozzles:'Насадки «Преміум»'
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  function setControlled(input,value){
    if(!input)return false;const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');descriptor?.set?.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }
  function removeLegacyHelp(){document.querySelectorAll('[data-vq-booking-help]').forEach(node=>node.remove())}
  function decorateExtras(){
    const root=document.querySelector('.booking-extras');if(!root)return;
    const heading=root.querySelector('h3'),intro=root.querySelector(':scope > p');if(heading)heading.textContent='Професійні засоби';if(intro)intro.textContent='Підберіть під конкретне забруднення · засоби купуються окремо й залишаються у вас.';root.querySelector('.vq-extra-choice')?.remove();
  }
  function findExtra(code){
    const needle=EXTRA_LABELS[code];if(!needle)return null;
    return [...document.querySelectorAll('.booking-extras label')].find(label=>(label.querySelector('b')?.textContent||'').includes(needle))||null;
  }
  function ensureBanner(product,extras,promo,source){
    const form=document.querySelector('.booking-form');if(!form)return null;
    let banner=form.querySelector('.vq-preset-banner');if(!banner){banner=document.createElement('div');banner.className='vq-preset-banner';form.querySelector('#booking-products')?.insertAdjacentElement('beforebegin',banner)}
    const productButton=document.querySelector(`.booking-products button[data-product-code="${CSS.escape(product)}"]`);if(!productButton)return banner;
    const productName=(productButton.querySelector('strong')?.textContent||product).trim();
    const extraNames=extras.map(code=>(findExtra(code)?.querySelector('b')?.textContent||EXTRA_LABELS[code]||'').trim()).filter(Boolean);
    banner.innerHTML=`<span>${source==='quiz'?'Підібрано у Smart Guide':'Додано із картки засобу'}</span><strong>${esc(productName)}</strong><small>${extraNames.length?'Додатково: '+esc(extraNames.join(' · ')):'Без обов’язкових додаткових засобів'}</small>${promo===QUIZ_PROMO?'<em>Бонус за підбір · −5% на оренду · застосовується автоматично</em>':''}`;
    return banner;
  }
  function applyPreset(){
    const params=new URLSearchParams(location.search),source=params.get('from')||'';if(!['quiz','extras'].includes(source))return true;
    const product=params.get('product')||'',extras=(params.get('extras')||'').split(',').filter(Boolean),promo=(params.get('promo')||'').toUpperCase()===QUIZ_PROMO?QUIZ_PROMO:'';
    const productButton=document.querySelector(`.booking-products button[data-product-code="${CSS.escape(product)}"]`);
    if(!productButton)return false;
    if(productButton.getAttribute('aria-pressed')!=='true'&&!productButton.classList.contains('is-selected'))productButton.click();
    for(const code of extras){const input=findExtra(code)?.querySelector('input[type="checkbox"]');if(!input)return false;if(!input.checked)input.click()}
    const promoInput=document.querySelector('.booking-promo-field input');if(promo){if(!promoInput)return false;if(String(promoInput.value||'').toUpperCase()!==promo)setControlled(promoInput,promo)}
    const banner=ensureBanner(product,extras,promo,source);banner?.scrollIntoView({block:'nearest'});return true;
  }
  let attempts=0,timer=0;
  function boot(){removeLegacyHelp();decorateExtras();if(applyPreset()||attempts>=10)return;attempts+=1;clearTimeout(timer);timer=setTimeout(boot,240)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('load',boot,{once:true});
})();
