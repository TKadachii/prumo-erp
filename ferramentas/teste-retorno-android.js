// Sem dependências: contrato do retorno do APK 3.2 e compatibilidade com a extensão.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const repo = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(repo, 'extensao/content.js'), 'utf8');
const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const transporte = src.slice(src.indexOf('    function ehNavegadorAndroid()'), src.indexOf('    // ================= PROCURA DE PESSOAS'));
const decoder = html.slice(html.indexOf('        function decodificarRetornoSpamov('), html.indexOf('        const App = () =>'));
const produtos = Array.from({length: 1000}, (_, i) => ({code: String(1000+i), name: 'Coração e açém '+i, originalPrice: 23.5+i/100, precoCartao: 24.1, precosPrazo: {7: 24.1, 45: 26.2}}));
function ambiente(android, lista = produtos) {
    const dados = {}, abas = [], avisos = [];
    const win = {__frigInjected: android, location: {href: ''}, open: url => abas.push(url)}; win.top=win;
    win.chrome = {storage: {local: {set: (v, cb) => {Object.assign(dados,v);cb();}}}};
    const ctx = vm.createContext({window:win,chrome:win.chrome,navigator:{maxTouchPoints:android?5:0},APP_URL:'https://tkadachii.github.io/prumo-erp/',extrairListaPrecos:()=>lista,statusBox:()=>txt=>avisos.push(txt),alert:txt=>avisos.push(txt),btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,console});
    vm.runInContext(transporte+'\n'+decoder,ctx);
    return {ctx,win,dados,abas,avisos};
}
const app=ambiente(true); app.ctx.enviarTabelaParaApp();
assert.equal(app.abas.length,0); assert.deepEqual(app.dados,{});
const url=new URL(app.win.location.href); assert.equal(url.protocol,'friganso:');
const retorno=app.ctx.decodificarRetornoSpamov(url.searchParams.get('pedidojson'));
assert.equal(retorno.tipo,'tabela'); assert.deepEqual(JSON.parse(JSON.stringify(retorno.produtos)),produtos);
console.log('OK: 1.000 produtos, acentos, cartão e prazos retornam sem aba nem chrome.storage.');
const pc=ambiente(false); pc.ctx.enviarTabelaParaApp();
assert.equal(pc.abas[0],'https://tkadachii.github.io/prumo-erp/?tabela=pendente');
assert.equal(pc.dados.friganso_tabela_pendente.produtos.length,1000);
console.log('OK: extensão de PC conserva seu transporte original.');
const vazio=ambiente(true,[]); vazio.ctx.enviarTabelaParaApp(); assert.equal(vazio.win.location.href,''); assert.equal(vazio.avisos.length,1);
const encode=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o))));
assert.equal(app.ctx.decodificarRetornoSpamov(encode({itens:[{code:'100',qty:2}],cliente:'42'})).tipo,'pedido');
assert.equal(app.ctx.decodificarRetornoSpamov(encode({frigansoRetorno:1,tipo:'voltar'})).tipo,'voltar');
for(const p of [{frigansoRetorno:1,tipo:'tabela',produtos:[]},{frigansoRetorno:1,tipo:'tabela',produtos:[{code:1,name:'X',originalPrice:'NaN'}]},{frigansoRetorno:1,tipo:'invalido'},{frigansoRetorno:2,tipo:'voltar'},null,{}]) assert.throws(()=>app.ctx.decodificarRetornoSpamov(encode(p)));
assert.throws(()=>app.ctx.decodificarRetornoSpamov('!invalid!'));
console.log('OK: pedidos anteriores, voltar, tabela vazia e conteúdo inválido.');
// Executa carregarTabela real: é ela que mantém regras de preço e comparação.
const inicio=html.indexOf('const carregarTabela = (brutos, origem) => {');
const fim=html.indexOf('// A extensão entrega de dois jeitos:',inicio);
let carregados, comparacao;
const ctx=vm.createContext({products:[{code:'1000',name:'Coração e açém 0',originalPrice:25},{code:'999',name:'Produto removido',originalPrice:10}],checkDiscountRules:(c,n,p)=>({unitFinalPrice:Number(p)*0.97}),setPriceChanges:x=>comparacao=x,setProducts:x=>carregados=x,showMessage:()=>{},window:{localStorage:{setItem:()=>{}}}});
vm.runInContext(html.slice(inicio,fim)+'\nglobalThis.carregar=carregarTabela;',ctx);
ctx.carregar(retorno.produtos,'extensao');
assert.equal(carregados.length,1000); assert.equal(comparacao.changes[0].oldPrice,25); assert.equal(comparacao.changes[0].newPrice,23.5); assert.equal(comparacao.novos.length,999); assert.equal(comparacao.removidos,1);
assert.equal(carregados[0].precoCartao,24.1); assert.equal(carregados[0].precosPrazo[45],26.2);
console.log('OK: tabela importada alimenta a comparação anterior, novos e removidos.');
