import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MANIFEST_SHA='05c1095d9c513f07c9265ebe7fcce9cf13bbb6dc36664f33797e0126684ed3fd';
const COMMIT='15bf61dc4da4cf63405a25887353e6ec7178dce8';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

export function verifyRollbackRequest(request){
  const mode=request.mode||'verify_only';
  if(mode!=='verify_only'&&mode!=='restore_4346')throw Error('Unknown rollback mode');
  if(mode==='restore_4346'){
    // GitHub expression string equality ignores case; this independent guard
    // deliberately requires exact, case-sensitive request values.
    if(request.eventName!=='workflow_dispatch'||request.repository!=='VAcleaner-washing/pl'||
       request.ref!=='refs/heads/main'||request.confirmation!=='ROLLBACK-4346')throw Error('Exact main/manual rollback request and ROLLBACK-4346 confirmation required');
  }
  return {mode,restoreRequested:mode==='restore_4346'};
}

export function verifyStable4346(artifactRoot,manifestPath=path.join(sourceRoot,'docs/stable-4346-manifest.json')){
  const manifestBytes=fs.readFileSync(manifestPath);
  if(digest(manifestBytes)!==MANIFEST_SHA)throw Error('Immutable stable46 manifest bytes changed');
  const manifest=JSON.parse(manifestBytes);
  if(manifest.version!=='4.3.46'||manifest.build!==4346||manifest.commit!==COMMIT||
     manifest.archiveSha256!=='1d895a2bbde6c45054816d407ff12d58ca01a666de56f80715a2d681349b6d6e'||
     Object.keys(manifest.files).length!==270)throw Error('Invalid stable46 identity');
  const actual={};
  function walk(directory){
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const absolute=path.join(directory,entry.name);
      if(entry.isSymbolicLink())throw Error('Stable artifact cannot contain symbolic links');
      if(entry.isDirectory())walk(absolute);
      else if(entry.isFile())actual[path.relative(artifactRoot,absolute).replaceAll('\\','/')]=digest(fs.readFileSync(absolute));
      else throw Error('Stable artifact cannot contain special files');
    }
  }
  walk(artifactRoot);
  if(Object.keys(actual).length!==270)throw Error('Stable artifact must contain exactly270 files');
  for(const [relative,hash] of Object.entries(manifest.files))if(actual[relative]!==hash)throw Error('Stable file mismatch: '+relative);
  const release=JSON.parse(fs.readFileSync(path.join(artifactRoot,'release.json'),'utf8'));
  if(release.version!=='4.3.46'||release.build!==4346||fs.readFileSync(path.join(artifactRoot,'CNAME'),'utf8').trim()!=='vacleaner.pp.ua')throw Error('Stable release or domain identity mismatch');
  return {version:release.version,build:release.build,commit:COMMIT,files:270,allFileHashesMatch:true,manifestSha256:MANIFEST_SHA};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),at=args.indexOf('--root');
  if(args.includes('--check-request'))console.log(JSON.stringify(verifyRollbackRequest({eventName:process.env.GITHUB_EVENT_NAME,
    repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,mode:process.env.ROLLBACK_MODE,confirmation:process.env.ROLLBACK_CONFIRMATION})));
  if(at>=0){
    if(!args[at+1])throw Error('--root requires an artifact path');
    console.log(JSON.stringify({mode:'exact-stable4346-artifact',...verifyStable4346(path.resolve(args[at+1]))}));
  }else if(!args.includes('--check-request'))throw Error('Use --root ARTIFACT or --check-request');
}
