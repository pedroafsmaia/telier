import { useMemo, useState, type FormEvent } from 'react';
import { Button, Drawer, Input, Select } from '../../../design/primitives';
import { Priority, ProjectPhase, ProjectStatus } from '../../../lib/enums';
import type { Project } from '../types';

interface GroupOption {
  id: string;
  nome: string;
}

interface LockedGroup {
  id: string;
  nome: string;
}

interface ProjectFormDrawerProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  project?: Project;
  groups: GroupOption[];
  lockedGroup?: LockedGroup;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    nome: string;
    grupoId?: string;
    fase: ProjectPhase;
    status: ProjectStatus;
    prioridade: Priority;
    prazo?: string;
    areaM2?: number;
  }) => Promise<void>;
}

interface ProjectFormState {
  nome: string;
  grupoId: string;
  fase: ProjectPhase;
  status: ProjectStatus;
  prioridade: Priority;
  prazo: string;
  areaM2: string;
}

function toDateInputValue(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function buildFormState(project?: Project, lockedGroup?: LockedGroup): ProjectFormState {
  return {
    nome: project?.nome || '',
    grupoId: lockedGroup?.id || project?.grupoId || '',
    fase: project?.fase || ProjectPhase.PRELIMINARY_STUDY,
    status: project?.status || ProjectStatus.TODO,
    prioridade: project?.prioridade || Priority.MEDIUM,
    prazo: toDateInputValue(project?.prazo),
    areaM2: project?.areaM2 ? String(project.areaM2) : '',
  };
}

export function ProjectFormDrawer({
  isOpen,
  mode,
  project,
  groups,
  lockedGroup,
  isSubmitting,
  onClose,
  onSubmit,
}: ProjectFormDrawerProps) {
  const [form, setForm] = useState<ProjectFormState>(() => buildFormState(project, lockedGroup));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const groupOptions = useMemo(
    () => [{ value: '', label: 'Sem grupo' }, ...groups.map((group) => ({ value: group.id, label: group.nome }))],
    [groups],
  );

  const phaseOptions = useMemo(
    () => [
      { value: ProjectPhase.PRELIMINARY_STUDY, label: 'Estudo preliminar' },
      { value: ProjectPhase.PRELIMINARY_PROJECT, label: 'Anteprojeto' },
      { value: ProjectPhase.BASIC_PROJECT, label: 'Projeto basico' },
      { value: ProjectPhase.EXECUTIVE_PROJECT, label: 'Projeto executivo' },
      { value: ProjectPhase.IN_CONSTRUCTION, label: 'Em obra' },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: ProjectStatus.TODO, label: 'A fazer' },
      { value: ProjectStatus.IN_PROGRESS, label: 'Em andamento' },
      { value: ProjectStatus.IN_REVIEW, label: 'Em revisao' },
      { value: ProjectStatus.PAUSED, label: 'Pausado' },
      { value: ProjectStatus.DONE, label: 'Concluido' },
      { value: ProjectStatus.ARCHIVED, label: 'Arquivado' },
    ],
    [],
  );

  const priorityOptions = useMemo(
    () => [
      { value: Priority.LOW, label: 'Baixa' },
      { value: Priority.MEDIUM, label: 'Media' },
      { value: Priority.HIGH, label: 'Alta' },
      { value: Priority.URGENT, label: 'Urgente' },
    ],
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nome = form.nome.trim();
    if (!nome) {
      setErrorMessage('Informe o nome do projeto.');
      return;
    }

    const parsedArea = form.areaM2.trim() ? Number(form.areaM2) : undefined;
    if (form.areaM2.trim() && Number.isNaN(parsedArea)) {
      setErrorMessage('Area em m2 deve ser numerica.');
      return;
    }

    try {
      setErrorMessage(null);
      await onSubmit({
        nome,
        grupoId: lockedGroup ? lockedGroup.id : form.grupoId,
        fase: form.fase,
        status: form.status,
        prioridade: form.prioridade,
        prazo: form.prazo || undefined,
        areaM2: parsedArea,
      });
      onClose();
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage(mode === 'create' ? 'Nao foi possivel criar o projeto.' : 'Nao foi possivel salvar o projeto.');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={isSubmitting ? () => undefined : onClose}
      title={mode === 'create' ? 'Novo projeto' : 'Editar projeto'}
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <Input
          label="Nome"
          value={form.nome}
          onChange={(event) => setForm((previous) => ({ ...previous, nome: event.target.value }))}
          placeholder="Nome do projeto"
          maxLength={200}
          disabled={isSubmitting}
          autoFocus
        />

        {lockedGroup ? (
          <Input label="Grupo" value={lockedGroup.nome} disabled />
        ) : (
          <Select
            label="Grupo"
            options={groupOptions}
            value={form.grupoId}
            onChange={(event) => setForm((previous) => ({ ...previous, grupoId: event.target.value }))}
            disabled={isSubmitting}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Fase"
            options={phaseOptions}
            value={form.fase}
            onChange={(event) => setForm((previous) => ({ ...previous, fase: event.target.value as ProjectPhase }))}
            disabled={isSubmitting}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={form.status}
            onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value as ProjectStatus }))}
            disabled={isSubmitting}
          />
          <Select
            label="Prioridade"
            options={priorityOptions}
            value={form.prioridade}
            onChange={(event) => setForm((previous) => ({ ...previous, prioridade: event.target.value as Priority }))}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="date"
            label="Prazo"
            value={form.prazo}
            onChange={(event) => setForm((previous) => ({ ...previous, prazo: event.target.value }))}
            disabled={isSubmitting}
          />
          <Input
            type="number"
            label="Area (m2)"
            value={form.areaM2}
            onChange={(event) => setForm((previous) => ({ ...previous, areaM2: event.target.value }))}
            min="0"
            step="0.01"
            disabled={isSubmitting}
            placeholder="Opcional"
          />
        </div>

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
            {mode === 'create' ? 'Criar projeto' : 'Salvar projeto'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

