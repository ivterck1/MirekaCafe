const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const path = require('node:path');
const {loadConfig} = require('../tools/sync-seo.cjs');
const {synchronizeMenu} = require('../tools/generate-menu-html.cjs');

async function startSite() {
  const root = path.resolve(__dirname, '..');
  const mime = {html:'text/html', css:'text/css', js:'text/javascript', svg:'image/svg+xml',
    webp:'image/webp', png:'image/png', ico:'image/x-icon', woff2:'font/woff2', mp4:'video/mp4'};
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (relative !== 'index.html' && !/^(assets|css|js)\/(?:[\w.-]+\/)*[\w.-]+$/.test(relative) ||
          relative.split('/').some(segment => segment === '..' || segment === '.')) {
        response.writeHead(404).end();
        return;
      }
      const file = path.join(root, relative);
      const bytes = await fs.promises.readFile(file);
      response.writeHead(200, {'Content-Type':mime[path.extname(file).slice(1)] || 'application/octet-stream'});
      response.end(bytes);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
    }
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  return server;
}
const catalog = vm.runInNewContext(fs.readFileSync('js/menu-data.js', 'utf8') + '\nmenuItems;');
const config = loadConfig();
const amount = catalog.find(product => product.disponible).precio;
const currency = new Intl.NumberFormat(config.order.locale, {style:'currency', currency:config.order.currency});
const informativeHtml = synchronizeMenu(fs.readFileSync('index.html', 'utf8'), catalog, config.images.productPlaceholder);
const missingImages = new Set(catalog.map(product => product.imagen)
  .filter(image => image && !fs.existsSync(image)));
const placeholder = fs.readFileSync('assets/images/products/placeholder.svg');

