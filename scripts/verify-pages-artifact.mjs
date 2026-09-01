import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const arg=process.argv.find(value=>value.startsWith('--root='));
const artifactRoot=path.resolve(arg?arg.slice('--root='.length):'dist');
const sourceRoot=process.cwd();
const errors=[];

if(!fs.existsSync(artifactRoot)||!fs.statSync(artifactRoot).isDirectory()){
  console.error(`Pages artifact is missing: ${artifactRoot}`);
  process.exit(1);
}

const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const absolute=path.join(directory,entry.name);
  if(entry.isSymbolicLink()){
    errors.push(`symbolic link in Pages artifact: ${path.relative(artifactRoot,absolute)}`);
    return [];
  }
  return entry.isDirectory()?walk(absolute):[absolute];
});
const files=walk(artifactRoot).sort();
const sourceRelease=JSON.parse(fs.readFileSync(path.join(sourceRoot,'release.json'),'utf8'));
const artifactReleasePath=path.join(artifactRoot,'release.json');
if(!fs.existsSync(artifactReleasePath))errors.push('release.json is missing from Pages artifact');
else{
  const artifactRelease=JSON.parse(fs.readFileSync(artifactReleasePath,'utf8'));
  if(artifactRelease.version!==sourceRelease.version||String(artifactRelease.build)!==String(sourceRelease.build)){
    errors.push(`release mismatch: source ${sourceRelease.version}/${sourceRelease.build}, artifact ${artifactRelease.version}/${artifactRelease.build}`);
  }
}

for(const rel of ['package.json','requirements-ci.txt','scripts','config','supabase','docs','.github']){
  if(fs.existsSync(path.join(artifactRoot,rel)))errors.push(`development path leaked into Pages artifact: ${rel}`);
}
const leakedTop=fs.readdirSync(artifactRoot).filter(name=>
  name.startsWith('tmp-')||name.endsWith('-results')||name.endsWith('-test-results')||
  (name.startsWith('.')&&name!=='.nojekyll')||name==='qa-release-summary.json'
);
for(const rel of leakedTop)errors.push(`generated or development path leaked into Pages artifact: ${rel}`);

for(const file of files.filter(item=>item.endsWith('.html'))){
  const html=fs.readFileSync(file,'utf8');
  const rel=path.relative(artifactRoot,file).replaceAll('\\','/');
  for(const match of html.matchAll(/(?:src|href)=["'](\/(?:assets|admin|_next)\/[^"'?#]+)[^"']*["']/g)){
    const local=path.join(artifactRoot,match[1].replace(/^\//,''));
    if(!fs.existsSync(local))errors.push(`missing deployed reference ${match[1]} in ${rel}`);
  }
}

const hash=crypto.createHash('sha256');
for(const file of files){
  const rel=path.relative(artifactRoot,file).replaceAll('\\','/');
  hash.update(rel).update('\0').update(fs.readFileSync(file)).update('\0');
}

if(files.length<200)errors.push(`Pages artifact is unexpectedly small: ${files.length} files`);
if(errors.length){
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Verified deploy artifact: ${files.length} files · sha256 ${hash.digest('hex').slice(0,20)} · release ${sourceRelease.version}/${sourceRelease.build}`);
