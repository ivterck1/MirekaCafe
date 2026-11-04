const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const results=[];
 fs.mkdirSync('docs/verification',{recursive:true});
 try {
 for(const width of [1440,390,375]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:8000');
  await page.waitForSelector('.menu-card');
  // Especialidades reales: seleccionar sin reordenar el catálogo ni sus filtros.
  const originalCategories=await page.locator('[data-category]').allTextContents();
  const availableNames=await page.evaluate(()=>menuItems.filter(p=>p.disponible).map(p=>p.nombre));
  async function checkFeatured(indices, expected) {
   await page.evaluate(indices=>{
    menuItems.forEach((p,i)=>{p.destacado=indices.includes(i);});
    renderFeaturedProducts();
   },indices);
   assert.deepEqual(await page.locator('#featured-grid h3').allTextContents(),expected);
   assert.deepEqual(await page.locator('[data-category]').allTextContents(),originalCategories);
  }
  await checkFeatured([1,3,5], [availableNames[1],availableNames[3],availableNames[5]]);
  await checkFeatured([3], [availableNames[3]]);
  await checkFeatured([1,3], [availableNames[1],availableNames[3]]);
  await checkFeatured([3,6], [availableNames[3]]); // El índice 6 está agotado.
  await checkFeatured([6], []);
  await checkFeatured([], availableNames.slice(0,3));
  await page.evaluate(()=>{menuItems.forEach(p=>{delete p.destacado;});renderFeaturedProducts();});
  assert.equal(await page.locator('[data-category]').count(),5);
  for(const category of ['Entradas','Platos principales','Postres','Bebidas','Temporada']) {
   await page.locator(`[data-category="${category}"]`).click();
   if(category==='Temporada')assert.match(await page.locator('#menu-grid').innerText(),/No hay productos/);
   else assert.ok(await page.locator('.menu-card').count()>0);
  }
  await page.locator('[data-category="Entradas"]').click();
  await page.locator('.menu-card button').first().click();
  if(width<768)await page.locator('#mobile-order-toggle').click();
  await page.locator('[data-action="increase"]').click();
  assert.equal(await page.evaluate(()=>calculateCartSubtotal()),130);
  await page.locator('[data-action="decrease"]').click();
  assert.equal(await page.evaluate(()=>calculateCartSubtotal()),65);
  assert.equal(await page.locator('#cart-total').innerText(),await page.locator('#cart-subtotal').innerText());
  await page.reload();
  assert.equal(await page.locator('#header-cart-count').innerText(),'1');
  if(width<768)await page.locator('#mobile-order-toggle').click();
  await page.locator('.whatsapp-button').click();
  assert.match(await page.locator('#order-message').innerText(),/nombre/);
  await page.locator('#customer-name').fill('Ana Prueba');
  await page.locator('[value="domicilio"]').check();
  await page.locator('.whatsapp-button').click();
  assert.match(await page.locator('#order-message').innerText(),/dirección/);
  await page.locator('#customer-address').fill('Calle de prueba 123');
  await page.locator('#order-notes').fill('Sin ingrediente de ejemplo');
  await page.locator('.whatsapp-button').click();
  assert.match(await page.locator('#order-message').innerText(),/Configura/);
  // Se intercepta la apertura: no se envía un pedido externo.
  await page.evaluate(()=>{siteConfig.whatsapp.enabled=true;window.open=url=>{window.testOrderUrl=url;};});
  await page.locator('.whatsapp-button').click();
  const url=await page.evaluate(()=>window.testOrderUrl);
  assert.match(url,/^https:\/\/wa.me\/5210000000000\?text=/);
  const message=new URL(url).searchParams.get('text');
  for(const text of ['Nombre del negocio','Ana Prueba','Calle de prueba 123','Sin ingrediente','Total:'])assert.ok(message.includes(text));
  await page.locator('[value="recoger"]').check();
  await page.locator('.whatsapp-button').click();
  assert.ok(!decodeURIComponent(await page.evaluate(()=>window.testOrderUrl)).includes('Dirección:'));
  if(width<768){
   await page.locator('#mobile-order-close').click();
   assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('order-panel-open')),false);
   await page.locator('.header-cart').click();
   assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('order-panel-open')),true);
  }
  await page.locator('[data-action="remove"]').click();
  assert.equal(await page.evaluate(()=>calculateCartSubtotal()),0);
  assert.ok(await page.locator('.whatsapp-button').isDisabled());
  await page.locator('.hero-actions a[href="#menu"]').click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>localStorage.setItem(siteConfig.order.storageKey,'invalid json'));
  await page.reload();
  assert.equal(await page.locator('#header-cart-count').innerText(),'0');
  await page.evaluate(()=>{menuItems.push({id:'new',nombre:'Nuevo',descripcion:'Demo',precio:20,categoria:'Nueva categoría',imagen:siteConfig.images.productPlaceholder,disponible:true});renderCategories();});
  await page.locator('[data-category="Nueva categoría"]').click();
  assert.match(await page.locator('#menu-grid').innerText(),/Nuevo/i);
  await page.reload();
  await page.waitForSelector('.menu-card');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`docs/verification/${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  results.push({width,status:'passed',consoleErrors:errors,horizontalOverflow:false});
  await page.close();
 }
 }finally{await browser.close();fs.writeFileSync('docs/test-results.json',JSON.stringify({date:'2026-10-22',results},null,2));}
})();


