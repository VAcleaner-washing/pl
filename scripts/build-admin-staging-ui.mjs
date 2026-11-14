import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const config = JSON.parse(read('staging/hosted-r4-client.json'));
if (config.projectRef !== 'jdthhqxzfpvosfdxwfem' || config.origin !== `https://${config.projectRef}.supabase.co` ||
    !/^sb_publishable_[\w-]+$/.test(config.publicKey)) throw new Error('Exact R4 client target required');
const target = path.join(root, 'staging-ui-test-results/dist');
const source = path.join(root, 'dist');
if (!fs.existsSync(path.join(source, 'admin/bronuvannia/index.html'))) throw new Error('Build canonical Pages first');
const release = JSON.parse(read('release.json'));
const sourceRelease = JSON.parse(fs.readFileSync(path.join(source, 'release.json'), 'utf8'));
if (sourceRelease.version !== release.version || sourceRelease.build !== release.build) throw new Error('Canonical Pages artifact is stale');
fs.rmSync(target, {recursive: true, force: true});
fs.mkdirSync(target, {recursive: true});
for (const name of ['admin', 'assets', 'images', 'release.json']) {
  const from = path.join(source, name);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(target, name), {recursive: true});
}
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ?
  walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const replaceOne = (value, before, after) => {
  if (value.split(before).length !== 2) throw new Error(`Canonical integration point drift: ${before.slice(0, 80)}`);
  return value.replace(before, after);
};
const rewriteStorage = value => value.replace(/\b(?:window|globalThis)\.(localStorage|sessionStorage)\b/g,
  (_, name) => `window.VA_STAGE_STORAGE.${name === 'localStorage' ? 'local' : 'session'}`)
  .replace(/(?<![\w.])(localStorage|sessionStorage)\b/g,
    (_, name) => `window.VA_STAGE_STORAGE.${name === 'localStorage' ? 'local' : 'session'}`);