async function checkSite(browser, width, siteUrl) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  let approvePrices = false;
  let enableWhatsApp = false;
  try {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('response', response => {
      if (response.status() >= 400) errors.push(response.url());
    });
    page.on('requestfailed', request => {
      const reason = request.failure()?.errorText;
      if (reason && reason !== 'net::ERR_ABORTED') errors.push(`${reason} ${request.url()}`);
    });

    // Las fotos pendientes quedan fuera de esta prueba del flujo funcional.
    await page.route('**/assets/images/products/**', route => {
      const path = new URL(route.request().url()).pathname.slice(1);
      return missingImages.has(path)
        ? route.fulfill({ contentType: 'image/svg+xml', body: placeholder })
        : route.continue();
    });
    // El modo informativo y el de solo precios son fixtures del navegador.
    await page.route(url => url.href === new URL(siteUrl).href, route => approvePrices ? route.continue() :
      route.fulfill({contentType:'text/html; charset=utf-8', body:informativeHtml}));
    await page.route('**/js/config.js?*', route => {
      if (enableWhatsApp) return route.continue();
      const source = fs.readFileSync('js/config.js', 'utf8');
      return route.fulfill({
        contentType: 'text/javascript',
        body: source + `\nsiteConfig.order.pricesApproved = ${approvePrices}; siteConfig.whatsapp.enabled = false;`
      });
    });
    await page.addInitScript(() => {
      window.testOrderUrls = [];
      window.open = url => window.testOrderUrls.push(url);
    });

    await page.goto(siteUrl);
    assert.equal(await page.title(), 'Mireka Café | Cafetería de autor y menú');
    assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), await page.title());
    assert.equal(await page.evaluate(() => menuItems.length), 101);
    const categories = page.locator('[data-category]');
    const categorySelect = page.locator('#category-select');
    const categoryStatus = page.locator('#category-status');
    assert.equal(await categories.count(), 18);
    const categoryNames = await categories.allTextContents();
    assert.deepEqual(await categorySelect.locator('option').allTextContents(), categoryNames);
    for (const name of [...categoryNames].reverse()) {
      await categorySelect.selectOption(name);
      const selected = categories.filter({ hasText: name });
      assert.equal(await selected.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-category][aria-pressed="true"]').count(), 1);
      const count = await page.locator('.menu-card:visible').count();
      assert.ok(count > 0);
      assert.equal(await categoryStatus.innerText(), `${name} · ${count} ${count === 1 ? 'producto' : 'productos'}`);
    }
    await categories.last().click();
    assert.equal(await categorySelect.inputValue(), categoryNames.at(-1));
    await categories.first().click();
    assert.equal(await categorySelect.inputValue(), categoryNames[0]);
    assert.equal(await page.locator('#featured-grid h3').count(), 3);
    assert.doesNotMatch(await page.locator('#menu-grid, #featured-grid').allTextContents().then(parts => parts.join(' ')), /\$\s*\d/);
    assert.match(await page.locator('#catalog-price-status').innerText(), /precios están pendientes/);

    const send = page.locator('.whatsapp-button');
    const address = page.locator('#customer-address');
    const dialog = page.locator('#mobile-cart-dialog');
    const toggle = page.locator('#mobile-order-toggle');
    const close = page.locator('#mobile-order-close');
    const openCart = async () => {
      if (width < 768) await page.locator('#mobile-order-toggle').click();
    };
    await page.locator('.menu-card button').first().click();
    if (width >= 768 && width < 1024) {
      assert.equal(await toggle.isVisible(), false);
      await page.locator('.header-cart').click();
      await page.waitForURL('**/#carrito');
      await page.waitForFunction(() => {
        const top = document.querySelector('#carrito').getBoundingClientRect().top;
        return top >= document.querySelector('.site-header').getBoundingClientRect().bottom
          && top < innerHeight;
      });
      assert.equal(await dialog.evaluate(el => el.open), false);
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
    }
    for (const link of await page.locator('[data-order-link]').all()) {
      assert.equal(await link.getAttribute('href'), '#pedido');
      if (await link.isVisible()) await link.click();
      else await link.dispatchEvent('click');
      if (width < 768) await page.locator('#mobile-order-close').click();
    }
    await openCart();
    if (width < 768) {
      assert.equal(await dialog.evaluate(el => el.matches(':modal')), true);
      assert.equal(await close.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.locator('#order-notes').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Tab');
      assert.equal(await close.evaluate(el => el === document.activeElement), true);
      await page.locator('#customer-name').fill('Ana Prueba');
      await page.keyboard.press('Escape');
      assert.equal(await dialog.evaluate(el => el.open), false);
      assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
      await openCart();
      assert.equal(await page.locator('#customer-name').inputValue(), 'Ana Prueba');
    }
    assert.equal(await page.locator('#cart-total').innerText(), '—');
    assert.doesNotMatch(await page.locator('#cart-items').innerText(), /\$\s*\d/);
    assert.equal(await send.isDisabled(), true);
    await page.locator('#customer-name').fill('Ana Prueba');
    await page.locator('[value="recoger"]').check();
    assert.equal(await address.isVisible(), false);

    await page.evaluate(() => {
      siteConfig.whatsapp.enabled = true;
      const button = document.querySelector('.whatsapp-button');
      button.disabled = false;
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      handleWhatsAppClick();
    });
    assert.deepEqual(await page.evaluate(() => window.testOrderUrls), []);
    assert.match(await page.locator('#order-message').innerText(), /precios están pendientes/);

    approvePrices = true;
    if (width === 390) {
      await page.reload();
      await openCart();
      assert.equal(await page.locator('#cart-total').innerText(), currency.format(amount));
      assert.equal(await send.isDisabled(), true);
      await page.evaluate(() => handleWhatsAppClick());
      assert.deepEqual(await page.evaluate(() => window.testOrderUrls), []);
    }
    enableWhatsApp = true;
    await page.reload();
    assert.equal(await page.evaluate(() => siteConfig.order.pricesApproved && siteConfig.whatsapp.enabled), true);
    assert.equal(await page.locator('#header-cart-count').innerText(), '1');
    await openCart();
    assert.equal(await page.locator('#cart-total').innerText(), currency.format(amount));
    const increase = page.locator('[data-action="increase"]');
    const decrease = page.locator('[data-action="decrease"]');
    await increase.focus();
    await page.keyboard.press('Enter');
    assert.equal(await increase.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => calculateCartSubtotal()), amount * 2);
    assert.equal(await page.locator('#cart-total').innerText(), currency.format(amount * 2));
    await decrease.focus();
    await page.keyboard.press('Enter');
    assert.equal(await decrease.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => calculateCartSubtotal()), amount);

    await page.locator('#customer-name').fill('Ana Prueba');
    await page.locator('[value="domicilio"]').check();
    assert.equal(await address.isVisible(), true);
    assert.equal(await address.evaluate(input => input.required), true);
    await send.click();
    assert.match(await page.locator('#order-message').innerText(), /dirección/);
    assert.deepEqual(await page.evaluate(() => window.testOrderUrls), []);

    await address.fill('Calle de prueba 123');
    await page.evaluate(() => { cartItems[0].price += 1; handleWhatsAppClick(); });
    assert.match(await page.locator('#order-message').innerText(), /precio/);
    assert.deepEqual(await page.evaluate(() => window.testOrderUrls), []);
    await page.evaluate(price => { cartItems[0].price = price; }, amount);
    await send.click();
    const [deliveryUrl] = await page.evaluate(() => window.testOrderUrls);
    const delivery = new URL(deliveryUrl);
    assert.ok(delivery.origin === 'https://wa.me' && delivery.pathname.slice(1) === config.whatsapp.number,
      'el destino coincide con el número comercial autorizado');
    const deliveryMessage = delivery.searchParams.get('text');
    assert.match(deliveryMessage, /Mireka Café[\s\S]*Ana Prueba/);
    assert.match(deliveryMessage, /Entrega: Servicio a domicilio/);
    assert.match(deliveryMessage, /Dirección: Calle de prueba 123/);
    assert.ok(deliveryMessage.includes(`1 x ${catalog.find(product => product.disponible).nombre} (${currency.format(amount)} c/u) = ${currency.format(amount)}`));
    assert.ok(deliveryMessage.includes(`Total: ${currency.format(amount)}`));

    await page.locator('[value="recoger"]').check();
    assert.equal(await address.isVisible(), false);
    await send.click();
    const pickupUrl = await page.evaluate(() => window.testOrderUrls[1]);
    const pickupMessage = new URL(pickupUrl).searchParams.get('text');
    assert.match(pickupMessage, /Entrega: Recoger en establecimiento/);
    assert.doesNotMatch(pickupMessage, /Dirección:/);

    await page.locator('[data-action="remove"]').click();
    assert.equal(await send.isDisabled(), true);
    assert.equal(await page.evaluate(() => calculateCartSubtotal()), 0);
    await page.evaluate(() => localStorage.setItem(siteConfig.order.storageKey, 'invalid json'));
    await page.reload();
    assert.equal(await page.locator('#header-cart-count').innerText(), '0');
    assert.equal(await page.evaluate(() => localStorage.getItem(siteConfig.order.storageKey)), null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log(`Flujo de Mireka Café verificado a ${width} px.`);
  } finally {
    await page.close();
  }
}

(async () => {
  const server = process.env.SITE_URL ? null : await startSite();
  const siteUrl = process.env.SITE_URL || `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    for (const width of [1440, 1023, 768, 390, 375]) await checkSite(browser, width, siteUrl);
  } finally {
    try { await browser?.close(); }
    finally { if (server) await new Promise(resolve => server.close(resolve)); }
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
