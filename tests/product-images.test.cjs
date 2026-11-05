const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('el sitio sustituye imágenes vacías, ausentes y corruptas con un respaldo local', async (t) => {
  const root = path.resolve(__dirname, '..');
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'mireka-images-'));
  const corruptFile = path.join(fixture, 'corrupt.webp');
  await fs.writeFile(corruptFile, 'Archivo que no se puede decodificar como WebP.');
  t.after(async () => {
    await fs.unlink(corruptFile);
    await fs.rmdir(fixture);
  });

  const photo = '/assets/images/hero/mireka-hero-desktop.webp';
  const missing = '/fixtures/absent.webp';
  const corrupt = '/fixtures/corrupt.webp';
  const fallback = '/assets/images/products/placeholder.svg';
  const missingFallback = '/fixtures/absent-fallback.svg';
  const products = ['', missing, corrupt, photo].map((imagen, index) => ({
    id: `test-${index}`, nombre: `Producto ${index}`, categoria: 'Prueba',
    descripcion: 'Prueba de imagen', precio: 10, disponible: true,
    destacado: index < 3, imagen
  }));
  const catalog = `const menuItems = ${JSON.stringify(products)};`;
  const requests = [];
  let failFallback = false;
  const types = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css',
    '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2'
  };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = pathname.startsWith('/fixtures/')
      ? path.join(fixture, path.basename(pathname))
      : path.resolve(root, `.${pathname}`);
    let body;
    let status = 200;
    try {
      body = pathname === '/js/menu-data.js' ? catalog : await fs.readFile(file);
      if (failFallback && pathname === '/js/config.js') {
        body += `\nsiteConfig.images.productPlaceholder = "${missingFallback}";`;
      }
    } catch (error) {
      status = error.code === 'ENOENT' ? 404 : 500;
      body = '';
    }
    requests.push([pathname, status]);
    res.writeHead(status, {
      'Content-Type': types[path.extname(pathname)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url);

  async function expectImage(locator, expectedPath, state, loading) {
    await locator.scrollIntoViewIfNeeded();
    const image = await locator.elementHandle();
    await page.waitForFunction(({ image, expectedPath }) =>
      image.complete && image.naturalWidth > 0 && new URL(image.currentSrc).pathname === expectedPath,
    { image, expectedPath });
    await image.dispose();
    assert.equal(await locator.getAttribute('data-image-state'), state);
    assert.equal(await locator.getAttribute('loading'), loading);
    assert.ok(await locator.isVisible());
  }

  const menu = page.locator('.menu-card .dish-image img');
  const featured = page.locator('.specialty-card img');
  const cart = page.locator('.cart-item-image');
  for (let index = 0; index < products.length; index++) {
    const usingFallback = index < 3;
    const source = usingFallback ? fallback : photo;
    const state = usingFallback ? 'fallback' : null;
    await expectImage(menu.nth(index), source, state, 'lazy');
    if (usingFallback) await expectImage(featured.nth(index), source, state, null);
    await page.locator(`[data-product-id="test-${index}"]`).first().click();
    await expectImage(cart.nth(index), source, state, 'lazy');
  }
  assert.ok(requests.some(([file, status]) => file === missing && status === 404));
  assert.ok(requests.some(([file, status]) => file === corrupt && status === 200));

  failFallback = true;
  await page.reload();
  const terminal = featured.first();
  await page.waitForFunction(() => document.querySelector('.specialty-card img')?.dataset.imageState === 'unavailable');
  assert.ok(requests.some(([file, status]) => file === missingFallback && status === 404));
  assert.equal(await terminal.isVisible(), false);
  const count = requests.filter(([file]) => file === missingFallback).length;
  const noRetry = assert.rejects(page.waitForRequest(
    request => new URL(request.url()).pathname === missingFallback, { timeout: 350 }
  ), { name: 'TimeoutError' });
  await terminal.dispatchEvent('error');
  await terminal.dispatchEvent('error');
  await noRetry;
  assert.equal(await terminal.getAttribute('data-image-state'), 'unavailable');
  assert.equal(requests.filter(([file]) => file === missingFallback).length, count);
  await page.close();
});
