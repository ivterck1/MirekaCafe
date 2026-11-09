const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const XLSX = require('xlsx');
const {loadBaseline, preview, templateRows} = require('../tools/catalog-preview.cjs');
const {review, publicFiles, root} = require('../tools/candidate-plan.cjs');
const {prepareCandidates, writeCandidates} = require('../tools/generate-candidates.cjs');
const {readMenu} = require('../tools/generate-menu-html.cjs');
const {loadConfig} = require('../tools/sync-seo.cjs');
const {apply, restore} = require('../tools/menu-transaction.cjs');

const base = loadBaseline();
function workbook(edit = () => {}) {
  const rows = templateRows(base);
  edit(rows);
  const book = XLSX.utils.book_new();
  for (const [name, values] of Object.entries(rows)) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(values), name);
  }
  return XLSX.write(book, {type:'buffer', bookType:'xlsx'});
}

test('preserva los IDs, categorías y rutas de la revisión publicada', async () => {
  const rows = templateRows(base);
  assert.equal(rows.MENU.length - 1, 101);
  assert.equal(new Set(rows.MENU.slice(1).map(row => row[8])).size, 101);
  assert.equal(new Set(rows.MENU.slice(1).map(row => row[4])).size, 94);
  assert.equal(rows.CATEGORIAS.length - 1, 18);
  assert.deepEqual(rows.MENU.slice(1).map(row => [row[8], row[4]]), base.products.map(p => [p.id, p.imagen]));
  const source = workbook();
  const report = await preview(source);
  assert.deepEqual(report.errores, []);
  assert.deepEqual(report.cambios, []);
  assert.deepEqual(await preview(source), report);
  assert.match(report.hashesSha256.excel, /^[a-f0-9]{64}$/);
});

test('compara renombres, orden, categoría, disponibilidad, destacado e imagen por ID', async () => {
  const report = await preview(workbook(({MENU, CATEGORIAS}) => {
    CATEGORIAS[1][0] = 'Café de la casa';
    CATEGORIAS[1][1] = 30;
    for (const row of MENU.slice(1)) if (row[9] === CATEGORIAS[1][2]) row[0] = CATEGORIAS[1][0];
    const target = MENU[1];
    target[0] = CATEGORIAS[2][0];
    target[9] = CATEGORIAS[2][2];
    target[1] = 'Producto renombrado';
    target[4] = MENU[2][4];
    target[5] = target[5] === 'SI' ? 'NO' : 'SI';
    target[6] = 'NO';
    target[7] = 100;
  }));
  assert.deepEqual(report.errores, []);
  const changes = report.cambios.filter(change => change.id === base.products[0].id);
  assert.deepEqual(changes.map(change => change.campo), [
    'categoria', 'nombre', 'imagen', 'destacado', 'disponible', 'orden', 'categoria_id'
  ]);
  assert.ok(changes.every(change => change.hoja === 'MENU' && change.fila === 2));
  assert.ok(report.cambios.some(change => change.hoja === 'CATEGORIAS' && change.campo === 'orden'));
});

test('distingue altas explícitas y bajas propuestas de IDs desconocidos', async () => {
  const report = await preview(workbook(({MENU}) => {
    MENU[1][1] = 'Alta de prueba';
    MENU[1][8] = 'alta:producto-nuevo';
  }));
  assert.deepEqual(report.errores, []);
  assert.deepEqual(report.cambios.map(change => change.tipo), ['alta propuesta', 'baja propuesta']);
  assert.equal(report.cambios[1].fila, null);
  assert.match(report.advertencias.at(-1), /aprobación explícita/);
  const invalid = await preview(workbook(({MENU}) => { MENU[1][8] = 'error-de-captura'; }));
  assert.match(invalid.errores.join(), /desconocido/);
  assert.deepEqual(invalid.cambios, []);
});

test('bloquea duplicados, categorías incoherentes, fotos inexistentes, tipos y fórmulas', async () => {
  const report = await preview(workbook(({MENU, CATEGORIAS}) => {
    MENU[1][8] = MENU[2][8];
    MENU[1][9] = CATEGORIAS[3][2];
    MENU[2][4] = 'no-existe-en-mireka.webp';
    MENU[3][2] = 42;
    MENU[4][3] = {t:'n', v:1, f:'1+0'};
    CATEGORIAS[4][2] = CATEGORIAS[5][2];
  }));
  assert.equal(report.estado, 'bloqueado');
  for (const expected of [/MENU fila .*ID duplicado/, /CATEGORIAS fila .*ID duplicado/, /categoria_id/, /imagen inexistente/, /descripcion debe ser texto/, /no admite fórmulas/]) {
    assert.match(report.errores.join('\n'), expected);
  }
});

