export function moeda(valor) {
  const n = Number(valor) || 0;
  const [inteiro, decimal] = Math.abs(n).toFixed(2).split('.');
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '-' : ''}${agrupado},${decimal} €`;
}

export function data(texto) {
  if (!texto) return '';
  const [ano, mes, dia] = texto.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export const hoje = () => new Date().toISOString().slice(0, 10);

export const METODOS = {
  transferencia: 'Transferência',
  mbway: 'MB WAY',
  multibanco: 'Multibanco',
  cartao: 'Cartão',
  numerario: 'Numerário',
};

export function calcularTotais(itens, descontoPercent, ivaPercent) {
  const arred = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotal = arred(
    itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.preco_unitario) || 0), 0)
  );
  const desconto = arred((subtotal * (Number(descontoPercent) || 0)) / 100);
  const base = arred(subtotal - desconto);
  const iva = arred((base * (Number(ivaPercent) || 0)) / 100);
  return { subtotal, desconto, base, iva, total: arred(base + iva) };
}
