import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import catalog from './catalog-preview.cjs';

const projectRequire = createRequire(import.meta.url);
const ExcelJS = projectRequire('exceljs');
const JSZip = projectRequire('jszip');
const runtime = process.env.MIREKA_NODE_MODULES || path.join(os.homedir(),
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const require = createRequire(pathToFileURL(path.join(runtime, '..', 'package.json')));
const {Workbook, SpreadsheetFile} = await import(pathToFileURL(require.resolve('@oai/artifact-tool')));
const {templateRows, templatePath, preview} = catalog;
const workbook = Workbook.create();
const widths = {
  MENU: [32, 38, 62, 12, 50, 13, 14, 10, 54, 15],
  CATEGORIAS: [43, 12, 16],
  DATOS_NEGOCIO: [27, 100]
};
for (const [name, values] of Object.entries(templateRows())) {
  const sheet = workbook.worksheets.add(name);
  const last = String.fromCharCode(64 + values[0].length);
  sheet.getRange(`A1:${last}${values.length}`).values = values;
  sheet.getRange(`A1:${last}1`).format = {
    fill:'#761522', font:{bold:true, color:'#FFF9F6'}
  };
  widths[name].forEach((width, index) => {
    sheet.getRange(`${String.fromCharCode(65 + index)}1`).format.columnWidth = width;
  });
  sheet.freezePanes.freezeRows(1);
  if (name === 'DATOS_NEGOCIO') {
    sheet.getRange(`B2:B${values.length}`).setNumberFormat('@');
    sheet.getRange(`B2:B${values.length}`).format.wrapText = true;
  }
}
workbook.recalculate();
const folder = path.dirname(templatePath);
await fs.mkdir(folder, {recursive:true});
const staging = await fs.mkdtemp(path.join(folder, 'plantilla-'));
try {
  const candidate = path.join(staging, 'candidato.xlsx');
  await (await SpreadsheetFile.exportXlsx(workbook)).save(candidate);
  const zip = await JSZip.loadAsync(await fs.readFile(candidate));
  // El lector ExcelJS requiere el namespace principal sin el prefijo x.
  for (const entry of Object.values(zip.files)) {
    if (!entry.dir && entry.name.endsWith('.xml')) {
      const xml = await entry.async('string');
      zip.file(entry.name, xml.replace(/(<\/?)(x:)/g, '$1').replace(/xmlns:x=/g, 'xmlns='));
    }
  }
  const bytes = await zip.generateAsync({type:'nodebuffer'});
  const compatible = new ExcelJS.Workbook();
  await compatible.xlsx.load(bytes);
  const report = await preview(bytes);
  if (report.errores.length || report.cambios.length || !report.negocio || report.modo !== 'ids-persistentes') {
    throw new Error(`La plantilla no coincide con la base. ${report.errores.join(' ')}`);
  }
  await fs.writeFile(templatePath, bytes, {flag:'wx'});
  console.log(templatePath);
  if (process.argv.includes('--render')) {
    for (const [name, range] of [['MENU', 'A1:J6'], ['CATEGORIAS', 'A1:C19'], ['DATOS_NEGOCIO', 'A1:B16']]) {
      const image = await workbook.render({sheetName:name, range, scale:1});
      await fs.writeFile(path.join(folder, `plantilla-negocio-${name}.png`), new Uint8Array(await image.arrayBuffer()));
    }
  }
} finally {
  await fs.rm(staging, {recursive:true, force:true});
}