test('el formato sin IDs solo sugiere coincidencias exactas y unívocas', async () => {
  const report = await preview(workbook(rows => {
    rows.MENU.forEach(row => row.splice(8));
    rows.CATEGORIAS.forEach(row => row.splice(2));
    rows.MENU[1][1] = 'Producto renombrado';
  }));
  assert.equal(report.modo, 'diagnóstico-migración');
  assert.deepEqual(report.cambios, []);
  assert.deepEqual(report.errores, []);
  assert.equal(report.migracion.find(row => row.hoja === 'MENU' && row.fila === 2).id, null);
  assert.equal(report.migracion.find(row => row.hoja === 'MENU' && row.fila === 3).id, base.products[1].id);
});

test('un nombre ambiguo en la base tampoco obtiene ID en el diagnóstico', async () => {
  const source = workbook(rows => {
    rows.MENU.forEach(row => row.splice(8));
    rows.CATEGORIAS.forEach(row => row.splice(2));
  });
  const ambiguous = {...base, products:[...base.products, {...base.products[0], id:'otro-id'}]};
  const report = await preview(source, ambiguous);
  assert.equal(report.migracion.find(row => row.hoja === 'MENU' && row.fila === 2).id, null);
});

function editBusiness(rows, updates) {
  for (const row of rows.DATOS_NEGOCIO) {
    if (Object.hasOwn(updates, row[0])) row[1] = updates[row[0]];
  }
}

test('la plantilla comercial tiene tres hojas y cero diferencias', async () => {
  const source = workbook();
  assert.deepEqual(XLSX.read(source).SheetNames, ['MENU', 'CATEGORIAS', 'DATOS_NEGOCIO']);
  const report = await preview(source);
  assert.deepEqual(report.cambios, []);
  assert.deepEqual(report.negocio, {errores:[], advertencias:[], solicitudes:[]});
  assert.match(report.hashesSha256.configuracionActual, /^[a-f0-9]{64}$/);
});

test('prevé horario, teléfono, dirección y redes sin cambiar la configuración', async () => {
  const config = path.join(__dirname, '../js/config.js');
  const original = await fs.readFile(config);
  const report = await preview(workbook(rows => editBusiness(rows, {
    horario:'Horario de prueba', telefono:'001234567890', direccion:'Dirección de prueba',
    instagram:'https://www.instagram.com/perfil-prueba/', facebook:'@perfil_prueba',
    tiktok:'https://www.tiktok.com/@perfil_prueba'
  })));
  assert.deepEqual(report.errores, []);
  assert.deepEqual(report.cambios.map(change => change.campo), ['telefono', 'horario', 'direccion', 'instagram', 'tiktok']);
  assert.equal(report.cambios[0].nuevo, '001234567890');
  assert.equal(report.cambios[0].fila, 5);
  assert.equal(report.negocio.solicitudes[0].tipo, 'usuario pendiente');
  assert.equal(report.negocio.solicitudes[0].nuevo, '@perfil_prueba');
  assert.deepEqual(await fs.readFile(config), original);
});

test('un campo opcional vacío conserva la red y [BORRAR] propone retirarla', async () => {
  const business = {source:Buffer.from('configuración de prueba'), values:{
    instagram:'https://www.instagram.com/perfil/', facebook:'https://www.facebook.com/perfil'
  }};
  const report = await preview(workbook(rows => editBusiness(rows, {
    instagram:'[BORRAR]', facebook:'', nombre:'[BORRAR]'
  })), base, business);
  assert.deepEqual(report.cambios.filter(change => change.tipo === 'borrado propuesto'), [{
    hoja:'DATOS_NEGOCIO', fila:11, campo:'instagram', tipo:'borrado propuesto',
    anterior:business.values.instagram, nuevo:''
  }]);
  assert.ok(!report.cambios.some(change => change.campo === 'facebook'));
  assert.match(report.errores.join(), /nombre.*No se puede borrar/);
});

