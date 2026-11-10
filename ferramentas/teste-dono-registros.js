// 🔐 Testa a SEPARAÇÃO DE DADOS ENTRE VENDEDORES (ehMeuRegistro / soMeus / carimboDono).
//
// O bug: o app nasceu pra uma pessoa só. `clients`, `purchases` e `leads` eram lidos inteiros, sem
// filtro nenhum. No dia em que um segundo vendedor se cadastrou, ele abriu o app e viu a carteira,
// as vendas e o placar de positivação do primeiro.
//
// ⚠️ O degrau mais delicado é o registro ÓRFÃO (criado antes de existir dono). Ele NÃO pode aparecer
// pro vendedor novo — era o vazamento —, mas também NÃO pode sumir da tela de quem já usava o app,
// senão o conserto da privacidade vira perda do histórico. Por isso órfão é visível só pro admin até
// a migração do Diagnóstico carimbar o dono.
const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// --- extrai o bloco de propriedade inteiro e roda num escopo com localStorage de mentira ---
const ini = src.indexOf('const donoDoRegistro =');
const fim = src.indexOf('const registrarCompra =');
if (ini < 0 || fim < 0) { console.log('❌ não achei o bloco de propriedade no index.html'); process.exit(1); }
const bloco = src.slice(ini, fim);

const guardado = {};
const win = { localStorage: {
    getItem: k => (k in guardado ? guardado[k] : null),
    setItem: (k, v) => { guardado[k] = String(v); },
} };
const api = new Function('window', bloco + `
    return { donoDoRegistro, ehMeuRegistro, soMeus, carimboDono, definirUsuarioAtual, VER_TUDO_KEY };
`)(win);
const { ehMeuRegistro, soMeus, carimboDono, definirUsuarioAtual, VER_TUDO_KEY } = api;

let falhas = 0;
function checa(nome, cond, extra) {
    if (!cond) falhas++;
    console.log(`${cond ? '✅' : '❌'} ${nome}${cond ? '' : '  → ' + extra}`);
}

const BRUNO = { id: 'uid-bruno', code: '77', role: 'admin' };
const AMIGO = { id: 'uid-amigo', code: '88', role: 'vendedor' };

console.log('═══ 1. REGISTRO COM DONO ═══');
const doBruno = { vendedorId: 'uid-bruno', vendedor: '77', name: 'Bar do Zé' };
const doAmigo = { vendedorId: 'uid-amigo', vendedor: '88', name: 'Padaria Sol' };
checa('vejo o que é meu', ehMeuRegistro(doBruno, BRUNO) === true, '');
checa('NÃO vejo o do outro vendedor', ehMeuRegistro(doAmigo, BRUNO) === false, 'vazou');
checa('o outro NÃO vê o meu', ehMeuRegistro(doBruno, AMIGO) === false, 'VAZAMENTO — era o bug');

console.log('\n═══ 2. VENDA ANTIGA (só com o código do vendedor) ═══');
// purchases já gravava `vendedor: user.code` desde o começo — esse degrau salva o histórico de
// quem já usava, sem precisar esperar a migração.
const vendaAntigaBruno = { vendedor: '77', valor: 1000 };
const vendaAntigaAmigo = { vendedor: '88', valor: 500 };
checa('venda antiga com o meu código continua minha', ehMeuRegistro(vendaAntigaBruno, BRUNO) === true, '');
checa('venda antiga com o código do outro não é minha', ehMeuRegistro(vendaAntigaAmigo, BRUNO) === false, '');
checa('o outro enxerga a venda antiga DELE', ehMeuRegistro(vendaAntigaAmigo, AMIGO) === true, '');

console.log('\n═══ 3. REGISTRO ÓRFÃO (o degrau delicado) ═══');
const orfao = { name: 'Cliente antigo', code: '1602' };
checa('órfão NÃO aparece pro vendedor novo', ehMeuRegistro(orfao, AMIGO) === false, 'VAZAMENTO do legado');
checa('órfão continua visível pro admin (não perde histórico)', ehMeuRegistro(orfao, BRUNO) === true, 'sumiu o histórico de quem já usava');

