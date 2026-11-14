// Prepare a normal-path release artifact. This never publishes or contacts an API.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const options=process.argv.slice(2);
const option=(name,fallback)=>{const i=options.indexOf(name);return i<0?fallback:options[i+1]};
const source=path.resolve(option('--source',path.join(root,'dist')));
const output=path.resolve(option('--output',path.join(root,'release-candidate-test-results/dist')));
const candidateRoot=path.join(root,'release-candidate-test-results');
if(!output.startsWith(candidateRoot+path.sep)||output===source||source.startsWith(output+path.sep)||output.startsWith(source+path.sep))throw Error('Candidate output must be separate and remain inside release-candidate-test-results/');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const hashes=dir=>Object.fromEntries(files(dir).map(file=>[path.relative(dir,file).replaceAll('\\','/'),sha(fs.readFileSync(file))]));
function replaceOnce(value,before,after){if(value.split(before).length!==2)throw Error('Candidate integration point drift: '+before.slice(0,90));return value.replace(before,after)}
function sliceBetween(value,start,end){const at=value.indexOf(start),to=value.indexOf(end,at);if(at<0||to<0||value.indexOf(start,at+start.length)>=0||value.indexOf(end,to+end.length)>=0)throw Error('Candidate source markers drifted: '+start.slice(0,60));return value.slice(at,to)}

const release=JSON.parse(read('release.json'));
const sourceRelease=JSON.parse(fs.readFileSync(path.join(source,'release.json'),'utf8'));
if(release.version!==sourceRelease.version||release.build!==sourceRelease.build)throw Error('Canonical normal artifact is stale');
const htmlFile='admin/bronuvannia/index.html';
const html=fs.readFileSync(path.join(source,htmlFile),'utf8');
if(/\/r4\/|data-admin-(?:lab|ui)|admin-lab-|admin-staging-|VA_STAGE|VA_LAB/.test(html))throw Error('Input must be a fresh canonical normal shell, not a staged or already enriched artifact');
for(const rel of ['assets/admin-v250.js','assets/admin-v4319-prepayment-waiver.js']){
  if(!fs.readFileSync(path.join(source,rel)).equals(fs.readFileSync(path.join(root,rel))))throw Error('Canonical business asset is stale: '+rel);
}

const inputs=Object.fromEntries(['sandbox/ui.js','sandbox/ui.css','sandbox/forms.js','sandbox/forms.css','staging/ui/mobile.css'].map(rel=>[rel,read(rel)]));
const uiSource=inputs['sandbox/ui.js'];
const helpers=sliceBetween(uiSource,'const text=node=>','const banner=');
let presentation=sliceBetween(uiSource,"let compact=localStorage.getItem('vacleaner_lab_compact')", "document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)");
presentation=presentation.replaceAll('if(hosted){','{')
  .replaceAll('vacleaner_lab_compact','vacleaner_admin_compact_v1')
  .replaceAll('stageSecondary','operationsSecondary').replaceAll('stageMore','operationsMore')
  .replaceAll('stage-detail-layout','operations-detail-layout');
if(/\bhosted\b|\bbanner\b|\bpanel\b|VA_STAGE|VA_LAB|adminLab/.test(presentation))throw Error('Environment-specific presentation code leaked');
const ui=`/* Shared operational presentation; all business actions delegate to canonical handlers. */\n(()=>{'use strict';\nif(document.documentElement.dataset.adminUi!=='operations'||window.VACLEANER_OPERATIONS_UI_LOADED)return;\nwindow.VACLEANER_OPERATIONS_UI_LOADED=true;\nconst layoutMedia=matchMedia('(max-width:900px)');\n${helpers}${presentation}schedule();\n})();\n`;

let forms=replaceOnce(inputs['sandbox/forms.js'],"if(!['synthetic','staging'].includes(document.documentElement.dataset.adminLab))return;","if(document.documentElement.dataset.adminUi!=='operations')return;");
const faultStart=forms.indexOf('  const hasFault=Boolean(window.VA_LAB?.faults.read||window.VA_LAB?.faults.write);');
const faultEnd=forms.indexOf("\n }\n document.querySelectorAll('#layer summary')",faultStart);
if(faultStart<0||faultEnd<0)throw Error('Form-policy fault-tool boundary drifted');
forms=forms.slice(0,faultStart)+forms.slice(faultEnd);
forms=replaceOnce(forms,"document.addEventListener('vacleaner:lab-conditions',hydrate);",'')
  .replaceAll('#adminMount,.mobile-nav,.lab-banner,.lab-tools','#adminMount,.mobile-nav')
  .replaceAll('/* LAB interaction policy.','/* Shared form interaction policy.');
if(/VA_LAB|VA_STAGE|adminLab|lab-fault|labReadError|labWriteError|lab-conditions/.test(forms))throw Error('Test transport or fault tools leaked into form policy');
new vm.Script(ui,{filename:'admin-operations-ui.js'});
new vm.Script(forms,{filename:'admin-operations-forms.js'});

