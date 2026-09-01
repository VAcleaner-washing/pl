import fs from 'node:fs';

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

ok('validate uploads one named Pages artifact',workflow.includes('uses: actions/upload-pages-artifact@v3')&&workflow.includes('name: github-pages'));
ok('browser downloads the validated Pages artifact',workflow.includes('uses: actions/download-artifact@v4')&&workflow.includes('name: github-pages'));
ok('browser extracts artifact.tar into dist',workflow.includes('tar -xf .pages-artifact/artifact.tar -C dist'));
ok('browser depends on validate',/browser:[\s\S]*?needs: validate/.test(workflow));
ok('deploy remains blocked by validate and browser',workflow.includes('needs: [validate, browser]'));
ok('Python setup exists only in Browser job',(workflow.match(/actions\/setup-python/g)||[]).length===1);
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
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'} ${item.label}`);
console.log(JSON.stringify({passed:checks.length-failed.length,failed:failed.length}));
if(failed.length)process.exit(1);
