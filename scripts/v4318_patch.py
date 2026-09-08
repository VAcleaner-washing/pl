from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def must_replace(text,old,new,label):
    if old not in text: raise SystemExit(f'missing replacement anchor: {label}')
    return text.replace(old,new,1)
def must_regex(text,pattern,repl,label,flags=re.S):
    out,n=re.subn(pattern,repl,text,count=1,flags=flags)
    if n!=1: raise SystemExit(f'regex replacement failed {label}: {n}')
    return out

# 1) Public SMS-link activation: fixed 21-day lifetime from SMS issuance, never from click time.
path=Path('supabase/functions/vacleaner-phone-promo-v1/index.ts')
s=read(path)
qualifying='''async function qualifyingDispatch(db:any,promoCode:any,phone:string){
  const {data:recipients,error}=await db.from("vacleaner_sms_dispatch_recipients")
    .select("dispatch_id,customer_phone,promo_code,status,created_at")
    .eq("customer_phone",phone).ilike("promo_code",String(promoCode.code||""))
    .in("status",["submitted","sent","delivered"]).order("created_at",{ascending:false}).limit(20);
  if(error)throw error;
  const dispatchIds=[...new Set((recipients||[]).map((r:any)=>String(r.dispatch_id||"")).filter(Boolean))];
  if(!dispatchIds.length)return null;
  const {data:dispatches,error:dispatchError}=await db.from("vacleaner_sms_dispatches").select("id,campaign_id,status,sent_at,created_at").in("id",dispatchIds);
  if(dispatchError)throw dispatchError;
  const byId=new Map((dispatches||[]).map((r:any)=>[String(r.id),r]));
  for(const recipient of recipients||[]){const dispatch=byId.get(String(recipient.dispatch_id||""));if(dispatch&&String(dispatch.campaign_id||"")===String(promoCode.campaign_id||""))return {dispatch,issuedAt:String(recipient.created_at||dispatch.sent_at||dispatch.created_at||"")}}
  return null;
}
const promoExpiryFromIssuedAt=(issuedAt:unknown)=>{const issuedMs=new Date(String(issuedAt||"")).getTime();return Number.isFinite(issuedMs)?new Date(issuedMs+BONUS_VALID_DAYS*86400000):null};

async function promoPayload'''
s=must_regex(s,r'async function qualifyingDispatch\(db:any,promoCode:any,phone:string\)\{.*?\n\}\n\nasync function promoPayload',qualifying,'phone qualifyingDispatch')
activate='''    if(action==="activate"){
      const code=normalizePromoCode(body.promoCode);if(!/^VA-[A-Z0-9]{7}$/.test(code))return json({error:"invalid_promo"},400);
      if(!await rateLimit(db,"promo-activate:ip",ip,90,900)||!await rateLimit(db,"promo-activate:code",code,20,900))return json({error:"rate_limited"},429);
      const {data:promoCode,error:codeError}=await db.from("vacleaner_promo_codes").select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source,activation_dispatch_id").ilike("code",code).maybeSingle();
      if(codeError)throw codeError;if(!promoCode||!promoCode.customer_phone)return json({error:"invalid_promo"},404);
      const phone=normalizePhone(promoCode.customer_phone);if(!phone)return json({error:"invalid_promo"},404);
      const {data:campaign,error:campaignError}=await db.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,starts_at,ends_at,issuance_ends_at").eq("id",promoCode.campaign_id).maybeSingle();if(campaignError)throw campaignError;
      if(!campaign||!["return","personal"].includes(String(campaign.campaign_type||"")))return json({error:"invalid_promo"},404);
      const issued=await qualifyingDispatch(db,promoCode,phone);if(!issued)return json({error:"sms_not_issued"},409);
      const expiresAtDate=promoExpiryFromIssuedAt(issued.issuedAt),now=Date.now(),starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0;
      if(!expiresAtDate||expiresAtDate.getTime()<=now)return json({error:"activation_window_expired"},409);
      if(campaign.status!=="active"||(starts&&starts>now))return json({error:"activation_window_expired"},409);
      const expiresAt=expiresAtDate.toISOString(),campaignEnd=campaign.ends_at?new Date(campaign.ends_at).getTime():0;
      if(!campaignEnd||campaignEnd<expiresAtDate.getTime()){const {error:extendError}=await db.from("vacleaner_campaigns").update({ends_at:expiresAt,updated_at:new Date().toISOString()}).eq("id",campaign.id);if(extendError)throw extendError}
      let current=promoCode;
      if(promoCode.active){
        const storedEnd=promoCode.expires_at?new Date(promoCode.expires_at).getTime():0;
        if(storedEnd!==expiresAtDate.getTime()){const {data:fixed,error:fixError}=await db.from("vacleaner_promo_codes").update({expires_at:expiresAt}).eq("id",promoCode.id).select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source,activation_dispatch_id").single();if(fixError)throw fixError;current=fixed}
        const existing=await promoPayload(db,current,campaign,"sms_link");if(existing)return json({ok:true,alreadyActivated:true,promo:existing});
      }
      const {count:uses,error:usesError}=await db.from("vacleaner_promo_redemptions").select("id",{count:"exact",head:true}).eq("promo_code_id",promoCode.id);if(usesError)throw usesError;if(Number(uses||0)>0)return json({error:"promo_used"},409);
      const activatedAt=new Date(),patch={active:true,activated_at:activatedAt.toISOString(),activation_source:"sms_link",activation_dispatch_id:issued.dispatch.id,activated_by:null,expires_at:expiresAt};
      const {data:activated,error:activateError}=await db.from("vacleaner_promo_codes").update(patch).eq("id",promoCode.id).eq("active",false).select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source").maybeSingle();if(activateError)throw activateError;
      const row=activated||await db.from("vacleaner_promo_codes").select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source").eq("id",promoCode.id).single().then((x:any)=>x.data);
      const payload=await promoPayload(db,row,campaign,"sms_link");if(!payload)return json({error:"promo_unavailable"},409);
      return json({ok:true,alreadyActivated:false,validDays:BONUS_VALID_DAYS,issuedAt:issued.issuedAt,promo:payload});
    }

    if(action!=="lookup")'''
