import fs from 'node:fs';
import assert from 'node:assert/strict';
import {BROWSER_IMAGE, browserRuntimePolicyErrors} from './ci-browser-runtime-policy.mjs';

const read=file=>fs.readFileSync(file,'utf8');
const workflow=read('.github/workflows/pages.yml');
const runner=read('scripts/qa-full.mjs');
const stamp=read('scripts/stamp-build.mjs');
const build=read('scripts/build-pages.mjs');
const e2e=read('scripts/e2e_smoke.py');
const pkg=JSON.parse(read('package.json'));
const suites=JSON.parse(read('config/qa-suites.json'));
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const pythonSources=fs.readdirSync('scripts').filter(name=>name.endsWith('.py')).map(name=>({name,text:read(`scripts/${name}`)}));
const checks=[];
const ok=(label,value)=>checks.push({label,ok:Boolean(value)});

// Ownership is scoped to this job: another job's valid consumer must not
// conceal a missing Browser invocation. Suite membership stays in the registry.
const authSuite='test:auth-recovery-browser';
function authOwnershipErrors(candidate, browserSuites){
  const errors=[];
  const job=candidate.match(/^  browser:\n([\s\S]*?)(?=^  [\w-]+:\n|$(?![\s\S]))/m)?.[1];
  if(!job)errors.push('missing Browser job');
  if(!Array.isArray(browserSuites))errors.push('missing browser registry');
  else{
    if(browserSuites.filter(name=>name===authSuite).length!==1)errors.push('auth must occur exactly once in registry');
    if(browserSuites[0]!==authSuite)errors.push('auth must be first browser suite');
  }
  if(job){
    if((job.match(/\bnpm\s+run\s+qa:browser\b/g)||[]).length!==1||
       !/^        run: npm run qa:browser\s*$/m.test(job))errors.push('one unconditional canonical browser consumer required');
    if(/\bnpm\s+run\s+test:auth-recovery-browser\b|\bpython\s+scripts\/admin_session_recovery_qa\.py\b/.test(job))errors.push('standalone auth invocation is forbidden');
    const consumer=job.split(/(?=^      - )/m).find(step=>step.includes('run: npm run qa:browser'));
    if(consumer&&/^\s+if:/m.test(consumer))errors.push('conditional canonical browser consumer is forbidden');
  }
  return errors;
}
ok('auth recovery has one early registry owner and one unconditional Browser consumer',authOwnershipErrors(workflow,suites.browser).length===0);

