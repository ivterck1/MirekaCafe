const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = fs.realpathSync(path.resolve(__dirname, '..'));
const approved = fs.readFileSync(path.join(__dirname, 'pages-files.txt'), 'utf8').trim().split(/\r?\n/);
const valid = /^(?:index\.html|css\/(?:styles|theme)\.css|js\/(?:app|config|menu-data)\.js|assets\/(?:fonts|images\/(?:brand|hero|products))\/[\w.-]+\.(?:woff2|txt|webp|png|ico|svg))$/;
assert.equal(approved.length, 110, 'El inventario aprobado debe contener 110 archivos.');
assert.equal(new Set(approved).size, approved.length, 'El inventario contiene duplicados.');
assert.equal(approved.filter(file => /^assets\/images\/products\/.+\.webp$/.test(file)).length, 94);
assert.ok(approved.every(file => valid.test(file)), 'El inventario contiene una ruta no pública.');

const [destination, ...extra] = process.argv.slice(2);
assert.ok(destination && extra.length === 0, 'Uso: node .github/build-pages.cjs <directorio-nuevo>');
const requested = path.resolve(destination);
const output = path.join(fs.realpathSync(path.dirname(requested)), path.basename(requested));
const relative = path.relative(root, output);
assert.ok(relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative),
  'El artefacto debe quedar fuera del repositorio.');
const sources = approved.map(file => {
  const source = path.join(root, file);
  assert.ok(fs.lstatSync(source).isFile() && fs.realpathSync(source) === source, `Archivo no regular: ${file}`);
  return source;
});
fs.mkdirSync(output);
for (const [index, file] of approved.entries()) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.copyFileSync(sources[index], target, fs.constants.COPYFILE_EXCL);
}

function list(directory, prefix = '') {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const name = prefix + entry.name;
    if (entry.isDirectory()) return list(path.join(directory, entry.name), name + '/');
    assert.ok(entry.isFile(), `Entrada inesperada: ${name}`);
    return name;
  });
}
assert.deepEqual(list(output).sort(), [...approved].sort());
console.log(`Artefacto Pages verificado: ${approved.length} archivos en ${output}`);
