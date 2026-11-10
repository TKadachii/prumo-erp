// 🎛️ Testa o PAINEL DE AÇÕES que a extensão injeta no SPAmov (PC).
//
// Antes cada botão era `position:fixed` com um `bottom` fixo (18px, 70px, 120px...). Três defeitos:
// a pilha ficava com BURACOS quando um botão não aparecia naquela tela (eles são condicionais), dois
// botões disputavam a mesma altura (220px era do "ocultar" e também do "Atualizar Tabela"), e não
// dava pra tirar da frente quando tapavam algo do SPAmov.
//
// ⚠️ O que mais importa aqui é o que NÃO pode mudar: os ids. A fila troca o rótulo do botão por
// getElementById, e o "esconder" varre [id^="friganso-"]. Trocar a embalagem não pode quebrar isso.
const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'extensao', 'content.js'), 'utf8');

let falhas = 0;
const checa = (nome, cond, extra) => { if (!cond) falhas++; console.log(`${cond ? '✅' : '❌'} ${nome}${cond ? '' : '  → ' + extra}`); };

function bloco(marcador) {
    const a = src.indexOf(marcador);
    if (a < 0) { console.log('❌ não achei ' + marcador); process.exit(1); }
    let p = 0, f = -1;
    for (let k = src.indexOf('{', a); k < src.length; k++) {
        if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) { f = k + 1; break; } }
    }
    return src.slice(a, f);
}

console.log('═══ 1. OS BOTÕES VÃO PRO PAINEL, NÃO SOLTOS NA TELA ═══');
const fnBotao = bloco('function botao(id, texto, cor, bottom, onClick)');
checa('botão não se posiciona mais sozinho na tela',
    !/position:\s*"fixed"/.test(fnBotao), 'voltou o position:fixed por botão');
checa('botão entra no painel', /painelAcoes\(\)\.appendChild/.test(fnBotao), '');
// o `bottom` virou ordem: a sequência já pensada continua valendo, sem buraco
checa('o antigo "bottom" virou a ORDEM dentro do painel',
    /style\.order\s*=\s*String\(parseInt\(bottom/.test(fnBotao), 'a ordem dos botões se perdeu');
checa('o id continua sendo o que foi pedido', /b\.id\s*=\s*id/.test(fnBotao), '');

console.log('\n═══ 2. OS IDs NÃO PODEM TER MUDADO ═══');
// quem depende deles: atualizarRotulosFila (getElementById) e o "esconder" ([id^="friganso-"])
['friganso-erp-btn', 'friganso-fila-btn', 'friganso-lancar-btn', 'friganso-diag-btn',
 'friganso-tabela-btn', 'friganso-vendas-btn', 'friganso-clientes-btn', 'friganso-toggle-btn']
    .forEach(id => checa(`id "${id}" continua existindo`, src.indexOf('"' + id + '"') !== -1, 'id sumiu'));
checa('a fila continua achando o botão pelo id',
    /getElementById\("friganso-fila-btn"\)/.test(src), 'a fila perdeu a referência');

console.log('\n═══ 3. NÃO DÁ PRA FICAR PRESO ═══');
const fnOcultar = bloco('function criarBotaoOcultar(bottom)');
// ⚠️ Este botão agora mora DENTRO do painel. Se ele escondesse o painel, esconderia a si mesmo e o
// vendedor não teria como trazer nada de volta.
checa('o "esconder" não esconde o próprio painel',
    /friganso-painel/.test(fnOcultar), 'o painel entra na varredura e leva o botão junto');
checa('nem nada que esteja dentro dele',
    /closest\(["']#friganso-painel["']\)/.test(fnOcultar), 'filhos do painel ainda seriam escondidos');

const fnPainel = bloco('function painelAcoes()');
checa('o painel não é criado duas vezes',
    /getElementById\("friganso-painel"\)/.test(fnPainel), 'cada injeção criaria outro painel');
// arrastar pra fora da janela e não achar mais é pior que não poder arrastar
checa('arrastar fica preso dentro da janela',
    /Math\.max\(4,\s*Math\.min\(window\.innerWidth/.test(fnPainel), 'dá pra arrastar pra fora da tela');
checa('a posição arrastada é lembrada', /localStorage\.setItem\(PAINEL_POS/.test(fnPainel), '');
checa('e é lida de volta na próxima abertura', /localStorage\.getItem\(PAINEL_POS/.test(fnPainel), '');
checa('dá pra recolher', /itens\.style\.display\s*=\s*fechado/.test(fnPainel), '');

console.log('\n═══ 4. O CELULAR CONTINUA COMO ESTAVA ═══');
// No app Android quem manda é a barra nativa (instalarBarraAndroid); estes botões ficam escondidos.
checa('no Android os botões seguem ocultos',
    /ehNavegadorAndroid\(\)\s*\)\s*\{\s*b\.style\.display\s*=\s*'none'/.test(fnBotao),
    'o Android passaria a ver os dois conjuntos');

console.log(falhas ? `\n❌ ${falhas} falha(s)` : '\n✅ todos passaram');
process.exit(falhas ? 1 : 0);
