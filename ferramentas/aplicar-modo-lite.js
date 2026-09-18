const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');

function once(from, to) {
  if (!html.includes(from)) throw new Error('Trecho não encontrado: ' + from.slice(0, 90));
  html = html.replace(from, to);
}

once(
`            try { window.aplicarTema(); } catch (e) {}
            document.addEventListener('DOMContentLoaded', function () { try { window.aplicarTema(); } catch (e) {} });`,
`            window.detectarModoLite = function () {
                try {
                    var salvo = localStorage.getItem('prumo_modo_lite');
                    if (salvo === '1') return true;
                    if (salvo === '0') return false;
                } catch (e) {}
                var android = /Android/i.test(navigator.userAgent || '');
                var poucaMemoria = Number(navigator.deviceMemory || 8) <= 4;
                var poucosNucleos = Number(navigator.hardwareConcurrency || 8) <= 4;
                return android && (poucaMemoria || poucosNucleos);
            };
            window.aplicarModoLite = function (ativo, salvar) {
                document.documentElement.classList.toggle('prumo-lite', !!ativo);
                if (ativo) {
                    var petalasAtuais = document.querySelector('.sakura-petals');
                    if (petalasAtuais) petalasAtuais.remove();
                } else if (window.__temaEfetivo === 'sakura') {
                    petalas(true);
                }
                if (salvar !== false) { try { localStorage.setItem('prumo_modo_lite', ativo ? '1' : '0'); } catch (e) {} }
                window.__prumoModoLite = !!ativo;
            };
            try { window.aplicarModoLite(window.detectarModoLite(), false); } catch (e) {}
            try { window.aplicarTema(); } catch (e) {}
            document.addEventListener('DOMContentLoaded', function () {
                try { window.aplicarModoLite(window.detectarModoLite(), false); window.aplicarTema(); } catch (e) {}
            });`
);

once(
`            const [tema, setTema] = useState(() => { try { return window.localStorage.getItem('friganso_tema') || 'auto'; } catch (e) { return 'auto'; } });`,
`            const [tema, setTema] = useState(() => { try { return window.localStorage.getItem('friganso_tema') || 'auto'; } catch (e) { return 'auto'; } });
            const [modoLite, setModoLite] = useState(() => { try { return window.detectarModoLite ? window.detectarModoLite() : false; } catch (e) { return false; } });`
);

once(
`            useEffect(() => { try { window.aplicarTema(tema); } catch (e) {} }, [tema]);
            const [clients, setClients] = useState([]);`,
`            useEffect(() => { try { window.aplicarTema(tema); } catch (e) {} }, [tema]);
            useEffect(() => { try { window.aplicarModoLite(modoLite, true); } catch (e) {} }, [modoLite]);
            const [clients, setClients] = useState([]);`
);

once(
`                                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-400 text-center"><b>Automático</b> = claro no dia a dia e 🌸 Sakura nos dias especiais (21 e 27 de junho). 🦢</div>

                                    {/* ✋ Trava contra pedido errado por distração */}`,
`                                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-400 text-center"><b>Automático</b> = claro no dia a dia e 🌸 Sakura nos dias especiais (21 e 27 de junho). 🦢</div>

                                    <div className="border-t border-slate-200 pt-4">
                                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">⚡</span>
                                                    <p className="text-sm font-bold text-slate-700">Modo Lite</p>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Mantém todas as funções e deixa o app mais rápido, reduzindo animações, transparências, brilhos e efeitos visuais.</p>
                                            </div>
                                            <button type="button" role="switch" aria-checked={modoLite} onClick={() => setModoLite(v => !v)} className={\`relative h-8 w-14 shrink-0 rounded-full border transition-colors \${modoLite ? 'bg-rose-700 border-rose-500' : 'bg-slate-200 border-slate-300'}\`}>
                                                <span className={\`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform \${modoLite ? 'translate-x-5' : 'translate-x-1'}\`}></span>
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-2">Em celulares mais fracos, o Prumo ativa esse modo automaticamente na primeira utilização.</p>
                                    </div>

                                    {/* ✋ Trava contra pedido errado por distração */}`
);

fs.writeFileSync(file, html);
console.log('Modo Lite aplicado ao Prumo ERP.');
