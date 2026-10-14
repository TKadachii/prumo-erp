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

const recorte = (inicio, fim) => html.slice(html.indexOf(inicio), html.indexOf(fim, html.indexOf(inicio)));
const resumo = recorte('const executarCopiaResumo', 'const RESUMO_RASCUNHO_KEY');
exigir(resumo.indexOf('mapearItensForaTabela') < resumo.indexOf('navigator.clipboard.writeText'), 'Resumo deve avisar antes de copiar e faturar.');
const fila = recorte('const copiarEConfirmar', 'const copiarUm');
exigir(fila.indexOf('mapearItensForaTabela') < fila.indexOf('navigator.clipboard.writeText'), 'Fila deve avisar antes de copiar e salvar a venda.');
const oferta = recorte('const copiarOferta', 'return (');
exigir(oferta.indexOf('produtoForaTabelaHoje') < oferta.indexOf('navigator.clipboard.writeText'), 'Criar ofertas deve confirmar antes de copiar.');
exigir(html.includes('const auditoriaPrecos = useMemo'), 'Campanhas devem auditar a carteira selecionada.');
exigir(html.includes('const clientes = clientesSelecionados.filter'), 'Auditoria deve contar quantos clientes compram cada item fora da tabela.');
exigir(html.includes('Continuar campanha protegida'), 'Campanha deve confirmar a auditoria antes de iniciar.');

console.log('OK: proteção de preço fora da tabela validada.');
