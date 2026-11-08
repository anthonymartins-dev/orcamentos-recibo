require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool, types } = require('pg');
const { arredondar, calcularTotais } = require('./calculos');
const { gerarOrcamentoPdf, gerarReciboPdf, METODOS } = require('./pdf');

// DATE devolve texto "2026-11-08"; NUMERIC devolve número em vez de texto.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, parseFloat);

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ESTADOS = ['rascunho', 'enviado', 'aprovado', 'recusado'];
const EDITAVEIS = ['rascunho', 'enviado'];

const rota = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

/* ---------- validação ---------- */

function lerOrcamento(corpo) {
  const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const itens = Array.isArray(corpo.itens)
    ? corpo.itens.map((i) => ({
        descricao: texto(i.descricao),
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario),
      }))
    : [];

  const dados = {
    cliente_nome: texto(corpo.cliente_nome),
    cliente_email: texto(corpo.cliente_email),
    cliente_nif: texto(corpo.cliente_nif),
    cliente_morada: texto(corpo.cliente_morada),
    data_emissao: texto(corpo.data_emissao),
    validade: texto(corpo.validade),
    desconto_percent: Number(corpo.desconto_percent ?? 0),
    iva_percent: Number(corpo.iva_percent ?? 23),
    notas: texto(corpo.notas),
    itens,
  };

  let erro = null;
  if (!dados.cliente_nome) erro = 'O nome do cliente é obrigatório';
  else if (dados.cliente_email && !/^\S+@\S+\.\S+$/.test(dados.cliente_email)) erro = 'Email inválido';
  else if (itens.length === 0) erro = 'Adiciona pelo menos um item';
  else if (itens.some((i) => !i.descricao)) erro = 'Todos os itens precisam de descrição';
  else if (itens.some((i) => !(i.quantidade > 0))) erro = 'A quantidade tem de ser maior que zero';
  else if (itens.some((i) => !(i.preco_unitario >= 0))) erro = 'O preço não pode ser negativo';
  else if (!(dados.desconto_percent >= 0 && dados.desconto_percent <= 100)) erro = 'Desconto entre 0 e 100';
  else if (!(dados.iva_percent >= 0 && dados.iva_percent <= 100)) erro = 'IVA entre 0 e 100';

  return { dados, erro };
}

/* ---------- leitura ---------- */