s=must_regex(s,r'    if\(action==="activate"\)\{.*?\n    \}\n\n    if\(action!=="lookup"\)',activate,'phone activate block')
old='''      if(["return","personal"].includes(String(campaign.campaign_type||""))&&!await qualifyingDispatch(db,promoCode,phone))continue;
      const payload=await promoPayload(db,promoCode,campaign,"phone");if(payload)return json({promo:payload});'''
new='''      if(["return","personal"].includes(String(campaign.campaign_type||""))){const issued=await qualifyingDispatch(db,promoCode,phone);if(!issued)continue;const fixedExpiry=promoExpiryFromIssuedAt(issued.issuedAt);if(!fixedExpiry||fixedExpiry.getTime()<=Date.now())continue;const storedEnd=promoCode.expires_at?new Date(promoCode.expires_at).getTime():0;if(storedEnd!==fixedExpiry.getTime()){const {error:fixError}=await db.from("vacleaner_promo_codes").update({expires_at:fixedExpiry.toISOString()}).eq("id",promoCode.id);if(fixError)throw fixError;promoCode.expires_at=fixedExpiry.toISOString()}}
      const payload=await promoPayload(db,promoCode,campaign,"phone");if(payload)return json({promo:payload});'''
s=must_replace(s,old,new,'phone lookup fixed expiry')
write(path,s)

