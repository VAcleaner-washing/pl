// Verify the exact reviewed normal-path artifact, without contacting a service.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function verifyProductionRelease(artifactRoot,receipt,sourceRelease){
  if(receipt.artifactTreeFormat!=='sorted-relative-path-nul-file-bytes-nul')throw Error('Unknown production artifact hash format');
  if(!/^[a-f0-9]{64}$/.test(receipt.artifactTreeSha256)||!Number.isInteger(receipt.artifactFiles)||receipt.artifactFiles<200)throw Error('Invalid reviewed production artifact receipt');
  if(receipt.version!==sourceRelease.version||String(receipt.build)!==String(sourceRelease.build))throw Error('Production release receipt must be reviewed again for this release');
  const files=[];
  function walk(directory){
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const absolute=path.join(directory,entry.name);
      if(entry.isSymbolicLink())throw Error('Production artifact cannot contain symbolic links');
      if(entry.isDirectory())walk(absolute);
      else if(entry.isFile())files.push(path.relative(artifactRoot,absolute).replaceAll('\\','/'));
      else throw Error('Production artifact cannot contain special files');
    }
  }
  walk(artifactRoot);
  const artifactRelease=JSON.parse(fs.readFileSync(path.join(artifactRoot,'release.json'),'utf8'));
  if(artifactRelease.version!==receipt.version||String(artifactRelease.build)!==String(receipt.build))throw Error('Production artifact release does not match its reviewed receipt');
  const hash=crypto.createHash('sha256');
  for(const relative of files.sort())hash.update(relative).update('\0').update(fs.readFileSync(path.join(artifactRoot,relative))).update('\0');
  const artifactTreeSha256=hash.digest('hex');
  if(files.length!==receipt.artifactFiles||artifactTreeSha256!==receipt.artifactTreeSha256)throw Error(`Production artifact differs from the reviewed release: ${files.length} files, sha256 ${artifactTreeSha256}`);
  return {version:receipt.version,build:receipt.build,files:files.length,artifactTreeSha256};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const arg=process.argv.find(value=>value.startsWith('--root='));
  const artifactRoot=path.resolve(arg?arg.slice('--root='.length):path.join(sourceRoot,'release-candidate-test-results/dist'));
  const general=spawnSync(process.execPath,[path.join(sourceRoot,'scripts/verify-pages-artifact.mjs'),`--root=${artifactRoot}`],{cwd:sourceRoot,stdio:'inherit'});
  if(general.status!==0)process.exit(general.status??1);
  const receipt=JSON.parse(fs.readFileSync(path.join(sourceRoot,'config/admin-production-release.json'),'utf8'));
  const release=JSON.parse(fs.readFileSync(path.join(sourceRoot,'release.json'),'utf8'));
  console.log(JSON.stringify({mode:'reviewed-normal-production-artifact',...verifyProductionRelease(artifactRoot,receipt,release)}));
}
