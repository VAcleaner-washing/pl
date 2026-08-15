
(()=>{
'use strict';
const path=location.pathname.replace(/\/+$/,'')||'/';
const ARROW='<svg aria-hidden="true" class="icon-arrow" focusable="false" viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"></path></svg>';
function patchFooter(){
 document.querySelectorAll('footer').forEach(footer=>{if(footer.classList.contains('v4-footer')||footer.closest('.vq-dialog'))return;footer.className='v4-footer';footer.innerHTML='<div class="footer-main v4-footer-grid"><div class="v4-footer-brand"><a class="brand footer-brand" href="/"><span class="brand-mark">VA</span><span class="brand-copy"><strong>CLEANER</strong><small>POLTAVA</small></span></a><p>Сервіс самостійного глибокого прибирання в Полтаві.</p></div><div><strong>Підібрати</strong><a href="/pidbir/">Підбір за 30 сек</a><a href="/rishennia/">Що почистити</a><a href="/komplekty/">Комплекти</a><a href="/bronuvannia/">Бронювання</a></div><div><strong>Довіра</strong><a href="/yak-tse-pratsiuie/">Як це працює</a><a href="/vidhuky/">Відгуки</a><a href="/pro-nas/">Про VAcleaner</a><a href="/blog/">Поради</a></div><div><strong>Сервіс</strong><a href="/dostavka/">Доставка й оплата</a><a href="/faq/">FAQ</a><a href="/umovy/">Умови оренди</a><a href="/kontakty/">Контакти</a><a href="/polityka-konfidenciynosti/">Конфіденційність</a></div><div class="v4-footer-ecosystem"><strong>VA ecosystem</strong><a href="https://vahome.com.ua/" rel="noreferrer" target="_blank">VA HOME</a><small>Простір чистий — тепер атмосфера.</small></div></div><div class="footer-bottom"><span>© 2026 VAcleaner</span><span>Полтава · +38 (095) 391 95 69</span></div>';});
}
function mobileMenu(){if(document.getElementById('_R_'))return;document.querySelectorAll('.menu-button').forEach(btn=>{if(btn.dataset.v4Bound)return;btn.dataset.v4Bound='1';btn.addEventListener('click',()=>{const menu=document.querySelector('.mobile-menu');const open=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!open));menu?.classList.toggle('is-open',!open);document.body.classList.toggle('menu-open',!open)})});document.querySelectorAll('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('.menu-button')?.setAttribute('aria-expanded','false');document.querySelector('.mobile-menu')?.classList.remove('is-open');document.body.classList.remove('menu-open')}));}
function reviewsProof(){if(path!=='/vidhuky'||document.querySelector('.v4-review-proof'))return;const hero=document.querySelector('.inner-hero');if(!hero)return;const box=document.createElement('section');box.className='v4-review-proof';box.innerHTML='<div><span class="v4-review-proof__mark" aria-hidden="true">✓</span><div><strong>Підтверджена оренда</strong><p>Позначка означає: відгук пов’язаний із фактичним бронюванням VAcleaner.</p><small>Ім’я публікуємо лише з дозволу клієнта.</small></div></div>';hero.insertAdjacentElement('afterend',box);}

function pickerBridgeMarkup(title,copy,label='Підібрати за 30 сек',tone='dark'){
 return `<div class="v4-picker-bridge v4-picker-bridge--${tone}"><div><strong>${title}</strong><span>${copy}</span></div><a href="/pidbir/">${label} ${ARROW}</a></div>`;
}
function contextualPickerBridges(){
 if(path==='/'){
  const help=document.querySelector('.v21-choice-help');
  if(help&&help.dataset.v4Picker!=='1'){
   help.dataset.v4Picker='1';
   help.innerHTML=`<div><strong>Кілька задач одразу?</strong><span>Відповідайте на кілька питань — підберемо техніку й комплект приблизно за 30 секунд.</span></div><a href="/pidbir/">Підібрати за 30 сек ${ARROW}</a>`;
  }
  const grid=document.querySelector('.v21-package-grid');
  if(grid&&!grid.parentElement?.querySelector(':scope > .v4-picker-bridge'))grid.insertAdjacentHTML('afterend',pickerBridgeMarkup('Не впевнені, який комплект обрати?','Підбір врахує всі зони й запропонує один зрозумілий варіант без зайвої техніки.','Допоможіть підібрати комплект','dark'));
 }
 if(path==='/komplekty'){
  const grid=document.querySelector('.package-page-grid');
  if(grid){
   if(!grid.nextElementSibling?.classList.contains('v4-picker-bridge'))grid.insertAdjacentHTML('afterend',pickerBridgeMarkup('Не впевнені, який комплект потрібен?','Кілька коротких питань — і підбір збере техніку під ваші задачі.','Підібрати за 30 сек','dark'));
   grid.nextElementSibling?.classList.add('v4-picker-bridge--packages');
  }
 }
 if(path==='/rishennia'){
  const strip=document.querySelector('.choice-strip');
  if(strip&&strip.dataset.v4Picker!=='1'){
   strip.dataset.v4Picker='1';
   const p=strip.querySelector('p'),h=strip.querySelector('h2'),a=strip.querySelector('a');
   if(p)p.textContent='Кілька задач одразу?';
   if(h)h.textContent='Відповідайте на кілька питань — підберемо техніку й комплект під усі зони.';
   if(a){a.href='/pidbir/';a.removeAttribute('target');a.removeAttribute('rel');a.innerHTML=`Підібрати за 30 сек ${ARROW}`;}
  }
 }
 const detailPaths=new Set(['/rishennia/textile','/rishennia/steam','/rishennia/windows','/rishennia/mattress']);
 if(detailPaths.has(path)){
  const final=document.querySelector('.final-cta');
  if(final&&!final.previousElementSibling?.classList.contains('v4-picker-bridge'))final.insertAdjacentHTML('beforebegin',pickerBridgeMarkup('Є ще інші зони?','Підбір збере кілька задач в один комплект і покаже, що справді потрібно.','Підібрати комплект','light'));
 }
 if(path==='/bronuvannia'){
  const step=document.querySelector('#booking-products');
  const heading=step?.querySelector('.booking-step-heading');
  if(heading){
   let hint=heading.querySelector('.v4-booking-picker-hint');
   if(!hint){hint=document.createElement('a');hint.className='v4-booking-picker-hint';hint.href='/pidbir/';hint.innerHTML=`Не впевнені, що обрати? <strong>Підбір за 30 сек →</strong>`;heading.appendChild(hint);}
   const preselected=new URLSearchParams(location.search).has('product');
   const selected=Boolean(step.querySelector('.booking-products button[aria-pressed="true"]'));
   hint.hidden=preselected||selected;
  }
 }
}
function mobileStickyCta(){
 const bar=document.querySelector('.mobile-booking');
 if(!bar)return;
 const hero=document.querySelector('.v21-hero,.inner-hero,.product-hero,.puzzi-hero,.booking-hero');
 const update=()=>{
  if(matchMedia('(min-width:621px)').matches){document.documentElement.classList.remove('v4-mobile-cta-visible');return;}
  if(!hero){document.documentElement.classList.toggle('v4-mobile-cta-visible',scrollY>180);return;}
  const threshold=Math.max(68,document.querySelector('.site-header')?.getBoundingClientRect().height||68);
  document.documentElement.classList.toggle('v4-mobile-cta-visible',hero.getBoundingClientRect().bottom<=threshold+8);
 };
 if(!bar.dataset.v4ScrollBound){bar.dataset.v4ScrollBound='1';addEventListener('scroll',update,{passive:true});addEventListener('resize',update,{passive:true});}
 update();
}
function termsDelivery(){if(path!=='/umovy')return;document.querySelectorAll('.terms-grid article,.terms-grid>div').forEach(card=>{const t=card.textContent||'';if(t.includes('Самовивіз або доставка')){const p=card.querySelector('p');if(p)p.innerHTML='Умови отримання та оплати винесені окремо: самовивіз у Полтаві, доставка по місту та передплата. <a href="/dostavka/"><strong>Доставка й оплата →</strong></a>';}})}
function privacyConsent(){if(path!=='/bronuvannia')return;const span=document.querySelector('.booking-consent span');if(!span||span.dataset.v4ConsentFixed==='1')return;const terms=document.createElement('a');terms.href='/umovy/';terms.target='_blank';terms.rel='noopener';terms.textContent='умови бронювання';const privacy=document.createElement('a');privacy.href='/polityka-konfidenciynosti/';privacy.target='_blank';privacy.rel='noopener';privacy.textContent='політику конфіденційності';span.replaceChildren(document.createTextNode('Погоджуюсь на обробку контактних даних для цієї заявки та приймаю '),terms,document.createTextNode(' і '),privacy,document.createTextNode('.'));span.dataset.v4ConsentFixed='1';}
function quizCta(){if(path!=='/')return;document.querySelectorAll('a,button').forEach(control=>{if((control.textContent||'').replace(/\s+/g,' ').trim()!=='Підібрати рішення ↓')return;if(control.tagName==='A')control.setAttribute('href','/pidbir/');else if(!control.dataset.v4QuizBound){control.dataset.v4QuizBound='1';control.addEventListener('click',()=>{location.href='/pidbir/'})}})}
function puzziSeoBridge(){if(path!=='/rishennia/textile')return;const list=document.querySelector('.feature-list');if(!list||list.querySelector('.v4-inline-tech-link'))return;const first=[...list.querySelectorAll('li')].find(li=>(li.textContent||'').includes('Kärcher Puzzi 8/1'));if(!first)return;const a=document.createElement('a');a.className='v4-inline-tech-link';a.href='/tekhnika/karcher-puzzi-8-1/';a.textContent='Про Kärcher Puzzi 8/1 →';first.classList.add('v4-has-tech-link');first.appendChild(a)}
function vahomeBridge(){if(path!=='/bronuvannia')return;const success=document.querySelector('.booking-success');if(!success||success.querySelector('.v4-vahome-success'))return;const box=document.createElement('div');box.className='v4-vahome-success';box.innerHTML='<strong>Простір чистий — тепер атмосфера.</strong><p>Після прибирання можна продовжити VA ecosystem у VA HOME.</p><a href="https://vahome.com.ua/" rel="noreferrer" target="_blank">Перейти до VA HOME →</a>';success.appendChild(box);}
function boot(){patchFooter();mobileMenu();reviewsProof();contextualPickerBridges();mobileStickyCta();termsDelivery();privacyConsent();quizCta();puzziSeoBridge();vahomeBridge()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('load',boot,{once:true});
new MutationObserver(()=>{privacyConsent();quizCta();contextualPickerBridges();mobileStickyCta();puzziSeoBridge();vahomeBridge();if(document.querySelector('main>footer:not(.v4-footer)'))patchFooter();}).observe(document.body,{childList:true,subtree:true});
})();
