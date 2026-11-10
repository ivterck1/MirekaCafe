const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('barra compacta conserva el diálogo, indicadores y persistencia', async (t) => {
  const root = path.resolve(__dirname, '..');
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    await t.test(`${width} px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce', hasTouch: width < 768 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const bar = page.locator('#mobile-order-bar');
        const toggle = page.locator('#mobile-order-toggle');
        const dialog = page.locator('#mobile-cart-dialog');
        assert.equal(await bar.isVisible(), false);
        await page.locator('.hero-actions .primary-button').click();
        await page.locator('.menu-card button').first().click();
        assert.equal(await page.locator('#mobile-order-count').innerText(), '1 producto');
        await page.locator('.menu-card button').first().click();
        assert.equal(await page.locator('#mobile-order-count').innerText(), '2 productos');
        assert.equal(await bar.locator('button').count(), 1, 'un único control de apertura');
        assert.equal(await toggle.getAttribute('aria-controls'), 'mobile-cart-dialog');
        assert.equal(await toggle.getAttribute('aria-haspopup'), 'dialog');
        assert.equal(await toggle.locator('.mobile-order-icon').getAttribute('aria-hidden'), 'true');
        if (width < 768) {
          const assertRow = async () => {
            const row = await toggle.evaluate(button => {
              const rect = button.getBoundingClientRect();
              return { rect: rect.toJSON(), children: [...button.children].filter(e => e.getClientRects().length).map(e => ({ rect: e.getBoundingClientRect().toJSON(),
                clipped: e.textContent.trim().length > 0 && e.scrollWidth > e.clientWidth + 1 })), bar: button.parentElement.getBoundingClientRect().toJSON() };
            });
            assert.equal(row.rect.height, 56);
            const centers = row.children.map(c => (c.rect.top + c.rect.bottom) / 2);
            assert.ok(Math.max(...centers) - Math.min(...centers) < 1, 'una sola fila');
            for (const child of row.children) {
              assert.ok(child.rect.left >= row.rect.left && child.rect.right <= row.rect.right);
              assert.ok(child.rect.top >= row.rect.top && child.rect.bottom <= row.rect.bottom);
              assert.equal(child.clipped, false, 'texto sin recortes');
            }
            assert.ok(row.rect.width >= 44 && row.children.at(-1).rect.height >= 44);
            return row;
          };
          assert.equal((await assertRow()).bar.height, 72);
          await toggle.focus();
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          assert.equal(await toggle.evaluate(e => e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none'), true);
          await page.keyboard.press('Enter');
          assert.equal(await dialog.evaluate(e => e.matches(':modal')), true);
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          assert.equal(await page.locator('#mobile-order-close').evaluate(e => e === document.activeElement), true);
          const plus = page.locator('[data-action="increase"]');
          await plus.focus(); await page.keyboard.press('Enter');
          assert.equal(await page.locator('[data-action="increase"]').evaluate(e => e === document.activeElement), true);
          assert.equal(await page.locator('#mobile-order-count').innerText(), '3 productos');
          await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          assert.equal(await toggle.evaluate(e => e === document.activeElement), true);
          await toggle.locator('span:last-child').tap();
          assert.equal(await dialog.evaluate(e => e.open), true);
          await page.locator('#mobile-order-close').click();
          assert.equal(await toggle.evaluate(e => e === document.activeElement), true);
          assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
          await page.reload({ waitUntil: 'networkidle' });
          assert.equal(await page.locator('#mobile-order-count').innerText(), '3 productos');
          // El contador sigue cabiendo con una cantidad de tres dígitos.
          await page.evaluate(() => { for (let n = 3; n < 101; n++) increaseCartItem(menuItems[0].id); });
          assert.equal(await page.locator('#mobile-order-count').innerText(), '101 productos');
          await assertRow();
          await page.evaluate(() => {
            for (const product of menuItems.slice(1, 13)) addProductToCart(product.id);
          });
          await toggle.click();
          const panel = dialog.locator('.cart-panel');
          const header = panel.locator('.cart-panel-header');
          const bounds = () => header.evaluate(element => {
            const header = element.getBoundingClientRect();
            const panel = element.parentElement;
            const {top, left} = panel.getBoundingClientRect();
            const x = left + panel.clientLeft;
            const y = top + panel.clientTop;
            return {
              coversTop: Math.abs(header.top - y) < 1,
              coversWidth: Math.abs(header.left - x) < 1 && Math.abs(header.right - x - panel.clientWidth) < 1,
              coversEdges: [x + 4, x + panel.clientWidth - 5].every(point => element.contains(document.elementFromPoint(point, y + header.height / 2))),
              background: getComputedStyle(element).backgroundColor,
              scroll: panel.scrollTop
            };
          });
          assert.deepEqual(await bounds(), {
            coversTop: true, coversWidth: true, coversEdges: true, background: 'rgb(255, 249, 246)', scroll: 0
          });
          await panel.evaluate(element => { element.scrollTop = 350; });
          assert.deepEqual(await bounds(), {
            coversTop: true, coversWidth: true, coversEdges: true, background: 'rgb(255, 249, 246)', scroll: 350
          });
          await panel.locator('#customer-name').fill('Pedido de revisión');
          const submit = panel.locator('.whatsapp-button');
          await submit.scrollIntoViewIfNeeded();
          assert.equal(await submit.evaluate(element => {
            const box = element.getBoundingClientRect();
            return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
          }), true, 'el botón sigue accesible al final del panel');
          await header.getByRole('button', {name: 'Cerrar pedido'}).click();
          assert.equal(await toggle.evaluate(e => e === document.activeElement), true);
          await page.evaluate(() => {
            for (const product of menuItems.slice(1, 13)) removeCartItem(product.id);
          });
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, right: 0, bottom: 34 } });
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          assert.equal(await bar.evaluate(e => getComputedStyle(e).paddingBottom), '42px');
          assert.equal((await assertRow()).bar.height, 106, '72 px más 34 px de área segura');
          await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          assert.equal(await page.evaluate(() => document.querySelector('.footer-content img').getBoundingClientRect().bottom
            <= document.querySelector('#mobile-order-bar').getBoundingClientRect().top), true, 'contenido final accesible');
          await cdp.detach();
        } else {
          assert.equal(await bar.isVisible(), false, 'tablet/escritorio sin barra flotante');
          await page.locator('.header-cart').click();
          assert.equal(await dialog.evaluate(e => e.open), false);
          assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
        }
        const state = await page.evaluate(() => ({ products: menuItems.length, categories: new Set(menuItems.map(p => p.categoria)).size,
          routes: new Set(menuItems.map(p => p.imagen)).size, prices: siteConfig.order.pricesApproved,
          whatsapp: siteConfig.whatsapp.enabled, overflow: document.documentElement.scrollWidth > innerWidth,
          themes: [...document.querySelectorAll('meta[name="theme-color"]')].map(e => ({ content: e.content, parent: e.parentElement.tagName, media: e.getAttribute('media') })),
          surface: getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim(),
          manifest: document.querySelector('link[rel~="manifest"]') !== null }));
        assert.deepEqual(state, { products: 101, categories: 18, routes: 94, prices: true, whatsapp: true,
          overflow: false, themes: [{ content: '#FFF9F6', parent: 'HEAD', media: null }], surface: '#FFF9F6', manifest: false });
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
});
