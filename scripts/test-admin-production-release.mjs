import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {verifyProductionRelease} from './verify-admin-production-release.mjs';

const receipt=JSON.parse(fs.readFileSync('config/admin-production-release.json','utf8'));
const release=JSON.parse(fs.readFileSync('release.json','utf8'));
const candidate=path.resolve('release-candidate-test-results/dist');
const temporary=path.resolve('production-promotion-test-results');
const checks=[];
function check(name,action){action();checks.push(name);console.log('PASS '+name)}
fs.rmSync(temporary,{recursive:true,force:true});
fs.mkdirSync(temporary,{recursive:true});
try{
  check('the built production artifact matches the exact reviewed tree',()=>assert.equal(verifyProductionRelease(candidate,receipt,release).artifactTreeSha256,receipt.artifactTreeSha256));
  check('an unreviewed release version is rejected',()=>assert.throws(()=>verifyProductionRelease(candidate,receipt,{...release,build:release.build+1}),/reviewed again/));
  check('the canonical shell cannot silently replace the promoted artifact',()=>assert.throws(()=>verifyProductionRelease(path.resolve('dist'),receipt,release),/differs from the reviewed/));
  const modified=path.join(temporary,'modified');
  fs.cpSync(candidate,modified,{recursive:true});
  const asset=path.join(modified,'assets/admin-operations-ui.js'),original=fs.readFileSync(asset);
  fs.appendFileSync(asset,'\n/* unexpected change */\n');
  check('a changed operational asset is rejected',()=>assert.throws(()=>verifyProductionRelease(modified,receipt,release),/differs from the reviewed/));
  fs.writeFileSync(asset,original);
  fs.writeFileSync(path.join(modified,'unexpected.json'),'{}');
  check('an additional deployed file is rejected',()=>assert.throws(()=>verifyProductionRelease(modified,receipt,release),/differs from the reviewed/));
  fs.rmSync(path.join(modified,'unexpected.json'));
  fs.symlinkSync('release.json',path.join(modified,'release-link.json'));
  check('a symbolic link is rejected before hashing',()=>assert.throws(()=>verifyProductionRelease(modified,receipt,release),/symbolic links/));
  fs.rmSync(path.join(modified,'release-link.json'));
  fs.writeFileSync(path.join(modified,'release.json'),JSON.stringify({...release,build:release.build+1}));
  check('an artifact with mismatched release metadata is rejected',()=>assert.throws(()=>verifyProductionRelease(modified,receipt,release),/does not match/));
  console.log(JSON.stringify({passed:checks.length,failed:0}));
}finally{fs.rmSync(temporary,{recursive:true,force:true})}
