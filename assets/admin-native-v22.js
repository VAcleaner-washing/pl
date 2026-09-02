(()=>{
  'use strict';
  const mobile=()=>matchMedia('(max-width:900px)').matches;
  let queued=false;
  const q=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  const text=e=>(e?.textContent||'').trim().toLowerCase();

  function markBookings(){
    document.querySelectorAll('.booking-card').forEach(card=>{
      const status=card.querySelector('.status');
      const cls=[...status?.classList||[]].find(x=>['pending','waiting_payment','confirmed','issued','completed','cancelled'].includes(x));
      if(cls){
        card.dataset.v22Status=cls;
        card.classList.toggle('native-v22-compact',cls==='completed'||cls==='cancelled');
      }
    });
  }

  function normalizeSettings(){
    document.querySelectorAll('.settings-slot-editor .slot-editor-row').forEach(row=>{
      if(row.querySelector(':scope > .v22-slot-range'))return;
      const labels=[...row.querySelectorAll(':scope > label')];
      if(labels.length<2)return;
      const wrap=document.createElement('div');wrap.className='v22-slot-range';
      labels[0].querySelector('small')&&(labels[0].querySelector('small').textContent='Початок');
      labels[1].querySelector('small')&&(labels[1].querySelector('small').textContent='Кінець');
      labels[0].before(wrap);labels.forEach(l=>wrap.appendChild(l));
    });
  }

  function cleanDetail(){
    document.querySelectorAll('.native-detail-info-row[data-v2-date]').forEach(row=>row.remove());
  }

  function markFlows(){
    document.querySelectorAll('.process-form,.issue-form,.finance-form,.extend-form,.booking-form').forEach(form=>form.classList.add('native-v22-flow'));
  }

  function apply(){
    if(!mobile())return;
    document.documentElement.classList.add('native-v22');
    markBookings();normalizeSettings();cleanDetail();markFlows();
  }
  new MutationObserver(q).observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('resize',q,{passive:true});
  addEventListener('DOMContentLoaded',q,{once:true});
  q();
})();
