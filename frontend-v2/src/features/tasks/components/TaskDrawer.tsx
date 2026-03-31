import React, { useState } from 'react';
import { AlertTriangle, Check, Clock, Pencil, Save, Users, X } from 'lucide-react';
import { AvatarStack, Button, Drawer, Input, Panel, Select, TextArea } from '../../../design/primitives';
import { formatDateTime, formatElapsedDuration, formatFullDate, isOverdue } from '../../../lib/dates';
import { Ease, getEaseLabel, getPriorityLabel, getTaskStatusLabel, Priority, TaskStatus } from '../../../lib/enums';
import type { ActiveTimeSession, TaskListItem } from '../types';
import {
  useAssignableUsers,
  useSyncTaskCollaborators,
  useTaskCollaborators,
  useTaskTimeEntries,
  useTaskTimeSummary,
  useUpdateTask,
} from '../queries';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskListItem | null;
  currentUserId?: string;
  isAdmin: boolean;
  currentUserSession?: ActiveTimeSession;
  projects: Array<{ id: string; nome: string }>;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onComplete: () => void;
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

interface TaskEditState {
  taskId: string;
  form: TaskFormState;
  collaboratorIdsOverride: string[] | null;
}

function toDateInputValue(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function buildFormState(task: TaskListItem): TaskFormState {
  return {
    nome: task.nome,
    projetoId: task.projetoId,
    status: task.status,
    prioridade: task.prioridade,
    facilidade: task.facilidade,
    prazo: toDateInputValue(task.prazo),
    descricao: task.descricao || '',
    observacaoEspera: task.observacaoEspera || '',
  };
}

function formatHours(value: number): string {
  return `${value.toFixed(2)} h`;
}

function MetaField({
  label,
  value,
  toneClassName = 'text-text-primary',
}: {
  label: string;
  value: string;
  toneClassName?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`mt-1 text-sm font-medium ${toneClassName}`}>{value}</p>
    </div>
  );
}

