import fs from 'node:fs';
import path from 'node:path';

// This repository retains a static export. Keep its approved markup and the
// retained client components in sync instead of suppressing hydration errors.
const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,value)=>fs.writeFileSync(path.join(root,file),value);
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[\da-f]+|\d+);/gi,entity=>{
  const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':'\u00a0'};
  if(named[entity])return named[entity];
  return String.fromCodePoint(entity[2].toLowerCase()==='x'?parseInt(entity.slice(3),16):parseInt(entity.slice(2),10));
});
const propName=name=>({class:'className',for:'htmlFor',viewbox:'viewBox',tabindex:'tabIndex',fetchpriority:'fetchPriority'}[name]||name);
function parseMarkup(html){
  const tree={children:[]},stack=[tree];
  for(const token of html.matchAll(/<\/?[\w-]+\b[^>]*>|[^<]+/g)){
    const value=token[0];
    if(value.startsWith('</')){stack.pop();continue;}
    if(value.startsWith('<')){
      const tag=value.match(/^<([\w-]+)/)[1];
      const props={};
      for(const attr of value.slice(tag.length+1,-1).matchAll(/([\w:-]+)(?:="([^"]*)"|='([^']*)')?/g))props[propName(attr[1])]=decode(attr[2]??attr[3]??'');
      const node={tag,props,children:[]};stack.at(-1).children.push(node);
      if(!['img','input','br','hr','link','meta','source'].includes(tag))stack.push(node);
    }else stack.at(-1).children.push(decode(value));
  }
  return tree.children.find(node=>typeof node!=='string');
}
function jsx(node,alias){
  if(typeof node==='string')return JSON.stringify(node);
  const props={...node.props};
  const children=node.children.map(child=>jsx(child,alias));
  const entries=Object.entries(props).map(([key,value])=>`${JSON.stringify(key)}:${JSON.stringify(value)}`);
  if(children.length)entries.push(`children:${children.length===1?children[0]:`[${children.join(',')}]`}`);
  return `(0,${alias}.${children.length>1?'jsxs':'jsx'})(${JSON.stringify(node.tag)},{${entries.join(',')}})`;
}
function flightNode(node){
  if(typeof node==='string')return node;
  const props={...node.props};
  if(node.children.length)props.children=node.children.length===1?flightNode(node.children[0]):node.children.map(flightNode);
  return ['$',node.tag,null,props];
}
function findClass(node,name){
  if(typeof node==='string')return null;
  if(node.props?.className===name)return node;
  for(const child of node.children||[]){const found=findClass(child,name);if(found)return found;}
  return null;
}
function syncFlight(source,replacements,ctaId=source.match(/^([\da-f]+):I\[[^\n]*,"BookingCta"\]/m)?.[1]){
  function visit(value){
    if(Array.isArray(value)){
      if(value[0]==='$'&&typeof value[1]==='string'&&replacements.has(value[3]?.className))return flightNode(replacements.get(value[3].className));
      const children=value.map(visit);
      const related=replacements.get('content-related-section');
      const at=children.findIndex(child=>Array.isArray(child)&&child[0]==='$'&&child[1]===`$L${ctaId}`);
      if(related&&ctaId&&at>=0&&!children.some(child=>child?.[3]?.className==='content-related-section'))children.splice(at,0,flightNode(related));
      return children;
    }
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,visit(child)]));
    return value;
  }
  return source.replace(/^([\da-f]+):([\[{].*)$/gm,(line,id,json)=>{
    try{return `${id}:${JSON.stringify(visit(JSON.parse(json)))}`;}catch{return line;}
  });
}
function expressionEnd(source,start){
  let depth=0,quote='';
  for(let i=start;i<source.length;i++){
    const ch=source[i];
    if(quote){if(ch==='\\')i++;else if(ch===quote)quote='';continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='(')depth++;
    if(ch===')'&&--depth===0)return i+1;
  }
  throw new Error('Unterminated footer JSX expression');
}
const footerMatch=read('assets/site-v400.js').match(/footer\.innerHTML='([^']+)';/);
if(!footerMatch)throw new Error('Canonical public footer not found');
const footer=parseMarkup(`<footer class="v4-footer">${footerMatch[1]}</footer>`);
const hydratedEffect=alias=>`(0,${alias}.useEffect)(()=>{document.documentElement.dataset.vacleanerHydrated="1";window.dispatchEvent(new Event("vacleaner:hydrated"))},[]);`;
for(const [file,alias,react] of [
  ['01pb0x0z72e41.js','s','i'],
  ['0x2bx8kerxrmz.js','a','s'],
  ['146ntlcv_t6~w-v4041.js','r','n'],
]){
  const rel=`_next/static/chunks/${file}`;
  let source=read(rel);
  // Find the footer JSX factory without relying on its current attributes.
  const match=source.match(/\(0,([\w]+)\.jsxs?\)\("footer",/);
  if(!match)throw new Error(`Footer not found: ${file}`);
  const callStart=source.indexOf(')("footer",',match.index)+1;
  source=source.slice(0,match.index)+jsx(footer,match[1])+source.slice(expressionEnd(source,callStart));
  if(!source.includes('vacleaner:hydrated')){
    // Home/booking own their complete page; server pages use the shared footer.
    if(file==='01pb0x0z72e41.js'||file==='146ntlcv_t6~w-v4041.js')source=source.replace('"default",0,function(){','"default",0,function(){'+hydratedEffect(react));
    else source=source.replace('function c(){return','function c(){'+hydratedEffect(react)+'return');
  }
  if(file==='01pb0x0z72e41.js'){
    source=source.replace(/className:"v21-action-note",children:"[^"]*"/,'className:"v21-action-note",children:"Не знаєте, що обрати? Пройдіть короткий підбір — сайт сам запропонує техніку й засоби під вашу задачу."');
    source=source.replace('className:"v21-secondary",href:"#choose"','className:"v21-secondary",href:"/pidbir/"');
    source=source.replaceAll('Глибоке очищення текстилю тканини','Глибоке очищення тканини');
    source=source.replaceAll('"ABIR WD8"','"Робот для вікон · ABIR WD8"');
    {
      const gift=read('index.html').match(/<a class="vx-home-reset-gift"[^>]*>[\s\S]*?<\/a>/)?.[0];
      if(!gift)throw new Error('Home Reset gift link not found');
      const giftExpression=`e.featured?${jsx(parseMarkup(gift),'s')}:null,`;
      source=source.replaceAll(giftExpression,'');
      const card='(0,s.jsx)("p",{children:e.description}),(0,s.jsx)("strong",{children:e.price})';
      if(!source.includes(card))throw new Error('Home Reset client card not found');
      source=source.replace(card,`(0,s.jsx)("p",{children:e.description}),${giftExpression}(0,s.jsx)("strong",{children:e.price})`);
    }
  }
  if(file==='146ntlcv_t6~w-v4041.js'){
    // The exported package prices use Intl.NumberFormat's nonbreaking spaces.
    source=source.replace(/price:"([^"]*)"/g,(_,price)=>`price:"${price.replace(/(\d) (?=\d{3}\b)/g,'$1\u00a0')}"`);
    source=source.replace('Отримання та бонуси','Отримання й засоби');
    source=source.replace('Оберіть, як отримати техніку. Нижче одразу покажемо доступні подарунки та додаткові засоби.','Самовивіз без доплати або доставка по Полтаві.');
    source=source.replace('Передоплата 200 грн вноситься тільки після підтвердження заявки,','Передплата 200 грн вноситься тільки після підтвердження заявки,');
    const consent=read('bronuvannia/index.html').match(/<label class="booking-consent">([\s\S]*?)<\/label>/)?.[1];
    const consentSpan=parseMarkup(`<label>${consent}</label>`).children.find(node=>node.tag==='span');
    const consentStart=source.search(/\(0,t\.jsxs\)\("span",\{(?:children|"children"):\["Погоджуюсь/);
    if(consentStart<0)throw new Error('Client booking consent not found');
    const consentCall=source.indexOf(')("span",',consentStart)+1;
    source=source.slice(0,consentStart)+jsx(consentSpan,'t')+source.slice(expressionEnd(source,consentCall));
  }
  write(rel,source);
}

const excluded=new Set(['.git','.venv','.pw-browsers','node_modules','dist','supabase','scripts','admin']);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  if(excluded.has(entry.name)||entry.name.endsWith('-results')||entry.name.startsWith('tmp-'))return[];
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?files(full):[full];
});}
for(const file of files(root).filter(file=>file.endsWith('.html'))){
  let html=fs.readFileSync(file,'utf8');
  const ownsHydration=html.includes('self.__next_f')&&['01pb0x0z72e41.js','146ntlcv_t6~w-v4041.js','0x2bx8kerxrmz.js'].some(chunk=>html.includes(chunk));
  if(!ownsHydration){
    // Standalone quiz/landings may reuse Next CSS but have no React root.
    html=html.replace(/<script\b[^>]*src="\/assets\/public-hydration\.js[^"]*"[^>]*><\/script>/g,'').replace(/\s+type="application\/x-vacleaner-after-hydration"/g,'');
    fs.writeFileSync(file,html);
    continue;
  }
  html=html.replace(/class="v21-action-note">[^<]*/g,'class="v21-action-note">Не знаєте, що обрати? Пройдіть короткий підбір — сайт сам запропонує техніку й засоби під вашу задачу.');
  if(path.relative(root,file)==='bronuvannia/index.html'){
    html=html.replace(/<small>(Будні · [^<]*)<\/small>/g,(_,price)=>`<small>${price.replace(/(\d) (?=\d{3}\b)/g,'$1\u00a0')}</small>`);
    const extras=JSON.parse(read('config/vacleaner.json')).catalog.extras;
    const codes=new Map(Object.entries(extras).flatMap(([code,item])=>[item.label,...(item.aliases||[])].map(label=>[label,code])));
    html=html.replace(/<label([^>]*)>([\s\S]*?<\/label>)/g,(full,attrs,body)=>{
      const label=body.match(/<b>([^<]+)<\/b>/)?.[1];
      const code=codes.get(label);
      return code?`<label${attrs.replace(/\s+data-extra-code="[^"]*"/g,'')} data-extra-code="${code}">${body}`:full;
    });
    // The retained client form uses promo entry here; messenger preference is
    // supplied by public-booking-slots after hydration.
    html=html.replace(/<label>Telegram <small>необов’язково<\/small><input[^>]*><\/label>/,'<label class="booking-promo-field">Промокод <small>необов’язково</small><input type="text" autocomplete="off" placeholder="Наприклад RETURN10" value="" maxlength="32"/><small class="booking-promo-hint">Перевіримо автоматично за номером, датою й технікою.</small></label>');
    // Finance rows are owned by the post-hydration booking enhancement. The
    // initial export must first match the client form's empty quote state.
    html=html.replace(/<aside class="booking-summary">[\s\S]*?<\/aside>/,'<aside class="booking-summary"><div class="booking-summary-product"><span>Ваш вибір</span><strong>Ще не обрано</strong></div><div><span>Оренда</span><strong>—</strong></div><div class="booking-summary-extras"><span>Додатково</span><strong>—</strong></div><div><span>Отримання</span><strong>—</strong></div><div class="booking-summary-total"><span>Орієнтовно</span><strong>—</strong></div><p>Передплата 200 грн входить у цю суму. Вона вноситься лише після підтвердження заявки.</p><button class="button button-gold" disabled="" type="submit">Надіслати заявку<!-- --> <svg aria-hidden="true" class="icon-arrow" focusable="false" viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"></path></svg></button></aside>');
  }
  // These server-rendered sections were edited in HTML only. Synchronize their
  // Flight payloads too, including payloads fetched on client navigation.
  const names={
    'rishennia/index.html':['choice-strip'],
    'komplekty/index.html':['inner-section package-page-grid'],
    'yak-tse-pratsiuie/index.html':['process-manifesto'],
    'rishennia/textile/index.html':['feature-list','content-related-section'],
    'rishennia/steam/index.html':['feature-list','content-related-section'],
    'rishennia/windows/index.html':['feature-list','content-related-section'],
    'rishennia/mattress/index.html':['content-related-section'],
  }[path.relative(root,file)];
  if(names){
    const tree=parseMarkup(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<![^>]*>/g,''));
    const replacements=new Map(names.map(name=>[name,findClass(tree,name)]));
    for(const [name,node] of replacements)if(!node)throw new Error(`Canonical ${name} not found in ${file}`);
    const flightPattern=/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
    const flight=[...html.matchAll(flightPattern)].map(match=>JSON.parse(match[1])).join('');
    const ctaId=flight.match(/^([\da-f]+):I\[[^\n]*,"BookingCta"\]/m)?.[1];
    html=html.replace(flightPattern,(_,encoded)=>`self.__next_f.push([1,${JSON.stringify(syncFlight(JSON.parse(encoded),replacements,ctaId))}])`);
    for(const entry of fs.readdirSync(path.dirname(file)).filter(name=>name.endsWith('.txt'))){
      const txt=path.join(path.dirname(file),entry);
      fs.writeFileSync(txt,syncFlight(fs.readFileSync(txt,'utf8'),replacements));
    }
  }
  html=html.replace(/<script\b([^>]*\bsrc="\/assets\/(?!public-hydration\.js)[^"]+"[^>]*)><\/script>/g,(_,attrs)=>`<script${attrs.replace(/\s+type="application\/x-vacleaner-after-hydration"/g,'')} type="application/x-vacleaner-after-hydration"></script>`);
  if(!html.includes('/assets/public-hydration.js'))html=html.replace('</head>','<script defer src="/assets/public-hydration.js"></script></head>');
  fs.writeFileSync(file,html);
}
console.log('Synchronized public footer and deferred DOM enhancements until React hydration.');