// Parse balanced rule blocks so removing a banner rule never removes adjacent
// rules from a compact @media line. Strings/comments are retained safely.
function cssRules(css,transform){
  const value=css.replace(/\/\*[\s\S]*?\*\//g,'');
  let result='',at=0;
  while(at<value.length){
    const open=value.indexOf('{',at);
    if(open<0){if(value.slice(at).trim())throw Error('Unexpected trailing CSS');break}
    const selector=value.slice(at,open).trim();let level=1,quote=null,escape=false,end=open+1;
    for(;end<value.length&&level;end++){
      const char=value[end];
      if(escape){escape=false;continue}
      if(quote){if(char==='\\')escape=true;else if(char===quote)quote=null;continue}
      if(char==='"'||char==="'"){quote=char;continue}
      if(char==='{')level++;else if(char==='}')level--;
    }
    if(level)throw Error('Unbalanced candidate CSS');
    const body=value.slice(open+1,end-1);
    if(selector.startsWith('@')){const inner=cssRules(body,transform);if(inner.trim())result+=`${selector}{\n${inner}}\n`}
    else {const transformed=transform(selector,body);if(transformed)result+=`${transformed[0]}{${transformed[1]}}\n`}
    at=end;
  }
  return result;
}
function genericRule(selector,body){
  if(/\.lab-(?:banner|tools|tool-actions|fault-recovery)\b/.test(selector))return null;
  if(/^html\[data-admin-lab\]\s+\.(?:topbar|sidebar)$/.test(selector))return null;
  if(/^html\[data-admin-lab\]\s+\.main$/.test(selector)&&/\btop:/.test(body))return null;
  selector=selector.replaceAll('html[data-admin-lab="staging"]','html[data-admin-ui="operations"]')
    .replaceAll('html[data-admin-lab]','html[data-admin-ui="operations"]')
    .replaceAll('stage-detail-layout','operations-detail-layout')
    .replaceAll('data-stage-secondary','data-operations-secondary').replaceAll('data-stage-more','data-operations-more');
  body=body.split(';').filter(declaration=>!/^\s*--lab-bar\s*:/.test(declaration)).join(';')
    .replaceAll('var(--lab-bar)','0px').replaceAll('--lab-','--admin-ui-');
  return [selector,body];
}
let css=['sandbox/ui.css','sandbox/forms.css','staging/ui/mobile.css'].map(rel=>cssRules(inputs[rel],genericRule)).join('\n');
css+=`\n/* Normal chrome owns the safe area; no test banner or reserved banner gap. */
@media(max-width:900px){
html[data-admin-ui="operations"] .operations-detail-layout>.detail-top{padding-top:calc(10px + var(--pwa-safe-top,0px))!important}
html[data-admin-ui="operations"] #bookingForm>header{padding-top:calc(14px + var(--pwa-safe-top,0px))!important}
html[data-admin-ui="operations"] #bookingForm>header .close{top:calc(14px + var(--pwa-safe-top,0px))!important}
}\n`;
if(/data-admin-lab|\.lab-banner|\.lab-tools|--lab-bar|--admin-ui-bar|\/r4\//.test(css))throw Error('Banner/environment spacing leaked into normal styles');

fs.rmSync(output,{recursive:true,force:true});fs.cpSync(source,output,{recursive:true});
const assets={
  'assets/admin-operations-ui.js':ui,
  'assets/admin-operations-forms.js':forms,
  'assets/admin-operations.css':css,
};
for(const [rel,content] of Object.entries(assets))fs.writeFileSync(path.join(output,rel),content);
let candidate=replaceOnce(html,'<html','<html data-admin-ui="operations"');
candidate=replaceOnce(candidate,'</head>',`<link rel="stylesheet" href="/assets/admin-operations.css?v=${release.build}"/></head>`);
candidate=replaceOnce(candidate,'</body>',`<script defer src="/assets/admin-operations-ui.js?v=${release.build}"></script><script defer src="/assets/admin-operations-forms.js?v=${release.build}"></script></body>`);
fs.writeFileSync(path.join(output,htmlFile),candidate);
fs.writeFileSync(path.join(output,'admin/bronuvannia.html'),candidate);
const worker=path.join(output,'admin/sw.js');
let sw=fs.readFileSync(worker,'utf8');
const core=Object.keys(assets).map(rel=>`'/${rel}?v=${release.build}'`).join(',');
sw=replaceOnce(sw,'const CORE=[',`const CORE=[${core},`);
fs.writeFileSync(worker,sw);

const before=hashes(source),after=hashes(output);
const changed=Object.keys(before).filter(rel=>before[rel]!==after[rel]);
const expected=['admin/bronuvannia/index.html','admin/bronuvannia.html','admin/sw.js'];
if(changed.length!==expected.length||changed.some(rel=>!expected.includes(rel)))throw Error('Unrelated canonical files changed');
if(Object.keys(before).some(rel=>!(rel in after)))throw Error('Canonical functionality was removed');
const manifest={mode:'normal-path-release-candidate',release,source,output,
  network:'No network requests or publication performed by this builder',
  businessAssetsUnchanged:true,storageAuthAndWorkerIdentity:'canonical; no staging override',
  changedCanonicalFiles:changed,addedAssets:Object.keys(assets),unchangedCanonicalFiles:Object.keys(before).length-changed.length,
  inputHashes:Object.fromEntries(Object.entries(inputs).map(([rel,content])=>[rel,sha(content)])),hashes:after};
fs.mkdirSync(candidateRoot,{recursive:true});
fs.writeFileSync(path.join(candidateRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({mode:manifest.mode,version:release.version,build:release.build,output,
  changedCanonicalFiles:changed,addedAssets:manifest.addedAssets,unchangedCanonicalFiles:manifest.unchangedCanonicalFiles}));
