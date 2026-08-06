(()=>{
  'use strict';
  const CORE=window.VACLEANER_CORE;
  if(!CORE||!document.querySelector('.booking-products'))return;
  const API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-settings';
  const fmt=n=>new Intl.NumberFormat('uk-UA').format(Number(n||0));
  function apply(catalog){
    let changed=0;
    document.querySelectorAll('.booking-products button').forEach(btn=>{
      const title=btn.querySelector('strong')?.textContent.trim();
      const code=CORE.productAliases[title];
      const product=catalog.products?.[code];
      if(!product)return;
      const small=btn.querySelector('small');
      if(!small)return;
      const text=`Будні · ${fmt(product.weekday)} грн  |  1 вихідний · ${fmt(product.weekend)} грн${product.saturdaySunday?`  |  Сб + Нд · ${fmt(product.saturdaySunday)} грн`:''}`;
      if(small.textContent!==text){small.textContent=text;changed+=1}
    });
    document.querySelectorAll('.booking-extras label').forEach(label=>{
      const name=label.querySelector('b')?.textContent.trim();
      const code=CORE.extraAliases[name];
      const price=catalog.extras?.[code]?.price;
      const strong=label.querySelector('strong');
      if(price==null||!strong)return;
      const text=`+${fmt(price)} грн`;
      if(strong.textContent!==text){strong.textContent=text;changed+=1}
    });
    return changed;
  }
  fetch(API,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    const catalog=data.catalog||CORE.catalog;
    apply(catalog);
    requestAnimationFrame(()=>apply(catalog));
    setTimeout(()=>apply(catalog),600);
  }).catch(()=>apply(CORE.catalog));
})();
