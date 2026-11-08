const PDFDocument = require('pdfkit');
const { formatarEuro, formatarData } = require('./calculos');

const COR = '#24493c';
const TEXTO = '#1d1c19';
const CINZA = '#77736a';
const LINHA = '#d9d5ca';
const MARGEM = 50;
const LARGURA = 595.28 - MARGEM * 2;

const METODOS = {
  transferencia: 'Transferência bancária',
  numerario: 'Numerário',
  mbway: 'MB WAY',
  cartao: 'Cartão',
  multibanco: 'Multibanco',
};

function novoDocumento(titulo) {
  return new PDFDocument({ size: 'A4', margin: MARGEM, info: { Title: titulo } });
}

function cabecalho(doc, empresa, tipo, numero) {
  doc.fillColor(COR).font('Helvetica-Bold').fontSize(17).text(empresa.nome, MARGEM, MARGEM);
  doc.fillColor(CINZA).font('Helvetica').fontSize(9);
  [empresa.morada, empresa.nif && `NIF ${empresa.nif}`, empresa.email, empresa.telefone]
    .filter(Boolean)
    .forEach((linha) => doc.text(linha));

  doc
    .fillColor(TEXTO)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(tipo, MARGEM, MARGEM, { width: LARGURA, align: 'right' });
  doc
    .fillColor(CINZA)
    .font('Helvetica')
    .fontSize(11)
    .text(numero, MARGEM, doc.y, { width: LARGURA, align: 'right' });

  const y = Math.max(doc.y, 125) + 14;
  doc.moveTo(MARGEM, y).lineTo(MARGEM + LARGURA, y).lineWidth(1.5).strokeColor(COR).stroke();
  doc.y = y + 18;
}

function blocoCliente(doc, orc, extras) {
  const topo = doc.y;
  doc.fillColor(CINZA).font('Helvetica-Bold').fontSize(8).text('CLIENTE', MARGEM, topo);
  doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(11).text(orc.cliente_nome, MARGEM, topo + 13);
  doc.font('Helvetica').fontSize(9).fillColor(CINZA);
  [orc.cliente_morada, orc.cliente_nif && `NIF ${orc.cliente_nif}`, orc.cliente_email]
    .filter(Boolean)
    .forEach((linha) => doc.text(linha, MARGEM));
  const fimEsquerda = doc.y;

  let y = topo;
  extras.forEach(([rotulo, valor]) => {
    doc.fillColor(CINZA).font('Helvetica-Bold').fontSize(8).text(rotulo.toUpperCase(), 350, y, {
      width: LARGURA - 300,
      align: 'right',
    });
    doc.fillColor(TEXTO).font('Helvetica').fontSize(10).text(valor, 350, y + 11, {
      width: LARGURA - 300,
      align: 'right',
    });
    y += 32;
  });

  doc.y = Math.max(fimEsquerda, y) + 16;
}

function tabelaItens(doc, itens) {
  const col = { desc: MARGEM, qtd: 335, preco: 400, total: 480 };

  const cabecalhoTabela = () => {
    const y = doc.y;
    doc.rect(MARGEM, y, LARGURA, 22).fill(COR);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
    doc.text('DESCRIÇÃO', col.desc + 8, y + 7);
    doc.text('QTD.', col.qtd, y + 7, { width: 50, align: 'right' });
    doc.text('PREÇO UN.', col.preco, y + 7, { width: 70, align: 'right' });
    doc.text('TOTAL', col.total, y + 7, { width: MARGEM + LARGURA - col.total - 8, align: 'right' });
    doc.y = y + 26;
  };

  cabecalhoTabela();

  itens.forEach((item) => {
    if (doc.y > 700) {
      doc.addPage();
      cabecalhoTabela();
    }
    const y = doc.y + 4;
    doc.fillColor(TEXTO).font('Helvetica').fontSize(10);
    doc.text(item.descricao, col.desc + 8, y, { width: col.qtd - col.desc - 20 });
    const fim = doc.y;
    const num = (Number(item.quantidade) % 1 === 0 ? Number(item.quantidade) : Number(item.quantidade).toFixed(2));
    doc.text(String(num).replace('.', ','), col.qtd, y, { width: 50, align: 'right' });
    doc.text(formatarEuro(item.preco_unitario), col.preco, y, { width: 70, align: 'right' });
    doc.text(
      formatarEuro(Number(item.quantidade) * Number(item.preco_unitario)),
      col.total,
      y,
      { width: MARGEM + LARGURA - col.total - 8, align: 'right' }
    );
    const yFim = Math.max(fim, y + 12) + 6;
    doc.moveTo(MARGEM, yFim).lineTo(MARGEM + LARGURA, yFim).lineWidth(0.5).strokeColor(LINHA).stroke();
    doc.y = yFim;
  });
  doc.y += 10;
}

