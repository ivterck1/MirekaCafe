const fs = require('node:fs/promises');
const path = require('node:path');
const XLSX = require('xlsx');
const ROOT = path.resolve(__dirname, '..');
const HEADERS = {
  MENU: ['categoria', 'nombre', 'descripcion', 'precio', 'imagen', 'destacado', 'disponible', 'orden'],
  CATEGORIAS: ['categoria', 'orden']
};
const text = value => typeof value === 'string' ? value.trim() : '';
const slug = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function generate(input = path.join(ROOT, 'templates/menu-cliente.xlsx'), {write = false, root = ROOT} = {}) {
  const book = XLSX.read(await fs.readFile(input), {
    sheets: Object.keys(HEADERS), cellDates: true, cellFormula: true,
    cellHTML: false, cellText: false, bookVBA: false, sheetStubs: true
  });
  const errors = [], warnings = [];
  function rows(name) {
    const sheet = book.Sheets[name];
    if (!sheet) { errors.push(`Falta la hoja ${name}.`); return []; }
    const headers = HEADERS[name];
    const hasFormula = cell => cell.f != null || cell.F != null;
    const populatedRows = new Map();
    let extraColumn = false;
    for (const [address, cell] of Object.entries(sheet)) {
      if (address.startsWith('!') || (!hasFormula(cell) && (cell.v == null || cell.v === ''))) continue;
      const {r, c} = XLSX.utils.decode_cell(address);
      if (c >= headers.length) { extraColumn = true; continue; }
      if (!populatedRows.has(r)) populatedRows.set(r, []);
      populatedRows.get(r)[c] = cell;
    }
    const header = populatedRows.get(0) || [];
    if (extraColumn || headers.some((h, i) => !header[i] || hasFormula(header[i]) || header[i].t !== 's' || header[i].v !== h)) {
      errors.push(`${name}: columnas incorrectas; usa ${headers.join(', ')}.`); return [];
    }
    const result = [];
    for (const [r, cells] of [...populatedRows].sort(([a], [b]) => a - b)) {
      if (r === 0) continue;
      const n = r + 1;
      const values = headers.map((h, i) => {
        const cell = cells[i];
        if (!cell) return null;
        if (hasFormula(cell)) {
          errors.push(`${name} fila ${n}: ${h} no admite fórmulas.`);
          return null;
        }
        if (cell.t === 's') return cell.v.trim();
        if (cell.t === 'n' && Number.isFinite(cell.v)) return cell.v;
        return null;
      });
      const item = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
      item.row = n;
      for (const h of headers) if (item[h] == null || text(item[h]) === '' && typeof item[h] !== 'number') errors.push(`${name} fila ${n}: ${h} vacío o no es un valor simple.`);
      result.push(item);
    }
    return result;
  }
  const categories = rows('CATEGORIAS');
  const products = rows('MENU');
  if (!categories.length) errors.push('CATEGORIAS: agrega al menos una categoría.');
  if (!products.length) errors.push('MENU: agrega al menos un producto.');
  const names = new Map(), ids = new Set(), productKeys = new Set();
  function order(item, sheet) {
    if (typeof item.orden !== 'number' || !Number.isSafeInteger(item.orden) || item.orden <= 0) errors.push(`${sheet} fila ${item.row}: orden inválido; debe ser entero positivo.`);
  }
  for (const c of categories) {
    c.categoria = text(c.categoria);
    if (names.has(c.categoria)) errors.push(`CATEGORIAS fila ${c.row}: categoría duplicada "${c.categoria}".`);
    names.set(c.categoria, c);
    order(c, 'CATEGORIAS');
  }
  for (const p of products) {
    const fail = message => errors.push(`MENU fila ${p.row}: ${message}.`);
    p.nombre = text(p.nombre); p.categoria = text(p.categoria); p.descripcion = text(p.descripcion); p.imagen = text(p.imagen);
    const categorySlug = slug(p.categoria);
    const nameSlug = slug(p.nombre);
    p.id = `${categorySlug}-${nameSlug}`;
    if (!categorySlug || !nameSlug) fail('categoría o nombre no genera un ID seguro');
    else {
      const key = JSON.stringify([p.categoria, p.nombre]);
      if (productKeys.has(key)) fail(`producto duplicado dentro de la categoría "${p.categoria}": "${p.nombre}"`);
      else if (ids.has(p.id)) fail(`ID duplicado "${p.id}" tras normalizar categoría y nombre`);
      productKeys.add(key);
      ids.add(p.id);
    }
    if (!names.has(p.categoria)) fail(`categoría "${p.categoria}" no existe`);
    if (typeof p.precio === 'string' && /^\d+(\.\d+)?$/.test(p.precio.trim())) p.precio = Number(p.precio.trim());
    if (typeof p.precio !== 'number' || !Number.isFinite(p.precio) || p.precio < 0) fail('precio inválido; usa un número no negativo');
    for (const key of ['destacado', 'disponible']) {
      const value = text(p[key]);
      if (!['SI', 'NO'].includes(value)) fail(`${key} debe ser SI o NO`);
      p[key] = value === 'SI';
    }
    order(p, 'MENU');
    if (!/^[a-z0-9][a-z0-9_-]*\.(webp|png|jpe?g|svg)$/.test(p.imagen) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])\./i.test(p.imagen)) fail('nombre de imagen problemático; usa minúsculas, números, guiones y extensión válida, sin rutas');
    else {
      try { if (!(await fs.stat(path.join(root, 'assets/images/products', p.imagen))).isFile()) throw new Error(); }
      catch { warnings.push(`Imagen pendiente: ${p.imagen}`); }
    }
    if (p.descripcion.length > 140) warnings.push(`MENU fila ${p.row}: descripción mayor a 140 caracteres.`);
    if (p.destacado && !p.disponible) warnings.push(`MENU fila ${p.row}: destacado no disponible; no aparecerá en especialidades.`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  categories.sort((a, b) => a.orden - b.orden || a.row - b.row);
  const rank = new Map(categories.map((c, i) => [c.categoria, i]));
  products.sort((a, b) => rank.get(a.categoria) - rank.get(b.categoria) || a.orden - b.orden || a.row - b.row);
  for (const c of categories) if (!products.some(p => p.categoria === c.categoria)) warnings.push(`Categoría sin productos: ${c.categoria}; el motor no mostrará su filtro.`);
  const items = products.map(p => ({id:p.id, nombre:p.nombre, descripcion:p.descripcion, precio:p.precio, categoria:p.categoria, imagen:`assets/images/products/${p.imagen}`, disponible:p.disponible, destacado:p.destacado}));
  const code = '// Generado desde Excel. Categorías y productos ordenados; destacado selecciona especialidades.\nconst menuItems = ' + JSON.stringify(items, null, 2) + ';\n';
  const output = path.join(root, write ? 'js/menu-data.js' : 'tmp/menu-data.generated.js');
  await fs.mkdir(path.dirname(output), {recursive:true});
  await fs.writeFile(output, code, 'utf8');
  return {output, warnings, items};
}

async function main(args) {
  if (args.includes('--help')) { console.log('node tools/import-menu.cjs [archivo.xlsx] [--write]'); return; }
  const files = args.filter(a => !a.startsWith('--'));
  if (files.length > 1 || args.some(a => a.startsWith('--') && a !== '--write')) throw new Error('Argumentos inválidos. Usa [archivo.xlsx] [--write].');
  const result = await generate(files[0] ? path.resolve(files[0]) : undefined, {write:args.includes('--write')});
  result.warnings.forEach(w => console.warn(w));
  console.log(`Menú generado: ${result.output} (${result.items.length} productos). DATOS_NEGOCIO se aplica manualmente en config.js.`);
}
if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {generate};