console.log('\n═══ 4. soMeus — o filtro usado em toda leitura ═══');
const tudo = [doBruno, doAmigo, vendaAntigaBruno, vendaAntigaAmigo, orfao];
definirUsuarioAtual(BRUNO);
checa('admin recebe o dele + o órfão', soMeus(tudo).length === 3, JSON.stringify(soMeus(tudo).length));
definirUsuarioAtual(AMIGO);
checa('o amigo recebe SÓ o dele', soMeus(tudo).length === 2, JSON.stringify(soMeus(tudo).map(d => d.name || d.vendedor)));
checa('e nada do Bruno encosta nele',
    !soMeus(tudo).some(d => d === doBruno || d === vendaAntigaBruno || d === orfao), 'vazou');

// ⚠️ Sem ninguém logado o filtro devolve VAZIO, nunca a lista inteira. Se devolvesse tudo, a
// primeira pintura da tela (antes do React montar o App) mostraria os dados de todo mundo.
definirUsuarioAtual(null);
checa('sem usuário definido não devolve nada', soMeus(tudo).length === 0, 'devolveu dados sem usuário');

console.log('\n═══ 5. VISÃO DE EQUIPE (só admin, desligada por padrão) ═══');
definirUsuarioAtual(BRUNO);
checa('desligada: admin vê só o dele', soMeus(tudo).length === 3, '');
win.localStorage.setItem(VER_TUDO_KEY, '1');
checa('ligada: admin vê a equipe toda', soMeus(tudo).length === 5, '');
definirUsuarioAtual(AMIGO);
checa('a chave NÃO serve pra quem não é admin', soMeus(tudo).length === 2, 'não-admin ligou a visão de equipe');
win.localStorage.setItem(VER_TUDO_KEY, '0');

console.log('\n═══ 6. O CARIMBO ═══');
definirUsuarioAtual(AMIGO);
checa('carimbo grava id e código', carimboDono(BRUNO).vendedorId === 'uid-bruno' && carimboDono(BRUNO).vendedor === '77', JSON.stringify(carimboDono(BRUNO)));
checa('carimbo sem argumento usa quem está logado', carimboDono().vendedorId === 'uid-amigo', JSON.stringify(carimboDono()));
checa('carimbo sem ninguém logado não inventa dono', (definirUsuarioAtual(null), carimboDono().vendedorId) === '', '');

console.log('\n═══ 7. REGRESSÃO: nenhuma leitura pode escapar do filtro ═══');
// A proteção real não é o filtro existir, é NINGUÉM esquecer de usá-lo na próxima tela nova.
const PESSOAIS = ['clients', 'purchases', 'leads', 'purchases_lixeira'];
const linhas = src.split('\n');
let escaparam = [];
linhas.forEach((l, i) => {
    if (l.trim().startsWith('//')) return;
    PESSOAIS.forEach(c => {
        if (l.indexOf(`collection('${c}')`) === -1) return;
        // só interessa LEITURA que vira lista (onSnapshot/get + .docs.map)
        const ehLeitura = /onSnapshot|\.get\(\)/.test(l);
        if (!ehLeitura) return;
        // a leitura pode mapear na mesma linha ou na seguinte
        // Olha algumas linhas à frente: o filtro pode vir na linha do map (soMeus) ou logo dentro
        // dele, documento a documento (ehMeuRegistro) — são as duas formas da MESMA regra, e a
        // segunda é a usada quando a leitura já vem recortada por uma consulta `in`.
        const trecho = linhas.slice(i, i + 6).join('\n');
        const temFiltro = trecho.indexOf('soMeus') !== -1 || trecho.indexOf('ehMeuRegistro') !== -1;
        if (/\.docs\.map|\.docs\.forEach|snap\.forEach/.test(trecho) && !temFiltro) {
            escaparam.push(`${i + 1}: ${l.trim().slice(0, 90)}`);
        }
    });
});
checa('toda leitura de dado pessoal passa por soMeus', escaparam.length === 0, '\n        ' + escaparam.join('\n        '));

console.log(falhas ? `\n❌ ${falhas} falha(s)` : '\n✅ todos passaram');
process.exit(falhas ? 1 : 0);
