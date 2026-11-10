// 🗑️ Testa a EXCLUSÃO DE CLIENTE (excluirCliente / restaurarCliente).
//
// Duas coisas podem dar muito errado aqui, e as duas são silenciosas:
//
// 1. Apagar as VENDAS junto. O cliente some da lista, e de quebra o faturamento do mês muda sem
//    ninguém pedir. As vendas guardam clienteCode/clienteName próprios — elas não podem ser tocadas.
// 2. Apagar de verdade. "Excluí sem querer" acontece, e o projeto já resolveu isso uma vez com o
//    purchases_lixeira. Cliente excluído vai pra clients_lixeira e volta de lá.
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

// ── Firestore de mentira, anotando tudo que foi mexido ────────────────────────────────────────
function montar(confirmar) {
    const banco = { clients: {}, clients_lixeira: {}, purchases: {} };
    const toques = [];
    const db = {
        collection: (nome) => ({
            doc: (id) => ({
                set: async (d) => { toques.push(['set', nome, id]); banco[nome][id] = d; },
                delete: async () => { toques.push(['delete', nome, id]); delete banco[nome][id]; },
            }),
        }),
    };
    const win = { confirm: () => confirmar };
    const avisos = [];
    const ehMeuRegistro = (d, u) => String(d.vendedorId || '') === String(u && u.id);
    const fn = new Function('db', 'window', 'ehMeuRegistro', '_usuarioAtual',
        extrairArrow('const excluirCliente = async (') + '\n' +
        extrairArrow('const restaurarCliente = async (') +
        '\n return { excluirCliente, restaurarCliente };')(db, win, ehMeuRegistro, null);
    return { banco, toques, db, fn, avisos, showMessage: (m, t) => avisos.push([t, m]) };
}

const EU = { id: 'uid-bruno', code: '99206' };
const OUTRO = { id: 'uid-amigo', code: '88' };
const PROMESSAS = { id: 'cli1', name: 'Promessas', code: '1602', vendedorId: 'uid-bruno' };

(async () => {
    console.log('═══ 1. A VENDA NÃO PODE SER TOCADA ═══');
    let m = montar(true);
    m.banco.clients['cli1'] = { ...PROMESSAS };
    m.banco.purchases['v1'] = { clienteCode: '1602', clienteName: 'Promessas', valor: 5000 };
    await m.fn.excluirCliente(PROMESSAS, EU, m.showMessage);
    checa('nenhuma venda foi mexida',
        !m.toques.some(t => t[1] === 'purchases'), JSON.stringify(m.toques));
    checa('a venda continua inteira no banco',
        m.banco.purchases['v1'] && m.banco.purchases['v1'].valor === 5000, '');

    console.log('\n═══ 2. VAI PRA LIXEIRA, NÃO SOME ═══');
    checa('saiu da carteira', !m.banco.clients['cli1'], '');
    checa('entrou na lixeira', !!m.banco.clients_lixeira['cli1'], '');
    checa('guarda quem removeu e quando',
        m.banco.clients_lixeira['cli1'].removidoPor === '99206' && !!m.banco.clients_lixeira['cli1'].removidoEm,
        JSON.stringify(m.banco.clients_lixeira['cli1']));
    // ⚠️ grava na lixeira ANTES de apagar da carteira: se a ordem fosse ao contrário e a segunda
    // chamada falhasse, o cliente teria sumido sem cópia nenhuma.
    const iSet = m.toques.findIndex(t => t[1] === 'clients_lixeira');
    const iDel = m.toques.findIndex(t => t[0] === 'delete' && t[1] === 'clients');
    checa('copia pra lixeira ANTES de apagar da carteira', iSet >= 0 && iDel >= 0 && iSet < iDel,
        JSON.stringify(m.toques));

    console.log('\n═══ 3. VOLTA DA LIXEIRA ═══');
    const naLixeira = { id: 'cli1', ...m.banco.clients_lixeira['cli1'] };
    await m.fn.restaurarCliente(naLixeira, m.showMessage);
    checa('voltou pra carteira', !!m.banco.clients['cli1'], '');
    checa('saiu da lixeira', !m.banco.clients_lixeira['cli1'], '');
    checa('não carrega as marcas de remoção de volta',
        !('removidoEm' in m.banco.clients['cli1']) && !('removidoPor' in m.banco.clients['cli1']),
        JSON.stringify(m.banco.clients['cli1']));

    console.log('\n═══ 4. CONFIRMAÇÃO E DONO ═══');
    m = montar(false);   // usuário clicou em "cancelar"
    m.banco.clients['cli1'] = { ...PROMESSAS };
    const r = await m.fn.excluirCliente(PROMESSAS, EU, m.showMessage);
    checa('cancelar não apaga nada', r === false && !!m.banco.clients['cli1'] && m.toques.length === 0, JSON.stringify(m.toques));

    m = montar(true);
    m.banco.clients['cli1'] = { ...PROMESSAS };
    const r2 = await m.fn.excluirCliente(PROMESSAS, OUTRO, m.showMessage);
    // ⚠️ A tela já esconde o que não é seu, mas a checagem tem que existir AQUI também: a função é
    // chamada de duas telas e nada impede uma terceira passar um cliente que não é do usuário.
    checa('não dá pra excluir cliente de outro vendedor',
        r2 === false && !!m.banco.clients['cli1'] && m.toques.length === 0, JSON.stringify(m.toques));
    checa('e avisa o motivo', m.avisos.some(a => /não é da sua carteira/i.test(a[1])), JSON.stringify(m.avisos));

    console.log('\n═══ 5. REGRESSÃO ═══');
    const bloco = extrairArrow('const excluirCliente = async (');
    checa('a função não toca na coleção de vendas em lugar nenhum',
        bloco.indexOf("collection('purchases')") === -1, 'mexeu em purchases');
    checa('o aviso ao usuário diz que as vendas ficam',
        /VENDAS dele continuam/i.test(bloco), 'o texto de confirmação não explica o que acontece');
    // botão dentro de botão é HTML inválido e o clique fica imprevisível
    checa('em Rotas, o 🗑️ não ficou aninhado dentro do botão do cliente',
        !/<button[^>]*onClick=\{\(\) => abrirCliente\(c\)\}[\s\S]{0,400}?<button[^>]*excluirCliente/.test(src),
        'botão dentro de botão');

    console.log(falhas ? `\n❌ ${falhas} falha(s)` : '\n✅ todos passaram');
    process.exit(falhas ? 1 : 0);
})();
