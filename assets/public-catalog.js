(()=>{
  'use strict';
  const CORE=window.VACLEANER_CORE;
  if(!CORE||!document.querySelector('.booking-products'))return;
  const API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-settings';
  const fmt=n=>new Intl.NumberFormat('uk-UA').format(Number(n||0));
  const PUBLIC_PRODUCT_LABELS={puzzi:'Kärcher Puzzi 8/1',puzzi_jimmy:'Глибоке очищення диванів і матраців',puzzi_abir:'Дивани + вікна',sc2:'Kärcher SC 2',abir:'Робот для вікон',combo:'Дивани + кухня та ванна',general:'Генеральне прибирання',ideal_windows:'Ідеальні вікна',elite:'HOME RESET'};
  const PUBLIC_CODE_BY_LABEL={};
  Object.entries(PUBLIC_PRODUCT_LABELS).forEach(([code,label])=>PUBLIC_CODE_BY_LABEL[label]=code);
  Object.entries(CORE?.products||{}).forEach(([code,item])=>[item.label,item.shortLabel,...(item.aliases||[])].filter(Boolean).forEach(label=>PUBLIC_CODE_BY_LABEL[label]=code));
  function apply(catalog){
    let changed=0;
    document.querySelectorAll('.booking-products button').forEach(btn=>{
      const title=btn.querySelector('strong')?.textContent.trim();
      const code=PUBLIC_CODE_BY_LABEL[title]||CORE.productAliases[title];
      const product=catalog.products?.[code];
      if(!product)return;
      const strong=btn.querySelector('strong');
      const publicLabel=PUBLIC_PRODUCT_LABELS[code]||product.shortLabel||product.label;
      if(strong&&publicLabel&&strong.textContent!==publicLabel){strong.textContent=publicLabel;changed+=1}
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
