const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'index.html',
  'manifest.json',
  'content.js',
  'friganso.user.js',
  'CONTEXTO-DO-PROJETO.md',
  'extensao/content.js',
  'extensao/manifest.json',
  'extensao/COMO-INSTALAR.txt',
  'extensao/gerar-extensao.ps1',
  'extensao/gerar-userscript.js',
  'ferramentas/gerar-leads.js',
  'ferramentas/sincronizar.js'
];

for (const relative of files) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .replaceAll('FRIGANSO', 'PRUMO')
    .replaceAll('Friganso', 'Prumo')
    .replaceAll('friganso-cartao-', 'prumo-cartao-');
  if (after !== before) fs.writeFileSync(file, after, 'utf8');
}

console.log('Identidade visível atualizada para Prumo; URLs, protocolo e dados legados foram preservados.');
