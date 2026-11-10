// 🔑 Testa que o LOGIN DO SPAMOV é por CONTA, não por aparelho.
//
// O bug (10/11/2026): a chave era `friganso_spamov_user`/`_pass` — uma só pro navegador inteiro.
// O usuário entrou na conta de um colega no mesmo computador, salvou o login do SPAmov dele, voltou
// pra própria conta, e o login do COLEGA estava lá no lugar do seu.
//
// ⚠️ O sintoma visível (campo com o nome errado) é o menos grave. O grave é o silencioso: um clique
// em "Abrir SPAmov e Logar" entraria no SPAmov com o usuário do colega e lançaria pedido no nome da
// pessoa errada, sem nenhum aviso de que algo estava trocado.
const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const ini = src.indexOf('const chaveSpamov =');
const fim = src.indexOf('const CredenciaisSpamov =');
if (ini < 0 || fim < 0) { console.log('❌ não achei o bloco de credenciais no index.html'); process.exit(1); }

const loja = {};
const win = { localStorage: {
    getItem: k => (k in loja ? loja[k] : null),
    setItem: (k, v) => { loja[k] = String(v); },
    removeItem: k => { delete loja[k]; },
} };
const postados = [];
win.postMessage = (msg) => postados.push(msg);

const montado = new Function('window', `
    let _usuarioAtual = null;
    ${src.slice(ini, fim)}
    return {
        chaveSpamov, lerCredenciaisSpamov, gravarCredenciaisSpamov, limparLegadoSpamov,
        sincronizarCredenciaisExtensao, definir: (u) => { _usuarioAtual = u; },
    };
`)(win);
const { lerCredenciaisSpamov, gravarCredenciaisSpamov, limparLegadoSpamov, sincronizarCredenciaisExtensao, chaveSpamov, definir } = montado;

let falhas = 0;
const checa = (nome, cond, extra) => { if (!cond) falhas++; console.log(`${cond ? '✅' : '❌'} ${nome}${cond ? '' : '  → ' + extra}`); };

const BRUNO = { id: 'uid-bruno', code: '77' };
const AMIGO = { id: 'uid-amigo', code: '88' };

console.log('═══ 1. CADA CONTA GUARDA A SUA ═══');
definir(AMIGO);
gravarCredenciaisSpamov('f.v.88888', 'senha-do-amigo');
definir(BRUNO);
// ⚠️ Esta é a reprodução exata do que aconteceu: logar na conta do colega, salvar, voltar pra sua.
checa('voltando pra minha conta, o campo NÃO traz o login do colega',
    lerCredenciaisSpamov().usuario === '', `veio "${lerCredenciaisSpamov().usuario}"`);

gravarCredenciaisSpamov('f.v.99206', 'minha-senha');
checa('salvo o meu, leio o meu', lerCredenciaisSpamov().usuario === 'f.v.99206', '');
definir(AMIGO);
checa('e o do colega continua intacto na conta dele',
    lerCredenciaisSpamov().usuario === 'f.v.88888', JSON.stringify(lerCredenciaisSpamov()));
definir(BRUNO);
checa('sem embaralhar de volta', lerCredenciaisSpamov().senha === 'minha-senha', '');

console.log('\n═══ 2. CHAVES SEPARADAS DE VERDADE ═══');
checa('a chave carrega o id da conta', chaveSpamov(BRUNO) !== chaveSpamov(AMIGO), 'mesma chave pra contas diferentes');
// null = NINGUÉM (só omitir o argumento quer dizer "a conta logada agora")
checa('null não vira a conta atual por acidente', chaveSpamov(null) === '', chaveSpamov(null));
definir(null);
checa('e sem conta não devolve credencial nenhuma', lerCredenciaisSpamov().usuario === '', 'vazou sem login');
gravarCredenciaisSpamov('x', 'y');
checa('nem grava solta', Object.keys(loja).filter(k => k.indexOf('prumo_spamov_') === 0).length === 2, JSON.stringify(Object.keys(loja)));

console.log('\n═══ 3. A CHAVE ANTIGA NÃO PODE SER ADOTADA ═══');
// No aparelho onde o bug aconteceu, a chave antiga guarda o login de OUTRA pessoa. Herdá-la como
// "do usuário atual" seria repetir o erro com cara de conserto.
loja['friganso_spamov_user'] = 'f.v.88888';
loja['friganso_spamov_pass'] = 'senha-do-amigo';
definir(BRUNO);
checa('o valor antigo NÃO é adotado como meu',
    lerCredenciaisSpamov().usuario === 'f.v.99206', `veio "${lerCredenciaisSpamov().usuario}"`);
limparLegadoSpamov();
checa('e some do aparelho em vez de ficar largado',
    !('friganso_spamov_user' in loja) && !('friganso_spamov_pass' in loja), JSON.stringify(Object.keys(loja)));

console.log('\n═══ 4. A EXTENSÃO PRECISA SER AVISADA ═══');
// Ela guarda a própria cópia (chrome.storage.friganso_creds). Sem o aviso na troca de conta, ela
// continuaria logando com a credencial do dono anterior mesmo com o app já correto.
postados.length = 0;
definir(AMIGO);
sincronizarCredenciaisExtensao(AMIGO);
checa('avisa a extensão ao trocar de conta', postados.length === 1 && postados[0].type === 'SET_CREDS', JSON.stringify(postados));
checa('com a credencial da conta nova', postados[0].usuario === 'f.v.88888', JSON.stringify(postados[0]));
checa('e sem disparar login automático nessa sincronização', postados[0].autoLogin === false, '');

postados.length = 0;
const SEM_LOGIN = { id: 'uid-novo', code: '99' };
definir(SEM_LOGIN);
sincronizarCredenciaisExtensao(SEM_LOGIN);
// ⚠️ Mandar VAZIO é obrigatório: se não mandasse nada, a extensão ficaria com a credencial do
// usuário anterior e o vazamento continuaria fora do app.
checa('conta sem login cadastrado manda VAZIO (não deixa a anterior lá)',
    postados.length === 1 && postados[0].usuario === '' && postados[0].senha === '', JSON.stringify(postados));

console.log('\n═══ 5. REGRESSÃO: ninguém pode voltar a ler a chave compartilhada ═══');
const vivo = src.split('\n')
    .filter(l => !l.trim().startsWith('//') && l.indexOf('removeItem') === -1)
    .join('\n');
checa('nada lê mais friganso_spamov_user/pass',
    !/getItem\(['"]friganso_spamov_(user|pass)['"]\)/.test(vivo), 'voltou a leitura da chave compartilhada');
checa('nada grava mais na chave compartilhada',
    !/setItem\(['"]friganso_spamov_(user|pass)['"]/.test(vivo), 'voltou a gravação na chave compartilhada');
checa('o card recebe key por conta (senão mostra a credencial do anterior)',
    /<CredenciaisSpamov key=\{user\.id\}/.test(src), 'faltou o key={user.id}');

console.log(falhas ? `\n❌ ${falhas} falha(s)` : '\n✅ todos passaram');
process.exit(falhas ? 1 : 0);
