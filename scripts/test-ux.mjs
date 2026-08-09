import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const publicJs=fs.readFileSync('assets/public-experience.js','utf8');
const publicCss=fs.readFileSync('assets/public-experience.css','utf8');
const publicFixes=fs.readFileSync('assets/public-fixes.css','utf8');
const selectPositions=[...js.matchAll(/<select\b/g)].map(match=>match.index);
const checkboxPositions=[...js.matchAll(/<input[^>]+type="checkbox"/g)].map(match=>match.index);
const allSelectsCovered=selectPositions.length===13&&selectPositions.every(index=>{const prefix=js.slice(Math.max(0,index-220),index);const tail=js.slice(index,index+90);return prefix.includes('class="field"')||prefix.includes('clients-toolbar')||prefix.includes('campaign-product-field')||tail.includes('id="clientSegment"')||tail.includes('id="clientSort"')||tail.includes('id="analyticsMonth"')||tail.includes('id="analyticsYear"')});
const allCheckboxesCovered=checkboxPositions.length===13&&checkboxPositions.every(index=>{const prefix=js.slice(Math.max(0,index-180),index);return prefix.includes('class="switch')||prefix.includes('class="extra-check')});
const checks=[
 ['operations dashboard',js.includes('operationsBar()')&&css.includes('.operations-bar')],
 ['urgent schedule labels',js.includes('scheduleMeta(b)')&&css.includes('.schedule-badge.danger')],
 ['search clear and shortcut',js.includes('id=\"clearSearch\"')&&js.includes("e.key==='/'")],
 ['offline state keeps session',js.includes('renderLoadError(e)')&&!js.includes("catch(e){clearSession();auth()}" )],
 ['retry state',js.includes('id=\"retryLoad\"')&&css.includes('.load-state')],
 ['loading skeleton',js.includes('renderLoading()')&&css.includes('@keyframes vac-skeleton')],
 ['action hierarchy',js.includes('primary-action')&&css.includes('.booking-actions .primary-action')],
 ['upcoming filters',js.includes('data-upcoming-scope')&&css.includes('.upcoming-scope')],
 ['premium native selects',css.includes('color-scheme:dark')&&css.includes('appearance:none')&&css.includes('.field select option')],
 ['unified checkbox visual',css.includes('input[type="checkbox"]:checked')&&css.includes('.switch:has(input:checked)')],
 ['all admin selects covered',allSelectsCovered],
 ['all admin checkboxes covered',allCheckboxesCovered],
 ['mobile booking uses real stepper',publicJs.includes('enhanceMobileBookingFlow()')&&publicJs.includes("mobileBookingStepIds=['booking-products','booking-dates','booking-extras','booking-contact']")&&publicCss.includes('.booking-form.vx-mobile-stepper .booking-step.is-vx-active')],
 ['booking has one mobile CTA layer',publicCss.includes('main:has(.booking-form) .mobile-booking{display:none}')&&publicCss.includes('.booking-mobile-summary{z-index:60!important')],
 ['public mobile CTA is a global non-overlapping grid',publicCss.includes('grid-template-columns:minmax(0,1.75fr) minmax(0,1fr)')&&publicCss.includes('.mobile-booking a:last-child{border-left:1px solid rgba(255,255,255,.12)}')&&!publicFixes.includes('  .mobile-booking{')],
 ['mobile header stays one row',publicCss.includes('grid-template-columns:minmax(0,1fr) 44px!important')&&publicCss.includes('.header-cta{display:none!important}')],
 ['mobile heroes are compact',publicCss.includes('.v21-hero-copy{min-height:520px!important')&&publicCss.includes('.inner-hero{min-height:auto!important')&&publicCss.includes('.booking-hero{padding:104px 18px 38px!important')],
 ['public mobile tap targets',publicCss.includes('.editorial-footer a,.package-link,.contact-card a,.faq-list-large summary,.v21-choice-help>a{min-height:44px')&&publicCss.includes('.booking-consent input{width:22px!important;height:22px!important')],
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error(failed.map(([name])=>name).join('\n'));process.exit(1)}
console.log(`UX tests passed: ${checks.length} scenarios.`);
