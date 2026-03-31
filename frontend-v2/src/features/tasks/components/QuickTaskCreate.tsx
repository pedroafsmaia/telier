import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Select } from '../../../design/primitives';
import { Ease, Priority, TaskStatus } from '../../../lib/enums';
import type { CreateTaskPayload } from '../types';

interface Project {
  id: string;
  nome: string;
}

interface QuickTaskCreateProps {
  projects: Project[];
  onCreateTask: (payload: CreateTaskPayload) => void;
  disabled?: boolean;
  lockedProject?: Project;
  triggerLabel?: string;
  className?: string;
}

export const QuickTaskCreate: React.FC<QuickTaskCreateProps> = ({
  projects,
  onCreateTask,
  disabled = false,
  lockedProject,
  triggerLabel = 'Nova tarefa rápida',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(lockedProject?.id || '');
  const [isCreating, setIsCreating] = useState(false);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const projectOptions = [
    { value: '', label: 'Selecione um projeto' },
    ...projects.map((project) => ({ value: project.id, label: project.nome })),
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !selectedProjectId || isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const payload: CreateTaskPayload = {
        nome: title.trim(),
        projetoId: selectedProjectId,
        status: TaskStatus.TODO,
        prioridade: Priority.MEDIUM,
        facilidade: Ease.MEDIUM,
      };

      await onCreateTask(payload);
      setTitle('');
      setSelectedProjectId(lockedProject?.id || '');
      setIsExpanded(false);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setSelectedProjectId(lockedProject?.id || '');
    setIsExpanded(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        icon={Plus}
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className={className}
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2">
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">Criação rápida</h3>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              type="button"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Fechar
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px_auto]">
            <Input
              placeholder="Título da tarefa"
              value={title}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
              disabled={isCreating}
              autoFocus
              maxLength={200}
              required
            />

            {lockedProject ? (
              <div className="rounded-md border border-border-secondary bg-surface-secondary px-3 py-2 text-xs text-text-tertiary">
                Projeto: <strong>{lockedProject.nome}</strong>
              </div>
            ) : (
              <Select
                options={projectOptions}
                value={selectedProjectId}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSelectedProjectId(event.target.value)}
                disabled={isCreating}
                required
              />
            )}

            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!title.trim() || !selectedProjectId || isCreating}
              loading={isCreating}
              className="md:self-stretch"
            >
              Criar tarefa
            </Button>
          </div>

          {selectedProject ? (
            <p className="text-xs text-text-tertiary">A tarefa será criada em: {selectedProject.nome}</p>
          ) : null}
        </div>
      </form>
    </div>
  );
};