function getResponsiblePeople(task: TaskListItem, collaboratorNames: Array<{ id: string; nome: string }>) {
  const peopleMap = new Map<string, { id: string; nome: string }>();

  if (task.criadoPor?.id) {
    peopleMap.set(task.criadoPor.id, {
      id: task.criadoPor.id,
      nome: task.criadoPor.nome,
    });
  }

  task.responsaveis.forEach((person) => {
    if (person.id) {
      peopleMap.set(person.id, { id: person.id, nome: person.nome });
    }
  });

  collaboratorNames.forEach((person) => {
    if (person.id) {
      peopleMap.set(person.id, { id: person.id, nome: person.nome });
    }
  });

  return Array.from(peopleMap.values());
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  task,
  currentUserId,
  isAdmin,
  currentUserSession,
  projects,
  onStartTimer,
  onStopTimer,
  onComplete,
}) => {
  const [editState, setEditState] = useState<TaskEditState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateTaskMutation = useUpdateTask();
  const syncCollaboratorsMutation = useSyncTaskCollaborators();
  const {
    data: timeEntries = [],
    isLoading: isTimeLoading,
    error: timeEntriesError,
  } = useTaskTimeEntries(isOpen ? task?.id : undefined);
  const { data: timeSummary = [], error: timeSummaryError } = useTaskTimeSummary(isOpen ? task?.id : undefined);
  const { data: collaborators = [] } = useTaskCollaborators(isOpen ? task?.id : undefined);
  const { data: assignableUsers = [] } = useAssignableUsers(isOpen);

  if (!task) return null;

  const isEditing = editState?.taskId === task.id;
  const form = isEditing ? editState.form : buildFormState(task);
  const isSaving = updateTaskMutation.isPending || syncCollaboratorsMutation.isPending;
  const isCompleted = task.status === TaskStatus.DONE;
  const isWaiting = (isEditing ? form.status : task.status) === TaskStatus.WAITING;
  const canManageCollaborators = Boolean(isAdmin || task.criadoPor?.id === currentUserId);
  const hasTimeError = Boolean(timeEntriesError || timeSummaryError);
  const hasOverdue = Boolean(task.prazo && isOverdue(task.prazo) && !isCompleted);

  const baseCollaboratorIds = (() => {
    if (collaborators.length > 0) {
      return collaborators.map((person) => person.id);
    }

    const ownerId = task.criadoPor?.id;
    return task.responsaveis
      .map((person) => person.id)
      .filter((id) => id && id !== ownerId);
  })();

  const selectedCollaboratorIds =
    isEditing && editState.collaboratorIdsOverride ? editState.collaboratorIdsOverride : baseCollaboratorIds;

  const activeEntries = timeEntries
    .filter((entry) => !entry.fim)
    .sort((left, right) => left.inicio.localeCompare(right.inicio));

  const recentEntries = timeEntries
    .filter((entry) => entry.fim)
    .sort((left, right) => (right.fim || '').localeCompare(left.fim || ''))
    .slice(0, 6);

  const totalAccumulatedHours = (() => {
    if (timeSummary.length > 0) {
      return timeSummary.reduce((sum, item) => sum + item.horasLiquidas, 0);
    }

    return timeEntries
      .filter((entry) => Boolean(entry.fim))
      .reduce((sum, entry) => sum + entry.horasLiquidas, 0);
  })();

  const responsiblePeople = getResponsiblePeople(
    task,
    collaborators.map((person) => ({ id: person.id, nome: person.nome })),
  );

  const responsibleNames = responsiblePeople.map((person) => person.nome).join(', ') || 'Nenhuma pessoa vinculada';

  const allResponsibleUsers = (() => {
    const owner = task.criadoPor ? [{ id: task.criadoPor.id, nome: task.criadoPor.nome, fixed: true }] : [];
    const extras = assignableUsers
      .filter((user) => user.id !== task.criadoPor?.id)
      .map((user) => ({ ...user, fixed: false }));
    return [...owner, ...extras];
  })();

  const statusToneClassName = isCompleted
    ? 'text-success-600'
    : isWaiting
      ? task.observacaoEspera?.trim()
        ? 'text-warning-700'
        : 'text-error-600'
      : 'text-text-primary';

  const timerSummaryLabel = currentUserSession
    ? `Em andamento desde ${formatDateTime(currentUserSession.inicio)}`
    : activeEntries.length > 0
      ? `${activeEntries.length} timer${activeEntries.length === 1 ? '' : 's'} ativo${activeEntries.length === 1 ? '' : 's'}`
      : task.foco
        ? 'Tarefa em foco'
        : 'Sem timer ativo';

  const showWaitingSection = isEditing
    ? isWaiting || Boolean(form.observacaoEspera.trim())
    : task.status === TaskStatus.WAITING || Boolean(task.observacaoEspera?.trim());

  const updateEditingForm = <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => {
    if (!isEditing) return;

    setEditState((current) => {
      if (!current || current.taskId !== task.id) return current;

      return {
        ...current,
        form: {
          ...current.form,
          [field]: value,
        },
      };
    });
  };

  const startEditing = () => {
    setSaveError(null);
    setEditState({
      taskId: task.id,
      form: buildFormState(task),
      collaboratorIdsOverride: baseCollaboratorIds,
    });
  };

  const cancelEditing = () => {
    setSaveError(null);
    setEditState(null);
  };

  const toggleCollaborator = (userId: string) => {
    if (!isEditing) return;

    setEditState((current) => {
      if (!current || current.taskId !== task.id) return current;

      const currentIds = current.collaboratorIdsOverride || [];
      const nextIds = currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId];

      return { ...current, collaboratorIdsOverride: nextIds };
    });
  };

  const handleSave = async () => {
    if (!isEditing) return;

    if (form.status === TaskStatus.WAITING && !form.observacaoEspera.trim()) {
      setSaveError('Ao colocar em espera, registre o contexto.');
      return;
    }

    setSaveError(null);

    try {
      await updateTaskMutation.mutateAsync({
        taskId: task.id,
        projectId: form.projetoId,
        payload: {
          nome: form.nome.trim(),
          projetoId: form.projetoId,
          status: form.status,
          prioridade: form.prioridade,
          facilidade: form.facilidade,
          descricao: form.descricao.trim() || undefined,
          observacaoEspera: form.observacaoEspera.trim() || undefined,
          prazo: form.prazo || undefined,
        },
      });

      if (canManageCollaborators) {
        await syncCollaboratorsMutation.mutateAsync({
          taskId: task.id,
          currentIds: baseCollaboratorIds,
          nextIds: selectedCollaboratorIds,
          ownerId: task.criadoPor?.id,
          projectId: form.projetoId,
        });
      }

      setEditState(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a tarefa. Tente novamente.';
      setSaveError(message);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      mode="contextual"
      onClose={isSaving ? () => undefined : () => {
        cancelEditing();
        onClose();
      }}
      title={task.nome}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <Panel padding="md">
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <Input
                    label="Título"
                    value={form.nome}
                    onChange={(event) => updateEditingForm('nome', event.target.value)}
                    maxLength={200}
                  />

                  <Select
                    label="Projeto"
                    value={form.projetoId}
                    onChange={(event) => updateEditingForm('projetoId', event.target.value)}
                    options={projects.map((project) => ({ value: project.id, label: project.nome }))}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Select
                      label="Status"
                      value={form.status}
                      onChange={(event) => updateEditingForm('status', event.target.value as TaskStatus)}
                      options={[
                        { value: TaskStatus.TODO, label: 'A fazer' },
                        { value: TaskStatus.IN_PROGRESS, label: 'Em andamento' },
                        { value: TaskStatus.WAITING, label: 'Em espera' },
                        { value: TaskStatus.DONE, label: 'Concluída' },
                      ]}
                    />
                    <Select
                      label="Prioridade"
                      value={form.prioridade}
                      onChange={(event) => updateEditingForm('prioridade', event.target.value as Priority)}
                      options={[
                        { value: Priority.LOW, label: 'Baixa' },
                        { value: Priority.MEDIUM, label: 'Média' },
                        { value: Priority.HIGH, label: 'Alta' },
                        { value: Priority.URGENT, label: 'Urgente' },
                      ]}
                    />
                    <Select
                      label="Facilidade"
                      value={form.facilidade}
                      onChange={(event) => updateEditingForm('facilidade', event.target.value as Ease)}
                      options={[
                        { value: Ease.VERY_EASY, label: 'Muito fácil' },
                        { value: Ease.EASY, label: 'Fácil' },
                        { value: Ease.MEDIUM, label: 'Médio' },
                        { value: Ease.HARD, label: 'Difícil' },
                        { value: Ease.VERY_HARD, label: 'Muito difícil' },
                      ]}
                    />
                  </div>

                  <Input
                    type="date"
                    label="Prazo"
                    value={form.prazo}
                    onChange={(event) => updateEditingForm('prazo', event.target.value)}
                  />

                  <TextArea
                    label="Descrição"
                    value={form.descricao}
                    onChange={(event) => updateEditingForm('descricao', event.target.value)}
                    placeholder="Explique objetivo, contexto e próximo passo."
                    rows={6}
                  />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MetaField label="Projeto" value={task.projetoNome} />
                    <MetaField label="Status" value={getTaskStatusLabel(task.status)} toneClassName={statusToneClassName} />
                    <MetaField
                      label="Prazo"
                      value={task.prazo ? formatFullDate(task.prazo) : 'Sem prazo'}
                      toneClassName={hasOverdue ? 'text-error-600' : 'text-text-primary'}
                    />
                    <MetaField label="Prioridade" value={getPriorityLabel(task.prioridade)} />
                    <MetaField label="Facilidade" value={getEaseLabel(task.facilidade)} />
                    <MetaField label="Timer" value={timerSummaryLabel} />
                    <MetaField label="Compartilhamento" value={task.compartilhada ? 'Compartilhada' : 'Interna'} />
                    <MetaField label="Foco" value={task.foco ? 'Em foco' : 'Sem foco ativo'} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-text-tertiary">Descrição</p>
                    <div className="rounded-lg border border-border-subtle bg-surface-secondary px-4 py-3 text-sm leading-6 text-text-secondary">
                      {task.descricao?.trim() || 'Sem descrição registrada.'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Panel>

          <Panel padding="md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-text-tertiary" />
                <h3 className="text-sm font-medium text-text-primary">Pessoas na tarefa</h3>
              </div>

              <div className="space-y-3">
                <MetaField label="Criado por" value={task.criadoPor?.nome || 'Não informado'} />

                <div>
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">Responsáveis</p>
                  <div className="mt-2 flex items-center gap-3">
                    <AvatarStack
                      avatars={responsiblePeople.map((person) => ({
                        id: person.id,
                        name: person.nome,
                      }))}
                      max={8}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{responsibleNames}</p>
                      <p className="text-sm text-text-secondary">
                        {responsiblePeople.length} pessoa{responsiblePeople.length === 1 ? '' : 's'} vinculada{responsiblePeople.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2 rounded-lg border border-border-subtle p-3">
                    <p className="text-xs uppercase tracking-wide text-text-tertiary">Editar responsáveis</p>
                    {!canManageCollaborators ? (
                      <p className="text-sm text-text-secondary">
                        Só quem criou a tarefa ou administrador pode alterar os responsáveis vinculados.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {allResponsibleUsers.map((user) => {
                          if (user.fixed) {
                            return (
                              <div key={user.id} className="flex items-center justify-between rounded-md bg-surface-secondary px-3 py-2 text-sm">
                                <span className="text-text-primary">{user.nome}</span>
                                <span className="text-text-tertiary">Criador fixo</span>
                              </div>
                            );
                          }

                          return (
                            <label key={user.id} className="flex items-center justify-between rounded-md border border-border-subtle px-3 py-2 text-sm">
                              <span className="text-text-primary">{user.nome}</span>
                              <input
                                type="checkbox"
                                className="rounded border-border-primary text-primary focus:ring-border-focus"
                                checked={selectedCollaboratorIds.includes(user.id)}
                                onChange={() => toggleCollaborator(user.id)}
                                disabled={!canManageCollaborators}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel padding="md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-text-primary">Tempo</h3>
              </div>

              {hasTimeError ? (
                <div className="rounded-lg border border-alert-subtle bg-alert-subtle/20 px-4 py-3 text-sm text-alert">
                  Não foi possível carregar os dados de tempo desta tarefa. Tente novamente.
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-text-tertiary">Quem está com timer ativo agora</p>
                    {isTimeLoading ? (
                      <div className="rounded-lg border border-border-subtle bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                        Carregando timers ativos...
                      </div>
                    ) : activeEntries.length === 0 ? (
                      <div className="rounded-lg border border-border-subtle bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                        Nenhum timer ativo nesta tarefa agora.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between rounded-lg border border-primary-subtle bg-primary-subtle/20 px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-text-primary">{entry.usuarioNome}</p>
                              <p className="text-xs text-text-secondary">Iniciado em {formatDateTime(entry.inicio)}</p>
                            </div>
                            <span className="text-sm font-medium text-primary">{formatElapsedDuration(entry.inicio)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-text-tertiary">Sessões recentes</p>
                    {recentEntries.length === 0 ? (
                      <div className="rounded-lg border border-border-subtle bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                        Nenhuma sessão concluída ainda nesta tarefa.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentEntries.map((entry) => (
                          <div key={entry.id} className="rounded-lg border border-border-subtle px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-text-primary">{entry.usuarioNome}</p>
                                <p className="text-xs text-text-secondary">
                                  {formatDateTime(entry.inicio)} até {entry.fim ? formatDateTime(entry.fim) : 'em aberto'}
                                </p>
                                {entry.observacao ? <p className="mt-2 text-sm text-text-secondary">{entry.observacao}</p> : null}
                              </div>
                              <span className="text-sm font-medium text-text-primary">{formatHours(entry.horasLiquidas)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-text-tertiary">Total acumulado da tarefa</p>
                    <div className="rounded-lg border border-border-subtle bg-surface-secondary px-4 py-3">
                      <p className="text-lg font-medium text-text-primary">{formatHours(totalAccumulatedHours)}</p>
                      {timeSummary.length > 0 ? (
                        <div className="mt-3 space-y-1">
                          {timeSummary.map((item) => (
                            <div key={item.usuarioId} className="flex items-center justify-between text-sm text-text-secondary">
                              <span>{item.usuarioNome}</span>
                              <span>{formatHours(item.horasLiquidas)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {showWaitingSection ? (
            <Panel padding="md">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-medium text-text-primary">Contexto de espera</h3>
                </div>

                {isEditing ? (
                  <TextArea
                    label="Contexto da espera"
                    value={form.observacaoEspera}
                    onChange={(event) => updateEditingForm('observacaoEspera', event.target.value)}
                    placeholder="O que está bloqueando e quem pode destravar."
                  />
                ) : (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      task.status === TaskStatus.WAITING
                        ? 'border-warning-subtle bg-warning-subtle/20 text-warning'
                        : 'border-border-subtle bg-surface-secondary text-text-secondary'
                    }`}
                  >
                    {task.observacaoEspera?.trim() || 'Sem contexto de espera registrado.'}
                  </div>
                )}
              </div>
            </Panel>
          ) : null}

          <Panel padding="md">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-primary">Ações</h3>

              {saveError ? (
                <div className="rounded-lg border border-alert-subtle bg-alert-subtle/20 px-4 py-3 text-sm text-alert">
                  {saveError}
                </div>
              ) : null}

              {isEditing ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" icon={X} onClick={cancelEditing} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" icon={Save} onClick={handleSave} loading={isSaving}>
                    Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={startEditing}>
                    Editar
                  </Button>
                  {currentUserSession ? (
                    <Button variant="secondary" size="sm" icon={Clock} onClick={onStopTimer}>
                      Parar timer
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" icon={Clock} onClick={onStartTimer}>
                      Iniciar timer
                    </Button>
                  )}
                  {!isCompleted ? (
                    <Button variant="secondary" size="sm" icon={Check} onClick={onComplete}>
                      Concluir
                    </Button>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                <span>Criada em {formatDateTime(task.criadoEm)}</span>
                {task.atualizadoEm ? <span>Atualizada em {formatDateTime(task.atualizadoEm)}</span> : null}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </Drawer>
  );
};
