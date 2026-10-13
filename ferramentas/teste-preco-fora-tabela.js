const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const exigir = (condicao, mensagem) => {
    if (!condicao) throw new Error(mensagem);
};

const inicioBloco = html.indexOf('const montarBlocoProdutoZap');
const fimBloco = html.indexOf('const SEPARADOR_ZAP', inicioBloco);
const blocoZap = html.slice(inicioBloco, fimBloco);
exigir(inicioBloco > 0 && fimBloco > inicioBloco, 'Não encontrou o montador de mensagens do WhatsApp.');
exigir(blocoZap.indexOf('produtoForaTabelaHoje(p)') < blocoZap.indexOf('checkDiscountRules'), 'O bloqueio precisa acontecer antes de calcular ou imprimir o preço.');
exigir(blocoZap.includes('Preço sob consulta'), 'Item fora da tabela precisa sair como preço sob consulta.');

const inicioCampanha = html.indexOf('const recomendarProdutos');
const fimCampanha = html.indexOf('const montarOfertas =', inicioCampanha);
const campanha = html.slice(inicioCampanha, fimCampanha);
exigir(campanha.includes('!produtoForaTabelaHoje(p)'), 'Recomendações automáticas devem excluir itens fora da tabela.');

exigir(html.includes('const lista = escolhidos.filter(p => !produtoForaTabelaHoje(p))'), 'Catálogo precisa excluir itens inativos.');
exigir(html.includes('const temPrecoConfiavel'), 'Resumo precisa distinguir preço atual de preço arquivado.');
exigir(html.includes('<AlertaProdutosForaTabela produtos={produtosSelecionados} />'), 'Criar ofertas precisa mostrar o alerta de preço.');

console.log('OK: proteção de preço fora da tabela validada.');
