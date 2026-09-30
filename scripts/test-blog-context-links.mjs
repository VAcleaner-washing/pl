import fs from 'node:fs';
import assert from 'node:assert/strict';

const expected={
  'shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom':['/rishennia/steam/','/tekhnika/karcher-sc-2-deluxe/'],
  'skilky-sokhne-dyvan-pislia-chyshchennia':['/rishennia/textile/','/tekhnika/karcher-puzzi-8-1/'],
  'yak-pochystyty-dyvan-vdoma':['/rishennia/textile/','/tekhnika/karcher-puzzi-8-1/'],
  'yak-pochystyty-matrats-pislia-dytyny':['/rishennia/mattress/','/tekhnika/karcher-puzzi-8-1/'],
  'yak-pochystyty-matrats-vdoma':['/rishennia/mattress/','/tekhnika/karcher-puzzi-8-1/'],
  'yak-pomyty-vikna-robotom':['/rishennia/windows/','/tekhnika/robot-dlia-vikon-abir/'],
  'yak-prybraty-zapakh-z-dyvana':['/rishennia/textile/','/tekhnika/karcher-puzzi-8-1/'],
  'yak-vyvesty-plyamu-z-dyvana':['/rishennia/textile/','/tekhnika/karcher-puzzi-8-1/'],
};

for(const [slug,hrefs] of Object.entries(expected)){
  const html=fs.readFileSync(`blog/${slug}/index.html`,'utf8');
  const start=html.indexOf('<article');
  const end=html.indexOf('</article>',start);
  assert.ok(start>=0&&end>start,`${slug}: article missing`);
  const article=html.slice(start,end);
  const contextPos=article.indexOf('class="content-context-links"');
  const bottomPos=article.indexOf('class="seo-route-links');
  assert.ok(contextPos>=0,`${slug}: contextual route strip missing`);
  assert.ok(bottomPos<0||contextPos<bottomPos,`${slug}: contextual links must appear before the end-of-article route block`);
  for(const href of hrefs) assert.ok(article.includes(`href="${href}"`),`${slug}: missing route ${href}`);
  assert.ok(article.includes('class="content-inline-link"'),`${slug}: equipment mention is not linked inline`);
}
const css=fs.readFileSync('assets/seo-v4147.css','utf8');
assert.ok(css.includes('.content-context-links{')&&css.includes('.v4-article .content-inline-link{'),'contextual advice links need deliberate styling');
console.log(`Blog contextual internal links: ${Object.keys(expected).length}/${Object.keys(expected).length} articles PASS`);
