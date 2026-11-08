import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, FileDown, Plus, Search } from 'lucide-react';
import { api, pdfRecibo } from './api.js';
import { data, METODOS, moeda } from './format.js';
import EmpresaForm from './components/EmpresaForm.jsx';
import OrcamentoDetalhe from './components/OrcamentoDetalhe.jsx';
import OrcamentoForm from './components/OrcamentoForm.jsx';
import ReciboForm from './components/ReciboForm.jsx';
import { BotaoPrimario, BotaoSecundario, EstadoBadge, Modal } from './components/ui.jsx';

const FILTROS = [
  ['todos', 'Todos'],
  ['rascunho', 'Rascunho'],
  ['enviado', 'Enviados'],
  ['aprovado', 'Aprovados'],
  ['recusado', 'Recusados'],
];

function Indicador({ rotulo, valor, destaque }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-sm text-muted">{rotulo}</p>
      <p
        className={`num mt-1.5 font-serif text-3xl font-semibold tracking-tight ${destaque ? 'text-brand' : ''}`}
      >
        {valor}
      </p>
    </div>
  );
}

function Vazio({ titulo, texto }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/60 px-6 py-16 text-center">
      <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
      <p className="mt-1 text-sm text-muted">{texto}</p>
    </div>
  );
}

export default function App() {
  const [separador, setSeparador] = useState('orcamentos');
  const [orcamentos, setOrcamentos] = useState([]);
  const [recibos, setRecibos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  const [detalhe, setDetalhe] = useState(null);
  const [aMudar, setAMudar] = useState(false);
  const [formulario, setFormulario] = useState(null);
  const [reciboPara, setReciboPara] = useState(null);
  const [aApagar, setAApagar] = useState(null);
  const [editarEmpresa, setEditarEmpresa] = useState(false);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const [o, r, s, e] = await Promise.all([
        api.orcamentos(),
        api.recibos(),
        api.resumo(),
        api.empresa(),
      ]);
      setOrcamentos(o);
      setRecibos(r);
      setResumo(s);
      setEmpresa(e);
    } catch {
      setErro('Não foi possível ligar ao servidor. Confirma que a API está a correr.');
    } finally {
      setACarregar(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return orcamentos.filter(
      (o) =>
        (filtro === 'todos' || o.estado === filtro) &&
        (!termo || `${o.numero} ${o.cliente_nome}`.toLowerCase().includes(termo))
    );
  }, [orcamentos, filtro, busca]);

  async function abrir(id) {
    setDetalhe(await api.orcamento(id));
  }

  async function atualizarDetalhe(id) {
    await carregar();
    setDetalhe(await api.orcamento(id));
  }

  async function guardarOrcamento(dados) {
    const editar = Boolean(formulario?.id);
    const guardado = editar
      ? await api.editarOrcamento(formulario.id, dados)
      : await api.criarOrcamento(dados);
    setFormulario(null);
    setAviso(editar ? 'Orçamento atualizado' : `Orçamento ${guardado.numero} criado`);
    await carregar();
    setDetalhe(guardado);
  }

  async function mudarEstado(estado) {
    setAMudar(true);
    try {
      await api.mudarEstado(detalhe.id, estado);
      setAviso('Estado atualizado');
      await atualizarDetalhe(detalhe.id);
    } catch (e) {
      setAviso(e.message);
    } finally {
      setAMudar(false);
    }
  }

  async function emitirRecibo(dados) {
    const recibo = await api.emitirRecibo(reciboPara.id, dados);
    setReciboPara(null);
    setAviso(`Recibo ${recibo.numero} emitido`);
    await atualizarDetalhe(detalhe.id);
  }

  async function confirmarApagar() {
    try {
      await api.apagarOrcamento(aApagar.id);
      setAviso('Orçamento apagado');
      setDetalhe(null);
    } catch (e) {
      setAviso(e.message);
    }
    setAApagar(null);
    await carregar();
  }

  async function guardarEmpresa(dados) {
    setEmpresa(await api.guardarEmpresa(dados));
    setEditarEmpresa(false);
    setAviso('Dados da empresa guardados');
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-brand uppercase">
            {empresa?.nome ?? 'Orçamentos e recibos'}
          </p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Orçamentos e recibos
          </h1>
        </div>
        <div className="flex gap-2">
          <BotaoSecundario onClick={() => setEditarEmpresa(true)} disabled={!empresa}>
            <Building2 size={16} /> Empresa
          </BotaoSecundario>
          <BotaoPrimario onClick={() => setFormulario({})}>
            <Plus size={17} /> Novo orçamento
          </BotaoPrimario>
        </div>
      </header>

      {resumo && (
        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador rotulo="Por aprovar" valor={moeda(resumo.por_aprovar)} />
          <Indicador rotulo="Aprovado" valor={moeda(resumo.aprovado)} />
          <Indicador rotulo="Recebido" valor={moeda(resumo.recebido)} destaque />
          <Indicador rotulo="Em dívida" valor={moeda(resumo.em_divida)} />
        </section>
      )}

      <nav className="mt-10 flex gap-6 border-b border-line">
        {[
          ['orcamentos', `Orçamentos (${orcamentos.length})`],
          ['recibos', `Recibos (${recibos.length})`],
        ].map(([chave, texto]) => (
          <button
            key={chave}
            onClick={() => setSeparador(chave)}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition ${
              separador === chave
                ? 'border-brand text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {texto}
          </button>
        ))}
      </nav>

      <main className="mt-6">
        {erro ? (
          <div className="rounded-2xl border border-line bg-card p-10 text-center">
            <p className="text-danger">{erro}</p>
            <BotaoSecundario className="mt-4" onClick={carregar}>
              Tentar de novo
            </BotaoSecundario>
          </div>
        ) : aCarregar ? (
          <div className="space-y-px overflow-hidden rounded-2xl border border-line bg-line">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 bg-card p-4">
                <div className="h-4 w-24 animate-pulse rounded bg-line" />
                <div className="h-4 w-48 animate-pulse rounded bg-line" />
              </div>
            ))}
          </div>
        ) : separador === 'orcamentos' ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {FILTROS.map(([chave, texto]) => (
                  <button
                    key={chave}
                    onClick={() => setFiltro(chave)}
                    className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                      filtro === chave
                        ? 'bg-ink text-white'
                        : 'text-muted hover:bg-line/60 hover:text-ink'
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Número ou cliente"
                  className="w-full rounded-lg border border-line bg-card py-2 pr-3 pl-9 text-sm outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
                />
              </div>
            </div>

            <div className="mt-4">
              {filtrados.length === 0 ? (
                <Vazio
                  titulo={orcamentos.length === 0 ? 'Ainda não há orçamentos' : 'Nenhum resultado'}
                  texto={
                    orcamentos.length === 0
                      ? 'Cria o primeiro orçamento para começar.'
                      : 'Experimenta outro filtro ou pesquisa.'
                  }
                />
              ) : (
                <ul className="animar divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
                  {filtrados.map((o) => (
                    <li key={o.id}>
                      <button
                        onClick={() => abrir(o.id)}
                        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 p-4 text-left transition hover:bg-paper/70 sm:grid-cols-[110px_1fr_110px_120px_110px] sm:px-5"
                      >
                        <span className="num text-sm text-muted">{o.numero}</span>
                        <span className="col-start-1 row-start-2 truncate font-medium sm:col-start-auto sm:row-start-auto">
                          {o.cliente_nome}
                        </span>
                        <span className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto sm:justify-self-start">
                          <EstadoBadge estado={o.estado} />
                        </span>
                        <span className="num hidden text-sm text-muted sm:block">
                          {data(o.data_emissao)}
                        </span>
                        <span className="num col-start-2 row-start-2 justify-self-end font-medium sm:col-start-auto sm:row-start-auto">
                          {moeda(o.total)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : recibos.length === 0 ? (
          <Vazio
            titulo="Ainda não há recibos"
            texto="Aprova um orçamento e emite o primeiro recibo."
          />
        ) : (
          <ul className="animar divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {recibos.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 p-4 sm:grid-cols-[110px_1fr_130px_110px_130px_40px] sm:px-5"
              >
                <span className="num text-sm text-muted">{r.numero}</span>
                <span className="col-start-1 row-start-2 truncate font-medium sm:col-start-auto sm:row-start-auto">
                  {r.cliente_nome}
                </span>
                <span className="num hidden text-sm text-muted sm:block">{r.orcamento_numero}</span>
                <span className="num hidden text-sm text-muted sm:block">
                  {data(r.data_pagamento)}
                </span>
                <span className="num col-start-2 row-start-1 justify-self-end font-medium sm:col-start-auto sm:row-start-auto">
                  {moeda(r.valor)}
                  <span className="ml-2 hidden text-xs font-normal text-muted lg:inline">
                    {METODOS[r.metodo]}
                  </span>
                </span>
                <a
                  href={pdfRecibo(r.id)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`PDF do recibo ${r.numero}`}
                  className="col-start-2 row-start-2 justify-self-end rounded-lg p-2 text-muted transition hover:bg-line/70 hover:text-ink sm:col-start-auto sm:row-start-auto"
                >
                  <FileDown size={16} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>

      {detalhe && (
        <OrcamentoDetalhe
          orcamento={detalhe}
          aMudar={aMudar}
          aoMudarEstado={mudarEstado}
          aoEditar={() => setFormulario(detalhe)}
          aoApagar={() => setAApagar(detalhe)}
          aoEmitirRecibo={() => setReciboPara(detalhe)}
          aoFechar={() => setDetalhe(null)}
        />
      )}

      {formulario && (
        <OrcamentoForm
          orcamento={formulario.id ? formulario : null}
          aoGuardar={guardarOrcamento}
          aoFechar={() => setFormulario(null)}
        />
      )}

      {reciboPara && (
        <ReciboForm
          orcamento={reciboPara}
          aoEmitir={emitirRecibo}
          aoFechar={() => setReciboPara(null)}
        />
      )}

      {editarEmpresa && empresa && (
        <EmpresaForm
          empresa={empresa}
          aoGuardar={guardarEmpresa}
          aoFechar={() => setEditarEmpresa(false)}
        />
      )}

      {aApagar && (
        <Modal titulo="Apagar orçamento?" largura="max-w-sm" aoFechar={() => setAApagar(null)}>
          <p className="text-[15px] leading-relaxed text-muted">
            <strong className="font-medium text-ink">{aApagar.numero}</strong> de {aApagar.cliente_nome}{' '}
            vai ser removido. Esta ação não pode ser desfeita.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <BotaoSecundario onClick={() => setAApagar(null)}>Cancelar</BotaoSecundario>
            <button
              onClick={confirmarApagar}
              className="rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Apagar
            </button>
          </div>
        </Modal>
      )}

      {aviso && (
        <div className="animar fixed right-4 bottom-4 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}
