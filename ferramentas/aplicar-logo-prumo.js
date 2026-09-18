const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const iconSvg = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8');
const iconData = Buffer.from(iconSvg).toString('base64');
let html = fs.readFileSync(indexPath, 'utf8');

const start = html.indexOf('        // Logo oficial');
const end = html.indexOf('        const BG_IMAGE', start);
if (start < 0 || end < 0) throw new Error('Bloco antigo da logo não encontrado.');

const brandBlock = `        // Símbolo oficial da Prumo embutido para funcionar offline e nos materiais gerados.\n` +
`        const PRUMO_LOGO_DATA_URI = 'data:image/svg+xml;base64,${iconData}';\n\n` +
`        const PrumoLogo = ({ className }) => (\n` +
`            <svg className={className} aria-label="Prumo" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">\n` +
`                <defs>\n` +
`                    <linearGradient id="prumoBg" x1="72" y1="34" x2="440" y2="478" gradientUnits="userSpaceOnUse"><stop stopColor="#111526"/><stop offset="1" stopColor="#070910"/></linearGradient>\n` +
`                    <linearGradient id="prumoBrand" x1="132" y1="110" x2="386" y2="390" gradientUnits="userSpaceOnUse"><stop stopColor="#C4B5FD"/><stop offset=".48" stopColor="#8B5CF6"/><stop offset="1" stopColor="#22D3EE"/></linearGradient>\n` +
`                    <radialGradient id="prumoGlow" cx="0" cy="0" r="1" gradientTransform="translate(368 126) rotate(131) scale(260)"><stop stopColor="#7C3AED" stopOpacity=".42"/><stop offset="1" stopColor="#7C3AED" stopOpacity="0"/></radialGradient>\n` +
`                </defs>\n` +
`                <rect width="512" height="512" rx="122" fill="url(#prumoBg)"/>\n` +
`                <rect width="512" height="512" rx="122" fill="url(#prumoGlow)"/>\n` +
`                <rect x="11" y="11" width="490" height="490" rx="111" fill="none" stroke="#C4B5FD" strokeOpacity=".16" strokeWidth="2"/>\n` +
`                <circle cx="256" cy="256" r="166" fill="none" stroke="url(#prumoBrand)" strokeOpacity=".16" strokeWidth="2" strokeDasharray="8 17"/>\n` +
`                <path d="M158 382V139h120c61 0 101 36 101 91s-40 91-101 91h-55" fill="none" stroke="url(#prumoBrand)" strokeWidth="58" strokeLinecap="round" strokeLinejoin="round"/>\n` +
`                <path d="M246 278 340 184M303 184h37v37" fill="none" stroke="#F8FAFC" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>\n` +
`                <circle cx="158" cy="402" r="9" fill="#22D3EE"/>\n` +
`            </svg>\n` +
`        );\n\n`;

html = html.slice(0, start) + brandBlock + html.slice(end);
html = html
    .replace('className="h-20 w-20 rounded-2xl bg-black/80 p-2 shadow-lg border border-rose-500/50 mb-4"', 'className="h-24 w-24 mb-5"')
    .replace('<h1 className="text-3xl font-extrabold text-slate-800">Prumo<span className="text-rose-700">ERP</span></h1>', '<h1 className="text-3xl font-extrabold text-slate-800 tracking-[.08em]">PRUMO</h1>')
    .replace("'Gestão Inteligente de Vendas'", "'GESTÃO COMERCIAL · SIMPLES E INTELIGENTE'")
    .replace('const logoH = 66, logoW = logoH * (112 / 98);', 'const logoH = 66, logoW = logoH;')
    .replace('const logoH = 78, logoW = logoH * (112 / 98);', 'const logoH = 78, logoW = logoH;')
    .replace('Logo oficial (gansos + "PRUMO")', 'Símbolo oficial da Prumo')
    .replace('logo oficial da Prumo (gansos + nome)', 'nova identidade visual da Prumo')
    .replace('logo oficial da Prumo (canto direito) — já vem com o nome escrito, então não precisa de texto ao lado', 'símbolo oficial da Prumo no canto direito')
    .replace('logo oficial no topo — dentro de um selo branco pra manter contraste sobre o fundo vermelho', 'símbolo oficial no topo, dentro de um selo para manter contraste');

fs.writeFileSync(indexPath, html);
console.log('Identidade visual Prumo aplicada ao site.');
