(()=>{
  'use strict';
  const ATTR_KEY='vacleaner_attribution_v1';
  const ATTR_TTL=30*24*60*60*1000;
  const clean=(v,max=120)=>String(v??'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const params=new URLSearchParams(location.search);
  const now=()=>Date.now();
  const safeJson=(raw,fallback)=>{try{return JSON.parse(raw)||fallback}catch{return fallback}};
  const storeGet=(key,area=sessionStorage)=>{try{return safeJson(area.getItem(key),null)}catch{return null}};
  const storeSet=(key,value,area=sessionStorage)=>{try{area.setItem(key,JSON.stringify(value))}catch{}};
  function classifyReferrer(){
    if(!document.referrer)return {source:'direct',medium:'none'};
    try{
      const u=new URL(document.referrer);
      if(u.origin===location.origin)return {source:'internal',medium:'referral',referrer_path:u.pathname};
      const h=u.hostname.toLowerCase();
      if(h.includes('instagram.com')||h.includes('l.instagram.com'))return {source:'instagram',medium:'social'};
      if(h.includes('facebook.com')||h.includes('fb.com'))return {source:'facebook',medium:'social'};
      if(h.includes('google.'))return {source:'google',medium:'organic'};
      if(h.includes('t.me')||h.includes('telegram.'))return {source:'telegram',medium:'messenger'};
      return {source:clean(h,80)||'referral',medium:'referral'};
    }catch{return {source:'referral',medium:'referral'}}
  }
  function explicitTouch(){
    const utmSource=clean(params.get('utm_source'),80),utmMedium=clean(params.get('utm_medium'),80),utmCampaign=clean(params.get('utm_campaign'),100),utmContent=clean(params.get('utm_content'),100),utmTerm=clean(params.get('utm_term'),100);
    if(utmSource||utmMedium||utmCampaign||utmContent||utmTerm)return {source:utmSource||'campaign',medium:utmMedium||'campaign',campaign:utmCampaign,content:utmContent,term:utmTerm};
    if(params.has('gclid'))return {source:'google',medium:'cpc',has_gclid:true};
    if(params.has('fbclid'))return {source:'meta',medium:'paid_social',has_fbclid:true};
    return null;
  }
  const existing=storeGet(ATTR_KEY,sessionStorage);
  const external=explicitTouch();
  const ref=classifyReferrer();
  const inferred=external||(ref.source!=='internal'?ref:null);
  const base=existing&&now()-Number(existing.updated_at||0)<ATTR_TTL?existing:null;
  const touch=inferred||base?.last||{source:'direct',medium:'none'};
  storeSet(ATTR_KEY,{schema:1,created_at:base?.created_at||now(),updated_at:now(),landing_path:base?.landing_path||path,first:base?.first||touch,last:inferred||base?.last||touch},sessionStorage);

  const LEGACY_CONTACT_EVENTS={contact_instagram:'instagram',contact_telegram:'telegram',contact_phone:'phone'};
  const layer=window.dataLayer=window.dataLayer||[];
  if(!layer.push?.__vacleanerContactNormalizer){
    const previousPush=layer.push.bind(layer);
    const normalizedPush=(...items)=>previousPush(...items.map(item=>{
      if(!item||typeof item!=='object'||Array.isArray(item))return item;
      const method=LEGACY_CONTACT_EVENTS[item.event];
      return method?{...item,event:'contact_click',contact_method:item.contact_method||method}:item;
    }));
    Object.defineProperty(normalizedPush,'__vacleanerContactNormalizer',{value:true});
    layer.push=normalizedPush;
  }
})();
