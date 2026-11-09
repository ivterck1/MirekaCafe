const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {readMenu} = require('./generate-menu-html.cjs');
const {readCatalog, PERSISTENT_HEADERS, catalogItems} = require('./import-menu.cjs');
const {businessRows, previewBusiness, sheetName} = require('./business-preview.cjs');
const {loadBusiness} = require('./site-business-adapter.cjs');

const root = path.resolve(__dirname, '..');
const revision = '1b8307e5a994bccda7471a929ad64923f70c2a33';
const categoryIds = require('./catalog-category-ids.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const previewDirectory = path.join(root, 'tmp', 'catalogo-v2');
const templatePath = path.join(previewDirectory, 'menu-mireka-v2-control.xlsx');

function loadBaseline(source = execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'show', `${revision}:js/menu-data.js`], {cwd:root})) {
  const counts = new Map();
  const categories = [];
  const products = readMenu(source.toString('utf8')).map(product => {
    const {categoria} = product;
    const categoria_id = product.categoria_id || (Object.hasOwn(categoryIds, categoria) && categoryIds[categoria]);
    if (!Object.values(categoryIds).includes(categoria_id)) throw new Error(`Categoría sin ID base: ${categoria}`);
    if (!counts.has(categoria)) categories.push({categoria, id:categoria_id, orden:categories.length + 1});
    const orden = (counts.get(categoria) || 0) + 1;
    counts.set(categoria, orden);
    const prefix = 'assets/images/products/';
    if (!product.imagen.startsWith(prefix)) throw new Error(`Ruta base inesperada: ${product.imagen}`);
    return {...product, categoria_id, orden, imagen:product.imagen.slice(prefix.length)};
  });
  for (const [categoria, id] of Object.entries(categoryIds)) {
    if (!categories.some(category => category.id === id) && !counts.has(categoria)) categories.push({categoria, id, orden:categories.length + 1});
  }
  if (categories.length !== Object.keys(categoryIds).length || new Set(categories.map(category => category.id)).size !== categories.length) {
    throw new Error('El registro de IDs de categorías difiere de la base.');
  }
  return {source, categories, products};
}

function templateRows(base = loadBaseline(), business = loadBusiness(root)) {
  const rows = (headers, items) => [[...headers], ...items.map(item => headers.map(field => {
    const value = item[field];
    return typeof value === 'boolean' ? (value ? 'SI' : 'NO') : value;
  }))];
  return {
    MENU: rows(PERSISTENT_HEADERS.MENU, base.products),
    CATEGORIAS: rows(PERSISTENT_HEADERS.CATEGORIAS, base.categories),
    [sheetName]: businessRows(business.values)
  };
}

function compareSheet(report, sheet, proposed, original, fields) {
  const remaining = new Map(original.map((item, index) => [item.id, {item, row:index + 2}]));
  for (const current of proposed) {
    const previous = remaining.get(current.id);
    const location = {hoja:sheet, fila:current.row, id:current.id};
    if (current.alta && previous || !current.alta && !previous) {
      report.errores.push(`${sheet} fila ${current.row}: ID "${current.id}" ${previous ? 'ya existe; elimina el prefijo alta:' : 'desconocido; confirma un alta con alta:<id>'}.`);
      continue;
    }
    if (!previous) {
      const values = Object.fromEntries(fields.map(field => [field, current[field]]));
      report.cambios.push({...location, tipo:'alta propuesta', campo:null, anterior:null, nuevo:values});
      continue;
    }
    remaining.delete(current.id);
    for (const field of fields) {
      if (previous.item[field] !== current[field]) report.cambios.push({
        ...location, tipo:'modificación', campo:field, anterior:previous.item[field], nuevo:current[field]
      });
    }
  }
  for (const [id, {item, row}] of remaining) {
    report.cambios.push({
      hoja:sheet, fila:null, filaBase:row, id, tipo:'baja propuesta', campo:null,
      anterior:Object.fromEntries(fields.map(field => [field, item[field]])), nuevo:null
    });
  }
}

