const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('D02–D05: avisos disponibles, semántica y espaciado sin perder el carrito', async (t) => {
  const root = path.resolve(__dirname, '..');
  const axePath = process.env.AXE_CORE_PATH;
  if (!axePath) t.diagnostic('axe no ejecutado: proporcionar AXE_CORE_PATH externo, sin instalar dependencias.');
  const server = http.createServer(async (req, res) => {
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
      '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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
  const axeResults = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await t.test(`${width} px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const scan = async state => {
        if (!axePath) return;
        // La misma posición estable para comparar estados. A 768 px, el scroll
        // automático al enfocar cantidades deja otro botón bajo el header y
        // axe informa target-size también en la versión base sin correcciones.
        if (width >= 768) await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        const result = await page.evaluate(async () => {
          const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
          return { version: r.testEngine.version, violations: r.violations, incomplete: r.incomplete };
        });
        axeResults.push({ width, state, ...result });
        // Aviso previo de la auditoría: el badge numérico no forma parte del
        // nombre Ver carrito. No se modifica ese control fuera de D01–D05.
        for (const violation of result.violations) {
          assert.equal(violation.id, 'label-content-name-mismatch', JSON.stringify(violation));
          assert.ok(violation.nodes.every(n => n.target.join('') === '.header-cart'), JSON.stringify(violation));
        }
        assert.equal(result.incomplete.some(r => r.id === 'aria-prohibited-attr'), false);
      };
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        if (axePath) await page.addScriptTag({ path: axePath });
        await scan('vacío');
        assert.equal(await page.locator('#menu-grid').getAttribute('role'), 'group');
        assert.equal(await page.locator('#cart-items').getAttribute('role'), 'group');
        assert.equal(await page.locator('#customer-name').getAttribute('autocomplete'), 'name');
        assert.equal(await page.locator('#customer-address').getAttribute('autocomplete'), 'street-address');
        const status = page.locator('#cart-status');
        assert.equal(await status.getAttribute('role'), 'status');
        await page.evaluate(() => {
          window.cartAnnouncements = [];
          new MutationObserver(() => {
            const text = document.querySelector('#cart-status').textContent;
            if (text) window.cartAnnouncements.push(text);
          }).observe(document.querySelector('#cart-status'), { childList: true, subtree: true, characterData: true });
        });
        const add = page.locator('.menu-card button').first();
        await add.focus(); await page.keyboard.press('Enter');
        assert.equal(await add.evaluate(e => e === document.activeElement), true);
        if (width < 768) {
          await page.waitForFunction(() => document.querySelector('#cart-status').textContent.includes('1 producto en el pedido.'));
          assert.equal(await page.locator('dialog').evaluate(e => e.open), false);
          const cdp = await page.context().newCDPSession(page);
          const { root: dom } = await cdp.send('DOM.getDocument');
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: dom.nodeId, selector: '#cart-status' });
          const { node } = await cdp.send('DOM.describeNode', { nodeId });
          const tree = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId, fetchRelatives: false });
          const ax = tree.nodes.find(n => n.role?.value === 'status');
          assert.ok(ax && !ax.ignored, 'estado expuesto con panel cerrado');
          assert.equal(ax.properties.find(p => p.name === 'live').value.value, 'polite');
          await cdp.detach();
          assert.equal(await page.locator('.cart-summary').isVisible(), false);
          await add.click();
          await page.waitForFunction(() => document.querySelector('#cart-status').textContent.includes('2 productos en el pedido.'));
          assert.equal((await page.evaluate(() => cartAnnouncements)).length, 2, 'un aviso por alta');
          await page.locator('#mobile-order-toggle').click();
          await page.evaluate(() => addProductToCart(menuItems[0].id));
          await page.waitForTimeout(120);
          assert.equal(await status.textContent(), '', 'sin duplicar el resumen visible');
          assert.equal(await page.locator('.cart-summary').getAttribute('aria-live'), 'polite');
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#mobile-order-toggle').evaluate(e => e === document.activeElement), true);
          // El mismo texto se puede anunciar otra vez tras retirar y agregar.
          await page.evaluate(() => { removeCartItem(menuItems[0].id); addProductToCart(menuItems[0].id); });
          await page.waitForFunction(() => document.querySelector('#cart-status').textContent.includes('1 producto en el pedido.'));
          await page.evaluate(() => { removeCartItem(menuItems[0].id); addProductToCart(menuItems[0].id); });
          await page.waitForTimeout(120);
          assert.equal((await page.evaluate(() => cartAnnouncements)).filter(s => s.includes('1 producto en el pedido.')).length, 3);
          // Apertura inmediata cancela el aviso que aún no se había anunciado.
          await page.evaluate(() => { addProductToCart(menuItems[0].id); openMobileOrderPanel(document.querySelector('#mobile-order-toggle')); });
          await page.waitForTimeout(120);
          assert.equal(await status.textContent(), '');
        } else {
          await page.waitForTimeout(120);
          assert.equal(await status.textContent(), '', 'el resumen de escritorio ya es live');
          await page.locator('.header-cart').click();
        }
        assert.equal(await page.locator('.quantity-controls span').getAttribute('aria-label'), null);
        await page.locator('[value="domicilio"]').check();
        assert.equal(await page.locator('#customer-address').evaluate(e => e.required && !e.disabled && !!e.labels.length), true);
        await page.locator('[value="recoger"]').check();
        assert.equal(await page.locator('#customer-address').evaluate(e => e.hidden && e.disabled && !e.required), true);
        const plus = page.locator('[data-action="increase"]');
        await plus.focus(); await page.keyboard.press('Space');
        assert.equal(await page.locator('[data-action="increase"]').evaluate(e => e === document.activeElement), true);
        await scan('pedido');
        if (width < 768) await page.keyboard.press('Escape');
        await page.reload({ waitUntil: 'networkidle' });
        assert.notEqual(await page.locator('#header-cart-count').textContent(), '0');
        await page.evaluate(() => {
          for (const item of [...cartItems]) removeCartItem(item.id);
          for (const product of menuItems) addProductToCart(product.id);
        });
        assert.equal(await page.locator('.cart-item').count(), 101, 'catálogo completo en el carrito');
        if (width < 768) assert.equal(await page.locator('#mobile-order-bar').evaluate(e => e.getBoundingClientRect().height), 72);
        await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' });
        if (width < 768) {
          const bounds = await page.locator('#mobile-order-count').evaluate(e => {
            const range = new Range(); range.selectNodeContents(e);
            return { box: e.getBoundingClientRect().toJSON(), text: [...range.getClientRects()].map(r => r.toJSON()),
              next: e.nextElementSibling.getBoundingClientRect().toJSON(), bar: e.closest('.mobile-order-bar').getBoundingClientRect().toJSON() };
          });
          assert.ok(bounds.text.every(r => r.right <= bounds.box.right + 1 && r.left >= bounds.box.left - 1));
          assert.ok(bounds.text.every(r => r.right <= bounds.next.left));
          assert.equal(bounds.bar.height, 72, 'se mantiene incluso con espaciado WCAG y tres dígitos');
          assert.equal(await page.locator('#mobile-order-count').textContent(), '101 productos');
          await page.locator('#mobile-order-toggle').focus();
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('dialog').evaluate(e => e.open), true);
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#mobile-order-toggle').evaluate(e => e === document.activeElement), true);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.evaluate(() => siteConfig.order.pricesApproved), false);
        assert.equal(await page.evaluate(() => siteConfig.whatsapp.enabled), false);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
  if (process.env.A11Y_RESULTS_PATH) await fs.writeFile(process.env.A11Y_RESULTS_PATH, JSON.stringify(axeResults, null, 2));
});
