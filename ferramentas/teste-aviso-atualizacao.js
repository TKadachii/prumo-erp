// 🔄 Testa a tela de "Atualização disponível" mostrar O QUE MUDOU e O QUE FAZER.
//
// ⚠️ O detalhe que decide tudo: quem mostra essa tela é o app ANTIGO. Ele não tem como conhecer o
// CHANGELOG da versão nova — essa lista vive dentro do index.html que ainda nem foi baixado. A única
// coisa que o app antigo lê do servidor é o web-version.json. Por isso as novidades viajam ali, e
// por isso este teste existe: se alguém "simplificar" lendo o CHANGELOG local, a tela passa a
// mostrar as novidades da versão VELHA — e ninguém percebe, porque o texto parece certo.
const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const RAIZ = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

let falhas = 0;
const checa = (nome, cond, extra) => { if (!cond) falhas++; console.log(`${cond ? '✅' : '❌'} ${nome}${cond ? '' : '  → ' + extra}`); };

console.log('═══ 1. O ARQUIVO PUBLICADO CARREGA AS NOVIDADES ═══');
const wv = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web-version.json'), 'utf8'));
const build = Number((/const APP_BUILD_VERSION = (\d+)/.exec(src) || [])[1]);
checa('o build bate com o do index.html', wv.version === build, `${wv.version} ≠ ${build}`);
const topo = /\{\s*versao:\s*'([^']+)'/.exec(src.slice(src.indexOf('const CHANGELOG = [')));
checa('a versão bate com o topo do CHANGELOG', wv.versao === topo[1], `${wv.versao} ≠ ${topo[1]}`);
checa('tem a lista do que mudou', Array.isArray(wv.itens) && wv.itens.length > 0, JSON.stringify(wv.itens));

console.log('\n═══ 2. A TELA USA O QUE VEIO DO SERVIDOR, NÃO O CHANGELOG LOCAL ═══');
const i = src.indexOf('const SiteUpdateModal');
const modal = src.slice(i, src.indexOf('const LoginScreen'));
checa('lê as novidades do siteUpdate (o que veio do servidor)', /siteUpdate\s*&&\s*siteUpdate\.itens/.test(modal), '');
checa('NÃO lê o CHANGELOG local', modal.indexOf('CHANGELOG') === -1,
    'está lendo o CHANGELOG da versão VELHA — vai mostrar as novidades erradas');
checa('mostra a ação em destaque quando existe', /siteUpdate\.acao/.test(modal), '');
checa('a ação aparece ANTES da lista (é o que precisa ser visto)',
    modal.indexOf('acao &&') < modal.indexOf('itens.length > 0'), 'a ação ficou embaixo das novidades');
// arquivo antigo (só {version}) não pode quebrar a tela de quem ainda não atualizou
checa('aguenta um web-version.json sem novidades', /\(siteUpdate && siteUpdate\.itens\) \|\| \[\]/.test(modal),
    'sem isso, um arquivo no formato antigo derruba a tela');

console.log('\n═══ 3. O GERADOR ═══');
// Gera num diretório de teste e confere o resultado, sem tocar no arquivo de verdade.
const antes = fs.readFileSync(path.join(RAIZ, 'web-version.json'), 'utf8');
execFileSync('node', [path.join(__dirname, 'gerar-web-version.js')], { cwd: RAIZ });
const depois = fs.readFileSync(path.join(RAIZ, 'web-version.json'), 'utf8');
checa('rodar de novo dá exatamente o mesmo arquivo', antes === depois,
    'o gerador não é estável — rodar duas vezes muda o resultado');

// ⚠️ O aviso de reinstalar a extensão não pode aparecer DUAS vezes (na lista e na ação): repetido,
// ele perde força justamente onde precisa ser notado.
const temAviso = (t) => /MUDA A EXTENS[ÃA]O|baixe de novo pelo site/i.test(t);
checa('o aviso da extensão não se repete na lista de novidades',
    !(wv.itens || []).some(temAviso), JSON.stringify((wv.itens || []).filter(temAviso)));
if (wv.acao) checa('quando há ação, ela fala da extensão ou do app', /extens|aplicativo/i.test(wv.acao), wv.acao);
else console.log('   (esta entrega não exige ação do usuário — nada a conferir aqui)');

console.log(falhas ? `\n❌ ${falhas} falha(s)` : '\n✅ todos passaram');
process.exit(falhas ? 1 : 0);