test('rechaza duplicados, claves desconocidas, fórmulas, números y redes ajenas', async () => {
  const report = await preview(workbook(rows => {
    editBusiness(rows, {
      telefono:5512345678, whatsapp:'123-456-789', horario:{t:'s', v:'texto', f:'"texto"'},
      instagram:'https://instagram.com.ejemplo.com/perfil', facebook:'http://facebook.com/perfil',
      tiktok:'https://usuario@www.tiktok.com/@perfil', moneda:'ZZZ', locale:'es_MX'
    });
    rows.DATOS_NEGOCIO.push(['nombre', 'Duplicado'], ['pricesApproved', 'SI']);
  }));
  assert.equal(report.estado, 'bloqueado');
  for (const field of ['telefono', 'whatsapp', 'horario', 'instagram', 'facebook', 'tiktok', 'moneda', 'locale', 'nombre', 'pricesApproved']) {
    assert.ok(report.negocio.errores.some(issue => issue.campo === field && issue.fila > 1), field);
  }
});

test('WhatsApp SI solo genera una solicitud y los libros previos siguen consultables', async () => {
  const source = workbook(rows => editBusiness(rows, {whatsapp_activo:'SI'}));
  const report = await preview(source);
  assert.deepEqual(report.errores, []);
  assert.deepEqual(report.cambios, []);
  assert.deepEqual(report.negocio.solicitudes, [{
    hoja:'DATOS_NEGOCIO', fila:7, campo:'whatsapp_activo', tipo:'activación solicitada',
    anterior:'NO', nuevo:'SI'
  }]);
  const old = await preview(workbook(rows => { delete rows.DATOS_NEGOCIO; }));
  assert.deepEqual(old.errores, []);
  assert.match(old.advertencias.join(), /Sin hoja DATOS_NEGOCIO/);
  const config = await fs.readFile(path.join(__dirname, '../js/config.js'), 'utf8');
  assert.match(config, /whatsapp:.*enabled: false/);
  assert.match(config, /pricesApproved: false/);
});

test('candidatos del libro original equivalen a producción y tienen huellas', async () => {
  const input = workbook();
  const {report} = await review(input);
  const prepared = await prepareCandidates(input, report);
  for (const file of publicFiles) assert.equal(prepared.files[file], prepared.originals[file].toString('utf8'));
  assert.equal(Object.keys(report.plan.dependenciasSha256).filter(file => file.endsWith('.webp')).length, 94);
});

test('genera JS, HTML y configuración coordinados y deterministas sin aplicar solicitudes', async () => {
  const input = workbook(rows => {
    rows.MENU[1][1] = 'Americano <de prueba>';
    editBusiness(rows, {horario:'Horario "candidato"', whatsapp_activo:'SI',
      instagram:'https://www.instagram.com/perfil-prueba/'});
  });
  const {report} = await review(input);
  const prepared = await prepareCandidates(input, report);
  assert.deepEqual(await prepareCandidates(input, report), prepared);
  const item = readMenu(prepared.files['js/menu-data.js'])[0];
  assert.equal(item.id, base.products[0].id);
  assert.equal(item.nombre, 'Americano <de prueba>');
  assert.equal(item.imagen, `assets/images/products/${base.products[0].imagen}`);
  assert.match(prepared.files['index.html'], /Americano &lt;de prueba&gt;/);
  const config = loadConfig(root, prepared.files['js/config.js']);
  assert.equal(config.contact.hours, 'Horario "candidato"');
  assert.equal(config.contact.instagram, '');
  assert.equal(config.whatsapp.enabled, false);
  assert.equal(config.order.pricesApproved, false);
  assert.deepEqual(prepared.report.impactosComerciales.find(item => item.campo === 'horario').superficies, ['contacto', 'footer']);
  const output = await writeCandidates(prepared);
  const changes = JSON.parse(await fs.readFile(path.join(output, 'reporte-diferencias.json'), 'utf8'));
  assert.deepEqual(changes.publicarTrasRevision, publicFiles);
  assert.match(await fs.readFile(path.join(output, 'diferencias.patch'), 'utf8'), /Horario .*candidato/);
  for (const file of publicFiles) assert.deepEqual(await fs.readFile(path.join(root, file)), prepared.originals[file]);
});

test('rechaza Excel modificado, vista previa editada y altas o bajas pendientes', async () => {
  const input = workbook();
  const {report} = await review(input);
  const modified = workbook(rows => { rows.MENU[1][1] = 'Cambio posterior'; });
  await assert.rejects(prepareCandidates(modified, report), /obsoleta/);
  await assert.rejects(prepareCandidates(input, {...report, revisionBase:'otra'}), /obsoleta/);
  const invalid = workbook(rows => { rows.MENU[1][4] = 'inexistente.webp'; });
  await assert.rejects(prepareCandidates(invalid, (await review(invalid)).report), /vista previa debe ser válida/);
  const proposal = workbook(rows => { rows.MENU[1][8] = 'alta:nuevo'; });
  await assert.rejects(prepareCandidates(proposal, (await review(proposal)).report), /altas o bajas pendientes/);
});

