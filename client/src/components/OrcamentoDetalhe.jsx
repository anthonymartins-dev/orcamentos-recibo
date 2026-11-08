import { FileDown, Pencil, Receipt, Send, Trash2, X } from 'lucide-react';
import { pdfOrcamento, pdfRecibo } from '../api.js';
import { data, METODOS, moeda } from '../format.js';
import { BotaoPrimario, BotaoSecundario, EstadoBadge, useEscape } from './ui.jsx';

function Linha({ rotulo, valor, forte }) {
  return (
    <div className={`flex justify-between ${forte ? 'text-base font-semibold' : 'text-muted'}`}>
      <dt>{rotulo}</dt>
      <dd className="num">{valor}</dd>
    </div>
  );
}

export default function OrcamentoDetalhe({
  orcamento: o,
  aMudar,
  aoMudarEstado,
  aoEditar,
  aoApagar,
  aoEmitirRecibo,
  aoFechar,
}) {
  useEscape(aoFechar);
  const t = o.totais;
  const editavel = o.estado === 'rascunho' || o.estado === 'enviado';

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-ink/30"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <aside className="painel flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-card shadow-2xl shadow-ink/10">
        <div className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div>
            <p className="num text-sm text-muted">{o.numero}</p>
            <h2 className="mt-0.5 font-serif text-2xl font-semibold">{o.cliente_nome}</h2>
            <div className="mt-2 flex items-center gap-3">
              <EstadoBadge estado={o.estado} />
              <span className="text-sm text-muted">
                {data(o.data_emissao)}
                {o.validade && ` · válido até ${data(o.validade)}`}
              </span>
            </div>
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted transition hover:bg-line/60 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-7 p-6">
          <div className="flex flex-wrap gap-2">
            {o.estado === 'rascunho' && (
              <BotaoPrimario disabled={aMudar} onClick={() => aoMudarEstado('enviado')}>
                <Send size={15} /> Marcar como enviado
              </BotaoPrimario>
            )}
            {o.estado === 'enviado' && (
              <>
                <BotaoPrimario disabled={aMudar} onClick={() => aoMudarEstado('aprovado')}>
                  Aprovar
                </BotaoPrimario>
                <BotaoSecundario disabled={aMudar} onClick={() => aoMudarEstado('recusado')}>
                  Recusar
                </BotaoSecundario>
              </>
            )}
            {o.estado === 'aprovado' && o.em_divida > 0 && (
              <BotaoPrimario onClick={aoEmitirRecibo}>
                <Receipt size={15} /> Emitir recibo
              </BotaoPrimario>
            )}
            {o.estado === 'recusado' && (
              <BotaoSecundario disabled={aMudar} onClick={() => aoMudarEstado('rascunho')}>
                Reabrir como rascunho
              </BotaoSecundario>
            )}
            <a href={pdfOrcamento(o.id)} target="_blank" rel="noreferrer">
              <BotaoSecundario tabIndex={-1}>
                <FileDown size={15} /> PDF
              </BotaoSecundario>
            </a>
          </div>

          {(o.cliente_email || o.cliente_nif || o.cliente_morada) && (
            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                Cliente
              </h3>
              <div className="space-y-0.5 text-sm">
                {o.cliente_morada && <p>{o.cliente_morada}</p>}
                {o.cliente_nif && <p className="text-muted">NIF {o.cliente_nif}</p>}
                {o.cliente_email && <p className="text-muted">{o.cliente_email}</p>}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Itens</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {o.itens.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-4 p-3.5 text-sm">
                  <div>
                    <p>{i.descricao}</p>
                    <p className="num mt-0.5 text-muted">
                      {i.quantidade} × {moeda(i.preco_unitario)}
                    </p>
                  </div>
                  <p className="num font-medium whitespace-nowrap">
                    {moeda(i.quantidade * i.preco_unitario)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 text-sm">
              <Linha rotulo="Subtotal" valor={moeda(t.subtotal)} />
              {t.desconto > 0 && (
                <Linha rotulo={`Desconto (${o.desconto_percent}%)`} valor={`-${moeda(t.desconto)}`} />
              )}
              <Linha rotulo={`IVA (${o.iva_percent}%)`} valor={moeda(t.iva)} />
              <div className="border-t border-line pt-2.5">
                <Linha rotulo="Total" valor={moeda(t.total)} forte />
              </div>
            </dl>
          </section>

          {o.notas && (
            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                Notas
              </h3>
              <p className="text-sm whitespace-pre-line">{o.notas}</p>
            </section>
          )}

          {o.estado === 'aprovado' && (
            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                Pagamentos
              </h3>
              {o.recibos.length === 0 ? (
                <p className="text-sm text-muted">Ainda não há recibos emitidos.</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {o.recibos.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-4 p-3.5 text-sm">
                      <div>
                        <p className="num font-medium">{r.numero}</p>
                        <p className="text-muted">
                          {data(r.data_pagamento)} · {METODOS[r.metodo] ?? r.metodo}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="num font-medium">{moeda(r.valor)}</span>
                        <a
                          href={pdfRecibo(r.id)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`PDF do recibo ${r.numero}`}
                          className="rounded-lg p-2 text-muted transition hover:bg-line/70 hover:text-ink"
                        >
                          <FileDown size={16} />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <dl className="mt-3 space-y-1.5 text-sm">
                <Linha rotulo="Pago" valor={moeda(o.pago)} />
                <Linha rotulo="Em dívida" valor={moeda(o.em_divida)} forte />
              </dl>
            </section>
          )}
        </div>

        {(editavel || (o.estado === 'recusado' && o.recibos.length === 0)) && (
          <div className="flex justify-between border-t border-line p-4">
            {editavel ? (
              <BotaoSecundario onClick={aoEditar}>
                <Pencil size={15} /> Editar
              </BotaoSecundario>
            ) : (
              <span />
            )}
            <button
              onClick={aoApagar}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-soft"
            >
              <Trash2 size={15} /> Apagar
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
