const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('anclas, historial y navegación activa conservan catálogo y carrito', async (t) => {
  const root = path.resolve(__dirname, '..');
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    try {
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

  const widths = process.env.NAV_TEST_WIDTHS?.split(',').map(Number) ?? [320, 390, 768, 1024, 1440];
  for (const width of widths) {
    await t.test(`${width} px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        window.testOpened = [];
        window.open = url => window.testOpened.push(url);
        window.lastTestScroll = performance.now();
        window.addEventListener('scroll', () => { window.lastTestScroll = performance.now(); }, { capture: true });
        window.addEventListener('DOMContentLoaded', () => {
          new MutationObserver(() => {
            if (document.querySelector('.hero-photo')) window.testHeroImageAt = performance.now();
          }).observe(document.querySelector('.hero-media'), { childList: true });
        });
      });
      try {
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);

        const active = async hash => {
          await page.waitForTimeout(100);
          await page.waitForFunction(() => performance.now() - window.lastTestScroll > 250);
          await page.waitForFunction(hash => {
            const selected = document.querySelectorAll('.nav-links a[aria-current="location"]');
            return selected.length === 1 && selected[0].hash === hash && selected[0].classList.contains('is-active');
          }, hash, { timeout: 5000 }).catch(async () => {
            throw new Error(`Estado esperado ${hash}: ${JSON.stringify(await page.evaluate(() => ({ hash: location.hash,
              active: document.querySelector('.nav-links [aria-current]')?.hash,
              scroll: scrollY, targets: [...document.querySelectorAll('.nav-links a')].map(a => ({ hash: a.hash,
                top: document.querySelector(a.hash).getBoundingClientRect().top })) })))}`);
          });
          assert.equal(await page.locator('.nav-links a.is-active').count(), 1);
        };
        const uncovered = async selector => {
          await page.waitForFunction(selector => {
            const node = document.querySelector(selector);
            const rect = node.getBoundingClientRect();
            return rect.top >= document.querySelector('.site-header').getBoundingClientRect().bottom - 1
              && rect.bottom <= innerHeight;
          }, selector, { timeout: 5000 }).catch(async () => {
            throw new Error(`Destino cubierto ${selector}: ${JSON.stringify(await page.locator(selector).boundingBox())}`);
          });
        };

        await active('#inicio');
        await page.locator('.hero-actions .primary-button').focus();
        await page.keyboard.press('Enter');
        await active('#menu');
        await uncovered('#menu-title');
        assert.equal(await page.evaluate(() => location.hash), '#menu');

        // La navegación de escritorio es visible desde 1024; en móvil/tablet
        // comprobamos la misma ancla por hash, conservando los controles existentes.
        if (width >= 1024) await page.locator('.nav-links a[href="#especialidades"]').click();
        else await page.evaluate(() => { location.hash = '#especialidades'; });
        await active('#especialidades');
        await uncovered('#specialties-title');
        await page.goBack();
        await active('#menu');
        await uncovered('#menu-title');
        await page.goForward();
        await active('#especialidades');

        // Un desplazamiento real de rueda cambia el estado, no el historial/hash.
        await page.waitForTimeout(700);
        await page.mouse.move(100, 400);
        const distance = await page.locator('#menu').evaluate(e =>
          e.getBoundingClientRect().top - document.querySelector('.site-header').getBoundingClientRect().bottom + 40);
        await page.mouse.wheel(0, distance);
        await active('#menu');
        assert.equal(await page.evaluate(() => location.hash), '#especialidades');

        // La fila mantiene foco, orden y estado sincronizado con el selector.
        const names = await page.locator('#category-select option').allTextContents();
        assert.equal(names.length, 18);
        for (const category of names) {
          await page.locator('#category-select').selectOption(category);
          assert.equal(await page.locator('[data-category][aria-pressed="true"]').getAttribute('data-category'), category);
        }
        await page.locator('[data-category]').first().click();
        assert.equal(await page.locator('#category-select').inputValue(), names[0]);
        await page.locator('.menu-card button').first().click();
        await page.waitForTimeout(400);
        await page.locator('.header-cart').click();
        if (width < 768) {
          await active('#pedido');
          assert.equal(await page.locator('dialog').evaluate(e => e.matches(':modal')), true);
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('.header-cart').evaluate(e => e === document.activeElement), true);
          await page.waitForFunction(() => document.querySelector('.nav-links [aria-current]')?.hash !== '#pedido');
          assert.equal(await page.locator('.nav-links a[aria-current]').count(), 1);
          await page.locator('.header-cart').click();
        } else {
          await page.locator('.nav-links a[href="#pedido"]').evaluate(e => e.click());
          await active('#pedido');
          await uncovered('#order-title');
          assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
          await page.locator('.header-cart').click();
          await active('#pedido');
          await uncovered('#cart-title');
        }
        await page.locator('#customer-name').fill('Prueba de navegación');
        await page.locator('[value="domicilio"]').check();
        assert.equal(await page.locator('#customer-address').evaluate(e => e.required), true);
        const plus = page.locator('[data-action="increase"]');
        await plus.focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('[data-action="increase"]').evaluate(e => e === document.activeElement), true);
        await page.evaluate(() => {
          const button = document.querySelector('.whatsapp-button');
          button.disabled = false;
          button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          handleWhatsAppClick();
          updateWhatsAppButtonState();
        });
        assert.deepEqual(await page.evaluate(() => window.testOpened), []);
        assert.equal(await page.evaluate(() => siteConfig.order.pricesApproved), true);
        assert.equal(await page.evaluate(() => siteConfig.whatsapp.enabled), true);
        assert.equal(await page.evaluate(() => menuItems.length), 101);
        if (width < 768) await page.keyboard.press('Escape');
        await page.reload({ waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('#header-cart-count').innerText(), '2');

        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.locator('.brand').click();
        await active('#inicio');
        await uncovered('.hero .eyebrow');
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
        await page.goto(`${base}/#especialidades`, { waitUntil: 'networkidle' });
        await active('#especialidades');
        await uncovered('#specialties-title');
        await page.evaluate(() => { location.hash = '#pedido'; });
        await active('#pedido');
        if (width < 768) {
          assert.equal(await page.locator('dialog').evaluate(e => e.matches(':modal')), true);
          await page.goBack();
          await active('#especialidades');
          assert.equal(await page.locator('dialog').evaluate(e => e.open), false);
        } else await uncovered('#order-title');

        // Regresión A03: recargar, iniciar otra ancla y volver mientras Chrome
        // todavía desplaza la página. Alterna recarga forzada, teclado y movimiento.
        const repetitions = [];
        const cdp = await page.context().newCDPSession(page);
        const homeGeometry = () => {
          const header = document.querySelector('.site-header').getBoundingClientRect();
          const hero = document.querySelector('#inicio').getBoundingClientRect();
          const label = document.querySelector('.hero .eyebrow').getBoundingClientRect();
          const overlapWidth = Math.max(0, Math.min(header.right, label.right, innerWidth) - Math.max(header.left, label.left, 0));
          const overlapHeight = Math.max(0, Math.min(header.bottom, label.bottom, innerHeight) - Math.max(header.top, label.top, 0));
          return { scrollY, header: header.toJSON(), hero: hero.toJSON(), label: label.toJSON(),
            overlapArea: overlapWidth * overlapHeight, hash: location.hash,
            active: document.querySelector('.nav-links [aria-current]')?.hash,
            imageLoadedAt: window.testHeroImageAt, imageComplete: document.querySelector('.hero-photo')?.complete };
        };
        const homeStable = async () => {
          await page.evaluate(() => document.fonts.ready);
          await page.waitForFunction(() => scrollY === 0 && location.hash === '#inicio'
            && document.querySelector('.nav-links [aria-current]')?.hash === '#inicio'
            && performance.now() - window.lastTestScroll > 300);
          const first = await page.evaluate(homeGeometry);
          await page.waitForTimeout(200);
          const result = await page.evaluate(homeGeometry);
          assert.equal(result.scrollY, first.scrollY, 'scroll estable');
          assert.deepEqual(result.label, first.label, 'layout estable');
          assert.equal(result.overlapArea, 0, JSON.stringify(result));
          assert.ok(result.label.top >= 0 && result.label.bottom <= 900, 'etiqueta visible');
          assert.equal(result.hash, '#inicio');
          assert.equal(result.active, '#inicio');
          assert.equal(result.imageComplete, true);
          return result;
        };
        for (let repeat = 0; repeat < 5; repeat++) {
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await page.goto(`${base}/#inicio`, { waitUntil: 'networkidle' });
          await homeStable(); // entrada directa
          const forced = repeat % 2 === 1;
          await Promise.all([page.waitForEvent('domcontentloaded'), cdp.send('Page.reload', { ignoreCache: forced })]);
          await page.waitForLoadState('networkidle');
          await page.locator('.hero-actions .primary-button').evaluate(link => link.click());
          await page.waitForFunction(() => scrollY > document.querySelector('.site-header').getBoundingClientRect().height);
          const reduced = repeat % 2 === 0;
          if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
          const before = await page.evaluate(homeGeometry);
          const keyboard = repeat % 2 === 1;
          if (keyboard) {
            await page.locator('.brand').evaluate(link => link.focus({ preventScroll: true }));
            await page.keyboard.press('Enter');
          } else await page.locator('.brand').click();
          const after = await homeStable();
          repetitions.push({ width, repeat: repeat + 1, forced, reduced, keyboard, before, after });
        }
        await cdp.detach();
        // Volver a Inicio por historial conserva también el ancla y el estado.
        await page.locator('.hero-actions .primary-button').click();
        await active('#menu');
        await page.goBack();
        await active('#inicio');
        await homeStable();
        if (process.env.NAV_EVIDENCE_DIR) {
          await fs.writeFile(path.join(process.env.NAV_EVIDENCE_DIR, `repeticiones-${width}.json`), JSON.stringify(repetitions, null, 2));
          await page.screenshot({ path: path.join(process.env.NAV_EVIDENCE_DIR, `inicio-corregido-${width}.png`) });
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
});
