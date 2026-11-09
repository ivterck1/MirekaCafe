const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { renderSeo, synchronize, loadConfig } = require('../tools/sync-seo.cjs');
const { synchronizeSite } = require('../tools/business-html.cjs');
const {readMenu, synchronizeMenu} = require('../tools/generate-menu-html.cjs');
const {serializeCatalog} = require('../tools/import-menu.cjs');
const config = loadConfig();
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const title = 'Mireka Café | Cafetería de autor y menú';
const description = config.seo.description;

test('sincronización idempotente y limitada al bloque SEO', () => {
  assert.equal(synchronize(html, config), html);
  const changed = JSON.parse(JSON.stringify(config)); changed.seo.title = 'Título editorial distinto';
  const next = synchronize(html, changed);
  assert.equal(next.slice(next.indexOf('<!-- SEO:END -->')), html.slice(html.indexOf('<!-- SEO:END -->')));
  assert.equal(next.slice(0, next.indexOf('<!-- SEO:START')), html.slice(0, html.indexOf('<!-- SEO:START')));
  assert.ok(next.includes('<title>Título editorial distinto</title>'));
  assert.equal(synchronize(next, changed), next);
  assert.throws(() => synchronize(html.replace('<!-- SEO:END -->', ''), config));
});

test('indexación comercial exige canonical HTTPS confirmada; demo no la emite', () => {
  const draft = JSON.parse(JSON.stringify(config));
  assert.ok(!renderSeo(draft).includes('canonical'));
  draft.seo.robots = 'index,follow';
  assert.throws(() => renderSeo(draft), /confirmar/);
  for (const url of ['/MirekaCafe/', 'http://example.test/', 'https://user:pass@example.test/', 'https://example.test/#menu']) {
    draft.seo.canonicalUrl = url; assert.throws(() => renderSeo(draft));
  }
  // Dominio reservado exclusivamente para esta prueba, nunca configuración real.
  draft.seo.canonicalUrl = 'https://example.test/cafe/';
  assert.ok(renderSeo(draft).includes('rel="canonical" href="https://example.test/cafe/"'));
  assert.ok(renderSeo(draft).includes('property="og:url" content="https://example.test/cafe/"'));
  draft.seo.robots = 'noindex,follow';
  assert.throws(() => renderSeo(draft), /vacío/);
});

test('los textos editoriales se escapan sin crear etiquetas adicionales', () => {
  const draft = JSON.parse(JSON.stringify(config)); draft.seo.title = 'Café & "autor" <prueba>';
  const output = renderSeo(draft);
  assert.ok(output.includes('Café &amp; &quot;autor&quot; &lt;prueba&gt;'));
  assert.ok(!output.includes('<prueba>'));
});

test('SEO conserva el inventario, el estado comercial autorizado y noindex', () => {
  const menu = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/menu-data.js'), 'utf8') + '\nmenuItems;');
  assert.equal(menu.length, 101);
  assert.equal(new Set(menu.map(p => p.categoria)).size, 18);
  assert.equal(new Set(menu.map(p => p.imagen)).size, 94);
  assert.equal(config.order.pricesApproved, true);
  assert.equal(config.whatsapp.enabled, true);
  assert.equal(config.seo.robots, 'noindex,follow');
  assert.ok(/^52\d{6}7015$/.test(config.whatsapp.number), 'destinatario mexicano autorizado');
  assert.deepEqual([...new Set(menu.map(p => p.precio))].sort((a,b) => a-b), Array.from({length:101}, (_, i) => i + 2));
  assert.equal(fs.existsSync(path.join(__dirname, '../robots.txt')), false);
});

