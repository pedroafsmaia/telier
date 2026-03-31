import { useMemo, useState } from 'react';
import { Drawer, Button, Input, Panel } from '../../../design/primitives';
import type { ActiveTimeSession, TaskListItem } from '../types';

interface TimerFlowValue {
  fim?: string;
  observacao?: string;
}

interface TaskTimerFlowDrawerProps {
  isOpen: boolean;
  mode: 'stop' | 'switch';
  currentSession: ActiveTimeSession | null;
  nextTask?: TaskListItem | null;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (value: TimerFlowValue) => Promise<void> | void;
}

function toLocalDateTimeValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toBackendDateTime(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const normalized = value.trim();
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
    ? `${normalized}:00`
    : normalized;
  const localDate = new Date(withSeconds);

  if (Number.isNaN(localDate.getTime())) {
    return withSeconds.replace('T', ' ');
  }

  return localDate.toISOString().slice(0, 19).replace('T', ' ');
}

export function TaskTimerFlowDrawer({
  isOpen,
  mode,
  currentSession,
  nextTask,
  isSubmitting = false,
  errorMessage,
  onClose,
  onConfirm,
}: TaskTimerFlowDrawerProps) {
  const [endAt, setEndAt] = useState(() => toLocalDateTimeValue(new Date()));
  const [note, setNote] = useState('');

  const title = useMemo(() => {
    if (mode === 'switch') return 'Trocar tarefa com timer ativo';
    return 'Parar timer';
  }, [mode]);

  const description = useMemo(() => {
    if (!currentSession) return '';
    if (mode === 'switch' && nextTask) {
      return `Seu timer em "${currentSession.tarefaNome}" será encerrado antes de iniciar "${nextTask.nome}".`;
    }
    return `Você está encerrando o timer ativo em "${currentSession.tarefaNome}".`;
  }, [currentSession, mode, nextTask]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onConfirm({
      fim: toBackendDateTime(endAt),
      observacao: note.trim() || undefined,
    });
  };

  return (
    <Drawer isOpen={isOpen} mode="contextual" onClose={isSubmitting ? () => undefined : onClose} title={title}>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Panel>
            <div className="space-y-2">
              <p className="text-sm text-text-primary">{description}</p>
              {mode === 'switch' && nextTask ? (
                <p className="text-xs text-text-tertiary">
                  A próxima tarefa será iniciada automaticamente após o encerramento.
                </p>
              ) : null}
            </div>
          </Panel>

          {errorMessage ? (
            <div className="rounded-lg border border-alert-subtle bg-alert-subtle/20 px-4 py-3 text-sm text-alert">
              {errorMessage}
            </div>
          ) : null}

          <Input
            label="Encerrar em"
            type="datetime-local"
            value={endAt}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEndAt(event.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Observação"
            value={note}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNote(event.target.value)}
            placeholder="Resumo rápido do encerramento (opcional)"
            disabled={isSubmitting}
            maxLength={200}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {mode === 'switch' ? 'Encerrar e iniciar próxima tarefa' : 'Encerrar timer'}
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  );
}