# 2) Admin-side pending / checkbox activation: same fixed SMS-issued window.
path=Path('supabase/functions/vacleaner-campaigns-v1/index.ts')
s=read(path)
const_old='const SMS_SENDER="VACLEANER",SMS_COOLDOWN_DAYS=90,SMS_OPT_OUT="vacleaner.pp.ua/s",PERSONAL_PROMO_VALID_DAYS=21;'
const_new=const_old+'\nconst PERSONAL_PROMO_WINDOW_MS=PERSONAL_PROMO_VALID_DAYS*86400000;\nconst promoExpiryFromIssuedAt=(issuedAt:unknown)=>{const issuedMs=new Date(String(issuedAt||"" )).getTime();return Number.isFinite(issuedMs)?new Date(issuedMs+PERSONAL_PROMO_WINDOW_MS):null};'
s=must_replace(s,const_old,const_new,'campaign expiry helper')
old='const now=Date.now(),starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0,campaignEndsAt=campaign.ends_at?new Date(campaign.ends_at).getTime():0;if(campaign.status!=="active"||(starts&&starts>now)||(campaignEndsAt&&campaignEndsAt<=now))continue;'
new='const now=Date.now(),starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0;if(campaign.status!=="active"||(starts&&starts>now))continue;'
s=must_replace(s,old,new,'pending campaign gate')
old='const issuedAt=String((recipients||[])[0]?.created_at||promo.created_at||"");return json({pendingPromo:{campaignId:String(campaign.id),campaignName:String(campaign.name||"Персональний бонус"),campaignType:String(campaign.campaign_type||""),discountType:String(campaign.discount_type||"percent"),discountValue:Number(campaign.discount_value||0),validDays:PERSONAL_PROMO_VALID_DAYS,sentAt:issuedAt}})'
new='const issuedAt=String((recipients||[])[0]?.created_at||promo.created_at||""),smsExpiresAt=promoExpiryFromIssuedAt(issuedAt);if(!smsExpiresAt||smsExpiresAt.getTime()<=now)continue;return json({pendingPromo:{campaignId:String(campaign.id),campaignName:String(campaign.name||"Персональний бонус"),campaignType:String(campaign.campaign_type||""),discountType:String(campaign.discount_type||"percent"),discountValue:Number(campaign.discount_value||0),validDays:PERSONAL_PROMO_VALID_DAYS,sentAt:issuedAt,expiresAt:smsExpiresAt.toISOString()}})'
s=must_replace(s,old,new,'pending issued expiry')
admin_activate='''    if(action==="activate_bonus"){
      const phone=normalizePhone(body.phone);if(!validUuid(campaignId)||!phone)return json({error:"invalid_campaign"},400);
      const {data:campaign,error:campaignError}=await db.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,starts_at,ends_at,issuance_ends_at").eq("id",campaignId).maybeSingle();if(campaignError)throw campaignError;if(!campaign||!["return","personal"].includes(String(campaign.campaign_type||"")))return json({error:"invalid_campaign"},404);
      const {data:promo,error:promoError}=await db.from("vacleaner_promo_codes").select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source,created_at").eq("campaign_id",campaignId).eq("customer_phone",phone).order("created_at",{ascending:false}).limit(1).maybeSingle();if(promoError)throw promoError;if(!promo)return json({error:"bonus_not_issued"},409);
      const nowMs=Date.now(),starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0;if(campaign.status!=="active"||(starts&&starts>nowMs))return json({error:"activation_window_expired"},409);
      const {count:uses,error:usesError}=await db.from("vacleaner_promo_redemptions").select("id",{count:"exact",head:true}).eq("promo_code_id",promo.id);if(usesError)throw usesError;if(Number(uses||0)>0)return json({error:"promo_used"},409);
      const {data:recipients,error:recipientError}=await db.from("vacleaner_sms_dispatch_recipients").select("dispatch_id,status,created_at").eq("customer_phone",phone).ilike("promo_code",String(promo.code||"")).in("status",["submitted","sent","delivered"]).order("created_at",{ascending:false}).limit(20);if(recipientError)throw recipientError;
      const dispatchIds=[...new Set((recipients||[]).map((r:any)=>String(r.dispatch_id||"")).filter(Boolean))];if(!dispatchIds.length)return json({error:"bonus_not_issued"},409);
      const {data:dispatches,error:dispatchError}=await db.from("vacleaner_sms_dispatches").select("id,campaign_id,sent_at,created_at").in("id",dispatchIds);if(dispatchError)throw dispatchError;const dispatch=(dispatches||[]).find((r:any)=>String(r.campaign_id||"")===campaignId);if(!dispatch)return json({error:"bonus_not_issued"},409);
      const recipient=(recipients||[]).find((r:any)=>String(r.dispatch_id||"")===String(dispatch.id)),issuedAt=String(recipient?.created_at||dispatch.sent_at||dispatch.created_at||promo.created_at||""),expiresAtDate=promoExpiryFromIssuedAt(issuedAt);if(!expiresAtDate||expiresAtDate.getTime()<=nowMs)return json({error:"activation_window_expired"},409);
      const expiresAt=expiresAtDate.toISOString(),campaignEnd=campaign.ends_at?new Date(campaign.ends_at).getTime():0,activatedAt=new Date();if(!campaignEnd||campaignEnd<expiresAtDate.getTime()){const {error:extendError}=await db.from("vacleaner_campaigns").update({ends_at:expiresAt,updated_at:activatedAt.toISOString()}).eq("id",campaign.id);if(extendError)throw extendError}
      if(promo.active){const storedEnd=promo.expires_at?new Date(promo.expires_at).getTime():0;if(storedEnd!==expiresAtDate.getTime()){const {error:fixError}=await db.from("vacleaner_promo_codes").update({expires_at:expiresAt}).eq("id",promo.id);if(fixError)throw fixError}return json({ok:true,alreadyActivated:true,issuedAt,validDays:PERSONAL_PROMO_VALID_DAYS,promo:{code:promo.code,campaignId,campaignName:campaign.name,discountType:campaign.discount_type,discountValue:Number(campaign.discount_value||0),expiresAt,activationSource:promo.activation_source||"admin"}})}
      const {data:updated,error:updateError}=await db.from("vacleaner_promo_codes").update({active:true,activated_at:activatedAt.toISOString(),activation_source:"admin",activation_dispatch_id:dispatch.id,activated_by:userData.user.id,expires_at:expiresAt}).eq("id",promo.id).eq("active",false).select("code,expires_at,activation_source").maybeSingle();if(updateError)throw updateError;if(!updated)return json({error:"promo_unavailable"},409);
      return json({ok:true,alreadyActivated:false,issuedAt,validDays:PERSONAL_PROMO_VALID_DAYS,promo:{code:updated.code,campaignId,campaignName:campaign.name,discountType:campaign.discount_type,discountValue:Number(campaign.discount_value||0),expiresAt:updated.expires_at,activationSource:updated.activation_source}})
    }

    if(!validUuid(campaignId))'''