ok('canonical regression artifact remains separate from the production artifact',/name: github-pages\n\s+path: dist/.test(workflow)&&/name: production-pages\n\s+path: release-candidate-test-results\/dist/.test(workflow));
ok('browser downloads the validated Pages artifact',workflow.includes('uses: actions/download-artifact@v4')&&workflow.includes('name: github-pages'));
ok('browser extracts artifact.tar into dist',workflow.includes('tar -xf .pages-artifact/artifact.tar -C dist'));
ok('browser depends on validate',/browser:[\s\S]*?needs: \[classify, validate\]/.test(workflow));
ok('deploy requires static, canonical Chromium/WebKit and production operations gates',workflow.includes('needs: [validate, browser, webkit, operations]')&&workflow.includes("needs.operations.result == 'success'"));
ok('canonical browser uses its own pinned runtime and verifies both engines before QA',browserRuntimePolicyErrors(workflow,read('requirements-ci.txt')).length===0);
ok('WebKit retains its pinned official runtime',/webkit:[\s\S]*?container:[\s\S]*?mcr\.microsoft\.com\/playwright\/python:v1\.65\.1-noble@sha256:[a-f0-9]{64}/.test(workflow));
ok('official runtime client matches the immutable container pin',read('requirements-ci.txt').trim()==='playwright==1.65.1'&&workflow.includes('python:v1.65.1-noble@sha256:0ab41a37431309d72b7a26f40ef1fdb464a62740196b2143965a2f59dc090409'));
ok('WebKit tests the validated artifact without rebuilding',/webkit:[\s\S]*?needs: \[classify, validate, browser\][\s\S]*?npm run verify:artifact[\s\S]*?npm run test:webkit/.test(workflow));
ok('WebKit client is pinned to the matching official image and startup is verified',workflow.includes('python -m pip install --disable-pip-version-check -r requirements-ci.txt')&&workflow.includes('Pinned runtime Python:')&&workflow.includes('browser = p.webkit.launch(headless=True)'));
const operations=workflow.split('\n  operations:\n')[1]?.split('\n  deploy:\n')[0]||'';
const deploy=workflow.split('\n  deploy:\n')[1]||'';
ok('production build is verified against the reviewed receipt before upload',workflow.indexOf('npm run test:release-candidate')<workflow.indexOf('name: production-pages')&&workflow.indexOf('npm run verify:production-artifact')<workflow.indexOf('name: production-pages')&&workflow.includes('npm run test:production-promotion'));
ok('production acceptance covers both engines and both target widths',operations.includes('browser: [chromium, webkit]')&&operations.includes('width: [440, 1440]')&&operations.includes('fail-fast: false'));
const operationsSteps=operations.split(/(?=^      - )/m);
const stableBuildStep=step=>/^\s+working-directory: stable-reference-test-results\/source\s*$/m.test(step);
ok('production acceptance downloads the deployed archive and never rebuilds it',operations.includes('name: production-pages')&&operations.includes('tar -xf .pages-artifact/artifact.tar -C release-candidate-test-results/dist')&&operations.includes('npm run verify:production-artifact')&&!operationsSteps.some(step=>/npm run (?:build|stamp|test:release-candidate)|node scripts\/build/.test(step)&&!stableBuildStep(step)));
ok('the separate immutable46 reference uses its original stamp and build',operationsSteps.some(step=>stableBuildStep(step)&&step.includes('npm run stamp')&&step.includes('node scripts/build-pages.mjs')));
ok('production acceptance uses the pinned official runtime and isolated network harness',operations.includes('python:v1.65.1-noble@sha256:0ab41a37431309d72b7a26f40ef1fdb464a62740196b2143965a2f59dc090409')&&operations.includes('python scripts/admin_release_candidate_qa.py --browser ${{ matrix.browser }} --width ${{ matrix.width }}'));
ok('both production mobile engines also test actual forms, public hydration and startup', ['mobile_forms_qa.py','public_hydration_qa.py','admin_startup_qa.py'].every(file=>new RegExp('if: matrix\\.width == 440\\n\\s+run: python scripts/'+file.replaceAll('.','\\.')+' --browser \\$\\{\\{ matrix\\.browser \\}\\} --root release-candidate-test-results/dist').test(operations)));
ok('both production mobile engines test the real worker against immutable stable46',operations.includes('ref: 15bf61dc4da4cf63405a25887353e6ec7178dce8')&&operations.includes('python scripts/pwa_cache_qa.py --root release-candidate-test-results/dist --browser ${{ matrix.browser }} --width 440')&&operations.includes('--stable-root stable-reference-test-results/source/dist'));
ok('both production engines retain the current read freshness, feedback, focus and route UI gates',['admin_ui_feedback_qa.py','admin_detail_live_refresh_qa.py','admin_calendar_controls_qa.py','admin_settings_focus_stepper_qa.py','admin_route_refresh_qa.py'].every(file=>operations.includes(`python scripts/${file} --root release-candidate-test-results/dist --browser \${{ matrix.browser }}`)));
ok('production calendar checks include narrow and landscape card bounds',operations.includes('--widths 320,440,956'));
ok('shared Back navigation remains covered in both canonical engines and all production variants',operations.includes('python scripts/admin_back_navigation_qa.py --root release-candidate-test-results/dist --browser')&&suites.browser.includes('test:admin-back-navigation')&&pkg.scripts['test:webkit'].includes('scripts/admin_back_navigation_qa.py'));
ok('new actual-function regressions remain in canonical static QA',['test:calendar-business-clock','test:detail-live-refresh','test:ui-feedback','test:time-trigger-labels','test:route-refresh-pending'].every(name=>suites.static.includes(name)&&pkg.scripts[name]));
ok('production deploy selects only the reviewed artifact and stays main-push-only',deploy.includes('artifact_name: production-pages')&&deploy.includes("github.event_name == 'push'")&&deploy.includes("github.ref == 'refs/heads/main'"));
ok('legacy E2E bridge is replaced by real logistics controls',pkg.scripts['test:e2e'].includes('scripts/e2e_smoke.py')&&!pkg.scripts['test:e2e'].includes('v4312_e2e_runner')&&e2e.includes('data-logistics-kind'));
ok('browser mode never rebuilds dist',!runner.includes("if(mode==='browser') npm('build')")&&!/mode===['\"]browser['\"][^\n]*build/.test(runner));
ok('browser begins with deploy-artifact verification',runner.includes("npm('verify:artifact')"));
ok('QA suites are data-driven',runner.includes("config/qa-suites.json")&&Array.isArray(suites.static)&&Array.isArray(suites.browser));
ok('versioned regression scripts are absent from package scripts',!Object.keys(pkg.scripts).some(name=>name.startsWith('test:v')));
ok('current contracts and legacy archive have separate runners',pkg.scripts['test:current-contracts']&&pkg.scripts['qa:legacy']);
ok('generated QA artifacts are ignored',['dist/','node_modules/','qa-release-summary.json','*-test-results/'].every(token=>read('.gitignore').includes(token)));
ok('Pages build generically excludes QA output',build.includes("name.endsWith('-results')")&&build.includes("name.startsWith('tmp-')")&&build.includes("name!=='.nojekyll'"));
ok('pre-push hook runs canonical static QA',read('.githooks/pre-push').includes('npm run qa:static'));
ok('E2E add-on click has no pixel coordinate',!e2e.includes('extra_card.click(position=')&&e2e.includes('extra_card.click()'));
ok('browser QA has no unconditional system-Chromium path',!pythonSources.some(({text})=>text.split('\n').some(line=>line.includes('launch(')&&line.includes("executable_path='/usr/bin/chromium'")&&!line.includes("Path('/usr/bin/chromium').exists()"))));
ok('asset cache busting is generic',stamp.includes("\\/assets\\/[^\"'?#]+\\.(?:js|css)"));
ok('MFA rollback state is explicit',spec.includes('SEC-ADMIN-002')&&spec.includes('MFA зараз не примусово вимагається'));

const failed=checks.filter(item=>!item.ok);
// Negative configuration fixtures prevent another job's valid image from
// accidentally satisfying the canonical browser job's runtime policy.
const browserStart=workflow.indexOf('\n  browser:\n');
const browserEnd=workflow.indexOf('\n  webkit:\n',browserStart);
const mutateBrowser=transform=>workflow.slice(0,browserStart)+transform(workflow.slice(browserStart,browserEnd))+workflow.slice(browserEnd);
assert.deepEqual(authOwnershipErrors(workflow,suites.browser),[],'valid early registry ownership');
assert.deepEqual(authOwnershipErrors(workflow+'\n  unrelated:\n    run: npm run test:auth-recovery-browser\n',suites.browser),[],'ownership guard stays Browser-scoped');
for(const [label,candidate,registry,reason] of [
  ['missing auth',workflow,suites.browser.filter(name=>name!==authSuite),'auth must occur exactly once in registry'],
  ['duplicate auth',workflow,[...suites.browser,authSuite],'auth must occur exactly once in registry'],
  ['late auth',workflow,[...suites.browser.slice(1),authSuite],'auth must be first browser suite'],
  ['missing registry',workflow,undefined,'missing browser registry'],
  ['standalone npm auth',mutateBrowser(job=>job.replace('run: npm run qa:browser','run: npm run test:auth-recovery-browser\n      - run: npm run qa:browser')),suites.browser,'standalone auth invocation is forbidden'],
  ['standalone Python auth',mutateBrowser(job=>job.replace('run: npm run qa:browser','run: python scripts/admin_session_recovery_qa.py\n      - run: npm run qa:browser')),suites.browser,'standalone auth invocation is forbidden'],
  ['missing consumer despite another job',mutateBrowser(job=>job.replace('npm run qa:browser','true'))+'\n  unrelated:\n    run: npm run qa:browser\n',suites.browser,'one unconditional canonical browser consumer required'],
  ['duplicate consumer',mutateBrowser(job=>job.replace('run: npm run qa:browser','run: npm run qa:browser\n      - run: npm run qa:browser')),suites.browser,'one unconditional canonical browser consumer required'],
  ['conditional consumer',mutateBrowser(job=>job.replace('run: npm run qa:browser','if: false\n        run: npm run qa:browser')),suites.browser,'conditional canonical browser consumer is forbidden'],
  ['no-op consumer',mutateBrowser(job=>job.replace('run: npm run qa:browser','run: echo npm run qa:browser')),suites.browser,'one unconditional canonical browser consumer required'],
  ['missing Browser job',workflow.slice(0,browserStart)+workflow.slice(browserEnd),suites.browser,'missing Browser job'],
]) assert.ok(authOwnershipErrors(candidate,registry).includes(reason),`${label} must reject its specific ownership defect`);
console.log('PASS auth ownership accepts 2 valid and rejects 11 invalid configuration fixtures');
for(const [label,broken] of [
  ['floating runner',mutateBrowser(job=>job.replace('runs-on: ubuntu-24.04','runs-on: ubuntu-latest'))],
  ['mutable image tag',mutateBrowser(job=>job.replace(BROWSER_IMAGE,BROWSER_IMAGE.split('@')[0]))],
  ['wrong image digest',mutateBrowser(job=>job.replace(BROWSER_IMAGE,BROWSER_IMAGE.replace(/.$/,'0')))],
  ['missing browser image',mutateBrowser(job=>job.replace(`      image: ${BROWSER_IMAGE}\n`,''))],
  ['missing runtime check',mutateBrowser(job=>job.replace('python scripts/verify_ci_browser_runtime.py','true'))],
  ['late runtime check',mutateBrowser(job=>job.replace('python scripts/verify_ci_browser_runtime.py','__STARTUP__').replace('npm run qa:browser','python scripts/verify_ci_browser_runtime.py').replace('__STARTUP__','npm run qa:browser'))],
  ['runtime reinstall',mutateBrowser(job=>job.replace('python scripts/verify_ci_browser_runtime.py','python -m playwright install --with-deps chromium webkit\n          python scripts/verify_ci_browser_runtime.py'))],
]) assert.ok(browserRuntimePolicyErrors(broken,read('requirements-ci.txt')).length,`${label} must fail closed`);
assert.ok(browserRuntimePolicyErrors(workflow,'playwright==1.61.0').length,'mismatched client must fail closed');
console.log('PASS browser runtime policy rejects 8 invalid configuration fixtures');
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'} ${item.label}`);
console.log(JSON.stringify({passed:checks.length-failed.length,failed:failed.length}));
if(failed.length)process.exit(1);
