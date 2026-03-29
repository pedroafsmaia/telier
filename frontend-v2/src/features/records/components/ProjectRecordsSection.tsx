import { useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, CollapsibleSection, EmptyState } from '../../../design/primitives';
import { getRecordTypeLabel, RecordStatus, RecordType } from '../../../lib/enums';
import { useConvertRecordToTask } from '../queries';
import type { RecordListItem } from '../types';

interface ProjectRecordsSectionProps {
  projectId: string;
  records: RecordListItem[];
  onActionError?: (message: string) => void;
  actions?: ReactNode;
}

function toUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function getRecordBadge(record: RecordListItem): { variant: 'default' | 'warning' | 'success'; label: string } {
  if (record.tipo === RecordType.PENDING) {
    if (record.status === RecordStatus.DONE) {
      return { variant: 'success', label: 'Pendência concluída' };
    }
    return { variant: 'warning', label: 'Pendência aberta' };
  }

  if (record.tipo === RecordType.DECISION) {
    return { variant: 'default', label: 'Decisão' };
  }

  return { variant: 'default', label: 'Observação' };
}

export function ProjectRecordsSection({ projectId, records, onActionError, actions }: ProjectRecordsSectionProps) {
  const convertRecordToTaskMutation = useConvertRecordToTask();
  const [convertingRecordId, setConvertingRecordId] = useState<string | null>(null);

  const hasOpenPendingRecords = useMemo(
    () => records.some((record) => record.tipo === RecordType.PENDING && record.status !== RecordStatus.DONE),
    [records],
  );

  const handleConvertRecord = async (record: RecordListItem) => {
    setConvertingRecordId(record.id);
    onActionError?.('');

    try {
      await convertRecordToTaskMutation.mutateAsync({
        recordId: record.id,
        projetoId: projectId,
      });
    } catch (error) {
      onActionError?.(toUserErrorMessage(error, 'Não foi possível converter o registro em tarefa.'));
    } finally {
      setConvertingRecordId(null);
    }
  };

  return (
    <CollapsibleSection
      title="Registros"
      subtitle={`${records.length} registro${records.length === 1 ? '' : 's'}`}
      defaultOpen={hasOpenPendingRecords}
      actions={actions}
    >
      {records.length === 0 ? (
        <EmptyState
          title="Sem registros neste projeto"
          description="Decisões, pendências e observações aparecerão aqui em lista única."
          className="py-8"
        />
      ) : (
        <div className="space-y-2 pt-3">
          {records.map((record) => {
            const badge = getRecordBadge(record);
            const isDone = record.tipo === RecordType.PENDING && record.status === RecordStatus.DONE;

            return (
              <div
                key={record.id}
                className={`rounded-lg border px-3 py-3 ${
                  isDone ? 'border-border-subtle bg-surface-secondary' : 'border-border-primary bg-surface-primary'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant} size="sm">
                        {getRecordTypeLabel(record.tipo)}
                      </Badge>
                      <span className="text-xs text-text-tertiary">{badge.label}</span>
                    </div>
                    <p className="mt-2 text-sm text-text-primary break-words">{record.conteudo}</p>
                    <p className="mt-1 text-xs text-text-tertiary">Autor: {record.autorNome}</p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleConvertRecord(record)}
                    loading={convertingRecordId === record.id}
                  >
                    Virar tarefa
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}


