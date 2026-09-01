(()=>{
  'use strict';
  const mobile=()=>window.matchMedia('(max-width: 900px)').matches;
  const labels={
    equipment:'Каталог та наявність',
    clients:'База клієнтів та контакти',
    campaigns:'Повідомлення, бонуси та акції',
    finances:'Платежі та звіти',
    analytics:'Статистика та показники',
    chemistry:'Засоби та витратні матеріали',
    settings:'Профіль і параметри'
  };
  const monthGenitive=['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
  const formatPhone=value=>{
    const digits=String(value||'').replace(/\D/g,'');
    const d=digits.startsWith('380')?digits:digits.length===10?'38'+digits:digits;
    if(d.length!==12||!d.startsWith('380'))return String(value||'');
    return `+${d.slice(0,3)} ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10,12)}`;
  };
  const cleanText=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})};

  function enhanceShell(){
    if(!mobile())return;
    const main=document.querySelector('.main');
    const head=main?.querySelector('.page-head');
    const search=document.querySelector('.search');
    if(main&&head&&search){
      const subtitle=head.querySelector('p');
      if(subtitle)subtitle.textContent='Бронювання на найближчі дні';
      const input=search.querySelector('input');
      if(input)input.placeholder='Пошук: клієнт, адреса, техніка…';
      let row=main.querySelector('.native-search-row');
      if(!row){
        row=document.createElement('div');
        row.className='native-search-row';
        head.insertAdjacentElement('afterend',row);
      }
      if(search.parentElement!==row)row.appendChild(search);
      if(!row.querySelector('.native-search-options')){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='native-search-options';
        btn.setAttribute('aria-label','Фільтри');
        btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6"/></svg>';
        btn.onclick=()=>{
          const active=document.querySelector('.upcoming-scope .chip.active');
          active?.scrollIntoView({behavior:'smooth',block:'center'});
        };
        row.appendChild(btn);
      }
      if(!head.querySelector('.native-alert-button')){
        const bell=document.createElement('button');
        bell.type='button';
        bell.className='native-alert-button';
        bell.setAttribute('aria-label','Нові бронювання');
        const badge=document.querySelector('#mobileNavBadge');
        const count=(badge?.textContent||'').trim();
        bell.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>'+(count?`<b>${count}</b>`:'');
        bell.onclick=()=>document.querySelector('.mobile-nav [data-mobile-view="bookings"]')?.click();
        head.appendChild(bell);
      }
    }
  }

  function enhanceUpcoming(){
    if(!mobile())return;
    document.querySelectorAll('.upcoming-day>header').forEach(header=>{
      if(header.dataset.nativeDate==='1')return;
      const d=header.querySelector('span');
      const meta=header.querySelector('small');
      if(!d||!meta)return;
      const dm=(d.textContent||'').trim().match(/^(\d{2})\.(\d{2})$/);
      if(dm){
        const day=Number(dm[1]),month=Number(dm[2]);
        const monthName=monthGenitive[month-1]||'';
        const raw=(meta.textContent||'').trim();
        const lead=raw==='сьогодні'?'Сьогодні':raw==='завтра'?'Завтра':raw.charAt(0).toUpperCase()+raw.slice(1);
        d.textContent=`${lead}, ${day} ${monthName}`;
        meta.hidden=true;
        header.dataset.nativeDate='1';
      }
    });
    document.querySelectorAll('.upcoming-row').forEach(row=>{
      const time=row.querySelector('.upcoming-time');
      const status=row.querySelector('.upcoming-title .status');
      if(time&&status&&!time.contains(status))time.appendChild(status);
      const tel=row.querySelector('.upcoming-client-info a');
      if(tel){tel.classList.add('native-phone');tel.textContent=formatPhone(tel.textContent)}
      const stateNode=row.querySelector('.status');
      if(stateNode){
        const cls=[...stateNode.classList].find(c=>['pending','waiting_payment','confirmed','issued','completed','cancelled','declined'].includes(c));
        if(cls)row.dataset.status=cls;
      }
      const open=row.querySelector('[data-up="open"]');
      if(open)open.textContent='Деталі';
      row.classList.add('native-card-ready');
    });
  }

  function enhanceMore(){
    if(!mobile())return;
    const menu=document.querySelector('.mobile-more-menu');
    if(!menu)return;
    if(!menu.querySelector('.native-more-title')){
      const title=document.createElement('h1');
      title.className='native-more-title';
      title.textContent='Ще';
      menu.prepend(title);
    }
    if(!menu.querySelector('.native-profile-card')){
      let name=document.querySelector('.top-profile-copy strong')?.textContent?.trim()||'VAcleaner';
      if(name==='Vadim')name='Вадим';
      const card=document.createElement('button');
      card.type='button';
      card.className='native-profile-card';
      card.innerHTML=`<i>VA</i><span><b>${name}</b><small>Адміністратор</small></span><em>›</em>`;
      card.onclick=()=>document.querySelector('[data-more-view="settings"]')?.click();
      const grid=menu.querySelector('.mobile-more-grid');
      grid?.insertAdjacentElement('beforebegin',card);
    }
    menu.querySelectorAll('[data-more-view]').forEach(btn=>{
      if(btn.querySelector('small'))return;
      const id=btn.dataset.moreView;
      const span=btn.querySelector('span');
      if(span){
        const small=document.createElement('small');
        small.textContent=labels[id]||'';
        span.appendChild(small);
      }
      btn.classList.toggle('native-secondary-group',['settings'].includes(id));
    });
  }

  function enhanceDetail(){
    if(!mobile())return;
    const detail=document.querySelector('.detail');
    if(!detail||detail.dataset.nativeDetail==='1')return;
    detail.dataset.nativeDetail='1';
    const shell=detail.querySelector('.detail-shell');
    const meta=detail.querySelector('.detail-top-meta span');
    const originalCode=cleanText(meta).replace(/^Бронювання\s+/i,'');
    if(meta)meta.textContent='Бронювання';
    const top=detail.querySelector('.detail-top');
    if(top&&!top.querySelector('.native-detail-code')){
      const code=document.createElement('em');
      code.className='native-detail-code';
      code.textContent=originalCode||'';
      top.appendChild(code);
    }
    const hero=detail.querySelector('.detail-hero');
    const heroStatus=detail.querySelector('.hero-status');
    const statusText=cleanText(heroStatus).replace(/^✓\s*/,'').toLowerCase();
    const statusClass=statusText.includes('видана')?'issued':statusText.includes('повернен')?'completed':statusText.includes('очікує')?'waiting_payment':statusText.includes('нова')?'pending':statusText.includes('скас')?'cancelled':'confirmed';
    const flow=detail.querySelector('.flow');
    if(flow)flow.classList.add('native-detail-flow');
    const grid=detail.querySelector('.detail-grid');
    const info=detail.querySelector('.info-grid');
    const finance=detail.querySelector('.finance-panel');
    if(shell&&grid&&info&&!detail.querySelector('.native-detail-card')){
      const client=info.querySelector('.detail-client-link');
      const delivery=info.querySelector('.detail-delivery-panel');
      const extras=info.querySelector('.extras-panel');
      const gift=info.querySelector('.gift-panel');
      const customerComment=info.querySelector('.comment:not(.admin-note-panel)');
      const managerNote=info.querySelector('.admin-note-panel');
      const card=document.createElement('section');
      card.className='native-detail-card';
      card.dataset.status=statusClass;
      const periodNode=hero?.querySelector('.period');
      const periodClone=periodNode?.cloneNode(true);
      periodClone?.querySelector('small')?.remove();
      const period=cleanText(periodClone);
      const product=cleanText(hero?.querySelector('h1'));
      const clientName=cleanText(client?.querySelector('h2'));
      const phone=cleanText(client?.querySelector('a'));
      const deliveryTitle=cleanText(delivery?.querySelector('h2'));
      const deliveryPs=[...delivery?.querySelectorAll('p')||[]];
      const deliveryPrice=cleanText(deliveryPs[0]);
      const deliveryLink=delivery?.querySelector('a');
      const deliveryAddress=cleanText(deliveryLink||deliveryPs[1]);
      const access=cleanText(delivery?.querySelector('.detail-delivery-detail strong'));
      const extrasText=extras?[...extras.querySelectorAll('div')].map(n=>{const a=cleanText(n.querySelector('span'));const b=cleanText(n.querySelector('strong'));return [a,b].filter(Boolean).join(' · ')}).join(' · '):'';
      const giftText=gift?[...gift.querySelectorAll('div')].map(n=>cleanText(n)).join(' · '):'';
      const noteText=cleanText(managerNote?.querySelector('p')||customerComment?.querySelector('p'));
      let payRows='';
      if(finance){
        const rows=[...finance.querySelectorAll('.money-row')].filter(r=>!r.classList.contains('received-total')&&!r.classList.contains('expenses-total')).slice(0,3);
        payRows=rows.map(r=>{let label=cleanText(r.querySelector('span'));if(label.startsWith('Передоплата'))label='Передоплата';else if(label.startsWith('Фактичний залоговий'))label='Залог';else if(label.startsWith('Оренда'))label='Оренда';return `<div class="native-pay-line"><span>${label}</span><b>${cleanText(r.querySelector('strong'))}</b></div>`}).join('');
      }
      const row=(icon,label,body,extra='')=>`<div class="native-detail-info-row"><i aria-hidden="true">${icon}</i><div><small>${label}</small>${body}${extra}</div></div>`;
      card.innerHTML=[
        row('◫','Дата і час',`<strong class="native-period">${period.includes('→')?period.split('→').map((x,i)=>`<span>${i?'→ ':''}${x.trim()}</span>`).join(''):(period||'—')}</strong>`),
        row('⌁','Техніка',`<strong>${product||'—'}</strong>`),
        row('○','Клієнт',`<strong>${clientName||'—'}</strong>${phone?`<a href="tel:${phone.replace(/\s/g,'')}">${formatPhone(phone)}</a>`:''}`),
        row('⌖',deliveryTitle||'Видача',`<strong>${deliveryAddress||deliveryPrice||'—'}</strong>${access?`<span>${access}</span>`:''}${deliveryPrice&&deliveryAddress?`<span>${deliveryPrice}</span>`:''}`),
        extrasText?row('⌬','Додаткова хімія',`<strong>${extrasText}</strong>`):'',
        giftText?row('✦','Подарунок',`<strong>${giftText}</strong>`):'',
        payRows?row('▭','Оплата',`<div class="native-payments">${payRows}</div>`):'',
        noteText?row('▤','Примітка',`<strong>${noteText}</strong>`):''
      ].join('');
      hero?.insertAdjacentElement('afterend',card);
      const stack=document.createElement('section');
      stack.className='native-detail-stack';
      stack.dataset.status=statusClass;
      [...info.children].forEach(node=>stack.appendChild(node));
      if(finance)stack.appendChild(finance);
      grid.insertAdjacentElement('beforebegin',stack);
      grid.classList.add('native-detail-grid-empty');
      stack.querySelectorAll(':scope > article').forEach(a=>a.classList.add('native-detail-row'));
    }
    const oldStack=detail.querySelector('.native-detail-stack');
    if(oldStack)oldStack.dataset.status=statusClass;
    const actions=detail.querySelector('.detail-actions');
    if(actions)actions.classList.add('native-detail-actions');
  }

  function enhance(){
    enhanceShell();
    enhanceUpcoming();
    enhanceMore();
    enhanceDetail();
  }
  const observer=new MutationObserver(queue);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:false});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('DOMContentLoaded',queue,{once:true});
  queue();
})();
