import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const mode=(process.argv[2]||'full').replace(/^--mode=/,'');
const startedAt=new Date().toISOString();
const results=[];

const staticSuites=[
  'check','test:copy-integrity','test:package-language','test:delivery-settings','test:public-seo','test:growth-content','check:backend','test:deposit-policy','test:stabilization','test:css-architecture','test:public-visual-contract','test:retention','test:booking-cta','test:process-metadata','test:peer-admin-push','test:issue-workflow','test:financial-control','test:operational-health','test:analytics','test:smart-guide-logic','test:booking-date-default','test:pwa-static','test:sms-campaigns','test:auth-refresh','test:booking-extras','test:density',
  'test:v4.1.28-regressions','test:v4.1.29-promo-issuance','test:v4.1.30-return-activation','test:v4.1.31-admin-booking-meta','test:v4.1.32-return-detach-ux','test:v4.1.33-navigation-typography','test:v4.1.34-address-assist','test:v4.1.35-suburb-address','test:v4.1.36-delivery-entrance','test:v4.1.37-booking-address-overflow','test:v4.1.39-admin-visual-polish','test:v4.1.41-fulfillment-ux','test:v4.1.44-booking-hardening','test:v4.1.45-trust-rules','test:v4.1.46-funnel-analytics','test:v4.1.47-seo-local','test:v4.1.47-area-patch','test:v4.1.47.2-delivery-distance','test:v4.1.48-content-local-demand','test:v4.1.49-performance-ci','test:v4.1.50-full-qa','test:v4.1.51-quiz-positioning','test:v4.1.52-manual-address-fallback','test:v4.1.53-address-provider-repair','test:v4.1.54-local-zone-correction','test:v4.1.55-clear-advice','test:v4.1.56-price-delivery-copy','test:v4.1.57-analytics-truth','test:v4.1.58-delivery-zones','test:v4.1.61-mobile-density','test:v4.1.62-puzzi-density','test:v4.1.63-stability-readability',
  'test:v4.2.0-admin-function-freeze','test:v4.2.0-public-architecture','test:v4.2.1-referral','test:v4.2.2-hardening','test:v4.2.5-baseline-compatibility','test:v4.2.7-backend-route-cleanup','test:v4.2.8-recovery','test:v4.2.9-referral-analytics','test:v4.2.10-referral-phone','test:v4.2.11-cache-bust','test:v4.2.12-referral-ux','test:v4.2.13-admin-typography','test:v4.2.14-admin-ops-ux','test:v4.2.15-browser-contracts','test:v4.2.16-finance-truth','test:v4.2.22-admin-truth-ux','test:v4.2.23-system-spec-pwa-guard','test:v4.2.24-finance-delivery-return','test:v4.2.25-admin-qa-repair','test:v4.2.26-booking-grid','test:v4.2.27-address-separation','test:v4.2.28-referral-modal','test:v4.2.29-admin-context-data','test:v4.2.30-function-hardening','test:v4.2.31-delivery-road-truth','test:v4.2.32-admin-typography','test:v4.2.33-client-geometry','test:v4.2.34-pwa-referral-slots','test:v4.2.35-finance-pwa','test:v4.2.36-address-finance-referral','test:v4.2.37-admin-ux-polish','test:v4.2.38-ci-context-stability','test:v4.2.39-admin-control-consistency','test:v4.2.40-booking-return-ux','test:v4.2.41-address-resilience','test:v4.2.42-promo-visibility','test:v4.2.43-critical-booking-fixes','test:v4.2.44-stabilization','test:v4.2.45-client-card-ux','test:v4.2.46-finance-extra-breakdown',
  'test:admin-labels','test:client-promo-regression','test:calendar-live','test:booking-gifts'
];

const browserSuites=[
  'test:v4.2.0-visual-parity','test:analytics-visual','test:growth-visual','test:v4.1.48-content-visual','test:e2e','test:public-booking','test:public-inner-heroes','test:smart-guide-fit','test:client-card-mobile','test:referral-admin-mobile','test:referral-modal-visual','test:referral-ios-launch','test:finance-delivery-visual','test:admin-typography-browser','test:admin-context-navigation','test:v4.2.37-route-smoke','test:admin-control-consistency','test:pwa-v424-focus','test:pwa','test:campaign-sms-ux','test:client-stats-browser','test:calendar-focused','test:keyboard-nav-focus','test:glass-primary','test:desktop-density','test:desktop-final','test:home-mobile-density','test:equipment-mobile-density','test:booking-gifts-visual','test:admin-return-gift-persistence','test:stabilization-acceptance-browser','test:client-card-v4245-visual'
];

function run(label, args){
  const t0=Date.now();
  process.stdout.write(`\n=== ${label} ===\n`);
  const r=spawnSync(args[0],args.slice(1),{stdio:'inherit',shell:process.platform==='win32'});
  const ok=r.status===0;
  results.push({name:label,status:ok?'success':'failure',exitCode:r.status??1,durationMs:Date.now()-t0});
  return ok;
}

function npm(script){ return run(script,['npm','run',script]); }

if(!['static','browser','full'].includes(mode)){
  console.error(`Unknown QA mode: ${mode}`); process.exit(2);
}

// Same build stamp and artifact basis locally and in GitHub Actions.
npm('stamp');
if(mode==='static'||mode==='full'){
  for(const s of staticSuites) npm(s);
  npm('build');
}
if(mode==='browser') npm('build');
if(mode==='browser'||mode==='full'){
  for(const s of browserSuites) npm(s);
}

const failed=results.filter(x=>x.status!=='success');
const summary={mode,startedAt,finishedAt:new Date().toISOString(),total:results.length,passed:results.length-failed.length,failed:failed.length,results};
fs.writeFileSync('qa-release-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('\n=== QA SUMMARY ===');
for(const r of results) console.log(`${r.status==='success'?'PASS':'FAIL'}  ${r.name}`);
console.log(`TOTAL ${summary.total} · PASS ${summary.passed} · FAIL ${summary.failed}`);
if(failed.length){
  console.error('FULL QA NOT GREEN');
  process.exit(1);
}
console.log('FULL QA GREEN');
