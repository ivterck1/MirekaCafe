const fs = require('node:fs');
const path = require('node:path');
const {escape, loadConfig, synchronize} = require('./sync-seo.cjs');
const {validPhone, verifiedSocial} = require('./business-preview.cjs');

function replaceBlock(html, label, lines, indent) {
  const start = `<!-- ${label}:START -->`;
  const end = `<!-- ${label}:END -->`;
  const first = html.indexOf(start);
  const last = html.indexOf(end);
  if (first < 0 || last <= first || html.split(start).length !== 2 || html.split(end).length !== 2) {
    throw new Error(`Bloque ${label} ausente o duplicado.`);
  }
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  return html.slice(0, first + start.length) + eol +
    [...lines.map(line => indent + line), indent].join(eol) + html.slice(last);
}

function synchronizeBusiness(html, {business, contact, images}) {
  const lines = [
    '<div>',
    `  <p>${escape(business.name)}</p>`,
    '  <div id="business-contact" role="group" aria-label="Datos de contacto">'
  ];
  for (const field of ['hours', 'address', 'coverage']) {
    if (contact[field]?.trim()) lines.push(`    <p>${escape(contact[field])}</p>`);
  }
  if (validPhone(contact.phone)) {
    lines.push(`    <p><a class="contact-phone" href="tel:${escape(contact.phone)}">Teléfono: ${escape(contact.phone)}</a></p>`);
  }
  const socials = {instagram:'Instagram', facebook:'Facebook', tiktok:'TikTok'};
  const links = Object.entries(socials)
    .filter(([field]) => verifiedSocial(field, contact[field], contact.verifiedSocial))
    .map(([field, label]) => `      <a href="${escape(contact[field])}">${label}</a>`);
  if (links.length) lines.push('    <nav aria-label="Redes sociales">', ...links, '    </nav>');
  lines.push('  </div>', '</div>',
    `<img src="${escape(images.logo)}" alt="" width="768" height="496">`);
  const story = replaceBlock(html, 'BUSINESS-STORY', [`<p>${escape(business.description)}</p>`], '            ');
  return replaceBlock(story, 'BUSINESS-FOOTER', lines, '        ');
}

function synchronizeSite(html, config) {
  return synchronizeBusiness(synchronize(html, config), config);
}

if (require.main === module) {
  try {
    const mode = process.argv[2];
    if (!['--check', '--write'].includes(mode) || process.argv.length !== 3) throw new Error('Usar --check o --write.');
    const file = path.resolve(__dirname, '../index.html');
    const html = fs.readFileSync(file, 'utf8');
    const next = synchronizeSite(html, loadConfig());
    if (next !== html) {
      if (mode === '--check') throw new Error('HTML comercial desactualizado. Ejecuta npm run menu:business:sync.');
      fs.writeFileSync(file, next);
    }
    console.log('HTML comercial y SEO sincronizados.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {synchronizeBusiness, synchronizeSite};