test('detecta origen y fotografías cambiados y conserva archivos ante un error de generación', async () => {
  const site = await fs.mkdtemp(path.join(os.tmpdir(), 'mireka-candidatos-'));
  // Solo se usa el directorio devuelto por mkdtemp bajo el temporal del sistema.
  const resolved = await fs.realpath(site);
  const relative = path.relative(await fs.realpath(os.tmpdir()), resolved);
  assert.match(relative, /^mireka-candidatos-[a-z0-9]+$/i);
  try {
    await fs.mkdir(path.join(site, 'js'));
    await fs.cp(path.join(root, 'assets/images/products'), path.join(site, 'assets/images/products'), {recursive:true});
    for (const file of publicFiles) await fs.copyFile(path.join(root, file), path.join(site, file));
    const input = workbook();
    const {report, originals} = await review(input, site);
    const htmlPath = path.join(site, 'index.html');
    const broken = originals['index.html'].toString().replace('<!-- MENU:START', '<!-- MENÚ:START');
    await fs.writeFile(htmlPath, broken);
    await assert.rejects(prepareCandidates(input, report, site), /obsoleta/);
    await assert.rejects(prepareCandidates(input, (await review(input, site)).report, site), /Bloque de catálogo/);
    assert.equal(await fs.readFile(htmlPath, 'utf8'), broken);
    await fs.writeFile(htmlPath, originals['index.html']);
    await fs.appendFile(path.join(site, 'assets/images/products', base.products[0].imagen), 'Cambio de prueba');
    await assert.rejects(prepareCandidates(input, report, site), /obsoleta/);
    for (const file of publicFiles) assert.deepEqual(await fs.readFile(path.join(root, file)), originals[file]);
  } finally {
    await fs.rm(resolved, {recursive:true, force:true});
  }
});

async function transactionFixture(t) {
  const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'mireka-control-'));
  const resolved = await fs.realpath(basePath);
  assert.match(path.relative(await fs.realpath(os.tmpdir()), resolved), /^mireka-control-[a-z0-9]+$/i);
  t.after(() => {
    if (!process.env.MIREKA_KEEP_TRANSACTION_EXAMPLE) return fs.rm(resolved, {recursive:true, force:true});
    console.log(`Ejemplo privado: ${resolved}`);
  });
  const siteRoot = path.join(resolved, 'sitio');
  const privateRoot = path.join(resolved, 'privado');
  await fs.mkdir(path.join(siteRoot, 'js'), {recursive:true});
  for (const file of publicFiles) await fs.copyFile(path.join(root, file), path.join(siteRoot, file));
  await fs.appendFile(path.join(siteRoot, 'js/config.js'),
    '\nsiteConfig.contact.verifiedSocial = {tiktok: "https://www.tiktok.com/@perfil_prueba"};\n');
  await fs.cp(path.join(root, 'assets/images/products'), path.join(siteRoot, 'assets/images/products'), {recursive:true});
  const input = workbook(rows => {
    rows.MENU[1][1] = 'Americano de prueba';
    editBusiness(rows, {horario:'Horario de prueba', descripcion:'Descripción de prueba & café',
      telefono:'+525500000001', tiktok:'https://www.tiktok.com/@perfil_prueba', mostrar_precios:'SI', whatsapp_activo:'SI'});
  });
  const {report, originals} = await review(input, siteRoot);
  const prepared = await prepareCandidates(input, report, siteRoot);
  const generated = await writeCandidates(prepared);
  const directory = path.join(resolved, 'candidato');
  await fs.cp(generated, directory, {recursive:true});
  const excel = path.join(resolved, 'entrada.xlsx');
  const plan = path.join(resolved, 'plan.json');
  await fs.writeFile(excel, input);
  await fs.writeFile(plan, JSON.stringify(report));
  const candidate = JSON.parse(await fs.readFile(path.join(directory, 'reporte-diferencias.json'), 'utf8'));
  return {options:{excel, plan, directory, approval:candidate.aprobacionSha256, siteRoot, privateRoot},
    originals, prepared, candidate};
}

