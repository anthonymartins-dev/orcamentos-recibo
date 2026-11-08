import { useState } from 'react';
import { hoje, METODOS, moeda } from '../format.js';
import { BotaoPrimario, BotaoSecundario, Campo, Erro, Modal, Selecao } from './ui.jsx';

export default function ReciboForm({ orcamento, aoEmitir, aoFechar }) {
  const [valor, setValor] = useState(String(orcamento.em_divida));
  const [metodo, setMetodo] = useState('transferencia');
  const [dataPagamento, setDataPagamento] = useState(hoje());
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setAGuardar(true);
    setErro('');
    try {
      await aoEmitir({ valor: Number(valor), metodo, data_pagamento: dataPagamento });
    } catch (err) {
      setErro(err.message);
      setAGuardar(false);
    }
  }

  return (
    <Modal
      titulo="Emitir recibo"
      subtitulo={`${orcamento.numero} · em dívida ${moeda(orcamento.em_divida)}`}
      aoFechar={aoFechar}
    >
      <form onSubmit={submeter} className="space-y-4">
        <Campo
          rotulo="Valor recebido (€)"
          type="number"
          min="0.01"
          step="0.01"
          max={orcamento.em_divida}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          autoFocus
          className="num"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao rotulo="Método" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {Object.entries(METODOS).map(([chave, texto]) => (
              <option key={chave} value={chave}>
                {texto}
              </option>
            ))}
          </Selecao>
          <Campo
            rotulo="Data do pagamento"
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
          />
        </div>
        <p className="text-sm text-muted">
          Para um pagamento parcial, reduz o valor. Podes emitir vários recibos até liquidar o total.
        </p>
        <Erro>{erro}</Erro>
        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={aGuardar}>
            {aGuardar ? 'A emitir…' : 'Emitir recibo'}
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}
