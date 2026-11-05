const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:8000';
const catalog = vm.runInNewContext(fs.readFileSync('js/menu-data.js', 'utf8') + '\nmenuItems;');
const missingImages = new Set(catalog.map(product => product.imagen)
  .filter(image => image && !fs.existsSync(image)));
const placeholder = fs.readFileSync('assets/images/products/placeholder.svg');

async function checkSite(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  let approvePrices = false;
  try {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('response', response => {
      if (response.status() >= 400) errors.push(response.url());
    });

    // Las fotos pendientes quedan fuera de esta prueba del flujo funcional.
    await page.route('**/assets/images/products/**', route => {
      const path = new URL(route.request().url()).pathname.slice(1);
      return missingImages.has(path)
        ? route.fulfill({ contentType: 'image/svg+xml', body: placeholder })
        : route.continue();
    });
    // Los valores aprobados y los precios de prueba solo existen en el navegador.
    await page.route('**/js/config.js?*', route => {
      if (!approvePrices) return route.continue();
      const config = fs.readFileSync('js/config.js', 'utf8');
      return route.fulfill({
        contentType: 'text/javascript',
        body: config + '\nsiteConfig.order.pricesApproved = true; siteConfig.whatsapp.enabled = true;'
      });
    });
    await page.route('**/js/menu-data.js?*', route => {
      if (!approvePrices) return route.continue();
      const data = fs.readFileSync('js/menu-data.js', 'utf8');
      return route.fulfill({
        contentType: 'text/javascript',
        body: data + '\nmenuItems[0].precio = 65;'
      });
    });
    await page.addInitScript(() => {
      window.testOrderUrls = [];
      window.open = url => window.testOrderUrls.push(url);
    });

    await page.goto(siteUrl);
    assert.equal(await page.title(), 'Mireka Café | Cafetería de Autor');
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
      const count = await page.locator('.menu-card').count();
      assert.ok(count > 0);
      assert.equal(await categoryStatus.innerText(), `${name} · ${count} ${count === 1 ? 'producto' : 'productos'}`);
    }
    await categories.last().click();
    assert.equal(await categorySelect.inputValue(), categoryNames.at(-1));
    await categories.first().click();
    assert.equal(await categorySelect.inputValue(), categoryNames[0]);
    assert.equal(await page.locator('#featured-grid h3').count(), 3);
    assert.doesNotMatch(await page.locator('#menu-grid, #featured-grid').allTextContents().then(parts => parts.join(' ')), /\$1\.00/);
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
    assert.doesNotMatch(await page.locator('#cart-items').innerText(), /\$1\.00/);
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
    await page.reload();
    assert.equal(await page.locator('#header-cart-count').innerText(), '1');
    await openCart();
    assert.match(await page.locator('#cart-total').innerText(), /65\.00/);
    const increase = page.locator('[data-action="increase"]');
    const decrease = page.locator('[data-action="decrease"]');
    await increase.focus();
    await page.keyboard.press('Enter');
    assert.equal(await increase.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => calculateCartSubtotal()), 130);
    await decrease.focus();
    await page.keyboard.press('Enter');
    assert.equal(await decrease.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => calculateCartSubtotal()), 65);

    await page.locator('#customer-name').fill('Ana Prueba');
    await page.locator('[value="domicilio"]').check();
    assert.equal(await address.isVisible(), true);
    assert.equal(await address.evaluate(input => input.required), true);
    await send.click();
    assert.match(await page.locator('#order-message').innerText(), /dirección/);
    assert.deepEqual(await page.evaluate(() => window.testOrderUrls), []);

    await address.fill('Calle de prueba 123');
    await send.click();
    const [deliveryUrl] = await page.evaluate(() => window.testOrderUrls);
    const delivery = new URL(deliveryUrl);
    assert.equal(delivery.origin + delivery.pathname, 'https://wa.me/525562524763');
    const deliveryMessage = delivery.searchParams.get('text');
    assert.match(deliveryMessage, /Mireka Café[\s\S]*Ana Prueba/);
    assert.match(deliveryMessage, /Entrega: Servicio a domicilio/);
    assert.match(deliveryMessage, /Dirección: Calle de prueba 123/);

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
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [1440, 1023, 768, 390, 375]) await checkSite(browser, width);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
