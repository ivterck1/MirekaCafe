const fs = require('node:fs');
const path = require('node:path');
const {escape, loadConfig, synchronize} = require('./sync-seo.cjs');
const {validPhone, validSocialUrl} = require('./business-preview.cjs');

const socialIcons = {
  instagram: {
    label:'Instagram',
    shape:'<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1"/>'
  },
  facebook: {
    label:'Facebook',
    shape:'<path d="M14 21v-8h3l.5-3H14V8c0-1 .3-1.5 1.7-1.5H18V3.8a19 19 0 0 0-2.6-.2C12.8 3.6 11 5.2 11 8v2H8v3h3v8z"/>'
  },
  tiktok: {
    label:'TikTok',
    shape:'<path d="M14 3h3a5 5 0 0 0 4 4v3a8 8 0 0 1-4-1.4V16a5.5 5.5 0 1 1-5.5-5.5h.5v3a2.5 2.5 0 1 0 2 2.5z"/>'
  }
};

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
 if (validPhone(contact.phone)) {const phone = String(contact.phone).replace(/\D/g, "");
  const nationalPhone = phone.startsWith("52") && phone.length === 12
    ? phone.slice(2)
    : phone;

  const displayPhone = nationalPhone.length === 10
    ? `${nationalPhone.slice(0, 2)} ${nationalPhone.slice(2, 6)} ${nationalPhone.slice(6)}`
    : nationalPhone;

  const dialPhone = phone.length === 12 && phone.startsWith("52")
    ? `+${phone}`
    : phone.length === 10
      ? `+52${phone}`
      : `+${phone}`;

  lines.push(`    <p><a class="contact-phone"
   href="tel:${escape(dialPhone)}"
   aria-label="Teléfono: ${escape(displayPhone)}">
      <svg xmlns="http://www.w3.org/2000/svg"
           width="18" height="18" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18.81a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.09 4.18 2 2 0 0 1 4.08 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.04 9.91a16 16 0 0 0 6.05 6.05l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.68A2 2 0 0 1 22 16.92z"/>
      </svg>
      <span>${escape(displayPhone)}</span>
    </a></p>`);
}

  const links = Object.entries(socialIcons)
    .filter(([field]) => validSocialUrl(field, contact[field]))
    .map(([field, {label, shape}]) => `      <a href="${escape(contact[field])}" target="_blank" rel="noopener noreferrer" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">${shape}</svg></a>`);
  if (links.length) lines.push('    <nav class="footer-social" aria-label="Redes sociales">', ...links, '    </nav>');
  lines.push('  </div>', '</div>',
    `<img class="footer-logo" src="${escape(images.logo)}" alt="" width="768" height="496">`);
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
