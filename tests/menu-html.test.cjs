const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { readMenu, renderMenuHtml, synchronizeMenu } = require('../tools/generate-menu-html.cjs');
const { loadConfig } = require('../tools/sync-seo.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const items = readMenu(fs.readFileSync(path.join(root, 'js/menu-data.js'), 'utf8'));
const config = loadConfig();
const fallback = config.images.productPlaceholder;
const currency = new Intl.NumberFormat(config.order.locale, {style:'currency', currency:config.order.currency});

test('catálogo determinista, precios pendientes y escritura limitada a los marcadores', () => {
  assert.equal(synchronizeMenu(html, items, fallback, config.order), html);
  const sample = { id: 'a', nombre: '<A & "B">', descripcion: '<script>no</script>', categoria: 'A & B',
    imagen: '', precio: 1, disponible: true };
  const input = [sample, { ...sample, id: 'b', categoria: 'A-B', disponible: false }];
  const output = renderMenuHtml(input, fallback);
  assert.equal(renderMenuHtml(input, fallback), output);
  assert.match(output, /&lt;A &amp; &quot;B&quot;&gt;/);
  assert.match(output, /&lt;script&gt;no&lt;\/script&gt;/);
  assert.match(output, /id="menu-categoria-a-b-2"/);
  assert.match(output, /No hay productos disponibles en esta categoría/);
  assert.match(output, /data-image-state="fallback"/);
  assert.doesNotMatch(output, /data-menu-product-id="b"|\$1\.00|<button|application\/ld\+json/);
  assert.throws(() => renderMenuHtml([sample, sample], fallback), /duplicado/);
  assert.throws(() => renderMenuHtml([{ ...sample, imagen: '../privado.webp' }], fallback), /Ruta/);
  assert.throws(() => readMenu('const menuItems = []; process.exit(1);'));
  assert.throws(() => synchronizeMenu('<html></html>', input, fallback), /Bloque/);
  const changed = synchronizeMenu(html, input, fallback);
  const before = text => text.slice(0, text.indexOf('<!-- MENU:START'));
  const after = text => text.slice(text.indexOf('<!-- MENU:END'));
  assert.equal(before(changed), before(html));
  assert.equal(after(changed), after(html));
  assert.equal(synchronizeMenu(changed, input, fallback), changed);
});

test('catálogo público en raíz y subdirectorio con mejora progresiva y salida de consulta', async t => {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname.replace(/^\/MirekaCafe\//, '/');
    try {
      const file = path.resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
      const body = fs.readFileSync(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const cards = '#menu-grid .menu-card';
  const groups = '#menu-grid .menu-category';
  const categories = [...new Set(items.map(item => item.categoria))];
  for (const prefix of ['/', '/MirekaCafe/']) {
    await t.test(`${prefix} sin JavaScript`, async () => {
      const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
      try {
        await page.goto(base + prefix, { waitUntil: 'domcontentloaded' });
        const actual = await page.locator(cards).evaluateAll(nodes => nodes.map(card => {
          const image = card.querySelector('img');
          return { id: card.dataset.menuProductId, nombre: card.querySelector('h4').textContent,
            descripcion: card.querySelector('.dish-content > p').textContent, categoria: card.closest('section').dataset.menuCategory,
            imagen: image.getAttribute('src') };
        }));
        assert.deepEqual(actual, items.filter(item => item.disponible).map(({ id, nombre, descripcion, categoria, imagen }) =>
          ({ id, nombre, descripcion, categoria, imagen })));
        assert.equal(actual.length, 101);
        assert.equal(new Set(actual.map(item => item.id)).size, 101);
        assert.equal(new Set(actual.map(item => item.imagen)).size, 94);
        assert.deepEqual(await page.locator(`${groups} > h3`).allTextContents(), categories);
        assert.equal(await page.locator(`${cards}:visible`).count(), 101);
        assert.equal(await page.locator(`${cards} button`).count(), 0);
        assert.equal(await page.locator('.whatsapp-button').isVisible(), false);
        assert.equal(await page.locator('#category-select').isVisible(), false);
        assert.deepEqual(await page.locator(`${cards} .price`).allTextContents(),
          items.filter(item => item.disponible).map(item => currency.format(item.precio)));
        const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
        assert.equal(new Set(ids).size, ids.length);
        const links = page.locator('.menu-category-index a');
        assert.equal(await links.count(), 18);
        const destination = await links.last().getAttribute('href');
        await links.last().click();
        assert.equal(new URL(page.url()).hash, destination);
        assert.equal(await page.locator(destination).isVisible(), true);
      } finally { await page.close(); }
    });
  }

  for (const width of [320, 390, 768, 1024, 1440]) {
    await t.test(`catálogo interactivo a ${width} px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base + '/MirekaCafe/');
        assert.equal(await page.locator(`${groups}:visible`).count(), 1);
        assert.equal(await page.locator(`${cards}:visible`).count(), 4);
        assert.equal(await page.locator(cards).count(), 101);
        assert.equal(await page.locator('.menu-category-index').isVisible(), false);
        const selector = page.locator('#category-select');
        assert.deepEqual(await selector.locator('option').allTextContents(), categories);
        await page.evaluate(() => { window.firstCard = document.querySelector('.menu-card'); });
        for (const category of categories) {
          await selector.selectOption(category);
          const visible = page.locator(`${groups}:visible`);
          assert.equal(await visible.getAttribute('data-menu-category'), category);
          assert.equal(await visible.locator('.menu-card').count(), items.filter(item => item.categoria === category && item.disponible).length);
          assert.equal(await page.locator('.category-list [aria-pressed="true"]').textContent(), category);
        }
        const add = page.locator(`${cards}:visible button`).first();
        await add.focus();
        await page.evaluate(() => {
          const select = document.querySelector('#category-select');
          select.selectedIndex = 0;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert.equal(await selector.evaluate(element => element === document.activeElement), true);
        assert.equal(await page.evaluate(() => window.firstCard === document.querySelector('.menu-card')), true);
        await add.focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#header-cart-count').textContent(), '1');
        if (width < 768) {
          await page.waitForFunction(() => document.querySelector('#cart-status').textContent.includes('1 producto en el pedido.'));
          assert.equal(await page.locator('#mobile-order-bar').evaluate(element => element.getBoundingClientRect().height), 72);
        }
        assert.equal(await page.locator('.whatsapp-button').isDisabled(), false);
        await page.reload();
        assert.equal(await page.locator('#header-cart-count').textContent(), '1');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }

  await t.test('anclaje directo, historial y fallo de inicialización', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    try {
      await page.goto(base + '/#menu-categoria-especiales');
      assert.equal(await page.locator('#category-select').inputValue(), 'Especiales');
      await page.evaluate(() => { location.hash = 'menu-categoria-lattes-frios'; });
      await page.waitForFunction(() => document.querySelector('#category-select').value === 'Lattes fríos');
      await page.goBack();
      await page.waitForFunction(() => document.querySelector('#category-select').value === 'Especiales');
      await page.waitForFunction(() => {
        const top = document.querySelector('#menu-categoria-especiales').getBoundingClientRect().top;
        return top >= document.querySelector('.site-header').getBoundingClientRect().bottom && top < innerHeight;
      });
      await page.route('**/js/menu-data.js*', route => route.abort());
      await page.goto(base + '/MirekaCafe/');
      assert.equal(await page.locator(`${cards}:visible`).count(), 101);
      assert.equal(await page.locator('.menu-category-index').isVisible(), true);
      assert.equal(await page.locator('#category-select').isVisible(), false);
      assert.equal(await page.locator(`${cards} button:visible`).count(), 0);
    } finally { await page.close(); }
  });
});
