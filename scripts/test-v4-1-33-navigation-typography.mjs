import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const glass=fs.readFileSync('assets/admin-glass-test.css','utf8');
const must=(source,token,label)=>{if(!source.includes(token))throw new Error(`${label}: missing ${token}`)};
for(const [token,label] of [
  ["function navigationUrl(value)",'navigator URL helper'],
  ["https://www.google.com/maps/dir/?api=1&destination=",'Google Maps directions link'],
  ["routeLink(b.fulfillment_address)",'booking-card route link'],
  ["routeLink(b.fulfillment_address,'delivery-route-link detail-route-link')",'detail route link'],
  ["id=\"bookingDeliveryRoute\"",'edit-form route control'],
  ["syncDeliveryRoute",'live edit-form route sync'],
]) must(js,token,label);
if(js.includes('maps.apple.com'))throw new Error('Admin navigation must use Google Maps only');
for(const [token,label] of [
  ['.balance{font-size:16px;font-weight:500','calmer final settlement row'],
  ['.balance strong{font-weight:620}','settlement amount hierarchy'],
  ['.detail-hero h1{font-weight:620}','detail heading hierarchy'],
  ['.panel h2{font-weight:580}','detail panel hierarchy'],
  ['.modal-form>header h2{font-weight:620}','modal heading hierarchy'],
  ['.sms-campaign-modal .sms-client-name,.sms-history-list article>div:first-child b{font-weight:600}','campaign typography pass'],
  ['.delivery-route-link{display:inline-flex','clickable address style'],
  ['.delivery-route-inline{display:inline-flex','edit route style'],
]) must(css,token,label);
must(glass,'html.glass-test .glass-client-actions button{font-weight:560}','glass skin typography pass');
console.log('v4.1.33 navigation + typography regression checks passed');
