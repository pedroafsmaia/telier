import { useMemo, useState, type FormEvent } from 'react';
import { Button, Drawer, Input, Select, TextArea } from '../../../design/primitives';
import { Ease, Priority, TaskStatus } from '../../../lib/enums';
import type { CreateTaskPayload } from '../types';

interface ProjectOption {
  id: string;
  nome: string;
}

interface LockedProject {
  id: string;
  nome: string;
}

interface TaskFormDrawerProps {
  isOpen: boolean;
  projects: ProjectOption[];
  lockedProject?: LockedProject;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTaskPayload) => Promise<void>;
}

interface TaskFormState {
  nome: string;
  projetoId: string;
  status: TaskStatus;
  prioridade: Priority;
  facilidade: Ease;
  prazo: string;
  descricao: string;
  observacaoEspera: string;
}

function buildFormState(lockedProject?: LockedProject): TaskFormState {
  return {
    nome: '',
    projetoId: lockedProject?.id || '',
    status: TaskStatus.TODO,
    prioridade: Priority.MEDIUM,
    facilidade: Ease.MEDIUM,
    prazo: '',
    descricao: '',
    observacaoEspera: '',
  };
}

export function TaskFormDrawer({
  isOpen,
  projects,
  lockedProject,
  isSubmitting,
  onClose,
  onSubmit,
}: TaskFormDrawerProps) {
  const [form, setForm] = useState<TaskFormState>(() => buildFormState(lockedProject));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectOptions = useMemo(
    () => [{ value: '', label: 'Selecione um projeto' }, ...projects.map((project) => ({ value: project.id, label: project.nome }))],
    [projects],
  );

  const statusOptions = useMemo(
    () => [
      { value: TaskStatus.TODO, label: 'A fazer' },
      { value: TaskStatus.IN_PROGRESS, label: 'Em andamento' },
      { value: TaskStatus.WAITING, label: 'Em espera' },
      { value: TaskStatus.DONE, label: 'Concluída' },
    ],
    [],
  );

  const priorityOptions = useMemo(
    () => [
      { value: Priority.LOW, label: 'Baixa' },
      { value: Priority.MEDIUM, label: 'Média' },
      { value: Priority.HIGH, label: 'Alta' },
      { value: Priority.URGENT, label: 'Urgente' },
    ],
    [],
  );

  const easeOptions = useMemo(
    () => [
      { value: Ease.VERY_EASY, label: 'Muito fácil' },
      { value: Ease.EASY, label: 'Fácil' },
      { value: Ease.MEDIUM, label: 'Médio' },
      { value: Ease.HARD, label: 'Difícil' },
      { value: Ease.VERY_HARD, label: 'Muito difícil' },
    ],
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nome = form.nome.trim();
    if (!nome) {
      setErrorMessage('Informe o título da tarefa.');
      return;
    }

    if (!form.projetoId) {
      setErrorMessage('Selecione um projeto.');
      return;
    }

    if (form.status === TaskStatus.WAITING && !form.observacaoEspera.trim()) {
      setErrorMessage('Ao colocar em espera, registre o contexto.');
      return;
    }

    try {
      setErrorMessage(null);
      await onSubmit({
        nome,
        projetoId: form.projetoId,
        status: form.status,
        prioridade: form.prioridade,
        facilidade: form.facilidade,
        prazo: form.prazo || undefined,
        descricao: form.descricao.trim() || undefined,
        observacaoEspera: form.observacaoEspera.trim() || undefined,
      });
      onClose();
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage('Não foi possível criar a tarefa.');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      mode="contextual"
      onClose={isSubmitting ? () => undefined : onClose}
      title="Nova tarefa"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <Input
          label="Título"
          value={form.nome}
          onChange={(event) => setForm((previous) => ({ ...previous, nome: event.target.value }))}
          placeholder="Título da tarefa"
          maxLength={200}
          disabled={isSubmitting}
          autoFocus
        />

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Status"
            options={statusOptions}
            value={form.status}
            onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value as TaskStatus }))}
            disabled={isSubmitting}
          />
          <Select
            label="Prioridade"
            options={priorityOptions}
            value={form.prioridade}
            onChange={(event) => setForm((previous) => ({ ...previous, prioridade: event.target.value as Priority }))}
            disabled={isSubmitting}
          />
          <Select
            label="Facilidade"
            options={easeOptions}
            value={form.facilidade}
            onChange={(event) => setForm((previous) => ({ ...previous, facilidade: event.target.value as Ease }))}
            disabled={isSubmitting}
          />
        </div>

        <Input
          type="date"
          label="Prazo"
          value={form.prazo}
          onChange={(event) => setForm((previous) => ({ ...previous, prazo: event.target.value }))}
          disabled={isSubmitting}
        />

        <TextArea
          label="Descrição"
          value={form.descricao}
          onChange={(event) => setForm((previous) => ({ ...previous, descricao: event.target.value }))}
          rows={5}
          maxLength={4000}
          placeholder="Explique objetivo, contexto e próximo passo."
          disabled={isSubmitting}
        />

        {form.status === TaskStatus.WAITING ? (
          <TextArea
            label="Motivo da espera"
            value={form.observacaoEspera}
            onChange={(event) => setForm((previous) => ({ ...previous, observacaoEspera: event.target.value }))}
            rows={4}
            maxLength={2000}
            placeholder="O que está bloqueando e quem pode destravar."
            disabled={isSubmitting}
          />
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-alert-subtle bg-alert-subtle/20 px-3 py-2 text-sm text-alert">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Criar tarefa
          </Button>
        </div>
      </form>
    </Drawer>
  );
}


