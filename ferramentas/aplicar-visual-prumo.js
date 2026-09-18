const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

if (html.includes('className="prumo-shell')) {
  console.log('Visual Prumo já aplicado.');
  process.exit(0);
}

function one(before, after) {
  if (!html.includes(before)) throw new Error('Trecho não encontrado: ' + before.slice(0, 100));
  html = html.replace(before, after);
}

one('</head>', '    <link rel="stylesheet" href="./visual.css">\n</head>');
one('<body>', '<body class="prumo-production">');
one('className="flex h-screen bg-slate-50 overflow-hidden font-sans"', 'className="prumo-shell flex h-screen bg-slate-50 overflow-hidden font-sans"');
one('className="friganso-mobile-topbar md:hidden', 'className="prumo-mobile-topbar friganso-mobile-topbar md:hidden');
one('className={`fixed inset-y-0 left-0 z-40 w-72', 'className={`prumo-sidebar fixed inset-y-0 left-0 z-40 w-72');
one('className="friganso-mobile-content flex-1', 'data-route={activeRoute} className="prumo-main friganso-mobile-content flex-1');
one('className="relative z-10 max-w-7xl mx-auto"', 'className="prumo-page relative z-10 max-w-7xl mx-auto"');
one('<button onClick={() => { setActiveRoute(route); setIsSidebarOpen(false); }} className=', '<button data-nav={route} aria-current={activeRoute === route ? "page" : undefined} onClick={() => { setActiveRoute(route); setIsSidebarOpen(false); }} className=');

const backdrop = '<div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: `url(\'${BG_IMAGE}\')`, backgroundSize: \'cover\', backgroundPosition: \'center\' }}></div>';
const topbar = `<div className="prumo-topline"><span className="prumo-breadcrumb">Workspace <span className="prumo-separator">›</span> <strong>{({dashboard:'Visão geral',clients:'Clientes',pdf:'Tabela de preços',pedido:'Novo pedido',resumo:'Resumo de pedido',radar:'Radar de clientes',historico:'Histórico de vendas',orcamentos:'Ofertas',disparos:'Campanhas',lembretes:'Lembretes'})[activeRoute] || 'Gestão comercial'}</strong></span><div className="prumo-top-actions"><button className="prumo-command" onClick={() => setIsSidebarOpen(true)}><span>⌕</span> Buscar ou navegar <kbd>⌘ K</kbd></button><button onClick={() => setActiveRoute('profile')} className="prumo-profile"><span className="prumo-avatar">{user.name.charAt(0)}</span><span className="prumo-profile-name">{user.name}</span><span className="prumo-profile-role">Conta</span></button></div></div>`;
one(backdrop, topbar);

const content = '<div className="prumo-page relative z-10 max-w-7xl mx-auto">';
const mobileNav = `{isSidebarOpen && <button aria-label="Fechar menu" className="prumo-scrim md:hidden" onClick={() => setIsSidebarOpen(false)} />}
                        <nav className="prumo-bottomnav" aria-label="Navegação principal">
                            {[['dashboard',IconDashboard,'Início'],['clients',IconUsers,'Clientes'],['pedido',IconReceipt,'Pedido'],['pdf',IconTag,'Preços']].map(([r,I,l]) => <button key={r} aria-current={activeRoute===r?'page':undefined} onClick={()=>{setActiveRoute(r);setIsSidebarOpen(false);}}><I/><span>{l}</span></button>)}
                            <button aria-label="Mais opções" onClick={()=>setIsSidebarOpen(!isSidebarOpen)}><IconMenu/><span>Mais</span></button>
                        </nav>
                        ${content}`;
one(content, mobileNav);

const labels = {
  'Painel (Dashboard)': 'Visão geral', '🔔 Lembretes': 'Lembretes', 'CRM & Rotas': 'Clientes e rotas',
  'Em Cadastramento': 'Cadastros em andamento', '🎯 Prospecção em Massa': 'Prospecção',
  'Meu Perfil / Admin': 'Minha conta', 'Tabela do Dia (PDF)': 'Tabela de preços', '🍽️ Cardápio': 'Catálogo',
  'Fazer Pedido': 'Novo pedido', 'Resumo de Pedido': 'Resumo de pedido', '📋 Fila de Pedidos': 'Fila de pedidos',
  '🧾 Histórico de Vendas': 'Histórico de vendas', '📊 Importar Vendas Reais': 'Importar vendas',
  'Gerador de Zap': 'Criar ofertas', 'Disparos WhatsApp': 'Campanhas WhatsApp', '🔄 Atualizações': 'Atualizações',
  '🐞 Debug': 'Diagnóstico'
};
for (const [from, to] of Object.entries(labels)) html = html.replaceAll(`label="${from}"`, `label="${to}"`);
html = html.replaceAll('Premium ERP', 'Gestão comercial');

html = html.replace('<div className="animate-in fade-in space-y-6">', '<div className="prumo-dashboard animate-in fade-in space-y-6">');
html = html.replaceAll('<div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">', '<div className="prumo-kpi bg-white p-5 rounded-2xl shadow-sm border border-slate-200">');
html = html.replaceAll('<div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">', '<div className="prumo-chart bg-white p-5 rounded-3xl shadow-sm border border-slate-200">');
one('<div className="bg-slate-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-xl border border-slate-800">', '<div className="prumo-welcome bg-slate-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-xl border border-slate-800">');
one('Olá, {user.name}! 📊', 'Olá, {user.name}.');
one('Seu painel de controle de vendas.', 'Acompanhe suas vendas e os próximos passos do dia.');

fs.writeFileSync(file, html, 'utf8');
console.log('Visual Prumo aplicado ao sistema real.');
