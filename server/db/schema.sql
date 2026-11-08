CREATE TABLE IF NOT EXISTS empresa (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome VARCHAR(120) NOT NULL,
  nif VARCHAR(20),
  morada VARCHAR(200),
  email VARCHAR(150),
  telefone VARCHAR(30),
  iban VARCHAR(40)
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  ano INT NOT NULL,
  seq INT NOT NULL,
  numero TEXT GENERATED ALWAYS AS ('ORC-' || ano || '-' || LPAD(seq::text, 3, '0')) STORED,
  cliente_nome VARCHAR(120) NOT NULL,
  cliente_email VARCHAR(150),
  cliente_nif VARCHAR(20),
  cliente_morada VARCHAR(200),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  validade DATE,
  estado VARCHAR(12) NOT NULL DEFAULT 'rascunho'
    CHECK (estado IN ('rascunho', 'enviado', 'aprovado', 'recusado')),
  desconto_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (desconto_percent BETWEEN 0 AND 100),
  iva_percent NUMERIC(5,2) NOT NULL DEFAULT 23 CHECK (iva_percent BETWEEN 0 AND 100),
  notas TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (ano, seq)
);

CREATE TABLE IF NOT EXISTS itens_orcamento (
  id SERIAL PRIMARY KEY,
  orcamento_id INT NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  posicao INT NOT NULL DEFAULT 0,
  descricao VARCHAR(250) NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0)
);

CREATE TABLE IF NOT EXISTS recibos (
  id SERIAL PRIMARY KEY,
  ano INT NOT NULL,
  seq INT NOT NULL,
  numero TEXT GENERATED ALWAYS AS ('RC-' || ano || '-' || LPAD(seq::text, 3, '0')) STORED,
  orcamento_id INT NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  metodo VARCHAR(20) NOT NULL DEFAULT 'transferencia',
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (ano, seq)
);

CREATE INDEX IF NOT EXISTS idx_itens_orcamento ON itens_orcamento (orcamento_id);
CREATE INDEX IF NOT EXISTS idx_recibos_orcamento ON recibos (orcamento_id);

INSERT INTO empresa (id, nome, nif, morada, email, telefone, iban) VALUES
  (1, 'Studio Exemplo, Lda', '509 123 456', 'Rua das Oficinas 12, 4000-123 Porto',
   'geral@studioexemplo.pt', '220 123 456', 'PT50 0000 0000 0000 0000 0000 0')
ON CONFLICT (id) DO NOTHING;