s=must_regex(s,r'    if\(action==="activate_bonus"\)\{.*?\n    \}\n    if\(!validUuid\(campaignId\)\)',admin_activate,'campaign activate block')
write(path,s)

# 3) Manager UX: proof of SMS applies remaining window, never starts a new 21 days.
path=Path('assets/admin-v250.js')
s=read(path)
s=must_replace(s,'Підтвердіть його тільки якщо клієнт перейшов за пропозицією або показав SMS.','Клієнт може активувати бонус за посиланням із SMS або показати SMS менеджеру.','pending promo explanation')
s=must_replace(s,'<b>Клієнт підтвердив SMS</b><small>Активувати ${h(promoBenefitLabel(pendingPromo))} на 21 день і застосувати до цієї броні</small>','<b>Клієнт показав SMS</b><small>Застосувати ${h(promoBenefitLabel(pendingPromo))} до цієї броні${pendingPromo.expiresAt?` · діє до ${dateFullNumeric(String(pendingPromo.expiresAt).slice(0,10))}`:\'\'}</small>','pending checkbox copy')
s=must_replace(s,"toast(`${pendingPromo.campaignType==='return'?'RETURN-бонус':'SMS-бонус'} активовано · діє 21 день`,'success')","toast(`${pendingPromo.campaignType==='return'?'RETURN-бонус':'SMS-бонус'} застосовано до бронювання`,'success')",'activation toast')
s=must_replace(s,'Активуйте бонус: {link} Діє 21 день.','Активуйте бонус: {link} Діє 21 день від отримання SMS.','return sms copy')
write(path,s)