test('variante B: ICO multirresolución y PNG de tamaños explícitos', () => {
  const brand = path.join(__dirname, '../assets/images/brand');
  const ico = fs.readFileSync(path.join(brand, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(0), 0); assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  assert.deepEqual(Array.from({ length: 3 }, (_, i) => [ico[6 + i * 16], ico[7 + i * 16]]), [[16, 16], [32, 32], [48, 48]]);
  for (const [file, size] of [['favicon-96.png', 96], ['apple-touch-icon.png', 180]]) {
    const png = fs.readFileSync(path.join(brand, file));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
  assert.ok(!html.includes('assets/images/brand/placeholder.svg'));
});

test('HTML inicial y DOM conservan SEO en raíz y subdirectorio, con y sin JS', async t => {
  const root = path.resolve(__dirname, '..');
  const fixture = JSON.parse(JSON.stringify(config));
  fixture.contact.hours = 'Horario de prueba';
  fixture.contact.phone = '+525500000001';
  const profiles = {instagram:'https://www.instagram.com/perfil_prueba/',
    facebook:'https://www.facebook.com/perfil_prueba', tiktok:'https://www.tiktok.com/@perfil_prueba'};
  Object.assign(fixture.contact, profiles);
  const fixtureHtml = synchronizeSite(html, fixture);
  const configSource = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8');
  const pricedMenu = readMenu(fs.readFileSync(path.join(root, 'js/menu-data.js'), 'utf8'))
    .map(item => ({...item, precio:25.75}));
  const commercialModes = [[false, false], [true, false], [true, true]].map(([pricesApproved, enabled]) => ({
    'index.html':synchronizeMenu(html, pricedMenu, config.images.productPlaceholder, {...config.order, pricesApproved}),
    'js/menu-data.js':serializeCatalog(pricedMenu),
    'js/config.js':configSource + `\nsiteConfig.order.pricesApproved = ${pricesApproved}; siteConfig.whatsapp.enabled = ${enabled}; siteConfig.whatsapp.number = "15550000123";`
  }));
  const server = http.createServer((req, res) => {
    try {
      const requestPath = new URL(req.url, 'http://localhost').pathname;
      const mode = /^\/modo-([012])\//.exec(requestPath)?.[1];
      const pathname = requestPath.replace(/^\/(?:MirekaCafe|revision|modo-[012])\//, '/');
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      const file = path.join(root, relative);
      const body = requestPath === '/revision/' ? fixtureHtml : commercialModes[mode]?.[relative] ?? fs.readFileSync(file);
      res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
        '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ channel: 'chrome', headless: true }); t.after(() => browser.close());
  for (const prefix of ['/', '/MirekaCafe/']) for (const js of [false, true]) {
    await t.test(`${prefix} · JavaScript ${js}`, async () => {
      const page = await browser.newPage({ javaScriptEnabled: js, viewport: { width: prefix === '/' ? 1440 : 390, height: 900 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`, { waitUntil: 'networkidle' });
        assert.equal(await page.title(), title);
        assert.equal(await page.locator('#business-contact').count(), 1);
        assert.match(await page.locator('#business-contact').innerText(), /Lunes a sábado/);
        assert.deepEqual(await page.locator('.footer-social a').evaluateAll(links => links.map(link =>
          [link.getAttribute('href'), link.target, link.rel])),
        ['instagram', 'facebook', 'tiktok'].map(key => [config.contact[key], '_blank', 'noopener noreferrer']));
        assert.equal(await page.locator('.story-card').getByText(config.business.description, {exact:true}).count(), 1);
        const expected = { description, robots: 'noindex,follow', 'og:title': title, 'og:description': description,
          'og:type': 'website', 'og:site_name': 'Mireka Café', 'og:locale': 'es_MX', 'twitter:card': 'summary',
          'twitter:title': title, 'twitter:description': description };
        assert.equal(await page.locator('title').count(), 1);
        for (const [name, value] of Object.entries(expected)) {
          const locator = page.locator(`head meta[${name.startsWith('og:') ? 'property' : 'name'}="${name}"]`);
          assert.equal(await locator.count(), 1, name); assert.equal(await locator.getAttribute('content'), value);
        }
        assert.equal(await page.locator('link[rel="canonical"], meta[property="og:url"], meta[property^="og:image"], meta[name^="twitter:image"], meta[name="twitter:site"]').count(), 0);
        const iconLinks = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll(nodes => nodes.map(n => ({ href: n.getAttribute('href'), size: n.sizes.value, url: n.href })));
        assert.deepEqual(iconLinks.map(n => [n.href, n.size]), [
          ['assets/images/brand/favicon.ico?v=1.0.21', '16x16 32x32 48x48'],
          ['assets/images/brand/favicon-96.png?v=1.0.21', '96x96'],
          ['assets/images/brand/apple-touch-icon.png?v=1.0.21', '180x180'],
        ]);
        for (const icon of iconLinks) {
          const response = await page.request.get(icon.url); assert.equal(response.status(), 200);
          const decoded = await page.evaluate(async url => {
            const image = new Image(); image.src = url; await image.decode(); return [image.naturalWidth, image.naturalHeight];
          }, icon.url);
          if (icon.href.endsWith('ico?v=1.0.21')) assert.ok([16, 32, 48].includes(decoded[0]) && decoded[0] === decoded[1]);
          else assert.deepEqual(decoded, icon.size.split('x').map(Number));
        }
        const robots = await page.locator('meta').evaluateAll(nodes => nodes.filter(n => /^(robots|googlebot|bingbot)$/i.test(n.name)).map(n => n.content));
        assert.deepEqual(robots, ['noindex,follow']);
        assert.ok(await page.locator('head link[href], head script[src]').evaluateAll(nodes => nodes.every(n => !/^(\/|https?:)/.test(n.getAttribute('href') || n.getAttribute('src')))));
        if (js) {
          await page.locator('.hero-actions .primary-button').focus(); await page.keyboard.press('Enter');
          assert.equal(await page.evaluate(() => location.hash), '#menu');
          await page.locator('.menu-card button').first().focus(); await page.keyboard.press('Enter');
          assert.equal(await page.locator('#header-cart-count').textContent(), '1');
          if (prefix !== '/') {
            assert.equal(await page.locator('#mobile-order-bar').evaluate(e => e.getBoundingClientRect().height), 72);
            await page.locator('#mobile-order-toggle').click(); await page.keyboard.press('Escape');
            assert.equal(await page.locator('#mobile-order-toggle').evaluate(e => e === document.activeElement), true);
          }
          await page.reload({ waitUntil: 'networkidle' });
          assert.equal(await page.title(), title);
          assert.equal(await page.locator('#header-cart-count').textContent(), '1');
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
  for (const width of [390, 1440]) await t.test(`contacto y enlaces sociales a ${width}px`, async () => {
    const page = await browser.newPage({viewport:{width, height:900}, javaScriptEnabled:width !== 390});
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/revision/`);
      const contact = page.getByRole('group', {name:'Datos de contacto'});
      await contact.scrollIntoViewIfNeeded();
      assert.match(await contact.innerText(), /Horario de prueba/);
      assert.equal(await contact.getByRole('link', {name:/Teléfono/}).getAttribute('href'), 'tel:+525500000001');
      const social = contact.getByRole('navigation', {name:'Redes sociales'});
      assert.deepEqual(await social.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href'))), Object.values(profiles));
      assert.deepEqual(await social.getByRole('link').evaluateAll(links =>
        links.map(link => [link.target, link.rel])),
      Object.values(profiles).map(() => ['_blank', 'noopener noreferrer']));
      assert.equal(await contact.evaluate(() => document.documentElement.scrollWidth), width);
    } finally { await page.close(); }
  });
  for (const mode of [0, 1, 2]) for (const js of [false, true]) {
    await t.test(`modo comercial ${mode} · JavaScript ${js}`, async () => {
      const page = await browser.newPage({javaScriptEnabled:js, viewport:{width:1440, height:900}});
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/modo-${mode}/`);
        const price = await page.locator('.menu-card:visible .price').first().innerText();
        assert.equal(price, mode ? '$25.75' : 'Precio pendiente');
        if (js) {
          await page.locator('.menu-card:visible button').first().click();
          assert.equal(await page.locator('#cart-total').innerText(), mode ? '$25.75' : '—');
          assert.equal(await page.locator('.whatsapp-button').isDisabled(), mode !== 2);
        } else {
          assert.equal(await page.locator('.menu-card button').count(), 0);
          assert.equal(await page.locator('.whatsapp-button').isDisabled(), true);
        }
      } finally { await page.close(); }
    });
  }
});

test('omite enlaces inválidos y escapa texto comercial', () => {
  const draft = JSON.parse(JSON.stringify(config));
  draft.business.description = 'Café <script> de prueba';
  draft.contact.instagram = 'http://instagram.com/otro';
  draft.contact.facebook = 'https://facebook.com.ejemplo.test/perfil';
  draft.contact.tiktok = 'https://www.tiktok.com/@perfil/video/123';
  const output = synchronizeSite(html, draft);
  assert.match(output, /Café &lt;script&gt; de prueba/);
  assert.doesNotMatch(output, /aria-label="Redes sociales"|instagram\.com\/otro|facebook\.com\.ejemplo|tiktok\.com\/@perfil/);
});
