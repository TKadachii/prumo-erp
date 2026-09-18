const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  '404.html', 'apk-version.json', 'content.js', 'CONTEXTO-DO-PROJETO.md', 'friganso.user.js',
  'index.html', 'manifest.json', 'sw.js', 'extensao/content.js', 'extensao/gerar-extensao.ps1',
  'extensao/gerar-userscript.js', 'ferramentas/teste-retorno-android.js'
];

for (const relative of files) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .replaceAll('TKadachii.github.io/friganso-erp/', 'TKadachii.github.io/prumo-erp/')
    .replaceAll('tkadachii.github.io/friganso-erp/', 'tkadachii.github.io/prumo-erp/')
    .replaceAll('github.com/TKadachii/friganso-erp', 'github.com/TKadachii/prumo-erp')
    .replaceAll('/friganso-erp/', '/prumo-erp/')
    .replaceAll("'/friganso-erp'", "'/prumo-erp'")
    .replaceAll('friganso-extensao.zip', 'prumo-extensao.zip');
  if (after !== before) fs.writeFileSync(file, after, 'utf8');
}

console.log('Endereços públicos migrados para prumo-erp.');
