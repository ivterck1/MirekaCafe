const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const ExcelJS = require('exceljs');
const {generate} = require('../tools/import-menu.cjs');

async function fixture(t, edit = () => {}) {
 const root = await fs.mkdtemp(path.join(os.tmpdir(), 'menu-test-'));
 t.after(() => fs.rm(root, {recursive:true, force:true}));
 const book = new ExcelJS.Workbook();
 await book.xlsx.readFile(path.resolve('templates/menu-cliente.xlsx'));
 edit(book);
 const input = path.join(root,'input.xlsx');
 await book.xlsx.writeFile(input);
 await fs.mkdir(path.join(root,'js'));
 await fs.writeFile(path.join(root,'js/menu-data.js'),'ORIGINAL');
 return {root,input};
}
test('Excel válido, salida compatible, orden, booleanos e imagen pendiente; sin --write',async t=>{
 const {root,input}=await fixture(t,b=>{b.getWorksheet('MENU').getCell('D2').value='65.50';});
 const result=await generate(input,{root});
 assert.equal(await fs.readFile(path.join(root,'js/menu-data.js'),'utf8'),'ORIGINAL');
 assert.equal(result.items[0].precio,65.5);
 assert.equal(result.items[0].disponible,true);
 assert.equal(result.items[3].disponible,false);
 assert.equal(result.items[0].destacado,true);
 assert.match(result.items[0].imagen,/^assets\/images\/products\//);
 assert.ok(result.warnings.some(w=>w.startsWith('Imagen pendiente:')));
 const code=await fs.readFile(result.output,'utf8');
 assert.equal(vm.runInNewContext(code+';menuItems.length'),4);
});
test('--write reemplaza únicamente la copia temporal después de validar',async t=>{
 const {root,input}=await fixture(t);
 const original=await fs.readFile('js/menu-data.js');
 const result=await generate(input,{root,write:true});
 assert.equal(result.output,path.join(root,'js/menu-data.js'));
 assert.match(await fs.readFile(result.output,'utf8'),/const menuItems/);
 assert.deepEqual(await fs.readFile('js/menu-data.js'),original);
});
for(const [label,edit,pattern] of [
 ['precio inválido',b=>b.getWorksheet('MENU').getCell('D2').value='$75',/precio inválido/],
 ['precio negativo',b=>b.getWorksheet('MENU').getCell('D2').value=-1,/precio inválido/],
 ['categoría inexistente',b=>b.getWorksheet('MENU').getCell('A2').value='Inexistente',/no existe/],
 ['SI\/NO incorrecto',b=>b.getWorksheet('MENU').getCell('F2').value='sí',/destacado debe ser SI o NO/],
 ['disponible incorrecto',b=>b.getWorksheet('MENU').getCell('G2').value='true',/disponible debe ser SI o NO/],
 ['producto duplicado en la misma categoría',b=>{
  const s=b.getWorksheet('MENU');
  s.getCell('A3').value=s.getCell('A2').value;
  s.getCell('B3').value=s.getCell('B2').value;
 },/MENU fila 3: producto duplicado dentro de la categoría "Entradas": "Entrada ficticia de ejemplo"/],
 ['IDs duplicados tras normalizar',b=>{
  const s=b.getWorksheet('MENU');
  s.getCell('A3').value=s.getCell('A2').value;
  s.getCell('B2').value='Café';
  s.getCell('B3').value='Cafe';
 },/ID duplicado "entradas-cafe"/],
 ['orden inválido',b=>b.getWorksheet('MENU').getCell('H2').value=1.5,/orden inválido/],
 ['nombre vacío',b=>b.getWorksheet('MENU').getCell('B2').value=null,/nombre vacío/],
 ['imagen con ruta',b=>b.getWorksheet('MENU').getCell('E2').value='../foto.webp',/imagen problemático/],
 ['fórmula no aceptada',b=>b.getWorksheet('MENU').getCell('D2').value={formula:'1+1',result:2},/precio inválido/],
 ['categoría duplicada',b=>b.getWorksheet('CATEGORIAS').getCell('A3').value='Entradas',/categoría duplicada/],
 ['hoja ausente',b=>b.removeWorksheet('MENU'),/Falta la hoja MENU/]
]) test(label+' no escribe ninguna salida',async t=>{
 const {root,input}=await fixture(t,edit);
 for(const write of [false,true]) await assert.rejects(generate(input,{root,write}),pattern);
 assert.equal(await fs.readFile(path.join(root,'js/menu-data.js'),'utf8'),'ORIGINAL');
 await assert.rejects(fs.access(path.join(root,'tmp/menu-data.generated.js')));
});
test('nombres iguales en categorías distintas generan IDs diferentes y estables',async t=>{
 function edit(book, reorder) {
  const categories=book.getWorksheet('CATEGORIAS');
  const menu=book.getWorksheet('MENU');
  categories.getCell('A2').value='Capuchinos Saborizados';
  categories.getCell('A3').value='¡Frappés!';
  menu.getCell('A2').value='Capuchinos Saborizados';
  menu.getCell('A3').value='¡Frappés!';
  menu.getCell('B2').value=menu.getCell('B3').value='¡Chócolate -- clásico!';
  if (reorder) {
   const first=menu.getRow(2).values;
   menu.getRow(2).values=menu.getRow(3).values;
   menu.getRow(3).values=first;
   menu.getCell('H3').value=8;
   categories.getCell('B2').value=9;
  }
 }
 const expected=['capuchinos-saborizados-chocolate-clasico','frappes-chocolate-clasico'];
 for (const reorder of [false,true]) {
  const {root,input}=await fixture(t,b=>edit(b,reorder));
  const {items}=await generate(input,{root});
  assert.deepEqual(items.filter(p=>p.nombre==='¡Chócolate -- clásico!').map(p=>p.id).sort(),expected);
 }
});
test('orden de categorías y productos; conserva destacados y avisa categorías vacías',async t=>{
 const {root,input}=await fixture(t,b=>{
  b.getWorksheet('CATEGORIAS').getCell('B2').value=8;
  b.getWorksheet('CATEGORIAS').addRow(['Sin productos',9]);
  b.getWorksheet('MENU').getCell('F2').value='NO';
 });
 const result=await generate(input,{root});
 assert.equal(result.items[0].categoria,'Platos fuertes');
 assert.equal(result.items.find(p=>p.categoria==='Entradas').destacado,false);
 assert.ok(!result.warnings.some(w=>w.startsWith('Especialidades:')));
 assert.ok(result.warnings.some(w=>w.startsWith('Categoría sin productos:')));
});
test('CLI: ruta explícita, salida normal y --write en copia aislada',async t=>{
 const {root,input}=await fixture(t);
 await fs.mkdir(path.join(root,'tools'));
 const tool=path.join(root,'tools/import-menu.cjs');
 await fs.copyFile('tools/import-menu.cjs',tool);
 const env={...process.env,NODE_PATH:path.resolve('node_modules')};
 execFileSync(process.execPath,[tool,input],{env});
 assert.equal(await fs.readFile(path.join(root,'js/menu-data.js'),'utf8'),'ORIGINAL');
 await fs.access(path.join(root,'tmp/menu-data.generated.js'));
 execFileSync(process.execPath,[tool,'--write',input],{env});
 assert.match(await fs.readFile(path.join(root,'js/menu-data.js'),'utf8'),/const menuItems/);
});
test('plantilla conserva tres hojas, filtros, congelado y SI/NO',async()=>{
 const book=new ExcelJS.Workbook();
 await book.xlsx.readFile('templates/menu-cliente.xlsx');
 assert.deepEqual(book.worksheets.map(s=>s.name),['MENU','DATOS_NEGOCIO','CATEGORIAS']);
 for(const s of book.worksheets){assert.equal(s.views[0].ySplit,1); assert.ok(s.autoFilter);}
 for(const col of ['F','G']) assert.deepEqual(book.getWorksheet('MENU').getCell(`${col}2`).dataValidation.formulae,['"SI,NO"']);
});
