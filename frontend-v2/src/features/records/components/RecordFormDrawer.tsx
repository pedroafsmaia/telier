import { useMemo, useState, type FormEvent } from 'react';
import { Button, Drawer, Input, Select, TextArea } from '../../../design/primitives';
import { RecordType } from '../../../lib/enums';
import type { CreateRecordPayload } from '../types';

interface ProjectOption {
  id: string;
  nome: string;
}

interface LockedProject {
  id: string;
  nome: string;
}

interface RecordFormDrawerProps {
  isOpen: boolean;
  projects: ProjectOption[];
  lockedProject?: LockedProject;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateRecordPayload) => Promise<void>;
}

interface RecordFormState {
  projetoId: string;
  tipo: RecordType;
  conteudo: string;
}

function buildFormState(lockedProject?: LockedProject): RecordFormState {
  return {
    projetoId: lockedProject?.id || '',
    tipo: RecordType.DECISION,
    conteudo: '',
  };
}

export function RecordFormDrawer({
  isOpen,
  projects,
  lockedProject,
  isSubmitting,
  onClose,
  onSubmit,
}: RecordFormDrawerProps) {
  const [form, setForm] = useState<RecordFormState>(() => buildFormState(lockedProject));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectOptions = useMemo(
    () => [{ value: '', label: 'Selecione um projeto' }, ...projects.map((project) => ({ value: project.id, label: project.nome }))],
    [projects],
  );

  const typeOptions = useMemo(
    () => [
      { value: RecordType.DECISION, label: 'Decisao' },
      { value: RecordType.PENDING, label: 'Pendencia' },
      { value: RecordType.NOTE, label: 'Observacao' },
    ],
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.projetoId) {
      setErrorMessage('Selecione um projeto para o registro.');
      return;
    }

    const conteudo = form.conteudo.trim();
    if (!conteudo) {
      setErrorMessage('Informe o conteudo do registro.');
      return;
    }

    try {
      setErrorMessage(null);
      await onSubmit({
        tipo: form.tipo,
        conteudo,
        projetoId: form.projetoId,
      });
      onClose();
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage('Nao foi possivel criar o registro.');
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={isSubmitting ? () => undefined : onClose} title="Novo registro">
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {lockedProject ? (
          <Input label="Projeto" value={lockedProject.nome} disabled />
        ) : (
          <Select
            label="Projeto"
            options={projectOptions}
            value={form.projetoId}
            onChange={(event) => setForm((previous) => ({ ...previous, projetoId: event.target.value }))}
            disabled={isSubmitting}
          />
        )}

        <Select
          label="Tipo"
          options={typeOptions}
          value={form.tipo}
          onChange={(event) => setForm((previous) => ({ ...previous, tipo: event.target.value as RecordType }))}
          disabled={isSubmitting}
        />

        <TextArea
          label="Conteudo"
          value={form.conteudo}
          onChange={(event) => setForm((previous) => ({ ...previous, conteudo: event.target.value }))}
          rows={6}
          maxLength={4000}
          placeholder="Descreva a decisao, pendencia ou observacao"
          disabled={isSubmitting}
        />

        {errorMessage ? (
          <div className="rounded-lg border border-alert-subtle bg-alert-subtle/20 px-3 py-2 text-sm text-alert-DEFAULT">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Criar registro
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

