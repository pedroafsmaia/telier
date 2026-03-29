import { useMemo, useState, type FormEvent } from 'react';
import { Button, Drawer, Input, Select, TextArea } from '../../../design/primitives';
import { GroupStatus } from '../../../lib/enums';
import type { Group } from '../types';

interface GroupFormDrawerProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  group?: Group;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { nome: string; descricao?: string; status: GroupStatus }) => Promise<void>;
}

interface GroupFormState {
  nome: string;
  descricao: string;
  status: GroupStatus;
}

function buildFormState(group?: Group): GroupFormState {
  return {
    nome: group?.nome || '',
    descricao: group?.descricao || '',
    status: group?.status || GroupStatus.ACTIVE,
  };
}

export function GroupFormDrawer({ isOpen, mode, group, isSubmitting, onClose, onSubmit }: GroupFormDrawerProps) {
  const [form, setForm] = useState<GroupFormState>(() => buildFormState(group));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusOptions = useMemo(
    () => [
      { value: GroupStatus.ACTIVE, label: 'Ativo' },
      { value: GroupStatus.PAUSED, label: 'Pausado' },
      { value: GroupStatus.ARCHIVED, label: 'Arquivado' },
    ],
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nome = form.nome.trim();
    if (!nome) {
      setErrorMessage('Informe o nome do grupo.');
      return;
    }

    try {
      setErrorMessage(null);
      await onSubmit({
        nome,
        descricao: form.descricao.trim() || undefined,
        status: form.status,
      });
      onClose();
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage(mode === 'create' ? 'Nao foi possivel criar o grupo.' : 'Nao foi possivel salvar o grupo.');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={isSubmitting ? () => undefined : onClose}
      title={mode === 'create' ? 'Novo grupo' : 'Editar grupo'}
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <Input
          label="Nome"
          value={form.nome}
          onChange={(event) => setForm((previous) => ({ ...previous, nome: event.target.value }))}
          placeholder="Nome do grupo"
          maxLength={160}
          disabled={isSubmitting}
          autoFocus
        />

        <TextArea
          label="Descricao"
          value={form.descricao}
          onChange={(event) => setForm((previous) => ({ ...previous, descricao: event.target.value }))}
          placeholder="Resumo operacional do grupo"
          rows={4}
          maxLength={2000}
          disabled={isSubmitting}
        />

        <Select
          label="Status"
          options={statusOptions}
          value={form.status}
          onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value as GroupStatus }))}
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
            {mode === 'create' ? 'Criar grupo' : 'Salvar grupo'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