# 4) Supersede stale regression guards with the corrected v4.3.18 contract.
new_test='''import fs from 'node:fs';\nimport assert from 'node:assert/strict';\n\nconst phone=fs.readFileSync('supabase/functions/vacleaner-phone-promo-v1/index.ts','utf8');\nconst campaigns=fs.readFileSync('supabase/functions/vacleaner-campaigns-v1/index.ts','utf8');\nconst admin=fs.readFileSync('assets/admin-v250.js','utf8');\nconst booking=fs.readFileSync('supabase/functions/vacleaner-booking-v5/index.ts','utf8');\n\nconst phoneActivate=phone.slice(phone.indexOf('if(action==="activate")'),phone.indexOf('if(action!=="lookup")'));\nconst adminActivate=campaigns.slice(campaigns.indexOf('if(action==="activate_bonus")'),campaigns.indexOf('if(!validUuid(campaignId))',campaigns.indexOf('if(action==="activate_bonus")')));\nconst pending=campaigns.slice(campaigns.indexOf('if(action==="pending_bonus")'),campaigns.indexOf('if(action==="activate_bonus")'));\n\nassert.ok(phone.includes('promoExpiryFromIssuedAt')&&phone.includes('BONUS_VALID_DAYS*86400000'),'SMS link derives expiry from SMS issue time');\nassert.ok(phoneActivate.includes('expiresAtDate=promoExpiryFromIssuedAt(issued.issuedAt)'),'link activation uses issued-at expiry');\nassert.ok(!phoneActivate.includes('activatedAt.getTime()+BONUS_VALID_DAYS'),'link click must not start a fresh 21-day window');\nassert.ok(phoneActivate.includes('activation_source:"sms_link"'),'link remains activation path 1');\nassert.ok(adminActivate.includes('expiresAtDate=promoExpiryFromIssuedAt(issuedAt)'),'manager confirmation uses the same SMS-issued expiry');\nassert.ok(!adminActivate.includes('activatedAt.getTime()+PERSONAL_PROMO_VALID_DAYS'),'manager checkbox must not start a fresh 21-day window');\nassert.ok(adminActivate.includes('activation_source:"admin"'),'manager remains activation path 2');\nassert.ok(pending.includes('smsExpiresAt=promoExpiryFromIssuedAt(issuedAt)')&&pending.includes('smsExpiresAt.getTime()<=now'),'expired SMS is not surfaced as usable pending RETURN');\nassert.ok(admin.includes('Клієнт показав SMS')&&admin.includes('data-activate-pending-promo'),'booking has explicit SMS-proof checkbox');\nassert.ok(admin.includes('Діє 21 день від отримання SMS'),'RETURN SMS explains the fixed lifetime');\nassert.ok(!admin.includes('активовано · діє 21 день'),'admin must not imply a new 21 days starts on confirmation');\nassert.ok(booking.includes('codeEnds && codeEnds <= now')||booking.includes('codeEnds&&codeEnds<=now'),'public booking still rejects an expired promo code');\nconsole.log('PASS v4.3.18 RETURN: 21 days from SMS issuance, activation by link or manager proof, no extension on activation');\n'''
write(Path('scripts/test-v4-3-18-return-sms-window.mjs'),new_test)
write(Path('scripts/test-v4-3-17-return-issued-window.mjs'),"// v4.3.17 activation-timed lifetime was superseded by the corrected v4.3.18 SMS-issued window.\nimport './test-v4-3-18-return-sms-window.mjs';\n")
write(Path('scripts/test-v4-1-30-return-activation.mjs'),"// Historical two-path activation remains, but v4.3.18 fixes lifetime to 21 days from SMS issuance.\nimport './test-v4-3-18-return-sms-window.mjs';\n")
for rel in ['scripts/test-v4-2-22-admin-truth-ux.mjs','scripts/test-v4-2-24-finance-delivery-return.mjs']:
    p=Path(rel);t=read(p).replace('Клієнт підтвердив SMS','Клієнт показав SMS');write(p,t)

