const arredondar = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function calcularTotais(itens, descontoPercent, ivaPercent) {
  const subtotal = arredondar(
    itens.reduce((soma, i) => soma + Number(i.quantidade) * Number(i.preco_unitario), 0)
  );
  const desconto = arredondar((subtotal * Number(descontoPercent)) / 100);
  const base = arredondar(subtotal - desconto);
  const iva = arredondar((base * Number(ivaPercent)) / 100);
  const total = arredondar(base + iva);

  return { subtotal, desconto, base, iva, total };
}

function formatarEuro(valor) {
  const [inteiro, decimal] = Math.abs(Number(valor)).toFixed(2).split('.');
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${valor < 0 ? '-' : ''}${agrupado},${decimal} €`;
}

function formatarData(texto) {
  if (!texto) return '';
  const [ano, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${ano}`;
}

module.exports = { arredondar, calcularTotais, formatarEuro, formatarData };