for (const file of walk(target)) if (/\.(?:js|html|css|json|webmanifest|svg)$/.test(file)) {
  let value = fs.readFileSync(file, 'utf8')
    .replace(/https:\/\/[a-z0-9]+\.supabase\.co/g, config.origin)
    .replace(/sb_publishable_[\w-]+/g, config.publicKey)
    .replaceAll('/admin/', '/r4/admin/').replaceAll('/assets/', '/r4/assets/').replaceAll('/images/', '/r4/images/');
  if (file.endsWith('.js')) value = rewriteStorage(value);
  if (file.endsWith('/assets/admin-v250.js')) {
    value = replaceOne(value, "await Promise.all(list.filter(r=>r.scope===location.origin+'/').map(r=>r.unregister()));", '/* R4 never unregisters another environment worker. */');
    value = replaceOne(value,
      "function adminLoginEmail(value){const login=String(value||'').trim().toLowerCase();if(login==='vacleaner'||login==='annanevidoma')return 'vahome.aroma@gmail.com';return login}",
      "function adminLoginEmail(value){const login=String(value||'').trim().toLowerCase();return({'manager-a':'manager-a@vacleaner-r4.invalid','manager-b':'manager-b@vacleaner-r4.invalid'})[login]||login}");
    value = replaceOne(value, 'name="login" value="vacleaner"', 'name="login" value="manager-a" autocomplete="username"');
    value = replaceOne(value, 'name="password" type="password" required', 'name="password" type="password" autocomplete="current-password" required');
    value = replaceOne(value, '<h1>Вхід в адмінку</h1><p>Бронювання, календар, клієнти й фінанси в одному місці.</p>',
      '<h1>Вхід у тестову R4</h1><p>Окремий тестовий пароль. Пароль робочої 46 тут не вводьте.</p>');
    value = replaceOne(value, "if(loginAlias==='vacleaner'||loginAlias==='annanevidoma')window.VA_STAGE_STORAGE.local.setItem(ADMIN_ALIAS_KEY,loginAlias);",
      "window.VA_STAGE_STORAGE.local.setItem(ADMIN_ALIAS_KEY,loginAlias==='manager-b'||loginAlias==='manager-b@vacleaner-r4.invalid'?'annanevidoma':'vacleaner');");
    value = replaceOne(value, "{name:'Anna',initial:'A'}:{name:'Vadim',initial:'V'}", "{name:'Тестовий менеджер B',initial:'B'}:{name:'Тестовий менеджер A',initial:'A'}");
  }
  fs.writeFileSync(file, value);
}
const asset = (name, value) => fs.writeFileSync(path.join(target, 'assets', name), value);
asset('admin-staging-bootstrap.js', `window.VA_STAGE_CONFIG=Object.freeze(${JSON.stringify(config)});\n${read('staging/ui/boundary.js')}`);
asset('admin-staging-mobile.css', read('staging/ui/mobile.css'));
for (const name of ['ui.js', 'ui.css', 'forms.js', 'forms.css']) {
  const value = read('sandbox/' + name);
  asset('admin-lab-' + name.replace('.', '.'), name.endsWith('.js') ? rewriteStorage(value) : value);
}
let html = fs.readFileSync(path.join(target, 'admin/bronuvannia/index.html'), 'utf8');
const csp = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${config.origin}; connect-src 'self' ${config.origin}; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'; worker-src 'self'; manifest-src 'self'`;
html = html.replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi, '')
  .replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`)
  .replace('<title>', '<title>R4 STAGING · ').replace(/,maximum-scale=1,user-scalable=no/g, '')
  .replace('href="/favicon.svg"', 'href="/r4/admin/icon-192.png"')
  .replace(/(<meta[^>]*name="apple-mobile-web-app-title"[^>]*content=")[^"]*/, '$1VA R4')
  .replace('</head>', `<link rel="stylesheet" href="/r4/assets/admin-lab-ui.css?v=${release.build}"><link rel="stylesheet" href="/r4/assets/admin-lab-forms.css?v=${release.build}"><link rel="stylesheet" href="/r4/assets/admin-staging-mobile.css?v=${release.build}"></head>`)
  .replace('<body>', `<body><script src="/r4/assets/admin-staging-bootstrap.js?v=${release.build}"></script>`)
  .replace('</body>', `<script defer src="/r4/assets/admin-lab-ui.js?v=${release.build}"></script><script defer src="/r4/assets/admin-lab-forms.js?v=${release.build}"></script></body>`);
for (const rel of ['admin/bronuvannia/index.html', 'admin/bronuvannia.html']) fs.writeFileSync(path.join(target, rel), html);
fs.writeFileSync(path.join(target, 'index.html'), '<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>VAcleaner R4</title><meta http-equiv="refresh" content="0;url=/r4/admin/bronuvannia/"><a href="/r4/admin/bronuvannia/">Відкрити тестову R4</a></html>');
const manifestFile = path.join(target, 'admin/manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
Object.assign(manifest, {id: '/r4/admin/staging/', name: 'VAcleaner R4 · тестова база', short_name: 'VA R4', description: 'Тільки тестові дані; окреме серверне збереження.'});
function stageIcon(size) {
  const pixels = Buffer.alloc(size * (size * 4 + 1));
  const glyphs = {V: ['10001','10001','10001','10001','01010','01010','00100'], A: ['01110','10001','10001','11111','10001','10001','10001'],
    R: ['11110','10001','10001','11110','10100','10010','10001'], 4: ['00010','00110','01010','10010','11111','00010','00010']};
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) pixels.set([19,29,40,255], y * (size * 4 + 1) + 1 + x * 4);
  for (const [label, top, unit, color] of [['VA', .18, .06, [243,205,117,255]], ['R4', .62, .045, [196,216,239,255]]]) {
    const scale = Math.max(1, Math.floor(size * unit)), left = Math.floor((size - (label.length * 6 - 1) * scale) / 2), start = Math.floor(size * top);
    [...label].forEach((letter, index) => glyphs[letter].forEach((row, y) => [...row].forEach((bit, x) => {
      if (bit === '1') for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const px = left + (index * 6 + x) * scale + sx, py = start + y * scale + sy;
        pixels.set(color, py * (size * 4 + 1) + 1 + px * 4);
      }
    })));
  }
  const crc = buffer => {let value = 0xffffffff; for (const byte of buffer) {value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);} return (value ^ 0xffffffff) >>> 0;};
  const chunk = (name, data) => {const type = Buffer.from(name), length = Buffer.alloc(4), checksum = Buffer.alloc(4); length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(Buffer.concat([type,data]))); return Buffer.concat([length,type,data,checksum]);};
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
manifest.icons = [192, 512].map(size => ({src: `/r4/admin/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any'}));
for (const size of [192, 512]) fs.writeFileSync(path.join(target, `admin/icon-${size}.png`), stageIcon(size));
fs.writeFileSync(path.join(target, 'admin/apple-touch-icon.png'), stageIcon(180));
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
const swFile = path.join(target, 'admin/sw.js');
let sw = fs.readFileSync(swFile, 'utf8').replaceAll('vacleaner-manager-', 'vacleaner-stage-r4-');
sw = replaceOne(sw, 'if(url.origin!==self.location.origin)return;', "if(url.origin!==self.location.origin||!url.pathname.startsWith('/r4/'))return;");
sw = replaceOne(sw, 'keys.filter(key=>key!==CACHE)', "keys.filter(key=>key.startsWith('vacleaner-stage-r4-')&&key!==CACHE)");
sw = replaceOne(sw, 'const CORE=[', `const CORE=['/r4/assets/admin-staging-mobile.css?v=${release.build}','/r4/assets/admin-staging-bootstrap.js?v=${release.build}','/r4/assets/admin-lab-ui.js?v=${release.build}','/r4/assets/admin-lab-ui.css?v=${release.build}','/r4/assets/admin-lab-forms.js?v=${release.build}','/r4/assets/admin-lab-forms.css?v=${release.build}',`);
// Notifications are unavailable in stage; a stage worker never handles push or focuses another environment.
sw = sw.slice(0, sw.indexOf("self.addEventListener('notificationclick'"));
fs.writeFileSync(swFile, sw);
fs.writeFileSync(path.join(target, '_headers'), `/r4/*\n  Content-Security-Policy: ${csp}\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Permissions-Policy: geolocation=(), camera=(), microphone=()\n/r4/admin/sw.js\n  Cache-Control: no-cache\n`);
const generated = {mode: 'isolated-hosted-staging', ...release, projectRef: config.projectRef, origin: config.origin};
fs.writeFileSync(path.join(target, 'staging-release.json'), JSON.stringify(generated, null, 2) + '\n');
const hashes = {};
for (const file of walk(target)) {
  const content = fs.readFileSync(file);
  if (/\.(?:js|html|css|json|webmanifest)$/.test(file) && /yweluzclearwrazdkahu|vahome\.aroma@gmail\.com|sb_secret_/.test(content.toString())) throw new Error('Forbidden production identity in staging artifact: ' + file);
  hashes[path.relative(target, file)] = crypto.createHash('sha256').update(content).digest('hex');
}
fs.writeFileSync(path.join(root, 'staging-ui-test-results/artifact.json'), JSON.stringify({target, generated, hashes}, null, 2) + '\n');
console.log(`Prepared isolated R4 UI ${release.version}/${release.build}: ${target} (must be mounted under /r4/)`);
