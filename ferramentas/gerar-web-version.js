#!/usr/bin/env node
/**
 * 🔄 gerar-web-version.js — monta o web-version.json a partir do CHANGELOG do index.html.
 *
 * Rode da raiz do repo, DEPOIS de escrever a entrada nova no CHANGELOG e bumpar o
 * APP_BUILD_VERSION:
 *     node ferramentas/gerar-web-version.js
 *
 * POR QUE ISTO EXISTE
 * A tela de "Atualização disponível" é mostrada pelo app ANTIGO — ele não tem como conhecer o
 * CHANGELOG da versão nova, que vive dentro do index.html que ainda não foi baixado. A única coisa
 * que ele lê do servidor é o web-version.json. Então as novidades viajam ali.
 *
 * E por que gerar em vez de escrever à mão: seria mais um lugar com a mesma informação. Este projeto
 * já tem três números que precisam bater (APP_BUILD_VERSION, web-version.json, sw.js) e a lição
 * recorrente é que, quando a pessoa tem que lembrar de copiar, uma hora não copia. Aqui a fonte é
 * uma só: a entrada do topo do CHANGELOG.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

const build = Number((/const APP_BUILD_VERSION = (\d+)/.exec(html) || [])[1]);
if (!build) { console.error('❌ não achei o APP_BUILD_VERSION no index.html'); process.exit(1); }

// primeira entrada do CHANGELOG = a que está sendo entregue agora
const i = html.indexOf('const CHANGELOG = [');
const re = /\{\s*versao:\s*'([^']+)',\s*data:\s*'([^']+)',\s*areas:\s*\[([^\]]*)\],\s*itens:\s*\[([\s\S]*?)\]\s*\}/;
const m = re.exec(html.slice(i, i + 20000));
if (!m) { console.error('❌ não consegui ler a entrada do topo do CHANGELOG'); process.exit(1); }

const versao = m[1];
const areas = m[3].replace(/'/g, '').split(',').map(s => s.trim()).filter(Boolean);
const itens = [...m[4].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1].replace(/\\'/g, "'"));

// ⚠️ Item que já começa com o aviso de reinstalar a extensão NÃO entra na lista de novidades: ele
// vira a AÇÃO, em destaque. Repetir nos dois lugares só faz o aviso perder força.
const ehAvisoExtensao = (t) => /MUDA A EXTENS[ÃA]O|baixe de novo pelo site/i.test(t);
const novidades = itens.filter(t => !ehAvisoExtensao(t));

// A ação é derivada das ÁREAS da entrega, não de alguém lembrar de escrever.
let acao = null;
if (areas.includes('extensao')) {
    acao = 'Esta versão muda a EXTENSÃO. Depois de atualizar, baixe a extensão de novo pelo site, '
         + 'troque os arquivos na pasta e clique no 🔄 em chrome://extensions.';
}
if (areas.includes('app') && !acao) {
    acao = 'Esta versão também muda o aplicativo do celular. Abra o app depois pra ele se atualizar.';
}

const saida = { version: build, versao: versao, data: m[2], itens: novidades };
if (acao) saida.acao = acao;

const destino = path.join(RAIZ, 'web-version.json');
fs.writeFileSync(destino, JSON.stringify(saida, null, 2) + '\n', 'utf8');

console.log(`✅ web-version.json gerado`);
console.log(`   build ${build} · v${versao} · ${novidades.length} novidade(s)`);
console.log(acao ? `   ⚠️ com ação: ${acao.slice(0, 60)}...` : '   sem ação necessária');