async function carregarOrcamento(id, cliente = pool) {
  const { rows } = await cliente.query('SELECT * FROM orcamentos WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  const orc = rows[0];

  const itens = (
    await cliente.query('SELECT * FROM itens_orcamento WHERE orcamento_id = $1 ORDER BY posicao, id', [id])
  ).rows;
  const recibos = (
    await cliente.query('SELECT * FROM recibos WHERE orcamento_id = $1 ORDER BY id', [id])
  ).rows;

  const totais = calcularTotais(itens, orc.desconto_percent, orc.iva_percent);
  const pago = arredondar(recibos.reduce((s, r) => s + r.valor, 0));

  return { ...orc, itens, recibos, totais, pago, em_divida: arredondar(totais.total - pago) };
}

async function carregarEmpresa() {
  const { rows } = await pool.query('SELECT * FROM empresa WHERE id = 1');
  return rows[0];
}

/* ---------- numeração ---------- */

async function proximaSequencia(cliente, tabela, ano) {
  await cliente.query('SELECT pg_advisory_xact_lock($1)', [tabela === 'orcamentos' ? 1 : 2]);
  const { rows } = await cliente.query(
    `SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM ${tabela} WHERE ano = $1`,
    [ano]
  );
  return rows[0].seq;
}

async function guardarItens(cliente, orcamentoId, itens) {
  await cliente.query('DELETE FROM itens_orcamento WHERE orcamento_id = $1', [orcamentoId]);
  for (const [posicao, item] of itens.entries()) {
    await cliente.query(
      `INSERT INTO itens_orcamento (orcamento_id, posicao, descricao, quantidade, preco_unitario)
       VALUES ($1, $2, $3, $4, $5)`,
      [orcamentoId, posicao, item.descricao, item.quantidade, item.preco_unitario]
    );
  }
}

/* ---------- empresa ---------- */

app.get('/empresa', rota(async (req, res) => res.json(await carregarEmpresa())));

app.put('/empresa', rota(async (req, res) => {
  const c = req.body;
  if (!c.nome || !String(c.nome).trim()) {
    return res.status(400).json({ erro: 'O nome da empresa é obrigatório' });
  }
  const { rows } = await pool.query(
    `UPDATE empresa SET nome = $1, nif = $2, morada = $3, email = $4, telefone = $5, iban = $6
     WHERE id = 1 RETURNING *`,
    [c.nome.trim(), c.nif || null, c.morada || null, c.email || null, c.telefone || null, c.iban || null]
  );
  res.json(rows[0]);
}));

/* ---------- orçamentos ---------- */

app.get('/orcamentos', rota(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT o.*,
      COALESCE(json_agg(json_build_object('quantidade', i.quantidade, 'preco_unitario', i.preco_unitario))
        FILTER (WHERE i.id IS NOT NULL), '[]') AS itens,
      COALESCE((SELECT SUM(valor) FROM recibos r WHERE r.orcamento_id = o.id), 0) AS pago
    FROM orcamentos o
    LEFT JOIN itens_orcamento i ON i.orcamento_id = o.id
    GROUP BY o.id
    ORDER BY o.ano DESC, o.seq DESC`);

  res.json(
    rows.map(({ itens, ...o }) => {
      const totais = calcularTotais(itens, o.desconto_percent, o.iva_percent);
      return { ...o, total: totais.total, pago: Number(o.pago), em_divida: arredondar(totais.total - o.pago) };
    })
  );
}));

app.get('/orcamentos/:id', rota(async (req, res) => {
  const orc = await carregarOrcamento(req.params.id);
  if (!orc) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  res.json(orc);
}));

app.post('/orcamentos', rota(async (req, res) => {
  const { dados, erro } = lerOrcamento(req.body);
  if (erro) return res.status(400).json({ erro });

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const ano = new Date().getFullYear();
    const seq = await proximaSequencia(cliente, 'orcamentos', ano);

    const { rows } = await cliente.query(
      `INSERT INTO orcamentos (ano, seq, cliente_nome, cliente_email, cliente_nif, cliente_morada,
         data_emissao, validade, desconto_percent, iva_percent, notas)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), $8, $9, $10, $11)
       RETURNING id`,
      [ano, seq, dados.cliente_nome, dados.cliente_email, dados.cliente_nif, dados.cliente_morada,
       dados.data_emissao, dados.validade, dados.desconto_percent, dados.iva_percent, dados.notas]
    );
    await guardarItens(cliente, rows[0].id, dados.itens);
    await cliente.query('COMMIT');
    res.status(201).json(await carregarOrcamento(rows[0].id));
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}));

app.put('/orcamentos/:id', rota(async (req, res) => {
  const { dados, erro } = lerOrcamento(req.body);
  if (erro) return res.status(400).json({ erro });

  const atual = await carregarOrcamento(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  if (!EDITAVEIS.includes(atual.estado)) {
    return res.status(409).json({ erro: 'Só é possível editar orçamentos em rascunho ou enviados' });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `UPDATE orcamentos SET cliente_nome = $1, cliente_email = $2, cliente_nif = $3,
         cliente_morada = $4, data_emissao = COALESCE($5::date, data_emissao), validade = $6,
         desconto_percent = $7, iva_percent = $8, notas = $9
       WHERE id = $10`,
      [dados.cliente_nome, dados.cliente_email, dados.cliente_nif, dados.cliente_morada,
       dados.data_emissao, dados.validade, dados.desconto_percent, dados.iva_percent, dados.notas,
       req.params.id]
    );
    await guardarItens(cliente, req.params.id, dados.itens);
    await cliente.query('COMMIT');
    res.json(await carregarOrcamento(req.params.id));
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}));

app.patch('/orcamentos/:id/estado', rota(async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) return res.status(400).json({ erro: 'Estado inválido' });

  const atual = await carregarOrcamento(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  if (atual.recibos.length > 0 && estado !== 'aprovado') {
    return res.status(409).json({ erro: 'Este orçamento já tem recibos emitidos' });
  }

  await pool.query('UPDATE orcamentos SET estado = $1 WHERE id = $2', [estado, req.params.id]);
  res.json(await carregarOrcamento(req.params.id));
}));

app.delete('/orcamentos/:id', rota(async (req, res) => {
  const atual = await carregarOrcamento(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  if (atual.recibos.length > 0) {
    return res.status(409).json({ erro: 'Não é possível apagar um orçamento com recibos emitidos' });
  }
  await pool.query('DELETE FROM orcamentos WHERE id = $1', [req.params.id]);
  res.status(204).send();
}));

app.get('/orcamentos/:id/pdf', rota(async (req, res) => {
  const orc = await carregarOrcamento(req.params.id);
  if (!orc) return res.status(404).json({ erro: 'Orçamento não encontrado' });

  const doc = gerarOrcamentoPdf(await carregarEmpresa(), orc);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${orc.numero}.pdf"`);
  doc.pipe(res);
  doc.end();
}));

