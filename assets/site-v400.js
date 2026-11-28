
(()=>{
'use strict';
const path=location.pathname.replace(/\/+$/,'')||'/';
const ARROW='<svg aria-hidden="true" class="icon-arrow" focusable="false" viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"></path></svg>';
// One footer tree: all links are available without JS; native disclosures are
// compact on mobile after hydration. Never reset a user's toggle on mutations.
const footerMobile=matchMedia('(max-width:620px)');
function footerNavigation(reset=false){
 document.querySelectorAll('footer.v4-footer').forEach(footer=>{
  if(footer.dataset.v4NavigationReady&&!reset)return;
  footer.dataset.v4NavigationReady='1';
  footer.querySelectorAll('.v4-footer-navigation>details').forEach(group=>{group.open=!footerMobile.matches;});
  // Standalone exports have no retained React ContactAnalytics owner. Bind only
  // their footer; hydrated pages keep the existing document listener unchanged.
  if(!footer.dataset.v4ContactReady&&!document.querySelector('script[src*="/assets/public-hydration.js"]')){
   footer.dataset.v4ContactReady='1';
   footer.addEventListener('click',event=>{
    const link=event.target.closest('a');if(!link)return;
    const href=link.getAttribute('href')||'';
    const method=href.startsWith('tel:')?'phone':href.includes('instagram.com/')?'instagram':'';
    if(!method)return;
    let attribution={};try{attribution=JSON.parse(sessionStorage.getItem('vacleaner_attribution')||'{}');}catch{}
    (window.dataLayer=window.dataLayer||[]).push({event:'contact_click',contact_method:method,link_text:(link.textContent||'').trim().slice(0,80),link_url:href,page_path:location.pathname,...attribution});
   });
  }
 });
}
footerMobile.addEventListener('change',()=>footerNavigation(true));
function patchFooter(){
 document.querySelectorAll('footer').forEach(footer=>{if(footer.classList.contains('v4-footer')||footer.closest('.vq-dialog'))return;footer.className='v4-footer';footer.innerHTML='<div class="footer-main v4-footer-grid"><div class="v4-footer-brand"><a class="brand footer-brand" href="/"><span class="brand-mark">VA</span><span class="brand-copy"><strong>CLEANER</strong><small>POLTAVA</small></span></a><p>Сервіс самостійного глибокого прибирання в Полтаві.</p><div class="v4-footer-contact"><a class="v4-footer-phone" href="tel:+380953919569"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3H4v3c0 8 6 14 14 14h3v-3l-5-2-2 2a15 15 0 0 1-7-7l2-2z"></path></svg><span>+38 (095) 391 95 69</span></a><a class="v4-footer-pin" href="/dostavka/"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0Z"></path><circle cx="12" cy="9" r="2"></circle></svg><span>Полтава · доставка та самовивіз</span></a><a class="v4-footer-instagram" href="https://www.instagram.com/vacleaner_washing.pl/" rel="noreferrer" target="_blank"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><path d="M17 7h.01"></path></svg><span>@vacleaner_washing.pl</span></a></div></div><nav class="v4-footer-navigation" aria-label="Навігація у підвалі"><details open=""><summary>Підібрати</summary><div class="v4-footer-links"><a href="/pidbir/">Підбір за 30 сек</a><a href="/rishennia/">Що почистити</a><a href="/komplekty/">Комплекти</a><a href="/bronuvannia/">Бронювання</a></div></details><details open=""><summary>Довіра</summary><div class="v4-footer-links"><a href="/yak-tse-pratsiuie/">Як це працює</a><a href="/vidhuky/">Відгуки</a><a href="/pro-nas/">Про VAcleaner</a><a href="/blog/">Поради</a></div></details><details open=""><summary>Сервіс</summary><div class="v4-footer-links"><a href="/dostavka/">Доставка й оплата</a><a href="/faq/">FAQ</a><a href="/kontakty/">Контакти</a></div></details><details open=""><summary>Інформація</summary><div class="v4-footer-links"><a href="/umovy/">Умови оренди</a><a href="/polityka-konfidenciynosti/">Конфіденційність</a></div></details></nav></div><div class="v4-footer-ecosystem"><a class="v4-vahome-banner" href="https://vahome.com.ua/" rel="noreferrer" target="_blank"><span class="v4-vahome-brand"><small>VA ECOSYSTEM</small><strong>VA HOME <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 13 13 3M4 3h9v9"></path></svg></strong></span><span class="v4-vahome-message">Простір чистий — тепер атмосфера.</span><img class="v4-vahome-art" src="/assets/va-home-footer-art.svg" width="160" height="110" alt="" loading="lazy" decoding="async"></a></div><div class="footer-bottom"><span>© 2026 VAcleaner</span></div>';});
}
function mobileMenu(){if(document.getElementById('_R_'))return;document.querySelectorAll('.menu-button').forEach(btn=>{if(btn.dataset.v4Bound)return;btn.dataset.v4Bound='1';btn.addEventListener('click',()=>{const menu=document.querySelector('.mobile-menu');const open=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!open));menu?.classList.toggle('is-open',!open);document.body.classList.toggle('menu-open',!open)})});document.querySelectorAll('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('.menu-button')?.setAttribute('aria-expanded','false');document.querySelector('.mobile-menu')?.classList.remove('is-open');document.body.classList.remove('menu-open')}));}
function reviewsProof(){if(path!=='/vidhuky'||document.querySelector('.v4-review-proof'))return;const hero=document.querySelector('.inner-hero');if(!hero)return;const box=document.createElement('section');box.className='v4-review-proof';box.innerHTML='<div><span class="v4-review-proof__mark" aria-hidden="true">✓</span><div><strong>Підтверджена оренда</strong><p>Позначка означає: відгук пов’язаний із фактичним бронюванням VAcleaner.</p><small>Ім’я публікуємо лише з дозволу клієнта.</small></div></div>';hero.insertAdjacentElement('afterend',box);}

function pickerBridgeMarkup(title,copy,label='Підібрати за 30 сек',tone='dark'){
 return `<div class="v4-picker-bridge v4-picker-bridge--${tone}"><div><strong>${title}</strong><span>${copy}</span></div><a href="/pidbir/">${label} ${ARROW}</a></div>`;
}
function contextualPickerBridges(){
 if(path==='/komplekty'){
  const grid=document.querySelector('.package-page-grid');
  if(grid){
   if(!grid.nextElementSibling?.classList.contains('v4-picker-bridge'))grid.insertAdjacentHTML('afterend',pickerBridgeMarkup('Не впевнені, який комплект потрібен?','Кілька коротких питань — і підбір збере техніку під ваші задачі.','Підібрати за 30 сек','dark'));
   grid.nextElementSibling?.classList.add('v4-picker-bridge--packages');
  }
 }
 const detailPaths=new Set(['/rishennia/textile','/rishennia/steam','/rishennia/windows','/rishennia/mattress']);
 if(detailPaths.has(path)){
  const final=document.querySelector('.final-cta');
  if(final&&!final.previousElementSibling?.classList.contains('v4-picker-bridge'))final.insertAdjacentHTML('beforebegin',pickerBridgeMarkup('Є ще інші зони?','Підбір збере кілька задач в один комплект і покаже, що справді потрібно.','Підібрати комплект','light'));
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
function privacyConsent(){if(path!=='/bronuvannia')return;const span=document.querySelector('.booking-consent:not(.vx-marketing-consent) > span');if(!span||span.dataset.v4ConsentFixed==='1')return;const terms=document.createElement('a');terms.href='/umovy/';terms.target='_blank';terms.rel='noopener';terms.textContent='умови бронювання';const privacy=document.createElement('a');privacy.href='/polityka-konfidenciynosti/';privacy.target='_blank';privacy.rel='noopener';privacy.textContent='політику конфіденційності';span.replaceChildren(document.createTextNode('Погоджуюсь на обробку контактних даних для цієї заявки та приймаю '),terms,document.createTextNode(' і '),privacy,document.createTextNode('.'));span.dataset.v4ConsentFixed='1';}
function quizCta(){if(path!=='/')return;document.querySelectorAll('a,button').forEach(control=>{if((control.textContent||'').replace(/\s+/g,' ').trim()!=='Підібрати рішення ↓')return;if(control.tagName==='A')control.setAttribute('href','/pidbir/');else if(!control.dataset.v4QuizBound){control.dataset.v4QuizBound='1';control.addEventListener('click',()=>{location.href='/pidbir/'})}})}
function solutionTechBridge(){
 const routes={
  '/rishennia/textile':{needle:'Kärcher Puzzi 8/1',href:'/tekhnika/karcher-puzzi-8-1/',mode:'name',label:'Kärcher Puzzi 8/1 і насадка для меблів'},
  '/rishennia/steam':{needle:'Kärcher SC 2 Deluxe',href:'/tekhnika/karcher-sc-2-deluxe/',mode:'name',label:'Kärcher SC 2 Deluxe'},
  '/rishennia/windows':{needle:'ABIR WD8',href:'/tekhnika/robot-dlia-vikon-abir/',mode:'name',label:'Робот для вікон · ABIR WD8'}
 };
 const cfg=routes[path];if(!cfg)return;const list=document.querySelector('.feature-list');if(!list)return;
 const first=[...list.querySelectorAll('li')].find(li=>(li.textContent||'').includes(cfg.needle));if(!first)return;
 if(cfg.mode==='context'){
  if(first.querySelector('.v4-inline-tech-link'))return;const a=document.createElement('a');a.className='v4-inline-tech-link';a.href=cfg.href;a.textContent=cfg.label;first.classList.add('v4-has-tech-link');first.appendChild(a);return;
 }
 if(first.querySelector('.v4-feature-tech-name'))return;const number=first.querySelector(':scope>span');[...first.childNodes].forEach(node=>{if(node!==number)node.remove()});const a=document.createElement('a');a.className='v4-feature-tech-name';a.href=cfg.href;a.textContent=cfg.label;first.appendChild(a)
}
function vahomeBridge(){if(path!=='/bronuvannia')return;const success=document.querySelector('.booking-success');if(!success||success.querySelector('.v4-vahome-success'))return;const box=document.createElement('div');box.className='v4-vahome-success';box.innerHTML='<strong>Простір чистий — тепер атмосфера.</strong><p>Після прибирання можна продовжити VA ecosystem у VA HOME.</p><a href="https://vahome.com.ua/" rel="noreferrer" target="_blank">Перейти до VA HOME →</a>';success.appendChild(box);}
function boot(){patchFooter();footerNavigation();mobileMenu();reviewsProof();contextualPickerBridges();mobileStickyCta();termsDelivery();privacyConsent();quizCta();solutionTechBridge();vahomeBridge()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('load',boot,{once:true});
new MutationObserver(()=>{privacyConsent();quizCta();contextualPickerBridges();mobileStickyCta();solutionTechBridge();vahomeBridge();if(document.querySelector('main>footer:not(.v4-footer)'))patchFooter();footerNavigation();}).observe(document.body,{childList:true,subtree:true});
})();
