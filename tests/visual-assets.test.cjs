const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('logo local, marfil y espacio del hero permanecen estables durante la carga', async (t) => {
  const root = path.resolve(__dirname, '..');
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': pathname === '/' ? 'no-cache' : 'public, max-age=3600' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const heroPath = '**/assets/images/hero/mireka-hero-desktop.webp';
  const geometry = () => ({
    hero: document.querySelector('#inicio').getBoundingClientRect().toJSON(),
    media: document.querySelector('.hero-media').getBoundingClientRect().toJSON(),
  });
  const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  for (const width of [320, 390, 768, 1024, 1440]) {
    await t.test(`${width} px: reserva antes de la fotografía y un único logo`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 3 });
      const errors = [], requests = [], statuses = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => requests.push(r.url()));
      page.on('response', r => { if (r.url().includes('mireka-logo-web.webp')) statuses.push(r.status()); });
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route(heroPath, async route => { await gate; if (!page.isClosed()) await route.continue(); });
      try {
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.querySelectorAll('.brand img,.story-card img,.footer-content img')].map(i => i.decode()));
        });
        const before = await page.evaluate(geometry);
        assert.equal(await page.locator('.hero-media').evaluate(e => e.childElementCount), 0);
        assert.ok(before.media.height > 0, 'la superficie vacía ya reserva espacio');
        const assets = await page.evaluate(() => {
          const logos = [...document.querySelectorAll('.brand img,.story-card img,.footer-content img')];
          const canvas = document.createElement('canvas');
          canvas.width = logos[0].naturalWidth; canvas.height = logos[0].naturalHeight;
          const context = canvas.getContext('2d'); context.drawImage(logos[0], 0, 0);
          return { alpha: context.getImageData(0, 0, 1, 1).data[3],
            logos: logos.map(i => ({ src: i.currentSrc, naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight,
              ratio: i.getBoundingClientRect().width / i.getBoundingClientRect().height })),
            theme: document.querySelector('meta[name="theme-color"]').content,
            backgrounds: ['html', 'body', '.site-header'].map(s => getComputedStyle(document.querySelector(s)).backgroundColor),
            bodyImage: getComputedStyle(document.body).backgroundImage,
            heroBackground: getComputedStyle(document.querySelector('#inicio')).backgroundColor };
        });
        assert.equal(assets.alpha, 0, 'transparencia conservada');
        assert.equal(assets.theme, '#FFF9F6');
        assert.deepEqual(assets.backgrounds, Array(3).fill('rgb(255, 249, 246)'));
        assert.equal(assets.bodyImage, 'none');
        assert.equal(assets.heroBackground, 'rgb(89, 15, 25)');
        assert.equal(new Set(assets.logos.map(i => i.src)).size, 1);
        for (const logo of assets.logos) {
          assert.equal(logo.naturalWidth, 768); assert.equal(logo.naturalHeight, 496);
          assert.ok(Math.abs(logo.ratio - 768 / 496) < 0.003, 'logo proporcionado');
        }
        assert.equal(requests.filter(url => url.includes('mireka-logo.png')).length, 0);
        assert.equal(requests.filter(url => url.includes('mireka-logo-web.webp')).length, 1);
        assert.deepEqual(statuses, [200]);
        release();
        await page.waitForFunction(() => document.querySelector('.hero-photo')?.complete);
        await frame(page);
        assert.deepEqual(await page.evaluate(geometry), before, 'insertar la foto no cambia la geometría');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        await page.unroute(heroPath);
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal(await page.locator('.brand img').evaluate(i => i.complete && i.naturalWidth === 768), true);
        assert.ok((await page.evaluate(geometry)).media.height > 0, 'reserva también con caché caliente');
      } finally { release(); await page.close(); }
    });

    await t.test(`${width} px: fotografía ausente conserva respaldo vino`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route(heroPath, route => route.fulfill({ status: 404, body: 'Foto no disponible' }));
      try {
        await page.goto(base, { waitUntil: 'networkidle' });
        const bounds = await page.evaluate(geometry);
        assert.ok(bounds.media.height > 0);
        assert.equal(await page.locator('.hero-photo').count(), 0, 'sin imagen rota');
        assert.equal(await page.locator('.hero-media').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(89, 15, 25)');
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }

  await t.test('fuentes tardías y cambio de orientación conservan el área fotográfica', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/*.woff2', async route => { await gate; if (!page.isClosed()) await route.continue(); });
    try {
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      const initial = await page.evaluate(geometry);
      await page.waitForFunction(() => document.querySelector('.hero-photo')?.complete);
      assert.equal((await page.evaluate(geometry)).media.height, initial.media.height);
      release();
      await page.evaluate(() => document.fonts.ready);
      assert.equal((await page.evaluate(geometry)).media.height, initial.media.height, 'las fuentes no cambian la reserva de imagen');
      await page.setViewportSize({ width: 844, height: 390 });
      await frame(page);
      const landscape = await page.evaluate(geometry);
      assert.ok(Math.abs(landscape.media.height - 844 / 1.5) < 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.setViewportSize({ width: 390, height: 900 });
      await frame(page);
      assert.equal((await page.evaluate(geometry)).media.height, initial.media.height);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    } finally { release(); await page.close(); }
  });
});
