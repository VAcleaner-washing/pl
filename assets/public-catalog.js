(()=>{
  'use strict';
  const CORE=window.VACLEANER_CORE;
  if(!CORE||!document.querySelector('.booking-products'))return;
  const API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-settings';
  const fmt=n=>new Intl.NumberFormat('uk-UA').format(Number(n||0));
  const PUBLIC_PRODUCT_LABELS={puzzi:'Kärcher Puzzi 8/1',puzzi_jimmy:'Глибоке очищення диванів і матраців',puzzi_abir:'Дивани + вікна',sc2:'Kärcher SC 2',abir:'Робот для вікон',combo:'Дивани + кухня та ванна',general:'Генеральне прибирання',ideal_windows:'Ідеальні вікна',elite:'HOME RESET'};

  const PUBLIC_EXTRA_PRESENTATION={
    odour_zero:{label:'Odour Zero · 250 мл',detail:'Для загальної нейтралізації запахів і одночасного очищення текстилю та твердих поверхонь.'},
    neutralix:{label:'Neutralix · 250 мл',detail:'Нейтралізує запахи сечі, тварин, тютюну та вогкості на текстилі, м’яких меблях, в авто й приміщенні'},
    spot_lifter:{label:'VA SPOT FIX · 50 мл',detail:'Універсальний плямовивідник для локальної обробки свіжих і змішаних забруднень. Жирні сліди · їжа · косметика · побутові плями.'},
    stain_exit:{label:'VA STAIN OX · 30 мл',detail:'Для стійких плям від напоїв і харчових продуктів. Кава · чай · червоне вино · соки · ягоди.'},
    shower_care:{label:'Shower Care · 250 мл',detail:'Мильний і вапняний наліт у душовій, ванній та на сантехніці.'},
    soft_degreaser:{label:'Soft Degreaser · 250 мл',detail:'Жирові забруднення на кухонних і твердих поверхнях.'},
    grill_force:{label:'Grill Force · 250 мл',detail:'Нагар і стійкий пригорілий жир у духовках, на грилях і решітках.'},
    scalex_pro:{label:'Scalex Pro · 250 мл',detail:'Водний камінь, іржа та стійкі мінеральні відкладення.'},
    eco_clean:{label:'Eco Clean · 250 мл',detail:'Щоденні забруднення на сталі, склі, пластику та кераміці.'},
    glass_perfect:{label:'Glass Perfect Care · 250 мл',detail:'Скло, дзеркала та глянцеві поверхні без розводів.'}
  };
  const PUBLIC_CODE_BY_LABEL={};
  Object.entries(PUBLIC_PRODUCT_LABELS).forEach(([code,label])=>PUBLIC_CODE_BY_LABEL[label]=code);
  Object.entries(CORE?.products||{}).forEach(([code,item])=>[item.label,item.shortLabel,...(item.aliases||[])].filter(Boolean).forEach(label=>PUBLIC_CODE_BY_LABEL[label]=code));
  let activeCatalog=CORE.catalog;
  function apply(catalog){
    activeCatalog=catalog||activeCatalog||CORE.catalog;
    catalog=activeCatalog;
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
    const extrasRoot=document.querySelector('.booking-extras');
    if(extrasRoot){
      const heading=extrasRoot.querySelector('h3');
      const intro=extrasRoot.querySelector(':scope > p');
      if(heading&&heading.textContent!=='Професійні засоби'){heading.textContent='Професійні засоби';changed+=1}
      if(intro&&intro.textContent!=='Підберіть під конкретне забруднення · засоби купуються окремо й залишаються у вас.'){intro.textContent='Підберіть під конкретне забруднення · засоби купуються окремо й залишаються у вас.';changed+=1}
    }
    document.querySelectorAll('.booking-extras label').forEach(label=>{
      const name=label.querySelector('b')?.textContent.trim();
      const code=CORE.extraAliases[name];
      const price=catalog.extras?.[code]?.price;
      const strong=label.querySelector('strong');
      const presentation=PUBLIC_EXTRA_PRESENTATION[code];
      const title=label.querySelector('b');
      const detail=label.querySelector('small');
      if(presentation){
        if(title&&title.textContent!==presentation.label){title.textContent=presentation.label;changed+=1}
        if(detail&&detail.textContent!==presentation.detail){detail.textContent=presentation.detail;changed+=1}
        label.classList.toggle('is-va-stain-care',code==='spot_lifter'||code==='stain_exit');
      }
      if(price==null||!strong)return;
      const text=`+${fmt(price)} грн`;
      if(strong.textContent!==text){strong.textContent=text;changed+=1}
    });
    return changed;
  }
  document.addEventListener('change',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.type!=='checkbox'||!input.closest('.booking-extras'))return;
    requestAnimationFrame(()=>apply(activeCatalog));
  });
  fetch(API,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    const catalog=data.catalog||CORE.catalog;
    apply(catalog);
    requestAnimationFrame(()=>apply(catalog));
    setTimeout(()=>apply(catalog),600);
  }).catch(()=>apply(CORE.catalog));
})();
