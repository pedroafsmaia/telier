import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, CollapsibleSection, EmptyState } from '../../../design/primitives';
import { getRecordTypeLabel, RecordStatus, RecordType } from '../../../lib/enums';
import { useConvertRecordToTask } from '../queries';
import type { RecordListItem } from '../types';

interface ProjectRecordsSectionProps {
  projectId: string;
  records: RecordListItem[];
  onActionError?: (message: string) => void;
  actions?: ReactNode;
  className?: string;
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

export function ProjectRecordsSection({
  projectId,
  records,
  onActionError,
  actions,
  className,
}: ProjectRecordsSectionProps) {
  const convertRecordToTaskMutation = useConvertRecordToTask();
  const [convertingRecordId, setConvertingRecordId] = useState<string | null>(null);

  const openPendingCount = useMemo(
    () => records.filter((record) => record.tipo === RecordType.PENDING && record.status !== RecordStatus.DONE).length,
    [records],
  );
  const hasOpenPendingRecords = openPendingCount > 0;
  const [isSectionOpen, setIsSectionOpen] = useState(hasOpenPendingRecords);

  useEffect(() => {
    setIsSectionOpen(hasOpenPendingRecords);
  }, [hasOpenPendingRecords]);

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
      subtitle={`${records.length} registro${records.length === 1 ? '' : 's'}${
        hasOpenPendingRecords
          ? ` · ${openPendingCount} pendência${openPendingCount === 1 ? '' : 's'} aberta${openPendingCount === 1 ? '' : 's'}`
          : ''
      }`}
      isOpen={isSectionOpen}
      onToggle={setIsSectionOpen}
      actions={actions}
      className={className}
    >
      {records.length === 0 ? (
        <EmptyState
          title="Sem registros neste projeto"
          description="Decisões, pendências e observações aparecerão aqui em lista única."
          className="py-6"
        />
      ) : (
        <div className="max-h-80 space-y-1.5 overflow-y-auto pt-2 pr-1">
          {records.map((record) => {
            const badge = getRecordBadge(record);
            const isDone = record.tipo === RecordType.PENDING && record.status === RecordStatus.DONE;
            const isOpenPending = record.tipo === RecordType.PENDING && record.status !== RecordStatus.DONE;

            return (
              <div
                key={record.id}
                className={`rounded-md border px-3 py-2 ${
                  isOpenPending
                    ? 'border-warning-300 bg-warning-50/40'
                    : isDone
                      ? 'border-success-100 bg-success-50/30'
                      : 'border-border-subtle bg-surface-secondary/25'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant} size="sm">
                        {getRecordTypeLabel(record.tipo)}
                      </Badge>
                      <span className={`text-xs ${isOpenPending ? 'font-medium text-warning-600' : 'text-text-tertiary'}`}>
                        {isOpenPending ? 'Requer acao' : badge.label}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm text-text-primary">{record.conteudo}</p>
                    <p className="mt-1 text-xs text-text-tertiary">Autor: {record.autorNome}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleConvertRecord(record)}
                    loading={convertingRecordId === record.id}
                  >
                    Transformar em tarefa
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