test('aplica el conjunto aprobado, respalda, registra y restaura sin modificar fotos', async t => {
  const {options, originals, prepared, candidate} = await transactionFixture(t);
  const photo = path.join(options.siteRoot, 'assets/images/products', base.products[0].imagen);
  const beforePhoto = await fs.readFile(photo);
  const backup = await apply(options);
  for (const file of publicFiles) assert.equal(await fs.readFile(path.join(options.siteRoot, file), 'utf8'), prepared.files[file]);
  const config = loadConfig(options.siteRoot);
  assert.equal(config.contact.hours, 'Horario de prueba');
  assert.equal(config.contact.phone, '+525500000001');
  assert.equal(config.contact.tiktok, 'https://www.tiktok.com/@perfil_prueba');
  assert.equal(config.seo.description, config.business.description);
  assert.match(prepared.files['index.html'], /<p>Descripción de prueba &amp; café<\/p>/);
  assert.match(prepared.files['index.html'], /name="description" content="Descripción de prueba &amp; café"/);
  assert.match(prepared.files['index.html'], /href="tel:\+525500000001"/);
  assert.match(prepared.files['index.html'], /href="https:\/\/www\.tiktok\.com\/@perfil_prueba"/);
  assert.equal(config.order.pricesApproved, false);
  assert.equal(config.whatsapp.enabled, false);
  const manifest = await fs.readFile(path.join(backup, 'ARCHIVOS_PARA_PUBLICAR.txt'), 'utf8');
  for (const file of candidate.archivos) assert.ok(manifest.includes(`${file.ruta} | ${file.sha256Candidato}`));
  assert.match(manifest, /NO PUBLICAR/);
  const html = path.join(options.siteRoot, 'index.html');
  await fs.appendFile(html, 'Cambio posterior');
  const target = {...options, id:path.basename(backup)};
  await assert.rejects(restore(target), /Cambio posterior/);
  await fs.writeFile(html, prepared.files['index.html']);
  await restore(target);
  for (const file of publicFiles) assert.deepEqual(await fs.readFile(path.join(options.siteRoot, file)), originals[file]);
  assert.deepEqual(await fs.readFile(photo), beforePhoto);
  const log = await fs.readFile(path.join(backup, 'BITACORA.txt'), 'utf8');
  for (const expected of [/UTC/, /mostrar_precios/, /whatsapp_activo/, /Horario de prueba/, /Aplicación verificada/, /Restauración verificada/]) {
    assert.match(log, expected);
  }
  await fs.access(path.join(backup, 'ARCHIVOS_PARA_PUBLICAR.anulado.txt'));
});

test('rechaza aprobación distinta, rutas fuera de lista, candidato alterado y plan obsoleto', async t => {
  const {options, originals} = await transactionFixture(t);
  await assert.rejects(apply({...options, approval:'0'.repeat(64)}), /Aprobación/);
  const extra = path.join(options.directory, 'sitio/js/app.js');
  await fs.writeFile(extra, 'archivo fuera de alcance');
  await assert.rejects(apply(options), /fuera de la lista/);
  await fs.unlink(extra);
  const patch = path.join(options.directory, 'diferencias.patch');
  const saved = await fs.readFile(patch);
  await fs.appendFile(patch, 'alterado');
  await assert.rejects(apply(options), /alterado/);
  await fs.writeFile(patch, saved);
  await fs.appendFile(options.excel, 'modificado después de vista previa');
  await assert.rejects(apply(options), /obsoleta/);
  for (const file of publicFiles) assert.deepEqual(await fs.readFile(path.join(options.siteRoot, file)), originals[file]);
});

test('recupera una escritura parcial y bloquea ejecución simultánea', async t => {
  const {options, originals} = await transactionFixture(t);
  let writes = 0;
  await assert.rejects(apply({...options, async afterWrite() {
    writes++;
    await assert.rejects(apply(options), /otra operación/);
    throw new Error('Interrupción simulada');
  }}), /Interrupción simulada/);
  assert.equal(writes, 1);
  assert.notDeepEqual(await fs.readFile(path.join(options.siteRoot, 'js/menu-data.js')), originals['js/menu-data.js']);
  await assert.rejects(apply(options), /Recupera primero/);
  const id = (await fs.readdir(options.privateRoot)).find(name => name.startsWith('respaldo-'));
  await restore({...options, id, recover:true});
  for (const file of publicFiles) assert.deepEqual(await fs.readFile(path.join(options.siteRoot, file)), originals[file]);
});
