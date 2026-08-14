import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const sitemapPath=path.join(root,'sitemap.xml');
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
let sitemap=fs.readFileSync(sitemapPath,'utf8');
const urls=[...sitemap.matchAll(/<loc>(https:\/\/vacleaner\.pp\.ua\/[^<]*)<\/loc>/g)].map(match=>match[1]);

const attr=(html,name)=>{
  const first=html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"[^>]*>`,`i`));
  if(first)return first[1];
  return html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"[^>]*>`,`i`))?.[1]||'';
};
const setMeta=(html,key,value)=>{
  let next=html
    .replace(new RegExp(`(<meta[^>]+(?:name|property)="${key}"[^>]+content=")[^"]*("[^>]*>)`,`i`),`$1${value}$2`)
    .replace(new RegExp(`(<meta[^>]+content=")[^"]*("[^>]+(?:name|property)="${key}"[^>]*>)`,`i`),`$1${value}$2`);
  if(attr(next,key))return next;
  const attribute=key.startsWith('og:')?'property':'name';
  return next.replace('</head>',`<meta ${attribute}="${key}" content="${value}"></head>`);
};
const jsonStringValue=value=>JSON.stringify(String(value)).slice(1,-1);
const inlineRscStringValue=value=>JSON.stringify(jsonStringValue(value)).slice(1,-1);

const replaceRscObjectValue=(source,{attribute,key,property='content'},replacement)=>{
  const escapedMarker=`\\"${attribute}\\":\\"${key}\\",\\"${property}\\":\\"`;
  const plainMarker=`"${attribute}":"${key}","${property}":"`;
  const replaceAfterMarker=(value,marker,escaped)=>{
    let cursor=0;
    while(true){
      const markerAt=value.indexOf(marker,cursor);
      if(markerAt<0)break;
      const valueAt=markerAt+marker.length;
      const escapedEnd=value.indexOf('\\"}',valueAt);
      const plainEnd=value.indexOf('"}',valueAt);
      let end=-1,closeLength=0;
      if(escaped&&escapedEnd>=0&&(plainEnd<0||escapedEnd<plainEnd)){end=escapedEnd;closeLength=3;}
      else if(plainEnd>=0){end=plainEnd;closeLength=2;}
      else break;
      const encoded=escaped?inlineRscStringValue(replacement):jsonStringValue(replacement);
      const closing=escaped?'\\"}':'"}';
      value=value.slice(0,valueAt)+encoded+closing+value.slice(end+closeLength);
      cursor=valueAt+encoded.length+closing.length;
    }
    return value;
  };
  source=replaceAfterMarker(source,escapedMarker,true);
  source=replaceAfterMarker(source,plainMarker,false);
  return source;
};

const replaceRscTitleNode=(source,title)=>{
  const variants=[
    {marker:'[\\"$\\",\\"title\\",\\"0\\",{\\"children\\":\\"',closing:'\\"}]',escaped:true},
    {marker:'["$","title","0",{"children":"',closing:'"}]',escaped:false},
  ];
  for(const variant of variants){
    let cursor=0;
    while(true){
      const markerAt=source.indexOf(variant.marker,cursor);
      if(markerAt<0)break;
      const valueAt=markerAt+variant.marker.length;
      const validEnd=source.indexOf(variant.closing,valueAt);
      const brokenEnd=variant.escaped?source.indexOf('"}]',valueAt):-1;
      let end=validEnd,closeLength=variant.closing.length;
      if(variant.escaped&&brokenEnd>=0&&(validEnd<0||brokenEnd<validEnd)){end=brokenEnd;closeLength=3;}
      if(end<0)break;
      const encoded=variant.escaped?inlineRscStringValue(title):jsonStringValue(title);
      source=source.slice(0,valueAt)+encoded+variant.closing+source.slice(end+closeLength);
      cursor=valueAt+encoded.length+variant.closing.length;
    }
  }
  return source;
};

const replaceRscCanonical=(source,url)=>{
  const variants=[
    {marker:'\\"rel\\":\\"canonical\\",\\"href\\":\\"',closing:'\\"}',escaped:true},
    {marker:'"rel":"canonical","href":"',closing:'"}',escaped:false},
  ];
  for(const variant of variants){
    let cursor=0;
    while(true){
      const markerAt=source.indexOf(variant.marker,cursor);
      if(markerAt<0)break;
      const valueAt=markerAt+variant.marker.length;
      const validEnd=source.indexOf(variant.closing,valueAt);
      const brokenEnd=variant.escaped?source.indexOf('"}',valueAt):-1;
      let end=validEnd,closeLength=variant.closing.length;
      if(variant.escaped&&brokenEnd>=0&&(validEnd<0||brokenEnd<validEnd)){end=brokenEnd;closeLength=2;}
      if(end<0)break;
      const encoded=variant.escaped?inlineRscStringValue(url):jsonStringValue(url);
      source=source.slice(0,valueAt)+encoded+variant.closing+source.slice(end+closeLength);
      cursor=valueAt+encoded.length+variant.closing.length;
    }
  }
  return source;
};

const syncRscMetadata=(value,title,description,url)=>{
  let next=value;
  next=replaceRscTitleNode(next,title);
  next=replaceRscCanonical(next,url);
  for(const [attribute,key,replacement] of [
    ['property','og:title',title],
    ['property','og:description',description],
    ['property','og:url',url],
    ['name','twitter:title',title],
    ['name','twitter:description',description],
    ['name','description',description],
  ])next=replaceRscObjectValue(next,{attribute,key},replacement);
  return next;
};

for(const url of urls){
  const pathname=new URL(url).pathname;
  const rel=pathname==='/'?'index.html':`${pathname.replace(/^\//,'')}index.html`;
  const full=path.join(root,rel);
  if(!fs.existsSync(full))continue;
  let html=fs.readFileSync(full,'utf8');
  const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]||'';
  const description=attr(html,'description');
  html=setMeta(setMeta(setMeta(setMeta(html,'og:title',title),'og:description',description),'twitter:title',title),'twitter:description',description)
    .replace(/(<meta[^>]+property="og:url"[^>]+content=")[^"]*("[^>]*>)/i,`$1${url}$2`)
    .replace(/(<meta[^>]+content=")[^"]*("[^>]+property="og:url"[^>]*>)/i,`$1${url}$2`)
    .replace(/\/(favicon\.(?:ico|svg)|apple-touch-icon\.png)\?v=\d+/g,'/$1');
  html=syncRscMetadata(html,title,description,url);
  fs.writeFileSync(full,html);

  const dir=path.dirname(full);
  for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.txt'))){
    const file=path.join(dir,name);
    let value=fs.readFileSync(file,'utf8');
    value=syncRscMetadata(value,title,description,url)
      .replace(/\/(favicon\.(?:ico|svg)|apple-touch-icon\.png)\?v=\d+/g,'/$1');
    fs.writeFileSync(file,value);
  }
}

sitemap=sitemap.replace(/<lastmod>[^<]+<\/lastmod>/g,`<lastmod>${release.releasedAt}</lastmod>`);
fs.writeFileSync(sitemapPath,sitemap);
console.log(`Hardened public metadata for ${urls.length} sitemap routes.`);
