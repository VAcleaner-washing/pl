(()=>{
  'use strict';

  const path=location.pathname.replace(/\/+$/,'')||'/';
  const QUIZ_PROMO='PIDBIR5';
  const PRODUCT_INFO={
    puzzi:{label:'Kärcher Puzzi',price:700,desc:'Глибоке промивання диванів, крісел, матраців, килимів і текстилю.'},
    puzzi_jimmy:{label:'Puzzi + Jimmy',price:1050,desc:'Сухе очищення шерсті, волосся й пилу перед глибоким промиванням текстилю.'},
    puzzi_abir:{label:'Puzzi + робот ABIR',price:1500,desc:'Глибоке очищення текстилю та миття скла одним комплектом.'},
    sc2:{label:'Kärcher SC 2 Deluxe',price:500,desc:'Кухня, ванна, плитка, шви, стики та тверді поверхні.'},
    abir:{label:'Робот для вікон',price:800,desc:'Скло, дзеркала та гладкі поверхні без роботи на висоті.'},
    combo:{label:'Комбо · Puzzi + SC 2',price:1000,desc:'Текстиль + кухня або ванна одним готовим комплектом.'},
    general:{label:'Генеральне прибирання',price:1300,desc:'Puzzi + SC 2 + Jimmy для текстилю, твердих поверхонь і сухого етапу.'},
    ideal_windows:{label:'Ідеальні вікна',price:1200,desc:'SC 2 для рам, стиків і складних зон + робот для скла.'},
    elite:{label:'HOME RESET',price:2300,desc:'Повний комплект для текстилю, кухні, ванної, сухого очищення та вікон.'}
  };
  const EXTRA_INFO={
    neutralix:{label:'Neutralix · 250 мл',price:200},
    odour_zero:{label:'Odour Zero Spring · 250 мл',price:250},
    carp_deta:{label:'Carp-Deta · 30 мл',price:100},
    shower_care:{label:'Shower Care · 250 мл',price:250},
    scalex_pro:{label:'Scalex Pro · 250 мл',price:250},
    eco_clean:{label:'Eco Clean · 250 мл',price:250},
    soft_degreaser:{label:'Soft Degreaser · 250 мл',price:250},
    grill_force:{label:'Grill Force · 250 мл',price:250},
    glass_perfect:{label:'Glass Perfect Care · 250 мл',price:150},
    premium_nozzles:{label:'Насадки «Преміум» до SC 2',price:200}
  };
  const PRODUCT_TITLES={
    puzzi:['Kärcher Puzzi','Kärcher Puzzi 8/1'],
    puzzi_jimmy:['Puzzi + Jimmy'],
    puzzi_abir:['Puzzi + робот ABIR'],
    sc2:['Kärcher SC 2','Kärcher SC 2 Deluxe'],
    abir:['Робот для вікон','Робот ABIR'],
    combo:['Тариф «Комбо»','Комбо · Puzzi + SC 2'],
    general:['Генеральне','Генеральне прибирання'],
    ideal_windows:['Ідеальні вікна'],
    elite:['HOME RESET']
  };
  const EXTRA_TITLES={
    neutralix:['Neutralix · 250 мл','Neutralix · концентрат','Neutralix'],
    odour_zero:['Odour Zero'],
    carp_deta:['Плямовивідник Carp-Deta 30 мл','Carp-Deta 30 мл','Carp-Deta'],
    shower_care:['Shower Care'],
    scalex_pro:['Scalex Pro'],
    eco_clean:['Eco Clean'],
    soft_degreaser:['Soft Degreaser'],
    grill_force:['Grill Force'],
    glass_perfect:['Glass Perfect Care'],
    premium_nozzles:['Насадки «Преміум» до SC 2']
  };

  const blankState=()=>({
    zones:[],textileProblems:[],textileOdor:'',kitchenProblems:[],kitchenGrillSurface:'',kitchenScaleSurface:'',bathProblems:[],bathSurface:'',windowsMode:''
  });
  let state=blankState();
  let stepIndex=0;
  let modal=null;

  function fire(event,data={}){
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push({event,...data,page_path:location.pathname});
  }
  const selectedZones=()=>Array.isArray(state.zones)?state.zones:[];
  const hasTextile=()=>selectedZones().some(z=>['textile','mattress','carpet'].includes(z));
  const hasKitchen=()=>selectedZones().includes('kitchen');
  const hasBath=()=>selectedZones().includes('bathroom');
  const hasWindows=()=>selectedZones().includes('windows');

  function questions(){
    const list=[{
      id:'zones',title:'Що хочете почистити?',note:'Позначте одну або кілька зон — ми зберемо рішення під усе за один раз.',type:'multi',options:[
        ['textile','Диван / крісла','М’які меблі'],['mattress','Матрац','Місце для сну'],['carpet','Килим','Плями й запахи'],['kitchen','Кухня','Жир і нагар'],['bathroom','Ванна кімната','Наліт та сантехніка'],['windows','Вікна / дзеркала','Скло й рами']
      ]
    }];
    if(hasTextile())list.push({id:'textileProblems',title:'Що саме турбує в текстилі?',note:'Виберіть усе, що актуально — кожна відповідь впливає на засіб або техніку.',type:'multi',options:[
      ['refresh','Просто освіжити','Звичайний побутовий бруд'],['stain','Є видимі плями','Кава, чай, напої, жир, бруд та інші локальні плями'],['urine','Є запах сечі','Дитина або тварина'],['other_odor','Інший неприємний запах','Тютюн, затхлість, тварини, піт тощо'],['hair','Шерсть / волосся / крихти','Потрібен сухий етап перед миттям'],['heavy_dust','Багато пилу в тканині','Особливо актуально для матраців']
    ]});
    if(hasTextile()&&state.textileProblems.includes('other_odor'))list.push({id:'textileOdor',title:'Який запах у текстилі?',note:'Це допоможе відрізнити локальну проблему від запаху всього приміщення.',type:'single',options:[
      ['pet','Запах тварин',''],['musty','Затхлість / вогкість',''],['smoke','Тютюн / дим',''],['sweat','Піт',''],['food','Їжа / кухня',''],['unknown','Не можу визначити','']
    ]});
    if(hasKitchen())list.push({id:'kitchenProblems',title:'Що найбільше потрібно прибрати на кухні?',note:'Можна вибрати кілька типів забруднення.',type:'multi',options:[
      ['daily','Повсякденний бруд','Фасади, стільниця, легкі сліди'],['fresh_grease','Свіжий / регулярний жир','Без сильного нагару'],['carbon','Пригорілий жир / нагар','Духовка, гриль'],['light_scale','Легкий водний наліт','Мийка, змішувач, скло'],['heavy_scale_rust','Сильний наліт або іржа','Водний камінь, застарілі відкладення'],['odor','Запахи на кухні','Їжа, сміття, загальний запах'],['corners','Стики / важкодоступні місця','Потрібна точкова робота парою']
    ]});
    if(hasKitchen()&&state.kitchenProblems.includes('carbon'))list.push({id:'kitchenGrillSurface',title:'На якій поверхні нагар?',note:'Grill Force сильний лужний засіб — тут важливий матеріал.',type:'single',options:[
      ['safe','Сталь / емаль / звичайна духовка','Підходить для лугостійких поверхонь'],['sensitive','Алюміній / мідь / тефлон / фарбована чи лакована','Grill Force не рекомендуємо'],['unknown','Не знаю матеріал','Не будемо додавати агресивний засіб автоматично']
    ]});
    if(hasKitchen()&&state.kitchenProblems.some(x=>['light_scale','heavy_scale_rust'].includes(x)))list.push({id:'kitchenScaleSurface',title:'На якій поверхні водний наліт?',note:'Кислотні засоби не підходять для всіх матеріалів.',type:'single',options:[
      ['acid_safe','Скло / кераміка / хром / нержавійка',''],['aluminum','Алюміній',''],['stone','Мармур / травертин / натуральний камінь',''],['painted','Пофарбована поверхня',''],['unknown','Не знаю','']
    ]});
    if(hasBath())list.push({id:'bathProblems',title:'Що бачите у ванній?',note:'Оберіть фактичну проблему — так ми не порадимо зайву або надто агресивну хімію.',type:'multi',options:[
      ['daily','Звичайний бруд','Регулярне прибирання'],['light_scale','Мильний / вапняний наліт','Матовість, розводи на душовій'],['heavy_scale','Сильний водний камінь','Старий щільний наліт'],['rust','Іржа / жовті сліди','Складні відкладення'],['grout','Шви / кути / стики','Важкодоступні місця']
    ]});
    if(hasBath()&&state.bathProblems.some(x=>['light_scale','heavy_scale','rust'].includes(x)))list.push({id:'bathSurface',title:'Яка поверхня з нальотом?',note:'Це важливо для безпеки покриття.',type:'single',options:[
      ['acid_safe','Скло / кераміка / хром / нержавійка',''],['aluminum','Алюміній',''],['stone','Мармур / травертин / доломіт','Кислотні засоби не використовуємо'],['painted','Пофарбована поверхня',''],['unknown','Не знаю матеріал','Краще не ризикувати агресивною хімією']
    ]});
    if(hasWindows())list.push({id:'windowsMode',title:'Що саме з вікнами?',note:'Від цього залежить, чи достатньо робота, чи потрібна ще пара для рам і стиків.',type:'single',options:[
      ['glass','Тільки скло / дзеркала',''],['frames','Скло + рами',''],['full','Скло + рами + кути / стики','']
    ]});
    return list;
  }

  function valueFor(id){return state[id]}
  function canContinue(q){
    const value=valueFor(q.id);
    return q.type==='multi'?Array.isArray(value)&&value.length>0:Boolean(value);
  }
  function setAnswer(qId,value,type){
    if(type==='multi'){
      const arr=Array.isArray(state[qId])?[...state[qId]]:[];
      const i=arr.indexOf(value);if(i>=0)arr.splice(i,1);else arr.push(value);state[qId]=arr;
    }else state[qId]=value;
  }

  function extra(code,reason){return{code,...EXTRA_INFO[code],reason}}
  function result(){
    const zones=selectedZones(),text=hasTextile(),hard=hasKitchen()||hasBath(),windows=hasWindows();
    const needJimmy=state.textileProblems.some(x=>['hair','heavy_dust'].includes(x));
    let product='puzzi';
    const warnings=[];
    if(text&&hard&&windows)product='elite';
    else if(text&&hard)product=needJimmy?'general':'combo';
    else if(hard&&windows)product='ideal_windows';
    else if(text&&windows)product='puzzi_abir';
    else if(text)product=needJimmy?'puzzi_jimmy':'puzzi';
    else if(hard)product='sc2';
    else if(windows)product=state.windowsMode==='glass'?'abir':'ideal_windows';

    const extras=[];const add=(code,reason)=>{if(!extras.some(x=>x.code===code))extras.push(extra(code,reason));};
    if(state.textileProblems.includes('urine'))add('neutralix','Ви вказали запах сечі — Neutralix ставимо пріоритетно для нейтралізації причини запаху.');
    if(state.textileProblems.includes('other_odor'))add('neutralix','Ви вказали локальний запах у текстилі — Neutralix працює по тканині, меблях і м’яких поверхнях.');
    if(state.textileProblems.includes('stain')){add('carp_deta','Є видима пляма — Carp-Deta потрібен для локального опрацювання перед промиванням Puzzi.');warnings.push('Перед Carp-Deta перевірте стійкість барвника на невеликій непомітній ділянці.');}
    if(state.kitchenProblems.includes('odor'))add('odour_zero','Є загальний кухонний запах — Odour Zero нейтралізує запахи в приміщенні та на стійких поверхнях.');
    if(state.kitchenProblems.includes('daily'))add('eco_clean','Для регулярного кухонного бруду достатньо м’якого універсального Eco Clean.');
    if(state.kitchenProblems.includes('fresh_grease'))add('soft_degreaser','Для свіжого й регулярного жиру потрібен Soft Degreaser, без зайвої агресії.');
    if(state.kitchenProblems.includes('carbon')){
      if(state.kitchenGrillSurface==='safe')add('grill_force','Пригорілий жир і нагар на лугостійкій поверхні — задача Grill Force.');
      else warnings.push('Grill Force не додаємо автоматично: він не підходить для алюмінію, міді, тефлону та фарбованих/лакованих поверхонь. Якщо матеріал невідомий — спочатку уточніть його.');
    }
    if(state.kitchenProblems.includes('light_scale')){
      if(state.kitchenScaleSurface==='stone')warnings.push('На натуральному камені не використовуємо кислотні засоби. Для регулярного очищення підійде Eco Clean, але сильний мінеральний наліт краще погодити з менеджером.');
      else if(state.kitchenScaleSurface==='painted'||state.kitchenScaleSurface==='unknown')warnings.push('Засіб від нальоту не додаємо автоматично, доки не відомо, що поверхня стійка до нього.');
      else add('shower_care','Легкий водний/вапняний наліт — Shower Care працює м’якше й підходить також для алюмінію.');
    }
    if(state.kitchenProblems.includes('heavy_scale_rust')){
      if(state.kitchenScaleSurface==='acid_safe')add('scalex_pro','Сильний наліт або іржа на кислотостійкій поверхні — задача Scalex Pro.');
      else if(state.kitchenScaleSurface==='stone')warnings.push('Scalex Pro не можна на натуральний камінь. Для сильного нальоту тут потрібне окреме безпечне рішення.');
      else warnings.push('Scalex Pro не додаємо автоматично: сильний кислотний засіб потребує підтвердження матеріалу поверхні.');
    }
    if(state.kitchenProblems.includes('corners'))add('premium_nozzles','Стики та важкодоступні місця зручніше пройти точковими насадками до SC 2.');

    if(state.bathProblems.includes('daily'))add('eco_clean','Для регулярного прибирання без сильного нальоту достатньо Eco Clean.');
    if(state.bathProblems.includes('light_scale')){
      if(state.bathSurface==='stone')warnings.push('Shower Care і Scalex Pro не використовуємо на мармурі, травертині та доломіті. Для регулярного очищення можна Eco Clean.');
      else if(state.bathSurface==='painted'||state.bathSurface==='unknown')warnings.push('Не додаємо кислотний засіб від нальоту автоматично, поки не підтверджений матеріал поверхні.');
      else add('shower_care','Мильний і вапняний наліт у душовій — основна задача Shower Care.');
    }
    if(state.bathProblems.some(x=>['heavy_scale','rust'].includes(x))){
      if(state.bathSurface==='acid_safe')add('scalex_pro','Сильний водний камінь або іржа на кислотостійкій поверхні — Scalex Pro.');
      else if(state.bathSurface==='aluminum')warnings.push('Scalex Pro не використовуємо на алюмінії. Для легкого нальоту підійде Shower Care; сильний або іржу краще погодити окремо.');
      else if(state.bathSurface==='stone')warnings.push('Scalex Pro та Shower Care не використовуємо на натуральному камені. Для сильного нальоту потрібне окреме безпечне рішення.');
      else warnings.push('Сильний кислотний засіб від нальоту не додаємо автоматично без підтвердження матеріалу.');
    }
    if(state.bathProblems.includes('grout'))add('premium_nozzles','Для швів, кутів і стиків зручніше використовувати точкові насадки до SC 2.');
    if(windows)add('glass_perfect','Для скла й дзеркал — швидкий фініш без розводів та з ефектом антипилу.');

    if((state.bathSurface==='stone'||state.kitchenScaleSurface==='stone')&&!extras.some(x=>x.code==='eco_clean'))add('eco_clean','Натуральний камінь не дружить із кислотними засобами; Eco Clean підходить для регулярного догляду за каменем і мармуром.');

    return {product,productInfo:PRODUCT_INFO[product],extras,warnings,includesPuzzi:['puzzi','puzzi_jimmy','puzzi_abir','combo','general','elite'].includes(product)};
  }

  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function zoneIcon(value){
    const common='viewBox="0 0 32 32" aria-hidden="true" focusable="false"';
    const icons={
      textile:`<svg ${common}><path d="M6 15v-3.2A3.8 3.8 0 0 1 9.8 8h12.4a3.8 3.8 0 0 1 3.8 3.8V15"/><path d="M5 15h22a2 2 0 0 1 2 2v6H3v-6a2 2 0 0 1 2-2Z"/><path d="M7 23v3M25 23v3M9 15V11M23 15V11"/></svg>`,
      mattress:`<svg ${common}><path d="M5 13h22a2 2 0 0 1 2 2v8H3v-8a2 2 0 0 1 2-2Z"/><path d="M7 13V9.5A2.5 2.5 0 0 1 9.5 7h13A2.5 2.5 0 0 1 25 9.5V13M3 19h26M6 23v3M26 23v3"/></svg>`,
      carpet:`<svg ${common}><path d="M8 7h16l3 18H5L8 7Z"/><path d="m12 12 4-2 4 2-2 4 2 4-4 2-4-2 2-4-2-4ZM8 25l-1 3M24 25l1 3"/></svg>`,
      kitchen:`<svg ${common}><path d="M6 6h20v20H6zM6 13h20M16 13v13"/><circle cx="11" cy="9.5" r="1"/><circle cx="16" cy="9.5" r="1"/><circle cx="21" cy="9.5" r="1"/><path d="M9 18h4M19 18h4"/></svg>`,
      bathroom:`<svg ${common}><path d="M4 15h24v3a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7v-3Z"/><path d="M8 15V9a4 4 0 0 1 8 0v1M8 25l-1 3M24 25l1 3"/><path d="M14 10h4"/></svg>`,
      windows:`<svg ${common}><path d="M6 4h20v24H6zM16 4v24M6 16h20"/><path d="m20 20 2 2 4-5"/></svg>`
    };
    return icons[value]||'';
  }

  function render(){
    if(!modal)return;
    const qs=questions();
    const isResult=stepIndex>=qs.length;
    const body=modal.querySelector('.vq-dialog__body');
    const progress=modal.querySelector('.vq-progress__bar');
    const meta=modal.querySelector('.vq-progress__meta');
    const back=modal.querySelector('.vq-back');
    const next=modal.querySelector('.vq-next');
    if(isResult){
      const r=result();
      progress.style.width='100%';meta.textContent='Ваше рішення';back.hidden=false;next.hidden=true;
      body.innerHTML=`<div class="vq-result"><p class="vq-eyebrow">Персональний підбір VAcleaner</p><h2>Ваше рішення готове.</h2><article class="vq-result__product"><span>Техніка</span><h3>${escapeHtml(r.productInfo.label)}</h3><p>${escapeHtml(r.productInfo.desc)}</p><strong>від ${new Intl.NumberFormat('uk-UA').format(r.productInfo.price)} грн / доба</strong>${r.includesPuzzi?'<small>Для Puzzi базові 8 порцій миючої хімії вже видаються в комплекті.</small>':''}</article>${r.extras.length?`<div class="vq-result__extras"><h3>Під ваші задачі рекомендуємо</h3>${r.extras.map(x=>`<article><div><strong>${escapeHtml(x.label)}</strong><p>${escapeHtml(x.reason)}</p></div><b>+${new Intl.NumberFormat('uk-UA').format(x.price)} грн</b></article>`).join('')}</div>`:'<div class="vq-result__clean"><strong>Додаткова хімія не обов’язкова</strong><span>За вашими відповідями базового рішення достатньо.</span></div>'}${r.warnings.length?`<div class="vq-result__warnings"><strong>Важливо для поверхні</strong>${r.warnings.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}</div>`:''}<div class="vq-result__bonus"><span>Бонус за підбір</span><strong>−5% на оренду</strong><p>Застосуємо автоматично при бронюванні. Якщо у вас уже є більша знижка лояльності — система залишить вигіднішу.</p></div><div class="vq-result__actions"><a class="vq-book" href="${bookingUrl(r)}">Забронювати зі знижкою →</a><a class="vq-manager" href="https://www.instagram.com/vacleaner_washing.pl/" target="_blank" rel="noreferrer">Запитати менеджера →</a><button type="button" class="vq-restart">Пройти заново</button></div></div>`;
      body.querySelector('.vq-book')?.addEventListener('click',()=>fire('cleaning_quiz_booking_click',{quiz_product:r.product,quiz_extras:r.extras.map(x=>x.code).join(','),promo_code:QUIZ_PROMO}));
      body.querySelector('.vq-restart')?.addEventListener('click',()=>{state=blankState();stepIndex=0;render()});
      fireOnceCompleted(r);
      return;
    }
    const q=qs[stepIndex];
    const current=valueFor(q.id);
    progress.style.width=`${Math.max(8,Math.round((stepIndex/qs.length)*100))}%`;
    meta.textContent=`Крок ${stepIndex+1} з ${qs.length}`;
    back.hidden=stepIndex===0;
    next.hidden=q.type==='single';
    next.disabled=!canContinue(q);
    body.innerHTML=`<div class="vq-question vq-question--${escapeHtml(q.id)}"><div class="vq-question__main"><p class="vq-eyebrow">Підбір рішення · ~30 секунд</p><h2>${escapeHtml(q.title)}</h2><p class="vq-question__note">${escapeHtml(q.note)}</p><div class="vq-options ${q.type==='multi'?'is-multi':''}">${q.options.map(([value,label,desc])=>{const active=q.type==='multi'?(Array.isArray(current)&&current.includes(value)):current===value;const icon=q.id==='zones'?zoneIcon(value):'';return `<button type="button" class="vq-option ${icon?'has-icon ':''}${active?'is-selected':''}" data-value="${escapeHtml(value)}" aria-pressed="${active?'true':'false'}">${icon?`<span class="vq-option__icon">${icon}</span>`:''}<span class="vq-option__copy"><strong>${escapeHtml(label)}</strong>${desc?`<small>${escapeHtml(desc)}</small>`:''}</span><span class="vq-option__check" aria-hidden="true">${q.type==='multi'?(active?'✓':''):'→'}</span></button>`}).join('')}</div>${q.type==='multi'?'<p class="vq-multi-hint">Можна вибрати кілька варіантів.</p>':''}</div>${q.id==='zones'?'<aside class="vq-zones-media"><img src="/assets/quiz-cleaning-guide.webp" alt="Чистий інтер’єр і техніка VAcleaner"><span>Професійна чистота у вас вдома</span></aside>':''}</div>`;
    body.querySelectorAll('.vq-option').forEach(button=>button.addEventListener('click',()=>{
      setAnswer(q.id,button.dataset.value,q.type);
      if(q.type==='single'){setTimeout(()=>{stepIndex+=1;render()},80)}else render();
    }));
  }
  let completedKey='';
  function fireOnceCompleted(r){const key=[r.product,...r.extras.map(x=>x.code)].join('|');if(completedKey===key)return;completedKey=key;fire('cleaning_quiz_completed',{quiz_product:r.product,quiz_extras:r.extras.map(x=>x.code).join(',')});}
  function bookingUrl(r){
    const p=new URLSearchParams();p.set('from','quiz');p.set('product',r.product);p.set('promo',QUIZ_PROMO);if(r.extras.length)p.set('extras',r.extras.map(x=>x.code).join(','));
    return `/bronuvannia?${p.toString()}`;
  }
  function openQuiz(){
    if(!modal){
      modal=document.createElement('div');modal.className='vq-layer';modal.innerHTML=`<section class="vq-dialog" role="dialog" aria-modal="true" aria-labelledby="vq-title"><header class="vq-dialog__header"><button type="button" class="vq-back" aria-label="Назад">‹</button><div class="vq-progress"><span class="vq-progress__meta">Крок 1</span><div><i class="vq-progress__bar"></i></div></div><button type="button" class="vq-close" aria-label="Закрити">×</button></header><div class="vq-dialog__body" id="vq-title"></div><div class="vq-dialog__footer"><button type="button" class="vq-next">Далі →</button></div></section>`;document.body.appendChild(modal);
      modal.addEventListener('click',e=>{if(e.target===modal)closeQuiz()});
      modal.querySelector('.vq-close').addEventListener('click',closeQuiz);
      modal.querySelector('.vq-back').addEventListener('click',()=>{if(stepIndex>0){stepIndex-=1;render()}});
      modal.querySelector('.vq-next').addEventListener('click',()=>{const q=questions()[stepIndex];if(q&&canContinue(q)){stepIndex+=1;render()}});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))closeQuiz()});
    }
    state=blankState();stepIndex=0;completedKey='';modal.classList.add('is-open');document.documentElement.classList.add('vq-lock');render();fire('cleaning_quiz_started');
    setTimeout(()=>modal.querySelector('.vq-close')?.focus(),30);
  }
  function closeQuiz(){if(!modal)return;if(path==='/pidbir'){location.href='/';return;}modal.classList.remove('is-open');document.documentElement.classList.remove('vq-lock');}

  function injectTeaser(){
    if(path!=='/'||document.querySelector('[data-vq-guide]'))return;
    const target=document.querySelector('.v21-choose');if(!target)return;
    const section=document.createElement('section');section.className='vq-guide';section.dataset.vqGuide='1';section.innerHTML=`<div class="vq-guide__media"><img src="/assets/quiz-cleaning-guide.webp" alt="Домашнє прибирання з технікою VAcleaner" loading="lazy"><span>Підбір за 30 секунд</span></div><div class="vq-guide__copy"><p>VAcleaner · smart guide</p><h2>Не знаєте, що саме потрібно для прибирання?</h2><p>Опишіть задачу простими словами. Ми підберемо техніку, конкретні засоби й відсіємо хімію, яка не підходить вашій поверхні.</p><div class="vq-guide__chips"><span>Плями → Carp-Deta</span><span>Запах сечі → Neutralix</span><span>Наліт → правильний засіб за матеріалом</span></div><button type="button" class="vq-guide__button">Підібрати рішення →</button><small>Зазвичай 3–4 короткі кроки · без реєстрації</small></div>`;
    target.insertAdjacentElement('beforebegin',section);
    section.querySelector('.vq-guide__button').addEventListener('click',openQuiz);
    document.querySelectorAll('a[href="#choose"]').forEach(a=>{a.href='/pidbir/'});
    const note=document.querySelector('.v21-action-note');if(note)note.textContent='Не знаєте, що обрати? Пройдіть короткий підбір — сайт сам запропонує техніку й засоби під вашу задачу.';
  }

  function injectSolutionsEntry(){
    if(path!=='/rishennia')return;
    const strip=document.querySelector('.choice-strip');if(!strip)return;
    const p=strip.querySelector('p');const h=strip.querySelector('h2');const a=strip.querySelector('a');
    if(p)p.textContent='Не впевнені, що саме підійде?';
    if(h)h.textContent='Позначте, що хочете почистити — підберемо техніку й засоби приблизно за 30 секунд.';
    if(a){a.href='/pidbir/';a.textContent='Підібрати рішення';}
  }

  function injectBookingEscape(){
    if(path!=='/bronuvannia'||document.querySelector('[data-vq-booking-help]'))return;
    const heading=document.querySelector('.booking-step .booking-step-heading');if(!heading)return;
    const box=document.createElement('div');box.className='vq-booking-help';box.dataset.vqBookingHelp='1';
    box.innerHTML='<span>Не знаєте, що обрати?</span><a href="/pidbir/">Підібрати рішення за 30 секунд →</a>';
    heading.insertAdjacentElement('afterend',box);
  }

  let standaloneOpened=false;
  function openStandalone(){
    if(path!=='/pidbir'||standaloneOpened)return;
    standaloneOpened=true;
    document.documentElement.classList.add('vq-standalone-page');
    openQuiz();
    // Only hide the fallback page after the interactive quiz is mounted.
    // If JS is delayed or fails, /pidbir/ remains a usable page instead of a blank screen.
    document.documentElement.classList.add('vq-ready');
  }

  function setControlledInput(input,value){
    if(!input)return false;
    const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
    descriptor?.set?.call(input,value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function applyPromoPreset(code){
    if(!code)return false;
    const input=document.querySelector('.booking-promo-field input');
    if(!input)return false;
    if(String(input.value||'').toUpperCase()!==code)setControlledInput(input,code);
    return true;
  }

  function applyBookingPreset(){
    if(path!=='/bronuvannia')return;
    const params=new URLSearchParams(location.search);if(params.get('from')!=='quiz')return;
    const product=params.get('product')||'';const extras=(params.get('extras')||'').split(',').filter(Boolean);const promo=(params.get('promo')||'').toUpperCase()===QUIZ_PROMO?QUIZ_PROMO:'';
    let attempts=0;
    const run=()=>{
      attempts+=1;
      const productButtons=[...document.querySelectorAll('.booking-products button')];
      const titles=PRODUCT_TITLES[product]||[];
      const productButton=productButtons.find(b=>titles.includes(b.querySelector('strong')?.textContent.trim()));
      if(productButton&&productButton.getAttribute('aria-pressed')!=='true'&&!productButton.classList.contains('is-selected'))productButton.click();
      setTimeout(()=>{
        extras.forEach(code=>{
          const names=EXTRA_TITLES[code]||[];
          const label=[...document.querySelectorAll('.booking-extras label')].find(l=>names.includes(l.querySelector('b')?.textContent.trim()));
          const input=label?.querySelector('input[type="checkbox"]');if(input&&!input.checked)input.click();
        });
        applyPromoPreset(promo);
        const banner=ensurePresetBanner(product,extras,promo);
        if(banner)banner.scrollIntoView({block:'nearest'});
      },180);
      if((!productButton||extras.some(code=>!findExtra(code))||(promo&&!document.querySelector('.booking-promo-field input')))&&attempts<10)setTimeout(run,300);
    };
    setTimeout(run,180);
  }
  function findExtra(code){const names=EXTRA_TITLES[code]||[];return [...document.querySelectorAll('.booking-extras label')].find(l=>names.includes(l.querySelector('b')?.textContent.trim()))}
  function ensurePresetBanner(product,extras,promo){
    const form=document.querySelector('.booking-form');if(!form)return null;
    let banner=form.querySelector('.vq-preset-banner');if(!banner){banner=document.createElement('div');banner.className='vq-preset-banner';const products=form.querySelector('#booking-products');products?.insertAdjacentElement('beforebegin',banner)}
    const p=PRODUCT_INFO[product];if(!p)return banner;
    const extraNames=extras.map(x=>EXTRA_INFO[x]?.label).filter(Boolean);
    banner.innerHTML=`<span>Підібрано у Smart Guide</span><strong>${escapeHtml(p.label)}</strong><small>${extraNames.length?'Додатково: '+escapeHtml(extraNames.join(' · ')):'Без обов’язкових додаткових засобів'}</small>${promo===QUIZ_PROMO?'<em>Бонус за підбір · −5% на оренду · застосовується автоматично</em>':''}`;
    return banner;
  }

  function bootPublicQuiz(){
    injectTeaser();
    injectSolutionsEntry();
    injectBookingEscape();
    applyBookingPreset();
    openStandalone();
  }

  // Next/static hydration may reconcile the home tree after DOMContentLoaded and
  // remove nodes injected too early. Re-run idempotently after hydration/load
  // and keep a lightweight observer on the home tree so the guide always stays visible.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootPublicQuiz,{once:true});
  else bootPublicQuiz();
  window.addEventListener('load',bootPublicQuiz,{once:true});
  [80,280,900,1800].forEach(ms=>setTimeout(bootPublicQuiz,ms));
  if(path==='/'){
    const root=document.querySelector('.home-v21')||document.body;
    let repairTimer=0;
    const observer=new MutationObserver(()=>{
      if(document.querySelector('[data-vq-guide]'))return;
      clearTimeout(repairTimer);
      repairTimer=setTimeout(injectTeaser,40);
    });
    observer.observe(root,{childList:true,subtree:true});
  }
})();
