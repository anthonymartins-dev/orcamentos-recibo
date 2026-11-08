import { useState } from 'react';
import { BotaoPrimario, BotaoSecundario, Campo, Erro, Modal } from './ui.jsx';

export default function EmpresaForm({ empresa, aoGuardar, aoFechar }) {
  const [dados, setDados] = useState({
    nome: empresa.nome ?? '',
    nif: empresa.nif ?? '',
    morada: empresa.morada ?? '',
    email: empresa.email ?? '',
    telefone: empresa.telefone ?? '',
    iban: empresa.iban ?? '',
  });
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  async function submeter(e) {
    e.preventDefault();
    setAGuardar(true);
    setErro('');
    try {
      await aoGuardar(dados);
    } catch (err) {
      setErro(err.message);
      setAGuardar(false);
    }
  }

  return (
    <Modal
      titulo="Dados da empresa"
      subtitulo="Aparecem no cabeçalho dos PDFs."
      aoFechar={aoFechar}
    >
      <form onSubmit={submeter} className="space-y-4">
        <Campo rotulo="Nome" obrigatorio value={dados.nome} onChange={mudar('nome')} autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="NIF" value={dados.nif} onChange={mudar('nif')} />
          <Campo rotulo="Telefone" value={dados.telefone} onChange={mudar('telefone')} />
        </div>
        <Campo rotulo="Morada" value={dados.morada} onChange={mudar('morada')} />
        <Campo rotulo="Email" type="email" value={dados.email} onChange={mudar('email')} />
        <Campo rotulo="IBAN" value={dados.iban} onChange={mudar('iban')} />
        <Erro>{erro}</Erro>
        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={aGuardar}>
            {aGuardar ? 'A guardar…' : 'Guardar'}
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}
