import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calcularTotais, hoje, moeda } from '../format.js';
import { BotaoPrimario, BotaoSecundario, Campo, classeInput, Erro, Modal } from './ui.jsx';

const ITEM_VAZIO = { descricao: '', quantidade: '1', preco_unitario: '' };

function iniciar(orcamento) {
  if (!orcamento) {
    return {
      cliente_nome: '',
      cliente_email: '',
      cliente_nif: '',
      cliente_morada: '',
      data_emissao: hoje(),
      validade: '',
      desconto_percent: '0',
      iva_percent: '23',
      notas: '',
      itens: [{ ...ITEM_VAZIO }],
    };
  }
  return {
    cliente_nome: orcamento.cliente_nome,
    cliente_email: orcamento.cliente_email ?? '',
    cliente_nif: orcamento.cliente_nif ?? '',
    cliente_morada: orcamento.cliente_morada ?? '',
    data_emissao: orcamento.data_emissao,
    validade: orcamento.validade ?? '',
    desconto_percent: String(orcamento.desconto_percent),
    iva_percent: String(orcamento.iva_percent),
    notas: orcamento.notas ?? '',
    itens: orcamento.itens.map((i) => ({
      descricao: i.descricao,
      quantidade: String(i.quantidade),
      preco_unitario: String(i.preco_unitario),
    })),
  };
}

export default function OrcamentoForm({ orcamento, aoGuardar, aoFechar }) {
  const [dados, setDados] = useState(() => iniciar(orcamento));
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });
  const totais = calcularTotais(dados.itens, dados.desconto_percent, dados.iva_percent);

  function mudarItem(indice, campo, valor) {
    const itens = dados.itens.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item));
    setDados({ ...dados, itens });
  }

  const adicionarItem = () => setDados({ ...dados, itens: [...dados.itens, { ...ITEM_VAZIO }] });
  const removerItem = (indice) =>
    setDados({ ...dados, itens: dados.itens.filter((_, i) => i !== indice) });

  async function submeter(e) {
    e.preventDefault();
    setAGuardar(true);
    setErro('');
    try {
      await aoGuardar({
        ...dados,
        desconto_percent: Number(dados.desconto_percent),
        iva_percent: Number(dados.iva_percent),
        itens: dados.itens.map((i) => ({
          descricao: i.descricao,
          quantidade: Number(i.quantidade),
          preco_unitario: Number(i.preco_unitario),
        })),
      });
    } catch (err) {
      setErro(err.message);
      setAGuardar(false);
    }
  }

  return (
    <Modal
      titulo={orcamento ? `Editar ${orcamento.numero}` : 'Novo orçamento'}
      subtitulo="O número é atribuído automaticamente."
      largura="max-w-3xl"
      aoFechar={aoFechar}
    >
      <form onSubmit={submeter} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
            Cliente
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Nome"
              obrigatorio
              value={dados.cliente_nome}
              onChange={mudar('cliente_nome')}
              autoFocus
            />
            <Campo
              rotulo="Email"
              type="email"
              value={dados.cliente_email}
              onChange={mudar('cliente_email')}
            />
            <Campo rotulo="NIF" value={dados.cliente_nif} onChange={mudar('cliente_nif')} />
            <Campo
              rotulo="Morada"
              value={dados.cliente_morada}
              onChange={mudar('cliente_morada')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Data de emissão"
              type="date"
              value={dados.data_emissao}
              onChange={mudar('data_emissao')}
            />
            <Campo
              rotulo="Válido até"
              type="date"
              value={dados.validade}
              onChange={mudar('validade')}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
            Itens
          </legend>
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_80px_110px_110px_36px] gap-2 px-1 text-xs text-muted sm:grid">
              <span>Descrição</span>
              <span>Qtd.</span>
              <span>Preço un.</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {dados.itens.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-2 items-center gap-2 rounded-xl border border-line bg-white/50 p-2 sm:grid-cols-[1fr_80px_110px_110px_36px] sm:border-0 sm:bg-transparent sm:p-0"
              >
                <input
                  className={`${classeInput} col-span-2 sm:col-span-1`}
                  placeholder="Descrição do serviço ou produto"
                  value={item.descricao}
                  onChange={(e) => mudarItem(i, 'descricao', e.target.value)}
                  aria-label="Descrição"
                />
                <input
                  className={`${classeInput} num`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantidade}
                  onChange={(e) => mudarItem(i, 'quantidade', e.target.value)}
                  aria-label="Quantidade"
                />
                <input
                  className={`${classeInput} num`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={item.preco_unitario}
                  onChange={(e) => mudarItem(i, 'preco_unitario', e.target.value)}
                  aria-label="Preço unitário"
                />
                <span className="num text-right text-sm font-medium">
                  {moeda((Number(item.quantidade) || 0) * (Number(item.preco_unitario) || 0))}
                </span>
                <button
                  type="button"
                  onClick={() => removerItem(i)}
                  disabled={dados.itens.length === 1}
                  aria-label="Remover item"
                  className="justify-self-end rounded-lg p-2 text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={adicionarItem}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            <Plus size={15} /> Adicionar item
          </button>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Campo
                rotulo="Desconto (%)"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={dados.desconto_percent}
                onChange={mudar('desconto_percent')}
              />
              <Campo
                rotulo="IVA (%)"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={dados.iva_percent}
                onChange={mudar('iva_percent')}
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Notas</span>
              <textarea
                rows={3}
                className={classeInput}
                value={dados.notas}
                onChange={mudar('notas')}
                placeholder="Condições de pagamento, prazos…"
              />
            </label>
          </div>

          <dl className="num space-y-2 self-start rounded-xl bg-paper p-4 text-sm">
            <div className="flex justify-between text-muted">
              <dt>Subtotal</dt>
              <dd>{moeda(totais.subtotal)}</dd>
            </div>
            {totais.desconto > 0 && (
              <div className="flex justify-between text-muted">
                <dt>Desconto</dt>
                <dd>-{moeda(totais.desconto)}</dd>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <dt>IVA</dt>
              <dd>{moeda(totais.iva)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>{moeda(totais.total)}</dd>
            </div>
          </dl>
        </div>

        <Erro>{erro}</Erro>

        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={aGuardar}>
            {aGuardar ? 'A guardar…' : orcamento ? 'Guardar alterações' : 'Criar orçamento'}
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}