# 5) System Spec: correct the mistaken v4.3.17 interpretation and make the two-path contract explicit.
path=Path('docs/VAcleaner-SYSTEM-SPEC.md')
s=read(path)
s=s.replace('`RET-001…004` зберігаються: SMS sent ≠ active; менеджер бачить pending RETURN, ставить `Клієнт підтвердив SMS`, після чого server-side activation фіксує `activation_source=admin` і запускає 21-денний строк.','`RET-001…004` зберігаються: SMS sent ≠ active; менеджер бачить pending RETURN, ставить `Клієнт показав SMS`, після чого server-side activation фіксує `activation_source=admin` і застосовує залишок 21-денного строку, який рахується від фактичної відправки SMS.')
s=s.replace('- **RET-002/003/004** — pending → activated → used, customer link, manager checkbox та 21 днів від activation не змінені.','- **RET-002/003/004** — pending → activated → used, customer link і manager checkbox зберігаються; правило «21 день від activation» виправлене у v4.3.18 на «21 день від фактичної відправки SMS».')
s += '''\n\n---\n\n# 74. Change record — v4.3.18 RETURN SMS 21-DAY WINDOW\n\n## RET-009 — строк RETURN рахується від SMS, а не від активації\n\nПерсональний RETURN, виданий через SMS, має один незмінний строк: **21 день від фактичного `submitted/sent/delivered` SMS issuance timestamp**. Перехід за посиланням або підтвердження менеджером не створюють нові 21 день і не продовжують строк.\n\nЄ рівно два способи активації вже виданого RETURN:\n1. клієнт переходить за персональним посиланням у SMS (`activation_source=sms_link`), після чого код можна використати на сайті;\n2. клієнт показує / надсилає SMS менеджеру, а менеджер у бронюванні ставить `Клієнт показав SMS` (`activation_source=admin`).\n\nВ обох випадках `expires_at = sms_issued_at + 21 days`. Якщо на момент переходу або менеджерського підтвердження 21 день уже минув, активація та використання заборонені. Повторний перехід або повторне підтвердження ідемпотентні й не змінюють `expires_at`.\n\n`issuance_ends_at` обмежує тільки **відправку нових RETURN SMS**. Для вже надісланого SMS джерелом строку є його власний issuance timestamp, а не `issuance_ends_at`, `campaign.ends_at` чи момент активації. Технічний `campaign.ends_at` може бути доведений лише до фіксованого `sms_issued_at + 21 days`, щоб не блокувати валідний код, але не визначає строк бонусу.\n\n### FIXED\n- усунуто регресію, де пізній клік по SMS або пізня галочка менеджера давали клієнту нові 21 день;\n- pending RETURN у бронюванні показується тільки поки 21-денний строк від SMS ще чинний;\n- старий active RETURN при lookup нормалізує `expires_at` до фактичного SMS + 21 день, тому старе завищене expiry не дає використати прострочений бонус;\n- текст SMS прямо каже `Діє 21 день від отримання SMS`; менеджерська галочка — `Клієнт показав SMS`.\n\n### PRESERVED\n- SMS sent саме по собі не робить promo active;\n- персональне SMS-посилання та manager checkbox залишаються двома шляхами активації;\n- promo одноразовий і після redemption повторно не використовується;\n- тарифи, доставка, referral, inventory, public booking pricing і VA HOME не змінюються.\n\n### TESTS\n- `scripts/test-v4-3-18-return-sms-window.mjs`;\n- legacy v4.1.30 / v4.3.17 guards делегують до RET-009, щоб старий помилковий activation-timed контракт не повернувся.\n'''
write(path,s)

print('v4.3.18 patch applied')