async function analyze(source, base = loadBaseline(), business = loadBusiness(root), siteRoot = root) {
  const parsed = await readCatalog(source, {preview:true, root:siteRoot});
  const report = {
    revisionBase:revision,
    hashesSha256:{excel:hash(source), catalogoBase:hash(base.source), idsCategorias:hash(JSON.stringify(categoryIds)), configuracionActual:hash(business.source)},
    modo:parsed.persistent ? 'ids-persistentes' : 'diagnóstico-migración',
    estado:'solo vista previa',
    errores:parsed.errors,
    advertencias:parsed.warnings,
    cambios:[],
    migracion:[]
  };
  if (parsed.persistent && !report.errores.length) {
    compareSheet(report, 'CATEGORIAS', parsed.categories, base.categories, ['categoria', 'orden']);
    compareSheet(report, 'MENU', parsed.products, base.products, PERSISTENT_HEADERS.MENU.filter(field => field !== 'id'));
    if (report.errores.length) report.cambios = [];
  } else if (!parsed.persistent && !report.errores.length) {
    for (const [sheet, rows, originals, key] of [
      ['CATEGORIAS', parsed.categories, base.categories, row => row.categoria],
      ['MENU', parsed.products, base.products, row => JSON.stringify([row.categoria, row.nombre])]
    ]) {
      for (const row of rows) {
        const matches = originals.filter(candidate => key(candidate) === key(row));
        const match = matches.length === 1 ? matches[0] : null;
        report.migracion.push({hoja:sheet, fila:row.row, id:match?.id ?? null,
          estado:match ? 'coincidencia exacta' : 'revisión manual'});
        if (!match) report.advertencias.push(`${sheet} fila ${row.row}: sin coincidencia exacta y unívoca.`);
      }
    }
  }
  if (parsed.persistent && parsed.businessSheet) {
    const {cambios, ...details} = previewBusiness(parsed.businessSheet, business.values);
    report.negocio = details;
    report.cambios.push(...cambios);
    for (const kind of ['errores', 'advertencias']) {
      for (const {hoja, fila, campo, mensaje} of details[kind]) {
        const location = [hoja, fila && `fila ${fila}`, campo].filter(Boolean).join(' ');
        report[kind].push(`${location}: ${mensaje}`);
      }
    }
  } else if (parsed.persistent) {
    report.advertencias.push('Sin hoja DATOS_NEGOCIO. Se revisó únicamente el catálogo.');
  }
  if (report.cambios.some(change => change.tipo === 'baja propuesta')) {
    report.advertencias.push('Las filas omitidas son bajas propuestas y requieren aprobación explícita.');
  }
  if (report.errores.length) report.estado = 'bloqueado';
  return {report, items:catalogItems(parsed.products, categoryIds)};
}

async function preview(...args) {
  return (await analyze(...args)).report;
}

async function main() {
  const [input, ...rest] = process.argv.slice(2);
  if (!input || rest.length || path.extname(input).toLowerCase() !== '.xlsx') {
    throw new Error('Uso: npm run menu:preview -- ruta/al/libro.xlsx');
  }
  const {review} = require('./candidate-plan.cjs');
  const {report} = await review(await fs.readFile(input));
  const output = await writePreview(report);
  console.log(`${report.estado} | ${report.cambios.length} cambios | ${report.errores.length} errores | ${report.advertencias.length} advertencias\n${output}`);
  if (report.errores.length) process.exitCode = 1;
}

async function writePreview(report) {
  const output = path.join(previewDirectory, `vista-previa-${report.hashesSha256.excel}.json`);
  await fs.mkdir(previewDirectory, {recursive:true});
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return output;
}

module.exports = {preview, analyze, loadBaseline, templateRows, templatePath, writePreview};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