function linhaTotal(doc, rotulo, valor, destaque = false) {
  if (doc.y > 740) doc.addPage();
  const y = doc.y;
  const x = 340;
  doc
    .fillColor(destaque ? TEXTO : CINZA)
    .font(destaque ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(destaque ? 12 : 10)
    .text(rotulo, x, y, { width: 100 });
  doc.text(valor, x + 100, y, { width: MARGEM + LARGURA - x - 100, align: 'right' });
  doc.y = y + (destaque ? 22 : 17);
}

function rodape(doc, empresa, texto) {
  const y = 752;
  doc.moveTo(MARGEM, y).lineTo(MARGEM + LARGURA, y).lineWidth(0.5).strokeColor(LINHA).stroke();
  doc.fillColor(CINZA).font('Helvetica').fontSize(8.5);
  if (texto) doc.text(texto, MARGEM, y + 8, { width: LARGURA });
  if (empresa.iban) doc.text(`IBAN ${empresa.iban}`, MARGEM, doc.y + 2, { width: LARGURA });
}

function gerarOrcamentoPdf(empresa, orc) {
  const doc = novoDocumento(`Orçamento ${orc.numero}`);
  cabecalho(doc, empresa, 'ORÇAMENTO', orc.numero);

  const extras = [['Data de emissão', formatarData(orc.data_emissao)]];
  if (orc.validade) extras.push(['Válido até', formatarData(orc.validade)]);
  blocoCliente(doc, orc, extras);

  tabelaItens(doc, orc.itens);

  const t = orc.totais;
  linhaTotal(doc, 'Subtotal', formatarEuro(t.subtotal));
  if (t.desconto > 0) {
    linhaTotal(doc, `Desconto (${Number(orc.desconto_percent)}%)`, `-${formatarEuro(t.desconto)}`);
  }
  linhaTotal(doc, `IVA (${Number(orc.iva_percent)}%)`, formatarEuro(t.iva));
  doc.moveTo(340, doc.y).lineTo(MARGEM + LARGURA, doc.y).lineWidth(1).strokeColor(COR).stroke();
  doc.y += 8;
  linhaTotal(doc, 'Total', formatarEuro(t.total), true);

  if (orc.notas) {
    doc.y += 12;
    doc.fillColor(CINZA).font('Helvetica-Bold').fontSize(8).text('NOTAS', MARGEM, doc.y);
    doc.fillColor(TEXTO).font('Helvetica').fontSize(9.5).text(orc.notas, MARGEM, doc.y + 3, {
      width: 300,
    });
  }

  rodape(doc, empresa, 'Orçamento sujeito a aprovação do cliente dentro do prazo de validade.');
  return doc;
}

function gerarReciboPdf(empresa, recibo, orc) {
  const doc = novoDocumento(`Recibo ${recibo.numero}`);
  cabecalho(doc, empresa, 'RECIBO', recibo.numero);

  blocoCliente(doc, orc, [
    ['Data de pagamento', formatarData(recibo.data_pagamento)],
    ['Referente a', orc.numero],
  ]);

  doc.y += 6;
  const y = doc.y;
  doc.roundedRect(MARGEM, y, LARGURA, 92, 6).fillAndStroke('#f1f5f2', LINHA);
  doc.fillColor(CINZA).font('Helvetica-Bold').fontSize(8).text('VALOR RECEBIDO', MARGEM + 20, y + 18);
  doc
    .fillColor(COR)
    .font('Helvetica-Bold')
    .fontSize(26)
    .text(formatarEuro(recibo.valor), MARGEM + 20, y + 32);
  doc.fillColor(CINZA).font('Helvetica').fontSize(9.5).text(
    `Método: ${METODOS[recibo.metodo] || recibo.metodo}`,
    MARGEM + 20,
    y + 68
  );
  doc.y = y + 112;

  doc.fillColor(TEXTO).font('Helvetica').fontSize(10).text(
    `Recebemos de ${orc.cliente_nome} a quantia de ${formatarEuro(recibo.valor)}, ` +
      `referente ao orçamento ${orc.numero}, no valor total de ${formatarEuro(orc.totais.total)}.`,
    MARGEM,
    doc.y,
    { width: LARGURA, lineGap: 3 }
  );

  doc.y += 18;
  const pendente = Math.max(orc.totais.total - recibo.acumulado, 0);
  linhaTotal(doc, 'Total do orçamento', formatarEuro(orc.totais.total));
  linhaTotal(doc, 'Pago até esta data', formatarEuro(recibo.acumulado));
  linhaTotal(doc, 'Em dívida', formatarEuro(pendente), true);

  rodape(doc, empresa, 'Documento emitido eletronicamente.');
  return doc;
}

module.exports = { gerarOrcamentoPdf, gerarReciboPdf, METODOS };
