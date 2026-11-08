-- Dados de demonstração. Só corre se ainda não houver orçamentos.
DO $$
DECLARE
  o INT;
BEGIN
  IF EXISTS (SELECT 1 FROM orcamentos) THEN
    RETURN;
  END IF;

  INSERT INTO orcamentos (ano, seq, cliente_nome, cliente_email, cliente_nif, cliente_morada,
                          data_emissao, validade, estado, desconto_percent, notas)
  VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INT, 1, 'Maria Silva', 'maria@aurora.pt', '234 567 890',
          'Av. da Liberdade 100, 1250-140 Lisboa', CURRENT_DATE - 20, CURRENT_DATE + 10,
          'aprovado', 0, 'Pagamento em duas prestações.')
  RETURNING id INTO o;
  INSERT INTO itens_orcamento (orcamento_id, posicao, descricao, quantidade, preco_unitario) VALUES
    (o, 0, 'Identidade visual (logótipo e paleta)', 1, 900),
    (o, 1, 'Cartões de visita (500 un.)', 1, 120),
    (o, 2, 'Manual de marca', 1, 380);
  INSERT INTO recibos (ano, seq, orcamento_id, valor, metodo, data_pagamento)
  VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INT, 1, o, 861.00, 'transferencia', CURRENT_DATE - 12);

  INSERT INTO orcamentos (ano, seq, cliente_nome, cliente_email, cliente_nif, data_emissao,
                          validade, estado, desconto_percent)
  VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INT, 2, 'Santos & Filhos, Lda', 'compras@santos.pt',
          '501 222 333', CURRENT_DATE - 6, CURRENT_DATE + 24, 'enviado', 5)
  RETURNING id INTO o;
  INSERT INTO itens_orcamento (orcamento_id, posicao, descricao, quantidade, preco_unitario) VALUES
    (o, 0, 'Instalação elétrica - pavilhão', 1, 2400),
    (o, 1, 'Quadro elétrico trifásico', 2, 310),
    (o, 2, 'Mão de obra (hora)', 16, 28);

  INSERT INTO orcamentos (ano, seq, cliente_nome, cliente_email, data_emissao, validade,
                          estado, desconto_percent, notas)
  VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INT, 3, 'Pedro Almeida', 'pedro@almeida.pt',
          CURRENT_DATE - 2, CURRENT_DATE + 28, 'rascunho', 0, 'A confirmar prazos com o cliente.')
  RETURNING id INTO o;
  INSERT INTO itens_orcamento (orcamento_id, posicao, descricao, quantidade, preco_unitario) VALUES
    (o, 0, 'Consultoria de gestão (sessão de 3h)', 4, 180);

  INSERT INTO orcamentos (ano, seq, cliente_nome, cliente_email, data_emissao, validade,
                          estado, desconto_percent)
  VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INT, 4, 'Carla Ferreira', 'carla@email.com',
          CURRENT_DATE - 40, CURRENT_DATE - 10, 'recusado', 0)
  RETURNING id INTO o;
  INSERT INTO itens_orcamento (orcamento_id, posicao, descricao, quantidade, preco_unitario) VALUES
    (o, 0, 'Remodelação de cozinha', 1, 6800);
END $$;
