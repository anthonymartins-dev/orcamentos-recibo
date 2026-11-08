export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Algo correu mal');
  return dados;
}

const enviar = (metodo, corpo) => ({ method: metodo, body: JSON.stringify(corpo) });

export const api = {
  resumo: () => pedir('/resumo'),
  empresa: () => pedir('/empresa'),
  guardarEmpresa: (dados) => pedir('/empresa', enviar('PUT', dados)),

  orcamentos: () => pedir('/orcamentos'),
  orcamento: (id) => pedir(`/orcamentos/${id}`),
  criarOrcamento: (dados) => pedir('/orcamentos', enviar('POST', dados)),
  editarOrcamento: (id, dados) => pedir(`/orcamentos/${id}`, enviar('PUT', dados)),
  mudarEstado: (id, estado) => pedir(`/orcamentos/${id}/estado`, enviar('PATCH', { estado })),
  apagarOrcamento: (id) => pedir(`/orcamentos/${id}`, { method: 'DELETE' }),

  recibos: () => pedir('/recibos'),
  emitirRecibo: (orcamentoId, dados) =>
    pedir(`/orcamentos/${orcamentoId}/recibos`, enviar('POST', dados)),
};

export const pdfOrcamento = (id) => `${BASE}/orcamentos/${id}/pdf`;
export const pdfRecibo = (id) => `${BASE}/recibos/${id}/pdf`;
