// ⚡ Testa a IMPORTAÇÃO EM LOTE do Relatório de Vendas.
//
// O problema: para cada pedido o importador fazia uma consulta ("esse SPAMOV já existe?") e uma
// gravação, as duas esperando a resposta antes de ir pro próximo. São 2 idas e voltas POR PEDIDO —
// com 1.000 pedidos, 2.000 viagens em fila indiana, mais de 5 minutos com a tela parada escrita
// "Importando..." e sem jeito de interromper.
//
// Este teste cobre as duas metades: o comportamento real da busca em bloco (contra um Firestore de
// mentira) e uma varredura no código que falha se o padrão lento voltar.
const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extrairArrow(marcador) {
    const a = src.indexOf(marcador);
    if (a < 0) { console.log('❌ não achei ' + marcador); process.exit(1); }
    const corpo = src.indexOf('=> {', a);
    let p = 0, f = -1;
    for (let k = src.indexOf('{', corpo); k < src.length; k++) {
        if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) { f = k + 1; break; } }
    }
    return src.slice(a, f);
}

let falhas = 0;
const checa = (nome, cond, extra) => { if (!cond) falhas++; console.log(`${cond ? '✅' : '❌'} ${nome}${cond ? '' : '  → ' + extra}`); };

// ── Firestore de mentira: registra cada consulta pra dar pra contar as viagens ────────────────
function fakeDb(docs, limiteIn) {
    const consultas = [];
    return {
        consultas,
        collection: () => ({
            where: (campo, op, valores) => ({
                get: async () => {
                    if (op === 'in' && valores.length > limiteIn) {
                        throw new Error(`in com ${valores.length} valores: o backend aceita até ${limiteIn}`);
                    }
                    consultas.push(valores.slice());
                    const achados = docs.filter(d => valores.indexOf(String(d.spamov)) !== -1);
                    return { docs: achados.map(d => ({ ref: { __id: d.__id }, data: () => d })) };
                },
            }),
        }),
    };
}

const EU = { id: 'uid-bruno', code: '77', role: 'vendedor' };
function montar(db) {
    const cancelarRef = { current: false };
    const ehMeuRegistro = (d, user) => String(d.vendedorId || '') === String(user.id);
    const fn = new Function('db', 'cancelarRef', 'ehMeuRegistro', 'user',
        extrairArrow('const buscarExistentes = async (') + '\n return buscarExistentes;')(db, cancelarRef, ehMeuRegistro, EU);
    return { fn, cancelarRef };
}

(async () => {
    console.log('═══ 1. QUANTAS VIAGENS O IMPORTADOR FAZ ═══');
    const mil = Array.from({ length: 1000 }, (_, i) => String(900000 + i));
    let db = fakeDb([], 30);
    let { fn } = montar(db);
    await fn(mil, () => {});
    // 1000 / 30 = 34 consultas. O sistema antigo faria 1000.
    checa('1.000 pedidos cabem em ~34 consultas, não 1.000',
        db.consultas.length === 34, `foram ${db.consultas.length}`);
    checa('nenhum bloco passa de 30 (o limite do Firestore)',
        db.consultas.every(b => b.length <= 30), 'bloco grande demais');

    console.log('\n═══ 2. BACKEND ANTIGO (só aceita 10 por consulta) ═══');
    // Se o `in` com 30 for recusado, a importação NÃO pode morrer: cai pra 10 sozinha.
    db = fakeDb([], 10);
    ({ fn } = montar(db));
    const mapa = await fn(mil, () => {});
    checa('não quebra: refaz tudo em blocos de 10', db.consultas.length === 100, `foram ${db.consultas.length}`);
    checa('e os blocos respeitam o limite novo', db.consultas.every(b => b.length <= 10), '');
    checa('o resultado continua utilizável', mapa instanceof Map, '');

    console.log('\n═══ 3. ACHAR O QUE JÁ EXISTE — E SÓ O QUE É MEU ═══');
    db = fakeDb([
        { __id: 'meu', spamov: '900001', vendedorId: 'uid-bruno' },
        { __id: 'do-outro', spamov: '900002', vendedorId: 'uid-amigo' },
    ], 30);
    ({ fn } = montar(db));
    const achados = await fn(['900001', '900002', '900003'], () => {});
    checa('acha o pedido que já é meu', achados.get('900001') && achados.get('900001').__id === 'meu', JSON.stringify([...achados.keys()]));
    // ⚠️ Se o pedido do outro vendedor entrasse aqui, a importação ATUALIZARIA a venda dele com os
    // meus dados — não é lentidão, é perda de dado alheio.
    checa('IGNORA o pedido com o mesmo número do outro vendedor', !achados.has('900002'), 'ia sobrescrever a venda do outro');
    checa('pedido que não existe fica de fora', !achados.has('900003'), '');

    console.log('\n═══ 4. INTERROMPER ═══');
    db = fakeDb([], 30);
    const m = montar(db);
    m.cancelarRef.current = true;
    await m.fn(mil, () => {});
    checa('cancelado antes de começar não dispara consulta nenhuma', db.consultas.length === 0, `foram ${db.consultas.length}`);

    console.log('\n═══ 5. A BARRA DE PROGRESSO RECEBE NOTÍCIA ═══');
    db = fakeDb([], 30);
    ({ fn } = montar(db));
    const avisos = [];
    await fn(mil, n => avisos.push(n));
    checa('avisa o progresso várias vezes', avisos.length >= 30, `avisou ${avisos.length} vez(es)`);
    checa('nunca passa do total', avisos.every(n => n <= 1000), 'passou de 100%');

    console.log('\n═══ 6. REGRESSÃO: o padrão lento não pode voltar ═══');
    const corpoImport = src.slice(src.indexOf('const importarTudo = async ()'), src.indexOf('const totalSelecionado ='));
    const semComentario = corpoImport.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    checa('não consulta o Firestore dentro do laço de pedidos',
        !/for \(const p of alvo\)[\s\S]*?await db\.collection\('purchases'\)\.where/.test(semComentario),
        'voltou a consulta por pedido');
    checa('não grava um a um dentro do laço',
        !/for \(const p of alvo\)[\s\S]*?await db\.collection\('purchases'\)\.add\(/.test(semComentario),
        'voltou a gravação por pedido');
    checa('usa lote de gravação', /db\.batch\(\)/.test(semComentario), '');
    const lote = Number((/const LOTE_GRAVACAO = (\d+)/.exec(src) || [])[1]);
    checa('o lote respeita o teto de 500 do Firestore', lote > 0 && lote <= 500, `LOTE_GRAVACAO = ${lote}`);
    // ⚠️ Antes, o filtro final tirava da tela TODOS os selecionados — inclusive os que falharam.
    // Eles sumiam e não havia como tentar de novo.
    checa('só some da lista quem realmente entrou',
        /setPedidos\(prev => prev\.filter\(p => !gravados\.has\(String\(p\.spamov\)\)\)\)/.test(semComentario),
        'pedido que falhou está sumindo da tela');

    console.log(falhas ? `\n❌ ${falhas} falha(s)` : '\n✅ todos passaram');
    process.exit(falhas ? 1 : 0);
})();