/* ---------- recibos ---------- */

app.get('/recibos', rota(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.*, o.numero AS orcamento_numero, o.cliente_nome
    FROM recibos r JOIN orcamentos o ON o.id = r.orcamento_id
    ORDER BY r.ano DESC, r.seq DESC`);
  res.json(rows);
}));

app.post('/orcamentos/:id/recibos', rota(async (req, res) => {
  const valor = arredondar(Number(req.body.valor));
  const metodo = req.body.metodo || 'transferencia';

  if (!(valor > 0)) return res.status(400).json({ erro: 'O valor tem de ser maior que zero' });
  if (!METODOS[metodo]) return res.status(400).json({ erro: 'Método de pagamento inválido' });

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('SELECT id FROM orcamentos WHERE id = $1 FOR UPDATE', [req.params.id]);
    const orc = await carregarOrcamento(req.params.id, cliente);

    if (!orc) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    if (orc.estado !== 'aprovado') {
      await cliente.query('ROLLBACK');
      return res.status(409).json({ erro: 'Só é possível emitir recibos de orçamentos aprovados' });
    }
    if (valor > orc.em_divida + 0.001) {
      await cliente.query('ROLLBACK');
      return res.status(400).json({ erro: 'O valor excede o montante em dívida' });
    }

    const ano = new Date().getFullYear();
    const seq = await proximaSequencia(cliente, 'recibos', ano);
    const { rows } = await cliente.query(
      `INSERT INTO recibos (ano, seq, orcamento_id, valor, metodo, data_pagamento)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE)) RETURNING *`,
      [ano, seq, req.params.id, valor, metodo, req.body.data_pagamento || null]
    );
    await cliente.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}));

app.get('/recibos/:id/pdf', rota(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM recibos WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Recibo não encontrado' });

  const recibo = rows[0];
  const orc = await carregarOrcamento(recibo.orcamento_id);
  recibo.acumulado = arredondar(
    orc.recibos.filter((r) => r.id <= recibo.id).reduce((s, r) => s + r.valor, 0)
  );

  const doc = gerarReciboPdf(await carregarEmpresa(), recibo, orc);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${recibo.numero}.pdf"`);
  doc.pipe(res);
  doc.end();
}));

/* ---------- resumo ---------- */

app.get('/resumo', rota(async (req, res) => {
  const lista = await pool.query('SELECT id FROM orcamentos');
  const todos = await Promise.all(lista.rows.map((r) => carregarOrcamento(r.id)));

  const soma = (arr, f) => arredondar(arr.reduce((s, o) => s + f(o), 0));
  const enviados = todos.filter((o) => o.estado === 'enviado');
  const aprovados = todos.filter((o) => o.estado === 'aprovado');

  res.json({
    por_aprovar: soma(enviados, (o) => o.totais.total),
    aprovado: soma(aprovados, (o) => o.totais.total),
    recebido: soma(todos, (o) => o.pago),
    em_divida: soma(aprovados, (o) => o.em_divida),
  });
}));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Servidor a correr em http://localhost:${PORT}`));
