import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const build=String(release.build||4149);
function patch(file,fromAsset,toAsset){
  const full=path.join(root,file);let html=fs.readFileSync(full,'utf8');
  const from=new RegExp(`<script\\s+defer(?:="")?\\s+src="/assets/${fromAsset}\\.js\\?v=[^"]+"\\s*><\\/script>`,'g');
  const fromLoose=new RegExp(`<script[^>]+src="/assets/${fromAsset}\\.js\\?v=[^"]+"[^>]*><\\/script>`,'g');
  html=html.replace(from,'').replace(fromLoose,'');
  if(!html.includes(`/assets/${toAsset}.js`))html=html.replace('</body>',`<script defer fetchpriority="low" src="/assets/${toAsset}.js?v=${build}"></script></body>`);
  fs.writeFileSync(full,html);
}
patch('index.html','public-quiz','home-smart-guide-v4149');
patch('bronuvannia/index.html','public-quiz','booking-entry-v4149');
console.log('Applied v4.1.49 route-scoped Smart Guide / booking bootstrap.');
